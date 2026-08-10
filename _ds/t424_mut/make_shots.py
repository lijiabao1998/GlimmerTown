# T424 樣張：before/after 三鍵真渲染對照條（日/夜）
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image

def extract(path, wl):
    html = io.open(path, encoding='utf-8').read()
    m = re.search(r'const HERO_PIX=\{\n([\s\S]*?)\n\};', html)
    keys = {}
    for l in m.group(1).split('\n'):
        km = re.match(r"\s*'([^']+)':\{", l)
        if not km: continue
        k = km.group(1)
        if k in wl:
            keys[k] = eval('({' + l.strip().rstrip(',') + '})')[k]
    return keys

def render(d, scale=3, night=False):
    w, h = d['w'], d['h']
    im = Image.new('RGBA', (w*scale, h*scale), (0,0,0,0))
    for ry, row in enumerate(d['rows']):
        for rx, ch in enumerate(row):
            if ch == '.': continue
            col = d['palN'].get(ch) if night else d['pal'].get(ch)
            if not col: continue
            r,g,b = int(col[1:3],16), int(col[3:5],16), int(col[5:7],16)
            for dy in range(scale):
                for dx in range(scale):
                    im.putpixel((rx*scale+dx, ry*scale+dy), (r,g,b,255))
    return im

WL = ['6_1_0','7_1_0','11']
names = {'6_1_0':'消防局 6_1_0','7_1_0':'學校 7_1_0','11':'警察局 11'}
before = extract('_ds/t424_mut/before.html', WL)
after = extract('index.html', WL)
SC = 3
# 每鍵對照條：標題 + before日 + after日 + before夜 + after夜（並排）
pad = 8; lab = 16; y = pad
W = 0; H = 0
for k in WL:
    w = max(before[k]['w'], after[k]['w'])
    W = max(W, w*SC*2 + pad*3)
    H += lab + 2*w*SC + pad*2
H += pad
cv = Image.new('RGBA', (W, H), (18, 22, 32, 255))
from PIL import ImageDraw
dr = ImageDraw.Draw(cv)
y = pad
for k in WL:
    dr.text((pad, y), f'{names[k]}   before日 | after日 | before夜 | after夜', fill=(255,212,95,255))
    y += lab
    bd, ad = before[k], after[k]
    bn, an = before[k], after[k]
    cv.paste(render(bd, SC), (pad, y))
    cv.paste(render(ad, SC), (pad + ad['w']*SC + pad, y))
    cv.paste(render(bn, SC, night=True), (pad + ad['w']*SC + pad + ad['w']*SC + pad, y))
    cv.paste(render(an, SC, night=True), (pad + ad['w']*SC + pad + ad['w']*SC + pad + ad['w']*SC + pad, y))
    y += max(bd['h'], ad['h'])*SC + pad
cv.save(r'C:/dev/t424-shots/t424_strip_before_after.png')
print('strip saved C:/dev/t424-shots/t424_strip_before_after.png', cv.size)
# 單鍵放大樣張（after 日/夜）
for k in WL:
    d = after[k]
    render(d, 6).save(f'C:/dev/t424-shots/t424_{k}_day6x.png')
    render(d, 6, night=True).save(f'C:/dev/t424-shots/t424_{k}_night6x.png')
print('singles saved')
