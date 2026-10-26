/* 逐像素比對（暫存）：A＝改前、B＝改後，同一座 AI 長出的成熟城，同一狀態下各畫一幀，比整幀雜湊；
   不同時存兩張 PNG 與差異數。另量每種狀態下兩邊 forceDraw 的時間（含刷新）。
   用法：node eq.cjs <A.html> <B.html> <outdir> [--size=72] [--days=400] [--seed=22] [--flagsB=__noT715] */
'use strict';
const fs=require('fs'),http=require('http'),path=require('path'),crypto=require('crypto');
const [fa,fb,out]=process.argv.slice(2);
const opt=k=>{const a=process.argv.find(s=>s.startsWith('--'+k+'='));return a?a.slice(k.length+3):null;};
const SIZE=+(opt('size')||72),DAYS=+(opt('days')||400),SEED=+(opt('seed')||22);
const flagsB=(opt('flagsB')||'').split(',').filter(Boolean);
fs.mkdirSync(out,{recursive:true});
const prep=f=>{const s=fs.readFileSync(f,'utf8');const r=s.replace('window.GV={',()=>'window.__ev=function(s){return eval(s);};window.GV={');if(r===s)throw new Error('anchor');return r;};
(async()=>{
  const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
  async function open(src,flags){
    const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(src);});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const ctx=await br.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,serviceWorkers:'block'});
    await ctx.addInitScript(fl=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');for(const f of fl)window[f]=true;},flags);
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://127.0.0.1:'+server.address().port);
    await p.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:180000});
    await p.evaluate(({SIZE,SEED,DAYS})=>{const G=GV;G.setSpeed(0);G.setMapSize(SIZE);G.newWorldSeeded(SEED);G.setDiff(1);G.ai(true);
      const st=document.getElementById('start');if(st)st.classList.add('hide');for(let d=0;d<DAYS;d++)G.step(1);G.ai(false);
      __ev('running=false;speed=0;quality=2;weather=0;');},{SIZE,SEED,DAYS});
    return {p,errs,server};
  }
  const A=await open(prep(fa),[]),B=await open(prep(fb),flagsB);
  const conds=[];
  for(const vt of [55,5,20])for(const z of [1,2,.6,3])for(const rot of [0,1,2,3])conds.push({vt,z,rot});
  const rep={size:SIZE,days:DAYS,seed:SEED,flagsB,conds:[],same:0,diff:0};
  const shot=async(P,c)=>P.p.evaluate(c=>__ev(`(function(){for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;GV.setRot(${c.rot});GV.setZoom(${c.z});GV.lookAt(N/2+3,N/2-2);visT=${c.vt};trafClock=12;waterT=0;waterF=1;shakeT=0;groundDirty=true;
      GV.forceDraw();ctx.getImageData(0,0,1,1);const t0=performance.now();for(let i=0;i<3;i++){GV.forceDraw();ctx.getImageData(0,0,1,1);}const ms=(performance.now()-t0)/3;
      return {ms,url:cvs.toDataURL('image/png')};})()`),c);
  for(const c of conds){
    const a=await shot(A,c),b=await shot(B,c);
    const ha=crypto.createHash('sha256').update(a.url).digest('hex').slice(0,12),hb=crypto.createHash('sha256').update(b.url).digest('hex').slice(0,12);
    const same=ha===hb;rep[same?'same':'diff']++;
    const id=`v${c.vt}-z${c.z}-r${c.rot}`;
    rep.conds.push({id,same,msA:+a.ms.toFixed(1),msB:+b.ms.toFixed(1)});
    if(!same){fs.writeFileSync(path.join(out,id+'-A.png'),Buffer.from(a.url.split(',')[1],'base64'));fs.writeFileSync(path.join(out,id+'-B.png'),Buffer.from(b.url.split(',')[1],'base64'));}
    console.error(id,same?'same':'DIFF',a.ms.toFixed(1),'→',b.ms.toFixed(1));
  }
  rep.errA=A.errs.slice(0,3);rep.errB=B.errs.slice(0,3);
  fs.writeFileSync(path.join(out,'eq.json'),JSON.stringify(rep,null,1));
  console.log('same',rep.same,'diff',rep.diff);
  await br.close();A.server.close();B.server.close();
})().catch(e=>{console.error(e);process.exit(1);});
