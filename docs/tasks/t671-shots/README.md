# 第二波：十座英國地域住宅與改建住宅設計研究

2026-10-16。T671 卡面已先提交至 PR46；現為本地候選樣張階段，尚未完整驗收。目標：十種獨立輪廓；不以換色冒充新款。歷史來源與遊戲改編分開，下列尺寸為設計意圖而非原建築測量。

| 款 | 歷史依據 | 遊戲量體／屋頂／開口設計 | 舊款差異與限制 |
|---|---|---|---|
| blackhouse | [Arnol，Historic Environment Scotland](https://www.historicenvironment.scot/visit/all/blackhouse-arnol/history-and-stories/)：厚石牆、圓角、無煙囪／窗的傳統住宅 | 極低寬圓角長體；厚圓弧草頂與壓繩；中央深門，門內微光 | 不畫成 Cotswold 尖山牆；不能為夜景測試硬加歷史不存在的窗／煙囪 |
| oast | [Wrotham Water，National Trust MNA162825](https://heritagerecords.nationaltrust.org.uk/HBSMR/MonRecord.aspx?skin=printerfriendly&uid=MNA162825)：方形儲存樓連單圓窯，1870 年前已增建窯 | 中高圓筒窯與錐頂／風帽，旁接較矮長方樓；筒身小開口與樓體長窗不同 | 清楚標作遊戲住宅改編；原用途是烘啤酒花，不宣稱原建築就是民宅 |
| wealden | [Alfriston Clergy House，National Trust](https://www.nationaltrust.org.uk/visit/sussex/alfriston-clergy-house/the-history-of-alfriston-clergy-house)：樹輪定年 1399–1407；廳堂式住宅 | 寬四開間；中央退縮廳堂，兩端挑出上層；同一寬草歇山屋頂，端部小格窗、廳堂高窗 | 舊 Tudor 款是交叉翼山牆；本款必須讀出退縮中央與連續屋頂，不加舊款交叉翼 |
| tower | [Burleigh，Historic Environment Scotland](https://www.historicenvironment.scot/visit/all/burleigh-castle/)：三層塔屋及圓底、托出矩形頂層角塔 | 窄高石塔，圓底方頂托架過渡；小深窗，上層較大；短陡雙坡頂 | 舊 Edwardian 角尖塔不具圓底方頂結構；不用童話尖錐頂，也不複製整座城堡 |
| octagon | [Octagonal Lodge，Historic England 1389771](https://historicengland.org.uk/listing/the-list/list-entry/1389771)：1814 收費站，八角兩層、寬簷、中央煙囪與金屬窗 | 矮胖八角平面；八面斜頂與中央磚煙囪；轉角分面窗 | 無舊款八角主體；標作住宅改編，不把現存商店記成原民宅 |
| longhouse | [Moirlanich，National Trust for Scotland](https://www.nts.org.uk/visit/places/moirlanich-longhouse/highlights/the-longhouse)：19 世紀 cruck 架、家畜與家人分居兩端，1935 前後鐵皮頂 | 最長最矮、細長斜坡鐵皮頂；住宅端小窗、牲畜端寬門；外煙囪只按照片核實 | 不是 blackhouse 換色：直邊長矩形、薄直線屋簷、窗與屋面肋；cruck 是內部構架，不假畫外露肋 |
| laithe | [Nutter Cote，Historic England 1316775](https://historicengland.org.uk/listing/the-list/list-entry/1316775)：18 世紀末石住宅／穀倉，前伸 catslide、方框石分格窗 | 高住宅連低前伸倉體，長不等坡石板頂；四光石窗與大片倉門 | 舊 Welsh 四連排不是單一住宅加倉；相較 T670 tailor，須有實質前伸農倉體而非單屋面差異 |
| modernist | [Joldwynds，Historic England 1294332](https://historicengland.org.uk/listing/the-list/list-entry/1294332)：1930–33 Oliver Hill 現代住宅 | 最寬低的二層向一層退台，平屋頂、半圓樓梯玻璃鼓、轉角水平窗 | 舊 Deco 是高密多層公寓；本款低矮獨棟、不加鋸齒冠飾；不改全局光影 |
| netloft | [Clovelly Chandlery，Historic England 1104513](https://historicengland.org.uk/listing/the-list/list-entry/1104513)：18 世紀末魚窖／漁網閣，石台階、裝卸門、瓦石雙坡頂 | 窄高上層樓體，下層寬門；側外石階與抬高平台；上層小格窗／寬裝卸門組 | 遊戲住宅改編，不能宣稱來源現實已改住宅；不用商店招牌；與舊 mews 的底層拱門不同 |
| rockhouse | [Holy Austin Rock，National Trust](https://www.nationaltrust.org.uk/visit/shropshire-staffordshire/kinver-edge-and-the-rock-houses/history-of-kinver-edge-and-the-rock-houses)：砂岩中真實民居，門窗、煙囪復原有照片依據 | 最低矮寬厚岩體，凹入住宅立面、岩頂零星草；小方窗與獨立矮煙道 | 岩體全部限於精靈本身／一格，不改地形或陰影系統；不是石牆普通山牆屋 |

## 防重複與實作邊界

已讀 main 的 RCI_CATALOG634 36 款住宅及 T670 十商店設計。各新款須在去色 alpha 輪廓、屋頂結構、門窗配置中至少兩項可辨；十款 alpha 指紋互異只是底線，仍須逐圖審視，不能用細小突出物騙測試。以上不是完成證明，像素稿完成後需再與原圖接觸表核對。

預期只新增自己的 art 家族、逃生閥、固定種類選擇與快取，沿用 makeIso590／既有 lot primitives。保持舊圖、save、simR、數量密度與全局氛圍。所有煙囪只供原系統取樣，不加全局煙密度。岩屋、外階不得越格遮擋鄰居。

T671 經 fetch 全遠端 gpt 分支確認未用後，已由 PR46 先卡面佔用。第二波可在第一波等待時施工，但第一波合併前不得合第二波。與第一波相同的真 Chrome 全條件逐款圖審／native 路徑限制仍存在，不算完成或放寬驗收。
