'use strict';
/* T659 前後對照：同一組第一波真實選款座標，在指定 index.html 上以遊戲預設狀態拍幀，
   並另拍「七個舊疊層全關」的同幀；輸出每幀 PNG 與 RGBA 雜湊，供 main／分支／分支關閥三方比對。
   用法：node ba670.cjs <index.html> <outdir> [window旗標,…] */
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const [idxPath,out,flagArg]=process.argv.slice(2);const flags=(flagArg||'').split(',').filter(Boolean);
const OV=['DistrictTexture424','FacadeMemory426','LivedIn421','Rooftop425','Material430','NightIdentity423','NightMicro431'];
function bridge(){
  const OVS=OVLIST;
  function quiet(){running=false;speed=0;for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;tool='pan';quality=2;weather=0;const st=document.getElementById('start');if(st)st.classList.add('hide');}
  window.__ba={
    init(){GV.setMapSize(72);GV.newWorldSeeded(674);GV.setDiff(3);GV.ai(false);GV.setSpeed(0);quiet();for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});recalcAllMasks();computeFoam();},
    positions(vi,n){const b={k:2,lv:1,v:0,age:60,pw:true,wa:true,h:1,we:1,den:3};const r=[];for(let y=12;y<60&&r.length<n;y+=2)for(let x=12;x<60&&r.length<n;x+=3)if(variant670(b,x,y)===vi)r.push([x,y]);return r;},
    shot(pos,o){quiet();for(const t of tiles){t.bld=null;t.road=0;t.rc=0;}const[x,y]=pos;const b={k:2,lv:1,v:0,age:60,pw:true,wa:true,h:1,we:1,den:3};
      for(let xx=x-3;xx<=x+3;xx++)Object.assign(T(idx(xx,y-1)),{road:1,rc:2});T(idx(x,y)).bld=b;recalcAllMasks();computePower();computeWater();rebuildCov();b.pw=b.wa=true;
      GV.setRot(0);GV.setSeason(o.snow?3:1);rainDays=o.snow?SNOW_ACC_DAYS+3:0;GV.setZoom(3);GV.lookAt(x,y);for(const k of OVS)window['__no'+k]=!!o.off;
      let url;for(let i=0;i<3;i++){visT=o.night?5:55;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;GV.forceDraw();}
      const W=cvs.width,H=cvs.height,cw=300,ch=300,cx=(W>>1)-150,cy=(H>>1)-170;const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(cvs,cx,cy,cw,ch,0,0,cw,ch);
      for(const k of OVS)window['__no'+k]=false;return{url:c.toDataURL(),rgba:Array.from(c.getContext('2d').getImageData(0,0,cw,ch).data).join(','),t670:!!(spr670(b,x,y,!!o.snow)||{}).__t670};}
  };
}
(async()=>{
  const src=fs.readFileSync(idxPath,'utf8').replace('window.GV={',()=>'('+bridge.toString().replace('OVLIST',JSON.stringify(OV))+')();window.GV={');
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(src);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
  const ctx=await br.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,serviceWorkers:'block'});
  await ctx.addInitScript(fl=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');for(const f of fl)window[f]=true;},flags);
  await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(origin);await p.waitForFunction(()=>window.GV&&window.__ba&&window.__boot426&&__boot426().ready,null,{timeout:120000});
  await p.evaluate(()=>__ba.init());fs.mkdirSync(out,{recursive:true});const rep={index:idxPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(idxPath)).digest('hex'),flags,browser:br.version(),shots:[]};
  for(let vi=0;vi<10;vi++){const ps=await p.evaluate(([v,n])=>__ba.positions(v,n),[vi,4]);
    for(const pos of ps)for(const st of [{night:false},{night:true},{snow:true}]){
      const id=`v${vi}-${pos.join('_')}-${st.night?'night':st.snow?'snow':'day'}`;
      const a=await p.evaluate(([a,b])=>__ba.shot(a,b),[pos,st]),b=await p.evaluate(([a,b])=>__ba.shot(a,b),[pos,{...st,off:true}]);
      fs.writeFileSync(`${out}/${id}.png`,Buffer.from(a.url.split(',')[1],'base64'));
      const h=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,16);
      rep.shots.push({id,variant:vi,pos,state:st,t670:a.t670,frame:h(a.rgba),framePlainOverlaysOff:h(b.rgba),legacyOverlayVisible:a.rgba!==b.rgba});}
    console.log('variant',vi,'done');}
  rep.errors=errs;fs.writeFileSync(`${out}/report.json`,JSON.stringify(rep,null,1));await br.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
