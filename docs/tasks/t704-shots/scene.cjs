'use strict';
/* Read-only investigation: train animation on origin/main. Usage: node scene.cjs <index.html> <outdir> */
const fs=require('fs'),path=require('path'),http=require('http');
const [idxPath,out]=process.argv.slice(2);
function bridge(){
  function quiet(){running=false;speed=0;for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;tool='pan';quality=2;weather=0;const st=document.getElementById('start');if(st)st.classList.add('hide');}
  // rail centreline distance (rail-only graph, integer coords = tile centres)
  function railDist(fx,fy){let best=9;for(let y=Math.floor(fy)-2;y<=Math.ceil(fy)+2;y++)for(let x=Math.floor(fx)-2;x<=Math.ceil(fx)+2;x++){if(!inMap(x,y)||!T(idx(x,y)).rail)continue;
      const segs=[[x,y,x,y]];if(inMap(x+1,y)&&T(idx(x+1,y)).rail)segs.push([x,y,x+1,y]);if(inMap(x,y+1)&&T(idx(x,y+1)).rail)segs.push([x,y,x,y+1]);
      for(const[a,b,c,d]of segs){const vx=c-a,vy=d-b,L=vx*vx+vy*vy;let t=L?((fx-a)*vx+(fy-b)*vy)/L:0;t=Math.max(0,Math.min(1,t));const dx=fx-(a+vx*t),dy=fy-(b+vy*t);best=Math.min(best,Math.hypot(dx,dy));}}return best;}
  // exact copy of the draw-side car placement on origin/main (index.html ~19006-19013)
  function carPos(tr){const nSeg=(SPR.trainLoco&&!window.__noTrainSpr&&!window.__noTrainCars)?3:1;const r=[];for(let ci=0;ci<nSeg;ci++){const back=ci*.62;r.push({ci,fx:tr.x+DIRV[tr.d][0]*(tr.p-back),fy:tr.y+DIRV[tr.d][1]*(tr.p-back),d:tr.d});}return r;}
  let draws=[];const orig=ctx.drawImage.bind(ctx);
  function sprName(im){for(const pt of [0,1])for(const [nm,S] of [['loco',SPR.trainLoco[pt]],['car',SPR.trainCar[pt]]]){if(!S)continue;for(const f of [0,1,2,3]){if(S.AF&&S.AF[f]===im)return nm+pt+':A'+f;if(S.BF&&S.BF[f]===im)return nm+pt+':B'+f;}if(S.A===im)return nm+pt+':A';if(S.B===im)return nm+pt+':B';}return null;}
  ctx.drawImage=function(im,...a){const n=sprName(im);if(n)draws.push({n,x:Math.round(a[0]),y:Math.round(a[1]),w:Math.round(a[2]),h:Math.round(a[3])});return orig(im,...a);};
  function raw(night){visT=night?5:55;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;draws=[];GV.forceDraw();return draws.slice();}
  function crop(cx,cy,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(cvs,cx-w/2,cy-h/2,w,h,0,0,w,h);return c;}
  function sheet(cells,cols,label){const w=cells[0].c.width,h=cells[0].c.height,rows=Math.ceil(cells.length/cols);const s=document.createElement('canvas');s.width=w*cols;s.height=(h+16)*rows+18;const g=s.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,s.width,s.height);g.fillStyle='#fff';g.font='12px monospace';g.fillText(label,4,13);
    cells.forEach((e,i)=>{const X=(i%cols)*w,Y=18+Math.floor(i/cols)*(h+16);g.drawImage(e.c,X,Y);g.strokeStyle='#555';g.strokeRect(X+.5,Y+.5,w-1,h-1);g.fillStyle='#ff0';g.fillText(e.t,X+3,Y+h+12);});return s.toDataURL('image/png');}
  // screen position of world point
  function scr(fx,fy){const _iso=isoW2V((fx-fy)*32,(fx+fy)*16+16);const ox=Math.round(W/2-cam.x*cam.z),oy=Math.round(H/2-cam.y*cam.z);return [(ox+_iso[0]*cam.z)*DPR,(oy+_iso[1]*cam.z)*DPR];}
  window.__rail={
    init(){GV.setMapSize(72);GV.newWorldSeeded(702);GV.setDiff(3);GV.ai(false);GV.setSpeed(0);quiet();money=1e9;
      for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});
      const R=(x,y)=>{T(idx(x,y)).rail=1;};
      for(let x=30;x<=40;x++){R(x,30);R(x,36);} for(let y=30;y<=36;y++){R(30,y);R(40,y);}
      for(let x=41;x<=45;x++)R(x,33);                       // spur, T-junction at (40,33), dead end at (45,33)
      for(let x=26;x<=29;x++)T(idx(x,36)).tram=1;            // tram line touching rail corner (30,36)
      T(idx(35,29)).bld={k:17,lv:1,v:0,age:60,pw:true,h:1};  // stations
      T(idx(35,37)).bld={k:17,lv:1,v:1,age:60,pw:true,h:1};
      recalcAllMasks();computeFoam();computePower();computeWater();rebuildCov();groundDirty=true;return true;},
    // run a single train manually; return per-step telemetry + 8-frame sheet
    run(o){quiet();window.__noBufferGlow582=!!o.valve;o.look=o.look||[o.x,o.y];GV.setRot(o.rot||0);GV.setSeason(1);GV.setZoom(o.zoom||2.5);GV.lookAt(o.look[0],o.look[1]);
      trains.length=0;const tr={x:o.x,y:o.y,d:o.d,p:o.p||0,pt:o.pt||0};trains.push(tr);
      const dt=1/60,steps=o.steps,every=Math.max(1,Math.floor(steps/(o.frames||8)));const tel=[],cells=[];let prev=null,maxJump=[0,0,0],maxOff=[0,0,0],jumps=[];
      for(let s=0;s<=steps;s++){
        if(s>0){const before=trains.length;updTrains(dt);if(!trains.includes(tr)){tel.push({s,deleted:true});break;}}
        const cp=carPos(tr);const rec={s,x:tr.x,y:tr.y,d:tr.d,p:+tr.p.toFixed(3),cars:cp.map(c=>({ci:c.ci,fx:+c.fx.toFixed(3),fy:+c.fy.toFixed(3),off:+railDist(c.fx,c.fy).toFixed(3)}))};
        if(prev)rec.cars.forEach((c,i)=>{const j=Math.hypot(c.fx-prev[i].fx,c.fy-prev[i].fy);c.jump=+j.toFixed(3);if(j>maxJump[i])maxJump[i]=j;if(j>.1)jumps.push({s,ci:i,jump:+j.toFixed(3),from:[prev[i].fx,prev[i].fy],to:[c.fx,c.fy],d:tr.d});});
        rec.cars.forEach((c,i)=>{if(c.off>maxOff[i])maxOff[i]=c.off;});
        prev=rec.cars;tel.push(rec);
        if(s%every===0&&cells.length<(o.frames||8)){const dr=raw(o.night);const hx=tr.x+DIRV[tr.d][0]*tr.p,hy=tr.y+DIRV[tr.d][1]*tr.p;const sp=o.follow?scr(hx-DIRV[tr.d][0]*.6,hy-DIRV[tr.d][1]*.6):scr(o.look[0],o.look[1]);cells.push({c:crop(sp[0],sp[1]-(o.dy||30),o.cw||360,o.ch||260),t:`s${s} t(${tr.x},${tr.y}) d${tr.d} p${tr.p.toFixed(2)}`});rec.draws=dr;}
      }
      return{tel,maxJump:maxJump.map(v=>+v.toFixed(3)),maxOff:maxOff.map(v=>+v.toFixed(3)),jumps,sheet:cells.length?sheet(cells,o.cols||4,o.label||''):null};},
    // natural spawn + random routing over time
    natural(seconds){quiet();trains.length=0;const dt=1/30;const log={spawns:[],deletes:0,stationStops:0,overlapFrames:0,frames:0,headDistMin:9,speeds:new Set()};let prevN=0;let prevPos=new Map();
      for(let s=0;s<seconds/dt;s++){const ids=new Set(trains);updTrains(dt);for(const t of trains)if(!ids.has(t))log.spawns.push({s,x:t.x,y:t.y,d:t.d});
        log.frames++;for(let i=0;i<trains.length;i++)for(let j=i+1;j<trains.length;j++){const a=trains[i],b=trains[j];const ax=a.x+DIRV[a.d][0]*a.p,ay=a.y+DIRV[a.d][1]*a.p,bx=b.x+DIRV[b.d][0]*b.p,by=b.y+DIRV[b.d][1]*b.p;const dd=Math.hypot(ax-bx,ay-by);if(dd<log.headDistMin)log.headDistMin=dd;if(dd<1.24)log.overlapFrames++;}
        for(const t of trains){const hx=t.x+DIRV[t.d][0]*t.p,hy=t.y+DIRV[t.d][1]*t.p;const pv=prevPos.get(t);if(pv){const v=Math.hypot(hx-pv[0],hy-pv[1])/dt;log.speeds.add(+v.toFixed(2));if(v<.01)log.stationStops++;}prevPos.set(t,[hx,hy]);}
      }
      log.speeds=[...log.speeds].sort((a,b)=>a-b).slice(0,20);log.count=trains.length;log.target=Math.min(4,listBldK(17).concat(listBldK(55)).length-1);return log;},
    // probability a train is deleted at the rail/tram corner
    tramJunction(n){let del=0,ok=0;for(let k=0;k<n;k++){trains.length=0;const tr={x:31,y:36,d:3,p:0.5,pt:0};trains.push(tr);for(let s=0;s<120;s++){updTrains(1/30);if(!trains.includes(tr)){del++;break;}}if(trains.includes(tr))ok++;}return{del,ok,n,railDirsCorner:railDirs(30,36),tramTile:T(idx(29,36)).tram,railOnTram:T(idx(29,36)).rail};},
    nightCrash(){quiet();window.__noBufferGlow582=false;trains.length=0;GV.setZoom(2);GV.lookAt(44,33);visT=5;groundDirty=true;let e=null;try{GV.forceDraw();}catch(x){e=x.message;}let e2=null;window.__noBufferGlow582=true;groundDirty=true;try{GV.forceDraw();}catch(x){e2=x.message;}window.__noBufferGlow582=false;visT=55;groundDirty=true;let e3=null;try{GV.forceDraw();}catch(x){e3=x.message;}return{nightNoValve:e,nightValveOn:e2,dayNoValve:e3};},
    spawnSeq(){quiet();window.__noBufferGlow582=false;trains.length=0;GV.setRot(0);GV.setZoom(2.5);GV.lookAt(35,35.5);const cells=[];const ids=[];
      for(let st=0;st<=60;st++){if(st>0)updTrains(1/30);const t=trains[0];if(t&&!ids.includes(t))ids.push(t);
        if(st%6===0&&cells.length<10){raw(false);const sp=scr(35,35.6);const hx=t?t.x+DIRV[t.d][0]*t.p:0,hy=t?t.y+DIRV[t.d][1]*t.p:0;cells.push({c:crop(sp[0],sp[1]-20,380,240),t:t?`s${st} obj#${ids.indexOf(t)} head(${hx.toFixed(2)},${hy.toFixed(2)}) d${t.d} rail@head=${T(idx(Math.round(hx),Math.round(hy))).rail}`:`s${st} none`});}}
      return sheet(cells,5,'natural spawn beside station k17 at (35,37): spawned train heads d0 away from station, perpendicular to the E-W track');},
    liveNight(ms){return new Promise(res=>{window.__noBufferGlow582=false;GV.setZoom(2);GV.lookAt(44,33);groundDirty=true;visT=3;running=true;speed=1;const t0=performance.now();setTimeout(()=>{running=false;speed=0;res({ms:performance.now()-t0,visT});},ms);});},
    spr(){const L=SPR.trainLoco[0],C=SPR.trainCar[0];const s=document.createElement('canvas');const k=8;s.width=(L.w*2+C.w*2)*k+40;s.height=L.h*k+20;const g=s.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#7a9a6a';g.fillRect(0,0,s.width,s.height);
      [[L.A,'locoA'],[L.B,'locoB'],[C.A,'carA'],[C.B,'carB']].forEach(([im,n],i)=>{g.drawImage(im,10+i*(L.w*k+8),10,L.w*k,L.h*k);});return{url:s.toDataURL(),w:L.w,h:L.h,ox:L.ox,oy:L.oy};},
    hsr(){return{k139Keys:Object.keys(SPR.bld||{}).filter(k=>/^139_/.test(k)).length,hsrTool:(typeof TOOLS!=='undefined'?TOOLS:[]).filter(t=>/hsr|高鐵|bullet/i.test(t.id+t.nm)).map(t=>t.id),railKinds:(typeof TOOLS!=='undefined'?TOOLS:[]).filter(t=>/rail|station|tram|train|metro/i.test(t.id)).map(t=>t.id+':'+t.nm)};}
  };
}
(async()=>{
  const src=fs.readFileSync(idxPath,'utf8');if(src.split('window.GV={').length!==2)throw Error('anchor');
  const page=src.replace('window.GV={',()=>'('+bridge.toString()+')();window.GV={');
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(page);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
  const ctx=await br.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,serviceWorkers:'block'});
  await ctx.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');});
  await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(origin);
  await p.waitForFunction(()=>window.GV&&window.__rail&&window.__boot426&&__boot426().ready,null,{timeout:120000});
  fs.mkdirSync(out,{recursive:true});const rep={errors:errs};
  await p.evaluate(()=>__rail.init());
  const save=(n,url)=>fs.writeFileSync(path.join(out,n),Buffer.from(url.split(',')[1],'base64'));
  const sc={
    curve:{x:39,y:30,d:1,p:.1,steps:120,look:[39.5,30.8],zoom:2,cw:560,ch:340,dy:20,label:'curve at NE corner tile (40,30): head east(d1) -> south(d2); rot0 z2',cols:4},
    deadend:{x:44,y:33,d:1,p:.1,steps:120,look:[44,33],zoom:2,cw:560,ch:300,dy:20,label:'dead end (45,33): arrive d1, instant reverse to d3; rot0 z2',cols:4},
    d0:{x:30,y:35,d:0,p:.4,steps:4,frames:1,follow:1,zoom:5,cw:420,ch:260,label:'d0',cols:1},
    d1:{x:31,y:30,d:1,p:.4,steps:4,frames:1,follow:1,zoom:5,cw:420,ch:260,label:'d1',cols:1},
    d2:{x:40,y:31,d:2,p:.4,steps:4,frames:1,follow:1,zoom:5,cw:420,ch:260,label:'d2',cols:1},
    d3:{x:38,y:36,d:3,p:.4,steps:4,frames:1,follow:1,zoom:5,cw:420,ch:260,label:'d3',cols:1},
    nightD2:{x:40,y:32,d:2,p:.4,steps:4,frames:1,follow:1,zoom:4,cw:420,ch:260,night:true,valve:true,label:'night d2 (valve __noBufferGlow582 on to avoid crash)',cols:1},
    nightD0:{x:30,y:35,d:0,p:.4,steps:4,frames:1,follow:1,zoom:4,cw:420,ch:260,night:true,valve:true,label:'night d0',cols:1},
    curveSW:{x:32,y:36,d:3,p:.1,steps:120,look:[30.6,35.4],zoom:2,cw:560,ch:340,dy:20,label:'SW corner (30,36) with tram stub to west',cols:4},
    rot1curve:{x:39,y:30,d:1,p:.1,steps:120,rot:1,look:[39.5,30.8],zoom:2,cw:560,ch:340,dy:20,label:'same NE curve, view rot 1',cols:4},
  };
  for(const [k,o] of Object.entries(sc)){const r=await p.evaluate(o=>__rail.run(o),o);if(r.sheet)save(`sheet-${k}.png`,r.sheet);delete r.sheet;rep[k]=r;console.log(k,'maxJump',r.maxJump,'maxOff',r.maxOff,'jumps',r.jumps.length);}
  rep.nightCrash=await p.evaluate(()=>__rail.nightCrash());console.log('nightCrash',rep.nightCrash);
  save('sheet-spawn.png',await p.evaluate(()=>__rail.spawnSeq()));
  {const before=errs.length;rep.liveNight=await p.evaluate(()=>__rail.liveNight(1500));rep.liveNight.pageErrors=errs.length-before;rep.liveNight.sample=errs.slice(before,before+2);errs.length=before;console.log('liveNight',rep.liveNight);}
  rep.tram=await p.evaluate(()=>__rail.tramJunction(200));console.log('tram',rep.tram);
  rep.natural=await p.evaluate(()=>__rail.natural(60));console.log('natural',JSON.stringify(rep.natural).slice(0,600));
  const s=await p.evaluate(()=>__rail.spr());save('sprites-x8.png',s.url);rep.spr={w:s.w,h:s.h,ox:s.ox,oy:s.oy};
  rep.hsr=await p.evaluate(()=>__rail.hsr());console.log('hsr',rep.hsr);
  rep.errors=errs;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(rep,null,1));await br.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
