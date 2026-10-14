# T634：Lab 只讀參考與重製診斷

## 來源邊界

2026-10-11 核實 Town main d88e36d、上一候選873ea1；Lab main54ecba5e186c1b2a8b258aae2be2ebe11d13efe6（v14.40）。本次不改Lab。Lab T717使用者實際看過的英式住宅／酒館／圖書館日夜圖為95f7d430歷史候選；保留它的真實來源，不說成54ec的新截圖。Lab目前repo的shots577/facade_uk1_ukTerrace_final.png提供1×1、2×1、3×2、4×3實際源圖接觸表。

## 已觀察到的差異與處理

- Town873街景的住商工高層顯得細長，奶油色框線密度壓過牆面；重作將每款簷高、樓層、平面比例及屋頂一起調整，保留三級高度差。
- Lab板岩大坡面可辨、瓦縫是較暗且有序的長列；Town改厚簷與完整坡面，弱化碎亮點。
- Lab窗洞、窗臺、入口有前後層次；Town窗改深暗內凹和單側窄亮框，不再把窗與磚全部描亮。
- 公共建築以主廳、低翼、入口山花、塔樓辨識；工業以長廳、鋸齒頂、卸貨台、設備、碼頭辨識。功能、足跡、旋轉及動態掛點仍受原測試約束。
- Lab曾拒收空地中間僅有小盒子的2×2建築；本次只在Town既有足跡內改善空間配置，絕不擴地或改保存。

## 最新 Lab 文件／代碼證據

- [比例、類型密度、結構變體](https://github.com/lijiabao1998/GlimmerTown-lab/blob/54ecba5e186c1b2a8b258aae2be2ebe11d13efe6/docs/%E8%BF%AD%E4%BB%A3%E4%B8%8D%E6%94%B9%E5%A3%9E%E6%A8%99%E6%BA%96.md#L27-L32)
- [材料palette](https://github.com/lijiabao1998/GlimmerTown-lab/blob/54ecba5e186c1b2a8b258aae2be2ebe11d13efe6/residential-art-primitives006.js#L11-L28)：磚AD6652/824D43、石D4C5A8/B5A88F、板岩55636D/424E59、冷玻璃526C75/344D59。
- [屋顶瓦列與大面](https://github.com/lijiabao1998/GlimmerTown-lab/blob/54ecba5e186c1b2a8b258aae2be2ebe11d13efe6/residential-art-primitives006.js#L116-L145)
- [實體簷口與窗洞](https://github.com/lijiabao1998/GlimmerTown-lab/blob/54ecba5e186c1b2a8b258aae2be2ebe11d13efe6/residential-art-primitives006.js#L156-L180)
- [英式高街設計](https://github.com/lijiabao1998/GlimmerTown-lab/blob/54ecba5e186c1b2a8b258aae2be2ebe11d13efe6/docs/branch/GPT-005-british-high-street.md#L9-L23)
- [拒收與辨識教訓](https://github.com/lijiabao1998/GlimmerTown-lab/blob/54ecba5e186c1b2a8b258aae2be2ebe11d13efe6/docs/DECISIONS.md#L13)

## 驗收邊界

軟體Canvas只作內部繪圖檢查。業主收到的新版街景須由新精確提交的真Chrome載入遊戲產出，同相機與光照對873ea1比較。全315款日夜、四季、雪、四向、遠景和疊層沿用原完整驗收。工程綠燈不等於業主美術批准；候選預設關閉，仍無合併或部署權。
