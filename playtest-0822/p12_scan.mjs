// 階段12：掃描 inspectAt 找太陽能與住宅的索引，並確認狀態
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];
const stats = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('stats: ' + stats);
const found = await c.evalJs(`(()=>{
  const res=[];
  for(let i=120;i<260;i++){
    let r='';try{r=GV.inspectAt(i)||''}catch(e){}
    if(r) res.push([i,String(r).slice(0,60)]);
  }
  return JSON.stringify(res.slice(0,20));
})()`);
out.push('scan: ' + found);
console.log(out.join('\n'));
process.exit(0);
