# -*- coding: utf-8 -*-
import io
p = 'test_fixde.js'
s = io.open(p, encoding='utf-8').read()
n = 0
subs = [
  (r'isoBox\(sg,ax,ay,96,32', r'boxUnit\(sg,ng,ax,ay,96,32'),
  (r'isoBox\(sg,ax-44,ay,40,24', r'boxUnit\(sg,ng,ax-44,ay,40,24'),
  (r'isoBox\(sg,ax\+44,ay,44,30', r'boxUnit\(sg,ng,ax\+44,ay,44,30'),
  (r'isoBox\(sg,ax,198,24,24', r'boxUnit\(sg,ng,ax,198,24,24'),
  (r'isoBox\(sg,ax-16,180,12,10', r'boxUnit\(sg,ng,ax-16,180,12,10'),
  (r'isoBox\(sg,ax\+16,180,12,10', r'boxUnit\(sg,ng,ax\+16,180,12,10'),
  (r'isoBox\(sg,ax,174,6,14', r'boxUnit\(sg,ng,ax,174,6,14'),
  (r'isoBox\(sg,ax,246,30,4', r'boxUnit\(sg,ng,ax,246,30,4'),
  (r'isoBox\(sg,ax-24,190,16,12', r'boxUnit\(sg,ng,ax-24,190,16,12'),
  (r'isoBox\(sg,ax\+24,190,16,12', r'boxUnit\(sg,ng,ax\+24,190,16,12'),
  (r'isoBox\(sg,ax-44,240,16,12', r'boxUnit\(sg,ng,ax-44,240,16,12'),
  (r'isoBox\(sg,ax\+44,240,16,12', r'boxUnit\(sg,ng,ax\+44,240,16,12'),
  (r'isoBox\(sg,ax,262,16,4', r'boxUnit\(sg,ng,ax,262,16,4'),
  (r'isoBox\(sg,ax,252,20,4', r'boxUnit\(sg,ng,ax,252,20,4'),
]
for old, new in subs:
    if old in s:
        s = s.replace(old, new, 1)
        n += 1
old = "const boxN65e=(seg65e.match(/isoBox\(sg,/g)||[]).length;"
new = "const boxN65e=(seg65e.match(/boxUnit\(sg,/g)||[]).length;"
if old in s:
    s = s.replace(old, new, 1); n += 1
old = """    assert(/const detR=\(\(\)=>\{let ws=911\+65\*37/.test(html),
      'T425E G1e 箱體：局部決定性 PRNG（零全域 rand，T223 先例）必須存在');"""
new = """    assert(!/\brand\(/.test(seg65e.slice(0,seg65e.indexOf('boxUnit(sg,'))),
      'T425E G1e 箱體：65 段箱體區零 rand（boxUnit 內建決定性——T425I 取代 PRNG）');"""
if old in s:
    s = s.replace(old, new, 1); n += 1
old = """      assert(html.includes('windows(sg,ng,ax,ay,96,32') && html.includes('windows(sg,ng,ax+44,ay,44,30'),
        'T378 K5：k65 箱體窗日夜對齊（windows 同呼 sg/ng 雙層——T425E 箱體化取代店窗帶）');"""
new = """      assert(html.includes('boxUnit(sg,ng,ax,ay,96,32') && /win:\{gx:10,ht:5,lit:\.55\}/.test(html),
        'T378 K5：k65 箱體窗日夜對齊（boxUnit win 窗洞＋決定性夜燈——T425I 取代 windows）');"""
if old in s:
    s = s.replace(old, new, 1); n += 1
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('guards synced:', n, 'literal replacements')
