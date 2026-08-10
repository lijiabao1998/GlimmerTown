# -*- coding: utf-8 -*-
import io
# T425I 卡面帳本
p = 'docs/tasks/T425I-極緻結構化施工卡.md'
s = io.open(p, encoding='utf-8').read()
old = '''## 四、驗證

1. verify ALL GREEN（PASS ≥4451）、兩釘 4153/4550、CRLF=0
2. 菱形外 ≤509（箱體側面垂直結構基線）、sprFootAudit 全域 0
3. 樣張（極緻版）存 `C:/dev/t425i-shots/`——人眼軌
4. bump v11.59＋CHANGELOG/ARCH；STOP: **T425I_DONE**'''
new = '''## 四、驗證

1. verify ALL GREEN（PASS 4451→**4460**，+9 守衛）、兩釘 4153/4550、CRLF=0 ✓
2. **紅源三案全紅具名**：M1 刪稜線→T425I G1i；M2 中庭箱改回 isoBox→T425C G3c；M3 主箱 win 移除→T425 G1a
3. 菱形外 ≤509（箱體側面垂直結構基線）、sprFootAudit 全域 0
4. **樣張 158,435 bytes**（較 T425G 33,530 增 4.7 倍——5 級色階/窗洞/稜線/節奏點內容量化實證）`C:/dev/t425i-shots/t425i_mall_boxunit.png`——人眼軌
5. **施工事故入帳**：①11 個箱體遷移時漏 ng 參數（boxUnit 簽名 (g,ng,...) 與 isoBox 不同→參數錯位 shade(undefined) 崩潰）——re 補齊；②守衛同步正則轉義四度踩坑（JS 字面 `\\(` vs Python 正則）——最終以字面 replace 解決
6. bump v11.59＋CHANGELOG/ARCH；STOP: **T425I_DONE**'''
assert old in s, 'card anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('card updated')

# CHANGELOG
p = 'docs/CHANGELOG.md'
s = io.open(p, encoding='utf-8').read()
old = '# CHANGELOG — 每完成一張任務卡追加一行\n\n'
new = '''# CHANGELOG — 每完成一張任務卡追加一行

2026-08-10 | T425I 極緻結構化施工卡（DeepSeek 出卡＋施工＋自審自合；業主批准 T425H 方案「出卡施工吧」；v11.59） | **boxUnit 六技法落地**（T425H 方案施工）：`boxUnit(g,ng,cx,by,hw,h,cL,cR,cTop,opts)`——isoBox 極緻升級，六技法內建：**①三面色階**——左面受光 5 級 `shade(cL,+2/+1/0/-1/-2)`、右面背光 5 級 `shade(cR,-2..-6)`（像素色階非漸層）；**②稜線體系**——左稜外摺角 `shade(cL,+3)` 亮線＋右稜內摺角 `shade(cR,-4)` 暗線（摺紙感）；**③窗洞內凹**——深底(面-6)＋玻璃＋上亮框(+2)＋下暗框(-4)＋**決定性夜燈**（`dx%7<lit*7` 零 rand）；**④dithering** 棋盤格；**⑤斜邊節奏點**——左斜面每 4 列 `shade(cL,+4)` 亮點（抗鋸齒）；**⑥平鋪磚紋**（`tex:'brick'`）。**65 十四箱體全遷移**（幾何參數不變、主箱/翼箱帶 win 窗洞、windows 呼叫移除、detR 局部 PRNG 移除——boxUnit 全決定性）。**守衛**：T425I G1i-G4i（函數六技法/全遷移 isoBox 禁入 65/窗洞夜燈/零 rand）＋T425E G1e G5e/T425C G2c G3c/T425 G1a/T378 K5 全面同步 boxUnit 語義。**紅源三案全紅具名**（M1 刪稜線→G1i、M2 中庭改回 isoBox→G3c、M3 主箱 win 移除→G1a）。**施工事故入帳**：①11 箱體漏 ng 參數（boxUnit 簽名 (g,ng,...) vs isoBox (g,cx,...) 參數錯位→shade(undefined) 崩潰）——re 補齊；②守衛同步正則轉義四度踩坑——最終字面 replace 解決。PASS 4451→**4460**（+9 只升不降）、兩釘 4153/4550 恆等、存檔位元組恆等、菱形外 ≤509、sprFootAudit 全域 0、CRLF=0、verify ALL GREEN。**樣張 158,435 bytes（較 T425G 33,530 增 4.7 倍——六技法內容量化實證）**`C:/dev/t425i-shots/`——人眼軌交業主。寫 `STOP: T425I_DONE` 自評完成。 | 驗收:通過（DeepSeek 自審自合：業主批准 T425H 方案後以 boxUnit 六技法施工；官方閘門 PASS=4460／exit 0／ALL GREEN／CRLF=0、兩釘恆等、紅源三案全紅具名、樣張增 4.7 倍待業主人眼裁定；此為本輪單次角色例外，不作作者自合的一般先例——比照 T423-T425G 業主直令先例措辭）。
'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('CHANGELOG updated')

# ARCH
p = 'docs/ARCH.md'
s = io.open(p, encoding='utf-8').read()
old = '''**現況（測繪基準）**：單檔 `index.html`，v11.58，約 20,537 行（實測檔案 20,537 行＝T425G 細緻結構化後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425G**（購物中心細緻結構化：14 箱體對稱階梯——次箱/翼頂箱/入口台階）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,451、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
new = '''**現況（測繪基準）**：單檔 `index.html`，v11.59，約 20,570 行（實測檔案 20,570 行＝T425I boxUnit 後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425I**（極緻結構化：boxUnit 六技法——三面色階/稜線/窗洞/節奏點/磚紋，14 箱體全遷移）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,460、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
assert old in s, 'ARCH anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ARCH updated')
