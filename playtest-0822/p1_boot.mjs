// 階段1：開機檢查——進 8125、釘槽 3、重載、截起始畫面、盤點 GV 與版本
import { boot, sleep } from './cdp.mjs';
const c = await boot();
const S = 'shots/';
const log = [];

// 先裸載一次取得 origin，立刻釘槽 3，再重載讓遊戲以槽 3 開機
await c.goto('http://localhost:8125/index.html');
await c.evalJs(`localStorage.setItem('glimmerville.v1.slot','3')`);
await c.goto('http://localhost:8125/index.html');
await sleep(2500); // 等遊戲腳本與精靈建構

const slot = await c.evalJs(`localStorage.getItem('glimmerville.v1.slot')`);
const ver = await c.evalJs(`(typeof GAME_VER!=='undefined')?GAME_VER:(document.documentElement.innerHTML.match(/GAME_VER='([^']*)'/)?.[1]||'n/a')`);
const hasStart = await c.evalJs(`!!document.querySelector('#start')`);
const gvKeys = await c.evalJs(`(window.GV?Object.keys(window.GV):[]).join(',')`);

await c.shot(S + 'p1-start.png');
log.push(`slot=${slot} ver=${ver} #start=${hasStart}`);
log.push('GV: ' + gvKeys);
console.log(log.join('\n'));
