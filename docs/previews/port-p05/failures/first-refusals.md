# P05 拒絕與修正記錄

原港區公路只有x22..43/y31。全車出西閘必須讓車尾越過x22，原路無法支持車體到達(20.8,31.5)，完整掃掠拒絕19/20/21三格。P05只新增這三格可見候選接駁路面，原世界格/財政/水域不動；關閉P05完全消失還原P04。路網從實際GV.tile讀取，不以畫一條線冒充連通。

固定低位雙軌吊架被否決：軌道侵入P04原.76寬吊具升降體積。產品改用永久可見側置柱x29、可見伸縮梁x30，原P04完整54秒完成後才部署梁伸至y34.8。沒有設備突然出現或把柱/貨櫃縮小。候選為程序化運動，不宣稱起重機承載/力學已實測。

本地首輪測試台誤用V.makeGrid/plan不存在API，按P03既有grid/compile修正；跨VM陣列原型導致同內容deepStrictEqual紅，改以Array.from產生本realm清冊。清冊複核補齊原船剩餘5件身份，共30個唯一ID，不能只顯示總數30卻省略5個ID。

P05 rendering first red: independent actual native painter ray-depth oracle found 3498 wrong visible-face samples. Object-center sorting alone was insufficient for tall transfer ropes and overlapping tractor pieces. Replaced only new P05 drawing with a bounded per-frame face visibility pass, cached at paused time; no full-port rebake.

Second red: 12 samples remained in rotation 2. A duplicated numerical clipping vertex creates a zero-length clip edge; the inherited convex subtraction can then mistakenly retain the entire outside subject. Added P05-only duplicate-vertex normalization before subtraction; original P04 module and tests remain unchanged. The raw first and second reports are retained.

Local original regression first run: 17/20 checks passed. Three failed before candidate logic due to missing approved/t634 tag, historical d88e36d object and fixed PNG runtime setup. Preserve report, use unchanged official full-history/pinned-runtime workflow before claiming acceptance.
