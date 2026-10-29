/* 新舊交錯計時（暫存）：同一頁、同一座城，輪流 window.__noT715=true／false，量 forceDraw 的 JS 時間（計時後才刷新畫布，點陣化不算進去）。
   用法：node perfab.cjs <index.html> <out.json> [--size=72] [--days=500] [--seed=22] [--rounds=24] [--valve=__noT715] */
'use strict';
const fs=require('fs'),http=require('http');
const [file,outFile]=process.argv.slice(2);
const opt=k=>{const a=process.argv.find(s=>s.startsWith('--'+k+'='));return a?a.slice(k.length+3):null;};
const SIZE=+(opt('size')||72),DAYS=+(opt('days')||500),SEED=+(opt('seed')||22),ROUNDS=+(opt('rounds')||24),VALVE=opt('valve')||'__noT715';
const src=fs.readFileSync(file,'utf8').replace('window.GV={',()=>'window.__ev=function(s){return eval(s);};window.GV={');
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(src);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
  const ctx=await br.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,serviceWorkers:'block'});
  await ctx.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');});
  const p=await ctx.newPage();await p.goto('http://127.0.0.1:'+server.address().port);
  await p.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:180000});
  const city=await p.evaluate(({SIZE,SEED,DAYS})=>{const G=GV;G.setSpeed(0);G.setMapSize(SIZE);G.newWorldSeeded(SEED);G.setDiff(1);G.ai(true);
    const st=document.getElementById('start');if(st)st.classList.add('hide');for(let d=0;d<DAYS;d++)G.step(1);G.ai(false);
    __ev('running=false;speed=0;');return G.stats();},{SIZE,SEED,DAYS});
  // 鏡頭對準城裡建築最多的地方
  await p.evaluate(()=>__ev(`(function(){let sx=0,sy=0,n=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(b&&!b.ref){sx+=x;sy+=y;n++;}}window.__cx=n?sx/n:N/2;window.__cy=n?sy/n:N/2;})()`));
  const rep={size:SIZE,days:DAYS,pop:city.pop,valve:VALVE,conds:{}};
  for(const [id,vt,z] of [['day-z1',55,1],['night-z1',5,1],['day-z0.6',55,.6],['night-z0.6',5,.6],['night-z2',5,2]]){
    const r=await p.evaluate(({vt,z,R,V})=>__ev(`(function(){GV.setZoom(${z});GV.lookAt(window.__cx,window.__cy);visT=${vt};groundDirty=true;
      for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,buses,rbuses,fxParts])a.length=0;
      const A=[],B=[];for(let w=0;w<3;w++){window['${V}']=true;GV.forceDraw();window['${V}']=false;GV.forceDraw();ctx.getImageData(0,0,1,1);}
      for(let i=0;i<${R};i++){for(const off of (i%2?[true,false]:[false,true])){window['${V}']=off;ctx.getImageData(0,0,1,1);const t=performance.now();GV.forceDraw();const d=performance.now()-t;ctx.getImageData(0,0,1,1);(off?A:B).push(d);}}
      window['${V}']=false;const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
      return {old:med(A),new:med(B)};})()`),{vt,z,R:ROUNDS,V:VALVE});
    rep.conds[id]={oldMs:+r.old.toFixed(2),newMs:+r.new.toFixed(2),saved:+(r.old-r.new).toFixed(2)};
    console.error(id,JSON.stringify(rep.conds[id]));
  }
  fs.writeFileSync(outFile,JSON.stringify(rep,null,1));await br.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
