# T390 — tre per-cell 存檔正規化(編碼修+損壞檔救援+往返守衛)

狀態:**已出卡,待施工(自主 loop R11)。**
發卡:業主 loop 直令(守衛債第四條=T383 明示延後項;ARCH §10.3;**自 T150 起幾乎每個
存檔都帶病**——樹種 1..10 均勻分布,1/10 是 10 號紫葉樹,save 寫 "10" 兩字元)。
出卡+施工+自審:Claude(業主 loop 授權)。
前置:master `d4b47e1`(v11.16,PASS 3462);兩路偵查(wf_502578e9)打底。
路徑:bay-kimi,bump 11.17,merge --deploy。

> 紅線=**tree≤9 城市新舊 save 逐位元組恆等**('0'-'9' 兩編碼逐字相同)+
> 帶病檔 load 絕不回 false(現在能開的檔不得變開不了)。

---

## 一句話

save 端 `tre+=t.tree`(裸拼接)在 tree=10 寫兩字元→load 逐字元解碼全段錯位
(seed1 實測 67 格 v10→1365 格錯位)。修=同行 rcl 既有先例 fromCharCode;
load 端加 DP 救援(ter 非草地錨+合併預算恰用完);守衛=29 條長度+往返位元恆等。

## 修法(偵查裁決 a 案;b 案值域壓縮被否決:floor(R()*9)≠floor(R()*10)=全圖換樹種+
紫葉樹絕種+不修既有帶病檔)

1. **encode** 18304:`tre+=t.tree` → `tre+=String.fromCharCode(48+t.tree)`
   (t=10→':',字碼 58,不撞 RLE 控制字元 '*'42/','44;rcl 同行先例)。
2. **decode** 18382:`tree:+d.tre[i]` → `tree:(d.tre.charCodeAt(i)-48)||0`
   (健康舊檔 '0'-'9' 解碼不變=向後相容;NaN 容錯回 0)。兩端同 commit。
3. **救援 repairTre390(tre,ter,dn)**(load 內 saveInflate 後、tiles 迴圈前,
   `d.tre.length>dn*dn` 才觸發):
   - 錨:非草地格(ter[i]!=='2')樹恆 0(生成/種樹/地形全路徑保證)=高密度校準點;
   - DP 狀態 (格 i,已合併數 m≤E),E=len-dn² 精確已知;草地格 '1'+'0' 可合併為 chr(58);
     解必須恰用完 E 且過全部錨;多解取字典序最左(決定性);
   - 無解 fallback=tre 全 '0'+通知「🌲 樹木資料受損已重置」;**絕不 return false、不動 _bak**。
   - 已洗白檔(存→讀→再存,長度已回 N²)不可偵測不可救——記卡為已知邊界。
4. 分享碼 importShareCode 走 load()=救援自動覆蓋。

## 守衛(T383 延後的第四條債,本卡收口)

test 尾端 T390 區塊:
(i) seed1 存檔 29 條 RLE_F 字串長度全===N²(欄名 regex 從源碼抽取防漂移);
(ii) **save→load→save 位元組恆等**(rawSave 前後 ===,最強廉價往返);
(iii) 兩次 inflate 的 tre 全等+抽樣 GV.tile tree 值(含一格 v10);
(iv) 救援案:手工構造含 "10" 舊格式檔→load→斷言樹回原位+長度歸正;
(v) 無解畸形案:亂序損壞→fallback 全 '0' 且 load 成功(不回 false)。
**不動 tools/**(偵查建議升 MIN_PASS 再次否決——棘輪由 merge_bay 執行)。

## 允許觸碰

`index.html`(encode/decode 兩行+repairTre390 函式+load 觸發行+T312 註解一句+bump 11.17)、
`sw.js`、`test_fixde.js`、`docs/ARCH.md`(§9 129 行實測數據段更新+§10.3 收口+版本行)、
`docs/CHANGELOG.md`、本卡、帳本。

## 禁止觸碰

9245/9829 的 `1+ri(10)`(改值域=改骰結果=全圖換樹種);R()/ri() 結構;_bak;
RLE 編解碼本體;vlen 不得改成拒載;tools/;其他車位。

## 不變量

tree≤9 城 save 位元組恆等;帶病檔 load 永不失敗;兩釘+雙重播;PASS 只增(3462 起);
verify ALL GREEN 11.17。**前向不相容記卡**:新檔 ':' 在舊版=NaN 樹消失
——部署後不得回滾跨越本卡(sw 版本單向,CHANGELOG 明示)。

## 回滾

單 bay commit revert(僅在無玩家以新版存檔前安全;有新檔後回滾=紫葉樹消失,故記
「不可輕率回滾」——此為本 loop 第一張帶回滾約束的卡,誠實標記)。

---

## 施工記錄(施工後填)
