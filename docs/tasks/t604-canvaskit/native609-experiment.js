    report.candidate='T609 unmodified native frame pipeline trace';
    report.native609={source:'23564a810546e585758236553d1432c3aacb760b',runtimeSHA256:'99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d',scope:'Original native frame/advance/draw, no timing wrappers or frozen animation. Trace thread spans overlap and include waits; never sum as CPU costs.',qualificationBoundMs:240000,windows:[],profileLaunched:false,profileAccepted:false,releaseGatePassed:false};
    const metrics609={...require('../t604-canvaskit/native606-metrics.cjs'),...require('../t604-canvaskit/native609-metrics.cjs')};
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved art flags unchanged');
    const manifest609=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')),fixture609=manifest609.cities.find(c=>c.seed===22),raw609=fs.readFileSync(path.join(__dirname,'fixtures',fixture609.file),'utf8');
    report.native609.city=await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const roots609=await ev('__s603.roots()');check(!roots609.bad&&roots609.rows.length===fixture609.roots&&hash(JSON.stringify(roots609.rows))===fixture609.rootSHA256,'native seed22 exact root fixture');
    await ev('GV.save();true');check(await ev('__s603.saved()')===await ev('__s603.sourceSaved('+JSON.stringify(raw609)+')'),'native canonical fixture exact before measurement');
    const focus609=(await ev('__s603.census(85)'))[0];await ev('GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(1);GV.lookAt('+JSON.stringify(focus609[0]+1)+','+JSON.stringify(focus609[1]+1)+');GV.setVisT(100);true');
    report.native609.foregroundBefore=await foregroundState603(true);check(report.native609.foregroundBefore.valid,'qualified foreground before unwrapped warmup');
    const initial609=await ev('__s603.status606()');check(initial609.native&&initial609.unwrapped&&initial609.running&&initial609.speed===0,'original unwrapped native frame and animation running');
    const scene609=await ev('__s603.scene()'),start609=Date.now(),deadline609=start609+240000;
    const categories609=await send('Tracing.getCategories');report.native609.availableCategories=categories609.categories;const required609=['toplevel','devtools.timeline','blink','cc','viz','gpu','benchmark'];report.native609.selectedCategories=required609.filter(c=>categories609.categories.includes(c));report.native609.categoriesReady=report.native609.selectedCategories.length===required609.length;
    if(!report.native609.categoriesReady)throw Error('Required Chrome trace categories unavailable: '+required609.filter(c=>!categories609.categories.includes(c)).join(','));
    report.native609.warmup=await ev('__s603.observe606(30000)');
    let totalFrames609=report.native609.warmup.frames,qualified609=false;
    while(Date.now()+5000<deadline609){const window609=await ev('__s603.observe606(5000)');totalFrames609+=window609.frames;report.native609.windows.push(window609);report.native609.elapsedMs=Date.now()-start609;persist();const last609=report.native609.windows.slice(-3);if(totalFrames609>=150&&metrics609.qualify(last609)&&window609.after.nightRemaining>=23){qualified609=true;break;}}
    report.native609.qualified=qualified609;report.native609.totalWarmFrames=totalFrames609;
    if(qualified609){
      report.native609.sequence=[];report.native609.sequence.push(await ev('__s603.observe606(5000)'));
      const complete609=new Promise(resolve=>{traceResolve603=resolve;});
      await send('Tracing.start',{categories:report.native609.selectedCategories.join(','),transferMode:'ReturnAsStream'});report.native609.profileLaunched=true;
      try{report.native609.sequence.push(await ev('__s603.observe606(5000)'));}finally{await send('Tracing.end');}
      const done609=await Promise.race([complete609,sleep(30000).then(()=>{throw Error('Trace completion timeout');})]);
      report.native609.traceCompletion={stream:!!done609.stream,dataLossOccurred:done609.dataLossOccurred};
      await sleep(1000);report.native609.sequence.push(await ev('__s603.observe606(5000)'));
      let text609='';if(!done609.stream)throw Error('Trace stream unavailable');
      for(;;){const part609=await send('IO.read',{handle:done609.stream});text609+=part609.base64Encoded?Buffer.from(part609.data,'base64').toString('utf8'):part609.data;if(Buffer.byteLength(text609)>64*1024*1024)throw Error('Trace exceeds64MiB bound');if(part609.eof)break;}
      await send('IO.close',{handle:done609.stream});fs.writeFileSync(path.join(OUT,'T609-native-trace.json.gz'),require('zlib').gzipSync(text609));
      report.native609.traceFile='T609-native-trace.json.gz';report.native609.rawTraceSHA256=hash(text609);report.native609.traceEvidence=metrics609.inspectTrace(JSON.parse(text609));
      report.native609.profileScreen=metrics609.traceScreen(...report.native609.sequence);
      report.native609.profileAccepted=report.native609.profileScreen.accepted&&done609.dataLossOccurred===false&&report.native609.traceEvidence.availabilityPassed;
    }
    report.native609.foregroundAfter=await foregroundState603();report.native609.final=await ev('__s603.status606()');
    check(scene609===await ev('__s603.scene()'),'canonical model unchanged during paused-simulation animated native measurement');
    check(report.native609.final.unwrapped&&report.native609.final.native,'original native functions remain unwrapped');
    if(!report.native609.foregroundAfter.valid)report.native609.profileAccepted=false;
    report.native609.decision=report.native609.profileAccepted?'Stable trace with required event families available; inspect causal frame links before any architecture decision. Wall spans/overlaps/waits are not CPU sums or a release/FPS pass.':'Measurement limit: native workload/runner stability, trace-interference, data-loss or event-availability screen did not qualify. No product regression or optimization inference; stop without unchanged rerun.';
    console.log('NATIVE609 '+JSON.stringify({qualified:report.native609.qualified,profileLaunched:report.native609.profileLaunched,profileAccepted:report.native609.profileAccepted,warmFrames:totalFrames609,elapsedMs:Date.now()-start609,screen:report.native609.profileScreen,decision:report.native609.decision,traceEvidence:report.native609.traceEvidence}));
    report.coverage.core=true;persist();
