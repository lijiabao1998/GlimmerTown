# -*- coding: utf-8 -*-
# T600 改前／改後並排對照圖（裁掉上方 HUD 列，左改前右改後，各自加標籤）
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding='utf-8')
SRC = sys.argv[1]; OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FONT = next((f for f in ['C:/Windows/Fonts/msjh.ttc', 'C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf'] if os.path.exists(f)), None)
fnt = ImageFont.truetype(FONT, 28) if FONT else ImageFont.load_default()
TAGS = [('core-z2', '市中心 z2'), ('core-z1', '市中心 z1'), ('suburb-z1', '郊區 z1'), ('all-z06', '全城 z0.6'), ('core-night-z1', '市中心夜景 z1'),
        ('core-winter-z2', '市中心冬天 z2'), ('shore-z2', '岸邊倒影 z2'), ('core-rot1-z1', '市中心旋轉 90° z1')]
for tag, zh in TAGS:
    a = os.path.join(SRC, 'T600-%s-before.webp' % tag); b = os.path.join(SRC, 'T600-%s-after.webp' % tag)
    if not (os.path.exists(a) and os.path.exists(b)): print('skip', tag); continue
    A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB')
    top = 44; A = A.crop((0, top, A.width, A.height)); B = B.crop((0, top, B.width, B.height))
    W = A.width + B.width + 12; H = max(A.height, B.height) + 50
    C = Image.new('RGB', (W, H), (24, 26, 32)); C.paste(A, (0, 50)); C.paste(B, (A.width + 12, 50))
    d = ImageDraw.Draw(C)
    d.text((16, 10), zh + '｜改前（款式＝存檔 bd.v）', fill=(235, 235, 235), font=fnt)
    d.text((A.width + 28, 10), zh + '｜改後（T600 v600：越中心越高）', fill=(255, 214, 120), font=fnt)
    o = os.path.join(OUT, 'T600-pair-%s.webp' % tag); C.save(o, 'WEBP', quality=80); print(o, C.size)
