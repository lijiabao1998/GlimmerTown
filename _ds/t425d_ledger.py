# -*- coding: utf-8 -*-
import io
p = 'docs/tasks/T425D-購物中心立體感深化卡.md'
s = io.open(p, encoding='utf-8').read()
old = '''## 五、驗證

1. 菱形外 315 保持、sprFootAudit 全域 0、verify ALL GREEN（PASS ≥4435）、兩釘
2. 樣張 A/B/C/D 對照（T425B／T425C 校準／TheoTown 參考／立體版）存 `C:/dev/t425d-shots/`——人眼軌
3. bump v11.55＋CHANGELOG/ARCH；STOP: **T425D_DONE**'''
new = '''## 五、驗證

1. **240 元素**（219→+21 階梯/側帶/屋頂板/窗洞/中庭暗帶/門框）菱形內含 ±2px ✓；verify ALL GREEN（PASS 4435→**4441**，+6 守衛）、兩釘 4153/4550、CRLF=0 ✓
2. **紅源三案全紅具名**：M1 背光面改回漸層→T425C G3c；M2 側帶 8→4px→T425D G2d；M3 刪屋頂板亮面→T425D G3d
3. 菱形外 315 保持（守衛源碼驗算保證——新元素全在菱形內）、sprFootAudit 全域 0
4. 樣張 A/B/C/D 對照（T425B／T425C 校準／TheoTown 參考／立體版）存 C:/dev/t425d-shots/——人眼軌
5. 守衛同步：T425B G2b/T425C G2c/G3c 漸層釘改階梯釘（翼牆禁漸層、中庭玻璃保留＝幕牆語義）
6. bump v11.55＋CHANGELOG/ARCH；STOP: **T425D_DONE**'''
assert old in s, 'card ledger anchor'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('card ledger updated')
