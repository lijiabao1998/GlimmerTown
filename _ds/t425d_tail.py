# -*- coding: utf-8 -*-
import io
# CHANGELOG T425D 條目
p = 'docs/CHANGELOG.md'
s = io.open(p, encoding='utf-8').read()
old = '# CHANGELOG — 每完成一張任務卡追加一行\n\n'
new = '''# CHANGELOG — 每完成一張任務卡追加一行

2026-08-10 | T425D 購物中心立體感深化卡（DeepSeek 出卡＋施工＋自審自合；業主反饋「最大的問題是立體程度不夠」；v11.55） | **等距箱體體積語言補強**（業主在樣張頁直接觀察診斷：65 是「正面矩形拼貼」——翼牆單面＋連續漸層像光照非面轉折、暗側帶僅 4px、屋頂平、窗無內凹——v1-v4 的 isoBox 是箱體語彙而 v0 不是）。**六件套落地**：①**翼牆階梯明暗**——連續漸層改 3 段色帶（受光 1/3 `#dcc7a6`／主面 `#cdb694`／背光 1/4 `#b89f82`，右翼暗一檔 `#c8b498/#b4a084/#967e68`）＋段間 1px 過渡線＝面轉折；②**暗側帶 4→8px**（`#a08a72`/`#8a7058`＝右面存在感）；③**屋頂板**——翼頂 3px 亮面（`#f0e4cc`/`#e0d0b8`）＋屋簷下 2px 投影線＝屋頂厚度；④**窗洞內凹**——窗框亮上暗下（TheoTown 窗是凹的）；⑤**中庭側面暗帶**（玻璃右緣 4px `#5a7a8a`）；⑥**門洞內凹**（門框亮上）。**守衛**：T425B G2b/T425C G2c/G3c 漸層釘改階梯釘（翼牆禁連續漸層、中庭玻璃保留＝幕牆語義）；T425D G1d-G4d 新釘（階梯三色帶/過渡線/側帶 8px/屋頂板/屋簷投影/窗洞/中庭暗帶/門框）。**紅源三案全紅具名**（M1 背光面改回漸層→G3c、M2 側帶 8→4px→G2d、M3 刪屋頂板→G3d）。240 元素（219→+21）菱形內含 ±2px、菱形外 315 保持（守衛驗算保證）、sprFootAudit 全域 0、兩釘 4153/4550 恆等、存檔位元組恆等、CRLF=0、verify ALL GREEN（PASS 4435→**4441** +6 只升不降）。樣張 A/B/C/D 對照（T425B／T425C 校準／TheoTown 參考／立體版）存 C:/dev/t425d-shots/——人眼軌。寫 `STOP: T425D_DONE` 自評完成。 | 驗收:通過（DeepSeek 自審自合：業主 2026-08-10 反饋「立體程度不夠」後以等距箱體體積語言補強；官方閘門 PASS=4441／exit 0／ALL GREEN／CRLF=0、兩釘恆等、240 元素菱形內含、紅源三案全紅具名、樣張 A/B/C/D 待業主人眼裁定；此為本輪單次角色例外，不作作者自合的一般先例——比照 T423-T425C 業主直令先例措辭）。
'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('CHANGELOG updated')

# ARCH
p = 'docs/ARCH.md'
s = io.open(p, encoding='utf-8').read()
old = '''**現況（測繪基準）**：單檔 `index.html`，v11.54，約 20,600 行（實測檔案 20,600 行＝T425C 色票校準後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425C**（購物中心色票校準：量化對齊 TheoTown 色域——亮度中位 0.68→0.61、廣場暖灰化、3 級漸層）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,435、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
new = '''**現況（測繪基準）**：單檔 `index.html`，v11.55，約 20,606 行（實測檔案 20,606 行＝T425D 立體感深化後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425D**（購物中心立體感深化：等距箱體體積語言——階梯明暗/暗側帶/屋頂板/窗洞，240 元素菱形內含）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,441、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
assert old in s, 'ARCH anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ARCH updated')
