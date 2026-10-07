// T603: six diagnostic-only night windows, AB / BA / AB. Never an acceptance gate.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../..');
const ACCEPTED='7714852495802233cdf41b7c1dcdd9f82950bfd5';
const HASHES={
  "index.html": "6c1575ef7dbfec26abf363a39e5bcae8224c47ef98d4db1140926e53691aed69",
  "sw.js": "79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2",
  "test_fixde.js": "3998fc2013baee3fac71ceae7831f319adb8d793dd9a0bc8d15868fbe244d190",
  "docs/SPR_PINS.json": "6692af6935a1444bafb0837e6b78fc741764d8a5a6d69f1b325b2bdf57b47a6b",
  "docs/tasks/t603-shots/scene603.js": "e5fd14ff63dc94699ffe50e5797534109dd0d9da4c29d34afaa15dbc8117623b",
  "docs/tasks/t603-shots/foreground603.js": "4b18070173add493bbc697a667ff384d4fdb1d023bac8af18817118788fe6558",
  "docs/tasks/t603-shots/fixtures/manifest.json": "a7fe95b8691e475fc67729b36f9ca7c5d0e05d8a60f7d52e7f0975d0ab8a9462",
  "docs/tasks/t603-shots/fixtures/seed22-d3-420-v11.211.json": "1e1711c58cc9a293c94c031f5dcf13c8792933759131045a803c682b45ebbd72",
  "docs/tasks/t603-shots/fixtures/seed301-d1-400-v11.211.json": "97f19b4e0f972e4d4eb7fe1190accf6b1de13569fd2f0ebc2a363a548e714aae",
  "docs/tasks/t603-shots/fixtures/seed777-d1-400-v11.211.json": "3f96d565b4650cf87782b12092527384e6d60336a1bbc4973baecb48e786c384",
  "docs/tasks/t603-shots/fixtures/sprite-pins-v11.211.json": "14b4dbb06a1b9b5bf13cdbd2572b6213052c058f453c47aa6de2d9cf9e8e8e60",
  "docs/tasks/t603-shots/fixtures/sw-before-lifetime603.js": "37a150eb00a391630b76c0afb3b9176a846606dc57ef5a4d4e5111ae8044807c"
};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const [file,expected]of Object.entries(HASHES))if(sha(fs.readFileSync(path.join(ROOT,file)))!==expected)throw Error('Frozen source/fixture differs: '+file);
const PLAN=[['no-trace','trace'],['trace','no-trace'],['no-trace','trace']];
const CATEGORIES=['devtools.timeline','gpu','cc','blink.user_timing'];

// Capture the original generated foreground harness without starting it.
let source;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'foreground603.js'),'utf8'),{
  require,__dirname,process:{argv:['node','foreground603.js','--check-overlay']},console:{log(){}},
  Function:function(...args){if(args.length>1)source=args.at(-1);return function(){};}
});
if(!source)throw Error('Original foreground overlay was not captured');
const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Light trace anchor missing/ambiguous: '+a.slice(0,100));source=source.replace(a,b);};
const replaceSection=(start,end,value)=>{const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a||source.indexOf(start,a+start.length)>=0)throw Error('Light trace section missing/ambiguous: '+start);source=source.slice(0,a)+value+source.slice(b+end.length);};

// Same wrappers and original duration arrays. Copy arrays only AFTER disabling sampling.
replace('perfWork:()=>{measureWork603=false;const out={};',
  'perfWork:()=>{measureWork603=false;const stoppedAt=performance.now(),samples=Object.fromEntries(Object.entries(work603).map(([k,a])=>[k,a.slice()]));const out={};');
replace('return {work:out,state:{speed,running,quality,cars:cars.length,citizens:citizens.length,visT,day,visibility:document.visibilityState}',
  'return {work:out,samples,stoppedAt,state:{speed,running,quality,cars:cars.length,citizens:citizens.length,visT,day,visibility:document.visibilityState}');

// Read-only diagnostic state: no synthetic advance/draw/spawn or product mutation.
replace('  window.__s603={',`  window.__s603={
    population603:()=>({cars:cars.length,citizens:citizens.length,speed,running,quality,visT,day,trafClock,lastDraw,measuring:measureWork603,visibility:document.visibilityState,focused:document.hasFocus()}),`);

// Fresh documents naturally refill live traffic using the unchanged native loop.
// Every condition gets the identical bounded rule BEFORE original cold + 30 warm draws.
function settlePopulation603(){
  return new Promise(resolve=>{
    const started=performance.now(),initial=__s603.population603(),history=[];
    let stableSince=null;
    const finish=(state,error=null)=>resolve({error,target:{cars:64,citizens:48},limitMs:60000,stableRequiredMs:2000,pollMs:250,
      started,finished:performance.now(),elapsedMs:performance.now()-started,stableSince,initial,final:state,history,
      method:'read-only 250 ms polling; unchanged native rendering/advance only; no work sampling'});
    const poll=()=>{
      const now=performance.now(),state=__s603.population603();history.push({elapsedMs:now-started,...state});
      if(state.speed!==0||!state.running||state.quality!==1||state.visT!==100||state.measuring||state.visibility!=='visible'||!state.focused){finish(state,'Population settling lost original live/focused paused preconditions');return;}
      if(state.cars===64&&state.citizens===48){if(stableSince===null)stableSince=now;}else stableSince=null;
      if(stableSince!==null&&now-stableSince>=2000&&state.trafClock>initial.trafClock){finish(state);return;}
      if(now-started>=60000){finish(state,'Native population did not settle to 64 cars / 48 citizens within 60 seconds');return;}
      setTimeout(poll,250);
    };
    poll();
  });
}

// The acceptance RAF predicate, first-frame exclusion and interval counting are unchanged.
// Sampling stops inside the final RAF callback, before serialization, any host roundtrip,
// Tracing.end, stream drain or compression. This function runs identically in A and B.
function sampleWindow603(ms,label){
  return new Promise((resolve,reject)=>{
    if(ms!==5000||document.visibilityState!=='visible'||!document.hasFocus()||!__s603.view().running){reject(Error('Exact visible/focused running 5-second window required'));return;}
    const focusEvents=[],focusSnapshot=()=>({now:performance.now(),visibility:document.visibilityState,focused:document.hasFocus()});
    const onFocus=()=>focusEvents.push(focusSnapshot());
    document.addEventListener('visibilitychange',onFocus);window.addEventListener('blur',onFocus);window.addEventListener('focus',onFocus);
    const populationBefore=__s603.population603();
    if(populationBefore.cars!==64||populationBefore.citizens!==48||populationBefore.speed!==0||!populationBefore.running||populationBefore.quality!==1||populationBefore.visT!==100||populationBefore.measuring){document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('blur',onFocus);window.removeEventListener('focus',onFocus);reject(Error('Original settled population changed before window start'));return;}
    const before=focusSnapshot(),a=[];let last,firstRAF=null,rafId=null,ended=false,focusChecks=0;
    const start=performance.now();__s603.perfStart();
    performance.mark(label+':start',{startTime:start});
    const finish=(t,error=null)=>{
      if(ended)return;ended=true;
      const work=__s603.perfWork(); // FIRST: synchronous stop, including on timeout/focus loss.
      const callbackStop=performance.now();
      clearTimeout(timer);if(rafId!==null)cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('blur',onFocus);window.removeEventListener('focus',onFocus);
      const after=focusSnapshot();
      performance.mark(label+':raf-end',{startTime:t});performance.mark(label+':work-stop',{startTime:work.stoppedAt});
      resolve({error,elapsed:t-start,frames:a.length,intervals:a,visibility:after.visibility,
        work,populationBefore,focus:{before,after,events:focusEvents,checks:focusChecks,lost:focusEvents.some(e=>e.visibility!=='visible'||!e.focused)||!!error},
        clocks:{timeOrigin:performance.timeOrigin,start,firstRAF,lastRAF:t,workStoppedAt:work.stoppedAt,callbackStop,
          rafDurationMs:t-start,workDurationMs:work.stoppedAt-start,stopLagAfterRAFTimestampMs:work.stoppedAt-t,
          marks:{start:label+':start',rafEnd:label+':raf-end',workStop:label+':work-stop'}}});
    };
    const timer=setTimeout(()=>finish(performance.now(),'RAF stalled'),ms+15000);
    function f(t){
      focusChecks++;
      if(document.visibilityState!=='visible'||!document.hasFocus()){finish(t,'Foreground lost during sampled RAF');return;}
      if(firstRAF===null)firstRAF=t;
      if(last!==undefined)a.push(t-last);last=t;
      if(t-start>=ms)finish(t);else rafId=requestAnimationFrame(f);
    }
    rafId=requestAnimationFrame(f);
  });
}

function observerAnalysis603(samples){
  if(samples.length!==6)throw Error('Exactly six completed samples required');
  const metric=r=>({fps:r.raf.frames/(r.raf.elapsed/1000),rafP95Ms:r.raf.p95,
    advanceMeanMs:r.work.advance.mean,drawMeanMs:r.work.draw.mean,hudMeanMs:r.work.hud.mean,
    advanceMsPerDrawFrame:r.rawWork.advance.reduce((a,b)=>a+b,0)/r.work.draw.calls,
    drawMsPerDrawFrame:r.rawWork.draw.reduce((a,b)=>a+b,0)/r.work.draw.calls,
    hudMsPerDrawFrame:r.rawWork.hud.reduce((a,b)=>a+b,0)/r.work.draw.calls});
  const A=samples.filter(s=>s.condition==='no-trace'),B=samples.filter(s=>s.condition==='trace');
  if(A.length!==3||B.length!==3)throw Error('Three samples of each condition required');
  const values=A.map(metric),ranges={};
  for(const k of Object.keys(values[0])){const v=values.map(r=>r[k]),mean=v.reduce((a,b)=>a+b,0)/3,lo=Math.min(...v),hi=Math.max(...v);ranges[k]={values:v,min:lo,max:hi,span:hi-lo,mean,spanPercentOfMean:mean?100*(hi-lo)/mean:null};}
  const traceComparisons=B.map(row=>{const metrics=metric(row),outside=Object.keys(metrics).filter(k=>metrics[k]<ranges[k].min||metrics[k]>ranges[k].max);return {sampleId:row.sampleId,metrics,outsideNoTraceRange:outside,classification:outside.length?'observer-contamination':'within-observed-no-trace-range'};});
  const pairs=[1,2,3].map(pair=>{const a=samples.find(s=>s.pair===pair&&s.condition==='no-trace'),b=samples.find(s=>s.pair===pair&&s.condition==='trace'),ma=metric(a),mb=metric(b);return {pair,order:samples.filter(s=>s.pair===pair).map(s=>s.condition),noTraceSample:a.sampleId,traceSample:b.sampleId,delta:Object.fromEntries(Object.keys(ma).map(k=>[k,{absolute:mb[k]-ma[k],percent:ma[k]?100*(mb[k]-ma[k])/ma[k]:null}]))};});
  return {noTraceRepeatability:ranges,traceComparisons,pairs,
    classification:traceComparisons.some(r=>r.outsideNoTraceRange.length)?'observer-contamination':'within-observed-no-trace-range',
    interpretation:'Any trace metric outside the observed three-run no-trace min/max is labelled observer-contamination, never optimization gain. Three pairs are descriptive only, not a significance test or proof of zero overhead. Work call arrays are not assumed to map 1:1 to RAF intervals. Nested GPU/CPU events must not be summed.',
    acceptanceTiming:false,clears55FPS:false,clearsPixelGate:false};
}

replace("const PHASE='core';","const PHASE='lighttrace';");
replace("['full','core','world','neighbors','raster'].includes(PHASE)","['full','core','world','neighbors','raster','lighttrace'].includes(PHASE)");
replace("coverage:{core:false,world:false,neighbors:false,raster:false},diagnosticOnly:PHASE==='raster'","coverage:{core:false,world:false,neighbors:false,raster:false,lighttrace:false},diagnosticOnly:true");
replace("const check=(v,m)=>",'const observerAnalysis603='+observerAnalysis603.toString()+';\nconst sampleWindow603='+sampleWindow603.toString()+';\nconst settlePopulation603='+settlePopulation603.toString()+';\nconst check=(v,m)=>');
replaceSection('    const raf=async ms=>{',"visibility:r.visibility};};",`    const raf=async(ms,label)=>{
      const r=await ev('('+sampleWindow603.toString()+')('+ms+','+JSON.stringify(label)+')');
      return {...r,mean:r.frames?r.intervals.reduce((a,b)=>a+b,0)/r.frames:0,p95:r.frames?pct(r.intervals,.95):0,max:r.frames?Math.max(...r.intervals):0};
    };`);
replaceSection('    const traceFrameWork603=async label=>{',"return {file,uncompressedBytes:Buffer.byteLength(text)};};",`    let activeLightTrace603=null;
    const beginLightTrace603=async label=>{
      check(activeLightTrace603===null,'no overlapping diagnostic trace');
      const complete=new Promise(resolve=>{traceResolve603=resolve;});
      const startedHost=Date.now();
      await send('Tracing.start',{traceConfig:{recordMode:'recordAsMuchAsPossible',enableSampling:false,includedCategories:${JSON.stringify(CATEGORIES)}},transferMode:'ReturnAsStream'});
      activeLightTrace603={label,complete,startedHost};
      return {startedHost,readyHost:Date.now(),categories:${JSON.stringify(CATEGORIES)},cpuSampling:false};
    };
    const endLightTrace603=async()=>{
      const active=activeLightTrace603;check(!!active,'one active diagnostic trace');
      const endRequestedHost=Date.now();await send('Tracing.end');
      let timer;const done=await Promise.race([active.complete,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Trace completion timeout')),30000);})]).finally(()=>clearTimeout(timer));
      check(typeof done.stream==='string'&&done.stream.length>0,'trace stream supplied');
      const rawFile='T603-'+active.label+'-trace.json',rawPath=path.join(OUT,rawFile),fd=fs.openSync(rawPath,'wx');
      let bytes=0,reads=0;const drainStartedHost=Date.now();
      try{for(;;){check(Date.now()-drainStartedHost<45000,'trace drain stays within 45 seconds');const r=await send('IO.read',{handle:done.stream,size:262144}),b=r.base64Encoded?Buffer.from(r.data,'base64'):Buffer.from(r.data,'utf8');bytes+=b.length;reads++;check(bytes<=96*1024*1024,'trace uncompressed size <=96 MiB');fs.writeSync(fd,b);if(r.eof)break;}}finally{fs.closeSync(fd);await send('IO.close',{handle:done.stream});}
      activeLightTrace603=null;
      return {rawFile,uncompressedBytes:bytes,reads,dataLossOccurred:done.dataLossOccurred??null,startedHost:active.startedHost,endRequestedHost,drainStartedHost,drainFinishedHost:Date.now()};
    };
    const finishLightTraces603=async()=>{
      const pipeline=require('stream/promises').pipeline;
      for(const sample of report.lightTrace603.samples.filter(s=>s.condition==='trace')){
        const rawPath=path.join(OUT,sample.trace.rawFile),data=JSON.parse(fs.readFileSync(rawPath,'utf8'));
        check(Array.isArray(data.traceEvents),'trace has an event array');
        const marks=Object.fromEntries(Object.entries(sample.clocks.marks).map(([key,name])=>[key,data.traceEvents.filter(e=>e.name===name&&String(e.cat).includes('blink.user_timing')).map(({name,cat,ts,pid,tid,ph})=>({name,cat,ts,pid,tid,ph}))]));
        sample.trace.clockMarkers=marks;sample.trace.eventCount=data.traceEvents.length;
        sample.trace.cpuSamplingEvents=data.traceEvents.filter(e=>/^(Profile|ProfileChunk|V8Sample)$/.test(e.name)||String(e.cat).includes('cpu_profiler')).length;
        sample.trace.categoriesSeen=[...new Set(data.traceEvents.flatMap(e=>String(e.cat||'').split(',')))].sort();
        check(Object.values(marks).every(v=>v.length===1&&Number.isFinite(v[0].ts)),'three unambiguous timing markers '+sample.sampleId);
        sample.trace.markerRAFDifferenceMs=(marks.rafEnd[0].ts-marks.start[0].ts)/1000;
        sample.trace.markerWorkDifferenceMs=(marks.workStop[0].ts-marks.start[0].ts)/1000;
        check(Math.abs(sample.trace.markerRAFDifferenceMs-sample.clocks.rafDurationMs)<2&&Math.abs(sample.trace.markerWorkDifferenceMs-sample.clocks.workDurationMs)<2,'trace/browser clocks agree within 2 ms '+sample.sampleId);
        check(sample.trace.cpuSamplingEvents===0&&sample.trace.dataLossOccurred!==true,'no CPU profile or reported trace data loss '+sample.sampleId);
        check(!sample.trace.categoriesSeen.some(c=>c.startsWith('disabled-by-default-skia')),'no disabled-by-default Skia categories');
        const file=sample.trace.rawFile+'.gz';await pipeline(fs.createReadStream(rawPath),require('zlib').createGzip(),fs.createWriteStream(path.join(OUT,file),{flags:'wx'}));
        sample.trace.file=file;sample.trace.compressedBytes=fs.statSync(path.join(OUT,file)).size;sample.trace.sha256=hash(fs.readFileSync(path.join(OUT,file)));fs.rmSync(rawPath);delete sample.trace.rawFile;persist();
      }
    };`);

const diagnosticBlock=`    if(PHASE==='lighttrace'){
      report.acceptanceStatus='blocked: original 55 FPS, relative-performance and exact-pixel gates remain unchanged; observer-effect evidence cannot clear them';
      report.sourceRef603=${JSON.stringify(ACCEPTED)};report.sourceContract603=${JSON.stringify(HASHES)};
      report.lightTrace603={plan:${JSON.stringify(PLAN)},categories:${JSON.stringify(CATEGORIES)},samples:[],pairCount:3,sampleCount:6,nominalWindowMs:5000,
        framework:'accepted T603-on candidate only',scene:{seed:22,size:72,difficulty:3,steps:420,camera:[22,14],zoom:1,rotation:0,season:1,visT:100,viewport:[1400,900],dpr:1,liveActors:true,simulationSpeed:0},
        timingPolicy:'Original advance/draw/HUD duration wrappers and original RAF elapsed>=5000 predicate. Start and stop are synchronous in the browser; work stops in final RAF before trace-end/drain. Identical observer in both conditions. No screenshots/readback inside windows.',
        referenceAcceptance:'formal SW source '+${JSON.stringify(ACCEPTED)},referenceHeavyProfile:37542608418,referenceHeavyProfileCaveat:'Corrected profile excluded trace drain; command boundaries and Profiler.stop were still inside its work interval.',acceptanceTiming:false};
      const gpu=report.gpuInfo||{},aux=gpu.auxAttributes||{},display=report.displayMode603?.after||{};
      report.lightTrace603.backend={platform:process.platform,arch:process.arch,browser:report.browserVersion.product,display,devices:gpu.devices,displayType:aux.displayType,skiaBackendType:aux.skiaBackendType,glRenderer:aux.glRenderer,glImplementationParts:aux.glImplementationParts,featureStatus:gpu.featureStatus};
      check(process.platform==='darwin'&&process.arch==='arm64','same standard macos-15 ARM64 hardware class');
      check(report.browserVersion.product==='Chrome/152.0.7977.83','same accepted Chrome build, no silent browser/backend rebase');
      check(aux.displayType==='ANGLE_METAL'&&aux.skiaBackendType==='GraphiteDawnMetal'&&/Apple Paravirtual device/.test(aux.glRenderer||''),'same accepted native Metal/Graphite backend');
      check(display.width===1600&&display.height===1200&&display.pixelWidth===1600&&display.pixelHeight===1200&&display.refreshRate===60,'same accepted native display 1600x1200 at 60 Hz');
      const focus=report.census[85][0];check(JSON.stringify(focus)===JSON.stringify([21,13,2]),'unchanged original census focus yields camera 22,14');
      const plan=${JSON.stringify(PLAN)};
      let sequence=0,canonicalSceneHash=null;
      for(let pair=1;pair<=3;pair++)for(const condition of plan[pair-1]){
        sequence++;const sampleId='pair'+pair+'-'+condition,label='lighttrace603-'+sampleId;
        // Each condition receives a fresh document, the same true seeded growth and original cold + 30-draw warmup.
        const origin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(origin);
        await ev('document.getElementById("bNewGame").click();true');await growCity('lighttrace-'+sampleId);
        await ev('window.__noT603=false;true');await camera(focus[0]+1,focus[1]+1,1,0,1,100,false);
        const foregroundBefore=await foregroundState603(true);check(foregroundBefore.valid,'native foreground before '+sampleId);
        const before=await ev('({view:__s603.view(),viewport:__s603.viewport(),flags:__s603.flags(),identity:__s603.documentIdentity(),clipOverride:typeof window.__noClip603,scene:__s603.scene()})');
        check(before.identity.version==='11.212'&&before.identity.civicFactory==='function'&&before.identity.url==='/index.html'&&before.flags.T603&&!before.flags.T596&&!before.flags.T600&&before.clipOverride==='undefined','exact accepted runtime and unchanged clip path '+sampleId);
        check(before.viewport.cssWidth===1400&&before.viewport.cssHeight===900&&before.viewport.width===1400&&before.viewport.height===900&&before.viewport.dpr===1&&before.viewport.devicePixelRatio===1,'exact accepted viewport '+sampleId);
        check(before.view.speed===0&&before.view.running===true&&before.view.rot===0&&before.view.season===1&&before.view.cam.x===256&&before.view.cam.y===576&&before.view.cam.z===1,'same live paused scene/camera '+sampleId);
        const sceneHash=hash(before.scene);if(canonicalSceneHash===null)canonicalSceneHash=sceneHash;check(sceneHash===canonicalSceneHash,'same canonical scene across all windows '+sampleId);delete before.scene;
        const settling=await ev('('+settlePopulation603.toString()+')()');
        report.lightTrace603.settling=report.lightTrace603.settling||[];report.lightTrace603.settling.push({sampleId,condition,...settling});persist();
        check(!settling.error&&settling.final.cars===64&&settling.final.citizens===48,'native population settled before cold and warm draws '+sampleId+': '+(settling.error||''));
        check(hash(await ev('__s603.scene()'))===sceneHash,'native settling leaves canonical city unchanged '+sampleId);
        const first=await ev('(()=>{__s603.clear();const cold=__s603.drawMs();return {cold,cache:__s603.cacheStats()};})()'),warm=[];
        for(let i=0;i<30;i++)warm.push(await ev('__s603.drawMs()'));
        const populationBefore=await ev('__s603.population603()');
        check(populationBefore.cars===64&&populationBefore.citizens===48&&populationBefore.speed===0&&populationBefore.running===true&&populationBefore.visT===100&&!populationBefore.measuring,'same settled live population after original warmup '+sampleId);
        const hostBefore=Date.now(),traceStart=condition==='trace'?await beginLightTrace603(label):null;
        let measured,trace;
        try{measured=await raf(5000,label);report.lightTrace603.pendingWindow={pair,sequence,sampleId,condition,returnedHost:Date.now(),measured};persist();}
        finally{
          // On CDP/runtime failure, explicitly stop work before attempting trace shutdown.
          if(!measured)try{await ev('__s603.perfWork()');}catch{}
          if(condition==='trace')trace=await endLightTrace603();
        }
        const {work:workResult,...rafResult}=measured;
        const foregroundAfter=await foregroundState603(),after=await ev('({view:__s603.view(),viewport:__s603.viewport(),flags:__s603.flags(),scene:__s603.scene()})');
        const row={pair,sequence,order:plan[pair-1].join('/'),sampleId,condition,framework:'accepted-T603-on',cold:first.cold,firstCache:first.cache,warm,warmP95:pct(warm,.95),
          raf:rafResult,work:workResult.work,rawWork:workResult.samples,state:workResult.state,heap:workResult.heap,clocks:measured.clocks,focus:measured.focus,
          settling,populationBefore,windowPopulationBefore:measured.populationBefore,before,after:{...after,scene:undefined,sceneSHA256:hash(after.scene)},sceneSHA256:sceneHash,foregroundBefore,foregroundAfter,
          host:{beforeWindow:hostBefore,afterWindowAndDrain:Date.now()},trace:trace?{...traceStart,...trace}:null,acceptanceTiming:false};
        report.lightTrace603.samples.push(row);delete report.lightTrace603.pendingWindow;persist();
        check(!measured.error&&measured.frames>0&&measured.elapsed>=5000&&measured.elapsed<20000,'bounded original RAF window completed '+sampleId);
        check(!measured.focus.lost&&measured.focus.checks===measured.frames+1&&measured.focus.before.focused&&measured.focus.after.focused&&foregroundAfter.valid,'continuous page focus/visibility and native foreground '+sampleId);
        check(workResult.state.speed===0&&workResult.state.running===true&&workResult.state.quality===1&&workResult.state.cars===64&&workResult.state.citizens===48&&workResult.state.visT===100,'original live actors and paused simulation during '+sampleId);
        check(workResult.work.advance.calls>0&&workResult.work.draw.calls>0&&workResult.work.hud.calls>0,'all original real work observed '+sampleId);
        check(['advance','draw','hud'].every(k=>workResult.samples[k].length===workResult.work[k].calls),'raw work durations reconcile '+sampleId);
        check(hash(after.scene)===sceneHash,'measurement leaves canonical city unchanged '+sampleId);
        check(after.viewport.width===1400&&after.viewport.height===900&&after.viewport.dpr===1&&after.flags.T603,'viewport and product flags unchanged after '+sampleId);
      }
      check(report.lightTrace603.samples.length===6&&sequence===6,'exactly three matched pairs, no retries or extra windows');
      report.lightTrace603.analysis=observerAnalysis603(report.lightTrace603.samples);persist();
      // All gzip/JSON parsing and event analysis occur after the six measurement windows.
      await finishLightTraces603();
      report.coverage.lighttrace=true;persist();
    }`;
replaceSection("    if(PHASE==='full'||PHASE==='core'){",'    report.coverage.core=true;persist();}',diagnosticBlock);
replace("check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '+report.performanceFailures.join('; '));",
  "check(report.diagnosticOnly===true&&report.acceptanceStatus.startsWith('blocked:')&&report.lightTrace603.samples.length===6,'diagnostic cannot replace original failed acceptance');");
replace("report.status='passed';exitCode=0;","report.status='diagnostic-collected';exitCode=0;");

// Source-only fail-closed contracts. Never execute the generated harness in check mode.
function checkContracts603(){
  const assert=(v,m)=>{if(!v)throw Error('Light trace contract: '+m);};
  const original=fs.readFileSync(path.join(__dirname,'scene603.js'),'utf8');
  assert(original.includes('if(last!==undefined)a.push(t-last);last=t;if(t-start>=\'+ms+\')'),'original RAF counting/predicate anchor');
  assert(PLAN.length===3&&PLAN.flat().join(',')==='no-trace,trace,trace,no-trace,no-trace,trace','six prescribed windows');
  assert(source.includes('for(let i=0;i<30;i++)warm.push(await ev(\'__s603.drawMs()\'))'),'original 30-draw warmup');
  assert((source.match(/send\('Tracing.start'/g)||[]).length===1,'only one trace-start call site');
  assert(!/send\('Profiler\./.test(source)&&!CATEGORIES.some(c=>c.startsWith('disabled-by-default-')),'no profiler/Skia trace request');
  assert(CATEGORIES.join(',')==='devtools.timeline,gpu,cc,blink.user_timing','minimal trace categories');
  const windowSource=sampleWindow603.toString();
  assert(!/getImageData|toDataURL|captureScreenshot|Profiler|Tracing|gzip|IO\.read/.test(windowSource),'no observation readback, tracing control or drain in browser window');
  assert(windowSource.indexOf('const work=__s603.perfWork()')<windowSource.indexOf('const callbackStop='),'work stops first at final callback');
  for(const guard of ['fixture SHA ','grown city exact roots ','grown city canonical save matches fixture ','slot3 set before game boot','immutable baseline has 1586 keys','two independent Chrome boots have identical complete sprite pins','all 16 actual escape-valve canvas frames equal exact-main source'])assert(source.includes(guard),'retained fixture guard '+guard);
  assert(source.includes(diagnosticBlock),'execution-tested diagnostic block is inserted unchanged');
  assert(!/GV\.step|GV\.forceDraw|requestAnimationFrame|perfStart|spawnCitizen|updCars|advance\(/.test(settlePopulation603.toString()),'population settling is read-only native time, without synthetic frames or sampled windows');
  new Function('require','__filename','__dirname',source);
  return {status:'source-contracts-passed',acceptedRef:ACCEPTED,hashes:HASHES,generatedHarnessSHA256:sha(source),plan:PLAN,categories:CATEGORIES,runtimeExecuted:false};
}
const checked=checkContracts603();
if(require.main===module){
  if(process.argv.includes('--check-light-trace'))console.log(JSON.stringify(checked,null,2));
  else new Function('require','__filename','__dirname',source)(require,path.join(__dirname,'scene603.js'),__dirname);
}
module.exports={sampleWindow603,settlePopulation603,observerAnalysis603,checkContracts603,diagnosticBlock603:diagnosticBlock};
