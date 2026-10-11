// T634 發佈啟用補充驗證：已批准 immutable git 圖像，對正常無 query 進站逐 RGBA 位元比對。
// CI: APPROVED_BASE634=<full approved commit> CHROME_PATH=/usr/bin/google-chrome node docs/tasks/t634-shots/release634.cjs
// --self-test 只驗工具；--check 只驗 immutable 來源／注入語法。兩者絕不啟動瀏覽器或監聽 socket。
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm'),{execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..'),OUT=path.resolve(process.env.OUT634||'evidence/t634-release');
const SOURCE_PATH='index.html',BRIDGE_PATH='docs/tasks/t634-shots/scene634.cjs',INVENTORY_PATH='docs/tasks/t634-shots/asset-coverage-baseline.json',FIXTURE_PATH='docs/tasks/t603-shots/fixtures/seed22-d3-420-v11.211.json';
const VIEWPORT={width:1800,height:1120},SCENES=['street','civic','industry','legacy','seed22'];
// 原有獨立六哨兵：不是由新頁面產生或更新的期望值。
const SENTINELS=[{seed:301,pop:780,money:2297},{seed:7,pop:117,money:77},{seed:22,pop:639,money:14523}];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const gitRaw=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:40e6});
const git=(...args)=>gitRaw(...args).trimEnd();
function need(ok,message){if(!ok)throw Error(message);}
function once(s,anchor,label=anchor){need(s.split(anchor).length===2,'Expected exactly one '+label);return s.indexOf(anchor);}
function bridgeFrom(s){
  const a=once(s,'function bridge634(){','scene bridge start'),b=once(s,'\nconst inject=','scene bridge end');
  need(b>a,'Reversed scene bridge anchors');const body=s.slice(a,b).trim();
  need(body.endsWith('\n}'),'Unexpected scene bridge boundary');new Function('return ('+body+');');
  return body;
}
function flagLine(s){const lines=s.split('\n').filter(l=>l.startsWith('function t634On(){'));need(lines.length===1,'Expected one single-line activation function');new Function(lines[0]);return lines[0];}
function redSource(s,kind){
  const old=flagLine(s),anchor=kind==='default-off'?'window.__t634!==false':kind==='url-bypass'?'!t634On.off&&':'!window.__noT634&&';
  once(old,anchor,'red-source target '+kind);const replacement=kind==='default-off'?'window.__t634===true':'';
  return s.replace(old,old.replace(anchor,replacement));
}
function scriptsParse(html,label){const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);need(scripts.length>0,'No inline scripts in '+label);for(const s of scripts)new Function(s);}
// 只讀原生繪製狀態；計數與實際 drawImage 完整透傳，任何退出路徑均復原原函式。
function countFilterDraws634(g,draw){
  const original=g.drawImage,counts={reflection:0,shadow:0};
  g.drawImage=function(...args){if(this.filter==='brightness(0)')counts[this.getTransform().d<0?'reflection':'shadow']++;return original.apply(this,args);};
  try{return{value:draw(),counts};}finally{g.drawImage=original;}
}
function inject(s,sharedBridge){
  once(s,'window.GV={','GV injection anchor');const count=s.split('requestAnimationFrame(frame);').length-1;
  need(count===2,'Expected both initial and recurring frame-loop anchors');
  return s.replace('window.GV={','('+sharedBridge+')();('+releaseBridge634.toString()+')('+countFilterDraws634.toString()+');window.GV={').replaceAll('requestAnimationFrame(frame);','if(!window.__freeze634)requestAnimationFrame(frame);');
}
function rawPixels(c){
  need(Number.isInteger(c.width)&&c.width>0&&Number.isInteger(c.height)&&c.height>0&&typeof c.rgba==='string','Missing native canvas RGBA');
  const bytes=Buffer.from(c.rgba,'base64');need(bytes.length===c.width*c.height*4,'Truncated native canvas RGBA');return bytes;
}
function pixelResult(actual,expected){
  const a=rawPixels(actual),b=expected.bytes;const shape=actual.width===expected.width&&actual.height===expected.height;
  return {equal:shape&&a.equals(b),width:actual.width,height:actual.height,bytes:a.length,sha256:sha(a),expectedSHA256:sha(b),dimensionsEqual:shape};
}
// 正常與紅源共用同一個「首紅」判定；不能用另一套假判準宣稱紅源有效。
function firstModeFailure({boot,frame,expectedOn,expectedExplicit,guard,pixelsEqual}){
  if(boot.slot!==3||frame.slot!==3||!boot.freeze||!frame.freeze)return 'slot-and-freeze';
  if(boot.explicit!==expectedExplicit||frame.explicit!==expectedExplicit)return 'activation-fixture';
  if(boot.on!==expectedOn||frame.on!==expectedOn||!pixelsEqual)return guard;
  return null;
}
function releaseBridge634(countFilterDraws){
  // 所有設施／街景建立沿用 immutable scene bridge；這個 wrapper 從不寫 __t634。
  const freeze=()=>{window.__freeze634=true;running=false;speed=0;for(const a of[cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;for(let i=0;i<stars.length;i++)stars[i]=[(i*37%100)/100,(i*13%80)/100,(i*19%628)/100];};
  const flags=()=>({on:typeof t634On==='function'?t634On():false,slot:curSlot(),freeze:window.__freeze634===true,explicit:Object.prototype.hasOwnProperty.call(window,'__t634')?String(window.__t634):'absent',escape:window.__noT634===true,escapeExplicit:Object.prototype.hasOwnProperty.call(window,'__noT634')?String(window.__noT634):'absent',query:location.search});
  const raw=c=>{if(!(c instanceof HTMLCanvasElement))throw Error('Expected native HTMLCanvasElement');const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return{width:c.width,height:c.height,rgba:btoa(s)};};
  const signature=()=>JSON.stringify({N,day,running,speed,tiles});
  const baseState=()=>{freeze();quality=1;window.__noAnim=false;window.__noParkLife=false;window.__noChimney=false;window.__noT596=true;selTile=null;hover.x=hover.y=-1;tool='pan';weather=0;rainDays=0;};
  let lifecycle='measuring';
  const realSave=save;save=()=>{if(lifecycle!=='measuring'||!window.__release634Simulation||!window.__release634Saving){window.__release634Safety.blockedSaveCalls++;throw Error('Only the explicit disposable simulation lane may save');}window.__release634Safety.allowedSaveCalls++;return realSave();};
  window.__release634={
    flags,
    assets:rows=>{baseState();GV.setSeason(1);return rows.map(r=>{const s=bake634(r.k,r.v,r.n,r.lv,1,2,false,1);if(!s||!s.img||!s.night||!s.__t634)throw Error('Missing actual T634 sprite '+r.id);return{id:r.id,k:r.k,lv:r.lv,v:r.v,n:r.n,w:s.w,h:s.h,ax:s.ax,ay:s.ay,hooks:s.lotMeta574.hooks,day:raw(s.img),night:raw(s.night)};});},
    catalog:()=>[...REMAIN634].sort((a,b)=>a-b).flatMap(k=>Array.from({length:k<=3?3:1},(_,l)=>Array.from({length:k<=3?12:3},(_,v)=>({id:k+'_'+(l+1)+'_'+v,k,lv:l+1,v,n:LOT_PLAN574[k][1]}))).flat()),
    setup:({scene,fixture})=>{
      const initial=flags();
      if(scene==='seed22'){
        window.__release634Loading=true;try{__qa634.load(fixture);}finally{window.__release634Loading=false;localStorage.removeItem('glimmerville.v1.s3');}
      }else __qa634.rig(scene,scene==='legacy');
      baseState();GV.setSeason(1);document.getElementById('start').classList.add('hide');
      let center=scene==='street'?[30,30]:[31,32],zoom=scene==='street'?2:.55;
      if(scene==='seed22'){let best={x:N/2,y:N/2,score:-1};for(let y=8;y<N-8;y+=2)for(let x=8;x<N-8;x+=2){let score=0;for(let yy=y-7;yy<=y+7;yy++)for(let xx=x-7;xx<=x+7;xx++){const b=T(idx(xx,yy)).bld;if(b&&!b.ref)score+=b.k<=3?2:1;}if(score>best.score)best={x,y,score};}center=[best.x,best.y];zoom=2;}
      const roots=tiles.flatMap((t,i)=>t.bld&&!t.bld.ref?[{x:i%N,y:Math.floor(i/N),...t.bld}]:[]);
      return{scene,center,zoom,roots,signature:signature(),initial,final:flags()};
    },
    signature,
    frame:({center,zoom,rotation,night})=>{
      baseState();GV.setRot(rotation);GV.setZoom(zoom);GV.lookAt(center[0],center[1]);
      const draw=()=>{visT=night?5:55;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';GV.forceDraw();};
      const before=signature(),firstDraw=countFilterDraws(ctx,draw),first=ctx.getImageData(0,0,cvs.width,cvs.height).data,secondDraw=countFilterDraws(ctx,draw),second=ctx.getImageData(0,0,cvs.width,cvs.height).data;
      let unstableBytes=0;for(let i=0;i<first.length;i++)if(first[i]!==second[i])unstableBytes++;
      return{...raw(cvs),png:cvs.toDataURL('image/png'),flags:flags(),filterDraws:firstDraw.counts,repeatFilterDraws:secondDraw.counts,unstableBytes,stateUnchanged:before===signature(),state:{N,day,season:season(),rotation:viewRotEff(),zoom:cam.z,camX:cam.x,camY:cam.y,visT,rainDays,weather}};
    },
    simulation:({seed})=>{
      if(!window.__release634Simulation)throw Error('Simulation lane was not explicitly enabled in this disposable context');
      const beforeFlags=flags();GV.setMapSize(72);GV.newWorldSeeded(seed);GV.setDiff(1);GV.ai(true);for(let d=0;d<400;d++)GV.step(1);GV.ai(false);
      const stats=GV.stats(),afterSimulationFlags=flags();freeze();quality=1;document.getElementById('start').classList.add('hide');
      const i=tiles.findIndex(t=>t.bld&&!t.bld.ref&&REMAIN634.has(t.bld.k));if(i<0)throw Error('Sentinel city has no approved-art target');
      const target={x:i%N,y:Math.floor(i/N),k:T(i).bld.k};GV.setZoom(2);GV.lookAt(target.x,target.y);
      const captureSave=()=>{window.__release634Saving=true;try{GV.save();}finally{window.__release634Saving=false;}const raw=localStorage.getItem('glimmerville.v1.s3');if(!raw)throw Error('Missing real disposable slot3 save');return saveInflate(JSON.parse(raw));};
      const changed=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>!['ts','gameVer'].includes(k)&&JSON.stringify(a[k])!==JSON.stringify(b[k]));
      try{
        const before=captureSave(),worldBefore=signature(),drawn=new Set(),originalDraw=ctx.drawImage;ctx.drawImage=function(img,...args){drawn.add(img);return originalDraw.call(this,img,...args);};
        try{for(const time of[55,5]){visT=time;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;GV.forceDraw();}}finally{ctx.drawImage=originalDraw;}
        const candidateDraws=[...CACHE634.values(),...lotCache574.values()].filter(s=>s.__t634&&drawn.has(s.img)).length,renderUnchanged=worldBefore===signature(),afterDraw=captureSave(),drawFlags=flags();
        if(!GV.load())throw Error('Real disposable slot3 reload rejected');freeze();const afterLoad=captureSave(),finalFlags=flags();
        return{seed,mapSize:N,steps:400,stats:{pop:stats.pop,money:Math.round(stats.money)},beforeFlags,afterSimulationFlags,drawFlags,finalFlags,target,candidateDraws,renderUnchanged,drawChanges:changed(before,afterDraw),roundTripChanges:changed(afterDraw,afterLoad),before,afterDraw,afterLoad};
      }finally{localStorage.removeItem('glimmerville.v1.s3');localStorage.removeItem('glimmerville.v1.s3_bak');}
    },
    // 完成量測與安全計數核對後才銷毀測試世界。原 visibilitychange listener 留在場；
    // 關頁時它按原有 `document.hidden&&tiles` 條件自然不儲存，不吞例外、不放行 save。
    disposeWorld:()=>{
      if(lifecycle!=='measuring')throw Error('Disposable world was already closed');
      if(window.__release634Loading||window.__release634Saving)throw Error('Cannot dispose a live fixture load/save');
      const countersBefore={...window.__release634Safety},guard=save,worldWasPresent=!!tiles;
      lifecycle='disposed';running=false;speed=0;tiles=null;
      return{phase:lifecycle,worldWasPresent,worldCleared:tiles===null,saveGuardUnchanged:save===guard,countersBefore,countersAfter:{...window.__release634Safety}};
    },
    runtimeEscape:value=>{window.__noT634=value;return flags();},
    safety:()=>({...window.__release634Safety,slot:curSlot(),savePresent:localStorage.getItem('glimmerville.v1.s3')!==null,backupPresent:localStorage.getItem('glimmerville.v1.s3_bak')!==null,failedBakes:typeof STAT634==='undefined'?0:STAT634.fail})
  };
  // 量測結束後不得再用這個 context 產生新證據，也不能把銷毀世界當成禁存檔的替代品。
  for(const name of['assets','catalog','setup','signature','frame','simulation','runtimeEscape']){
    const call=window.__release634[name];window.__release634[name]=(...args)=>{if(lifecycle!=='measuring')throw Error('Measurement requested after disposable world closure');return call(...args);};
  }
}
function lifecycleSelfTest(source){
  const listener="document.addEventListener('visibilitychange',()=>{if(document.hidden&&tiles)save();});";
  once(source,listener,'original visibility autosave listener');
  let listenerCall,realSaves=0;
  const counters=()=>({blockedSaveCalls:0,allowedSaveCalls:0});
  const context=vm.createContext({window:{__release634Simulation:false,__release634Saving:false,__release634Safety:counters()},tiles:[{}],running:true,speed:1,save:()=>{realSaves++;},document:{hidden:true,addEventListener:(type,fn)=>{need(type==='visibilitychange','Unexpected lifecycle event');listenerCall=fn;}}});
  vm.runInContext('('+releaseBridge634.toString()+')('+countFilterDraws634.toString()+');'+listener,context);
  // 紅源一：若關頁發生在量測期間，真實 listener 仍碰到原有 fail-closed 存檔守衛。
  let activeFailure='';try{listenerCall();}catch(e){activeFailure=e.message;}
  need(activeFailure==='Only the explicit disposable simulation lane may save'&&context.window.__release634Safety.blockedSaveCalls===1&&realSaves===0,'Active visibility autosave must remain rejected');
  // 活躍 save/load 中不能提前清世界來繞過安全檢查。
  context.window.__release634Saving=true;let earlyFailure='';try{context.window.__release634.disposeWorld();}catch(e){earlyFailure=e.message;}
  need(earlyFailure==='Cannot dispose a live fixture load/save'&&context.tiles!==null,'Active save teardown must fail closed');context.window.__release634Saving=false;
  const disposal=context.window.__release634.disposeWorld();listenerCall();
  need(disposal.phase==='disposed'&&disposal.worldWasPresent&&disposal.worldCleared&&disposal.saveGuardUnchanged&&JSON.stringify(disposal.countersBefore)===JSON.stringify(disposal.countersAfter)&&context.window.__release634Safety.blockedSaveCalls===1&&realSaves===0,'Completed disposal must make original visibility autosave inert without changing counters or its save guard');
  // 紅源二：銷毀後即使偽造 simulation/save 旗標，也不能重新寫檔或產生量測。
  context.window.__release634Simulation=true;context.window.__release634Saving=true;let closedSaveFailure='',closedMeasureFailure='';
  try{vm.runInContext('save()',context);}catch(e){closedSaveFailure=e.message;}
  try{context.window.__release634.assets([]);}catch(e){closedMeasureFailure=e.message;}
  need(closedSaveFailure==='Only the explicit disposable simulation lane may save'&&realSaves===0&&closedMeasureFailure==='Measurement requested after disposable world closure','Disposed save and measurement red controls must fail closed');
  return{activeVisibilityRejected:true,liveSaveDisposalRejected:true,disposedVisibilityInert:true,saveGuardUnchanged:true,disposedSaveRejected:true,disposedMeasurementRejected:true};
}
// 同一實際 spy 的独立規格測試；紅源只在記憶體中改 helper，不能修改測試期望值。
function filterSpyFirstFailure(spy){
  const image={},result={},sentinel={},calls=[],returns=[],cases=[
    {filter:'none',d:-1,args:[image,-.75,2.25]},
    {filter:'brightness(0)',d:-.35,args:[image,-1.5,2.75,31.5,15.25]},
    {filter:'brightness(0)',d:1,args:[image,1.25,2.5,3.75,4.25,-5.5,6.75,7.25,8.5]},
    {filter:'brightness(0)',d:0,args:[image,1,2]}
  ];
  let transformReads=0;const g={filter:'none',d:1,getTransform(){transformReads++;return{d:this.d};},drawImage:function(...args){calls.push({receiver:this,args});return result;}},original=g.drawImage;
  const measured=spy(g,()=>{for(const c of cases){g.filter=c.filter;g.d=c.d;returns.push(g.drawImage(...c.args));}return sentinel;});
  if(calls.length!==cases.length||calls.some((c,i)=>c.receiver!==g||c.args.length!==cases[i].args.length||c.args.some((v,j)=>v!==cases[i].args[j]))||returns.some(v=>v!==result)||measured.value!==sentinel)return 'filter-spy-forwarding';
  if(g.drawImage!==original)return 'filter-spy-restoration';
  if(measured.counts.reflection!==1||measured.counts.shadow!==2||transformReads!==3)return 'filter-spy-branch';
  for(const fromDrawImage of[true,false]){
    const error=Error('intentional spy exception'),throwing={filter:'brightness(0)',getTransform:()=>({d:-1}),drawImage(){if(fromDrawImage)throw error;return result;}},prior=throwing.drawImage;let caught;
    try{spy(throwing,()=>{if(fromDrawImage)return throwing.drawImage(image,0,0);throw error;});}catch(e){caught=e;}
    if(caught!==error||throwing.drawImage!==prior)return 'filter-spy-exception-restoration';
  }
  return null;
}
function filterSpySelfTest(){
  need(filterSpyFirstFailure(countFilterDraws634)===null,'Filter spy must preserve all drawImage overloads, receiver, return values, classification and restoration');
  const source=countFilterDraws634.toString(),mutations=[
    {name:'changed-forwarded-coordinate',anchor:'original.apply(this,args)',replacement:'original.apply(this,args.map((v,i)=>i===1?v+1:v))',expected:'filter-spy-forwarding'},
    {name:'inverted-transform-classification',anchor:'this.getTransform().d<0',replacement:'this.getTransform().d>=0',expected:'filter-spy-branch'},
    {name:'omitted-original-restoration',anchor:'g.drawImage=original;',replacement:'void original;',expected:'filter-spy-restoration'}
  ];
  const redControls=[];for(const r of mutations){once(source,r.anchor,'spy red-source '+r.name);const broken=vm.runInNewContext('('+source.replace(r.anchor,r.replacement)+')'),firstFailure=filterSpyFirstFailure(broken);need(firstFailure===r.expected,'Spy red-source first failure must be '+r.expected);redControls.push({mutation:r.name,firstFailure});}
  return{overloads:[3,5,9],receiverAndReturnPreserved:true,classification:{reflection:1,shadow:2,nonFilterIgnored:1},normalAndExceptionalRestoration:true,redControls};
}
function selfTest(){
  const source=fs.readFileSync(path.join(ROOT,SOURCE_PATH),'utf8'),shared=bridgeFrom(fs.readFileSync(path.join(ROOT,BRIDGE_PATH),'utf8'));
  const lifecycle=lifecycleSelfTest(source),filterSpy=filterSpySelfTest();scriptsParse(inject(source,shared),'local injected source');
  for(const kind of['default-off','url-bypass','runtime-bypass'])scriptsParse(inject(redSource(source,kind),shared),kind);
  const flag=flagLine(source),probe=(line,query='',values={})=>vm.runInNewContext(line+';t634On()', {window:{...values},location:{search:query}});
  need(probe(flag)===true&&probe(flag,'',{__t634:true})===true&&probe(flag,'',{__t634:false})===false,'Activation static behavior self-test');
  need(probe(flag,'?T634=1')===true&&probe(flag,'?noT634=1')===false&&probe(flag,'?T634=1&noT634=1',{__t634:true})===false&&probe(flag,'',{__noT634:true})===false,'Escape static behavior self-test');
  need(probe(flagLine(redSource(source,'default-off')))===false&&probe(flagLine(redSource(source,'url-bypass')),'?noT634=1')===true&&probe(flagLine(redSource(source,'runtime-bypass')),'',{__noT634:true})===true,'Red-source static behavior self-test');
  const capture={width:1,height:1,rgba:Buffer.from([1,2,3,255]).toString('base64')},expected={width:1,height:1,bytes:Buffer.from([1,2,3,255])};
  need(pixelResult(capture,expected).equal,'Exact RGBA self-test');capture.rgba=Buffer.from([1,2,4,255]).toString('base64');need(!pixelResult(capture,expected).equal,'Single-channel red pixel self-test');
  const boot={slot:3,freeze:true,explicit:'absent',on:true};
  need(firstModeFailure({boot,frame:boot,expectedOn:true,expectedExplicit:'absent',guard:'default-activation',pixelsEqual:true})===null,'Positive first-guard self-test');
  for(const guard of['default-activation','url-escape','runtime-escape'])need(firstModeFailure({boot,frame:boot,expectedOn:true,expectedExplicit:'absent',guard,pixelsEqual:false})===guard,'Pixel red first-guard self-test '+guard);
  console.log(JSON.stringify({status:'static-tool-self-test-only',browserStarted:false,socketOpened:false,immutableApprovalChecked:false,renderParityVerified:false,lifecycle,filterSpy}));
}
async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  need(process.env.APPROVED_BASE634&&/^[0-9a-f]{40}$/.test(process.env.APPROVED_BASE634),'APPROVED_BASE634 must name the full immutable owner-approved commit; no moving-ref or current-source fallback is allowed');
  const approved=git('rev-parse',process.env.APPROVED_BASE634+'^{commit}'),head=git('rev-parse','HEAD');need(approved===process.env.APPROVED_BASE634,'Approval reference did not resolve exactly');
  git('merge-base','--is-ancestor',approved,head);
  const approvedSource=gitRaw('show',approved+':'+SOURCE_PATH),releaseSource=fs.readFileSync(path.join(ROOT,SOURCE_PATH),'utf8');
  need(releaseSource===gitRaw('show',head+':'+SOURCE_PATH),'Release index.html must exactly match HEAD before any evidence is recorded');
  need(fs.readFileSync(__filename,'utf8')===gitRaw('show',head+':docs/tasks/t634-shots/release634.cjs'),'Release harness must exactly match HEAD');
  const bridgeSource=gitRaw('show',approved+':'+BRIDGE_PATH),sharedBridge=bridgeFrom(bridgeSource),inventoryRaw=gitRaw('show',approved+':'+INVENTORY_PATH),inventory=JSON.parse(inventoryRaw),fixture=gitRaw('show',approved+':'+FIXTURE_PATH);
  need(/^[0-9a-f]{40}$/.test(inventory.audit.head),'Original art inventory must identify an immutable pre-T634 source');
  const baseline=git('rev-parse',inventory.audit.head+'^{commit}');need(baseline===inventory.audit.head,'Pre-T634 reference did not resolve exactly');git('merge-base','--is-ancestor',baseline,approved);
  const sentinelSource=gitRaw('show',baseline+':test_fixde.js');
  for(const r of SENTINELS){need(sentinelSource.includes("seedPin444('seed"+r.seed+"', "+r.seed+", 400, "+r.pop+","),'Original independent population sentinel missing');need(r.seed===7?sentinelSource.includes('const SEED7M_T532=77;')&&sentinelSource.includes("seedPin444('seed7m', 7, 400, SEED7M_T532,"):sentinelSource.includes("seedPin444('seed"+r.seed+"m', "+r.seed+", 400, "+r.money+","),'Original independent money sentinel missing');}
  const baselineSource=gitRaw('show',baseline+':'+SOURCE_PATH);need(sha(baselineSource)===inventory.audit.source_sha256,'Pre-T634 git source differs from the independently recorded inventory hash');
  const rows=inventory.building_types.filter(r=>r.remaining_new).sort((a,b)=>a.k-b.k).flatMap(r=>Array.from({length:r.k<=3?3:1},(_,l)=>Array.from({length:r.k<=3?12:3},(_,v)=>({id:r.k+'_'+(l+1)+'_'+v,k:r.k,lv:l+1,v,n:r.new_size}))).flat());
  need(rows.length===315&&new Set(rows.map(r=>r.id)).size===315&&rows.filter(r=>r.k<=3).length===108&&rows.filter(r=>r.k>3).length===207,'Immutable inventory must enumerate exactly 108 RCI plus 207 facility designs');
  const lifecycle=lifecycleSelfTest(releaseSource),filterSpy=filterSpySelfTest();
  const sources={approved:approvedSource,baseline:baselineSource,release:releaseSource,'red-default-off':redSource(releaseSource,'default-off'),'red-url-bypass':redSource(releaseSource,'url-bypass'),'red-runtime-bypass':redSource(releaseSource,'runtime-bypass')};
  const pagesHTML=Object.fromEntries(Object.entries(sources).map(([name,source])=>[name,inject(source,sharedBridge)]));
  for(const[name,html]of Object.entries(pagesHTML))scriptsParse(html,name);
  if(process.argv.includes('--check')){console.log(JSON.stringify({status:'immutable-source-and-syntax-check-only',head,approved,baseline,designs:rows.length,browserStarted:false,socketOpened:false,renderParityVerified:false}));return;}
  const report={kind:'T634 approved-art release activation exact native RGBA parity',status:'running',head,approved,baseline,checks:[],failures:[],errors:[],contexts:[],assets:[],worlds:[],redControls:[],sentinels:[],screenshots:[],lifecycleSelfTest:lifecycle,filterSpySelfTest:filterSpy,
    source:{head,approved,baseline,releaseSHA256:sha(releaseSource),approvedSHA256:sha(approvedSource),baselineSHA256:sha(baselineSource),releaseBlob:git('rev-parse',head+':'+SOURCE_PATH),approvedBlob:git('rev-parse',approved+':'+SOURCE_PATH),baselineBlob:git('rev-parse',baseline+':'+SOURCE_PATH),harnessSHA256:sha(fs.readFileSync(__filename)),immutableSceneSHA256:sha(bridgeSource),sharedBridgeSHA256:sha(sharedBridge),inventorySHA256:sha(inventoryRaw),fixtureSHA256:sha(fixture),sentinelSource:{commit:baseline,path:'test_fixde.js',sha256:sha(sentinelSource),expected:SENTINELS},servedHTMLSHA256:Object.fromEntries(Object.entries(pagesHTML).map(([k,s])=>[k,sha(s)]))},
    safety:{disposableOrigin:true,isolatedContexts:true,slotSelectedBeforeLoad:3,playerOriginUsed:false,simulationAdvanced:'only the separate three-seed normal-URL lane',gameplaySaveAllowed:'only explicit disposable slot3 save/load checks in the simulation lane',serviceWorkersBlocked:true},
    scope:'Supplemental release activation only. Full six-job seasonal, overlay, save, geometry and regression acceptance remains independently required.'};
  const persist=()=>{fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(report,null,2)+'\n');};
  const check=(ok,label)=>{(ok?report.checks:report.failures).push(label);if(!ok){persist();throw Error(label);}};
  const refs=new Map(),sceneRefs=new Map();
  function storeCapture(key,c){const bytes=rawPixels(c),file=key.replace(/[^a-zA-Z0-9_.-]/g,'-')+'.rgba.gz';fs.writeFileSync(path.join(OUT,'rgba',file),zlib.gzipSync(bytes));const ref={width:c.width,height:c.height,file:path.join('rgba',file),sha256:sha(bytes)};refs.set(key,ref);return ref;}
  function expected(key){const r=refs.get(key);need(r,'Missing immutable pixel reference '+key);return{...r,bytes:zlib.gunzipSync(fs.readFileSync(path.join(OUT,r.file)))};}
  function png(name,c){need(/^data:image\/png;base64,/.test(c.png),'Missing native frame PNG');const file=name+'.png',bytes=Buffer.from(c.png.split(',')[1],'base64');fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push({file,sha256:sha(bytes)});return file;}
  persist();fs.mkdirSync(path.join(OUT,'rgba'),{recursive:true});
  const {chromium}=require('playwright');let browser,server,origin;const openContexts=new Set();
  async function open(spec){
    const context=await browser.newContext({viewport:VIEWPORT,deviceScaleFactor:1,serviceWorkers:'block'});openContexts.add(context);
    await context.addInitScript(({explicit,simulation})=>{
      // 第一個 storage 操作就是選 slot3；頁面載入前阻擋自動儲存及所有非 fixture 寫檔。
      localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');window.__freeze634=true;
      if(explicit==='true')window.__t634=true;else if(explicit==='false')window.__t634=false;
      window.__release634Simulation=simulation;window.__release634Safety={allowedSaveCalls:0,allowedSaveWrites:0,allowedBackupWrites:0,fixtureWrites:0,blockedSaveWrites:0,wrongSlotWrites:0,blockedSaveCalls:0,blockedAutosaveRegistrations:0};
      const interval=window.setInterval;window.setInterval=function(fn,delay,...args){if(delay===25000&&typeof fn==='function'&&/if\(tiles\)save\(\)/.test(String(fn))){window.__release634Safety.blockedAutosaveRegistrations++;return 0;}return interval.call(this,fn,delay,...args);};
      const put=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&/^glimmerville\.v1(?:\.s\d+)?(?:_bak)?$/.test(k)){if(k!=='glimmerville.v1.s3'&&k!=='glimmerville.v1.s3_bak'){window.__release634Safety.wrongSlotWrites++;throw Error('Non-disposable save slot write blocked');}if(window.__release634Simulation&&window.__release634Saving){window.__release634Safety[k.endsWith('_bak')?'allowedBackupWrites':'allowedSaveWrites']++;}else if(window.__release634Loading&&k==='glimmerville.v1.s3')window.__release634Safety.fixtureWrites++;else{window.__release634Safety.blockedSaveWrites++;throw Error('Gameplay save write blocked');}}return put.call(this,k,v);};
    },{explicit:spec.explicit||'absent',simulation:spec.simulation===true});
    await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
    const page=await context.newPage();page.on('pageerror',e=>{report.errors.push({mode:spec.name,message:e.stack||e.message});persist();});
    const url=origin+'/'+spec.source+'.html'+(spec.query||'');await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.GV&&window.__release634&&window.__qa634&&window.__boot426&&__boot426().ready,null,{timeout:180000});
    const boot=await page.evaluate(()=>__release634.flags());report.contexts.push({name:spec.name,url,source:spec.source,boot});persist();
    return{context,page,boot,spec};
  }
  async function close(run,fixtureWrites,saveCalls=0,backupWrites=0){
    const safety=await run.page.evaluate(()=>__release634.safety());report.contexts.find(r=>r.name===run.spec.name).safety=safety;
    check(safety.slot===3&&!safety.savePresent&&!safety.backupPresent&&safety.wrongSlotWrites===0&&safety.blockedSaveWrites===0&&safety.blockedSaveCalls===0&&safety.fixtureWrites===fixtureWrites&&safety.allowedSaveCalls===saveCalls&&safety.allowedSaveWrites===saveCalls&&safety.allowedBackupWrites===backupWrites&&safety.blockedAutosaveRegistrations===1&&safety.failedBakes===0,run.spec.name+' strictly scoped slot3 writes and no-fallback safety');
    const disposal=await run.page.evaluate(()=>__release634.disposeWorld());report.contexts.find(r=>r.name===run.spec.name).disposal=disposal;
    check(disposal.phase==='disposed'&&disposal.worldWasPresent&&disposal.worldCleared&&disposal.saveGuardUnchanged&&JSON.stringify(disposal.countersBefore)===JSON.stringify(disposal.countersAfter),run.spec.name+' bounded post-measurement world disposal preserves active save guard and all safety counters');
    await run.context.close();openContexts.delete(run.context);persist();
  }
  async function assets(run,reference){
    const catalog=await run.page.evaluate(()=>__release634.catalog());check(JSON.stringify(catalog)===JSON.stringify(rows),run.spec.name+' independently enumerates all315 designs');
    let count=0;for(let start=0;start<rows.length;start+=9){const captures=await run.page.evaluate(rows=>__release634.assets(rows),rows.slice(start,start+9));
      for(const c of captures){const{day,night,...metadata}=c,record={mode:run.spec.name,...metadata,layers:{}};count++;
        if(reference)sceneRefs.set('asset/'+c.id,JSON.stringify(metadata));else check(sceneRefs.get('asset/'+c.id)===JSON.stringify(metadata),run.spec.name+' unchanged dimensions, anchors and hooks '+c.id);
        for(const layer of['day','night']){const key='approved-asset-'+c.id+'-'+layer;if(reference){const r=storeCapture(key,c[layer]);record.layers[layer]={equal:true,...r};}else{const r=pixelResult(c[layer],expected(key));record.layers[layer]=r;check(r.equal,run.spec.name+' exact native RGBA '+c.id+' '+layer);}}
        report.assets.push(record);
      }persist();
    }
    check(count===315,run.spec.name+' captured exactly315 day/night native canvas pairs');
  }
  async function worlds(run,{reference,guard,expectedOn,expectedExplicit='absent',scenes=SCENES}={}){
    let count=0;for(const scene of scenes){const setup=await run.page.evaluate(a=>__release634.setup(a),{scene,fixture:scene==='seed22'?fixture:null}),label=run.spec.name+' '+scene;
      check(setup.initial.explicit===expectedExplicit&&setup.final.explicit===expectedExplicit,label+' fixture does not force the activation flag');
      const sceneID=scene,identity=JSON.stringify({roots:setup.roots,signature:setup.signature,center:setup.center,zoom:setup.zoom});
      if(reference==='approved')sceneRefs.set(sceneID,identity);else check(sceneRefs.get(sceneID)===identity,label+' exact approved roots, fields, camera and frozen world');
      for(let rotation=0;rotation<4;rotation++)for(const night of[false,true]){
        const args={center:setup.center,zoom:setup.zoom,rotation,night},c=await run.page.evaluate(a=>__release634.frame(a),args),suffix=scene+'-r'+rotation+'-'+(night?'night':'day'),key=(reference|| (expectedOn?'approved':'baseline'))+'-world-'+suffix;
        check(c.unstableBytes===0&&c.stateUnchanged,label+' stable native RGBA and immutable world r'+rotation+'/'+night);
        check(c.state.rotation===rotation&&c.state.zoom===setup.zoom&&c.state.day===101&&c.state.season===1,label+' requested frozen summer camera r'+rotation+'/'+night);
        let pixels;if(reference){pixels={equal:true,...storeCapture(key,c)};if(reference==='approved')sceneRefs.set('state/'+suffix,JSON.stringify(c.state));else check(sceneRefs.get('state/'+suffix)===JSON.stringify(c.state),label+' baseline uses exact approved camera '+suffix);}
        else{pixels=pixelResult(c,expected(key));check(sceneRefs.get('state/'+suffix)===JSON.stringify(c.state),label+' exact camera/lighting '+suffix);}
        const first=firstModeFailure({boot:run.boot,frame:c.flags,expectedOn,expectedExplicit,guard,pixelsEqual:pixels.equal});
        check(first===null,label+' '+guard+' exact RGBA r'+rotation+'/'+night+(first?' first='+first:''));
        // 原像素/啟用首紅守衛先判；此處只追加與 immutable 參考的實際 filter 呼叫計數。
        check(JSON.stringify(c.filterDraws)===JSON.stringify(c.repeatFilterDraws),label+' repeated real filter draw counts stay identical '+suffix);
        const filterKey=(reference||(expectedOn?'approved':'baseline'))+'-filter/'+suffix;
        if(reference)sceneRefs.set(filterKey,JSON.stringify(c.filterDraws));else check(sceneRefs.get(filterKey)===JSON.stringify(c.filterDraws),label+' actual reflection/shadow draw counts equal immutable '+(expectedOn?'approved art':'original route')+' '+suffix);
        const record={mode:run.spec.name,scene,rotation,night,state:c.state,flags:c.flags,pixels,filterDraws:c.filterDraws,repeatFilterDraws:c.repeatFilterDraws,file:png(run.spec.name+'-'+suffix,c)};report.worlds.push(record);count++;persist();
      }
      check(setup.signature===await run.page.evaluate(()=>__release634.signature()),label+' rendering leaves all fixture fields unchanged');
    }
    check(count===scenes.length*8,run.spec.name+' complete four-rotation day/night world matrix');
  }
  async function redControl(kind,expectedOn,guard,query='',runtime=false){
    const spec={name:'red-'+kind,source:'red-'+kind,query},run=await open(spec);
    try{
      const setup=await run.page.evaluate(()=>__release634.setup({scene:'street'})),args={center:setup.center,zoom:setup.zoom,rotation:0,night:false};
      if(runtime){const warm=await run.page.evaluate(a=>__release634.frame(a),args);check(pixelResult(warm,expected('approved-world-street-r0-day')).equal,'runtime red control starts from exact enabled art before switching');await run.page.evaluate(()=>__release634.runtimeEscape(true));run.boot=await run.page.evaluate(()=>__release634.flags());}
      const c=await run.page.evaluate(a=>__release634.frame(a),args),target=expectedOn?'approved':'baseline',counter=expectedOn?'baseline':'approved',pixels=pixelResult(c,expected(target+'-world-street-r0-day')),counterPixels=pixelResult(c,expected(counter+'-world-street-r0-day'));
      check(c.unstableBytes===0&&c.stateUnchanged,'red '+kind+' has a stable meaningful frame');
      const first=firstModeFailure({boot:run.boot,frame:c.flags,expectedOn,expectedExplicit:'absent',guard,pixelsEqual:pixels.equal});
      check(first===guard&&!pixels.equal&&counterPixels.equal,'red '+kind+' first rejection is '+guard+' with actual counterfactual RGBA');
      report.redControls.push({mutation:kind,sourceSHA256:sha(sources['red-'+kind]),firstFailure:first,targetPixels:pixels,counterfactualPixels:counterPixels,flags:c.flags,file:png('red-'+kind,c)});
    }finally{await close(run,0);}
  }
  try{
    server=http.createServer((req,res)=>{const key=(req.url||'').split('?')[0].replace(/^\//,'').replace(/\.html$/,'');if(!Object.prototype.hasOwnProperty.call(pagesHTML,key)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(pagesHTML[key]);});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});check(server.address().port!==8123,'Disposable server never uses player port8123');origin='http://127.0.0.1:'+server.address().port;
    const executable=process.env.CHROME_PATH||'/usr/bin/google-chrome';browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox']});report.browser={version:browser.version(),executable,viewport:VIEWPORT,deviceScaleFactor:1};persist();
    for(const spec of[{name:'approved',source:'approved',query:'?T634=1',expectedOn:true,reference:'approved'},{name:'baseline',source:'baseline',expectedOn:false,reference:'baseline'}]){
      const run=await open(spec);try{if(spec.reference==='approved')await assets(run,true);await worlds(run,{reference:spec.reference,expectedOn:spec.expectedOn,guard:spec.name+'-reference'});}finally{await close(run,1);}
    }
    check(!expected('approved-world-street-r0-day').bytes.equals(expected('baseline-world-street-r0-day').bytes),'Independent approved art and original street pixels visibly differ');
    const normal=await open({name:'release-default',source:'release'});
    try{
      check(normal.boot.query===''&&normal.boot.explicit==='absent'&&normal.boot.escapeExplicit==='absent','Normal release visit has no query, no __t634 assignment and no escape override');
      await assets(normal,false);await worlds(normal,{expectedOn:true,guard:'default-activation'});
      // 在已正常畫過新版、快取已熱的同頁面開逃生閥；不是另一個預先關閉的頁面。
      await normal.page.evaluate(()=>__release634.runtimeEscape(true));normal.boot=await normal.page.evaluate(()=>__release634.flags());normal.spec={...normal.spec,name:'release-runtime-escape'};
      report.contexts.push({name:normal.spec.name,url:normal.page.url(),source:'release',boot:normal.boot,sameContextAs:'release-default'});
      await worlds(normal,{expectedOn:false,guard:'runtime-escape'});
    }finally{await close(normal,2);}
    for(const spec of[
      {name:'release-explicit-true',source:'release',explicit:'true',expectedOn:true,guard:'explicit-true-parity',assets:true},
      {name:'release-query-on',source:'release',query:'?T634=1',expectedOn:true,guard:'query-on-parity'},
      {name:'release-explicit-false',source:'release',explicit:'false',expectedOn:false,guard:'explicit-false-parity'},
      {name:'release-url-escape',source:'release',query:'?noT634=1',expectedOn:false,guard:'url-escape'},
      {name:'release-url-precedence',source:'release',query:'?T634=1&noT634=1',explicit:'true',expectedOn:false,guard:'url-escape'}
    ]){
      const run=await open(spec);try{if(spec.assets)await assets(run,false);await worlds(run,{expectedOn:spec.expectedOn,expectedExplicit:spec.explicit||'absent',guard:spec.guard});}finally{await close(run,1);}
    }
    const simulation=await open({name:'release-normal-sentinels',source:'release',simulation:true});
    try{
      check(simulation.boot.on&&simulation.boot.query===''&&simulation.boot.explicit==='absent'&&simulation.boot.escapeExplicit==='absent','Real Chrome sentinel lane boots normal URL without activation or escape overrides');
      for(const pin of SENTINELS){
        const r=await simulation.page.evaluate(a=>__release634.simulation(a),{seed:pin.seed}),{before,afterDraw,afterLoad,...metrics}=r;
        const record={...metrics,expected:pin,saves:{beforeSHA256:sha(JSON.stringify(before)),afterDrawSHA256:sha(JSON.stringify(afterDraw)),afterLoadSHA256:sha(JSON.stringify(afterLoad))}};
        for(const[name,save]of Object.entries({before,afterDraw,afterLoad})){const file='sentinel-'+pin.seed+'-'+name+'.json';fs.writeFileSync(path.join(OUT,file),JSON.stringify(save,null,2)+'\n');record.saves[name+'File']=file;}
        report.sentinels.push(record);persist();
        check(r.mapSize===72&&r.steps===400&&r.stats.pop===pin.pop&&r.stats.money===pin.money,'Normal default-on native Chrome seed'+pin.seed+' population/money equal original independent pins');
        check([r.beforeFlags,r.afterSimulationFlags,r.drawFlags,r.finalFlags].every(f=>f.on&&f.explicit==='absent'&&f.escapeExplicit==='absent'&&f.query===''),'Normal default-on seed'+pin.seed+' has no hidden activation or escape override before/after simulation, draw and reload');
        check(r.candidateDraws>0&&r.renderUnchanged&&r.drawChanges.length===0&&r.roundTripChanges.length===0,'Normal default-on seed'+pin.seed+' actually draws approved art and preserves all save fields through draw/save/load/save except ts/gameVer');
      }
    }finally{await close(simulation,0,9,6);}
    await redControl('default-off',true,'default-activation');await redControl('url-bypass',false,'url-escape','?noT634=1');await redControl('runtime-bypass',false,'runtime-escape','',true);
    check(report.assets.length===315*3,'Approved/default/explicit-true all315 day/night assets completed');check(report.worlds.length===SCENES.length*8*9,'All nine reference/release mode world matrices completed');check(report.redControls.length===3,'All targeted red sources reach their named first guard');check(report.sentinels.length===3,'All six original native-Chrome sentinel pins and all three save roundtrips completed');
    check(report.errors.length===0,'Zero real Chrome page exceptions');check(git('rev-parse','HEAD')===head&&fs.readFileSync(path.join(ROOT,SOURCE_PATH),'utf8')===releaseSource,'Release source and HEAD stayed exact throughout evidence capture');
    report.status='passed';persist();console.log('T634_RELEASE_RESULT '+JSON.stringify({status:report.status,head,approved,baseline,designPairs:report.assets.length,frames:report.worlds.length,sentinels:report.sentinels.map(({seed,stats})=>({seed,...stats})),redControls:report.redControls,checks:report.checks.length}));
  }catch(e){report.status='failed';report.errors.push({source:'runner',message:e.stack});persist();throw e;}
  finally{for(const c of openContexts)await c.close().catch(()=>{});if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));persist();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
