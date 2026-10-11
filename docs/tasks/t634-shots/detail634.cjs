// T634 detail revision: real Chrome compares two immutable candidate snapshots.
// REVIEW_BASE634 supplies the owner-requested previous-candidate commit. No release hash is embedded here.
// Disposable browser contexts and slot3 only; this script never advances simulation or calls GV.save.
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),{execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..'),OUT=path.resolve(process.env.OUT634||'evidence/t634-detail'),CHECK_ONLY=process.argv.includes('--check');
const gitRaw=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:30e6});
const git=(...args)=>gitRaw(...args).trimEnd();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function requireThat(ok,message){if(!ok)throw Error(message);}
const reviewRef=process.env.REVIEW_BASE634;
requireThat(reviewRef&&/^[0-9a-f]{40}$/i.test(reviewRef),'REVIEW_BASE634 must be the full immutable previous-candidate commit supplied by the workflow.');
const reviewBase=git('rev-parse',reviewRef+'^{commit}'),head=git('rev-parse','HEAD');
const beforeSource=gitRaw('show',reviewBase+':index.html'),afterSource=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sceneSource=fs.readFileSync(path.join(__dirname,'scene634.cjs'),'utf8');
const helperStart=sceneSource.indexOf('function bridge634(){'),helperEnd=sceneSource.indexOf('\nconst inject=',helperStart);
requireThat(helperStart>=0&&helperEnd>helperStart,'Cannot locate the read-only scene634 bridge.');
const sharedBridge=sceneSource.slice(helperStart,helperEnd).trim();
requireThat(sharedBridge.endsWith('}'),'Unexpected scene634 bridge boundary.');
const fixturePath=path.join(__dirname,'../t603-shots/fixtures/seed22-d3-420-v11.211.json'),fixtureRaw=fs.readFileSync(fixturePath,'utf8');
const ledgerPath=path.join(__dirname,'coverage634.json'),ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):null;
const variantNames=new Map((ledger?ledger.non_rci_variants:[]).map(r=>[r.id,r.name]));
const ADJACENCY_SUBJECTS=[{id:'3_2_4',k:3,lv:2,v:4,n:1,x:28,y:29,reported:true,attachFace:'u'},{id:'1_1_5',k:1,lv:1,v:5,n:1,x:34,y:23,reported:true,attachFace:'v'},{id:'1_3_9',k:1,lv:3,v:9,n:1,x:30,y:30,reported:false}];
const GROUPS=[{id:'rci',name:'住宅・高街商業・工業街屋'},{id:'civic',name:'公共建築・休閒與地標'},{id:'industry',name:'能源・工業與基礎設施'}];
const report={kind:'real-Chrome previous-candidate versus building-attachment and adjacency revision',status:'running',reviewBase,head,
  source:{before:{commit:reviewBase,sha256:sha(beforeSource)},after:{commit:head,sha256:sha(afterSource),matchesCommit:afterSource===gitRaw('show',head+':index.html')},harnessSHA256:sha(fs.readFileSync(__filename)),sharedBridgeSHA256:sha(sharedBridge)},
  fixture:{path:path.relative(ROOT,fixturePath),sha256:sha(fixtureRaw),seed:22},variantLabelLedgerSHA256:ledger?sha(fs.readFileSync(ledgerPath)):null,
  scope:'Source-rendered primary315 designs at summer/stage2/wealth1, paired frozen synthetic and actual seed22 streets, unchanged reported-root views, and four-rotation day/night isolated-versus-contiguous adjacency. Not full seasonal or simulation acceptance.',
  checks:[],failures:[],errors:[],screenshots:[],pairs:[],assets:[],headless:true,
  safety:{isolatedContexts:true,slot:3,playerOriginsUsed:false,simulationAdvanced:false,saveApiCalled:false,saveSlotWritesBlockedExceptFixtureLoad:true,autosaveTimerSuppressed:true},
  acceptance:'Owner visual acceptance pending; successful capture is not approval of the art.'};
function bridgeDetail634(){
  const hash=async c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,b=await window.crypto.subtle.digest('SHA-256',a);return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');};
  const cache=new Map();
  const sprite=r=>{if(!cache.has(r.id)){const s=bake634(r.k,r.v,r.n,r.lv,1,2,false,1);if(!s||!s.img||!s.night)throw Error('Missing primary sprite '+r.id);cache.set(r.id,s);}return cache.get(r.id);};
  const baseState=()=>{window.__t634=true;window.__noT634=false;window.__freeze634=true;running=false;speed=0;quality=1;window.__noAnim=false;window.__noParkLife=false;window.__noChimney=false;window.__noT596=true;selTile=null;hover.x=hover.y=-1;tool='pan';};
  const nameOf=(k,lv,v)=>k<=3?(RCI_CATALOG634[k+'_'+lv+'_'+v]||{}).name:ART634[k]&&ART634[k].name;
  const rootRows=()=>tiles.flatMap((t,i)=>{const b=t.bld;if(!b||b.ref)return[];const x=i%N,y=Math.floor(i/N),lv=kLevel(b),v=REMAIN634.has(b.k)?v634(b.k,x,y,b):b.v;return[{i,x,y,k:b.k,lv,v,n:b.sz||1,lot:!!b.lot574,name:nameOf(b.k,lv,v)||KNAME[b.k],id:b.k+'_'+lv+'_'+v}];});
  const kLevel=b=>b.k<=3?Math.min(3,Math.max(1,b.lv|0)):1;
  const sourceGeometry=r=>{
    const a=r.k<=3?RCI_CATALOG634[r.id]:null,m=a?JSON.parse(JSON.stringify(a.m)):null;
    return{source:a?'RCI_CATALOG634['+r.id+'].m':'LOT_PLAN574 footprint and baked hooks only',logicalFootprint:{u:0,v:0,du:r.n,dv:r.n},masses:m,archetype:a?a.archetype:null,
      massBounds:m?{minU:Math.min(...m.map(q=>q[0])),minV:Math.min(...m.map(q=>q[1])),maxU:Math.max(...m.map(q=>q[0]+q[2])),maxV:Math.max(...m.map(q=>q[1]+q[3]))}:null,
      pairGeometry:m?m.flatMap((q,i)=>m.slice(i+1).map((p,j)=>{const overlapU=Math.min(q[0]+q[2],p[0]+p[2])-Math.max(q[0],p[0]),overlapV=Math.min(q[1]+q[3],p[1]+p[3])-Math.max(q[1],p[1]);return{a:i,b:i+j+1,overlapU,overlapV,interiorArea:Math.max(0,overlapU)*Math.max(0,overlapV),declaredA:q[9]||null,declaredB:p[9]||null};})):null};
  };
  const immutableScene=()=>JSON.stringify({day,running,speed,tiles:tiles.map(t=>({t:t.t,road:t.road,bld:t.bld}))});
  const frameState=()=>({mapSize:N,day,season:season(),rotation:viewRotEff(),zoom:cam.z,visT,rainDays,weather,camX:cam.x,camY:cam.y});
  window.__detail634={
    catalog:()=>{const rows=[];for(const k of [...REMAIN634].sort((a,b)=>a-b))for(let lv=1;lv<=(k<=3?3:1);lv++)for(let v=0;v<(k<=3?12:3);v++)rows.push({id:k+'_'+lv+'_'+v,k,lv,v,n:LOT_PLAN574[k][1],name:nameOf(k,lv,v),group:k<=3?'rci':Object.prototype.hasOwnProperty.call(CIVIC634,k)?'civic':'industry'});return rows;},
    fingerprints:async rows=>{baseState();GV.setSeason(1);const out=[];for(const r of rows){const s=sprite(r);out.push({...r,w:s.w,h:s.h,ax:s.ax,ay:s.ay,daySHA256:await hash(s.img),nightSHA256:await hash(s.night),hooks:s.lotMeta574.hooks,sourceGeometry:sourceGeometry(r)});}return out;},
    sheet:({rows,night,title,columns=9,cellW=200,cellH=250,maxScale=1.8})=>{
      baseState();GV.setSeason(1);const c=document.createElement('canvas'),g=c.getContext('2d');c.width=columns*cellW;c.height=72+Math.ceil(rows.length/columns)*cellH;g.imageSmoothingEnabled=false;
      g.fillStyle=night?'#132631':'#e7e5d9';g.fillRect(0,0,c.width,c.height);g.fillStyle=night?'#f0e4ca':'#30484a';g.font='bold 24px sans-serif';g.fillText(title,22,33);g.font='14px sans-serif';g.fillText('Chrome原生Canvas源圖 / 夏季・成熟作物・中等財富 / '+(night?'夜圖合成':'日圖')+' / '+rows.length+'款',22,57);
      const boxes=[];rows.forEach((r,i)=>{const s=sprite(r),x=i%columns*cellW,y=72+Math.floor(i/columns)*cellH,q=r.reviewScale===undefined?Math.min(maxScale,(cellW-20)/s.w,(cellH-58)/s.h):r.reviewScale,xx=x+(cellW-s.w*q)/2,yy=y+cellH-51-s.h*q;
        g.fillStyle=night?'#213744':'#f7f3e9';g.fillRect(x+4,y+4,cellW-8,cellH-8);g.drawImage(s.img,xx,yy,s.w*q,s.h*q);
        if(night){g.save();g.globalCompositeOperation='source-atop';g.fillStyle='#102035bb';g.fillRect(xx,yy,s.w*q,s.h*q);g.restore();g.drawImage(s.night,xx,yy,s.w*q,s.h*q);}
        g.fillStyle=night?'#f0e4ca':'#30484a';g.font='bold 14px sans-serif';g.fillText(r.id,x+12,y+cellH-31);g.font='13px sans-serif';const name=r.name||('k'+r.k);g.fillText(name.slice(0,16),x+12,y+cellH-12);boxes.push({id:r.id,x,y,w:cellW,h:cellH,scale:q});
      });return{png:c.toDataURL('image/png'),width:c.width,height:c.height,boxes};
    },
    synthetic:()=>{baseState();const roots=__qa634.rig('street',false);GV.setSeason(1);baseState();return{roots:rootRows(),fixtureRoots:roots,center:[30,30]};},
    adjacency:({subject,mode})=>{
      if(!['isolated','dense'].includes(mode)||subject.n!==1||subject.k>3)throw Error('Adjacency fixture only accepts explicit single-lot RCI subjects');
      // 測試專用空白街廓；兩種模式地面／道路／目標座標完全相同，只增八個相鄰 root。
      __qa634.rig('street',false);baseState();GV.setSeason(1);
      for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});
      const {x,y}=subject,neighbors=[[-1,-1,1,1,0],[0,-1,2,1,1],[1,-1,1,2,6],[-1,0,3,1,0],[1,0,1,1,3],[-1,1,2,2,4],[0,1,1,1,2],[1,1,1,2,0]],placed=[];
      const put=(r,role)=>{if(!inMap(r.x,r.y)||T(idx(r.x,r.y)).bld)throw Error('Overlapping or out-of-map adjacency root');const b={k:r.k,lv:r.lv,v:r.v,age:60,pw:true,wa:true,h:1,we:1,den:3};T(idx(r.x,r.y)).bld=b;placed.push({x:r.x,y:r.y,k:r.k,lv:r.lv,v:r.v,n:1,lot:false,role});};
      put(subject,'target');if(mode==='dense')for(const[dx,dy,k,lv,v]of neighbors)put({x:x+dx,y:y+dy,k,lv,v},'neighbor');
      for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++)if(Math.abs(xx-x)===2||Math.abs(yy-y)===2)Object.assign(T(idx(xx,yy)),{road:1,rc:2});
      recalcAllMasks();computeFoam();computePower();computeWater();rebuildCov();for(const r of placed){const b=T(idx(r.x,r.y)).bld;b.pw=b.wa=true;}
      baseState();groundDirty=true;const roots=rootRows(),target=roots.find(r=>r.x===x&&r.y===y),cells=tiles.flatMap((t,i)=>t.bld?[{x:i%N,y:Math.floor(i/N),root:t.bld.ref||[i%N,Math.floor(i/N)],k:t.bld.k}]:[]);
      if(!target||target.id!==subject.id||roots.length!==placed.length||cells.length!==placed.length)throw Error('Adjacency root identity or exact occupancy failed');
      return{mode,target,roots,placed,cells,center:[x,y],geometry:sourceGeometry(target),terrainRoadSignature:JSON.stringify(tiles.map(t=>[t.t,t.road,t.rc,t.mask])),frozenSignature:immutableScene()};
    },
    adjacencyFrame:async args=>{
      const frozenBefore=immutableScene(),frame=await __detail634.worldFrame(args),normal=ctx.getImageData(0,0,cvs.width,cvs.height).data.slice(),repeat=await __detail634.worldFrame(args),r=args.subject,b=T(idx(r.x,r.y)).bld,s=spr634(b,r.x,r.y,false,2,false);
      if(!s||!s.__t634)throw Error('Adjacency target did not resolve a warm candidate sprite');
      const original=ctx.drawImage,draws=[];ctx.drawImage=function(img,...a){if(img===s.img||img===s.night){draws.push({layer:img===s.img?'day':'night',args:a,alpha:this.globalAlpha});return;}return original.call(this,img,...a);};
      let absent;try{await __detail634.worldFrame(args);absent=ctx.getImageData(0,0,cvs.width,cvs.height).data;}finally{ctx.drawImage=original;}
      let visiblePixels=0;for(let i=0;i<normal.length;i+=4)if(normal[i]!==absent[i]||normal[i+1]!==absent[i+1]||normal[i+2]!==absent[i+2]||normal[i+3]!==absent[i+3])visiblePixels++;
      return{...frame,repeatSHA256:repeat.sha256,stable:frame.sha256===repeat.sha256,targetDraws:draws,targetVisiblePixels:visiblePixels,stateUnchanged:frozenBefore===immutableScene(),targetGeometry:sourceGeometry(r)};
    },
    framePanels:async({frames,title})=>{
      const c=document.createElement('canvas'),g=c.getContext('2d'),cellW=900,cellH=600;c.width=1800;c.height=80+Math.ceil(frames.length/2)*cellH;g.imageSmoothingEnabled=false;g.fillStyle='#132631';g.fillRect(0,0,c.width,c.height);g.fillStyle='#f0e4ca';g.font='bold 23px sans-serif';g.fillText(title,20,32);g.font='14px sans-serif';g.fillText('Chrome原生完整畫布等比例並列；每格原始RGBA SHA-256與相機另列summary.json。',20,59);
      const panels=[];for(let i=0;i<frames.length;i++){const r=frames[i],img=new Image();img.src=r.png;await img.decode();const x=i%2*cellW,y=80+Math.floor(i/2)*cellH,q=Math.min(cellW/img.width,(cellH-36)/img.height);g.drawImage(img,x+(cellW-img.width*q)/2,y,img.width*q,img.height*q);g.fillStyle='#f0e4ca';g.font='17px sans-serif';g.fillText(r.label,x+14,y+cellH-12);panels.push({label:r.label,x,y,width:img.width*q,height:img.height*q,scale:q,rawWidth:img.width,rawHeight:img.height});}return{png:c.toDataURL('image/png'),width:c.width,height:c.height,panels};
    },
    loadFixture:raw=>{window.__detail634Loading=true;try{__qa634.load(raw);}finally{window.__detail634Loading=false;localStorage.removeItem('glimmerville.v1.s3');}baseState();document.getElementById('start').classList.add('hide');return{roots:rootRows(),day,mapSize:N};},
    cameraProposal:()=>{let best={x:N/2,y:N/2,score:-1};for(let y=8;y<N-8;y+=2)for(let x=8;x<N-8;x+=2){let score=0;for(let yy=y-7;yy<=y+7;yy++)for(let xx=x-7;xx<=x+7;xx++){const b=T(idx(xx,yy)).bld;if(b&&!b.ref)score+=b.k<=3?2:1;}if(score>best.score)best={x,y,score};}return best;},
    rootSignature:()=>JSON.stringify(tiles.map(t=>t.bld)),
    worldFrame:async({center,zoom,night,rotation=0})=>{baseState();GV.setRot(rotation);GV.setZoom(zoom);GV.lookAt(center[0],center[1]);weather=0;rainDays=0;visT=night?5:55;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;GV.forceDraw();return{png:cvs.toDataURL('image/png'),sha256:await hash(cvs),state:frameState(),width:cvs.width,height:cvs.height};},
    errors:()=>({failedBakes:STAT634.fail,slot:curSlot(),flag:t634On(),safety:window.__detail634Safety})
  };
}
function injected(s){
  requireThat((s.match(/window\.GV=\{/g)||[]).length===1,'Expected one GV bridge anchor.');
  requireThat(s.includes('requestAnimationFrame(frame);'),'Missing freeze-loop anchor.');
  return s.replace('window.GV={','('+sharedBridge+')();('+bridgeDetail634.toString()+')();window.GV={').replaceAll('requestAnimationFrame(frame);','if(!window.__freeze634)requestAnimationFrame(frame);');
}
const pagesHTML={before:injected(beforeSource),after:injected(afterSource)};
if(CHECK_ONLY){
  for(const [side,html]of Object.entries(pagesHTML)){const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);requireThat(scripts.length>0,'No inline scripts for '+side);for(const s of scripts)new Function(s);for(const api of['bake634','RCI_CATALOG634','REMAIN634','CIVIC634','STAT634','__boot426'])requireThat(html.includes(api),'Missing '+side+' API '+api);}
  new Function(sharedBridge);new Function('('+bridgeDetail634.toString()+')');
  console.log(JSON.stringify({status:'syntax-and-source-API-check-only',reviewBase,head,primaryExpected:315,browserStarted:false,outputsWritten:false}));
}else main().catch(e=>{report.status='failed';report.errors.push({source:'runner',message:e.stack});persist();console.error(e);process.exitCode=1;});
function persist(){fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(report,null,2)+'\n');}
function check(ok,message){(ok?report.checks:report.failures).push(message);persist();if(!ok)console.error('FAIL: '+message);}
function png(name,value,metadata={}){requireThat(/^data:image\/png;base64,/.test(value),'Expected actual browser PNG: '+name);const bytes=Buffer.from(value.split(',')[1],'base64');fs.writeFileSync(path.join(OUT,name),bytes);report.screenshots.push({...metadata,file:name,sha256:sha(bytes)});return name;}
function captionName(s){return s.replace(/[^a-zA-Z0-9_-]/g,'-');}
function attachmentFacts(geometry,face){
  const m=geometry&&geometry.masses;if(!m||m.length<2)return{ok:false,firstFailure:'missing-mass-source'};
  const a=m[0],b=m[1],overlapU=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]),overlapV=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]),gap=face==='u'?b[0]-(a[0]+a[2]):b[1]-(a[1]+a[3]),sharedEdge=face==='u'?overlapV:overlapU,declared=b[9]||null;
  const firstFailure=overlapU>1e-6&&overlapV>1e-6?'annex-interior-overlap':Math.abs(gap)>1e-6?'annex-wall-gap':sharedEdge<=1e-6?'annex-no-shared-wall':!declared||declared.attach!==0||declared.face!==face?'annex-association':!(b[4]>0&&b[4]<a[4])?'annex-height':!Number.isFinite(declared.pitch)||declared.pitch<=0||declared.pitch>4||declared.chimney!==false?'annex-roof-intent':null;
  return{ok:firstFailure===null,firstFailure,main:0,annex:1,face,gap,sharedEdge,overlapU,overlapV,interiorArea:Math.max(0,overlapU)*Math.max(0,overlapV),mainEaveHeight:a[4],annexEaveHeight:b[4],declared};
}
async function main(){
  persist();check(report.source.after.matchesCommit,'after index.html exactly matches the recorded HEAD git object');requireThat(report.source.after.matchesCommit,'Commit the candidate source before recording owner-review evidence.');
  const {chromium}=require('playwright');let browser,server,contexts=[];
  try{
    server=http.createServer((req,res)=>{const side=req.url.split('?')[0].slice(1).replace('.html','');if(!Object.prototype.hasOwnProperty.call(pagesHTML,side)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(pagesHTML[side]);});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.browser={version:browser.version(),executable:process.env.CHROME_PATH||'/usr/bin/google-chrome',viewport:{width:1800,height:1120},deviceScaleFactor:1};
    const pages={};for(const side of['before','after']){
      const context=await browser.newContext({viewport:report.browser.viewport,deviceScaleFactor:1,serviceWorkers:'block'});contexts.push(context);
      await context.addInitScript(()=>{
        // Slot selection is the first storage action. Guard every later gameplay save write.
        localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');window.__freeze634=true;window.__t634=true;window.__noT634=false;
        window.__detail634Safety={fixtureWrites:0,blockedSaveWrites:0,wrongSlotWrites:0,blockedSaveCalls:0,blockedAutosaveRegistrations:0};
        const interval=window.setInterval;window.setInterval=function(fn,delay,...args){if(delay===25000&&typeof fn==='function'&&/if\(tiles\)save\(\)/.test(String(fn))){window.__detail634Safety.blockedAutosaveRegistrations++;return 0;}return interval.call(this,fn,delay,...args);};
        const put=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&/^glimmerville\.v1\.s[123]$/.test(k)){if(k!=='glimmerville.v1.s3'){window.__detail634Safety.wrongSlotWrites++;throw Error('Review attempted a non-disposable save slot');}if(!window.__detail634Loading){window.__detail634Safety.blockedSaveWrites++;return;}window.__detail634Safety.fixtureWrites++;}return put.call(this,k,v);};
      });
      const page=await context.newPage();pages[side]=page;page.on('pageerror',e=>{report.errors.push({side,message:e.stack||e.message});persist();});
      await page.goto(`http://127.0.0.1:${port}/${side}.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.GV&&window.__qa634&&window.__detail634&&window.__boot426&&__boot426().ready,null,{timeout:180000});
      await page.evaluate(()=>{GV.save=()=>{window.__detail634Safety.blockedSaveCalls++;throw Error('No gameplay save API is allowed in owner-review capture');};});
      const flags=await page.evaluate(()=>__detail634.errors());check(flags.slot===3&&flags.flag===true,side+' is opt-in candidate on disposable slot3');
    }
    report.browser.userAgent=await pages.after.evaluate(()=>navigator.userAgent);
    const catalogs={};for(const side of['before','after'])catalogs[side]=(await pages[side].evaluate(()=>__detail634.catalog())).map(r=>({...r,familyName:r.name,name:variantNames.get(r.id)||r.name}));
    const ids=rows=>rows.map(r=>r.id).sort();check(catalogs.before.length===315&&catalogs.after.length===315,'both candidate catalogs contain315 primary designs');check(JSON.stringify(ids(catalogs.before))===JSON.stringify(ids(catalogs.after)),'before/after primary design IDs are identical');requireThat(report.failures.length===0,'Catalog or source identity failure; no partial full-batch claim.');
    const bySide={before:new Map(),after:new Map()};
    for(const side of['before','after'])for(let offset=0;offset<catalogs[side].length;offset+=15){const rows=catalogs[side].slice(offset,offset+15),result=await pages[side].evaluate(rows=>__detail634.fingerprints(rows),rows);for(const r of result)bySide[side].set(r.id,r);}
    for(const row of catalogs.after){const a=bySide.before.get(row.id),b=bySide.after.get(row.id),sizeChanged=a.w!==b.w||a.h!==b.h,dayChanged=sizeChanged||a.daySHA256!==b.daySHA256,nightChanged=sizeChanged||a.nightSHA256!==b.nightSHA256;report.assets.push({id:row.id,k:row.k,lv:row.lv,v:row.v,n:row.n,group:row.group,nameBefore:a.name,nameAfter:b.name,dayChanged,nightChanged,changed:dayChanged||nightChanged,geometryOrHooksChanged:JSON.stringify([a.w,a.h,a.ax,a.ay,a.hooks,a.sourceGeometry])!==JSON.stringify([b.w,b.h,b.ax,b.ay,b.hooks,b.sourceGeometry]),before:a,after:b});}
    report.attachmentChecks=[];
    for(const target of ADJACENCY_SUBJECTS.filter(r=>r.reported)){
      const asset=report.assets.find(r=>r.id===target.id),before=attachmentFacts(asset.before.sourceGeometry,target.attachFace),after=attachmentFacts(asset.after.sourceGeometry,target.attachFace),redGeometry=JSON.parse(JSON.stringify(asset.after.sourceGeometry));
      redGeometry.masses[1]=JSON.parse(JSON.stringify(asset.before.sourceGeometry.masses[1]));const restoredOldAnnex=attachmentFacts(redGeometry,target.attachFace);
      report.attachmentChecks.push({id:target.id,k:target.k,lv:target.lv,v:target.v,originalRoot:{x:target.x,y:target.y,n:target.n},before,after,negativeControl:{mutation:'Restore the exact baseline annex mass within the current catalog record',baseline:reviewBase,result:restoredOldAnnex,scope:'Pure geometry-check negative control using immutable source records; this mutated record is not separately rendered'},limitation:'Independent base-rectangle/contact check; no claim that footprint containment alone proves correct roof visibility.'});
      check(after.ok,target.id+' annex has a shared parent wall, no interior base overlap, a lower eave and matching lean-to association');
      check(!before.ok&&restoredOldAnnex.firstFailure===before.firstFailure,target.id+' exact baseline-annex red source is first rejected by '+before.firstFailure);
    }
    check(report.assets.filter(r=>r.k<=3).every(r=>{const b=r.after.sourceGeometry.massBounds;return b&&b.minU>=0&&b.minV>=0&&b.maxU<=r.after.n&&b.maxV<=r.after.n;}),'all108 RCI source mass bases remain within their actual catalog footprint; this does not treat tall projected pixels as ground spill');
    const count=rows=>({total:rows.length,changed:rows.filter(r=>r.changed).length,unchanged:rows.filter(r=>!r.changed).length,dayChanged:rows.filter(r=>r.dayChanged).length,nightChanged:rows.filter(r=>r.nightChanged).length,unchangedIDs:rows.filter(r=>!r.changed).map(r=>r.id)});
    report.changeCounts={all:count(report.assets),byGroup:Object.fromEntries(GROUPS.map(g=>[g.id,count(report.assets.filter(r=>r.group===g.id))])),byType:Object.fromEntries([...new Set(report.assets.map(r=>r.k))].map(k=>[k,count(report.assets.filter(r=>r.k===k))]))};
    check(report.assets.length===315,'315 primary source-render comparisons recorded individually');check(report.changeCounts.all.changed>0,'revision changes at least one primary rendered design; unchanged designs remain explicitly listed');persist();
    const pairedScale=(rows,w,h,max)=>rows.map(r=>({...r,reviewScale:Math.min(max,(w-20)/Math.max(bySide.before.get(r.id).w,bySide.after.get(r.id).w),(h-58)/Math.max(bySide.before.get(r.id).h,bySide.after.get(r.id).h))}));
    for(const group of GROUPS)for(const night of[false,true])for(const side of['before','after']){const rows=pairedScale(catalogs[side].filter(r=>r.group===group.id),200,250,1.8),r=await pages[side].evaluate(a=>__detail634.sheet(a),{rows,night,title:(side==='before'?'前版'+reviewBase.slice(0,7):'本版'+head.slice(0,7))+' / '+group.name});png(`overview-${group.id}-${night?'night':'day'}-${side}.png`,r.png,{kind:'complete-source-overview',group:group.id,side,night,count:rows.length,width:r.width,height:r.height});}
    const selected={rci:['1_1_1','1_2_5','1_3_9','2_2_4','2_3_3','3_3_3'],civic:['24_1_0','67_1_1','75_1_2','82_1_0','86_1_1','115_1_0'],industry:['46_1_1','50_1_0','57_1_1','58_1_2','100_1_0','122_1_1']};report.selectedSourceDetails=selected;
    for(const group of GROUPS)for(const night of[false,true])for(const side of['before','after']){const rows=selected[group.id].map(id=>catalogs[side].find(r=>r.id===id));requireThat(rows.every(Boolean),'Missing named selected detail in '+group.id);const r=await pages[side].evaluate(a=>__detail634.sheet(a),{rows:pairedScale(rows,600,500,4),night,title:(side==='before'?'前版'+reviewBase.slice(0,7):'本版'+head.slice(0,7))+' / '+group.name+' / 建築細節',columns:3,cellW:600,cellH:500,maxScale:4});png(`selected-${group.id}-${night?'night':'day'}-${side}.png`,r.png,{kind:'named-source-closeups',group:group.id,side,night,designs:rows.map(r=>({id:r.id,name:r.name})),width:r.width,height:r.height});}
    async function pairedWorld(kind,center,zoom,subject){
      for(const night of[false,true]){const captures={};for(const side of['before','after'])captures[side]=await pages[side].evaluate(a=>__detail634.worldFrame(a),{center,zoom,night,rotation:0});const a=captures.before,b=captures.after;check(JSON.stringify(a.state)===JSON.stringify(b.state),kind+' '+(night?'night':'day')+' exact paired camera and visual state');const files={};for(const side of['before','after'])files[side]=png(`${captionName(kind)}-${night?'night':'day'}-${side}.png`,captures[side].png,{kind,side,night,center,zoom:captures[side].state.zoom,subject});report.pairs.push({kind,night,center,zoom:b.state.zoom,subject,files,beforeSHA256:a.sha256,afterSHA256:b.sha256,changed:a.sha256!==b.sha256,state:b.state});}
    }
    async function street(kind,actual){
      const setup={};for(const side of['before','after'])setup[side]=actual?await pages[side].evaluate(raw=>__detail634.loadFixture(raw),fixtureRaw):await pages[side].evaluate(()=>__detail634.synthetic());
      check(JSON.stringify(setup.before.roots)===JSON.stringify(setup.after.roots),kind+' has identical root catalog, variants and footprints');
      const signatures={};for(const side of['before','after'])signatures[side]=await pages[side].evaluate(()=>__detail634.rootSignature());check(signatures.before===signatures.after,kind+' exact building state before drawing');
      const camera=actual?await pages.before.evaluate(()=>__detail634.cameraProposal()):{x:30,y:30,score:null},center=[camera.x,camera.y];
      report[kind]={camera,rootCount:setup.before.roots.length,fixture:actual?report.fixture:null};await pairedWorld(kind+'-normal',center,1.5,{name:actual?'seed22實際密集街區':'合成住商工街區',densityScore:camera.score});
      const nearby=setup.before.roots.filter(r=>r.k<=3&&Math.abs(r.x-center[0])<=9&&Math.abs(r.y-center[1])<=9);let selectedRoots=[];
      for(const k of[1,2,3]){const candidates=nearby.filter(r=>r.k===k).sort((a,b)=>(Math.abs(a.x-center[0])+Math.abs(a.y-center[1]))-(Math.abs(b.x-center[0])+Math.abs(b.y-center[1]))||b.lv-a.lv||a.i-b.i);if(candidates.length)selectedRoots.push(candidates[0]);else report.checks.push(kind+' has no nearby k'+k+' closeup; no substitute city was fabricated');}
      requireThat(selectedRoots.length>0,'No actual buildings available for '+kind+' architectural detail');
      report[kind].selectedRoots=selectedRoots;
      if(!actual){report[kind].reportedRoots=[];for(const target of ADJACENCY_SUBJECTS.filter(r=>r.reported)){const r=setup.before.roots.find(r=>r.x===target.x&&r.y===target.y);requireThat(r&&r.id===target.id&&r.n===target.n,'Reported root is absent from unchanged original synthetic street: '+target.id);report[kind].reportedRoots.push(r);await pairedWorld(kind+'-reported-'+r.id,[r.x,r.y],3,{...r,reported:true,fixture:'unaltered original synthetic-street',name:r.name||r.id});}}
      for(const r of selectedRoots)await pairedWorld(kind+'-close-'+r.id,[r.x+(r.n-1)/2,r.y+(r.n-1)/2],3,{...r,name:r.name||r.id});
      for(const side of['before','after'])check(signatures[side]===await pages[side].evaluate(()=>__detail634.rootSignature()),kind+' '+side+' rendering leaves building records unchanged');
    }
    await street('synthetic-street',false);await street('seed22-dense-street',true);
    report.adjacency={description:'Exact reported root coordinates in an additional empty/single versus completely contiguous 3x3 block. Original synthetic and seed22 views above are retained unchanged.',subjects:ADJACENCY_SUBJECTS,scenes:[],frames:[],pairs:[],panels:[],limits:'Four map rotations retain the existing game sprite-facing convention. These are actual game-canvas frames, not four independently authored facade directions; true visual approval remains with the owner.'};
    for(const subject of ADJACENCY_SUBJECTS){
      const cameraByState=new Map(),terrainBySide={},representativeFrames=new Map();
      for(const mode of['isolated','dense']){
        const setup={};for(const side of['before','after'])setup[side]=await pages[side].evaluate(a=>__detail634.adjacency(a),{subject,mode});
        check(JSON.stringify(setup.before.roots)===JSON.stringify(setup.after.roots),'adjacency '+subject.id+' '+mode+' exact before/after roots, variants and lot coordinates');
        check(setup.before.roots.length===(mode==='dense'?9:1)&&setup.before.cells.length===(mode==='dense'?9:1),'adjacency '+subject.id+' '+mode+' contains exactly '+(mode==='dense'?'nine contiguous single-lot roots':'one isolated single-lot root'));
        if(mode==='dense')check([-1,0,1].every(dy=>[-1,0,1].every(dx=>setup.before.cells.some(c=>c.x===subject.x+dx&&c.y===subject.y+dy))),'adjacency '+subject.id+' dense fixture has no artificial gaps or duplicated lot occupancy');
        for(const side of['before','after']){
          if(mode==='isolated')terrainBySide[side]=setup[side].terrainRoadSignature;else check(terrainBySide[side]===setup[side].terrainRoadSignature,'adjacency '+subject.id+' '+side+' single/dense ground and road layout are identical');
          const{terrainRoadSignature,frozenSignature,...details}=setup[side];report.adjacency.scenes.push({subject:subject.id,side,commit:side==='before'?reviewBase:head,...details,terrainRoadSHA256:sha(terrainRoadSignature),frozenSceneSHA256:sha(frozenSignature)});
        }
        for(let rotation=0;rotation<4;rotation++)for(const night of[false,true]){
          const stateKey=rotation+'-'+night,captures={},records={};
          for(const side of['before','after']){
            const r=await pages[side].evaluate(a=>__detail634.adjacencyFrame(a),{subject,center:[subject.x,subject.y],zoom:3,night,rotation});captures[side]=r;
            const label='adjacency '+subject.id+' '+mode+' '+side+' r'+rotation+' '+(night?'night':'day');
            check(r.state.rotation===rotation&&r.state.zoom===3&&r.state.day===101&&r.state.season===1,label+' uses requested frozen summer camera');check(r.stable&&r.stateUnchanged,label+' repeats exact RGBA and leaves frozen day, speed, terrain, roads and building records unchanged');check(r.targetDraws.some(d=>d.layer==='day')&&r.targetVisiblePixels>20,label+' target source is actually drawn and contributes visible final-composite pixels');
            const{png:imageData,targetGeometry,...metrics}=r,record={subject:subject.id,k:subject.k,lv:subject.lv,v:subject.v,n:subject.n,lot:false,x:subject.x,y:subject.y,side,commit:side==='before'?reviewBase:head,sourceSHA256:report.source[side].sha256,mode,rotation,night,center:[subject.x,subject.y],...metrics,pngSHA256:sha(Buffer.from(imageData.split(',')[1],'base64'))};
            if(subject.reported)record.file=png(`adjacency-${subject.id}-${mode}-r${rotation}-${night?'night':'day'}-${side}.png`,imageData,{kind:'reported-root-adjacency',...record});
            else{if(!representativeFrames.has(stateKey))representativeFrames.set(stateKey,[]);representativeFrames.get(stateKey).push({png:imageData,label:(side==='before'?'前版'+reviewBase.slice(0,7):'本版'+head.slice(0,7))+' / '+mode+' / '+subject.id+' @ '+subject.x+','+subject.y,side,mode,record});}
            report.adjacency.frames.push(record);records[side]=record;
          }
          check(JSON.stringify(captures.before.state)===JSON.stringify(captures.after.state),'adjacency '+subject.id+' '+mode+' r'+rotation+' '+night+' exact before/after camera and lighting');
          if(mode==='isolated')cameraByState.set(stateKey,JSON.stringify(captures.before.state));else check(cameraByState.get(stateKey)===JSON.stringify(captures.before.state),'adjacency '+subject.id+' r'+rotation+' '+night+' exact isolated/dense camera and lighting');
          report.adjacency.pairs.push({subject:subject.id,mode,rotation,night,beforeSHA256:records.before.sha256,afterSHA256:records.after.sha256,changed:records.before.sha256!==records.after.sha256,files:subject.reported?{before:records.before.file,after:records.after.file}:null});persist();
        }
      }
      for(const[key,frames]of representativeFrames){const r=await pages.after.evaluate(a=>__detail634.framePanels(a),{frames:frames.map(({png,label})=>({png,label})),title:'複合量體 '+subject.id+' / rot '+key.split('-')[0]+' / '+(key.endsWith('true')?'夜':'日')}),file=png('adjacency-complex-'+subject.id+'-r'+key+'.png',r.png,{kind:'representative-multimass-adjacency',subject:subject.id,width:r.width,height:r.height,panels:r.panels});frames.forEach((frame,i)=>{frame.record.file=file;frame.record.panel=i;});report.adjacency.panels.push({subject:subject.id,state:key,file,panels:r.panels});}
    }
    check(report.adjacency.frames.length===96&&report.adjacency.frames.filter(r=>r.subject==='3_2_4').length===32&&report.adjacency.frames.filter(r=>r.subject==='1_1_5').length===32,'all reported and representative adjacency states captured: 3 subjects x 2 modes x 4 rotations x day/night x 2 immutable sources');
    report.runtime={};for(const side of['before','after']){const info=await pages[side].evaluate(()=>__detail634.errors());report.runtime[side]=info;check(info.failedBakes===0,side+' has zero candidate fallback bake errors');check(info.safety.wrongSlotWrites===0&&info.safety.blockedSaveCalls===0,side+' never targets player slots or calls the gameplay save API');check(info.safety.fixtureWrites===1,side+' loaded exactly one external fixture into temporary slot3');check(info.safety.blockedAutosaveRegistrations===1&&info.safety.blockedSaveWrites===0,side+' suppressed the autosave timer before registration and performed no gameplay save writes');}
    check(report.errors.length===0,'zero browser page exceptions');report.status=report.failures.length?'failed':'captured';writeReviewIndex();persist();
    console.log('T634_DETAIL_RESULT '+JSON.stringify({status:report.status,reviewBase,head,changed:report.changeCounts.all.changed,unchanged:report.changeCounts.all.unchanged,compared:report.assets.length,screenshots:report.screenshots.length,failures:report.failures,errors:report.errors}));if(report.failures.length)process.exitCode=1;
  }finally{for(const context of contexts)await context.close().catch(()=>{});if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));persist();}
}
function writeReviewIndex(){
  const c=report.changeCounts.all,lines=['# T634 建築接合與相鄰地塊：前版與本版真Chrome對照','',`前版：${reviewBase}`,`本版：${head}`,`瀏覽器：${report.browser.version}；同一執行環境、分開頁面、相同相機。`,'',`逐款比較315張主設計：日／夜任一層改變 ${c.changed} 款；兩層都未變 ${c.unchanged} 款。這是精確源圖像素比較，不把未改款式說成已重製。`,'','工程與美術定稿仍以完整驗收及業主判斷為準。本工具只交付本次修訂對照，不代替四季、疊層與模擬回歸。','','## 建議觀看順序','','1. synthetic-street-reported-3_2_4 與 synthetic-street-reported-1_1_5：保留原問題街景、原座標的日／夜前後比較。','2. adjacency-3_2_4 與 adjacency-1_1_5：同鏡頭單棟／九棟無縫相鄰街廓，四個地圖旋轉、日／夜、前後共64張。','3. adjacency-complex-1_3_9：複合量體的相同矩陣，以8張四格圖保留全部32個原始畫布雜湊。','4. synthetic-street-normal 與 seed22-dense-street-normal，以及兩組 street-close：原有同鏡頭街景與近景照留。','5. selected-rci/civic/industry 與 overview-rci/civic/industry：原有具名源圖細節及全部315款完整總覽。','','## 每類實際變動數','','| k | 主設計數 | 有變 | 未變 | 日圖變 | 夜圖變 |','|---:|---:|---:|---:|---:|---:|'];
  for(const [k,v]of Object.entries(report.changeCounts.byType))lines.push(`| ${k} | ${v.total} | ${v.changed} | ${v.unchanged} | ${v.dayChanged} | ${v.nightChanged} |`);
  lines.push('','## 未變款式（完整列出）','',c.unchangedIDs.length?c.unchangedIDs.join(', '):'本次比較未發現日／夜兩層均未變的款式。','','## 真實街景配對','');
  for(const p of report.pairs)lines.push(`- ${p.kind} / ${p.night?'夜':'日'} / ${p.subject.name} / 相機(${p.center.join(',')}) zoom=${p.zoom}： [前版](${p.files.before}) / [本版](${p.files.after})`);
  lines.push('','## 原問題量體接合檢查','', '下列數字直接取不可變來源中的RCI m陣列、獨立計算基座接觸與相交；不把語義宣告或足跡內像素當作屋頂遮擋已正確。全315款保留日／夜源圖與hooks，108款RCI另存完整m陣列、範圍及兩兩交集。', '');
  for(const r of report.attachmentChecks)lines.push(`- ${r.id} / k${r.k} lv${r.lv} v${r.v} / 原root(${r.originalRoot.x},${r.originalRoot.y}) n=${r.originalRoot.n}：前版首項=${r.before.firstFailure}；本版=${r.after.ok?'幾何接合檢查通過':r.after.firstFailure}；牆面=${r.after.face}；間距=${r.after.gap}；共用牆長=${r.after.sharedEdge}；基座相交面積=${r.after.interiorArea}；還原舊附屋紅源首項=${r.negativeControl.result.firstFailure}。`);
  lines.push('','## 相鄰地塊實拍矩陣','', report.adjacency.description, '', '四向指遊戲既有的四種地圖旋轉，未冒充四套獨立立面。單棟／密集場景的道路、地面、鏡頭、光照完全相同；密集組只增加八個緊鄰root。每幀另驗重畫RGBA穩定、實際目標繪製與反事實移除目標後的可見像素、凍結建築與日期不變。', '');
  for(const p of report.adjacency.pairs.filter(p=>p.files))lines.push(`- ${p.subject} / ${p.mode} / rot${p.rotation} / ${p.night?'夜':'日'}：[前版](${p.files.before}) / [本版](${p.files.after})`);
  for(const p of report.adjacency.panels)lines.push(`- ${p.subject} / ${p.state}：[單棟與相鄰前後四格圖](${p.file})`);
  lines.push('','## 全部圖片索引','');for(const s of report.screenshots)lines.push(`- [${s.file}](${s.file})`);
  lines.push('','逐款日圖／夜圖RGBA SHA-256、頁面錯誤、source hash、fixture hash、原問題root、完整RCI量體、相鄰地塊每幀相機／原始RGBA與PNG雜湊、具名選樣與源圖比較數都在 summary.json。','');fs.writeFileSync(path.join(OUT,'REVIEW.md'),lines.join('\n'));
}
