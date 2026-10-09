    report.candidate='T610 naturally aligned native frame pipeline trace';
    report.native610={source:'23564a810546e585758236553d1432c3aacb760b',runtimeSHA256:'99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d',scope:'Original native frame/advance/draw, no timing wrappers or frozen animation. Trace thread spans overlap and include waits; never sum as CPU costs.',measurementBoundMs:300000,windows:[],profileLaunched:false,profileAccepted:false,releaseGatePassed:false};
    const metrics610={...require('../t604-canvaskit/native606-metrics.cjs'),...require('../t604-canvaskit/native609-metrics.cjs')};
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved art flags unchanged');
    const manifest610=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')),fixture610=manifest610.cities.find(c=>c.seed===22),raw610=fs.readFileSync(path.join(__dirname,'fixtures',fixture610.file),'utf8');
    report.native610.city=await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const roots610=await ev('__s603.roots()');check(!roots610.bad&&roots610.rows.length===fixture610.roots&&hash(JSON.stringify(roots610.rows))===fixture610.rootSHA256,'native seed22 exact root fixture');
    await ev('GV.save();true');check(await ev('__s603.saved()')===await ev('__s603.sourceSaved('+JSON.stringify(raw610)+')'),'native canonical fixture exact before measurement');
    const focus610=(await ev('__s603.census(85)'))[0];await ev('GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(1);GV.lookAt('+JSON.stringify(focus610[0]+1)+','+JSON.stringify(focus610[1]+1)+');GV.setVisT(100);true');
    report.native610.foregroundBefore=await foregroundState603(true);check(report.native610.foregroundBefore.valid,'qualified foreground before unwrapped warmup');
    const initial610=await ev('__s603.status606()');check(initial610.native&&initial610.unwrapped&&initial610.running&&initial610.speed===0,'original unwrapped native frame and animation running');
    const scene610=await ev('__s603.scene()'),start610=Date.now(),deadline610=start610+300000;
    let deadlineTimer610;
    try { await Promise.race([(async()=>{
    const categories610=await send('Tracing.getCategories');report.native610.availableCategories=categories610.categories;const required610=['toplevel','devtools.timeline','blink','cc','viz','gpu','benchmark'];report.native610.selectedCategories=required610.filter(c=>categories610.categories.includes(c));report.native610.categoriesReady=report.native610.selectedCategories.length===required610.length;
    if(!report.native610.categoriesReady)throw Error('Required Chrome trace categories unavailable: '+required610.filter(c=>!categories610.categories.includes(c)).join(','));
    report.native610.warmup=await ev('__s603.observe606(30000)');
    let totalFrames610=report.native610.warmup.frames,qualified610=false;
    report.native610.extraWarmup=[];
    while(totalFrames610<150&&Date.now()-start610+5000<=60000){const w=await ev('__s603.observe606(5000)');totalFrames610+=w.frames;report.native610.extraWarmup.push(w);}
    report.native610.alignment={ready:false,observations:[],maxWaitMs:150000,maxAttempts:1};
    report.native610.warmReady=totalFrames610>=150&&Date.now()-start610<=60000;
    if(report.native610.warmReady){const alignmentStart610=Date.now(),initial610=report.native610.extraWarmup.at(-1)?.after||report.native610.warmup.after;let seenDay610=initial610.light.b>.34;const targetNight610=Math.floor((initial610.visT-82.5)/110+1)*110+82.5;report.native610.alignment.targetVisT=targetNight610;
      while(Date.now()-alignmentStart610<=150000&&Date.now()+53000<deadline610){const state610=await ev('__s603.status606()');if(Date.now()-alignmentStart610>150000||state610.visT>targetNight610+1.5){report.native610.alignment.missedEarliestBoundary=true;break;}if(state610.light.b>.34)seenDay610=true;
        if(seenDay610&&state610.light.b===.34){report.native610.alignment.observations.push(state610);report.native610.alignment.firstNight=state610;report.native610.alignment.ready=state610.nightRemaining>=53.5;break;}
        const last610=report.native610.alignment.observations.at(-1);if(!last610||state610.visT-last610.visT>=5)report.native610.alignment.observations.push(state610);await sleep(250);
      }report.native610.alignment.elapsedMs=Date.now()-alignmentStart610;
      if(report.native610.alignment.ready){for(let i=0;i<6&&Date.now()+23000<deadline610;i++){const w=await ev('__s603.observe606(5000)');totalFrames610+=w.frames;report.native610.windows.push(w);persist();if(metrics610.qualify(report.native610.windows.slice(-3))&&w.after.nightRemaining>=23){qualified610=true;break;}if(w.after.nightRemaining<23)break;}}
    }
    report.native610.qualified=qualified610;report.native610.totalWarmFrames=totalFrames610;
    if(qualified610){
      report.native610.sequence=[];report.native610.sequence.push(await ev('__s603.observe606(5000)'));
      if(Date.now()+18000>deadline610)throw Error('Measurement deadline lacks trace reserve');
      const complete610=new Promise(resolve=>{traceResolve603=resolve;});
      await send('Tracing.start',{categories:report.native610.selectedCategories.join(','),transferMode:'ReturnAsStream'});report.native610.profileLaunched=true;
      try{report.native610.sequence.push(await ev('__s603.observe606(5000)'));}finally{await send('Tracing.end');}
      const done610=await Promise.race([complete610,sleep(30000).then(()=>{throw Error('Trace completion timeout');})]);
      report.native610.traceCompletion={stream:!!done610.stream,dataLossOccurred:done610.dataLossOccurred};
      await sleep(1000);report.native610.sequence.push(await ev('__s603.observe606(5000)'));
      let text610='';if(!done610.stream)throw Error('Trace stream unavailable');
      for(;;){if(Date.now()>deadline610)throw Error('Absolute300-second measurement deadline');const part610=await send('IO.read',{handle:done610.stream});text610+=part610.base64Encoded?Buffer.from(part610.data,'base64').toString('utf8'):part610.data;if(Buffer.byteLength(text610)>64*1024*1024)throw Error('Trace exceeds64MiB bound');if(part610.eof)break;}
      await send('IO.close',{handle:done610.stream});fs.writeFileSync(path.join(OUT,'T610-native-trace.json.gz'),require('zlib').gzipSync(text610));
      report.native610.traceFile='T610-native-trace.json.gz';report.native610.rawTraceSHA256=hash(text610);report.native610.traceEvidence=metrics610.inspectTrace(JSON.parse(text610));
      report.native610.profileScreen=metrics610.traceScreen(...report.native610.sequence);
      report.native610.profileAccepted=report.native610.profileScreen.accepted&&done610.dataLossOccurred===false&&report.native610.traceEvidence.availabilityPassed;
    }
    report.native610.foregroundAfter=await foregroundState603();report.native610.final=await ev('__s603.status606()');
    check(scene610===await ev('__s603.scene()'),'canonical model unchanged during paused-simulation animated native measurement');
    check(report.native610.final.unwrapped&&report.native610.final.native,'original native functions remain unwrapped');
    if(!report.native610.foregroundAfter.valid||report.native610.deadlineExpired||Date.now()>=deadline610)report.native610.profileAccepted=false;
    report.native610.decision=report.native610.profileAccepted?'Stable trace with required event families available; inspect causal frame links before any architecture decision. Wall spans/overlaps/waits are not CPU sums or a release/FPS pass.':'Measurement limit: native workload/runner stability, aligned-night scheduling, trace-interference, data-loss or event-availability screen did not qualify. No product regression or optimization inference; stop without unchanged rerun.';
    console.log('NATIVE610 '+JSON.stringify({qualified:report.native610.qualified,profileLaunched:report.native610.profileLaunched,profileAccepted:report.native610.profileAccepted,warmFrames:totalFrames610,elapsedMs:Date.now()-start610,screen:report.native610.profileScreen,decision:report.native610.decision,traceEvidence:report.native610.traceEvidence}));
    })(),new Promise((_,reject)=>{deadlineTimer610=setTimeout(()=>{
      report.native610.deadlineExpired=true;report.native610.profileAccepted=false;
      report.native610.decision='Measurement limit: absolute 300-second bound exhausted; native browser stopped.';
      persist();try{browser.kill();}catch{}reject(Error('Absolute 300-second measurement deadline'));
    },Math.max(0,deadline610-Date.now()));})]); } finally { clearTimeout(deadlineTimer610); }
    report.coverage.core=true;persist();
