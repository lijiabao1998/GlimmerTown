# T603 可重現美術驗收

唯一原始碼來源是 GitHub `lijiabao1998/GlimmerTown` main `637c8cc6d09306c1e17535ece6119d3ad78f1382`／v11.211。獨立分支只承載候選，沒有合併、部署或更改玩家存檔的權限。

## 改動前基線

- 本地完整 `tools/verify.py`：12,525 PASS／0 FAIL，六亂數哨兵逐值一致；63／63工具鏈。
- 精確main實際Chrome：[run37422521945](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37422521945)，artifact11393868034，394檢查、366原PNG、例外與console錯誤皆0；ZIP SHA256 `7dc871efed2a6dfb1e41a7ee4dd416df381de6da20baabcf2334d524a606b96b`。工程場景與既有已批准藍灰素材作為接縫參考。
- 同SHA後續main run37423656566出現桌機暖繪製p95相對門檻失敗，另由发布驗證處理，不能挑選上述通過樣本宣稱效能永遠穩定；本卡保留原相對門檻。
- 本地Chrome因OS Unix socket限制在開頁前退出，升權重試仍失敗。因此新增測試工具以既有精確runtime的真Chrome驗證作前置，再由候選CI產生本批四類的改動前照片。這個階段只新增文件、CI與台架，runtime逐bytes不變。

`baseline603.js` 使用拋棄式profile與暫存來源、導覽前槽3，禁止8123／8199，拍四類日夜原景與全城。所有圖片來自真Chrome，沒有美術mock；台架只為觀測加入測試橋，不改產品檔案。

```sh
CHROME_PATH=/usr/bin/google-chrome node docs/tasks/t603-shots/baseline603.js --port=8763 --out=/tmp/t603-baseline
```

後續完整候選會記錄同城同鏡頭日55／夜100、冷暖幀、快取、真觸控和原存檔往返。Headless RAF不代替實機55FPS保證。
