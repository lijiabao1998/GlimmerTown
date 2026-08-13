# -*- coding: utf-8 -*-
"""T437 代碼地圖自檢／重生：讓 docs/ARCH.md §1 的行號不再說謊。

背景：ARCH §1「檔案分節地圖」用「行號範圍 ＋ grep 錨點」定位，而 T371b 守衛
**只驗錨點字串能不能找到、不驗行號**。2026-08-14 實測 99 列裡有 90 列行號已漂
（`<span class="chip" id="money">` 表上寫 213-275、實際 433；
 `function computePower(){` 寫 9387-9425、實際 11507），另有 1 個死錨點。
文件的可信度來自一個和內容脫鉤的欄位——這就是「地圖騙人」的機制本體。

用法：
    python tools/arch_map.py --check     # 只報告，有問題回傳 1
    python tools/arch_map.py --fix       # 把行號欄重寫成實測值

行號欄的定義（寫在這裡，也寫進 ARCH 表頭，任何人都能重算）：
    每一列的值 = 該列 grep 錨點在 index.html 的**第一個**命中行。
    不再寫「範圍」——範圍無法從錨點驗證，寫了就是不可覆核的數字。
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCH = os.path.join(ROOT, 'docs', 'ARCH.md')
INDEX = os.path.join(ROOT, 'index.html')
ROW = re.compile(r'^\|(?P<sec>[^|]*)\|(?P<line>[^|]*)\|(?P<anchor>[^|]*)\|\s*$')


def load():
    arch = io.open(ARCH, encoding='utf-8').read().split('\n')
    idx = io.open(INDEX, encoding='utf-8').read().split('\n')
    return arch, idx


def anchors_of(cell):
    """一格裡可能有多個用 ` 包住的錨點；全部取出。"""
    return re.findall(r'`([^`]+)`', cell)


def first_hit(idx, anchor):
    for k, line in enumerate(idx, 1):
        if anchor in line:
            return k
    return None


def section_bounds(arch):
    """只掃 §1「檔案分節地圖」那一張表。

    第一版沒有限定範圍，結果把另一張講 test_fixde.js 技法的表也掃進來，
    那張表的錨點（vm.runInNewContext / gameEllipseTrace）本來就在 test_fixde.js 裡、
    不在 index.html——被誤報成「死錨點」。錯的是掃描器，不是文件。
    """
    start = end = None
    for i, l in enumerate(arch):
        if l.startswith('## 1. 檔案分節地圖'):
            start = i
        elif start is not None and l.startswith('## '):
            end = i
            break
    return (start if start is not None else 0), (end if end is not None else len(arch))


def scan():
    arch, idx = load()
    lo, hi = section_bounds(arch)
    out = []
    for i, line in enumerate(arch):
        if not (lo <= i < hi):
            continue
        m = ROW.match(line)
        if not m:
            continue
        cell = m.group('anchor')
        ancs = anchors_of(cell)
        if not ancs:
            continue
        declared = m.group('line').strip()
        if not re.search(r'\d', declared):
            continue
        hits = [(a, first_hit(idx, a)) for a in ancs]
        found = [h for h in hits if h[1]]
        out.append({
            'row': i, 'declared': declared, 'anchors': ancs,
            'hits': hits, 'actual': min(h[1] for h in found) if found else None,
        })
    return arch, idx, out


def main(argv):
    mode = argv[1] if len(argv) > 1 else '--check'
    arch, idx, rows = scan()
    dead = [r for r in rows if r['actual'] is None]
    drift = [r for r in rows if r['actual'] is not None and r['declared'] != str(r['actual'])]
    print('ARCH 分節地圖：可檢查的列 %d' % len(rows))
    print('  死錨點（index.html 找不到）：%d' % len(dead))
    print('  行號與實測不符：%d' % len(drift))
    for r in dead:
        print('    [死] ARCH:%d  %s' % (r['row'] + 1, ', '.join(r['anchors'])[:70]))
    for r in drift[:12]:
        print('    [漂] ARCH:%-4d 宣稱 %-10s 實測 %-6d %s'
              % (r['row'] + 1, r['declared'], r['actual'], r['anchors'][0][:52]))
    if len(drift) > 12:
        print('    …另有 %d 列' % (len(drift) - 12))

    if mode == '--fix':
        for r in rows:
            if r['actual'] is None:
                continue
            line = arch[r['row']]
            m = ROW.match(line)
            arch[r['row']] = '|%s|%s|%s|' % (m.group('sec'), ' %d ' % r['actual'], m.group('anchor'))
        io.open(ARCH, 'w', encoding='utf-8', newline='').write('\n'.join(arch))
        print('\n已重寫 %d 列的行號欄（死錨點 %d 列未動，需人工處理）' % (len(rows) - len(dead), len(dead)))
        return 0

    return 0 if (not dead and not drift) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
