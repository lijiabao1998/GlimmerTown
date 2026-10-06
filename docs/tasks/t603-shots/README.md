# T603 可重現美術驗收

唯一原始碼來源是 GitHub `lijiabao1998/GlimmerTown` main `637c8cc6d09306c1e17535ece6119d3ad78f1382`／v11.211。獨立分支承載候選；業主已确认本輪10張圖與發布，仍須完整測試和獨立整合驗收通過才可合併／部署。玩家存檔不屬本卡範圍。

## 改動前基線

- 本地完整 `tools/verify.py`：12,525 PASS／0 FAIL，六亂數哨兵逐值一致；63／63工具鏈。
- 精確main實際Chrome：[run37422521945](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37422521945)，artifact11393868034，394檢查、366原PNG、例外與console錯誤皆0；ZIP SHA256 `7dc871efed2a6dfb1e41a7ee4dd416df381de6da20baabcf2334d524a606b96b`。工程場景與既有已批准藍灰素材作為接縫參考。
- 同SHA後續main run37423656566出現桌機暖繪製p95相對門檻失敗，保留失敗證據後，同SHA、原碼與原門檻的授權重跑attempt2已通過（394檢查、366 PNG）。不能挑選通過樣本宣稱效能永遠穩定；本卡保留原相對門檻。
- 本地Chrome因OS Unix socket限制在開頁前退出，升權重試仍失敗。因此新增測試工具以既有精確runtime的真Chrome驗證作前置，再由候選CI產生本批四類的改動前照片。這個階段只新增文件、CI與台架，runtime逐bytes不變。

`baseline603.js` 使用拋棄式profile與暫存來源、導覽前槽3，禁止8123／8199，拍四類日夜原景與全城。所有圖片來自真Chrome，沒有美術mock；台架只為觀測加入測試橋，不改產品檔案。

```sh
CHROME_PATH=/usr/bin/google-chrome node docs/tasks/t603-shots/baseline603.js --port=8763 --out=/tmp/t603-baseline
```

後續完整候選會記錄同城同鏡頭日55／夜100、冷暖幀、快取、真觸控和原存檔往返。Headless RAF不代替實機55FPS保證。

## 本地候選驗證

窄深度增補後本地完整回歸12,531 PASS／0 FAIL、六哨兵與63／63工具鏈已通過。`results603.json`明列完成與未驗部分，沒有把原景CI當成新圖Chrome通過。

```sh
node docs/tasks/t603-shots/test603.js
node docs/tasks/t603-shots/clearance603.js index.html - 1
node docs/tasks/t603-shots/oldsave603.js
CHROME_PATH=/usr/bin/google-chrome node docs/tasks/t603-shots/scene603.js --port=8763 --out=/tmp/t603-candidate
```

`scene603.js`的逃生閥對照會從候選撤回明列的T603視覺差異，再強制匹配原main index SHA256，另開實際原碼頁比對16個game canvas指紋。回退源不相等即退出，不以自己造出的近似圖當基線。三款狗各覆蓋兩個真動畫幀；岸邊保留原2×2建築不繪倒影契約。

業主已於2026-10-06明確批准本輪「候選先推送、由CI做首次新畫面驗收」。真PNG可先附上未過項供看圖；CI與圖片及本輪發布許可仍各自是獨立門檻，不以看圖取代測試。


## 已取得候選CI與深度補驗

CI37439501213（62b6b781）完整執行core/world/neighbors獨立作業：世界矩陣通過，core195檢查／55PNG後仍因桌面日夜RAF原門檻失敗而判紅。舊新同樣受software compositing拖慢，既有失敗trace保留，沒有降低門檻。`results603.json`記錄精確SHA、artifact與未過項。

原96張遛狗相位只驗drawImage呼叫，有最終被地坪蓋住的盲點；該結論已撤回。本次只接兩處新k92角色深度，加row9／16／25×3款×4向×8相位共288個真畫布反事實像素比較，另把深度暫時改回舊值，必須抓到「有呼叫、可見像素零」。新像素矩陣尚須CI完成。


## 2026-10-06 原生濾鏡 X 軸裁切修復

先前深度補驗已由fe0659a8的真Chrome完成：world171檢查／331PNG、neighbors636檢查／483PNG，288組狗／主人最終可見像素與故意舊深度負控制均通過。10張原PNG已由業主確認；core仍因原日夜RAF門檻判紅。16ed3c9的舊／新配對trace顯示主要耗時在Canvas的LayerTreeHost::DoUpdateLayers，不能據此降低門檻。

31a155c的test-only實驗（run37494511542、raster artifact11427233201，ZIP SHA256 `3d1d2d64d6063ea8f5e1f339c4b2a98e0f5910b334d3a53efb7152b00fa7e914`）在同城同鏡頭舊／新×日夜四組，X軸裁切的全畫布像素差均為0，日間18–19幀提升至133–135幀／5秒、夜間3幀提升至29–30幀。完整Y軸必須保留；緊縮XY裁切曾造成6個倒影邊緣像素差，因此沒有採用。

指定發卡方批准兩處原生brightness(0)前的X裁切增補，保留原filter／alpha／drawImage／save-restore。`window.__noClip603=true`可單獨停用優化，`?noT603=1`同樣走原路；非標準變換／合成或不支援API時保守回退。本次無額外影像快取。

`clip603.js`的27項幾何、回退和原生接線守衛已通過，完整T603像素台架與63工具鏈亦通過；重建main SHA256仍逐bytes相同。完整本地Node先前遭SIGKILL，不計為通過，依已批准CI先行例外在候選執行完整回歸。新Chrome門檻另外要求256世界場景＋32分數鏡頭／縮放場景整幅RGBA零差、正控制與故意錯裁X邊界負控制。所有原效能predicate保持原文；尚未把本次候選記為驗收通過。

以上全部是雲端headless瀏覽器資料，實體裝置55FPS仍未量得。若整幀差異非零，不能沿用已確認圖片作為本次修復的等價證明。
