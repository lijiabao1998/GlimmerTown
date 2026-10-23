## 整幀比對（T648）

- 結論：**紅**
- 卡：docs/tasks/T707-列車關節化折返停站閉塞.md；families：trainLoco、trainCar；valve：__noT707；owner_ok：空
- 場景 8、每頁 121 幀；畫面變了 30 幀；閥關後仍不同 0 幀；680 秒
- ❌ `frame-changed` 畫面變了（30 幀：rail-autumn、rail-close-autumn、rail-close-hq-day、rail-close-hq-night、rail-close-r0-day、rail-close-r0-night、rail-close-r1-day、rail-close-r1-night），卡頭 owner_ok 是空的——美術卡要業主看接觸表點頭再寫 owner_ok
- ⚠️ `sheet-limit` 接觸表只出前 12 幀
- 接觸表（附件 Town-main-frame-<sha>）：sheet-rail-autumn.png、sheet-rail-close-autumn.png、sheet-rail-close-hq-day.png、sheet-rail-close-hq-night.png、sheet-rail-close-r0-day.png、sheet-rail-close-r0-night.png、sheet-rail-close-r1-day.png、sheet-rail-close-r1-night.png、sheet-rail-close-r2-day.png、sheet-rail-close-r2-night.png、sheet-rail-close-r3-day.png、sheet-rail-close-r3-night.png

exit 1
