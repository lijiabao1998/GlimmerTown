import { connect, sleep } from './cdp.mjs';
const c = await connect();
const raw = async (expr, ms = 4000) => {
  const r = await Promise.race([
    c.send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) return '<<TIMEOUT>>';
  if (r.exceptionDetails) return 'EXC:' + String(r.exceptionDetails.exception?.description || '').slice(0, 120);
  return JSON.stringify(r.result?.result);
};
console.log('1+1:', await raw(`1+1`));
console.log('rs:', await raw(`document.readyState`));
console.log('GV:', await raw(`typeof GV`));
console.log('day:', await raw(`(()=>{try{return GV.stats().day}catch(e){return 'ERR:'+e.message}})()`));
process.exit(0);
