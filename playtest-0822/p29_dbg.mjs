// 除錯：bContinue 為什麼點不到
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];

const probe = await c.evalJs(`(()=>{
  const b=document.querySelector('#bContinue');
  const q=b.getBoundingClientRect();
  const cx=q.x+q.width/2, cy=q.y+q.height/2;
  const hit=document.elementFromPoint(cx,cy);
  return JSON.stringify({rect:{x:q.x,y:q.y,w:q.width,h:q.height},cx,cy,
    hitTag:hit?hit.tagName:null,hitId:hit?hit.id:null,hitCls:hit?hit.className:null,
    same:hit===b,startDisp:getComputedStyle(document.querySelector('#start')).display});
})()`);
out.push('probe: ' + probe);
console.log(out.join('\n'));
process.exit(0);
