// 共用：確保 Chrome 活著、進入遊戲（優先「繼續上次的小鎮」，帶重試與驗證）
import { connect, sleep } from './cdp.mjs';

export async function ensureChrome() {
  // 由 bash 層的 ensure_chrome.sh 負責；此處僅等待端口
  for (let i = 0; i < 20; i++) {
    try {
      await fetch('http://localhost:9333/json/version');
      return true;
    } catch (e) { await sleep(1000); }
  }
  throw new Error('CDP 端口不可用');
}

export async function enterCity({ navigateIfDead = true } = {}) {
  let c = await connect();
  const boot = async () => {
    await c.goto('http://localhost:8125/index.html');
    await sleep(3500);
  };
  const gvAlive = async () => {
    try { return (await c.evalJs(`typeof GV!=='undefined'&&!!window.GV`)) === true; }
    catch (e) { return false; }
  };
  if (!await gvAlive()) { if (!navigateIfDead) throw new Error('頁面無 GV 且禁止導航'); await boot(); }

  const menuVisible = () => c.evalJs(`(()=>{const s=document.querySelector('#start');return s&&getComputedStyle(s).display!=='none';})()`);
  const enterViaUI = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const b = await c.evalJs(`(()=>{const b=document.querySelector('#bContinue');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
      if (!b) break;
      await c.click(b.x, b.y);
      await sleep(1200);
      if (!await menuVisible()) return true;
      // 重試前重讀 rect（動畫可能移位）已含在上方 evalJs
    }
    return false;
  };

  if (await menuVisible()) {
    const okUI = await enterViaUI();
    if (!okUI) {
      // 後備：GV.load + 派發一次點擊關選單
      await c.evalJs(`try{GV.load()}catch(e){}`);
      await sleep(600);
      const b2 = await c.evalJs(`(()=>{const b=document.querySelector('#bContinue');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
      if (b2) { await c.click(b2.x, b2.y); await sleep(1000); }
    }
  }

  // 驗證世界可用
  const worldOK = await c.evalJs(`(()=>{try{GV.stats().day>0;return true}catch(e){return false}})()`);
  if (!worldOK) throw new Error('進城失敗：世界不可用');
  return c;
}

export function logP(out, tag, val) { out.push(`[${tag}] ${val}`); }
