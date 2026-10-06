// T602 real Chromium evidence. Only a temporary repository copy and isolated slot 3.
// node scene602.js --port=8762 --out=/tmp/scene602 ; Node 22+, Chrome/Chromium.
// This is a fail-closed browser gate. Headless RAF is not physical-device FPS.
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),crypto=require('crypto');
const {spawn}=require('child_process');
const arg=(n,d)=>{const a=process.argv.find(x=>x.startsWith('--'+n+'='));return a?a.slice(n.length+3):d;};
const PORT=+arg('port',8762),DEV=PORT+1000,OUT=path.resolve(arg('out',path.join(os.tmpdir(),'scene602')));
if([PORT,DEV].some(p=>[8123,8199].includes(p)))throw Error('Player ports 8123/8199 prohibited');
const ROOT=path.resolve(__dirname,'../../..'),DIR=fs.mkdtempSync(path.join(os.tmpdir(),'scene602-'));
fs.mkdirSync(OUT,{recursive:true});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pct=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
const report={status:'running',baseSha:'bc2a064d387eab1320c63c338f54b79bacfa8bfc',checks:[],screenshots:[],headless:true,performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'};
const check=(v,m)=>{if(!v)throw Error(m);report.checks.push(m);};
const persist=()=>fs.writeFileSync(path.join(OUT,'scene602-summary.json'),JSON.stringify(report,null,2));
for(const f of fs.readdirSync(ROOT)){const p=path.join(ROOT,f);if(fs.statSync(p).isFile()&&/\.(html|js|json|webmanifest|png|svg|css)$/.test(f))fs.copyFileSync(p,path.join(DIR,f));}
// This function is string-injected inside the game's closure in the disposable copy.
function bridge602(){
  const inputEvents=[];
  const canonicalSaved=raw=>{const d=saveInflate(JSON.parse(raw)),out={};for(const k of ['v','n','seed','money','day','df','bl','lots574','ter','tre','rd','zn','gvc'])out[k]=d[k];return JSON.stringify(out);};
  const pointerSnapshot=()=>({pointers:[...pointers.entries()].map(([id,p])=>({id,...p})),down:downInfo?{...downInfo,elapsed:performance.now()-downInfo.t}:null,pan:panBase?{...panBase}:null,pinch:pinchBase?{...pinchBase}:null,selected:selTile?{...selTile}:null});
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel']){
    const record=(phase,e)=>{const tile=toTile(e.clientX,e.clientY);inputEvents.push({type,phase,time:performance.now(),eventTime:e.timeStamp,x:e.clientX,y:e.clientY,button:e.button,buttons:e.buttons,pointerId:e.pointerId,pointerType:e.pointerType,trusted:e.isTrusted,tile,state:pointerSnapshot()});if(inputEvents.length>96)inputEvents.shift();};
    cvs.addEventListener(type,e=>record('before',e),true);
    cvs.addEventListener(type,e=>record('after',e));
  }
  window.__s602={
    pointerState:pointerSnapshot,pointTile:toTile,inputEvents:()=>inputEvents.slice(),clearInputEvents:()=>{inputEvents.length=0;},
    flags:()=>({T602:t602On(),T596:t596On(),T600:t596On()&&!t600Off(),T600Escape:t600Off()}),
    bake:bakeArt602,rep:()=>window.__t602,v:v602,pier:pier602,
    clear:()=>{lotCache574.clear();lotHookCache574.clear();lotCachePixels574=0;},
    view:()=>({cam:{...cam},tool,speed,running,day,rot:viewRotEff(),season:season(),slot:curSlot(),selected:selTile,info:$('#info').style.display,visible:document.visibilityState}),
    scene:()=>JSON.stringify({day,money,pop,tiles}),
    point:(x,y)=>{const p=w2v(x,y);return {x:(W/2+((p[0]-p[1])*32-cam.x)*cam.z)/DPR,y:(H/2+((p[0]+p[1]+1)*16-cam.y)*cam.z)/DPR};},
    roots:()=>{const rows=[];let bad=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(!b||b.ref)continue;rows.push([idx(x,y),b.k,b.lv,b.v,b.sz||1,!!b.lot574]);if(b.sz>=2)for(let yy=0;yy<b.sz;yy++)for(let xx=0;xx<b.sz;xx++){if(!xx&&!yy)continue;const q=inMap(x+xx,y+yy)&&T(idx(x+xx,y+yy)).bld;if(!q||!q.ref||q.ref[0]!==x||q.ref[1]!==y)bad++;}}return {rows,bad};},
    census:k=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(b&&!b.ref&&b.k===k)out.push([x,y,b.sz||1]);}return out;},
    saved:()=>canonicalSaved(localStorage.getItem(slotKey(3))),sourceSaved:canonicalSaved,
    // One synchronous task prevents RAF vehicle feedback between deterministic ticks.
    grow22:()=>{GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let step=0;step<420;step++)GV.step(1);GV.ai(false);GV.setSpeed(0);updHud();return GV.stats();},
    snow:on=>{rainDays=on?SNOW_ACC_DAYS+3:0;},
    clearMap:()=>{for(const t of tiles){Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});}groundDirty=true;},
    prepare:(x,y,n)=>{for(let xx=x-1;xx<=x+n;xx++){const t=T(idx(xx,y-1));t.road=1;t.rc=1;t.bld=null;}RESOURCE[idx(x,y)]=1;money=1e9;},
    finish:()=>{for(const t of tiles)if(t.bld&&!t.bld.ref){t.bld.age=60;t.bld.pw=true;t.bld.wa=true;}},
    age:(x,y,a)=>{const b=T(idx(x,y)).bld;if(!b||b.ref)throw Error('Missing root');b.age=a;},
    stage:(x,y,want)=>{cityEvent=null;for(let d=101;d<117;d++)if(Math.floor(((d+Math.floor(streetHash(x,y,777)*16))%16)/4)===want){day=d;return want;}throw Error('No crop stage');},
    single:(k,x,y)=>{T(idx(x,y)).tree=0;T(idx(x,y)).bld={k,lv:1,v:0,age:60,pw:true,wa:true,h:.6};},
    neighbor:(kind,x,y)=>{const t=T(idx(x,y));if(t.bld)throw Error('Neighbor overlaps footprint');if(kind==='tree'){if(!GV.place('tree',x,y))throw Error('Tree placement failed');}else{__s602.single(kind==='residential'?1:kind==='hospital591'?12:81,x,y);if(kind==='residential')Object.assign(t.bld,{lv:3,v:1,den:3});}return !!(t.tree||t.bld);},
    shoreExpected:(x,y)=>{const p=w2v(x,y),wet=(a,b)=>{const q=v2w(p[0]+a,p[1]+b);return inMap(q[0],q[1])&&T(idx(q[0],q[1])).t===0;};const f=wet(1,0)||wet(0,1)||wet(1,1),l=wet(-1,0),r=wet(0,-1),c=wet(-1,-1);return {front:f,left:l,right:r,corner:c,want:f?-1:l&&r?2:l?0:r?1:c?2:-1};},
    shores:()=>{const water=(x,y)=>inMap(x,y)&&T(idx(x,y)).t===0,out={};for(let y=2;y<N-2;y++)for(let x=2;x<N-2;x++){const t=T(idx(x,y));if(t.t===0||t.bld||t.road||t.bridge||t.rail||t.tram)continue;const e=water(x+1,y),s=water(x,y+1),kind=e&&!s?'E':s&&!e?'S':e&&s?'ES':!water(x+1,y+1)&&(water(x-1,y)||water(x,y-1))?'back':null;if(kind&&!out[kind]&&!Object.values(out).some(p=>Math.abs(p[0]-x)+Math.abs(p[1]-y)<4))out[kind]=[x,y];}return out;},
    drawMs:()=>{const t=performance.now();GV.forceDraw();return performance.now()-t;},
    trace:()=>{const calls=[],old=ctx.drawImage;ctx.drawImage=function(img,...args){calls.push({img,args});return old.call(this,img,...args);};try{GV.forceDraw();}finally{ctx.drawImage=old;}const out=[];for(const c of calls)for(const [key,s]of lotCache574)if(c.img===s.img){out.push({key,args:c.args});break;}return out;},
    imageHash:c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0x811c9dc5;for(const b of a){h^=b;h=Math.imul(h,16777619)>>>0;}return h.toString(16);},
    pins:()=>{const tab=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;tab[n]=c;}const crc=c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let r=0xFFFFFFFF;for(const b of a)r=tab[(r^b)&255]^(r>>>8);return ((r^0xFFFFFFFF)>>>0).toString(16);},out={};for(const e of GV.sprAtlas356().entries){const p=[crc(e.img)];if(e.night)p.push(crc(e.night));if(e.nightCity)p.push(crc(e.nightCity));out[e.fam+'/'+e.key]=p;}return out;},
    sheet:(kind,night,winter)=>{const old=$('#sheet602');if(old)old.remove();const c=document.createElement('canvas');c.id='sheet602';c.width=1400;c.height=900;c.style='position:fixed;inset:0;z-index:999999;width:1400px;height:900px';document.body.append(c);const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle=night?'#101d2a':'#e7eee7';g.fillRect(0,0,1400,900);g.fillStyle=night?'#dde9e5':'#254653';g.font='bold 23px sans-serif';g.fillText('T602 BLUE-GREY | '+kind+' | '+(winter?'WINTER':night?'NIGHT':'DAY'),30,35);const out=[];for(let row=0;row<4;row++)for(let v=0;v<3;v++){const k=kind==='farm-stages'?53:[53,104,117,97][row],stage=kind==='farm-stages'?row:2,s=bakeArt602(k,v,stage,winter),scale=k===53?.48:k===97?1.05:.9,x=105+v*440,y=70+row*205;g.drawImage(s.img,x,y,s.w*scale,s.h*scale);if(night){g.fillStyle='#0a162a99';g.fillRect(x,y,s.w*scale,s.h*scale);g.drawImage(s.night,x,y,s.w*scale,s.h*scale);}g.fillStyle=night?'#dde9e5':'#254653';g.font='15px sans-serif';g.fillText('k'+k+' V'+(v+1)+' stage '+stage,x+240,y+120);const a=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,b=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;let ink=0,light=0,orphan=0;for(let i=3;i<a.length;i+=4){if(a[i])ink++;if(b[i]){light++;if(!a[i])orphan++;}}out.push({k,v,stage,ink,light,orphan,hash:__s602.imageHash(s.img)});}return out;}
  };
}
let html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
check(html.split('window.GV={').length===2,'unique game bridge anchor');
fs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge602.toString()+')();window.GV={'));
const chromePath=()=>[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(p=>fs.existsSync(p));
(async()=>{
  let browser,ws,exitCode=2,server;const errors=[],consoleErrors=[];
  try{
    server=http.createServer((req,res)=>{const file=path.resolve(DIR,'.'+decodeURIComponent((req.url||'/').split('?')[0]));const target=file===DIR?path.join(DIR,'index.html'):file;if(!target.startsWith(DIR+path.sep)){res.writeHead(403).end();return;}fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':target.endsWith('.html')?'text/html; charset=utf-8':target.endsWith('.js')?'application/javascript':target.endsWith('.json')?'application/json':'application/octet-stream','cache-control':'no-store'});res.end(data);});});
    await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(PORT,'127.0.0.1',resolve);});
    const executable=chromePath();check(executable,'Chrome executable exists');
    browser=spawn(executable,['--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),'--no-first-run','--no-default-browser-check','--mute-audio','--hide-scrollbars','--window-size=1400,900','--user-data-dir='+path.join(DIR,'.profile'),'--remote-debugging-port='+DEV,'about:blank'],{stdio:['ignore','ignore','pipe']});
    let chromeLog='';browser.stderr.on('data',b=>{chromeLog=(chromeLog+b).slice(-12000);});browser.on('error',e=>{chromeLog+=String(e);});
    let url;for(let i=0;i<120&&!url;i++){try{const tabs=await fetch('http://127.0.0.1:'+DEV+'/json/list').then(r=>r.json());url=tabs.find(t=>t.type==='page'&&t.webSocketDebuggerUrl)?.webSocketDebuggerUrl;}catch{}if(browser.exitCode!==null||browser.signalCode!==null)throw Error('Chrome exited '+(browser.exitCode??browser.signalCode)+': '+chromeLog);if(!url)await sleep(250);}check(url,'Chrome CDP unavailable: '+chromeLog);
    ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let nextId=0;const pending=new Map();
    ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value??a.description??'').join(' '));};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},150000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
    const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const ready=async(previousTimeOrigin=null)=>{for(let i=0;i<240;i++){try{if(await ev('!!(window.GV&&window.__s602&&window.__boot426&&window.__boot426().ready&&(!document.getElementById("boot426")||document.getElementById("boot426").classList.contains("hide"))&&('+JSON.stringify(previousTimeOrigin)+'===null||performance.timeOrigin!=='+JSON.stringify(previousTimeOrigin)+'))'))return;}catch{}await sleep(500);}throw Error('New document boot/overlay incomplete');};
    const shot=async name=>{await ev('if(!document.getElementById("sheet602"))GV.forceDraw();true');await sleep(100);const r=await send('Page.captureScreenshot',{format:'png'}),file='T602-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(r.data,'base64'));report.screenshots.push(file);};
    const view=()=>ev('__s602.view()');
    const mouse=(type,x,y,extra={})=>send('Input.dispatchMouseEvent',{type,x,y,...extra});
    const touch=(type,points)=>send('Input.dispatchTouchEvent',{type,touchPoints:points});
    // Queue down then up on the ordered CDP socket before waiting for replies.
    // This avoids adding a host roundtrip / expensive first frame to a short tap.
    const tap=async(x,y,mobile)=>{const down=mobile?touch('touchStart',[{x,y,id:1}]):mouse('mousePressed',x,y,{button:'left',buttons:1,clickCount:1});const up=mobile?touch('touchEnd',[]):mouse('mouseReleased',x,y,{button:'left',buttons:0,clickCount:1});await Promise.all([down,up]);await sleep(80);};
    const click=async(selector,mobile=false)=>{const p=await ev('(()=>{const e='+selector+';if(!e)throw Error("UI target missing");e.scrollIntoView({block:"nearest",inline:"nearest"});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(!r.width||!r.height||x<0||y<0||x>=innerWidth||y>=innerHeight)throw Error("UI target invisible "+e.id);const top=document.elementFromPoint(x,y);if(top!==e&&!e.contains(top))throw Error("UI target covered "+e.id);return {x,y};})()');await tap(p.x,p.y,mobile);};
    const el=id=>'document.getElementById('+JSON.stringify(id)+')';
    const slotButton=text=>'[...[...document.querySelectorAll("#infoBody .row")].find(r=>/^槽3[｜ ]/.test(r.textContent)).querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(text)+')';
    const camera=async(x,y,z,r,s,t,snow)=>ev('GV.setRot('+r+');GV.setSeason('+s+');GV.weather(0);GV.setVisT('+t+');__s602.snow('+snow+');GV.setZoom('+z+');GV.lookAt('+x+','+y+');true');
    const raf=async ms=>{const r=await ev('new Promise((resolve,reject)=>{if(document.visibilityState!=="visible"||!__s602.view().running){reject(Error("RAF needs a visible running page"));return;}const start=performance.now(),a=[];let last;const timer=setTimeout(()=>reject(Error("RAF stalled")),'+(ms+15000)+');function f(t){if(last!==undefined)a.push(t-last);last=t;if(t-start>='+ms+'){clearTimeout(timer);resolve({elapsed:t-start,frames:a.length,intervals:a,visibility:document.visibilityState});}else requestAnimationFrame(f);}requestAnimationFrame(f);})');return {elapsed:r.elapsed,frames:r.frames,mean:r.intervals.reduce((a,b)=>a+b,0)/r.frames,p95:pct(r.intervals,.95),max:Math.max(...r.intervals),visibility:r.visibility};};
    const testUI=async(label,mobile,target)=>{
      await ev('GV.setSpeed(0);GV.setRot(0);GV.setZoom(1);true');
      await click('document.querySelector("[data-tid=doze]")',mobile);check((await view()).tool==='doze',label+' real tool select');
      await click('document.querySelector("[data-tid=pan]")',mobile);check((await view()).tool==='pan',label+' real pan select');
      await click(el('bSpeed'),mobile);check((await view()).speed===1,label+' real speed button');await ev('GV.setSpeed(0);true');
      const state=await ev('__s602.scene()');
      const z0=(await view()).cam.z;await click(el('zin'),mobile);await sleep(350);check((await view()).cam.z>z0,label+' real zoom-in button');await click(el('zout'),mobile);await sleep(350);check(Math.abs((await view()).cam.z-z0)<.01,label+' real zoom-out button');
      const p=await ev('({x:innerWidth*.5,y:Math.max(260,innerHeight*.57)})'),a=(await view()).cam;
      check(await ev('document.elementFromPoint('+p.x+','+p.y+').id==="game"'),label+' drag hits game canvas');
      if(mobile){await touch('touchStart',[{...p,id:1}]);for(let i=1;i<=6;i++)await touch('touchMove',[{x:p.x+10*i,y:p.y+4*i,id:1}]);await touch('touchEnd',[]);}
      else{await mouse('mousePressed',p.x,p.y,{button:'left',buttons:1,clickCount:1});for(let i=1;i<=6;i++)await mouse('mouseMoved',p.x+10*i,p.y+4*i,{button:'left',buttons:1});await mouse('mouseReleased',p.x+60,p.y+24,{button:'left',buttons:0,clickCount:1});}
      const b=(await view()).cam;check(Math.hypot(a.x-b.x,a.y-b.y)>10,label+' real drag moved camera');
      const z=(await view()).cam.z;if(mobile){await touch('touchStart',[{x:140,y:p.y,id:1},{x:230,y:p.y,id:2}]);for(let i=1;i<=5;i++)await touch('touchMove',[{x:140-i*5,y:p.y,id:1},{x:230+i*5,y:p.y,id:2}]);await touch('touchEnd',[]);}else await mouse('mouseWheel',p.x,p.y,{deltaX:0,deltaY:-100});
      await sleep(350);check((await view()).cam.z>z,label+' real '+(mobile?'pinch':'wheel')+' zoom');
      await ev('GV.setZoom(1);GV.lookAt('+target[0]+','+target[1]+');true');await sleep(400);
      const point=await ev('__s602.point('+target[0]+','+target[1]+')');check(await ev('document.elementFromPoint('+point.x+','+point.y+').id==="game"'),label+' inspect point unobstructed');
      report.inspectDiagnostics=report.inspectDiagnostics||{};
      const diagnostic=report.inspectDiagnostics[label]={point,target:target.slice(),viewBefore:await view(),targetBefore:await ev('GV.tile('+target[0]+','+target[1]+')'),hitBefore:await ev('__s602.pointTile('+point.x+','+point.y+')'),pointerBefore:await ev('__s602.pointerState()')};
      await ev('__s602.clearInputEvents();true');await tap(point.x,point.y,mobile);
      let v=await view();Object.assign(diagnostic,{viewAfter:v,targetAfter:await ev('GV.tile('+target[0]+','+target[1]+')'),pointerAfter:await ev('__s602.pointerState()'),events:await ev('__s602.inputEvents()')});
      await shot(label+'-inspect-attempt');
      check(v.info==='block'&&v.selected&&v.selected.x===target[0]&&v.selected.y===target[1],label+' real canvas inspect correct root');await shot(label+'-inspect');await click(el('infoX'),mobile);v=await view();check(v.info==='none'&&v.selected===null,label+' inspect close clears selection');
      check(state===await ev('__s602.scene()'),label+' navigation city state unchanged');
      await click(el('bSave'),mobile);await click(slotButton('存到此'),mobile);check((await view()).slot===3,label+' saved only slot3');const saved=await ev('__s602.saved()'),roots=await ev('__s602.roots()');
      await click(slotButton('讀取'),mobile);await ev('GV.setSpeed(0);GV.save();true');check(JSON.stringify(roots)===JSON.stringify(await ev('__s602.roots()')),label+' UI load roots preserved');check(saved===await ev('__s602.saved()'),label+' UI load save preserved');
      const previousTimeOrigin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(previousTimeOrigin);check(await ev('localStorage.getItem("glimmerville.v1.slot")==="3"'),label+' reload slot3');await click(el('bContinue'),mobile);await ev('GV.setSpeed(0);GV.ai(false);GV.save();true');
      check(JSON.stringify(roots)===JSON.stringify(await ev('__s602.roots()')),label+' full reload roots preserved');check(saved===await ev('__s602.saved()'),label+' full reload save preserved');check(await ev('!localStorage.getItem("glimmerville.v1.s1")&&!localStorage.getItem("glimmerville.v1.s2")'),label+' slots1/2 untouched');await shot(label+'-after-reload');return {roots:roots.rows.length,saveSHA256:hash(saved),postReloadStats:await ev('GV.stats()'),postReloadNote:'Existing load path does not recompute population/jobs until a simulation tick; reload screenshots preserve this behavior.'};
    };
    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
    await send('Emulation.setDeviceMetricsOverride',{width:1400,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'try{localStorage.setItem("glimmerville.v1.slot","3");localStorage.setItem("glimmerville.v1.snd","0");}catch(e){}'});
    await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready();
    check(await ev('localStorage.getItem("glimmerville.v1.slot")==="3"'),'slot3 set before game boot');
    report.flags=await ev('__s602.flags()');check(report.flags.T602&&!report.flags.T596&&!report.flags.T600&&(await ev('__s602.rep()')).ok===1,'T602 enabled; T596/T600 effective previews off');
    // Baseline fixture is immutable v11.210, not the candidate pin file.
    const pinsOf=p=>p.pins||Object.fromEntries(Object.entries(p).filter(([k])=>k!=='__meta'));
    const baseline=pinsOf(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','sprite-pins-v11.210.json'),'utf8'))),candidate=pinsOf(JSON.parse(fs.readFileSync(path.join(ROOT,'docs/SPR_PINS.json'),'utf8'))),actual=await ev('__s602.pins()');
    report.pinDiff=Object.keys(baseline).filter(k=>JSON.stringify(baseline[k])!==JSON.stringify(actual[k]));report.newPins=Object.keys(actual).filter(k=>!(k in baseline));report.candidatePinDiff=[...new Set([...Object.keys(candidate),...Object.keys(actual)])].filter(k=>JSON.stringify(candidate[k])!==JSON.stringify(actual[k]));
    fs.writeFileSync(path.join(OUT,'sprite-pins.json'),JSON.stringify(actual));
    check(Object.keys(baseline).length===1580,'immutable baseline has 1580 keys');check(!report.pinDiff.length,'approved 1580 keys unchanged: '+JSON.stringify(report.pinDiff));check(report.newPins.length===6&&report.newPins.every(k=>/^art602\//.test(k)),'exactly six new art602 keys');check(!report.candidatePinDiff.length,'candidate pins match Chromium: '+JSON.stringify(report.candidatePinDiff));
    // Independent second boot, same Chrome: the new pixels must be reproducible.
    const previousTimeOrigin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(previousTimeOrigin);const repeated=await ev('__s602.pins()');
    check(JSON.stringify(actual)===JSON.stringify(repeated),'two independent Chrome boots have identical complete sprite pins');
    report.pixelCases=[];for(const [name,night,winter]of[['day',false,false],['night',true,false],['winter',false,true]]){await ev('GV.setSeason('+(winter?3:1)+');true');const rows=await ev('__s602.sheet("variants",'+night+','+winter+')');for(const r of rows)check(r.ink>400&&r.light>0&&!r.orphan,'Chrome pixels '+name+'/'+r.k+'/'+r.v);report.pixelCases.push(...rows.map(r=>({...r,mode:name})));await shot('sheet-'+name);}
    const farm=await ev('GV.setSeason(1);__s602.sheet("farm-stages",false,false)');for(let v=0;v<3;v++)check(new Set(farm.filter(r=>r.v===v).map(r=>r.hash)).size===4,'farm variant '+v+' has four Chromium stage images');report.farmStages=farm;await shot('farm-three-variants-four-stages');await ev('document.getElementById("sheet602").remove();true');
    // Browser old-save roundtrip for all three pre-change seeded cities.
    const fixtures=path.join(__dirname,'fixtures'),manifest=JSON.parse(fs.readFileSync(path.join(fixtures,'manifest.json'),'utf8'));report.oldSaves=[];
    await ev('document.getElementById("bNewGame").click();GV.setSpeed(0);true');
    const loadRaw=async raw=>ev('localStorage.setItem("glimmerville.v1.s3",'+JSON.stringify(raw)+');if(!GV.load())throw Error("Save load failed");GV.setSpeed(0);GV.ai(false);true');
    for(const f of manifest.cities){const raw=fs.readFileSync(path.join(fixtures,f.file),'utf8');check(hash(raw)===f.saveSHA256,'fixture SHA '+f.seed);await loadRaw(raw);const roots=await ev('__s602.roots()'),saved=await ev('__s602.saved()');check(!roots.bad&&roots.rows.length===f.roots&&hash(JSON.stringify(roots.rows))===f.rootSHA256,'Chrome old-save root/ref '+f.seed);await ev('GV.save();true');check(saved===await ev('__s602.saved()'),'Chrome old-save fields '+f.seed);await ev('if(!GV.load())throw Error("Second load failed");GV.setSpeed(0);true');check(JSON.stringify(roots)===JSON.stringify(await ev('__s602.roots()')),'Chrome old-save roundtrip '+f.seed);await ev('GV.save();true');check(saved===await ev('__s602.saved()'),'Chrome old-save second-load fields '+f.seed);report.oldSaves.push({seed:f.seed,roots:roots.rows.length,rootSHA256:hash(JSON.stringify(roots.rows))});}
    const cityFixture=manifest.cities.find(f=>f.seed===22),cityRaw=fs.readFileSync(path.join(fixtures,cityFixture.file),'utf8'),expectedCitySave=await ev('__s602.sourceSaved('+JSON.stringify(cityRaw)+')');
    const growCity=async label=>{const stats=await ev('__s602.grow22()'),roots=await ev('__s602.roots()'),rootSHA256=hash(JSON.stringify(roots.rows));await ev('GV.save();true');const saved=await ev('__s602.saved()'),expected=JSON.parse(expectedCitySave),actual=JSON.parse(saved),changedFields=Object.keys(expected).filter(k=>JSON.stringify(expected[k])!==JSON.stringify(actual[k]));report.grownCities=report.grownCities||{};report.grownCities[label]={stats,roots:roots.rows.length,rootSHA256,changedFields};check(!roots.bad&&roots.rows.length===cityFixture.roots&&rootSHA256===cityFixture.rootSHA256,'grown city exact roots '+label);check(stats.pop===cityFixture.stats.pop&&stats.day===cityFixture.day,'grown city genuine derived population/day '+label);check(!changedFields.length,'grown city canonical save matches fixture '+label+': '+JSON.stringify(changedFields));await sleep(450);return stats;};
    report.cityStats=await growCity('desktop-before');report.census={};
    for(const k of[53,104,117]){report.census[k]=await ev('__s602.census('+k+')');check(report.census[k].length>0,'mature city contains k'+k);}
    report.desktop=await testUI('desktop',false,report.census[104][0]);await growCity('visual-and-performance');
    const state=await ev('__s602.scene()'),originalDay=(await view()).day;
    for(const k of[53,104,117]){const c=report.census[k][0];await camera(c[0]+c[2]/2,c[1]+c[2]/2,k===53?1.1:2,0,1,55,false);for(const off of[true,false]){await ev('window.__noT602='+off+';true');await shot('city-k'+k+(off?'-before':'-after'));}}
    // Full product of 3 kinds, 4 seasons, 2 lights, 4 rotations, 2 distances.
    report.matrix=[];await ev('window.__noT602=false;true');
    for(const k of[53,104,117])for(let rot=0;rot<4;rot++)for(let season=0;season<4;season++)for(const [light,time]of[['day',55],['night',100]])for(const [distance,zoom]of[['near',k===53?1.1:2],['far',.35]]){const c=report.census[k][0];await camera(c[0]+c[2]/2,c[1]+c[2]/2,zoom,rot,season,time,season===3);await shot('city-k'+k+'-r'+rot+'-s'+season+'-'+light+'-'+distance);report.matrix.push({k,rot,season,light,distance});}
    check(report.matrix.length===192,'all 192 same-city season/light/rotation/distance scenes');
    // setSeason is a simulation test API and writes day. Restore explicitly.
    await ev('GV.setDay('+originalDay+');true');report.visualStateUnchanged=state===await ev('__s602.scene()');check(report.visualStateUnchanged,'visual-only city data unchanged after restoring test calendar');
    report.performance={};report.performanceLimits={coldRatio:2,coldAddMs:250,warmP95Ratio:1.5,warmAddMs:5,rafP95Ratio:1.5,rafAddMs:5};
    const focus=report.census[53][0];for(const off of[true,false]){const mode=off?'baseline':'candidate';await ev('window.__noT602='+off+';true');await camera(focus[0]+3,focus[1]+3,1,0,1,55,false);await ev('__s602.clear();true');const cold=await ev('__s602.drawMs()'),warm=[];for(let i=0;i<30;i++)warm.push(await ev('__s602.drawMs()'));report.performance[mode]={cold,warm,warmP95:pct(warm,.95),raf:await raf(5000)};}
    const b=report.performance.baseline,c=report.performance.candidate;check(c.cold<=b.cold*2+250,'cold draw relative budget');check(c.warmP95<=b.warmP95*1.5+5,'warm draw p95 relative budget');check(c.raf.p95<=b.raf.p95*1.5+5&&c.raf.frames>=50,'foreground headless RAF relative budget');
    await ev('window.__noT602=false;true');
    // Natural shoreline evidence, including front-water fallback after rotation.
    await ev('GV.newWorldSeeded(601);GV.ai(false);GV.setSpeed(0);true');const shores=await ev('__s602.shores()');check(shores.back&&shores.E&&shores.S,'natural rear/east/south shores found');for(const p of Object.values(shores))await ev('__s602.single(97,'+p+');true');report.shore=[];
    for(const [kind,p]of Object.entries(shores))for(let rot=0;rot<4;rot++){await camera(p[0],p[1],3,rot,1,55,false);const expected=await ev('__s602.shoreExpected('+p+')'),actual=await ev('__s602.pier('+p+')');check(expected.want===actual,'natural shoreline '+kind+'/r'+rot);report.shore.push({kind,rot,expected,actual});await shot('pier-'+kind+'-r'+rot);}
    // Disposable fixtures use genuine placement. Gas-well resource is explicit.
    const fresh=async()=>ev('GV.newWorldSeeded(602);GV.setDiff(3);GV.setSpeed(0);GV.ai(false);__s602.clearMap();true');
    const place=async(tool,x,y,n)=>{await ev('__s602.prepare('+[x,y,n]+');true');check(await ev('GV.place('+JSON.stringify(tool)+','+x+','+y+')'),'real placement '+tool+' at '+x+','+y);};
    await fresh();report.row=[];
    for(const [k,tool,n,y]of[[53,'bigFarm',7,8],[104,'cgarden',2,25],[117,'gaswell',2,34]]){let x=5;for(let v=0;v<3;v++){while(x<60&&(await ev('__s602.v('+[k,x,y]+')'))!==v)x++;check(x+n<68,'variant root within map');await place(tool,x,y,n);report.row.push({k,v,n,x,y});x+=n+3;}}
    await ev('__s602.finish();true');check(report.row.length===9,'all nine real-placement variants');
    for(const r of report.row)for(const stage of(r.k===53?[0,1,2,3]:[2])){await camera(r.x+r.n/2,r.y+r.n/2,r.k===53?1.2:2.5,0,1,55,false);if(r.k===53)await ev('__s602.stage('+[r.x,r.y,stage]+')');const trace=await ev('__s602.trace()');check(trace.some(t=>new RegExp('^(far:)?'+r.k+'_'+r.v+'_'+stage+'_').test(t.key)),'world route k'+r.k+'/v'+r.v+'/stage'+stage);await shot('world-k'+r.k+'-v'+r.v+'-stage'+stage);}
    await fresh();report.construction=[];
    for(const [k,tool,n,y]of[[53,'bigFarm',7,8],[104,'cgarden',2,25],[117,'gaswell',2,34]])for(let age=4;age<=8;age++){const x=5+(age-4)*(n+2);await place(tool,x,y,n);await ev('__s602.age('+[x,y,age]+');true');report.construction.push({k,n,x,y,age});}
    check(report.construction.length===15&&new Set(report.construction.map(r=>r.k+'/'+r.age)).size===15,'all 15 construction roots placed');
    for(const r of report.construction){const b=await ev('GV.tile('+[r.x,r.y]+').bld');check(b.k===r.k&&b.age===r.age&&b.lot574===r.n,'construction root data '+r.k+'/'+r.age);await camera(r.x+r.n/2,r.y+r.n/2,r.k===53?1.15:2.5,0,1,55,false);await shot('construction-k'+r.k+'-age'+r.age);}
    // Presence + renderer assertions, with 96 screenshots for manual occlusion QA.
    // These screenshots do not by themselves prove correct depth ordering.
    report.occlusion=[];
    for(const [k,tool,n]of[[53,'bigFarm',7],[104,'cgarden',2],[117,'gaswell',2]])for(const neighbor of['residential','hospital591','guesthouse601','tree']){await fresh();await place(tool,25,25,n);await ev('__s602.finish();true');check(await ev('__s602.neighbor('+JSON.stringify(neighbor)+','+(25+n)+','+(24+n)+')'),'occlusion neighbor present '+neighbor);for(let rot=0;rot<4;rot++)for(const [light,time]of[['day',55],['night',100]]){await camera(25+n*.7,25+n*.7,k===53?1.3:3,rot,1,time,false);const trace=await ev('__s602.trace()');check(trace.some(t=>new RegExp('^(far:)?'+k+'_').test(t.key)),'occlusion target drawn '+k+'/'+neighbor+'/'+rot+'/'+light);await shot('occlusion-k'+k+'-'+neighbor+'-r'+rot+'-'+light);report.occlusion.push({k,neighbor,rot,light});}}
    check(report.occlusion.length===96,'all 96 adjacent-occlusion evidence scenes');
    await growCity('mobile-before');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await sleep(500);
    report.mobile=await testUI('mobile390',true,report.census[104][0]);const layout=await ev('({width:innerWidth,docWidth:document.documentElement.scrollWidth,canvas:document.getElementById("game").getBoundingClientRect().toJSON()})');report.mobile.layout=layout;check(layout.width===390&&layout.docWidth<=391&&layout.canvas.width>=389,'390px mobile has no horizontal document overflow');
    await ev('GV.setSpeed(0);GV.setRot(0);GV.setZoom(.7);true');const stableState=await ev('__s602.scene()');report.stability=await raf(60000);check(report.stability.elapsed>=60000&&report.stability.frames>=600&&report.stability.max<5000,'one-minute visible RAF stability and liveness');check(stableState===await ev('__s602.scene()'),'one-minute paused city unchanged');
    report.finalFlags=await ev('__s602.flags()');check(report.finalFlags.T602&&!report.finalFlags.T596&&!report.finalFlags.T600,'final preview flags preserved');report.errLog=await ev('(window.__errLog||[]).slice(-20)');check(!errors.length&&!consoleErrors.length&&!report.errLog.length,'zero runtime/console/app errors');report.status='passed';exitCode=0;
  }catch(e){report.status='failed';report.error=e.stack;console.error('SCENE602 FAILED: '+e.stack);}
  finally{report.exceptions=errors;report.consoleErrors=consoleErrors;persist();console.log('SCENE602 '+JSON.stringify({status:report.status,checks:report.checks.length,screenshots:report.screenshots.length,error:report.error}));try{ws?.close();}catch{}try{browser?.kill();}catch{}try{server?.close();}catch{}setTimeout(()=>{try{fs.rmSync(DIR,{recursive:true,force:true});}catch{}process.exit(exitCode);},1000);}
})();
