// Bounded source/clock/classification contracts: no browser, no product execution.
'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),vm=require('node:vm');
const {sampleWindow603,settlePopulation603,observerAnalysis603,checkContracts603,diagnosticBlock603}=require('./lighttrace603.js');
function clockRig(){
  let now=100,visible='visible',focused=true,running=true,nextId=0,queued=new Map(),timers=new Map(),sampling=false,stops=0,start=0;
  const listenerSets=new Map(),events=[],marks=[];
  const emitter={addEventListener(k,f){if(!listenerSets.has(k))listenerSets.set(k,new Set());listenerSets.get(k).add(f);},removeEventListener(k,f){listenerSets.get(k)?.delete(f);}};
  const context={performance:{now:()=>now,timeOrigin:100000,mark:(name,options)=>marks.push({name,...options})},
    document:{...emitter,get visibilityState(){return visible;},hasFocus:()=>focused},window:emitter,
    requestAnimationFrame:f=>{const id=++nextId;queued.set(id,f);return id;},cancelAnimationFrame:id=>queued.delete(id),
    setTimeout:(f,ms)=>{const id=++nextId;timers.set(id,{f,ms});return id;},clearTimeout:id=>timers.delete(id),
    __s603:{view:()=>({running}),population603:()=>({cars:64,citizens:48,speed:0,running,quality:1,visT:100,measuring:sampling}),perfStart:()=>{assert.equal(sampling,false);sampling=true;start=now;events.push('start');},perfWork:()=>{assert.equal(sampling,true);sampling=false;stops++;events.push('stop');return {stoppedAt:now,work:{},samples:{}};}}
  };
  const invoke=()=>vm.runInNewContext('('+sampleWindow603.toString()+')(5000,"test-window")',context);
  return {invoke,events,marks,queued,timers,get stops(){return stops;},get sampling(){return sampling;},get listenerCount(){return [...listenerSets.values()].reduce((n,s)=>n+s.size,0);},
    frame(t){now=t+2;const prior=[...queued.values()];queued.clear();for(const f of prior)f(t);},
    blur(){focused=false;for(const f of listenerSets.get('blur')||[])f();},
    hide(){visible='hidden';for(const f of listenerSets.get('visibilitychange')||[])f();},
    timeout(){now=20100;for(const {f}of [...timers.values()])f();},setRunning(v){running=v;}};
}
test('exact frozen source and generated foreground contracts compile without executing product',()=>{
  const r=checkContracts603();assert.equal(r.runtimeExecuted,false);assert.equal(r.plan.flat().length,6);assert.equal(r.categories.join(','),'devtools.timeline,gpu,cc,blink.user_timing');
});
test('original RAF >=5000 / first interval semantics and synchronous stop',async()=>{
  const r=clockRig(),pending=r.invoke();assert.equal(r.sampling,true);
  for(const t of [110,1000,2000,3000,4000,5000])r.frame(t);
  assert.equal(r.stops,0);r.frame(5100);assert.equal(r.stops,1);assert.equal(r.sampling,false);
  const out=await pending;assert.equal(out.elapsed,5000);assert.equal(out.frames,6);assert.equal(out.intervals.length,6);assert.equal(out.focus.checks,7);
  assert.equal(out.clocks.workStoppedAt,5102);assert.equal(out.clocks.workDurationMs,5002);assert.equal(out.clocks.stopLagAfterRAFTimestampMs,2);
  assert.equal(r.queued.size,0);assert.equal(r.timers.size,0);assert.equal(r.listenerCount,0);assert.equal(r.marks.length,3);
  assert.deepEqual(r.marks.map(m=>m.startTime),[100,5100,5102]);
});
test('focus loss stops work and removes timers/listeners before reporting failure',async()=>{
  const r=clockRig(),pending=r.invoke();r.frame(110);r.blur();r.frame(130);const out=await pending;
  assert.match(out.error,/Foreground lost/);assert.equal(out.focus.lost,true);assert.equal(out.focus.events.length,1);assert.equal(r.stops,1);assert.equal(r.sampling,false);assert.equal(r.queued.size,0);assert.equal(r.timers.size,0);assert.equal(r.listenerCount,0);
});
test('RAF stall cancels sampling exactly once',async()=>{
  const r=clockRig(),pending=r.invoke();r.timeout();const out=await pending;
  assert.equal(out.error,'RAF stalled');assert.equal(r.stops,1);assert.equal(r.sampling,false);assert.equal(r.queued.size,0);assert.equal(r.timers.size,0);assert.equal(r.listenerCount,0);
});
test('paused rendering loop cannot enter a measurement',async()=>{
  const r=clockRig();r.setRunning(false);await assert.rejects(r.invoke(),/running 5-second/);assert.equal(r.stops,0);assert.equal(r.sampling,false);
});
function rows(traceFPS=60){let sequence=0;return [['no-trace','trace'],['trace','no-trace'],['no-trace','trace']].flatMap((order,i)=>order.map(condition=>({pair:i+1,sequence:++sequence,sampleId:'pair'+(i+1)+'-'+condition,condition,raf:{frames:(condition==='trace'?traceFPS:60)*5,elapsed:5000,p95:17},work:{advance:{mean:2,calls:300},draw:{mean:10,calls:300},hud:{mean:.1,calls:30}},rawWork:{advance:Array(300).fill(2),draw:Array(300).fill(10),hud:Array(30).fill(.1)}})));}
test('trace outside no-trace range is contamination, never a performance win',()=>{
  for(const fps of [30,90]){const r=observerAnalysis603(rows(fps));assert.equal(r.classification,'observer-contamination');assert.equal(r.noTraceRepeatability.fps.min,60);assert.equal(r.noTraceRepeatability.fps.max,60);assert.equal(r.traceComparisons.length,3);assert.equal(r.pairs.length,3);assert.equal(r.clears55FPS,false);assert.equal(r.clearsPixelGate,false);assert(r.traceComparisons.every(t=>t.outsideNoTraceRange.includes('fps')));}
});
test('inside range remains descriptive and rejects extra samples',()=>{
  const r=observerAnalysis603(rows());assert.equal(r.classification,'within-observed-no-trace-range');assert.equal(r.acceptanceTiming,false);assert.throws(()=>observerAnalysis603(rows().concat(rows()[0])),/Exactly six/);
});
function settlingRig(fill=true){
  let now=0,next=null;
  const context={performance:{now:()=>now},setTimeout:(f,ms)=>{next={f,ms};},__s603:{population603:()=>({cars:fill&&now>=1000?64:24,citizens:48,speed:0,running:true,quality:1,visT:100,day:101,trafClock:now/1000,lastDraw:now,measuring:false,visibility:'visible',focused:true})}};
  const pending=vm.runInNewContext('('+settlePopulation603.toString()+')()',context);
  for(let i=0;next&&i<250;i++){const event=next;next=null;now+=event.ms;event.f();}
  assert.equal(next,null,'settling must be bounded');return pending;
}
test('native population settling waits for the same target to hold for two seconds',async()=>{
  const r=await settlingRig();assert.equal(r.error,null);assert.equal(r.initial.cars,24);assert.equal(r.final.cars,64);assert.equal(r.final.citizens,48);assert.equal(r.elapsedMs,3000);assert.equal(r.stableSince,1000);assert.equal(r.history.length,13);assert(r.final.trafClock>r.initial.trafClock);assert(r.history.every(s=>s.measuring===false));
});
test('native population settling stops after sixty seconds without changing the target',async()=>{
  const r=await settlingRig(false);assert.match(r.error,/did not settle/);assert.equal(r.elapsedMs,60000);assert.equal(r.final.cars,24);assert.equal(r.target.cars,64);assert.equal(r.target.citizens,48);assert.equal(r.history.length,241);
});
function diagnosticRig603(){
  let sampleCalls=0,warmCalls=0,settleCalls=0,traceActive=false,finished=false;
  const order=[],scene='frozen-city',population={cars:64,citizens:48,speed:0,running:true,quality:1,visT:100,measuring:false};
  const view={speed:0,running:true,rot:0,season:1,cam:{x:256,y:576,z:1}},viewport={cssWidth:1400,cssHeight:900,width:1400,height:900,dpr:1,devicePixelRatio:1};
  const flags={T603:true,T596:false,T600:false};
  const report={coverage:{},census:{85:[[21,13,2]]},browserVersion:{product:'Chrome/152.0.7977.83'},displayMode603:{after:{width:1600,height:1200,pixelWidth:1600,pixelHeight:1200,refreshRate:60}},gpuInfo:{auxAttributes:{displayType:'ANGLE_METAL',skiaBackendType:'GraphiteDawnMetal',glRenderer:'Apple Paravirtual device'}}};
  const context={report,PHASE:'lighttrace',process:{platform:'darwin',arch:'arm64'},Date,JSON,
    check:(value,message)=>assert(value,message),persist:()=>{},hash:s=>require('node:crypto').createHash('sha256').update(s).digest('hex'),pct:a=>Math.max(...a),
    send:async()=>{},ready:async()=>{},growCity:async()=>{},camera:async()=>{},foregroundState603:async()=>({valid:true}),settlePopulation603,observerAnalysis603,
    ev:async expression=>{
      if(expression==='performance.timeOrigin')return 1000;
      if(expression.startsWith('(function settlePopulation603')){settleCalls++;return {error:null,initial:{...population,cars:24},final:population,elapsedMs:3000,stableRequiredMs:2000,history:[population]};}
      if(expression==='__s603.population603()')return population;
      if(expression==='__s603.scene()')return scene;
      if(expression==='__s603.drawMs()'){warmCalls++;return 10;}
      if(expression.startsWith('(()=>{__s603.clear();'))return {cold:25,cache:{}};
      if(expression.startsWith('({view:'))return {view,viewport,flags,identity:{version:'11.212',civicFactory:'function',url:'/index.html'},clipOverride:'undefined',scene};
      if(expression==='__s603.perfWork()')return {};
      if(expression.startsWith('document.getElementById')||expression==='window.__noT603=false;true')return true;
      throw Error('Unexpected mock browser expression: '+expression.slice(0,100));
    },
    beginLightTrace603:async label=>{assert.equal(traceActive,false);traceActive=true;order.push('begin:'+label);return {};},
    endLightTrace603:async()=>{assert.equal(traceActive,true);traceActive=false;order.push('end');return {};},
    raf:async(ms,label)=>{
      assert.equal(ms,5000);assert.equal(traceActive,!label.endsWith('no-trace'));sampleCalls++;order.push('sample:'+label);
      const samples={advance:[2],draw:[10],hud:[.1]},work=Object.fromEntries(Object.entries(samples).map(([k,a])=>[k,{calls:1,mean:a[0],p95:a[0],max:a[0]}]));
      return {error:null,elapsed:5000,frames:300,intervals:Array(300).fill(1000/60),p95:1000/60,mean:1000/60,max:1000/60,populationBefore:population,
        work:{work,samples,state:{...population},heap:null},clocks:{},focus:{lost:false,checks:301,before:{focused:true},after:{focused:true}}};
    },
    finishLightTraces603:async()=>{assert.equal(sampleCalls,6);assert.equal(traceActive,false);finished=true;}
  };
  return {context,report,order,get counts(){return {sampleCalls,warmCalls,settleCalls,finished};}};
}
test('generated diagnostic block executes all six loop iterations without shadowing its RAF sampler',async()=>{
  const rig=diagnosticRig603();await vm.runInNewContext('(async()=>{'+diagnosticBlock603+'})()',rig.context);
  assert.deepEqual(rig.counts,{sampleCalls:6,warmCalls:180,settleCalls:6,finished:true});assert.equal(rig.report.coverage.lighttrace,true);
  assert.equal(rig.report.lightTrace603.samples.length,6);assert.equal(rig.report.lightTrace603.settling.length,6);
  assert.deepEqual(Array.from(rig.report.lightTrace603.samples,s=>s.condition),['no-trace','trace','trace','no-trace','no-trace','trace']);
  assert(rig.report.lightTrace603.samples.every(s=>s.raf.frames===300&&s.windowPopulationBefore.cars===64));
});
test('execution-level loop regression test detects the original RAF temporal-dead-zone defect',async()=>{
  const broken=diagnosticBlock603.replace('const {work:workResult,...rafResult}=measured;','const {work:workResult,...raf}=measured;').replace('raf:rafResult,work:workResult.work,','raf,work:workResult.work,');
  assert.notEqual(broken,diagnosticBlock603);const rig=diagnosticRig603();await assert.rejects(vm.runInNewContext('(async()=>{'+broken+'})()',rig.context),/Cannot access 'raf' before initialization/);assert.equal(rig.counts.sampleCalls,0);
});
