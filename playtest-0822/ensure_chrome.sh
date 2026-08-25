#!/bin/bash
# 確保 CDP Chrome 活著；死了就重啟（同一 user-data-dir，localStorage 保存）
if ! curl -s --max-time 2 http://localhost:9333/json/version >/dev/null 2>&1; then
  echo "[ensure] chrome 死了，重啟中..."
  cmd //c start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" \
    --headless=new --remote-debugging-port=9333 \
    --user-data-dir="$LOCALAPPDATA\\Temp\\gv-playtest-cdp" \
    --no-first-run --no-default-browser-check --window-size=1440,900 --hide-scrollbars \
    about:blank
  for i in $(seq 1 15); do
    sleep 1
    curl -s --max-time 2 http://localhost:9333/json/version >/dev/null 2>&1 && { echo "[ensure] 復活"; break; }
  done
fi
curl -s --max-time 2 http://localhost:9333/json/version >/dev/null 2>&1 && echo "[ensure] ok" || echo "[ensure] FAIL"
