#!/usr/bin/env python3
"""T641 scope：讀 base..head 的改動，判道別、核卡頭機讀欄、GPT 越道、守衛程式裡新寫死的提交 SHA。

只讀、只用標準庫。用法：
  python tools/scope.py --base <sha> --head <sha> [--head-ref <分支名>] [--repo <路徑>]
沒給 --base 時取 merge-base(origin/main, head)。
輸出 JSON 到 stdout；有 GITHUB_OUTPUT 時寫 lane、ok、removed_asserts；有 GITHUB_STEP_SUMMARY 時寫摘要。
結束碼：0＝沒有違規；1＝有違規（訊息逐條列出）；2＝用法或 git 錯誤。

規則（業主 2026-10-14 交辦的主線跑法，見 docs/tasks/T639-主線跑法總綱.md、T641 卡）：
- 道別：改動（含刪除、改名兩端）全部以 .md 結尾＝docs，否則 full。
- 卡：docs/tasks/T<號>-<名>.md。這次新增的卡，標題下一行必須是
  <!-- card: families=<無|家族,家族>; valve=<逃生閥或空>; owner_ok=<空或業主原話（日期）>; removed_asserts=<整數> -->
  families、valve、removed_asserts 從第一個加入這張卡的 commit 起凍結；owner_ok 只准從空變成有字，有字之後不准再改。
  base 已經有卡頭的卡，在這次範圍內同樣不准改凍結欄位。新卡的號碼在 base 已經存在＝撞號。
- full 道：恰好一張卡（新增的卡，或沒有新增時恰好一張已有卡頭的卡被修改）。
- 純 revert（diff 的 patch-id 等於 main 第一父鏈上某個提交——合併或直推——對其第一父的反向 diff）免一切卡面規則
  （一 PR 一卡、卡頭、凍結欄、owner_ok、撞號），因為它只是把 main 退回它自己有過的內容；gpt 越道與寫死 SHA 照查。
  棘輪基準改成被撤提交的第一父（ratchet_base），不跟撤銷前的 base 比（T650：「main 紅就開 revert PR」這條路不准被守衛擋住）。
- gpt/ 分支越道：碰 .github/、tools/、test_fixde.js 的刪改行（只新增不算）、不屬於本卡的 docs/tasks/*-shots/、docs/SPR_PINS.json、docs/APPROVED_ART.json、規則檔。
- 核准美術登記冊（T647）：docs/APPROVED_ART.json 的 approved 一節（新增、修改、刪除任一批）有變動，卡頭 owner_ok 必須有字——登記批准就是業主的批准；
  valves 一節不受限；base 沒有登記冊＝建立；登記冊不准刪；純 revert 照例免。
- 守衛程式（.github/、tools/、docs/tasks/*-shots/、test_fixde.js 裡的 .js/.cjs/.mjs/.py/.yml/.yaml/.sh）新增行出現 40 位十六進位＝寫死提交 SHA；docs/APPROVED_ART.json 例外；64 位只警告。
"""
import argparse
import json
import os
import re
import subprocess
import sys

CARD_RE = re.compile(r'^docs/tasks/T(\d{3,4})-[^/]+\.md$')
HEADER_RE = re.compile(r'^<!-- card: (.*) -->\s*$')
FIELDS = ('families', 'valve', 'owner_ok', 'removed_asserts')
FROZEN = ('families', 'valve', 'removed_asserts', 'cont')
RULE_FILES = {'AGENTS.md', 'docs/RULES.md', 'docs/COLLAB.md', 'docs/迭代不改壞標準.md'}
GUARD_PREFIXES = ('.github/', 'tools/')
CODE_EXT = ('.js', '.cjs', '.mjs', '.py', '.yml', '.yaml', '.sh')
SHA40 = re.compile(r'(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])')
SHA64 = re.compile(r'(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])')
SHOTS_RE = re.compile(r'^docs/tasks/(t\d{3,4})-shots/')
REGISTRY = 'docs/APPROVED_ART.json'


class GitError(Exception):
    pass


def git(repo, *args, check=True):
    r = subprocess.run(['git', '-c', 'core.quotepath=false', *args], cwd=repo, capture_output=True)
    if check and r.returncode != 0:
        raise GitError('git %s: %s' % (' '.join(args), r.stderr.decode('utf-8', 'replace').strip()))
    return r.stdout.decode('utf-8', 'replace')


def show(repo, rev, path):
    r = subprocess.run(['git', 'show', '%s:%s' % (rev, path)], cwd=repo, capture_output=True)
    return r.stdout.decode('utf-8', 'replace') if r.returncode == 0 else None


def parse_header(text):
    """回傳 (dict 或 None, 錯誤字串或 None)。卡頭必須是標題下一行。"""
    if text is None:
        return None, None
    lines = text.split('\n')
    if len(lines) < 2 or not lines[0].startswith('# '):
        return None, None
    m = HEADER_RE.match(lines[1])
    if not m:
        return None, None
    out = {}
    for part in m.group(1).split(';'):
        if not part.strip():
            continue
        if '=' not in part:
            return None, '卡頭欄位格式錯：%r' % part.strip()
        k, v = part.split('=', 1)
        out[k.strip()] = v.strip()
    missing = [f for f in FIELDS if f not in out]
    if missing:
        return None, '卡頭少欄位：%s' % '、'.join(missing)
    if not re.fullmatch(r'\d+', out['removed_asserts']):
        return None, 'removed_asserts 要是非負整數：%r' % out['removed_asserts']
    out.setdefault('cont', '')
    return out, None


def families_of(h):
    v = (h or {}).get('families', '')
    return [] if v in ('', '無') else sorted(x.strip() for x in v.split(',') if x.strip())


def changed(repo, base, head):
    """回傳 [(status, path)]；改名拆成刪除＋新增。"""
    out = []
    for line in git(repo, 'diff', '--name-status', '-M', base, head).splitlines():
        parts = line.split('\t')
        st = parts[0]
        if st.startswith('R') or st.startswith('C'):
            out.append(('D' if st.startswith('R') else 'M', parts[1]))
            out.append(('A', parts[2]))
        else:
            out.append((st[0], parts[1]))
    return out


def patch_id(repo, a, b):
    diff = subprocess.run(['git', 'diff', '--binary', a, b], cwd=repo, capture_output=True).stdout
    if not diff.strip():
        return None
    # --verbatim 不剝空白：純 revert 要免掉全部卡面規則，只差空白的「近似撤銷」不能算（Codex #27 P2）
    r = subprocess.run(['git', 'patch-id', '--verbatim'], cwd=repo, input=diff, capture_output=True)
    out = r.stdout.decode().split()
    return out[0] if out else None


def is_pure_revert(repo, base, head, depth=60):
    pid = patch_id(repo, base, head)
    if not pid:
        return None
    for m in git(repo, 'rev-list', '--first-parent', '-n', str(depth), base).split():  # 合併與直推都算（T650）
        if patch_id(repo, m, m + '^1') == pid:
            return m
    return None


def card_history(repo, base, head, path):
    """範圍內碰過這張卡的提交（舊到新）。"""
    return git(repo, 'log', '--format=%H', '--reverse', '%s..%s' % (base, head), '--', path).split()


def analyse(repo, base, head, head_ref=''):
    v, w = [], []
    files = changed(repo, base, head)
    paths = sorted({p for _, p in files})
    lane = 'docs' if paths and all(p.endswith('.md') for p in paths) else ('docs' if not paths else 'full')

    cards, added_cards, headered_mod = [], [], []
    for st, p in files:
        m = CARD_RE.match(p)
        if not m or st == 'D':
            continue
        num = m.group(1)
        head_text, base_text = show(repo, head, p), show(repo, base, p)
        hh, herr = parse_header(head_text)
        bh, _ = parse_header(base_text)
        info = {'path': p, 'num': num, 'added': base_text is None, 'header': hh}
        cards.append(info)
        if herr:
            v.append({'rule': 'card-header', 'path': p, 'detail': herr})
        if base_text is None:
            added_cards.append(info)
            if hh is None and not herr:
                v.append({'rule': 'card-header', 'path': p, 'detail': '新卡標題下一行要有 <!-- card: families=…; valve=…; owner_ok=…; removed_asserts=… -->'})
            dup = [q for q in git(repo, 'ls-tree', '--name-only', base, 'docs/tasks/').split('\n')
                   if q != p and re.match(r'^docs/tasks/T%s-' % re.escape(num), q)]
            if dup:
                v.append({'rule': 'card-number', 'path': p, 'detail': 'T%s 在 base 已經有卡：%s（撞號）' % (num, '、'.join(dup))})
        elif bh is not None:
            headered_mod.append(info)
            if hh is None:
                v.append({'rule': 'card-header', 'path': p, 'detail': '卡頭被拿掉了'})
        # 凍結欄位與 owner_ok 單向：從 base（或第一個加入這張卡的 commit）一路走到 head
        prev = bh
        first = True
        for c in card_history(repo, base, head, p):
            ch, cerr = parse_header(show(repo, c, p))
            if first and base_text is None and ch is None:  # 卡頭要從第一個加入這張卡的 commit 就有（Codex #26 P2）
                v.append({'rule': 'card-header', 'path': p, 'detail': '第一個加入這張卡的 commit（%s）沒有合法卡頭；卡頭要從第一個 commit 就有，之後才凍結得住' % c[:7]})
            first = False
            if ch is None:
                continue
            if prev is not None:
                for f in FROZEN:
                    if prev.get(f, '') != ch.get(f, ''):
                        v.append({'rule': 'card-frozen', 'path': p, 'detail': '%s 在 %s 從 %r 改成 %r（第一個 commit 後凍結）' % (f, c[:7], prev.get(f, ''), ch.get(f, ''))})
                if prev.get('owner_ok', '') and prev.get('owner_ok', '') != ch.get('owner_ok', ''):
                    v.append({'rule': 'card-owner-ok', 'path': p, 'detail': 'owner_ok 有字之後在 %s 被改動（只准從空變成業主原話）' % c[:7]})
            prev = ch

    own = added_cards + headered_mod  # 新增的卡與動到的有卡頭舊卡一起算（Codex #26 P2），任何道都最多一張；否則碰一下別張舊卡就能借它的 removed_asserts
    if len(own) > 1:
        v.append({'rule': 'one-card', 'path': '', 'detail': '一個 PR 一張卡，這次新增或修改了 %d 張有卡頭的卡：%s' % (len(own), '、'.join(c['path'] for c in own))})
    elif lane == 'full' and not own:
        v.append({'rule': 'one-card', 'path': '', 'detail': 'full 道的 PR 要帶一張卡（新增一張，或修改恰好一張已有卡頭的卡）；純 revert 例外'})

    # T647：核准美術登記冊的 approved 一節是業主的批准，改它要卡頭 owner_ok（算卡面規則：純 revert 一起免）
    if REGISTRY in paths:
        bt, ht = show(repo, base, REGISTRY), show(repo, head, REGISTRY)
        if bt is None:
            w.append({'rule': 'approved-bootstrap', 'path': REGISTRY, 'detail': 'base 沒有登記冊：建立'})
        elif ht is None:
            v.append({'rule': 'approved-registry', 'path': REGISTRY, 'detail': '登記冊被刪掉了'})
        else:
            try:
                changed_approved = json.loads(bt).get('approved') != json.loads(ht).get('approved')
            except (ValueError, AttributeError) as e:
                v.append({'rule': 'approved-registry', 'path': REGISTRY, 'detail': '登記冊無法解析：%s' % e})
            else:
                if changed_approved and not any((c['header'] or {}).get('owner_ok') for c in own):
                    v.append({'rule': 'approved-owner-ok', 'path': REGISTRY, 'detail': '改到 approved（業主批准的批次），卡頭 owner_ok 卻是空的'})

    # 到這裡 v 裡只有卡面規則。卡面有違規、或要跑棘輪（full 道）時，才算是不是純 revert（要算幾十個 patch-id）。
    revert = is_pure_revert(repo, base, head) if (v or lane == 'full') else None
    ratchet_base = base
    if revert:
        v = []  # T650：純 revert 只是把 main 退回它自己有過的內容，卡面規則全免；gpt 越道與寫死 SHA 在下面照查
        ratchet_base = git(repo, 'rev-parse', revert + '^1').strip()

    removed = 0
    for c in own:
        if c['header']:
            removed = max(removed, int(c['header']['removed_asserts']))

    # gpt/ 越道
    if head_ref.startswith('gpt/'):
        own = {'t' + c['num'] for c in added_cards}
        for st, p in files:
            why = None
            if p.startswith(GUARD_PREFIXES):
                why = '守衛／工作流路徑'
            elif p in RULE_FILES:
                why = '規則檔'
            elif p == 'docs/SPR_PINS.json':
                why = '像素指紋基線'
            elif p == REGISTRY:
                why = '核准美術登記冊'
            elif p == 'test_fixde.js' and st != 'A':
                ns = git(repo, 'diff', '--numstat', base, head, '--', p).split()
                if ns and ns[1] not in ('0', '-'):
                    why = '既有斷言被刪改（只准新增行）'
            else:
                m = SHOTS_RE.match(p)
                if m and m.group(1) not in own:
                    why = '不屬於本卡的證據／台架目錄'
            if why:
                v.append({'rule': 'gpt-lane', 'path': p, 'detail': why + '：gpt/ 分支不准動，交 main 寫入者'})

    # 守衛程式新寫死的提交 SHA
    for st, p in files:
        if st == 'D' or p == 'docs/APPROVED_ART.json':
            continue
        guard = p.startswith(GUARD_PREFIXES) or bool(SHOTS_RE.match(p)) or p == 'test_fixde.js'
        if not guard or not p.endswith(CODE_EXT):
            continue
        for line in git(repo, 'diff', '-U0', base, head, '--', p).split('\n'):
            if not line.startswith('+') or line.startswith('+++'):
                continue
            if SHA40.search(line):
                v.append({'rule': 'hardcoded-sha', 'path': p, 'detail': '新增行寫死 40 位提交 SHA：' + line[1:].strip()[:160]})
            elif SHA64.search(line):
                w.append({'rule': 'hardcoded-sha256', 'path': p, 'detail': '新增行有 64 位雜湊（只警告）：' + line[1:].strip()[:160]})

    return {'base': base, 'head': head, 'head_ref': head_ref, 'lane': lane, 'ok': not v, 'removed_asserts': removed,
            'revert_of': revert, 'ratchet_base': ratchet_base, 'files': len(paths), 'cards': [{'path': c['path'], 'added': c['added'], 'header': c['header']} for c in cards],
            'violations': v, 'warnings': w}


def summary_md(r):
    out = ['## scope（T641）', '', '- 道別：**%s**（%d 個檔）' % (r['lane'], r['files']), '- 結論：%s' % ('綠' if r['ok'] else '**紅**')]
    if r['revert_of']:
        out.append('- 純 revert：%s（卡面規則免；棘輪基準＝其第一父 %s）' % (r['revert_of'][:12], r['ratchet_base'][:12]))
    for c in r['cards']:
        h = c['header'] or {}
        out.append('- 卡：`%s`%s families=%s；valve=%s；owner_ok=%s；removed_asserts=%s' % (
            c['path'], '（新）' if c['added'] else '', h.get('families', '—'), h.get('valve', '') or '—', h.get('owner_ok', '') or '—', h.get('removed_asserts', '—')))
    for x in r['violations']:
        out.append('- ❌ `%s` %s：%s' % (x['rule'], x['path'], x['detail']))
    for x in r['warnings']:
        out.append('- ⚠️ `%s` %s：%s' % (x['rule'], x['path'], x['detail']))
    return '\n'.join(out) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--base')
    ap.add_argument('--head', default='HEAD')
    ap.add_argument('--head-ref', default='')
    ap.add_argument('--repo', default='.')
    a = ap.parse_args(argv)
    try:
        head = git(a.repo, 'rev-parse', a.head).strip()
        base = git(a.repo, 'rev-parse', a.base).strip() if a.base else git(a.repo, 'merge-base', 'origin/main', head).strip()
        r = analyse(a.repo, base, head, a.head_ref)
    except GitError as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        return 2
    print(json.dumps(r, ensure_ascii=False, indent=1))
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write('lane=%s\nok=%s\nremoved_asserts=%d\nratchet_base=%s\n' % (r['lane'], 'true' if r['ok'] else 'false', r['removed_asserts'], r['ratchet_base']))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(summary_md(r))
    for x in r['violations']:
        print('SCOPE VIOLATION [%s] %s：%s' % (x['rule'], x['path'], x['detail']), file=sys.stderr)
    return 0 if r['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
