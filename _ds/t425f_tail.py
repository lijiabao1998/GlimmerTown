# -*- coding: utf-8 -*-
import io
# T425F 卡面帳本
p = 'docs/tasks/T425F-購物中心像素質感卡.md'
s = io.open(p, encoding='utf-8').read()
old = '''## 五、驗證

1. 菱形外 ≤509 保持、sprFootAudit 全域 0、verify ALL GREEN（PASS ≥4442）、兩釘
2. 樣張（質感版）存 `C:/dev/t425f-shots/`——人眼軌
3. bump v11.57＋CHANGELOG/ARCH；STOP: **T425F_DONE**'''
new = '''## 五、驗證

1. verify ALL GREEN（PASS 4442→**4445**，+3 守衛）、兩釘 4153/4550、CRLF=0 ✓
2. **紅源三案全紅具名**：M1 描邊改回深色（26,30,44）→G1f；M2 刪磚紋→G2f；M3 刪右面招牌→G3f（M1 首版突變腳本截斷註解致語法破壞——精確重跑後咬住）
3. 菱形外 ≤509（箱體側面垂直結構基線）、sprFootAudit 全域 0
4. 樣張 `C:/dev/t425f-shots/t425f_mall_texture.png`（31,833 bytes）——人眼軌
5. bump v11.57＋CHANGELOG/ARCH；STOP: **T425F_DONE**'''
assert old in s, 'card anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('card updated')

# CHANGELOG
p = 'docs/CHANGELOG.md'
s = io.open(p, encoding='utf-8').read()
old = '# CHANGELOG — 每完成一張任務卡追加一行\n\n'
new = '''# CHANGELOG — 每完成一張任務卡追加一行

2026-08-10 | T425F 購物中心像素質感卡（DeepSeek 出卡＋施工＋自審自合；業主反饋「角度對了，但是像素顯示效果不對」＋「你很棒的，我相信你」；v11.57） | **像素呈現質感補強**（結構化方向已被業主確認「角度對了」——本輪修「像素顯示效果」）：①**描邊淡化**——65 段 outlineSprite 深藍黑 (26,30,44) → 淺灰 (176,182,192)（TheoTown 教程第一條「避免深色輪廓」——箱體被黑框包住＝貼紙感而非像素寫實）；②**主箱左面中央帶磚紋**——水平二色紋（y258..266 x120..144，菱形下半中央帶——像素材質工藝）；③**右翼箱面 MALL 招牌**——紅底橫條 40×10＋雙行白字（後畫覆蓋＝貼面）；④**屋頂花園刪除**（中庭箱/天窗已佔滿頂面、與招牌互斥——植栽語義由噴泉側灌木承接）。**守衛 G1f-G3f**（淺描邊/磚紋/右面招牌）全綠；**紅源三案全紅具名**（M1 深描邊→G1f、M2 刪磚紋→G2f、M3 刪招牌→G3f）。PASS 4442→**4445**（+3 只升不降）、兩釘 4153/4550 恆等、存檔位元組恆等、菱形外 ≤509（箱體側面垂直結構基線）、sprFootAudit 全域 0、CRLF=0、verify ALL GREEN。樣張 `C:/dev/t425f-shots/t425f_mall_texture.png`——人眼軌交業主。寫 `STOP: T425F_DONE` 自評完成。 | 驗收:通過（DeepSeek 自審自合：業主 2026-08-10 反饋「角度對了，像素顯示效果不對」後以像素質感四件套補強；官方閘門 PASS=4445／exit 0／ALL GREEN／CRLF=0、兩釘恆等、紅源三案全紅具名、樣張待業主人眼裁定；此為本輪單次角色例外，不作作者自合的一般先例——比照 T423-T425E 業主直令先例措辭）。
'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('CHANGELOG updated')

# ARCH
p = 'docs/ARCH.md'
s = io.open(p, encoding='utf-8').read()
old = '''**現況（測繪基準）**：單檔 `index.html`，v11.56，約 20,528 行（實測檔案 20,528 行＝T425E 結構化重構後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425E**（購物中心結構化 2.5D：isoBox 八箱體等距組合，264 元素菱形內含）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,442、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
new = '''**現況（測繪基準）**：單檔 `index.html`，v11.57，約 20,545 行（實測檔案 20,545 行＝T425F 像素質感後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425F**（購物中心像素質感：淺描邊/磚紋/右面招牌——箱體工藝補強）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,445、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
assert old in s, 'ARCH anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ARCH updated')
