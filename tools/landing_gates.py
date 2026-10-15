#!/usr/bin/env python3
"""T644 帳本閘：CHANGELOG 的三道合併前檢查，抽成純函式給 merge_bay（本機收件）與 CI（scope job）共用。

用法（CI）：python tools/landing_gates.py --base <sha> [--head <sha>] [--repo <路徑>]
結束碼：0＝三道都過；1＝有問題（逐條列出）；2＝用法或 git 錯誤。

三道閘（語意與 T371／T433 原樣相同，只是搬上 CI）：
1. 簽核欄（T371）：base...head 新增的每個條目，「驗收:」欄不准含「待」，而且要寫出 SIGNOFF_PARTIES 之一。
2. 只增不減（T433）：base...head 刪掉的每個條目，都要有一行以 CHANGELOG-CORRECTION: 開頭的提交訊息點名那張卡。
   「原地改寫」（+1/-1）也算刪除——T423／T424／T425／T425A 就是這樣丟的。
3. 不准丟條目（T433 R03）：head 的 CHANGELOG 必須保有 base 的每一條（擋合併時解衝突吃掉對方條目的方向）。
   base 沒有 CHANGELOG＝沒有東西要保護；base 有而 head 整個沒有＝整本帳被刪，判紅。
   CI 版本對已用 CHANGELOG-CORRECTION: 宣告的卡豁免（與第 2 條一致）；merge_bay 本機收件的行為不變（T645 退役那條路）。
"""
import argparse
import re
import subprocess
import sys

CHANGELOG = 'docs/CHANGELOG.md'
ENTRY = re.compile(r'^\d{4}-\d{2}-\d{2} \| ')
SIGNOFF_PARTIES = ('Claude', 'Kimi', 'Codex', 'Grok', 'DeepSeek', '業主', 'GPT')
CORRECTION_TAG = 'CHANGELOG-CORRECTION:'


# ---------- 純函式（merge_bay 與 CI 共用） ----------

def entries_in_diff(diff_text, sign):
    """diff 裡某一側（'+' 新增、'-' 刪除）的 CHANGELOG 條目行。"""
    head = sign * 3
    out = []
    for line in (diff_text or '').split('\n'):
        if line.startswith(sign) and not line.startswith(head):
            body = line[1:]
            if ENTRY.match(body):
                out.append(body)
    return out


def card_of(entry):
    m = re.match(r'^\S+ \| (\S+)', entry)
    return m.group(1) if m else '?'


def signoff_problems(added):
    """T371：新增條目的驗收欄問題清單（空＝全過）。"""
    problems = []
    for entry in added:
        card = card_of(entry)
        field = entry.split('驗收:', 1)[1] if '驗收:' in entry else None
        if field is None:
            problems.append('%s: no 驗收 field' % card)
            continue
        if '待' in field:
            problems.append('%s: 驗收 still pending (%s)' % (card, field.strip()[:24]))
            continue
        if not any(party in field for party in SIGNOFF_PARTIES):
            problems.append('%s: 驗收 names no reviewer (%s)' % (card, field.strip()[:24]))
    return problems


def correction_lines(messages):
    return [line.strip() for line in (messages or '').split('\n') if line.strip().startswith(CORRECTION_TAG)]


def undeclared_removals(removed, messages):
    """T433：被刪掉、卻沒有被任何 CHANGELOG-CORRECTION: 行點名的卡（逐條點名，一行宣告不能放行別條）。"""
    declared = correction_lines(messages)
    return [card for card in (card_of(e) for e in removed) if not any(card in line for line in declared)]


def missing_entries(before_text, after_text):
    """T433 R03：before 有、after 沒有的條目。before 為 None＝沒有東西要保護；after 為 None＝整本帳被刪。"""
    if before_text is None:
        return []
    before = [l for l in before_text.split('\n') if ENTRY.match(l)]
    if after_text is None:
        return before
    after = set(l for l in after_text.split('\n') if ENTRY.match(l))
    return [l for l in before if l not in after]


# ---------- CI：直接吃 (base, head) 兩個 git 物件 ----------

def _git(repo, *args):
    r = subprocess.run(['git', '-c', 'core.quotepath=false', *args], cwd=repo, capture_output=True)
    return r.returncode, r.stdout.decode('utf-8', 'replace'), r.stderr.decode('utf-8', 'replace')


def _show(repo, rev):
    rc, out, _ = _git(repo, 'show', '%s:%s' % (rev, CHANGELOG))
    return out if rc == 0 else None


def analyse(repo, base, head):
    rc, diff, err = _git(repo, 'diff', '--no-color', '%s...%s' % (base, head), '--', CHANGELOG)
    if rc != 0:
        raise RuntimeError('cannot diff CHANGELOG %s...%s: %s' % (base, head, err.strip()))
    rc, messages, err = _git(repo, 'log', '--format=%B', '%s..%s' % (base, head))
    if rc != 0:
        raise RuntimeError('cannot read commit messages %s..%s: %s' % (base, head, err.strip()))
    added = entries_in_diff(diff, '+')
    removed = entries_in_diff(diff, '-')
    problems = []
    for p in signoff_problems(added):
        problems.append({'gate': 'signoff', 'detail': p})
    undeclared = undeclared_removals(removed, messages)
    if undeclared:
        problems.append({'gate': 'only-grows', 'detail': '刪掉 %d 個條目（%s），沒有逐條以 %s 點名：%s' % (
            len(removed), '、'.join(card_of(e) for e in removed[:6]), CORRECTION_TAG, '、'.join(undeclared[:6]))})
    before, after = _show(repo, base), _show(repo, head)
    if before is not None and after is None:
        problems.append({'gate': 'keeps', 'detail': 'base 有 %s，head 整個沒有——整本帳會被刪掉' % CHANGELOG})
    else:
        # CI 的 head 一定包含 base（PR 是測試合併提交、推 main 是 after），已宣告更正的卡與「只增不減」一致地豁免；
        # 不豁免的話，正式宣告的更正（例如 #18 改寫 T634／T635 的驗收欄）會被這道閘反過來擋下。
        declared = correction_lines(messages)
        missing = [e for e in missing_entries(before, after) if not any(card_of(e) in line for line in declared)]
        if missing:
            problems.append({'gate': 'keeps', 'detail': 'head 少了 base 的 %d 個條目（%s）' % (
                len(missing), '、'.join(card_of(e) for e in missing[:6]))})
    return {'ok': not problems, 'problems': problems, 'added': [card_of(e) for e in added],
            'removed': [card_of(e) for e in removed], 'declared': correction_lines(messages)}


def summary_md(r):
    lines = ['## 帳本閘（T644）', '', '- 結論：%s' % ('綠' if r['ok'] else '**紅**'),
             '- 新增條目：%s；刪除條目：%s' % ('、'.join(r['added']) or '無', '、'.join(r['removed']) or '無')]
    lines += ['- ❌ `%s` %s' % (p['gate'], p['detail']) for p in r['problems']]
    return '\n'.join(lines) + '\n'


def main(argv=None):
    import os
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--head', default='HEAD')
    ap.add_argument('--repo', default='.')
    a = ap.parse_args(argv)
    try:
        r = analyse(a.repo, a.base, a.head)
    except RuntimeError as e:
        print('landing_gates 錯誤：%s' % e, file=sys.stderr)
        return 2
    print(summary_md(r))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(summary_md(r))
    return 0 if r['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
