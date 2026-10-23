'use strict';
// T707 試作驗證：同一組場景在指定 index.html 上逐步推進 updTrains（固定 dt、固定亂數），連拍並量測車廂是否在軌道上。
// 用法：node strip.cjs <index.html> <outdir> <tag> [window旗標,...]
const fs=require('fs'),http=require('http');
const [idx,out,tag,flagArg]=process.argv.slice(2);const flags=(flagArg||'').split(',').filter(Boolean);
function bridge(){
  const quiet=()=>{running=false;speed=0;for(const a of [cars,citizens,smokes,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;tool='pan';quality=1;weather=0;window.__noAnim=true;window.__noChimney=true;const st=document.getElementById('start');if(st)st.classList.add('hide');};
  window.__s707={
    init(){GV.setMapSize(48);GV.newWorldSeeded(707);GV.setDiff(3);GV.ai(false);GV.setSpeed(0);quiet();money=1e9;
      for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});
      const R=(x0,x1,y0,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!T(idx(x,y)).rail)GV.place('rail',x,y);};
      R(8,30,10,10);R(30,30,11,22);R(14,29,22,22); // 上邊東西、東邊南北、下邊東西：兩個 L 彎；(14,22) 是線尾
      R(8,8,11,16);                                 // 左邊往南的支線，(8,16) 線尾
      GV.place('station',18,7);                     // 車站在上邊主線北側
      for(const t of tiles)if(t.bld&&!t.bld.ref)Object.assign(t.bld,{age:60,pw:true,wa:true});
      recalcAllMasks();recalcAllRailMasks();computePower();computeWater();rebuildCov();groundDirty=true;
      let seed=7;Math.random=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
    },
    place(list){trains.length=0;for(const t of list)trains.push({...t});},
    step(n,dt){const before=listBldK,si=listBldK(17)[0];listBldK=k=>k===17?new Array(trains.length+1).fill(si):[];try{for(let i=0;i<n;i++)updTrains(dt);}finally{listBldK=before;}}, // 目標列車數＝手放的列車數：不多生、不刪
    cars(){const out=[];for(const tr of trains){const n=3;let P=null;try{if(typeof trainPath707==='function'&&(typeof t707On!=='function'||t707On()))P=trainPath707(tr);}catch(e){}
        for(let ci=0;ci<n;ci++){let fx,fy,d;if(P){const q=trainCar707(tr,ci,P);fx=q.fx;fy=q.fy;d=q.d;}else{const back=ci*.62;fx=tr.x+DIRV[tr.d][0]*(tr.p-back);fy=tr.y+DIRV[tr.d][1]*(tr.p-back);d=tr.d;}
          // 離軌距離：到最近一條「相鄰兩格軌道中心連線」的距離
          let best=9;const cx=Math.round(fx),cy=Math.round(fy);
          for(let yy=cy-2;yy<=cy+2;yy++)for(let xx=cx-2;xx<=cx+2;xx++){if(!inMap(xx,yy)||!T(idx(xx,yy)).rail)continue;best=Math.min(best,Math.hypot(fx-xx,fy-yy));
            for(const [dx,dy] of [[1,0],[0,1]]){const x2=xx+dx,y2=yy+dy;if(!inMap(x2,y2)||!T(idx(x2,y2)).rail)continue;const tt=Math.max(0,Math.min(1,(fx-xx)*dx+(fy-yy)*dy));best=Math.min(best,Math.hypot(fx-(xx+dx*tt),fy-(yy+dy*tt)));}}
          out.push({tr:trains.indexOf(tr),ci,fx:+fx.toFixed(3),fy:+fy.toFixed(3),d,off:+best.toFixed(3)});}}
      return out;},
    shot(cx,cy,zoom,night){quiet();GV.setRot(0);GV.setSeason(1);rainDays=0;GV.setZoom(zoom);GV.lookAt(cx,cy);visT=night?5:55;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';GV.forceDraw();
      const c=document.createElement('canvas');c.width=420;c.height=300;c.getContext('2d').drawImage(cvs,(cvs.width>>1)-210,(cvs.height>>1)-150,420,300,0,0,420,300);return c.toDataURL();}
  };
}
(async()=>{
  const src=fs.readFileSync(idx,'utf8').replace('window.GV={',()=>'('+bridge.toString()+')();window.GV={');
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(src);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
  const ctx=await br.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,serviceWorkers:'block'});
  await ctx.addInitScript(fl=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');for(const f of fl)window[f]=true;},flags);
  await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(origin);
  await p.waitForFunction(()=>window.GV&&window.__s707&&window.__boot426&&__boot426().ready,null,{timeout:120000});
  await p.evaluate(()=>__s707.init());fs.mkdirSync(out,{recursive:true});
  const rep={tag,flags,scenes:{}};
  const scenes=[
    {id:'corner',trains:[{x:27,y:10,d:1,p:0,pt:0}],look:[30,11],zoom:2.2,steps:16,dt:1/30,per:10},
    {id:'deadend',trains:[{x:17,y:22,d:3,p:0,pt:1}],look:[15,22],zoom:2.2,steps:16,dt:1/30,per:15},
    {id:'headon',trains:[{x:12,y:10,d:1,p:0,pt:0},{x:22,y:10,d:3,p:0,pt:1}],look:[17,10],zoom:1.6,steps:16,dt:1/30,per:20},
    {id:'station',trains:[{x:15,y:10,d:1,p:0,pt:0}],look:[19,9],zoom:1.8,steps:16,dt:1/30,per:15},
  ];
  for(const sc of scenes){
    await p.evaluate(l=>__s707.place(l),sc.trains);const frames=[];let maxOff=0;const tele=[];
    for(let k=0;k<sc.steps;k++){
      const cars=await p.evaluate(()=>__s707.cars());for(const c of cars)maxOff=Math.max(maxOff,c.off);tele.push(cars);
      for(const night of [false,true]){const u=await p.evaluate(a=>__s707.shot(...a),[sc.look[0],sc.look[1],sc.zoom,night]);fs.writeFileSync(`${out}/${tag}-${sc.id}-${night?'n':'d'}${k}.png`,Buffer.from(u.split(',')[1],'base64'));}
      await p.evaluate(a=>__s707.step(a[0],a[1]),[sc.per,sc.dt]);
    }
    rep.scenes[sc.id]={maxOff,tele};
  }
  rep.errors=errs;fs.writeFileSync(`${out}/${tag}-report.json`,JSON.stringify(rep));
  console.log(tag,Object.entries(rep.scenes).map(([k,v])=>k+':maxOff='+v.maxOff).join(' '),'errors',errs.length,errs[0]||'');
  await br.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
