#!/usr/bin/env python3
"""T643 fp_diff：像素指紋的家族比對（純 Python，不開瀏覽器；CI 的 fp job 在實算之後跑）。

用法：python tools/fp_diff.py --base <sha> [--head <sha>] [--computed <rebake.json>] [--repo <路徑>]
規則（任何一條不過就 exit 1，訊息逐條列出；結束碼 2＝用法或 git 錯誤）：
1. head 的 docs/SPR_PINS.json 必須在、可解析、__meta.count 自洽、每鍵是 1～3 個小寫 hex CRC（缺了不准算綠，實驗線 T746 的教訓）。
2. 給了 --computed（CI 實算的 rebake）時，實算必須逐鍵等於 head 的檔案——不准手改，只准原封提交 rebake。
3. 比 base 與 head 的 SPR_PINS（解析後比，新舊排版都收），依「/」前的家族名列出新增／變更／移除的家族。
   家族名逐字比對：42 個家族名是別的家族名的前綴（park／parkA、police／policeBoxVar590……），不能用前綴比。
4. 碰到的家族必須是本 PR 那張卡（tools/scope.py 的「一 PR 一卡」）卡頭 families 的子集；
   宣告了卻沒碰到只警告（T603／T634／T635／T638 的美術不在 SPR 清冊裡，fp 看不到）。
5. 碰到任何家族時，卡頭 owner_ok 不得為空（美術改動要業主同意，這是既有規則，T643 讓機器第一次去查它）。
6. 純 revert（scope 判定）免第 3～5 條的家族與 owner_ok 檢查，第 1～2 條照查。
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fp_snapshot  # noqa: E402  基線格式（parse_pins／diff_pins／family_of）
import scope  # noqa: E402  卡頭與純 revert 的判定

PINS = 'docs/SPR_PINS.json'


def show(repo, rev, path):
    r = subprocess.run(['git', 'show', '%s:%s' % (rev, path)], cwd=repo, capture_output=True)
    return r.stdout.decode('utf-8', 'replace') if r.returncode == 0 else None


def analyse(repo, base, head, computed_text=None):
    v, w = [], []
    head_text = show(repo, head, PINS)
    if head_text is None:
        return {'ok': False, 'violations': [{'rule': 'pins-missing', 'detail': 'head 沒有 %s——基線缺了不准算綠' % PINS}], 'warnings': [], 'touched': [], 'declared': []}
    head_pins, err = fp_snapshot.parse_pins(head_text)
    if err:
        return {'ok': False, 'violations': [{'rule': 'pins-invalid', 'detail': err}], 'warnings': [], 'touched': [], 'declared': []}

    if computed_text is not None:
        comp, cerr = fp_snapshot.parse_pins(computed_text)
        if cerr:
            v.append({'rule': 'computed-invalid', 'detail': '實算結果有問題：%s' % cerr})
        else:
            a, r, c = fp_snapshot.diff_pins(head_pins, comp)
            if a or r or c:
                v.append({'rule': 'computed-mismatch', 'detail': '實算與 %s 不符（實算多 %d、少 %d、不同 %d）：%s——只准原封提交這一輪 fp 的 rebake 附件' % (
                    PINS, len(a), len(r), len(c), '、'.join((a + r + c)[:20]))})

    base_text = show(repo, base, PINS)
    base_pins = {}
    if base_text is None:
        w.append({'rule': 'base-missing', 'detail': 'base 沒有 %s，視為空基線' % PINS})
    else:
        base_pins, berr = fp_snapshot.parse_pins(base_text)
        if berr:
            w.append({'rule': 'base-invalid', 'detail': 'base 的 %s 有問題（%s），視為空基線' % (PINS, berr)})
            base_pins = {}
    added, removed, changed = fp_snapshot.diff_pins(base_pins, head_pins)
    touched = sorted({fp_snapshot.family_of(k) for k in added + removed + changed})

    sc = scope.analyse(repo, base, head)
    own = [c for c in sc['cards'] if c['header']]
    declared = sorted({f for c in own for f in scope.families_of(c['header'])})
    owner_ok = any((c['header'] or {}).get('owner_ok') for c in own)
    if sc['revert_of']:
        w.append({'rule': 'pure-revert', 'detail': '純 revert（%s）：免家族與 owner_ok 檢查' % sc['revert_of'][:12]})
    elif touched:
        if not own:
            v.append({'rule': 'no-card', 'detail': '動到家族 %s，卻沒有帶卡頭的卡可以宣告' % '、'.join(touched)})
        else:
            undeclared = [f for f in touched if f not in declared]
            if undeclared:
                v.append({'rule': 'families', 'detail': '動到卡頭沒宣告的家族：%s（卡頭 families=%s）' % ('、'.join(undeclared), '、'.join(declared) or '無')})
            if not owner_ok:
                v.append({'rule': 'owner-ok', 'detail': '動到家族 %s，但卡頭 owner_ok 是空的（美術改動要業主同意）' % '、'.join(touched)})
    for f in declared:
        if f not in touched:
            w.append({'rule': 'declared-untouched', 'detail': '卡頭宣告了 %s，但 SPR 清冊裡沒有它的變動（不在清冊的美術 fp 看不到）' % f})
    return {'ok': not v, 'violations': v, 'warnings': w, 'touched': touched, 'declared': declared,
            'added': added, 'removed': removed, 'changed': changed, 'revert_of': sc['revert_of']}


def summary_md(r):
    out = ['## fp_diff（T643）', '', '- 結論：%s' % ('綠' if r['ok'] else '**紅**'),
           '- 碰到的家族：%s；卡頭宣告：%s' % ('、'.join(r['touched']) or '無', '、'.join(r['declared']) or '無')]
    for name in ('added', 'removed', 'changed'):
        ks = r.get(name) or []
        if ks:
            out.append('- %s %d：%s%s' % ({'added': '新增', 'removed': '移除', 'changed': '變更'}[name], len(ks), '、'.join(ks[:20]), '…' if len(ks) > 20 else ''))
    out += ['- ❌ `%s` %s' % (x['rule'], x['detail']) for x in r['violations']]
    out += ['- ⚠️ `%s` %s' % (x['rule'], x['detail']) for x in r['warnings']]
    return '\n'.join(out) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--head', default='HEAD')
    ap.add_argument('--computed')
    ap.add_argument('--repo', default='.')
    a = ap.parse_args(argv)
    try:
        head = scope.git(a.repo, 'rev-parse', a.head).strip()
        base = scope.git(a.repo, 'rev-parse', a.base).strip()
        comp = open(a.computed, encoding='utf-8').read() if a.computed else None
        r = analyse(a.repo, base, head, comp)
    except (scope.GitError, OSError) as e:
        print('fp_diff 錯誤：%s' % e, file=sys.stderr)
        return 2
    print(summary_md(r))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(summary_md(r))
    return 0 if r['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
