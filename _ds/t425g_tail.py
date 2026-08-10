# -*- coding: utf-8 -*-
import io
# T425G 卡面帳本
p = 'docs/tasks/T425G-購物中心細緻結構化卡.md'
s = io.open(p, encoding='utf-8').read()
old = '''## 五、驗證

1. 菱形外 ≤509 保持、sprFootAudit 全域 0、verify ALL GREEN（PASS ≥4445）、兩釘
2. 樣張存 `C:/dev/t425g-shots/`——人眼軌
3. bump v11.58＋CHANGELOG/ARCH；STOP: **T425G_DONE**'''
new = '''## 五、驗證

1. verify ALL GREEN（PASS 4445→**4451**，+6 守衛）、兩釘 4153/4550、CRLF=0 ✓
2. **紅源三案全紅具名**：M1 刪次箱 R→T425E G1e（14→13）；M2 次箱 cx 非對稱（ax-18）→T425G G2g；M3 刪台階→T425E G1e
3. 菱形外 ≤509（箱體側面垂直結構基線）、sprFootAudit 全域 0
4. 樣張 `C:/dev/t425g-shots/t425g_mall_fine.png`（33,530 bytes）——人眼軌
5. 守衛更新：T425E G1e ≥8→≥14、G3e boxes 表 +6（邊界點驗算）、新增 G1g-G3g
6. bump v11.58＋CHANGELOG/ARCH；STOP: **T425G_DONE**'''
assert old in s, 'card anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('card updated')

# CHANGELOG
p = 'docs/CHANGELOG.md'
s = io.open(p, encoding='utf-8').read()
old = '# CHANGELOG — 每完成一張任務卡追加一行\n\n'
new = '''# CHANGELOG — 每完成一張任務卡追加一行

2026-08-10 | T425G 購物中心細緻結構化卡（DeepSeek 出卡＋施工＋自審自合；業主反饋「結構化不夠細，棱角更多且規律，有 2D 平面版本殘留」；v11.58） | **箱體階梯化＋對稱稜角**（八箱體的主箱是 96 寬大平面盒＝2D 平面感根源）：**+6 箱體全部左右對稱**——主箱頂次箱 L/R（ax±24,190,16,12，棱角+2）＋翼頂小箱 L/R（ax±44,240,16,12，三級階梯）＋**入口台階 2 級**（by262/252 薄箱——前庭 2D 地面結構化）。**體積階梯規律**：主箱(32)→次箱(12)→天窗(10)→塔(14)／翼箱(24/30)→翼頂箱(12)→台階(4)——大→中→小→細完全對稱。總箱體 8→**14**。**守衛**：T425E G1e ≥8→≥14、G3e boxes 表 +6（邊界點驗算）、新增 T425G G1g-G3g（階梯箱/對稱參數/台階）。**紅源三案全紅具名**（M1 刪次箱 R→G1e 14→13、M2 次箱 cx 非對稱→G2g、M3 刪台階→G1e）。PASS 4445→**4451**（+6 只升不降）、兩釘 4153/4550 恆等、存檔位元組恆等、菱形外 ≤509、sprFootAudit 全域 0、CRLF=0、verify ALL GREEN。樣張 `C:/dev/t425g-shots/t425g_mall_fine.png`——人眼軌交業主。寫 `STOP: T425G_DONE` 自評完成。 | 驗收:通過（DeepSeek 自審自合：業主 2026-08-10 反饋「結構化不夠細」後以 14 箱體對稱階梯化；官方閘門 PASS=4451／exit 0／ALL GREEN／CRLF=0、兩釘恆等、紅源三案全紅具名、樣張待業主人眼裁定；此為本輪單次角色例外，不作作者自合的一般先例——比照 T423-T425F 業主直令先例措辭）。
'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('CHANGELOG updated')

# ARCH
p = 'docs/ARCH.md'
s = io.open(p, encoding='utf-8').read()
old = '''**現況（測繪基準）**：單檔 `index.html`，v11.57，約 20,531 行（實測檔案 20,531 行＝T425F 像素質感後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425F**（購物中心像素質感：淺描邊/磚紋/右面招牌——箱體工藝補強）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,445、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
new = '''**現況（測繪基準）**：單檔 `index.html`，v11.58，約 20,545 行（實測檔案 20,545 行＝T425G 細緻結構化後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425G**（購物中心細緻結構化：14 箱體對稱階梯——次箱/翼頂箱/入口台階）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,451、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。'''
assert old in s, 'ARCH anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ARCH updated')
