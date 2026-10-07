'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{spawnSync}=require('child_process');
const {canOmitOffcanvas603:omit,drawSource603,cloneDraw603,overlayHTML603,offcanvasBridge603,pairedVerdict603}=require('./offcanvas603.js');
const {assertNativeSource603,NATIVE_BLOCKS}=require('./native603.js');
const ROOT=path.resolve(__dirname,'../../..'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
if(process.argv.some(x=>['--source-mock','--bridge-candidate','--bridge-main'].includes(x))){
  const protocol=process.argv.includes('--bridge-candidate')||process.argv.includes('--bridge-main'),main=process.argv.includes('--bridge-main');
  const test=fs.readFileSync(path.join(ROOT,'test_fixde.js'),'utf8'),head=test.slice(0,test.indexOf('// ---- 載入 index.html 中的 script ----'));
  let app=main?assertNativeSource603(html).base:overlayHTML603(html).html;
  const runner=require('./offcanvas-run603.js').source,bridgeStart=runner.indexOf('function bridge603(){'),bridgeEnd=runner.indexOf('// Inverse only approved art changes,',bridgeStart),realBridge=runner.slice(bridgeStart,bridgeEnd).trim();
  assert(bridgeStart>=0&&bridgeEnd>bridgeStart&&realBridge.includes('let drawReal603=draw;'));
  const bridge=String.raw`
    window.__probe603={resize,advance:()=>advance(.125),roots:()=>{const rows=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=tiles[idx(x,y)].bld;if(b&&!b.ref)rows.push([idx(x,y),b.k,b.lv,b.v,b.sz||1,!!b.lot574]);}return rows;},state:()=>({W,H,DPR,cam:{...cam},quality,day}),draw:(guarded)=>{trafClock=100;waterT=0;waterF=0;(guarded?offcanvasGuardedDraw603:draw)(.016);}};
  `;
  app=app.replace('window.GV={',bridge+(protocol?'('+realBridge+')();':'')+'window.GV={');
  const js=[...app.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  const body=String.raw`
    const assert=require('assert/strict');
    const game=elMap.get('game'),g=game.getContext('2d');game.getContext=()=>g;
    let state={matrix:{a:1,b:0,c:0,d:1,e:0,f:0},globalAlpha:1,filter:'none',globalCompositeOperation:'source-over',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,shadowColor:'rgba(0, 0, 0, 0)',imageSmoothingEnabled:false,imageSmoothingQuality:'low'};
    const stack=[],calls=[],imageIds=new WeakMap();let nextId=0;
    for(const key of Object.keys(state).filter(k=>k!=='matrix'))Object.defineProperty(g,key,{get:()=>state[key],set:v=>state[key]=v});
    g.save=()=>stack.push({...state,matrix:{...state.matrix}});g.restore=()=>{assert(stack.length);state=stack.pop();};g.getTransform=()=>({...state.matrix});
    g.translate=(x,y)=>{const m=state.matrix;m.e+=m.a*x+m.c*y;m.f+=m.b*x+m.d*y;};
    g.scale=(x,y)=>{const m=state.matrix;m.a*=x;m.b*=x;m.c*=y;m.d*=y;};
    g.rotate=t=>{const m=state.matrix,c=Math.cos(t),s=Math.sin(t),a=m.a,b=m.b,cc=m.c,d=m.d;m.a=a*c+cc*s;m.b=b*c+d*s;m.c=-a*s+cc*c;m.d=-b*s+d*c;};
    g.drawImage=(img,...args)=>{if(g.filter!=='brightness(0)')return;if(!imageIds.has(img))imageIds.set(img,++nextId);calls.push({image:imageIds.get(img),args,state:JSON.parse(JSON.stringify(state))});};
    window.__noT603=false;window.__noT602=false;
    global.innerWidth=1400;global.innerHeight=900;
    Object.defineProperty(global,'__s603',{get:()=>window.__s603});Object.defineProperty(global,'GV',{get:()=>window.GV});
    localStorage.setItem('glimmerville.v1.slot','3');game.clientWidth=1400;game.clientHeight=900;
    eval(APP);
    const G=window.GV,A=window.__probe603;A.resize();localStorage.setItem('glimmerville.v1.s3',FIXTURE);assert(G.load());G.ai(false);G.setSpeed(0);G.setRot(0);G.setSeason(1);G.weather(0);G.setZoom(1);G.lookAt(22,14);
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(A.roots())).digest('hex'),'bfb601802addb32048efa09bd0e3b81f7ea6d180df25465111fc5d0129a12004');
    if(PROTOCOL){
      const S=window.__s603;G.setVisT(100);S.offcanvasMode('original');G.forceDraw();calls.length=0;G.forceDraw();const original=calls.slice();assert.equal(original.length,MAIN?279:276);
      if(MAIN)assert.throws(()=>S.offcanvasMode('guarded'));
      else{S.offcanvasMode('guarded');calls.length=0;G.forceDraw();assert.equal(calls.length,225);S.offcanvasMode('original');calls.length=0;G.forceDraw();assert.deepEqual(calls,original);}
      S.offcanvasLight(55);const before=S.offcanvasState();A.advance();G.forceDraw();const after=S.offcanvasState();assert(after.clocks.visT>before.clocks.visT&&after.clocks.trafClock>before.clocks.trafClock);assert.deepEqual(before.light,after.light);assert.equal(after.light.b,1);
      S.perfStart();assert.throws(()=>S.offcanvasMode('original'));assert.throws(()=>S.offcanvasLight(100));A.advance();G.forceDraw();const work=S.perfWork();assert(work.work.advance.calls&&work.work.draw.calls);
      if(!MAIN){S.offcanvasLight(null);S.compositorFreeze(true);const originalAudit=S.offcanvasAudit(false,100),guardedAudit=S.offcanvasAudit(true,100);assert.equal(originalAudit.rows.length,276);assert.equal(guardedAudit.rows.filter(r=>r.skipped).length,51);assert.equal(guardedAudit.calls.length,225);assert.deepEqual(originalAudit.calls.filter((_,i)=>!originalAudit.rows[i].eligible),guardedAudit.calls);S.compositorFreeze(false);}
      console.log('BRIDGE_MOCK_RESULT '+JSON.stringify({main:MAIN,originalCalls:original.length,mutableDrawAssignment:true,liveClocks:true,kind:'actual composed bridge in command mock; no browser/pixel/performance claim'}));process.exit(0);
    }
    const out=[];
    for(const legacy of[false,true])for(const time of[55,100]){
      window.__noT603=legacy;G.setVisT(time);A.draw(false);calls.length=0;A.draw(false);const normal=calls.slice(),after=JSON.parse(JSON.stringify(state));
      calls.length=0;A.draw(true);const guarded=calls.slice();assert.deepEqual(state,after);assert.equal(stack.length,0);
      const isOutside=r=>{const m=r.state.matrix,[x,y,w,h]=r.args;const x0=m.a*x+m.e,x1=m.a*(x+w)+m.e,y0=m.d*y+m.f,y1=m.d*(y+h)+m.f;return Math.max(x0,x1)<-2||Math.min(x0,x1)>1402||Math.max(y0,y1)<-2||Math.min(y0,y1)>902;};
      const dropped=normal.filter(isOutside),kept=normal.filter(r=>!isOutside(r));assert.deepEqual(guarded,kept);
      const count=r=>({reflection:r.filter(c=>c.state.matrix.d<0).length,shadow:r.filter(c=>c.state.matrix.d>=0).length});
      assert.deepEqual(count(normal),{reflection:46,shadow:time===55?0:legacy?233:230});assert.deepEqual(count(dropped),{reflection:3,shadow:time===55?0:48});
      out.push({legacy,time,state:A.state(),counts:count(normal),skips:count(dropped),retainedArgumentsExact:true});
    }
    console.log('SOURCE_MOCK_RESULT '+JSON.stringify({kind:'source/command mock only; no pixels, browser, or timing claim',windows:out}));process.exit(0);
  `;
  new Function('require','APP','FIXTURE','PROTOCOL','MAIN',head+body)(require,js,fs.readFileSync(path.join(__dirname,'fixtures','seed22-d3-420-v11.211.json'),'utf8'),protocol,main);
}else{
  let checks=0;const ok=(v,m)=>{assert(v,m);checks++;console.log('PASS: offcanvas '+m);};
  const g=extra=>({canvas:{width:1400,height:900},globalAlpha:1,filter:'none',globalCompositeOperation:'source-over',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,shadowColor:'rgba(0, 0, 0, 0)',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),...extra});
  const source=assertNativeSource603(html),overlay=overlayHTML603(html),draw=drawSource603(html);
  ok(overlay.proof.sourceSHA256===source.sourceSHA256&&overlay.html.includes(draw),'original draw function and runtime SHA retained');
  for(const audit of[false,true]){
    const clone=cloneDraw603(draw,audit);for(const block of NATIVE_BLOCKS){const b=block.replace('      const shH=Math.max(2,s.h*z*.32);\n','');ok(clone.includes(b),'exact retained native block '+audit);}
    let restored=clone.replace('function '+(audit?'offcanvasAuditDraw603':'offcanvasGuardedDraw603')+'(dt){','function draw(dt){').replace(/      if\(!(?:canOmitOffcanvas603|offcanvasDecision603)\([^\n]+\)\)\{\n/g,'');
    for(const block of NATIVE_BLOCKS){const b=block.replace('      const shH=Math.max(2,s.h*z*.32);\n','');restored=restored.replace(b+'\n      }',b);}
    ok(restored===draw,'only two whole-block guards differ from original draw '+audit);
  }
  for(const [x,y,w,h]of[[-13,0,10,10],[1403,0,10,10],[0,-13,10,10],[0,903,10,10]])ok(omit(g(),x,y,w,h),'wholly outside fixed halo '+[x,y,w,h]);
  for(const r of[[-12,0,10,10],[1402,0,10,10],[0,-12,10,10],[0,902,10,10],[-11.99,0,10,10],[1399,0,10,10],[0,0,1400,900],[NaN,0,10,10],[0,0,Infinity,10],[0,0,-10,10],[0,0,0,10],[Number.MAX_VALUE,0,Number.MAX_VALUE,10]])ok(!omit(g(),...r),'boundary, visible or invalid support retains draw '+r);
  const outside=[1403,0,10,10];
  for(const extra of[{globalCompositeOperation:'copy'},{globalCompositeOperation:'destination-in'},{filter:'blur(1px)'},{shadowBlur:1},{shadowOffsetX:1},{shadowOffsetY:-1},{shadowColor:'#000000'},{globalAlpha:NaN},{globalAlpha:-1},{globalAlpha:2},{getTransform:null},{getTransform:()=>{throw Error('unsupported');}},{getTransform:()=>null},{canvas:{width:0,height:900}},{canvas:{width:1400.5,height:900}}])ok(!omit(g(extra),...outside),'unsupported native state retains draw '+JSON.stringify(extra));
  for(const key of['a','b','c','d','e','f'])for(const value of[NaN,Infinity,.001])ok(!omit(g({getTransform:()=>({...g().getTransform(),[key]:value})}),...outside),'nonidentity/nonfinite '+key+'/'+value+' retains draw');
  let reads=0;const on=g({getTransform:()=>{reads++;return g().getTransform();}});ok(!omit(on,0,0,10,10)&&reads===0,'visible draw avoids native transform read entirely');
  ok(!omit(null,...outside)&&!omit({},...outside),'missing native context fails closed');
  const noMutation=g(),before=JSON.stringify(noMutation);omit(noMutation,...outside);ok(JSON.stringify(noMutation)===before,'guard does not mutate supplied context');
  const {source:runner}=require('./offcanvas-run603.js');
  new Function('require','__filename','__dirname',runner);ok(true,'fully composed native-Mac runner parses');
  ok(runner.indexOf('assertNativeSource603(html,check)')<runner.indexOf('overlayHTML603(html)'),'native source invariant precedes disposable overlay');
  const measured=runner.slice(runner.indexOf('    const measure=async'),runner.indexOf('    // Each platform brackets'));
  ok(!/getImageData|toDataURL|compositorFreeze|offcanvasAudit|captureScreenshot|Tracing\.start/.test(measured),'timing block excludes readback, freeze, audit, screenshots and tracing');
  const bridge=offcanvasBridge603.toString();ok(bridge.includes("value==='guarded'?offcanvasGuardedDraw603:originalDraw"),'original arm dispatches original function without per-site guard');
  const originalFn=()=>{},guardedFn=()=>{},context=g();context.imageSmoothingEnabled=false;context.imageSmoothingQuality='low';context.drawImage=()=>{};
  const box={drawReal603:originalFn,daylight:()=>({b:box.visT<75?1:.34,dusk:0,ph:box.visT/110,d:1}),visT:55,trafClock:1,waterT:1,waterF:0,measureWork603:false,running:true,compositorRunning603:null,quality:1,ctx:context,canOmitOffcanvas603:omit,offcanvasGuardedDraw603:guardedFn,offcanvasDecision603:undefined};
  box.compositorState603=()=>({running:box.running});box.__s603={freezeVis:t=>{box.frozen=t;},view:()=>({}),viewport:()=>({}),flags:()=>({}),cacheStats:()=>({}),compositorFrame:()=>{box.drawReal603(.016);return{};}};
  box.offcanvasAuditDraw603=()=>{if(!box.offcanvasDecision603('shadow',1,2,{img:{width:10,height:10}},1403,0,10,10))context.drawImage({width:10},1403,0,10,10);};
  vm.createContext(box);vm.runInContext('('+bridge+')()',box);
  box.__s603.offcanvasMode('guarded');ok(box.drawReal603===guardedFn,'live mode selects actual guarded function');box.__s603.offcanvasMode('original');ok(box.drawReal603===originalFn,'live restoration selects original function identity');
  box.measureWork603=true;assert.throws(()=>box.__s603.offcanvasMode('guarded'));assert.throws(()=>box.__s603.offcanvasLight(100));box.measureWork603=false;ok(true,'renderer and light switches rejected inside timed work');
  const held=box.__s603.offcanvasLight(100);ok(box.visT===55&&box.frozen===null&&held.b===.34,'hold lighting without freezing or changing animation clock');box.visT+=10;ok(box.daylight().b===.34&&box.visT===65,'lighting stays fixed while animation clock advances');box.__s603.offcanvasLight(null);ok(box.daylight().b===1,'light override restores original daylight function behavior');
  assert.throws(()=>box.__s603.offcanvasAudit(true,100));box.running=false;assert.throws(()=>box.__s603.offcanvasAudit(true,100));box.compositorRunning603=true;box.measureWork603=true;assert.throws(()=>box.__s603.offcanvasAudit(true,100));box.measureWork603=false;ok(true,'audit rejects running, unfrozen or measured work');
  const beforeDraw=context.drawImage,audit=box.__s603.offcanvasAudit(true,100);ok(audit.rows.length===1&&audit.rows[0].skipped&&audit.calls.length===0&&context.drawImage===beforeDraw&&box.drawReal603===originalFn,'guarded audit records omission then restores function identities');
  context.drawImage=()=>{throw Error('deliberate native failure');};const throwsDraw=context.drawImage;assert.throws(()=>box.__s603.offcanvasAudit(false,100));ok(context.drawImage===throwsDraw&&box.drawReal603===originalFn,'audit native exception restores wrapper and renderer');
  ok(runner.indexOf('report.timingFinished=true')<runner.indexOf('await compositorBegin603();',runner.indexOf('report.timingFinished=true')),'frozen captures occur only after all declared timing windows');
  const rows=(ratios)=>ratios.flatMap((ratio,i)=>{const o={mode:'original',fps:20,warmP95:50,raf:{p95:100}},c={mode:'guarded',fps:20*ratio,warmP95:50/ratio,raf:{p95:100/ratio}};return i%2?[c,o]:[o,c];});
  ok(pairedVerdict603(rows([1.1,1.1,1.1,1.1])).clearBenefit,'consistent paired benefit accepted');
  ok(!pairedVerdict603(rows([1,1,1,2])).clearBenefit,'one lucky window cannot qualify benefit');
  ok(!pairedVerdict603(rows([.8,.8,.8,.8])).noMaterialRegression,'paired overhead regression rejected');
  assert.throws(()=>pairedVerdict603(rows([1,1,1])));ok(true,'missing declared pair fails closed');
  const result=spawnSync(process.execPath,[__filename,'--source-mock'],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
  if(result.status!==0)throw Error(result.stdout+'\n'+result.stderr);
  ok(result.stdout.includes('SOURCE_MOCK_RESULT'),'actual source mock reproduces both art modes and exact retained native arguments');
  console.log(result.stdout.trim());
  for(const mode of['--bridge-candidate','--bridge-main']){
    const p=spawnSync(process.execPath,[__filename,mode],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});if(p.status!==0)throw Error(p.stdout+'\n'+p.stderr);ok(p.stdout.includes('BRIDGE_MOCK_RESULT'),'actual const-to-let composed bridge runs '+mode);console.log(p.stdout.trim());
  }
  console.log('T603_OFFCANVAS_TEST_RESULT '+JSON.stringify({checks,sourceSHA256:source.sourceSHA256,browserOrPixelClaim:false}));
}
