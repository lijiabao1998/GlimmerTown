// 階段2：起始畫面解剖 → 走真 UI 進入遊戲
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) #start 區塊結構
const dom = await c.evalJs(`(()=>{
  const el=document.querySelector('#start');
  if(!el) return 'NO #start';
  const btns=[...el.querySelectorAll('button')].map(b=>({id:b.id,txt:b.innerText.trim(),cls:b.className,vis:b.offsetParent!==null}));
  return JSON.stringify({display:getComputedStyle(el).display, txt:el.innerText.slice(0,300), btns});
})()`);
out.push('START: ' + dom);

// 2) 全頁可見按鈕盤點
const all = await c.evalJs(`JSON.stringify([...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).slice(0,40).map(b=>({id:b.id,txt:b.innerText.trim()})))`);
out.push('BTNS: ' + all);
console.log(out.join('\n'));
process.exit(0);
