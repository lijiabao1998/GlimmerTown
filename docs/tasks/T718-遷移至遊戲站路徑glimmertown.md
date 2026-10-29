# T718 遷移至 game.lijiabao.uk/glimmertown/：倉庫改名、路徑與分享標籤
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Grok Bot（以業主帳號），2026-10-27。
**業主原話**：2026-10-27「Glimmer town 也上吧」（比照 FPV 搬到遊戲站 game.lijiabao.uk 的路徑式網址）。

## 做了什麼

- 倉庫 `lijiabao1998/GlimmerTown` 改名為 `lijiabao1998/glimmertown`；使用者站 `lijiabao1998.github.io` 已設自訂網域 `game.lijiabao.uk`，Pages 網址變成 `https://game.lijiabao.uk/glimmertown/`。
- 遊戲本體一律用相對路徑（manifest `./`、sw 範圍隨註冊位置），不需改；只改發佈工具與契約測試裡寫死的 `https://lijiabao1998.github.io/GlimmerTown/` → `https://game.lijiabao.uk/glimmertown/`（release-identity、published-main、browser-main 與其測試、session_audit 預設倉庫）。`/GlimmerTown-lab/` 哨兵路徑不動。
- `index.html` `<head>` 加繁中 title／description／canonical 與 OG／Twitter 標籤；分享圖放在使用者站 `https://game.lijiabao.uk/thumbs/glimmertown.jpg`（發佈包只准七個執行檔，不放進本倉庫）。
- 執行檔有變，依 R4 版本升 11.250 → 11.251（GAME_VER、APP_VER）。
- 舊路徑 `/GlimmerTown/` 由使用者站放 noindex 轉址頁到 `/glimmertown/`。

## 範圍外

畫面、玩法、美術零變動。Android／Capacitor／TWA 設定目前不存在（只有 PWA manifest），日後上架 Google Play 另開卡。
