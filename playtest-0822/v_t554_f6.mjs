import { connect, sleep } from './cdp.mjs';
const c = await connect();
const raw = async (expr, ms = 6000) => {
  const r = await Promise.race([
    c.send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) return '<<TIMEOUT>>';
  if (r.exceptionDetails) return 'EXC:' + String(r.exceptionDetails.exception?.description || '').slice(0, 120);
  return JSON.stringify(r.result?.result);
};
console.log('A:', await raw(`(()=>{GV.newWorldSeeded(101);GV.setDiff(1);return GV.stats().day;})()`));
console.log('B:', await raw(`(()=>{const ok=[];for(let x=2;x<70;x++){if(GV.place('road',x,6))ok.push(x);}return ok.length;})()`));
console.log('C:', await raw(`(()=>{const ok=[];for(let x=2;x<40;x++){if(GV.place('road',x,6))ok.push(x);}return {n:ok.length};})()`));
console.log('D:', await raw(`(()=>{const ok=[];for(let x=2;x<70;x++){if(GV.place('road',x,6))ok.push(x);}return {n:ok.length,cands:ok.slice(0,10).map(x=>[x,7])};})()`));
process.exit(0);
