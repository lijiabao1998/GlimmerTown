#!/usr/bin/env python3
# T424 三鍵 hero 生成器：theotown 風格（等距箱體+材質肌理+附屬物）→ HERO_PIX 字元矩陣
# 輸出：JS 字面量段（貼入 index.html 1488-1490 行）＋ 4x 樣張 PNG
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image

OUT = r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\bay-deepseek\_ds\t424_gen_out'
os.makedirs(OUT, exist_ok=True)

# ---------------- 網格繪圖庫 ----------------
POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;<=>?@[]^_{|}~"
class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.cells = [['.' for _ in range(w)] for _ in range(h)]
        self.pal = {}   # sym -> '#rrggbb'
        self.palN = {}  # sym -> '#rrggbb'（夜）
    def sym(self, color, night=None):
        for s, c in self.pal.items():
            if c == color and (night is None or self.palN.get(s) == night):
                return s
        s = POOL[len(self.pal)]
        assert len(self.pal) < len(POOL), 'palette overflow'
        self.pal[s] = color
        if night is not None:
            self.palN[s] = night
        return s
    def px(self, x, y, color, night=None):
        if x < 0 or x >= self.w or y < 0 or y >= self.h: return
        s = self.sym(color, night)
        self.cells[y][x] = s
    def rect(self, x, y, w, h, color, night=None):
        for j in range(y, y+h):
            for i in range(x, x+w):
                self.px(i, j, color, night)
    def brick(self, x, y, w, h, c1, c2, c1N=None):
        """二色磚紋：每行錯位 1px。c1 為主色（左下亮面）、c2 為縫色。"""
        for j in range(y, y+h):
            for i in range(x, x+w):
                off = (j & 1)
                c = c1 if ((i + off) % 3) else c2
                self.px(i, j, c)
    def dia(self, cx, top, halfw, halfh, color, edge=None, night=None):
        """實心菱形（含邊）：頂點 (cx,top)，半寬 halfw，半高 halfh。"""
        for j in range(top, top + halfh*2 + 1):
            dy = j - top
            hw = round(halfw * (1 - abs(dy - halfh) / halfh))
            for i in range(cx - hw, cx + hw + 1):
                self.px(i, j, color, night)
        if edge:
            # 上邊
            for i in range(cx - halfw, cx + halfw + 1):
                self.px(i, top, edge)
    def roofDia(self, cx, top, halfw, halfh, cTop, cLeft, cRight, edge):
        """等距屋頂菱形：頂部亮、左斜面 cLeft、右斜面 cRight、下緣 edge 勾邊。"""
        for j in range(top, top + halfh*2 + 1):
            dy = j - top
            hw = round(halfw * (1 - abs(dy - halfh) / halfh))
            for i in range(cx - hw, cx + hw + 1):
                if j == top: c = cTop
                elif i < cx: c = cLeft
                else: c = cRight
                self.px(i, j, c)
        # 下緣深色勾邊（左底→右底）
        for i in range(cx - halfw, cx + halfw + 1):
            self.px(i, top + halfh*2, edge)
    def rows(self):
        out = []
        for row in self.cells:
            s = ''.join(row)
            # 去尾 '.'（行短合法）
            s = s.rstrip('.')
            out.append(s)
        return out

def dump_js(g, w, h, ox, oy, name):
    pal = ','.join("'%s':'%s'" % (k, v) for k, v in sorted(g.pal.items()))
    palN = ','.join("'%s':'%s'" % (k, v) for k, v in sorted(g.palN.items()))
    rows = ','.join("'%s'" % r for r in g.rows())
    return "'%s':{w:%d,h:%d,ox:%d,oy:%d,pal:{%s},palN:{%s},rows:[%s]}" % (
        name, w, h, ox, oy, pal, palN, rows)

def render_png(g, w, h, path, scale=4, night=False):
    im = Image.new('RGBA', (w*scale, h*scale), (0,0,0,0))
    for j in range(h):
        for i in range(w):
            ch = g.cells[j][i]
            if ch == '.': continue
            col = g.palN.get(ch) if night else g.pal.get(ch)
            if not col: continue
            r, gg, b = int(col[1:3],16), int(col[3:5],16), int(col[5:7],16)
            for dy in range(scale):
                for dx in range(scale):
                    im.putpixel((i*scale+dx, j*scale+dy), (r,gg,b,255))
    im.save(path)

# ---------------- 消防局 6_1_0（56×71, ox8, oy37） ----------------
# 活圖疊加區（網格座標，避讓）：警戒線 y65-66 x14-42；門燈 y45-47 x22-25,32-35；
#   水帶卷 y49-54 x42-46；彩點 y55-61 多處
def fire_station():
    g = Grid(56, 71)
    W_L, W_D = '#ece7da', '#d8d2c2'      # 塔白面亮/暗
    B_L, B_D = '#c8452f', '#a83522'      # 紅磚亮/暗（主）
    B_L2, B_D2 = '#b53a26', '#93301f'    # 磚縫色
    R_L, R_D, R_T = '#e05252', '#b83c25', '#ff6a6a'  # 屋瓦亮/暗/頂
    G_L, G_D = '#d9d3c4', '#c2bcae'      # 車庫門淺
    DRK = '#3a2f22'
    WND, WNDN = '#2a3550', '#ffd77a'
    GROUND = '#9a9484'

    # --- 地面（底 5 行，活圖警戒線區）---
    for j in range(66, 71):
        for i in range(2, 54):
            g.px(i, j, GROUND)

    # --- 中央瞭望塔：菱形頂 + 白塔身 ---
    # 塔頂菱形：cx28, top6, halfw7, halfh5（頂點 y6，底 y16）
    g.roofDia(28, 6, 7, 5, R_T, R_L, R_D, DRK)
    # 警燈（塔頂之上）
    g.rect(26, 3, 4, 2, '#e05252', '#ff5a5a')
    g.px(25, 4, DRK); g.px(30, 4, DRK)
    # 塔身 x22..33（亮面 22..27，暗面 28..33），y16..40（塔底與屋頂頂點齊）
    for j in range(16, 41):
        for i in range(22, 28): g.px(i, j, W_L)
        for i in range(28, 34): g.px(i, j, W_D)
    # 塔窗兩檔（y22-24、y31-33）
    g.rect(25, 22, 3, 3, WND, WNDN)
    g.rect(25, 31, 3, 3, WND, WNDN)
    # 塔底收邊
    for i in range(22, 34): g.px(i, 40, DRK)

    # --- 主體箱體：屋頂菱形（扁）+ 磚牆（高） ---
    # 屋頂：cx28, top40, halfw24, halfh5 → 底 y50
    g.roofDia(28, 40, 24, 5, R_T, R_L, R_D, DRK)
    # 牆：y50..66（16px，左亮右暗磚紋），x4..27 / x28..51
    for j in range(50, 66):
        for i in range(4, 28):
            c = B_L if ((i + (j & 1)) % 3) else B_L2
            g.px(i, j, c)
        for i in range(28, 52):
            c = B_D if ((i + (j & 1)) % 3) else B_D2
            g.px(i, j, c)
    # 屋簷下緣深色
    for i in range(4, 52): g.px(i, 50, DRK)

    # --- 車庫門（左右各一，x7..16 / x40..49，y56..66）---
    for (gx0, gx1) in [(7, 16), (40, 49)]:
        for j in range(56, 67):
            for i in range(gx0, gx1 + 1):
                edge = (i == gx0 or i == gx1 or j == 66)
                g.px(i, j, W_L if edge else G_D)
        # 捲門線
        for j in range(58, 66, 2):
            for i in range(gx0 + 1, gx1):
                g.px(i, j, '#9a9484')
        # 門楣
        for i in range(gx0, gx1 + 1): g.px(i, 55, DRK)
    # 門間中央柱 x28..29（牆面）——已是磚紋

    # --- 附屬物：側牆徽章、塔基掛燈（避開活圖水帶卷 x42..46 y49..54）---
    g.rect(20, 52, 4, 2, '#dbb42c')          # 左牆黃色徽章條
    g.rect(33, 52, 3, 2, '#dbb42c')          # 右牆徽章
    # 塔基兩側屋簷掛燈（活圖門燈在 y45-47，避開 x22-25/32-35）
    g.px(17, 46, WND, WNDN); g.px(39, 46, WND, WNDN)
    # 地面側溝線
    for i in range(2, 54, 2): g.px(i, 65, '#8a8474')
    return g

# ---------------- 學校 7_1_0（56×64, ox8, oy44） ----------------
# 活圖：斑馬線 y58-60 x16-36；花箱 y48-49 x12-17；門廊暖光 y36-38 x18-37
def school():
    g = Grid(56, 64)
    BR_L, BR_D = '#e8c06a', '#d1a94e'      # 米黃磚亮/暗
    BR_L2, BR_D2 = '#d9b45a', '#bf9a42'    # 縫色
    RF_L, RF_D, RF_T = '#8a6a3a', '#6e5530', '#a87f45'  # 深藍灰屋瓦（暖棕系貼既有語彙）
    W_L, W_D = '#f4efe0', '#e3dcc8'        # 鐘樓白面
    WND, WNDN = '#2a3550', '#ffe08a'
    DRK = '#3a2f22'
    GROUND = '#9a9484'
    GRN1, GRN2 = '#5a9a3a', '#4a8a2e'      # 樹冠亮/暗
    TRUNK = '#5a3a24'

    # 地面（y60..63）
    for j in range(60, 64):
        for i in range(2, 54): g.px(i, j, GROUND)

    # --- 鐘樓（左，cx14）：尖頂+塔身 ---
    g.roofDia(14, 3, 6, 5, RF_T, RF_L, RF_D, DRK)   # 頂 y3 底 y13
    g.px(13, 1, '#c53a2b'); g.px(15, 1, '#c53a2b')  # 尖頂旗
    for j in range(13, 34):
        for i in range(10, 15): g.px(i, j, W_L)
        for i in range(15, 19): g.px(i, j, W_D)
    g.rect(12, 16, 4, 4, '#3a3530', '#ffe08a')       # 鐘面
    g.rect(13, 17, 2, 2, '#f4efe0', '#fff2c0')
    g.px(14, 17, '#c53a2b', '#ff8080')               # 鐘擺點
    g.rect(12, 25, 2, 4, WND, WNDN); g.rect(15, 25, 2, 4, WND, WNDN)  # 塔窗
    for i in range(10, 19): g.px(i, 33, DRK)
    # 旗桿（鐘樓左）
    for j in range(12, 34): g.px(7, j, '#8b95a5')
    g.rect(6, 12, 3, 2, '#e05252')                   # 紅旗
    # 鐘樓台基（屋頂頂點齊）
    g.rect(8, 34, 12, 3, '#d9c68a')

    # --- 主體箱體：屋頂菱形（扁）+ 磚牆（高） ---
    g.roofDia(30, 36, 24, 5, RF_T, RF_L, RF_D, DRK)  # 頂 y36 底 y46
    for j in range(46, 60):
        for i in range(6, 30):
            c = BR_L if ((i + (j & 1)) % 3) else BR_L2
            g.px(i, j, c)
        for i in range(30, 54):
            c = BR_D if ((i + (j & 1)) % 3) else BR_D2
            g.px(i, j, c)
    for i in range(6, 54): g.px(i, 46, DRK)
    # 窗帶兩排（x10..22 / x34..46，y50-53、y54-57 避開門區 x24..33）
    for jj, y0 in enumerate([50, 54]):
        for i in range(10, 23, 4):
            g.rect(i, y0, 3, 3, WND, WNDN)
        for i in range(34, 47, 4):
            g.rect(i, y0, 3, 3, WND, WNDN)
    # 中央大門（x25..32，y53..59，斑馬線活圖 y58-60 疊地面）
    for i in range(25, 33):
        for j in range(53, 60):
            edge = (i == 25 or i == 32 or j == 59)
            g.px(i, j, '#d9c68a' if edge else '#6e5530')
    g.rect(27, 54, 2, 4, '#3a3530', '#ffe08a')       # 門窗
    for i in range(25, 33): g.px(i, 52, DRK)

    # --- 右翼低房（x38..53，屋頂 y48 底 y56，牆 y56..60）---
    g.roofDia(46, 48, 9, 4, RF_T, RF_L, RF_D, DRK)
    for j in range(56, 61):
        for i in range(37, 55):
            c = BR_D if ((i + (j & 1)) % 3) else BR_D2
            g.px(i, j, c)
    # 右翼門（x45..50）
    for i in range(45, 51):
        for j in range(58, 60): g.px(i, j, '#6e5530')
    # 右翼窗
    g.rect(39, 52, 3, 3, WND, WNDN); g.rect(51, 52, 3, 3, WND, WNDN)

    # --- 附屬物：樹（前院左 x2..5，放大）---
    for i in range(2, 6):
        for j in range(52, 55): g.px(i, j, TRUNK)
    g.dia(3, 44, 4, 4, GRN1, GRN2)
    g.px(1, 47, GRN2); g.px(6, 48, GRN2); g.px(3, 43, GRN2)
    g.px(0, 46, GRN2); g.px(5, 46, GRN2)
    return g

# ---------------- 警察局 11（57×55, ox9, oy55） ----------------
# 活圖：巡邏車 y39-43 x9-18；門燈 y27-29 x23-30；台階 y49-50 x15-38
def police():
    g = Grid(57, 55)
    W_L, W_D = '#7a95c4', '#5f7aab'        # 藍灰牆亮/暗
    W_L2, W_D2 = '#6a83b2', '#4f6496'      # 縫色（加深對比）
    GL_L, GL_D = '#b8dcf8', '#8fc0e8'      # 玻璃帶亮/暗（更亮，與牆拉開）
    RF = '#2c487a'                         # 深藍平頂
    WHT = '#e8ecf5'
    WND, WNDN = '#232f4a', '#7ab0ff'
    DRK = '#1c2436'
    GROUND = '#9a9484'
    CAR_B = '#3a5fb0'; CAR_W = '#e8ecf5'; CAR_G = '#5a82cc'

    # 地面（y51..54）
    for j in range(51, 55):
        for i in range(2, 55): g.px(i, j, GROUND)

    # --- 主體：平頂現代（現代低層：屋頂 y8）---
    for i in range(4, 53): g.px(i, 8, RF)           # 屋頂線
    for i in range(3, 54): g.px(i, 9, DRK)          # 護欄陰影
    # 牆 y10..51（左亮右暗）
    for j in range(10, 52):
        for i in range(4, 29):
            c = W_L if ((i + (j & 1)) % 3) else W_L2
            g.px(i, j, c)
        for i in range(29, 53):
            c = W_D if ((i + (j & 1)) % 3) else W_D2
            g.px(i, j, c)
    # 屋頂附屬：空調箱（右）、天線（左）
    g.rect(44, 5, 5, 3, '#5f6d8c'); g.rect(45, 4, 3, 1, '#7a8db0')
    g.rect(10, 3, 1, 5, '#8b95a5'); g.rect(8, 2, 3, 1, '#e05252', '#ff5a5a')
    # 牆頂飾帶（白）
    for i in range(4, 53): g.px(i, 10, WHT)

    # --- 玻璃帶（左面兩段，避開活圖車區 x9..18 y39..43；中段 x6..14 y20..36、下段 x20..27 y24..30 縮短）---
    for i in range(6, 15):
        for j in range(20, 36):
            g.px(i, j, GL_L)
        for j in range(24, 32):
            g.px(20 + (i - 6), j, GL_D) if False else None
    # 右面玻璃帶（x34..42，y22..38）
    for i in range(34, 42):
        for j in range(22, 38):
            g.px(i, j, GL_D)
    # 玻璃帶窗框線
    for i in range(6, 15):
        g.px(i, 27, '#e8ecf5'); g.px(i, 33, '#e8ecf5')
    for i in range(34, 42):
        g.px(i, 29, '#e8ecf5'); g.px(i, 35, '#e8ecf5')
    # 左面下段窗（x20..27 y30..36，活圖車在 y39 之下，不衝突）
    for i in range(20, 28):
        for j in range(31, 36):
            g.px(i, j, GL_L)

    # --- 入口（中央 x24..33，y44..49；台階活圖 y49-50 疊地面）---
    for i in range(24, 34):
        for j in range(44, 50):
            edge = (i == 24 or i == 33 or j == 49)
            g.px(i, j, WHT if edge else DRK)
    g.rect(27, 45, 3, 4, GL_L, WNDN)       # 門玻璃
    g.px(25, 46, '#e8b23e', '#ffe9a0'); g.px(31, 46, '#e8b23e', '#ffe9a0')  # 門燈

    # --- 附屬物：路燈（左前院 x2..3）---
    for j in range(36, 51): g.px(3, j, '#8b95a5')
    g.rect(1, 34, 5, 2, '#cfe8ff', '#fff2c0')      # 燈頭
    # 旗（右前院 x52..53）
    for j in range(30, 51): g.px(53, j, '#8b95a5')
    g.rect(52, 28, 3, 2, '#3a5fb0')                # 藍旗
    # 巡邏車（前院左 x12..20，y46..50；與活圖車 y39-43 x9-18 分開兩台）
    for i in range(12, 21):
        g.px(i, 48, CAR_B); g.px(i, 47, CAR_B)
    g.px(12, 46, CAR_W); g.px(13, 46, CAR_W); g.px(19, 46, CAR_W)
    g.rect(14, 49, 3, 1, '#20242c'); g.rect(18, 49, 3, 1, '#20242c')  # 輪
    g.px(16, 46, '#e05252', '#ff5a5a')             # 警燈
    g.px(15, 47, '#cfe8ff', '#7ab0ff')             # 窗
    # 地面車道線
    for i in range(6, 51, 3): g.px(i, 50, '#c2ccd8')
    return g

# ---------------- 輸出 ----------------
def main():
    keys = [
        ('6_1_0', 56, 71, 8, 37, fire_station()),
        ('7_1_0', 56, 64, 8, 44, school()),
        ('11', 57, 55, 9, 55, police()),
    ]
    with open(os.path.join(OUT, 't424_hero.js'), 'w', encoding='utf-8') as f:
        f.write('// T424 generated hero keys (theotown-style)\n')
        for name, w, h, ox, oy, g in keys:
            f.write(dump_js(g, w, h, ox, oy, name) + ',\n')
            render_png(g, w, h, os.path.join(OUT, f'{name}_day.png'), 4, night=False)
            render_png(g, w, h, os.path.join(OUT, f'{name}_night.png'), 4, night=True)
            # 驗證：界內＋字符合法性
            rows = g.rows()
            assert len(rows) <= h, name
            for r in rows:
                assert len(r) <= w, (name, len(r))
                for ch in r:
                    assert ch == '.' or ch in g.pal, (name, ch)
            assert set(g.palN) <= set(g.pal), name
            day = sum(len(r) for r in rows)
            night = sum(len(r) for r in rows)  # 近似：夜像素按字符數（palN 稀疏）
            print(f'{name}: rows={len(rows)} day_px={day} night_keys={len(g.palN)}')
    # 拼接條（三鍵並排）
    W = 56*3 + 8 + 8
    H = 71*4
    im = Image.new('RGBA', (W, H), (20, 26, 38, 255))
    x = 4
    for name, w, h, ox, oy, g in keys:
        day = Image.open(os.path.join(OUT, f'{name}_day.png'))
        night = Image.open(os.path.join(OUT, f'{name}_night.png'))
        im.paste(day, (x, 0)); im.paste(night, (x, h*4 + 4))
        x += w*4 + 4
    im.save(os.path.join(OUT, 't424_strip.png'))
    print('strip saved:', os.path.join(OUT, 't424_strip.png'))

if __name__ == '__main__':
    main()
