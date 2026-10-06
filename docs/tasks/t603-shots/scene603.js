// T603 real Chromium evidence. Only a temporary repository copy and isolated slot 3.
// node scene603.js --port=8762 --out=/tmp/scene603 ; Node 22+, Chrome/Chromium.
// This is a fail-closed browser gate. Headless RAF is not physical-device FPS.
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),crypto=require('crypto');
const {spawn}=require('child_process');
const arg=(n,d)=>{const a=process.argv.find(x=>x.startsWith('--'+n+'='));return a?a.slice(n.length+3):d;};
const PHASE=arg('phase','full');if(!['full','core','world','neighbors','raster'].includes(PHASE))throw Error('Unknown T603 validation phase');
const PORT=+arg('port',8763),DEV=PORT+1000,OUT=path.resolve(arg('out',path.join(os.tmpdir(),'scene603')));
if([PORT,DEV].some(p=>[8123,8199].includes(p)))throw Error('Player ports 8123/8199 prohibited');
const ROOT=path.resolve(__dirname,'../../..'),DIR=fs.mkdtempSync(path.join(os.tmpdir(),'scene603-'));
fs.mkdirSync(OUT,{recursive:true});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pct=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
const report={status:'running',phase:PHASE,performanceFailures:[],coverage:{core:false,world:false,neighbors:false,raster:false},diagnosticOnly:PHASE==='raster',baseSha:'637c8cc6d09306c1e17535ece6119d3ad78f1382',checks:[],screenshots:[],headless:true,performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'};
const check=(v,m)=>{if(!v)throw Error(m);report.checks.push(m);};
const perfCheck=(v,m)=>{if(v)report.checks.push(m);else{report.performanceFailures.push(m);console.log('T603_PERFORMANCE_FAILURE '+m);}}; // 延後彙總判紅，不能把失敗轉綠；獨立圖面仍完整驗收。
const persist=()=>fs.writeFileSync(path.join(OUT,'scene603-summary.json'),JSON.stringify(report,null,2));
for(const f of fs.readdirSync(ROOT)){const p=path.join(ROOT,f);if(fs.statSync(p).isFile()&&/\.(html|js|json|webmanifest|png|svg|css)$/.test(f))fs.copyFileSync(p,path.join(DIR,f));}
// This function is string-injected inside the game's closure in the disposable copy.
function bridge603(){
  // Test-only steady light phase; retain every real advance/update and draw call.
  let frozenVisT603=null,measureWork603=false;const work603={advance:[],draw:[],hud:[]},advanceReal603=advance,drawReal603=draw,hudReal603=updHud;
  const measured603=(name,fn,args)=>{if(!measureWork603)return fn(...args);const t=performance.now();try{return fn(...args);}finally{work603[name].push(performance.now()-t);}};
  advance=function(dtReal){if(frozenVisT603!==null)visT=frozenVisT603;try{return measured603('advance',advanceReal603,[dtReal]);}finally{if(frozenVisT603!==null)visT=frozenVisT603;}};
  draw=function(...args){return measured603('draw',drawReal603,args);};updHud=function(...args){return measured603('hud',hudReal603,args);};
  const inputEvents=[],lifeDepthReal603=typeof lifeDepth603==='function'?lifeDepth603:null,clipReal603=typeof clipFilter603==='function'?clipFilter603:null;
  let silhouetteOriginal603=null;const clipStats603={uses:0,skipped:0,pixels:0,maxRectPixels:0},silhouetteCache603=new WeakMap(),silhouetteFloatCache603=new WeakMap(),silhouetteStats603={created:0,pixels:0,buildMs:0,uses:0,formats:[]},projectedCache603=new WeakMap(),projectedStats603={created:0,pixels:0,buildMs:0,uses:0,skipped:0,formats:[]};
  const silhouetteMode603=on=>{
    if(!on){if(silhouetteOriginal603){ctx.drawImage=silhouetteOriginal603;silhouetteOriginal603=null;}return {...silhouetteStats603};}
    if(silhouetteOriginal603)return {...silhouetteStats603};const flavour=on===true?'silhouette':on,projected=flavour.startsWith('projected'),highPrecision=flavour.endsWith('-float'),multiply=flavour.endsWith('-multiply'),clipped=flavour.startsWith('clipped-');silhouetteOriginal603=ctx.drawImage;
    ctx.drawImage=function(img,...args){if(this.filter!=='brightness(0)'||!(img instanceof HTMLCanvasElement))return silhouetteOriginal603.call(this,img,...args);
      if(clipped){const m=this.getTransform();if(args.length!==4||m.b!==0||m.c!==0||args[2]<=0||args[3]<=0||this.shadowBlur!==0){clipStats603.skipped++;return silhouetteOriginal603.call(this,img,...args);}const [x,y,w,h]=args,sx=m.a*x+m.e,sy=m.d*y+m.f,ex=sx+m.a*w,ey=sy+m.d*h;let left=Math.floor(Math.min(sx,ex))-2,top=Math.floor(Math.min(sy,ey))-2,cw=Math.ceil(Math.max(sx,ex))+2-left,ch=Math.ceil(Math.max(sy,ey))+2-top;if(flavour==='clipped-x'){top=0;ch=cvs.height;}if(flavour==='clipped-origin'){cw+=left;ch+=top;left=top=0;}if(cw<=0||ch<=0){clipStats603.skipped++;return silhouetteOriginal603.call(this,img,...args);}const p=new Path2D();p.rect(left,top,cw,ch);clipStats603.uses++;clipStats603.pixels+=cw*ch;clipStats603.maxRectPixels=Math.max(clipStats603.maxRectPixels,cw*ch);this.save();try{this.resetTransform();this.clip(p);this.setTransform(m);return silhouetteOriginal603.call(this,img,...args);}finally{this.restore();}}
      if(projected){const m=this.getTransform();if(args.length!==4||m.b!==0||m.c!==0||args[2]<=0||args[3]<=0||(multiply&&this.globalCompositeOperation!=='source-over')){projectedStats603.skipped++;return silhouetteOriginal603.call(this,img,...args);}
        const [x,y,w,h]=args,sx=m.a*x+m.e,sy=m.d*y+m.f,ex=sx+m.a*w,ey=sy+m.d*h,left=Math.floor(Math.min(sx,ex))-1,top=Math.floor(Math.min(sy,ey))-1,cw=Math.ceil(Math.max(sx,ex))+1-left,ch=Math.ceil(Math.max(sy,ey))+1-top,key=JSON.stringify([highPrecision,m.a,m.d,w,h,sx-left,sy-top,this.globalAlpha,this.imageSmoothingEnabled]);
        let byKey=projectedCache603.get(img);if(!byKey){byKey=new Map();projectedCache603.set(img,byKey);}let tile=byKey.get(key);
        if(!tile){const t=performance.now();tile=document.createElement('canvas');tile.width=cw;tile.height=ch;const g=tile.getContext('2d',highPrecision?{colorType:'float16'}:{});projectedStats603.formats.push(g.getContextAttributes().colorType||'unorm8');g.imageSmoothingEnabled=this.imageSmoothingEnabled;g.globalAlpha=this.globalAlpha;g.setTransform(m.a,0,0,m.d,m.e-left,m.f-top);g.filter='brightness(0)';g.drawImage(img,x,y,w,h);g.getImageData(0,0,cw,ch);byKey.set(key,tile);projectedStats603.created++;projectedStats603.pixels+=cw*ch;projectedStats603.buildMs+=performance.now()-t;}
        projectedStats603.uses++;this.save();try{this.resetTransform();this.filter='none';this.globalAlpha=1;this.imageSmoothingEnabled=false;if(multiply)this.globalCompositeOperation='multiply';return silhouetteOriginal603.call(this,tile,left,top);}finally{this.restore();}
      }
      const masks=highPrecision?silhouetteFloatCache603:silhouetteCache603;let mask=masks.get(img);if(!mask){const t=performance.now(),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d',highPrecision?{colorType:'float16'}:{});silhouetteStats603.formats.push(g.getContextAttributes().colorType||'unorm8');g.imageSmoothingEnabled=false;g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';g.getImageData(0,0,c.width,c.height);mask=c;masks.set(img,c);silhouetteStats603.created++;silhouetteStats603.pixels+=c.width*c.height;silhouetteStats603.buildMs+=performance.now()-t;}
      silhouetteStats603.uses++;const f=this.filter;this.filter='none';try{return silhouetteOriginal603.call(this,mask,...args);}finally{this.filter=f;}
    };return {...silhouetteStats603};
  };

  const canonicalSaved=raw=>{const d=saveInflate(JSON.parse(raw)),out={};for(const k of ['v','n','seed','money','day','df','bl','lots574','ter','tre','rd','zn','gvc'])out[k]=d[k];return JSON.stringify(out);};
  const pointerSnapshot=()=>({pointers:[...pointers.entries()].map(([id,p])=>({id,...p})),down:downInfo?{...downInfo,elapsed:performance.now()-downInfo.t}:null,pan:panBase?{...panBase}:null,pinch:pinchBase?{...pinchBase}:null,selected:selTile?{...selTile}:null});
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel']){
    const record=(phase,e)=>{const tile=toTile(e.clientX,e.clientY);inputEvents.push({type,phase,time:performance.now(),eventTime:e.timeStamp,x:e.clientX,y:e.clientY,button:e.button,buttons:e.buttons,pointerId:e.pointerId,pointerType:e.pointerType,trusted:e.isTrusted,tile,state:pointerSnapshot()});if(inputEvents.length>96)inputEvents.shift();};
    cvs.addEventListener(type,e=>record('before',e),true);
    cvs.addEventListener(type,e=>record('after',e));
  }
  window.__s603={
    pointerState:pointerSnapshot,pointTile:toTile,inputEvents:()=>inputEvents.slice(),clearInputEvents:()=>{inputEvents.length=0;},
    economy:()=>({money,diff}),
    freezeVis:t=>{frozenVisT603=t===null?null:Number(t);if(frozenVisT603!==null)visT=frozenVisT603;return {time:visT,light:daylight()};},
    cacheStats:()=>({bakes:lotBakeN574,entries:lotCache574.size,pixels:lotCachePixels574,hooks:lotHookCache574.size,keys:[...lotCache574.keys()]}),
    toolCategoryLabel:id=>{const t=TOOLS.find(t=>t.id===id);return t&&(TOOL_CATS.find(c=>c.id===t.cat)||{}).nm;},
    freeGardenSite:()=>{const toolId='dogpark',n=plannedLotSize574(toolId),sites=[];for(let y=3;y<N-n-3;y++)for(let x=3;x<N-n-3;x++){if(canPlace(toolId,x,y))continue;let empty=true;for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++){const t=T(idx(x+dx,y+dy));if(t.bld||t.tree||t.zone||t.deco||t.road||t.rail||t.tram)empty=false;}if(empty)sites.push({x,y,n,cost:placeCost(toolId,x,y),money,diff});}sites.sort((a,b)=>(Math.abs(a.x-N/2)+Math.abs(a.y-N/2))-(Math.abs(b.x-N/2)+Math.abs(b.y-N/2))||a.y-b.y||a.x-b.x);return sites[0]||null;},
    footprint:(x,y,n)=>{const out=[];for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++){const b=T(idx(x+dx,y+dy)).bld;out.push([x+dx,y+dy,b?b.k:null,b&&b.ref?b.ref.slice():null,b?(b.sz||1):0,b?(b.lot574||0):0]);}return out;},
    flags:()=>({T603:typeof t603On==='function'?t603On():false,T596:t596On(),T600:t596On()&&!t600Off(),T600Escape:t600Off()}),
    bake:typeof bakeArt603==='function'?bakeArt603:null,rep:()=>({ok:1}),v:(k,x,y)=>v603(k,x,y,T(idx(x,y)).bld),
    clear:()=>{lotCache574.clear();lotHookCache574.clear();lotCachePixels574=0;},
    offsetCamera:(dx,dy)=>{cam.x+=dx;cam.y+=dy;groundDirty=true;return {x:cam.x,y:cam.y,z:cam.z};},
    view:()=>({cam:{...cam},tool,speed,running,day,rot:viewRotEff(),season:season(),slot:curSlot(),selected:selTile,info:$('#info').style.display,visible:document.visibilityState}),
    scene:()=>JSON.stringify({day,money,pop,tiles}),
    point:(x,y)=>{const p=w2v(x,y);return {x:(W/2+((p[0]-p[1])*32-cam.x)*cam.z)/DPR,y:(H/2+((p[0]+p[1]+1)*16-cam.y)*cam.z)/DPR};},
    roots:()=>{const rows=[];let bad=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(!b||b.ref)continue;rows.push([idx(x,y),b.k,b.lv,b.v,b.sz||1,!!b.lot574]);if(b.sz>=2)for(let yy=0;yy<b.sz;yy++)for(let xx=0;xx<b.sz;xx++){if(!xx&&!yy)continue;const q=inMap(x+xx,y+yy)&&T(idx(x+xx,y+yy)).bld;if(!q||!q.ref||q.ref[0]!==x||q.ref[1]!==y)bad++;}}return {rows,bad};},
    census:k=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(b&&!b.ref&&b.k===k)out.push([x,y,b.sz||1]);}return out;},
    saved:()=>canonicalSaved(localStorage.getItem(slotKey(3))),sourceSaved:canonicalSaved,
    // One synchronous task prevents RAF vehicle feedback between deterministic ticks.
    grow22:()=>{GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let step=0;step<420;step++)GV.step(1);GV.ai(false);GV.setSpeed(0);updHud();return GV.stats();},
    snow:on=>{rainDays=on?SNOW_ACC_DAYS+3:0;},
    clearMap:()=>{for(const t of tiles){Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});}computeFoam();groundDirty=true;},
    prepare:(x,y,n)=>{for(let xx=x-1;xx<=x+n;xx++){const t=T(idx(xx,y-1));t.road=1;t.rc=1;t.bld=null;}for(let yy=y-2;yy<=y;yy++)for(let xx=x-2;xx<=x+n+1;xx++)if(inMap(xx,yy))recalcMask(xx,yy);RESOURCE[idx(x,y)]=1;money=1e9;},
    finish:()=>{for(const t of tiles)if(t.bld&&!t.bld.ref){t.bld.age=60;t.bld.pw=true;t.bld.wa=true;}},
    age:(x,y,a)=>{const b=T(idx(x,y)).bld;if(!b||b.ref)throw Error('Missing root');b.age=a;},
    stage:(x,y,want)=>{cityEvent=null;for(let d=101;d<117;d++)if(Math.floor(((d+Math.floor(streetHash(x,y,777)*16))%16)/4)===want){day=d;return want;}throw Error('No crop stage');},
    single:(k,x,y)=>{T(idx(x,y)).tree=0;T(idx(x,y)).bld={k,lv:1,v:0,age:60,pw:true,wa:true,h:.6};},
    neighbor:(kind,x,y)=>{const t=T(idx(x,y));if(t.bld)throw Error('Neighbor overlaps footprint');if(kind==='tree'){if(!GV.place('tree',x,y))throw Error('Tree placement failed');}else{__s603.single(kind==='residential'?1:kind==='hospital591'?12:81,x,y);if(kind==='residential')Object.assign(t.bld,{lv:3,v:1,den:3});}return !!(t.tree||t.bld);},
    shoreExpected:(x,y)=>{const p=w2v(x,y),wet=(a,b)=>{const q=v2w(p[0]+a,p[1]+b);return inMap(q[0],q[1])&&T(idx(q[0],q[1])).t===0;};const f=wet(1,0)||wet(0,1)||wet(1,1),l=wet(-1,0),r=wet(0,-1),c=wet(-1,-1);return {front:f,left:l,right:r,corner:c,want:f?-1:l&&r?2:l?0:r?1:c?2:-1};},
    shores:()=>{const water=(x,y)=>inMap(x,y)&&T(idx(x,y)).t===0,out={};for(let y=2;y<N-2;y++)for(let x=2;x<N-2;x++){const t=T(idx(x,y));if(t.t===0||t.bld||t.road||t.bridge||t.rail||t.tram)continue;const e=water(x+1,y),s=water(x,y+1),kind=e&&!s?'E':s&&!e?'S':e&&s?'ES':!water(x+1,y+1)&&(water(x-1,y)||water(x,y-1))?'back':null;if(kind&&!out[kind]&&!Object.values(out).some(p=>Math.abs(p[0]-x)+Math.abs(p[1]-y)<4))out[kind]=[x,y];}return out;},
    drawMs:()=>{const t=performance.now();GV.forceDraw();return performance.now()-t;},
    trace:()=>{const calls=[],old=ctx.drawImage;ctx.drawImage=function(img,...args){calls.push({img,args});return old.call(this,img,...args);};try{GV.forceDraw();}finally{ctx.drawImage=old;}const out=[];for(const c of calls)for(const [key,s]of lotCache574)if(c.img===s.img){out.push({key,args:c.args});break;}return out;},
    perfStart:()=>{for(const k in work603)work603[k].length=0;measureWork603=true;return true;},
    perfWork:()=>{measureWork603=false;const out={};for(const k in work603){const a=work603[k],b=[...a].sort((x,y)=>x-y);out[k]={calls:a.length,mean:a.length?a.reduce((x,y)=>x+y,0)/a.length:0,p95:b.length?b[Math.min(b.length-1,Math.floor(b.length*.95))]:0,max:b.length?b[b.length-1]:0};}return {work:out,state:{speed,running,quality,cars:cars.length,citizens:citizens.length,visT,day,visibility:document.visibilityState},heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};},
    documentIdentity:()=>({version:GAME_VER,civicFactory:typeof bakeArt603,url:location.pathname}),
    comparisonRig:()=>{document.getElementById('bNewGame').click();GV.setMapSize(72);GV.setRot(0);GV.newWorldSeeded(603);GV.setDiff(3);GV.setSpeed(0);GV.ai(false);__s603.clearMap();money=1e9;for(const [tool,x,y]of[['recycling',27,28],['seniorCenter',31,28],['dogpark',27,32],['compost',31,32]]){if(!GV.place(tool,x,y))throw Error('comparison placement '+tool);}__s603.finish();selTile=null;return __s603.roots();},
    comparisonFrame:(rot,sea,time)=>{GV.setRot(rot);GV.setSeason(sea);GV.weather(0);__s603.snow(sea===3);trafClock=time;waterF=0;waterT=0;__s603.freezeVis(time);GV.setZoom(2);GV.lookAt(30,31);groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';GV.forceDraw();GV.forceDraw();return {hash:__s603.imageHash(cvs),png:cvs.toDataURL('image/png'),state:{W,H,DPR,day,waterF,waterT,trafClock,visT,rot:viewRotEff(),cam:{...cam},roots:__s603.roots(),flags:__s603.flags()}};},
    makeShore:(x,y,n)=>{for(let yy=y-1;yy<=y+n;yy++)for(let xx=x-1;xx<=x+n;xx++){if(xx>=x&&xx<x+n&&yy>=y&&yy<y+n)continue;const t=T(idx(xx,yy));t.t=0;t.road=0;t.mask=0;for(const[a,b]of[[xx,yy],[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]])if(inMap(a,b))recalcMask(a,b);}computeFoam();groundDirty=true;return T(idx(x+n,y)).t===0;},
    reflectionNull:(x,y)=>reflectSprite(T(idx(x,y)).bld,x,y)===null,
    badLifeDepth:on=>{if(!lifeDepthReal603)throw Error('Missing new depth helper');lifeDepth603=on?((x,y,b,base)=>base+.016):lifeDepthReal603;return true;},
    actors:()=>{ // 最終畫布反事實像素：有畫呼叫不等於能看見；每次同步重畫固定時鐘。
      const out={dogs:0,owners:0,dogFrames:[],ownerFrames:[],rects:[]},old=ctx.drawImage,clock=[trafClock,waterT,waterF],rects=[];let skip='',collect=false;
      const kindOf=img=>SPR.lifeDog.some(s=>s.img===img)?'dog':SPR.ped.adult.some(s=>s.img===img)?'owner':null;
      const snap=()=>rects.map(r=>ctx.getImageData(r.x,r.y,r.w,r.h).data);
      const diffs=(a,b)=>a.map((buf,j)=>{let n=0;for(let i=0;i<buf.length;i+=4)if(buf[i]!==b[j][i]||buf[i+1]!==b[j][i+1]||buf[i+2]!==b[j][i+2]||buf[i+3]!==b[j][i+3])n++;return n;});
      const render=()=>{[trafClock,waterT,waterF]=clock;GV.forceDraw();};
      ctx.drawImage=function(img,...args){const kind=kindOf(img);if(kind&&collect){if(args.length!==4)throw Error('Unexpected actor draw signature');const [x,y,w,h]=args,x0=Math.max(0,Math.floor(x)-1),y0=Math.max(0,Math.floor(y)-1),x1=Math.min(cvs.width,Math.ceil(x+w)+1),y1=Math.min(cvs.height,Math.ceil(y+h)+1);if(x1<=x0||y1<=y0)throw Error('Actor outside test viewport');rects.push({kind,x:x0,y:y0,w:x1-x0,h:y1-y0});out[kind==='dog'?'dogs':'owners']++;out[kind+'Frames'].push((kind==='dog'?SPR.lifeDog:SPR.ped.adult).findIndex(s=>s.img===img));}if(kind&&skip===kind)return;return old.call(this,img,...args);};
      try{collect=true;render();collect=false;const normal=snap();render();out.unstablePixels=diffs(normal,snap()).reduce((a,b)=>a+b,0);for(const kind of ['dog','owner']){skip=kind;render();const d=diffs(normal,snap());out[kind+'VisiblePixels']=d.reduce((sum,n,i)=>sum+(rects[i].kind===kind?n:0),0);for(let i=0;i<rects.length;i++)if(rects[i].kind===kind)rects[i].visiblePixels=d[i];}out.rects=rects;return out;}finally{ctx.drawImage=old;render();[trafClock,waterT,waterF]=clock;}
    },
    clipPixelPair:(badEdge=false)=>{ // 同一同步任務、固定時鐘；逐RGBA比較實際整幅遊戲畫布。
      if(!clipReal603)throw Error('Missing native filter clip helper');
      const prior=window.__noClip603,clock=[trafClock,waterT,waterF],counts={calls:0,used:0,reflectionUses:0,shadowUses:0,fractionalCalls:0,fractionalUses:0,fractionalScaleCalls:0,fractionalScaleUses:0};
      const render=()=>{[trafClock,waterT,waterF]=clock;GV.forceDraw();return ctx.getImageData(0,0,cvs.width,cvs.height).data;};
      const delta=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n;};
      clipFilter603=function(g,img,x,y,w,h){counts.calls++;const transform=g.getTransform(),fractional=!Number.isInteger(transform.a*x+transform.e)||!Number.isInteger(transform.a*(x+w)+transform.e);const fractionalScale=!Number.isInteger(transform.a*w/img.width);if(fractional)counts.fractionalCalls++;if(fractionalScale)counts.fractionalScaleCalls++;const used=clipReal603(g,img,x,y,w,h);if(fractional&&used)counts.fractionalUses++;if(fractionalScale&&used)counts.fractionalScaleUses++;if(used){counts.used++;counts[g.getTransform().d<0?'reflectionUses':'shadowUses']++;if(badEdge){const m=g.getTransform(),a=m.a*x+m.e,b=m.a*(x+w)+m.e,p=new Path2D();p.rect((a+b)/2,0,Math.abs(b-a)/2,g.canvas.height);g.resetTransform();g.clip(p);g.setTransform(m);}}return used;};
      try{window.__noClip603=true;render();const before=render(),repeat=render();window.__noClip603=false;counts.calls=counts.used=counts.reflectionUses=counts.shadowUses=counts.fractionalCalls=counts.fractionalUses=counts.fractionalScaleCalls=counts.fractionalScaleUses=0;const after=render(),afterRepeat=render();return {width:cvs.width,height:cvs.height,cssWidth:innerWidth,cssHeight:innerHeight,dpr:DPR,cam:{...cam},badEdge,changedPixels:delta(before,after),unstablePixels:delta(before,repeat),optimizedUnstablePixels:delta(after,afterRepeat),...counts};}
      finally{clipFilter603=clipReal603;if(prior===undefined)delete window.__noClip603;else window.__noClip603=prior;[trafClock,waterT,waterF]=clock;GV.forceDraw();[trafClock,waterT,waterF]=clock;}
    },
    blendProbe:()=>{const make=options=>{const c=document.createElement('canvas');c.width=c.height=8;return[c,c.getContext('2d',options)];},[source,g]=make({});g.fillStyle='#e7b34f';g.fillRect(0,0,8,8);const cases=[];for(const kind of ['native-filter','mask-unorm8','mask-float16','projected-multiply']){const [target,t]=make({});t.fillStyle='#2e6ba2';t.fillRect(0,0,8,8);t.globalAlpha=.22;let img=source,attributes=null;if(kind==='native-filter')t.filter='brightness(0)';else{const [mask,m]=make({colorType:kind==='mask-float16'?'float16':'unorm8'});if(kind==='projected-multiply'){m.globalAlpha=.22;m.filter='brightness(0)';m.drawImage(source,0,0);t.globalAlpha=1;t.globalCompositeOperation='multiply';}else{m.fillStyle='#000';m.fillRect(0,0,8,8);}img=mask;attributes=m.getContextAttributes();}t.drawImage(img,0,0);cases.push({kind,attributes,rgba:[...t.getImageData(4,4,1,1).data]});}return cases;},
    rasterAudit:kind=>{ // 拋棄式台架實驗，不改產品檔案、不關閉任何視覺效果。
      if(!['observe','clipped-native','clipped-x','clipped-origin','silhouette','silhouette-float','projected','projected-float','projected-multiply','read-lots','write-lots','write-visible'].includes(kind))throw Error('Unknown raster experiment');
      silhouetteMode603(false);const clock=[trafClock,waterT,waterF],old=ctx.drawImage,visible=new Set(),lots=new Set();for(const s of lotCache574.values())for(const k of ['img','night'])if(s[k])lots.add(s[k]);
      const render=()=>{[trafClock,waterT,waterF]=clock;GV.forceDraw();};
      ctx.drawImage=function(img,...a){if(img instanceof HTMLCanvasElement&&img!==cvs)visible.add(img);return old.call(this,img,...a);};try{render();}finally{ctx.drawImage=old;}
      render();const before=ctx.getImageData(0,0,cvs.width,cvs.height).data;render();const repeated=ctx.getImageData(0,0,cvs.width,cvs.height).data;
      const delta=a=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==before[i]||a[i+1]!==before[i+1]||a[i+2]!==before[i+2]||a[i+3]!==before[i+3])n++;return n;};
      const beforePNG=(kind.startsWith('clipped-')||kind.startsWith('silhouette')||kind.startsWith('projected'))?cvs.toDataURL('image/png'):null;
      const selected=(kind==='observe'||kind.startsWith('clipped-')||kind.startsWith('silhouette')||kind.startsWith('projected'))?[]:[...(kind==='write-visible'?visible:lots)],sizes=[],t=performance.now();let pixels=0;
      for(const c of selected){const g=c.getContext('2d'),data=g.getImageData(0,0,c.width,c.height);if(kind.startsWith('write-'))g.putImageData(data,0,0);pixels+=c.width*c.height;sizes.push({w:c.width,h:c.height,lot:lots.has(c),ground:c===groundCache});}
      if(kind.startsWith('clipped-')||kind.startsWith('silhouette')||kind.startsWith('projected'))silhouetteMode603(kind);const preparationMs=performance.now()-t;render();const after=ctx.getImageData(0,0,cvs.width,cvs.height).data,changedPixels=delta(after),afterPNG=beforePNG?cvs.toDataURL('image/png'):null,details={maxChannelDelta:0,totalChannelDelta:0,samples:[]};for(let i=0;i<after.length;i+=4){let d=0;for(let k=0;k<4;k++){const n=Math.abs(after[i+k]-before[i+k]);d+=n;details.totalChannelDelta+=n;details.maxChannelDelta=Math.max(details.maxChannelDelta,n);}if(d&&details.samples.length<20)details.samples.push({x:(i/4)%cvs.width,y:Math.floor(i/4/cvs.width),before:[...before.slice(i,i+4)],after:[...after.slice(i,i+4)]});}[trafClock,waterT,waterF]=clock;
      return {kind,preparationMs,sources:selected.length,pixels,sizes,visibleSources:visible.size,lotSources:lots.size,unstablePixels:delta(repeated),changedPixels,details,beforePNG,afterPNG,silhouette:{...silhouetteStats603},projected:{...projectedStats603}};
    },
    clipStats:()=>({...clipStats603}),
    silhouetteStats:()=>({...silhouetteStats603}),projectedStats:()=>({...projectedStats603}),
    imageHash:c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0x811c9dc5;for(const b of a){h^=b;h=Math.imul(h,16777619)>>>0;}return h.toString(16);},
    pins:()=>{const tab=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;tab[n]=c;}const crc=c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let r=0xFFFFFFFF;for(const b of a)r=tab[(r^b)&255]^(r>>>8);return ((r^0xFFFFFFFF)>>>0).toString(16);},out={};for(const e of GV.sprAtlas356().entries){const p=[crc(e.img)];if(e.night)p.push(crc(e.night));if(e.nightCity)p.push(crc(e.nightCity));out[e.fam+'/'+e.key]=p;}return out;},
    sheet:(kind,night,winter)=>{const old=$('#sheet603');if(old)old.remove();const c=document.createElement('canvas');c.id='sheet603';c.width=1400;c.height=900;c.style='position:fixed;inset:0;z-index:999999;width:1400px;height:900px';document.body.append(c);const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle=night?'#101d2a':'#e7eee7';g.fillRect(0,0,1400,900);g.fillStyle=night?'#dde9e5':'#254653';g.font='bold 23px sans-serif';g.fillText('T603 BLUE-GREY | '+kind+' | '+(winter?'WINTER':night?'NIGHT':'DAY'),30,35);const out=[];for(let row=0;row<4;row++)for(let v=0;v<3;v++){const k=[29,85,92,88][row],stage=2,s=bakeArt603(k,v,stage,winter),scale=1.4,cropY=80,cropH=s.h-cropY,x=105+v*440,y=70+row*205;g.drawImage(s.img,0,cropY,s.w,cropH,x,y,s.w*scale,cropH*scale);if(night){g.fillStyle='#0a162a99';g.fillRect(x,y,s.w*scale,cropH*scale);g.drawImage(s.night,0,cropY,s.w,cropH,x,y,s.w*scale,cropH*scale);}g.fillStyle=night?'#dde9e5':'#254653';g.font='15px sans-serif';g.fillText('k'+k+' V'+(v+1)+' stage '+stage,x+240,y+120);const a=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,b=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;let ink=0,light=0,orphan=0,cropped=0;for(let i=3;i<a.length;i+=4){if(a[i]){ink++;if(i<cropY*s.w*4)cropped++;}if(b[i]){light++;if(!a[i])orphan++;}}out.push({k,v,stage,ink,light,orphan,cropped,hash:__s603.imageHash(s.img)});}return out;}
  };
}
// Reconstruct, then SHA256-bind the immutable GitHub base. This is not a guessed visual proxy.
function sourceBaseline603(source){
  let base=source;const start='\n\n/* ===== T603 藍灰社區公共設施：',end='/* ===== T603 區塊結束 ===== */\n';const lo=base.indexOf(start),hi=base.indexOf(end,lo);check(lo>=0&&hi>lo,'unique new art block for exact-base reconstruction');base=base.slice(0,lo)+base.slice(hi+end.length);
  for(const [a,b]of [
    ["const GAME_VER='11.212'","const GAME_VER='11.211'"],
    ['        clipFilter603(ctx,rs.img,-rs.ax*z,-rs.ay*z,rs.w*z,rs.h*z); // T603：只裁X，保留原生濾鏡與垂直取樣原點\n',''],
    ['      clipFilter603(ctx,s.img,bx+SHOX*z,by+s.h*z-shH+SHOY*z,s.w*z,shH); // T603：只裁X，外層save/restore管理裁切狀態\n',''],
    ['objs.push({dep:lifeDepth603(x,y,t.bld,t.bld.lot574?_iso[2]:viewDep(x,y)),dog:{hx:ph369}', 'objs.push({dep:(t.bld.lot574?_iso[2]:viewDep(x,y))+.016,dog:{hx:ph369}'],
    ["objs.push({dep:lifeDepth603(x,y,t.bld,t.bld.lot574?_iso2[2]:viewDep(x,y)),ped:{ptype:'adult',hx:oh}", "objs.push({dep:(t.bld.lot574?_iso2[2]:viewDep(x,y))+.016,ped:{ptype:'adult',hx:oh}"],
    ['  if(LOT603.has(k)&&t603On())return Math.max(0,Math.min(2,v|0)); // T603：社區設施三款\n',''],
    ['&&!(LOT603.has(k)&&t603On())',''],
    ["if(LOT603.has(k)&&t603On())return '_t603_s'+season();",''],
    ['if(b&&LOT603.has(b.k)&&t603On())return v603(b.k,x,y,b);',''],
    ['  if(LOT603.has(k)&&t603On()){const r603=bakeArt603(k,v,stage,winter);if(r603)return r603;} // T603：本批原創園區；獨立快取與回退\n','']
  ]){check(base.split(a).length===2,'exact-base inverse anchor '+a.slice(0,45));base=base.replace(a,b);}
  const sha=hash(base);check(sha==='b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265','reconstructed base exactly matches immutable main index SHA256');report.baseIndexSHA256=sha;return base;
}
let html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
const exactBase603=sourceBaseline603(html);fs.writeFileSync(path.join(DIR,'baseline603.html'),exactBase603.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));
check(html.split('window.GV={').length===2,'unique game bridge anchor');
fs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));
const chromePath=()=>[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(p=>fs.existsSync(p));
(async()=>{
  let browser,ws,exitCode=2,server,captureFailure=null;const errors=[],consoleErrors=[];
  try{
    server=http.createServer((req,res)=>{const file=path.resolve(DIR,'.'+decodeURIComponent((req.url||'/').split('?')[0]));const target=file===DIR?path.join(DIR,'index.html'):file;if(!target.startsWith(DIR+path.sep)){res.writeHead(403).end();return;}fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':target.endsWith('.html')?'text/html; charset=utf-8':target.endsWith('.js')?'application/javascript':target.endsWith('.json')?'application/json':'application/octet-stream','cache-control':'no-store'});res.end(data);});});
    await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(PORT,'127.0.0.1',resolve);});
    const executable=chromePath();check(executable,'Chrome executable exists');
    browser=spawn(executable,['--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),'--no-first-run','--no-default-browser-check','--mute-audio','--hide-scrollbars','--window-size=1400,900','--user-data-dir='+path.join(DIR,'.profile'),'--remote-debugging-port='+DEV,'about:blank'],{stdio:['ignore','ignore','pipe']});
    let chromeLog='';browser.stderr.on('data',b=>{chromeLog=(chromeLog+b).slice(-12000);});browser.on('error',e=>{chromeLog+=String(e);});
    let url;for(let i=0;i<120&&!url;i++){try{const tabs=await fetch('http://127.0.0.1:'+DEV+'/json/list').then(r=>r.json());url=tabs.find(t=>t.type==='page'&&t.webSocketDebuggerUrl)?.webSocketDebuggerUrl;}catch{}if(browser.exitCode!==null||browser.signalCode!==null)throw Error('Chrome exited '+(browser.exitCode??browser.signalCode)+': '+chromeLog);if(!url)await sleep(250);}check(url,'Chrome CDP unavailable: '+chromeLog);
    ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let nextId=0,traceResolve603=null;const pending=new Map();
    ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Tracing.tracingComplete'&&traceResolve603){traceResolve603(m.params);traceResolve603=null;}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value??a.description??'').join(' '));};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},150000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
    const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const ready=async(previousTimeOrigin=null)=>{for(let i=0;i<240;i++){try{if(await ev('!!(window.GV&&window.__s603&&window.__boot426&&window.__boot426().ready&&(!document.getElementById("boot426")||document.getElementById("boot426").classList.contains("hide"))&&('+JSON.stringify(previousTimeOrigin)+'===null||performance.timeOrigin!=='+JSON.stringify(previousTimeOrigin)+'))'))return;}catch{}await sleep(500);}throw Error('New document boot/overlay incomplete');};
    const shot=async name=>{await ev('if(!document.getElementById("sheet603"))GV.forceDraw();true');await sleep(100);const r=await send('Page.captureScreenshot',{format:'png'}),file='T603-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(r.data,'base64'));report.screenshots.push(file);if(report.screenshots.length%25===0){persist();console.log('T603_PROGRESS '+JSON.stringify({checks:report.checks.length,screenshots:report.screenshots.length,last:file}));}};
    captureFailure=async()=>{if(!ws||ws.readyState!==1)throw Error('CDP socket unavailable for failure screenshot');const r=await send('Page.captureScreenshot',{format:'png'}),file='T603-failure-raw.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(r.data,'base64'));report.failureScreenshot=file;report.screenshots.push(file);};
    const view=()=>ev('__s603.view()');
    const mouse=(type,x,y,extra={})=>send('Input.dispatchMouseEvent',{type,x,y,...extra});
    const touch=(type,points)=>send('Input.dispatchTouchEvent',{type,touchPoints:points});
    // Queue down then up on the ordered CDP socket before waiting for replies.
    // This avoids adding a host roundtrip / expensive first frame to a short tap.
    const tap=async(x,y,mobile)=>{const down=mobile?touch('touchStart',[{x,y,id:1}]):mouse('mousePressed',x,y,{button:'left',buttons:1,clickCount:1});const up=mobile?touch('touchEnd',[]):mouse('mouseReleased',x,y,{button:'left',buttons:0,clickCount:1});await Promise.all([down,up]);await sleep(80);};
    const click=async(selector,mobile=false)=>{const p=await ev('(()=>{const e='+selector+';if(!e)throw Error("UI target missing");e.scrollIntoView({block:"nearest",inline:"nearest"});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);const describe=n=>n?{id:n.id,className:String(n.className||""),outerHTML:n.outerHTML.slice(0,1600),rect:n.getBoundingClientRect().toJSON()}:null,detail={point:{x,y},viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY},target:describe(e),top:describe(top)};if(!r.width||!r.height||x<0||y<0||x>=innerWidth||y>=innerHeight)throw Error("UI target invisible "+e.id+" "+JSON.stringify(detail));if(top!==e&&!e.contains(top))throw Error("UI target covered "+e.id+" "+JSON.stringify(detail));return {x,y};})()');await tap(p.x,p.y,mobile);};
    const el=id=>'document.getElementById('+JSON.stringify(id)+')';
    const slotButton=text=>'[...[...document.querySelectorAll("#infoBody .row")].find(r=>/^槽3[｜ ]/.test(r.textContent)).querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(text)+')';
    const camera=async(x,y,z,r,s,t,snow)=>ev('GV.setRot('+r+');GV.setSeason('+s+');GV.weather(0);GV.setVisT('+t+');__s603.freezeVis('+t+');__s603.snow('+snow+');GV.setZoom('+z+');GV.lookAt('+x+','+y+');true');
    const raf=async ms=>{const r=await ev('new Promise((resolve,reject)=>{if(document.visibilityState!=="visible"||!__s603.view().running){reject(Error("RAF needs a visible running page"));return;}const start=performance.now(),a=[];let last;const timer=setTimeout(()=>reject(Error("RAF stalled")),'+(ms+15000)+');function f(t){if(last!==undefined)a.push(t-last);last=t;if(t-start>='+ms+'){clearTimeout(timer);resolve({elapsed:t-start,frames:a.length,intervals:a,visibility:document.visibilityState});}else requestAnimationFrame(f);}requestAnimationFrame(f);})');return {elapsed:r.elapsed,frames:r.frames,mean:r.intervals.reduce((a,b)=>a+b,0)/r.frames,p95:pct(r.intervals,.95),max:Math.max(...r.intervals),visibility:r.visibility};};
    const traceFrameWork603=async label=>{const complete=new Promise(resolve=>{traceResolve603=resolve;});await send('Tracing.start',{categories:'devtools.timeline,cc,gpu,blink',transferMode:'ReturnAsStream'});await sleep(5000);await send('Tracing.end');const done=await Promise.race([complete,sleep(30000).then(()=>{throw Error('trace completion timeout');})]);let text='';for(;;){const r=await send('IO.read',{handle:done.stream});text+=r.base64Encoded?Buffer.from(r.data,'base64').toString('utf8'):r.data;if(r.eof)break;}await send('IO.close',{handle:done.stream});const file='T603-'+label+'-trace.json.gz';fs.writeFileSync(path.join(OUT,file),require('zlib').gzipSync(text));return {file,uncompressedBytes:Buffer.byteLength(text)};};
    const testUI=async(label,mobile,target)=>{
      let built=null;
      await ev('GV.setSpeed(0);GV.setRot(0);GV.setZoom(1);true');
      await click('document.querySelector("[data-tid=doze]")',mobile);check((await view()).tool==='doze',label+' real tool select');
      await click('document.querySelector("[data-tid=pan]")',mobile);check((await view()).tool==='pan',label+' real pan select');
      await click(el('bSpeed'),mobile);check((await view()).speed===1,label+' real speed button');await ev('GV.setSpeed(0);true');
      const state=await ev('__s603.scene()');
      const z0=(await view()).cam.z;await click(el('zin'),mobile);await sleep(350);check((await view()).cam.z>z0,label+' real zoom-in button');await click(el('zout'),mobile);await sleep(350);check(Math.abs((await view()).cam.z-z0)<.01,label+' real zoom-out button');
      const p=await ev('({x:innerWidth*.5,y:Math.max(260,innerHeight*.57)})'),a=(await view()).cam;
      check(await ev('document.elementFromPoint('+p.x+','+p.y+').id==="game"'),label+' drag hits game canvas');
      if(mobile){await touch('touchStart',[{...p,id:1}]);for(let i=1;i<=6;i++)await touch('touchMove',[{x:p.x+10*i,y:p.y+4*i,id:1}]);await touch('touchEnd',[]);}
      else{await mouse('mousePressed',p.x,p.y,{button:'left',buttons:1,clickCount:1});for(let i=1;i<=6;i++)await mouse('mouseMoved',p.x+10*i,p.y+4*i,{button:'left',buttons:1});await mouse('mouseReleased',p.x+60,p.y+24,{button:'left',buttons:0,clickCount:1});}
      const b=(await view()).cam;check(Math.hypot(a.x-b.x,a.y-b.y)>10,label+' real drag moved camera');
      const z=(await view()).cam.z;if(mobile){await touch('touchStart',[{x:140,y:p.y,id:1},{x:230,y:p.y,id:2}]);for(let i=1;i<=5;i++)await touch('touchMove',[{x:140-i*5,y:p.y,id:1},{x:230+i*5,y:p.y,id:2}]);await touch('touchEnd',[]);}else await mouse('mouseWheel',p.x,p.y,{deltaX:0,deltaY:-100});
      await sleep(350);check((await view()).cam.z>z,label+' real '+(mobile?'pinch':'wheel')+' zoom');
      await ev('GV.setZoom(1);GV.lookAt('+target[0]+','+target[1]+');true');await sleep(400);
      const point=await ev('__s603.point('+target[0]+','+target[1]+')');check(await ev('document.elementFromPoint('+point.x+','+point.y+').id==="game"'),label+' inspect point unobstructed');
      report.inspectDiagnostics=report.inspectDiagnostics||{};
      const diagnostic=report.inspectDiagnostics[label]={point,target:target.slice(),viewBefore:await view(),targetBefore:await ev('GV.tile('+target[0]+','+target[1]+')'),hitBefore:await ev('__s603.pointTile('+point.x+','+point.y+')'),pointerBefore:await ev('__s603.pointerState()')};
      await ev('__s603.clearInputEvents();true');await tap(point.x,point.y,mobile);
      let v=await view();Object.assign(diagnostic,{viewAfter:v,targetAfter:await ev('GV.tile('+target[0]+','+target[1]+')'),pointerAfter:await ev('__s603.pointerState()'),events:await ev('__s603.inputEvents()')});
      await shot(label+'-inspect-attempt');
      check(v.info==='block'&&v.selected&&v.selected.x===target[0]&&v.selected.y===target[1],label+' real canvas inspect correct root');await shot(label+'-inspect');await click(el('infoX'),mobile);v=await view();check(v.info==='none'&&v.selected===null,label+' inspect close clears selection');
      check(state===await ev('__s603.scene()'),label+' navigation city state unchanged');
      if(mobile){
        const category=await ev('__s603.toolCategoryLabel("dogpark")');
        await click('[...document.querySelectorAll("#toolcats button")].find(b=>b.textContent==='+JSON.stringify(category)+')',true);
        await click('document.querySelector("[data-tid=dogpark]")',true);check((await view()).tool==='dogpark',label+' real touch selected community dog park tool');
        const site=await ev('__s603.freeGardenSite()');check(site&&site.n===2,label+' genuine canPlace empty dog park site found');
        await ev('GV.setRot(0);GV.setZoom(1);GV.lookAt('+site.x+','+site.y+');true');await sleep(400);
        const point=await ev('__s603.point('+site.x+','+site.y+')'),beforeRoots=await ev('__s603.roots()'),before=await ev('__s603.economy()');
        report.mobileConstruction={site,point,before,beforeRootCount:beforeRoots.rows.length};
        check(await ev('document.elementFromPoint('+point.x+','+point.y+').id==="game"'),label+' new dog park tap hits actual canvas');
        await ev('__s603.clearInputEvents();true');await tap(point.x,point.y,true);
        const root=await ev('GV.tile('+site.x+','+site.y+').bld'),after=await ev('__s603.economy()'),afterRoots=await ev('__s603.roots()'),footprint=await ev('__s603.footprint('+[site.x,site.y,site.n]+')');
        Object.assign(report.mobileConstruction,{root,after,afterRootCount:afterRoots.rows.length,footprint,events:await ev('__s603.inputEvents()')});
        await shot(label+'-new-garden-attempt');
        check(root&&root.k===92&&!root.ref&&root.sz===site.n&&root.lot574===site.n,label+' real touch built new dog park root');
        check(footprint.length===site.n*site.n&&footprint.every((f,i)=>f[2]===92&&(i===0?f[3]===null&&f[4]===site.n&&f[5]===site.n:JSON.stringify(f[3])===JSON.stringify([site.x,site.y]))),label+' real touch dog park complete root/ref footprint');
        check(afterRoots.rows.length===beforeRoots.rows.length+1&&!afterRoots.bad&&JSON.stringify(afterRoots.rows.filter(r=>r[0]!==site.y*72+site.x))===JSON.stringify(beforeRoots.rows),label+' touch adds exactly one dog park and preserves existing roots');
        check(Number.isFinite(site.cost)&&Math.abs(before.money-after.money-site.cost)<1e-7&&(site.diff!==3||site.cost===0),label+' true placement cost or free sandbox contract');
        built={x:site.x,y:site.y,n:site.n,footprint};
        await click('document.querySelector("[data-tid=pan]")',true);check((await view()).tool==='pan',label+' touch returns to pan after building');
      }
      await click(el('bSave'),mobile);await click(slotButton('存到此'),mobile);check((await view()).slot===3,label+' saved only slot3');const saved=await ev('__s603.saved()'),roots=await ev('__s603.roots()');
      await click(slotButton('讀取'),mobile);await ev('GV.setSpeed(0);GV.save();true');check(JSON.stringify(roots)===JSON.stringify(await ev('__s603.roots()')),label+' UI load roots preserved');check(saved===await ev('__s603.saved()'),label+' UI load save preserved');if(built)check(JSON.stringify(built.footprint)===JSON.stringify(await ev('__s603.footprint('+[built.x,built.y,built.n]+')')),label+' new touch-built dog park survives UI save/load');
      const previousTimeOrigin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(previousTimeOrigin);check(await ev('localStorage.getItem("glimmerville.v1.slot")==="3"'),label+' reload slot3');await click(el('bContinue'),mobile);await ev('GV.setSpeed(0);GV.ai(false);GV.save();true');
      check(JSON.stringify(roots)===JSON.stringify(await ev('__s603.roots()')),label+' full reload roots preserved');check(saved===await ev('__s603.saved()'),label+' full reload save preserved');if(built)check(JSON.stringify(built.footprint)===JSON.stringify(await ev('__s603.footprint('+[built.x,built.y,built.n]+')')),label+' new touch-built dog park survives full reload');check(await ev('!localStorage.getItem("glimmerville.v1.s1")&&!localStorage.getItem("glimmerville.v1.s2")'),label+' slots1/2 untouched');await shot(label+'-after-reload');return {roots:roots.rows.length,saveSHA256:hash(saved),postReloadStats:await ev('GV.stats()'),postReloadNote:'Existing load path does not recompute population/jobs until a simulation tick; reload screenshots preserve this behavior.'};
    };
    const verifyMobileZoomLanes=async()=>{
      report.mobileZoomWidths=[];
      const category=await ev('__s603.toolCategoryLabel("dogpark")');
      for(const width of [320,360,390,420]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(350);
        await click('[...document.querySelectorAll("#toolcats button")].find(b=>b.textContent==='+JSON.stringify(category)+')',true);
        if(await ev('document.body.classList.contains("toolsExp")'))await click(el('toolsExp'),true);
        for(const state of ['collapsed','expanded','recollapsed']){
          if(state!=='collapsed')await click(el('toolsExp'),true);
          await sleep(250);check(await ev('document.body.classList.contains("toolsExp")==='+JSON.stringify(state==='expanded')),'mobile '+width+' toolbar '+state+' through real touch');
          const geometry=await ev('(()=>{const rect=e=>e?e.getBoundingClientRect().toJSON():null;return {width:innerWidth,docWidth:document.documentElement.scrollWidth,expanded:document.body.classList.contains("toolsExp"),groups:{tools:rect(document.getElementById("tools")),toolcats:rect(document.getElementById("toolcats")),zoomer:rect(document.getElementById("zoomer"))},buttons:["zin","zout"].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);return {id,rect:r.toJSON(),center:{x,y},inViewport:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,reachable:top===e||e.contains(top),top:top?{id:top.id,className:String(top.className||""),outerHTML:top.outerHTML.slice(0,500),rect:rect(top)}:null};})};})()');
          report.mobileZoomWidths.push({width,state,...geometry});
          check(geometry.width===width&&geometry.docWidth<=width+1&&geometry.buttons.every(b=>b.inViewport&&b.reachable&&b.rect.width>0&&b.rect.height>0),'mobile '+width+'/'+state+' both zoom centers unobstructed');
          await ev('GV.setZoom(1);true');await click(el('zin'),true);await sleep(350);check((await view()).cam.z>1,'mobile '+width+'/'+state+' real touch zoom plus');await click(el('zout'),true);await sleep(350);check(Math.abs((await view()).cam.z-1)<.01,'mobile '+width+'/'+state+' real touch zoom minus');
          await shot('mobile'+width+'-zoom-'+state);
        }
      }
      check(report.mobileZoomWidths.length===12,'all 4 mobile widths and 3 toolbar states covered');
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(350);
      check(await ev('innerWidth===390&&!document.body.classList.contains("toolsExp")'),'390px collapsed viewport restored for stability');
    };
    report.browserVersion=await send('Browser.getVersion');report.graphicsLaunch='Original headless --disable-gpu configuration restored after default-graphics diagnostic; both modes failed the unchanged absolute RAF floor on software-only CI';
    try{const v=await fetch('http://127.0.0.1:'+DEV+'/json/version').then(r=>r.json());const bw=new WebSocket(v.webSocketDebuggerUrl);await new Promise((res,rej)=>{bw.onopen=res;bw.onerror=rej;});const info=await new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('GPU info timeout')),10000);bw.onmessage=e=>{const m=JSON.parse(e.data);if(m.id===1){clearTimeout(timer);m.error?rej(Error(JSON.stringify(m.error))):res(m.result);}};bw.send(JSON.stringify({id:1,method:'SystemInfo.getInfo'}));});report.gpuInfo=info.gpu;bw.close();}catch(e){report.gpuInfoError=String(e);}
    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
    await send('Emulation.setDeviceMetricsOverride',{width:1400,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'try{localStorage.setItem("glimmerville.v1.slot","3");localStorage.setItem("glimmerville.v1.snd","0");}catch(e){}'});
    await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready();
    check(await ev('localStorage.getItem("glimmerville.v1.slot")==="3"'),'slot3 set before game boot');
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600&&(await ev('__s603.rep()')).ok===1,'T603 enabled; T596/T600 effective previews off');
    // Baseline fixture is immutable v11.211, not the candidate pin file.
    const pinsOf=p=>p.pins||Object.fromEntries(Object.entries(p).filter(([k])=>k!=='__meta'));
    const baseline=pinsOf(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','sprite-pins-v11.211.json'),'utf8'))),candidate=pinsOf(JSON.parse(fs.readFileSync(path.join(ROOT,'docs/SPR_PINS.json'),'utf8'))),actual=await ev('__s603.pins()');
    report.pinDiff=Object.keys(baseline).filter(k=>JSON.stringify(baseline[k])!==JSON.stringify(actual[k]));report.newPins=Object.keys(actual).filter(k=>!(k in baseline));report.candidatePinDiff=[...new Set([...Object.keys(candidate),...Object.keys(actual)])].filter(k=>JSON.stringify(candidate[k])!==JSON.stringify(actual[k]));
    fs.writeFileSync(path.join(OUT,'sprite-pins.json'),JSON.stringify(actual));
    check(Object.keys(baseline).length===1586,'immutable baseline has 1586 keys');check(!report.pinDiff.length,'approved 1586 keys unchanged: '+JSON.stringify(report.pinDiff));check(report.newPins.length===0,'no legacy SPR keys added or replaced');check(!report.candidatePinDiff.length,'candidate pins match Chromium: '+JSON.stringify(report.candidatePinDiff));
    // Independent second boot, same Chrome: the new pixels must be reproducible.
    const previousTimeOrigin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(previousTimeOrigin);const repeated=await ev('__s603.pins()');
    check(JSON.stringify(actual)===JSON.stringify(repeated),'two independent Chrome boots have identical complete sprite pins');
    // Compare actual game canvas bytes against a separate exact-base source page.
    const compareFrames=async label=>{const rows=await ev('(()=>{window.__noT603=true;__s603.comparisonRig();const out=[];for(let r=0;r<4;r++)for(const se of[0,3])for(const t of[55,100])out.push({key:r+"/"+se+"/"+t,...__s603.comparisonFrame(r,se,t)});return out;})()'),out={};report.comparisonDiagnostics=report.comparisonDiagnostics||{};report.comparisonDiagnostics[label]=rows.map(({png,...r})=>r);for(const r of rows){out[r.key]=r.hash;const file='T603-'+label+'-canvas-'+r.key.replaceAll('/','-')+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(r.png.split(',')[1],'base64'));report.screenshots.push(file);}return out;};
    const escapeFrames=await compareFrames('escape');const beforeBase=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/baseline603.html'});await ready(beforeBase);const baseIdentity=await ev('__s603.documentIdentity()');check(baseIdentity.version==='11.211'&&baseIdentity.civicFactory==='undefined'&&baseIdentity.url==='/baseline603.html','actual baseline document identity excludes service-worker candidate fallback');report.baseDocumentIdentity=baseIdentity;const baseFrames=await compareFrames('base');report.escapeFrameComparison={base:baseFrames,escape:escapeFrames};check(JSON.stringify(baseFrames)===JSON.stringify(escapeFrames),'all 16 actual escape-valve canvas frames equal exact-main source');
    const beforeCandidate=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready(beforeCandidate);check(await ev('__s603.flags().T603&&__s603.documentIdentity().version==="11.212"&&__s603.documentIdentity().civicFactory==="function"'),'candidate identity and enabled state restored after exact-base comparison');
    report.pixelCases=[];for(const [name,night,winter]of[['day',false,false],['night',true,false],['winter',false,true]]){await ev('GV.setSeason('+(winter?3:1)+');true');const rows=await ev('__s603.sheet("variants",'+night+','+winter+')');for(const r of rows)check(r.ink>400&&r.light>0&&!r.orphan&&!r.cropped,'Chrome pixels '+name+'/'+r.k+'/'+r.v);report.pixelCases.push(...rows.map(r=>({...r,mode:name})));await shot('sheet-'+name);}
    await ev('document.getElementById("sheet603").remove();true');
    // Browser old-save roundtrip for all three pre-change seeded cities.
    const fixtures=path.join(__dirname,'fixtures'),manifest=JSON.parse(fs.readFileSync(path.join(fixtures,'manifest.json'),'utf8'));report.oldSaves=[];
    await ev('document.getElementById("bNewGame").click();GV.setSpeed(0);true');
    const loadRaw=async raw=>ev('localStorage.setItem("glimmerville.v1.s3",'+JSON.stringify(raw)+');if(!GV.load())throw Error("Save load failed");GV.setSpeed(0);GV.ai(false);true');
    for(const f of manifest.cities){const raw=fs.readFileSync(path.join(fixtures,f.file),'utf8');check(hash(raw)===f.saveSHA256,'fixture SHA '+f.seed);await loadRaw(raw);const roots=await ev('__s603.roots()'),saved=await ev('__s603.saved()');check(!roots.bad&&roots.rows.length===f.roots&&hash(JSON.stringify(roots.rows))===f.rootSHA256,'Chrome old-save root/ref '+f.seed);await ev('GV.save();true');check(saved===await ev('__s603.saved()'),'Chrome old-save fields '+f.seed);await ev('if(!GV.load())throw Error("Second load failed");GV.setSpeed(0);true');check(JSON.stringify(roots)===JSON.stringify(await ev('__s603.roots()')),'Chrome old-save roundtrip '+f.seed);await ev('GV.save();true');check(saved===await ev('__s603.saved()'),'Chrome old-save second-load fields '+f.seed);report.oldSaves.push({seed:f.seed,roots:roots.rows.length,rootSHA256:hash(JSON.stringify(roots.rows))});}
    const cityFixture=manifest.cities.find(f=>f.seed===22),cityRaw=fs.readFileSync(path.join(fixtures,cityFixture.file),'utf8'),expectedCitySave=await ev('__s603.sourceSaved('+JSON.stringify(cityRaw)+')');
    const growCity=async label=>{const stats=await ev('__s603.grow22()'),roots=await ev('__s603.roots()'),rootSHA256=hash(JSON.stringify(roots.rows));await ev('GV.save();true');const saved=await ev('__s603.saved()'),expected=JSON.parse(expectedCitySave),actual=JSON.parse(saved),changedFields=Object.keys(expected).filter(k=>JSON.stringify(expected[k])!==JSON.stringify(actual[k]));report.grownCities=report.grownCities||{};report.grownCities[label]={stats,roots:roots.rows.length,rootSHA256,changedFields};check(!roots.bad&&roots.rows.length===cityFixture.roots&&rootSHA256===cityFixture.rootSHA256,'grown city exact roots '+label);check(stats.pop===cityFixture.stats.pop&&stats.day===cityFixture.day,'grown city genuine derived population/day '+label);check(!changedFields.length,'grown city canonical save matches fixture '+label+': '+JSON.stringify(changedFields));await sleep(450);return stats;};
    report.cityStats=await growCity('desktop-before');report.census={};
    for(const k of[29,85,92,88]){report.census[k]=await ev('__s603.census('+k+')');check(report.census[k].length>0,'mature city contains k'+k);}
    if(PHASE==='full'||PHASE==='core'){
    report.desktop=await testUI('desktop',false,report.census[85][0]);
    await growCity('mobile-before');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await sleep(500);
    report.mobileStartLayout=await ev('(()=>{const describe=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:e.id,tid:e.dataset&&e.dataset.tid,className:String(e.className||""),text:e.textContent.slice(0,100),rect:r.toJSON(),zIndex:s.zIndex,position:s.position,pointerEvents:s.pointerEvents,centerHit:top?{id:top.id,className:String(top.className||""),tag:top.tagName}:null};};return {width:innerWidth,height:innerHeight,docWidth:document.documentElement.scrollWidth,scrollX,scrollY,visualViewport:visualViewport?{width:visualViewport.width,height:visualViewport.height,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop,scale:visualViewport.scale}:null,groups:["hud","toolcats","tools","zoomer","mini","hint","info","start","boot426"].map(id=>document.getElementById(id)).filter(Boolean).map(describe),buttons:[...document.querySelectorAll("button")].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height;}).map(describe)};})()');
    report.mobile=await testUI('mobile390',true,report.census[85][0]);const layout=await ev('({width:innerWidth,docWidth:document.documentElement.scrollWidth,canvas:document.getElementById("game").getBoundingClientRect().toJSON()})');report.mobile.layout=layout;check(layout.width===390&&layout.docWidth<=391&&layout.canvas.width>=389,'390px mobile has no horizontal document overflow');
    await verifyMobileZoomLanes();
    await ev('GV.setSpeed(0);GV.setRot(0);GV.setZoom(.7);true');
    report.mobilePerformance={};report.mobilePerformancePhaseContract='Same camera, steady visual phase; all real advance/update calls retained.';
    for(const [phase,time]of [['day',55],['night',100]]){
      const pair=report.mobilePerformance[phase]={};
      for(const off of [true,false]){const mode=off?'baseline':'candidate',initial=await ev('(()=>{window.__noT603='+off+';const light=__s603.freezeVis('+time+');__s603.clear();const first=__s603.drawMs();return {light,first,before:__s603.cacheStats()};})()'),{light,first,before}=initial,warm=[];for(let i=0;i<10;i++)warm.push(await ev('__s603.drawMs()'));const after=await ev('__s603.cacheStats()'),frames=await raf(5000),last=await ev('__s603.cacheStats()');pair[mode]={light,first,warm,warmP95:pct(warm,.95),before,after,last,warmBakeDelta:after.bakes-before.bakes,rafBakeDelta:last.bakes-after.bakes,raf:frames};}
      perfCheck(pair.candidate.warmP95<=pair.baseline.warmP95*1.5+5,'mobile '+phase+' same-light warm draw relative budget');
      perfCheck(pair.candidate.raf.p95<=pair.baseline.raf.p95*1.5+5&&pair.candidate.raf.frames>=Math.max(5,pair.baseline.raf.frames/2),'mobile '+phase+' same-light RAF relative budget');
    }
    await ev('window.__noT603=false;__s603.freezeVis(55);true');report.stabilityPhase='steady daylight55; same existing600-frame/5-second-gap gate';const stableState=await ev('__s603.scene()');report.stability=await raf(60000);check(report.stability.elapsed>=60000&&report.stability.frames>=600&&report.stability.max<5000,'one-minute visible RAF stability and liveness');check(stableState===await ev('__s603.scene()'),'one-minute paused city unchanged');
    await ev('__s603.freezeVis(null);true');
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});await send('Emulation.setDeviceMetricsOverride',{width:1400,height:900,deviceScaleFactor:1,mobile:false});await sleep(500);
    const beforePerfDocument=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(beforePerfDocument);await ev('document.getElementById("bNewGame").click();true');await growCity('fresh-desktop-performance');
    const performanceOriginalDay=(await view()).day;report.performance={};report.desktopPerformancePhaseContract='Fresh desktop document, same seed/camera/light, full real advance/draw/HUD; measured before exhaustive PNG capture.';report.performanceLimits={coldRatio:2,coldAddMs:250,warmP95Ratio:1.5,warmAddMs:5,rafP95Ratio:1.5,rafAddMs:5};
    const focus=report.census[85][0];for(const [phase,time]of [['day',55],['night',100]]){
      const pair=report.performance[phase]={};
      for(const off of[true,false]){const mode=off?'baseline':'candidate';await ev('window.__noT603='+off+';true');await camera(focus[0]+1,focus[1]+1,1,0,1,time,false);const first=await ev('(()=>{__s603.clear();const cold=__s603.drawMs();return {cold,cache:__s603.cacheStats()};})()'),cold=first.cold,warm=[];for(let i=0;i<30;i++)warm.push(await ev('__s603.drawMs()'));await ev('__s603.perfStart()');const frames=await raf(5000),work=await ev('__s603.perfWork()');pair[mode]={cold,firstCache:first.cache,warm,warmP95:pct(warm,.95),raf:frames,...work};}
      const b=pair.baseline,c=pair.candidate;if(!(c.raf.p95<=b.raf.p95*1.5+5&&c.raf.frames>=(phase==='day'?50:Math.max(5,b.raf.frames/2)))){ // 量測結束才加配對trace，原門檻與冷暖/RAF樣本完全不受儀器插入影響。
        pair.failureTraces={};const sceneBeforeTrace=await ev('__s603.scene()');
        for(const off of [true,false]){const mode=off?'baseline':'candidate';await ev('window.__noT603='+off+';true');await camera(focus[0]+1,focus[1]+1,1,0,1,time,false);for(let i=0;i<30;i++)await ev('__s603.drawMs()');const before=await ev('({view:__s603.view(),flags:__s603.flags(),light:__s603.freezeVis('+time+'),cache:__s603.cacheStats()})');pair.failureTraces[mode]={...await traceFrameWork603('desktop-'+phase+'-'+mode),before,after:await ev('({view:__s603.view(),flags:__s603.flags(),cache:__s603.cacheStats()})')};check(sceneBeforeTrace===await ev('__s603.scene()'),'paired '+phase+' '+mode+' compositor trace leaves frozen city unchanged');}
        pair.failureTrace=pair.failureTraces.candidate;persist();
      }perfCheck(c.cold<=b.cold*2+250,'desktop '+phase+' cold draw relative budget');perfCheck(c.warmP95<=b.warmP95*1.5+5,'desktop '+phase+' warm draw p95 relative budget');perfCheck(c.raf.p95<=b.raf.p95*1.5+5&&c.raf.frames>=(phase==='day'?50:Math.max(5,b.raf.frames/2)),'desktop '+phase+' foreground headless RAF relative budget');
    }
    await ev('window.__noT603=false;true');
    await ev('GV.setDay('+performanceOriginalDay+');true');
    report.coverage.core=true;persist();}
    const fresh=async()=>ev('GV.newWorldSeeded(603);GV.setDiff(3);GV.setSpeed(0);GV.ai(false);__s603.clearMap();true');
    const place=async(tool,x,y,n)=>{await ev('__s603.prepare('+[x,y,n]+');true');check(await ev('GV.place('+JSON.stringify(tool)+','+x+','+y+')'),'real placement '+tool+' at '+x+','+y);};
    if(PHASE==='full'||PHASE==='world'){
    await growCity('world-art-matrix');
    const state=await ev('__s603.scene()'),originalDay=(await view()).day;
    for(const k of[29,85,92,88]){const c=report.census[k][0];await camera(c[0]+c[2]/2,c[1]+c[2]/2,k===53?1.1:2,0,1,55,false);for(const off of[true,false]){await ev('window.__noT603='+off+';true');await shot('city-k'+k+(off?'-before':'-after'));}}
    // Full product of 4 kinds, 4 seasons, 2 lights, 4 rotations, 2 distances.
    report.matrix=[];await ev('window.__noT603=false;true');
    for(const k of[29,85,92,88])for(let rot=0;rot<4;rot++)for(let season=0;season<4;season++)for(const [light,time]of[['day',55],['night',100]])for(const [distance,zoom]of[['near',k===53?1.1:2],['far',.35]]){const c=report.census[k][0];await camera(c[0]+c[2]/2,c[1]+c[2]/2,zoom,rot,season,time,season===3);const clip=await ev('__s603.clipPixelPair()');report.matrix.push({k,rot,season,light,distance,clip});check(clip.changedPixels===0&&clip.unstablePixels===0&&clip.optimizedUnstablePixels===0&&clip.fractionalUses===0&&clip.fractionalScaleUses===0,'native X clip exact full-frame pixels k'+k+'/r'+rot+'/s'+season+'/'+light+'/'+distance);await shot('city-k'+k+'-r'+rot+'-s'+season+'-'+light+'-'+distance);persist();}
    check(report.matrix.length===256,'all 256 same-city season/light/rotation/distance scenes');
    report.clipZoomMatrix=[];const clipFocus=report.census[85][0];
    for(let rot=0;rot<4;rot++)for(const zoom of[.65,1,1.25,3])for(const [light,time]of[['day',55],['night',100]]){await camera(clipFocus[0]+1,clipFocus[1]+1,zoom,rot,1,time,false);const actualCamera=await ev('__s603.offsetCamera(.375,.625)');check(actualCamera.x-Math.floor(actualCamera.x)===.375&&actualCamera.y-Math.floor(actualCamera.y)===.625,'actual fractional camera offsets r'+rot+'/z'+zoom+'/'+light);const clip=await ev('__s603.clipPixelPair()');report.clipZoomMatrix.push({rot,zoom,light,actualCamera,clip});check(clip.changedPixels===0&&clip.unstablePixels===0&&clip.optimizedUnstablePixels===0&&clip.fractionalUses===0&&clip.fractionalScaleUses===0,'native X clip fractional camera/zoom full-frame pixels r'+rot+'/z'+zoom+'/'+light);persist();}
    check(report.clipZoomMatrix.length===32&&report.clipZoomMatrix.some(r=>r.clip.calls>0),'32 actual fractional-camera cases verify conservative fallback pixels');
    check(report.clipZoomMatrix.some(r=>r.clip.fractionalCalls>0)&&report.clipZoomMatrix.every(r=>r.clip.fractionalUses===0),'actual noninteger device bounds always take original native path');
    check(report.clipZoomMatrix.some(r=>r.clip.fractionalScaleCalls>0)&&report.clipZoomMatrix.every(r=>r.clip.fractionalScaleUses===0),'actual fractional source scale always keeps native sampling');
    check(report.matrix.some(r=>r.clip.reflectionUses>0)&&report.matrix.some(r=>r.clip.shadowUses>0),'aligned world matrix exercises native reflection and shadow sites');
    report.clipMobileMatrix=[];
    try{for(const dpr of[1,2]){await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:dpr,mobile:true});await sleep(350);for(let rot=0;rot<4;rot++)for(const [light,time]of[['day',55],['night',100]]){await camera(clipFocus[0]+1,clipFocus[1]+1,1.25,rot,1,time,false);const actualCamera=await ev('__s603.offsetCamera(.375,.625)'),clip=await ev('__s603.clipPixelPair()');report.clipMobileMatrix.push({dpr,rot,light,actualCamera,clip});check(clip.cssWidth===390&&clip.cssHeight===844&&clip.dpr===dpr&&clip.width===390*dpr&&clip.height===844*dpr&&clip.cam.x-Math.floor(clip.cam.x)===.375&&clip.cam.y-Math.floor(clip.cam.y)===.625&&clip.changedPixels===0&&clip.unstablePixels===0&&clip.optimizedUnstablePixels===0&&clip.fractionalUses===0&&clip.fractionalScaleUses===0,'native X clip actual mobile/DPR full-frame pixels dpr'+dpr+'/r'+rot+'/'+light);persist();}}
    check(report.clipMobileMatrix.length===16&&report.clipMobileMatrix.some(r=>r.clip.calls>0),'16 actual fractional-camera mobile cases verify conservative fallback pixels');
    report.clipMobileAligned=[];for(const dpr of[1,2]){await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:dpr,mobile:true});await sleep(350);for(const [light,time]of[['day',55],['night',100]]){await camera(clipFocus[0]+1,clipFocus[1]+1,1,0,1,time,false);const clip=await ev('__s603.clipPixelPair()');report.clipMobileAligned.push({dpr,light,clip});check(clip.cssWidth===390&&clip.cssHeight===844&&clip.dpr===dpr&&clip.width===390*dpr&&clip.height===844*dpr&&clip.changedPixels===0&&clip.unstablePixels===0&&clip.optimizedUnstablePixels===0&&clip.fractionalUses===0&&clip.fractionalScaleUses===0,'native X clip aligned mobile/DPR full-frame pixels dpr'+dpr+'/'+light);persist();}}
    check(report.clipMobileAligned.length===4&&report.clipMobileAligned.some(r=>r.clip.reflectionUses>0)&&report.clipMobileAligned.some(r=>r.clip.shadowUses>0),'aligned mobile views exercise both native filter sites');
    }finally{await send('Emulation.setDeviceMetricsOverride',{width:1400,height:900,deviceScaleFactor:1,mobile:false});await sleep(350);}

    await camera(clipFocus[0]+1,clipFocus[1]+1,1,0,1,55,false);report.clipNegativeControl=await ev('__s603.clipPixelPair(true)');const badClip=report.clipNegativeControl;check(badClip.used>0&&badClip.changedPixels>0&&badClip.unstablePixels===0&&badClip.optimizedUnstablePixels===0,'negative control: wrong X edge produces detected final pixel loss');
    report.clipPositiveControl=await ev('__s603.clipPixelPair()');check(report.clipPositiveControl.changedPixels===0&&report.clipPositiveControl.used>0,'positive control restored exact native clip pixels after mutation');

    // setSeason is a simulation test API and writes day. Restore explicitly.
    await ev('GV.setDay('+originalDay+');true');report.visualStateUnchanged=state===await ev('__s603.scene()');check(report.visualStateUnchanged,'visual-only city data unchanged after restoring test calendar');
    // Disposable fixtures use genuine placement. All four civic footprints are unchanged.
    await fresh();report.row=[];
    for(const [k,tool,n,y]of[[29,'recycling',2,8],[85,'seniorCenter',2,20],[92,'dogpark',2,32],[88,'compost',2,44]]){let x=5;const seen=new Set();for(let want=0;want<3;want++){
      if(k===29){while(x<66&&seen.size<3){await place(tool,x,y,n);const v=await ev('__s603.v('+[k,x,y]+')');if(!seen.has(v)){report.row.push({k,v,n,x,y});seen.add(v);}x+=n+2;}break;}
      while(x<60&&(await ev('__s603.v('+[k,x,y]+')'))!==want)x++;check(x+n<68,'variant root within map');await place(tool,x,y,n);report.row.push({k,v:want,n,x,y});x+=n+3;
    }}
    await ev('__s603.finish();true');check(report.row.length===12,'all twelve real-placement variants');
    for(const r of report.row)for(const stage of(r.k===53?[0,1,2,3]:[2])){await camera(r.x+r.n/2,r.y+r.n/2,r.k===53?1.2:2.5,0,1,55,false);if(r.k===53)await ev('__s603.stage('+[r.x,r.y,stage]+')');const trace=await ev('__s603.trace()');check(trace.some(t=>new RegExp('^(far:)?'+r.k+'_'+r.v+'_'+stage+'_').test(t.key)),'world route k'+r.k+'/v'+r.v+'/stage'+stage);await shot('world-k'+r.k+'-v'+r.v+'-stage'+stage);}
    await fresh();report.construction=[];
    for(const [k,tool,n,y]of[[29,'recycling',2,8],[85,'seniorCenter',2,20],[92,'dogpark',2,32],[88,'compost',2,44]])for(let age=4;age<=8;age++){const x=5+(age-4)*(n+2);await place(tool,x,y,n);await ev('__s603.age('+[x,y,age]+');true');report.construction.push({k,n,x,y,age});}
    check(report.construction.length===20&&new Set(report.construction.map(r=>r.k+'/'+r.age)).size===20,'all 20 construction roots placed');
    for(const r of report.construction){const b=await ev('GV.tile('+[r.x,r.y]+').bld');check(b.k===r.k&&b.age===r.age&&b.lot574===r.n,'construction root data '+r.k+'/'+r.age);await camera(r.x+r.n/2,r.y+r.n/2,r.k===53?1.15:2.5,0,1,55,false);await shot('construction-k'+r.k+'-age'+r.age);}
    report.coverage.world=true;persist();}
    if(PHASE==='full'||PHASE==='neighbors'){
    // Presence + renderer assertions, with 128 screenshots for manual occlusion QA.
    // These screenshots do not by themselves prove correct depth ordering.
    report.occlusion=[];
    for(const [k,tool,n]of[[29,'recycling',2],[85,'seniorCenter',2],[92,'dogpark',2],[88,'compost',2]])for(const neighbor of['residential','hospital591','guesthouse601','tree']){await fresh();await place(tool,25,25,n);await ev('__s603.finish();true');check(await ev('__s603.neighbor('+JSON.stringify(neighbor)+','+(25+n)+','+(24+n)+')'),'occlusion neighbor present '+neighbor);for(let rot=0;rot<4;rot++)for(const [light,time]of[['day',55],['night',100]]){await camera(25+n*.7,25+n*.7,k===53?1.3:3,rot,1,time,false);const trace=await ev('__s603.trace()');check(trace.some(t=>new RegExp('^(far:)?'+k+'_').test(t.key)),'occlusion target drawn '+k+'/'+neighbor+'/'+rot+'/'+light);await shot('occlusion-k'+k+'-'+neighbor+'-r'+rot+'-'+light);report.occlusion.push({k,neighbor,rot,light});}}
    check(report.occlusion.length===128,'all 128 adjacent-occlusion evidence scenes');

    // Shore pads remain on land. Existing 2x2 reflection policy is null, unchanged.
    report.shore=[];for(const [k,tool]of[[29,'recycling'],[85,'seniorCenter'],[92,'dogpark'],[88,'compost']]){await fresh();await place(tool,25,25,2);await ev('__s603.finish();true');check(await ev('__s603.makeShore(25,25,2)'),'real water beside k'+k);for(let rot=0;rot<4;rot++)for(const [light,time]of[['day',55],['night',100]]){await camera(26,26,3,rot,1,time,false);check(await ev('__s603.reflectionNull(25,25)'),'existing no-reflection contract k'+k+'/r'+rot+'/'+light);check(await ev('__s603.trace().some(t=>new RegExp("^(far:)?'+k+'_").test(t.key))'),'shore rendering retains complete lot k'+k);report.shore.push({k,rot,light});await shot('shore-k'+k+'-r'+rot+'-'+light);}}check(report.shore.length===32,'all 32 four-view day/night shoreline scenes');

    // 三款 × 列偏置臨界點前/中/後 × 四視角 × 八相位，驗最終像素而不是呼叫數。
    report.dogActors=[];
    for(const row of [9,16,25])for(let variant=0;variant<3;variant++){
      await fresh();let x=5;while(x<65&&(await ev('__s603.v(92,'+x+','+row+')'))!==variant)x++;check(x<65,'real dog variant site exists');await place('dogpark',x,row,2);await ev('__s603.finish();true');
      for(let rot=0;rot<4;rot++)for(let phase=0;phase<8;phase++){
        const time=52+phase*.375;await camera(x+1,row+1,4,rot,1,time,false);
        if(row===25&&variant===0&&rot===0&&phase===0){report.dogDepthNegativeControl=await ev('(()=>{__s603.badLifeDepth(true);try{return __s603.actors();}finally{__s603.badLifeDepth(false);}})()');const bad=report.dogDepthNegativeControl;check(bad.dogs>=1&&bad.owners===1&&bad.unstablePixels===0&&bad.dogVisiblePixels===0&&bad.ownerVisiblePixels===0,'negative control: old depth still calls actors but hides final pixels');}
        const actors=await ev('__s603.actors()');check(actors.dogs>=1&&actors.dogs<=2&&actors.owners===1&&actors.unstablePixels===0&&actors.dogVisiblePixels>0&&actors.ownerVisiblePixels>0&&actors.rects.every(r=>r.visiblePixels>0),'real visible dog/owner pixels y'+row+'/v'+variant+'/r'+rot+'/p'+phase);report.dogActors.push({row,variant,rot,phase,time,...actors});await shot('dog-clearance-v'+variant+'-y'+row+'-r'+rot+'-phase'+phase);
      }
    }
    check(report.dogActors.length===288,'all 288 dog-park row/variant/rotation/animation scenes');
    for(const row of [9,16,25])for(let v=0;v<3;v++)check(new Set(report.dogActors.filter(r=>r.row===row&&r.variant===v).flatMap(r=>r.dogFrames)).size===2,'both real dog animation frames covered y'+row+'/v'+v);

    report.coverage.neighbors=true;persist();}
    if(PHASE==='full'||PHASE==='raster'){
      report.rasterDiagnostic={note:'Focused filter-origin follow-up with native-filter control; all previous negative experiments are retained in exact-SHA artifacts. Original acceptance predicates remain unchanged in core.',samples:[],blendProbe:await ev('__s603.blendProbe()')};
      for(const [light,time] of [['day',55],['night',100]])for(const off of [true,false]){
        const prev=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(prev);await ev('document.getElementById("bNewGame").click();true');await growCity('raster-'+light+'-'+off);await ev('window.__noT603='+off+';window.__noClip603=true;true');const focus=report.census[85][0];await camera(focus[0]+1,focus[1]+1,1,0,1,time,false);await ev('__s603.clear();__s603.drawMs();true');for(let i=0;i<30;i++)await ev('__s603.drawMs()');
        const sceneBefore=await ev('__s603.scene()');
        for(const kind of ['observe','clipped-native','clipped-x','clipped-origin']){const audit=await ev('__s603.rasterAudit('+JSON.stringify(kind)+')');for(const side of ['before','after']){if(audit[side+'PNG']){const file='T603-raster-'+light+'-'+(off?'baseline':'candidate')+'-'+kind+'-'+side+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(audit[side+'PNG'].split(',')[1],'base64'));report.screenshots.push(file);audit[side+'File']=file;}delete audit[side+'PNG'];}check(audit.unstablePixels===0,'raster comparison frame stable '+light+'/'+off+'/'+kind);await ev('__s603.perfStart()');const timing=await raf(5000),work=await ev('__s603.perfWork()');report.rasterDiagnostic.samples.push({light,mode:off?'baseline':'candidate',...audit,raf:timing,...work,silhouetteAfter:await ev('__s603.silhouetteStats()'),projectedAfter:await ev('__s603.projectedStats()'),clipAfter:await ev('__s603.clipStats()')});persist();}
        check(sceneBefore===await ev('__s603.scene()'),'raster diagnostic leaves city unchanged '+light+'/'+off);
      }
      report.rasterDiagnostic.acceptance='Observations only, not a waiver or replacement for any original predicate';await ev('window.__noT603=false;delete window.__noClip603;true');report.coverage.raster=true;persist();
    }
    check(PHASE==='full'?Object.values(report.coverage).every(Boolean):report.coverage[PHASE]===true,'requested phase coverage complete: '+PHASE);
    check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '+report.performanceFailures.join('; '));
    report.finalFlags=await ev('__s603.flags()');check(report.finalFlags.T603&&!report.finalFlags.T596&&!report.finalFlags.T600,'final preview flags preserved');report.errLog=await ev('(window.__errLog||[]).slice(-20)');check(!errors.length&&!consoleErrors.length&&!report.errLog.length,'zero runtime/console/app errors');report.status='passed';exitCode=0;
  }catch(e){report.status='failed';report.error=e.stack;console.error('SCENE603 FAILED: '+e.stack);try{if(captureFailure)await captureFailure();else report.failureScreenshotError='Browser/CDP did not become available';}catch(captureError){report.failureScreenshotError=String(captureError&&captureError.stack||captureError);}}
  finally{report.exceptions=errors;report.consoleErrors=consoleErrors;persist();console.log('SCENE603 '+JSON.stringify({status:report.status,checks:report.checks.length,screenshots:report.screenshots.length,error:report.error}));try{ws?.close();}catch{}try{browser?.kill();}catch{}try{server?.close();}catch{}setTimeout(()=>{try{fs.rmSync(DIR,{recursive:true,force:true});}catch{}process.exit(exitCode);},1000);}
})();
