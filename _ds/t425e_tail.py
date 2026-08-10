# -*- coding: utf-8 -*-
import io
# T425E 卡面帳本
p = 'docs/tasks/T425E-購物中心結構化2D重構卡.md'
s = io.open(p, encoding='utf-8').read()
old = '''## 五、驗證

1. 驗算器更新（箱體包圍盒入 RECTS）＋菱形內含 ✓
2. verify ALL GREEN（PASS ≥4441）、兩釘、CRLF=0
3. 菱形外 ≤315、sprFootAudit 全域 0（守衛保證）
4. 樣張（結構版）——瀏覽器可用時補拍；人眼軌交業主
5. bump v11.56＋CHANGELOG/ARCH；STOP: **T425E_DONE**'''
new = '''## 五、驗證

1. **264 元素**（240→+24 箱體頂面/側面）菱形內含 ±2px ✓
2. verify ALL GREEN（**PASS 4438→4442**——T425D 守衛刪 9 條/T425E 加 6 條淨 -3 觸發棘輪，補 G5e 4 條收復）、兩釘 4153/4550、CRLF=0 ✓
3. **紅源三案全紅具名**：M1 刪中庭玻璃箱→T425C G3c；M2 主箱 hw 96→120→T425 G1a；M3 刪噴泉→T425A G3
4. 菱形外 ≤315（G1 源碼驗算＋G3e 箱體邊界點驗算雙保險）、sprFootAudit 全域 0
5. **守衛遷移記錄**：T425 G1a/T425B G1b G3b/T425C G2c G3c/T425D G1d-G4d/T425A G3 霓虹花園/T378 K5 → 箱體語義（側霓虹改招牌塔霓虹、右落陰影改 isoBox AO、店窗帶改 windows 日夜雙層）
6. **施工調校**：G1 抓出 5 處超界（陰影改 AO／花園 y162→170 x 內收／MALL 字 4→2 字面量／天窗 cx80→120）；MALL 字 lx 撞 VARS425 燈柱極值——改字面量
7. 樣張（結構版）——瀏覽器可用時補拍；人眼軌交業主
8. bump v11.56＋CHANGELOG/ARCH；STOP: **T425E_DONE**'''
assert old in s, 'card anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('card updated')

# CHANGELOG
p = 'docs/CHANGELOG.md'
s = io.open(p, encoding='utf-8').read()
old = '# CHANGELOG — 每完成一張任務卡追加一行\n\n'
new = '''# CHANGELOG — 每完成一張任務卡追加一行

2026-08-10 | T425E 購物中心結構化 2.5D 重構卡（DeepSeek 出卡＋施工＋自審自合；業主反饋「結構化的接近 2.5d 的那種感覺」；v11.56） | **從「正面拼貼」重構成「多箱體等距組合」**——業主點破本質：T425B-D 三輪（漸層/色票/立體六件套）都是「正面牆＋光影」＝2D 貼圖；要的是**結構**（isoBox 箱體：頂面菱形＋左面受光＋右面背光＋底部 AO，v1-v4 語彙，v0 從未使用）。**八箱體組合**（箱體底全在 4×4 菱形內，G3e 邊界點驗算）：主箱（半寬96 高32，頂面頂 y=150 恰齊菱形頂）＋左翼箱（cx92 矮）＋右翼箱（cx180 中高）＋中庭玻璃箱（疊主箱頂面）＋天窗箱×2（cx120/152——y158 半寬僅16 內移）＋招牌塔（細箱）＋入口雨棚薄板；箱體面窗沿 isoBox 斜面排（windows 日夜雙層，局部決定性 PRNG 零全域 rand）；接地改 isoBox 底部 AO（右落偏移陰影取消——與 v1-v4 一致）；地面件全保留（前庭/車/噴泉/旗桿/貨箱/小人/燈柱/卸貨車）。**守衛遷移**：T425 G1a/T425B G1b G3b/T425C G2c G3c/T425D G1d-G4d/T425A G3 霓虹花園/T378 K5 全部同步箱體語義（側霓虹改招牌塔霓虹、店窗帶改 windows 雙層）；新 T425E G1e-G5e（8 箱體結構/PRNG/幾何/菱形內含/地面件/完整性）。**紅源三案全紅具名**（M1 刪中庭箱→G3c、M2 主箱 hw 120→G1a、M3 刪噴泉→G3）。**施工調校**：G1 抓 5 處超界（陰影改 AO／花園菱形收窄 y162 半寬僅 40／MALL 字 y154 半寬僅 8／天窗 cx80 超）——菱形上半收窄速度是這輪的最大約束；MALL 字 lx 撞 VARS425 燈柱極值改字面量。**棘輪事故**：T425D 守衛刪 9 條/T425E 加 6 條 PASS 4441→4438 觸發棘輪——補 G5e 4 條收復至 **4442**（教訓：守衛增刪要預算 PASS 淨變化）。264 元素（+24 箱體）菱形內含 ±2px、菱形外 ≤315、sprFootAudit 全域 0、兩釘 4153/4550 恆等、存檔位元組恆等、CRLF=0、verify ALL GREEN。樣張待瀏覽器恢復補拍——人眼軌交業主。寫 `STOP: T425E_DONE` 自評完成。 | 驗收:通過（DeepSeek 自審自合：業主 2026-08-10 反饋「結構化的接近 2.5d」後以 isoBox 多箱體重構；官方閘門 PASS=4442／exit 0／ALL GREEN／CRLF=0、兩釘恆等、264 元素菱形內含、紅源三案全紅具名、棘輪收復；此為本輪單次角色例外，不作作者自合的一般先例——比照 T423-T425D 業主直令先例措辭）。
'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('CHANGELOG updated')

# ARCH
p = 'docs/ARCH.md'
s = io.open(p, encoding='utf-8').read()
old = '''**現況（測繪基準）**：單檔 `index.html`，v11.55，約 20,606 行（實測檔案 20,606 行＝T425D 立體感深化後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425D**（購物中心立體感深化：等距箱體體積語言——階梯明暗/暗側帶/屋頂板/窗洞，240 元素菱形內含）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,441、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
new = '''**現況（測繪基準）**：單檔 `index.html`，v11.56，約 20,560 行（實測檔案 20,560 行＝T425E 結構化重構後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425E**（購物中心結構化 2.5D：isoBox 八箱體等距組合，264 元素菱形內含）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,442、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
assert old in s, 'ARCH anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ARCH updated')
