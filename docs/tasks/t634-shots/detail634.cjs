// T634 detail revision: real Chrome compares two immutable candidate snapshots.
// REVIEW_BASE634 supplies the owner-requested first-candidate commit. No release hash is embedded here.
// Disposable browser contexts and slot3 only; this script never advances simulation or calls GV.save.
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),{execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..'),OUT=path.resolve(process.env.OUT634||'evidence/t634-detail'),CHECK_ONLY=process.argv.includes('--check');
const gitRaw=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:30e6});
const git=(...args)=>gitRaw(...args).trimEnd();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function requireThat(ok,message){if(!ok)throw Error(message);}
const reviewRef=process.env.REVIEW_BASE634;
requireThat(reviewRef&&/^[0-9a-f]{40}$/i.test(reviewRef),'REVIEW_BASE634 must be the full immutable first-candidate commit supplied by the workflow.');
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
const GROUPS=[{id:'rci',name:'住宅・高街商業・工業街屋'},{id:'civic',name:'公共建築・休閒與地標'},{id:'industry',name:'能源・工業與基礎設施'}];
const report={kind:'real-Chrome first-candidate versus detail-revision',status:'running',reviewBase,head,
  source:{before:{commit:reviewBase,sha256:sha(beforeSource)},after:{commit:head,sha256:sha(afterSource),matchesCommit:afterSource===gitRaw('show',head+':index.html')},harnessSHA256:sha(fs.readFileSync(__filename)),sharedBridgeSHA256:sha(sharedBridge)},
  fixture:{path:path.relative(ROOT,fixturePath),sha256:sha(fixtureRaw),seed:22},variantLabelLedgerSHA256:ledger?sha(fs.readFileSync(ledgerPath)):null,
  scope:'Source-rendered primary315 designs at summer/stage2/wealth1, plus paired frozen synthetic and actual seed22 streets. Not full seasonal or simulation acceptance.',
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
  const frameState=()=>({mapSize:N,day,season:season(),rotation:viewRotEff(),zoom:cam.z,visT,rainDays,weather,camX:cam.x,camY:cam.y});
  window.__detail634={
    catalog:()=>{const rows=[];for(const k of [...REMAIN634].sort((a,b)=>a-b))for(let lv=1;lv<=(k<=3?3:1);lv++)for(let v=0;v<(k<=3?12:3);v++)rows.push({id:k+'_'+lv+'_'+v,k,lv,v,n:LOT_PLAN574[k][1],name:nameOf(k,lv,v),group:k<=3?'rci':Object.prototype.hasOwnProperty.call(CIVIC634,k)?'civic':'industry'});return rows;},
    fingerprints:async rows=>{baseState();GV.setSeason(1);const out=[];for(const r of rows){const s=sprite(r);out.push({...r,w:s.w,h:s.h,ax:s.ax,ay:s.ay,daySHA256:await hash(s.img),nightSHA256:await hash(s.night),hooks:s.lotMeta574.hooks});}return out;},
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
function png(name,value,metadata={}){requireThat(/^data:image\/png;base64,/.test(value),'Expected actual browser PNG: '+name);const bytes=Buffer.from(value.split(',')[1],'base64');fs.writeFileSync(path.join(OUT,name),bytes);report.screenshots.push({file:name,sha256:sha(bytes),...metadata});return name;}
function captionName(s){return s.replace(/[^a-zA-Z0-9_-]/g,'-');}
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
    for(const row of catalogs.after){const a=bySide.before.get(row.id),b=bySide.after.get(row.id),sizeChanged=a.w!==b.w||a.h!==b.h,dayChanged=sizeChanged||a.daySHA256!==b.daySHA256,nightChanged=sizeChanged||a.nightSHA256!==b.nightSHA256;report.assets.push({id:row.id,k:row.k,group:row.group,nameBefore:a.name,nameAfter:b.name,dayChanged,nightChanged,changed:dayChanged||nightChanged,geometryOrHooksChanged:JSON.stringify([a.w,a.h,a.ax,a.ay,a.hooks])!==JSON.stringify([b.w,b.h,b.ax,b.ay,b.hooks]),before:a,after:b});}
    const count=rows=>({total:rows.length,changed:rows.filter(r=>r.changed).length,unchanged:rows.filter(r=>!r.changed).length,dayChanged:rows.filter(r=>r.dayChanged).length,nightChanged:rows.filter(r=>r.nightChanged).length,unchangedIDs:rows.filter(r=>!r.changed).map(r=>r.id)});
    report.changeCounts={all:count(report.assets),byGroup:Object.fromEntries(GROUPS.map(g=>[g.id,count(report.assets.filter(r=>r.group===g.id))])),byType:Object.fromEntries([...new Set(report.assets.map(r=>r.k))].map(k=>[k,count(report.assets.filter(r=>r.k===k))]))};
    check(report.assets.length===315,'315 primary source-render comparisons recorded individually');check(report.changeCounts.all.changed>0,'revision changes at least one primary rendered design; unchanged designs remain explicitly listed');persist();
    const pairedScale=(rows,w,h,max)=>rows.map(r=>({...r,reviewScale:Math.min(max,(w-20)/Math.max(bySide.before.get(r.id).w,bySide.after.get(r.id).w),(h-58)/Math.max(bySide.before.get(r.id).h,bySide.after.get(r.id).h))}));
    for(const group of GROUPS)for(const night of[false,true])for(const side of['before','after']){const rows=pairedScale(catalogs[side].filter(r=>r.group===group.id),200,250,1.8),r=await pages[side].evaluate(a=>__detail634.sheet(a),{rows,night,title:(side==='before'?'前版':'細化版')+' / '+group.name});png(`overview-${group.id}-${night?'night':'day'}-${side}.png`,r.png,{kind:'complete-source-overview',group:group.id,side,night,count:rows.length,width:r.width,height:r.height});}
    const selected={rci:['1_1_1','1_2_5','1_3_9','2_2_4','2_3_3','3_3_3'],civic:['24_1_0','67_1_1','75_1_2','82_1_0','86_1_1','115_1_0'],industry:['46_1_1','50_1_0','57_1_1','58_1_2','100_1_0','122_1_1']};report.selectedSourceDetails=selected;
    for(const group of GROUPS)for(const night of[false,true])for(const side of['before','after']){const rows=selected[group.id].map(id=>catalogs[side].find(r=>r.id===id));requireThat(rows.every(Boolean),'Missing named selected detail in '+group.id);const r=await pages[side].evaluate(a=>__detail634.sheet(a),{rows:pairedScale(rows,600,500,4),night,title:(side==='before'?'前版':'細化版')+' / '+group.name+' / 建築細節',columns:3,cellW:600,cellH:500,maxScale:4});png(`selected-${group.id}-${night?'night':'day'}-${side}.png`,r.png,{kind:'named-source-closeups',group:group.id,side,night,designs:rows.map(r=>({id:r.id,name:r.name})),width:r.width,height:r.height});}
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
      for(const r of selectedRoots)await pairedWorld(kind+'-close-'+r.id,[r.x+(r.n-1)/2,r.y+(r.n-1)/2],3,{...r,name:r.name||r.id});
      for(const side of['before','after'])check(signatures[side]===await pages[side].evaluate(()=>__detail634.rootSignature()),kind+' '+side+' rendering leaves building records unchanged');
    }
    await street('synthetic-street',false);await street('seed22-dense-street',true);
    report.runtime={};for(const side of['before','after']){const info=await pages[side].evaluate(()=>__detail634.errors());report.runtime[side]=info;check(info.failedBakes===0,side+' has zero candidate fallback bake errors');check(info.safety.wrongSlotWrites===0&&info.safety.blockedSaveCalls===0,side+' never targets player slots or calls the gameplay save API');check(info.safety.fixtureWrites===1,side+' loaded exactly one external fixture into temporary slot3');check(info.safety.blockedAutosaveRegistrations===1&&info.safety.blockedSaveWrites===0,side+' suppressed the autosave timer before registration and performed no gameplay save writes');}
    check(report.errors.length===0,'zero browser page exceptions');report.status=report.failures.length?'failed':'captured';writeReviewIndex();persist();
    console.log('T634_DETAIL_RESULT '+JSON.stringify({status:report.status,reviewBase,head,changed:report.changeCounts.all.changed,unchanged:report.changeCounts.all.unchanged,compared:report.assets.length,screenshots:report.screenshots.length,failures:report.failures,errors:report.errors}));if(report.failures.length)process.exitCode=1;
  }finally{for(const context of contexts)await context.close().catch(()=>{});if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));persist();}
}
function writeReviewIndex(){
  const c=report.changeCounts.all,lines=['# T634 建築細化：前版與本版實拍對照','',`前版：${reviewBase}`,`本版：${head}`,`瀏覽器：${report.browser.version}；同一執行環境、分開頁面、相同相機。`,'',`逐款比較315張主設計：日／夜任一層改變 ${c.changed} 款；兩層都未變 ${c.unchanged} 款。這是精確源圖像素比較，不把未改款式說成已細化。`,'','工程與美術定稿仍以完整驗收及業主判斷為準。本工具只交付本次修訂對照，不代替四季、疊層與模擬回歸。','','## 建議觀看順序','','1. synthetic-street-normal 與 seed22-dense-street-normal：同鏡頭日／夜正常街景。','2. 兩組 street-close：實際建築座標、目錄名稱與近景日／夜。','3. selected-rci/civic/industry：具名選取建築的源圖細節。','4. overview-rci/civic/industry：全部315款源圖的三組完整總覽。','','## 每類實際變動數','','| k | 主設計數 | 有變 | 未變 | 日圖變 | 夜圖變 |','|---:|---:|---:|---:|---:|---:|'];
  for(const [k,v]of Object.entries(report.changeCounts.byType))lines.push(`| ${k} | ${v.total} | ${v.changed} | ${v.unchanged} | ${v.dayChanged} | ${v.nightChanged} |`);
  lines.push('','## 未變款式（完整列出）','',c.unchangedIDs.length?c.unchangedIDs.join(', '):'本次比較未發現日／夜兩層均未變的款式。','','## 真實街景配對','');
  for(const p of report.pairs)lines.push(`- ${p.kind} / ${p.night?'夜':'日'} / ${p.subject.name} / 相機(${p.center.join(',')}) zoom=${p.zoom}： [前版](${p.files.before}) / [本版](${p.files.after})`);
  lines.push('','## 全部圖片索引','');for(const s of report.screenshots)lines.push(`- [${s.file}](${s.file})`);
  lines.push('','逐款日圖／夜圖RGBA SHA-256、頁面錯誤、source hash、fixture hash、具名選樣與源圖比較數都在 summary.json。','');fs.writeFileSync(path.join(OUT,'REVIEW.md'),lines.join('\n'));
}
