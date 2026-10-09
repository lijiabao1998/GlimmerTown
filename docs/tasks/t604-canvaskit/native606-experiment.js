    report.candidate='T606 unwrapped native warm-qualified CPU measurement';
    report.native606={source:'23564a810546e585758236553d1432c3aacb760b',runtimeSHA256:'99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d',scope:'Original native frame/advance/draw, no timing wrappers or frozen animation. CPU shares are not wall-clock phase costs.',qualificationBoundMs:240000,windows:[],profileLaunched:false,profileAccepted:false,releaseGatePassed:false};
    const metrics606=require('../t604-canvaskit/native606-metrics.cjs');
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved art flags unchanged');
    const manifest606=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')),fixture606=manifest606.cities.find(c=>c.seed===22),raw606=fs.readFileSync(path.join(__dirname,'fixtures',fixture606.file),'utf8');
    report.native606.city=await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const roots606=await ev('__s603.roots()');check(!roots606.bad&&roots606.rows.length===fixture606.roots&&hash(JSON.stringify(roots606.rows))===fixture606.rootSHA256,'native seed22 exact root fixture');
    await ev('GV.save();true');check(await ev('__s603.saved()')===await ev('__s603.sourceSaved('+JSON.stringify(raw606)+')'),'native canonical fixture exact before measurement');
    const focus606=(await ev('__s603.census(85)'))[0];await ev('GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(1);GV.lookAt('+JSON.stringify(focus606[0]+1)+','+JSON.stringify(focus606[1]+1)+');GV.setVisT(100);true');
    report.native606.foregroundBefore=await foregroundState603(true);check(report.native606.foregroundBefore.valid,'qualified foreground before unwrapped warmup');
    const initial606=await ev('__s603.status606()');check(initial606.native&&initial606.unwrapped&&initial606.running&&initial606.speed===0,'original unwrapped native frame and animation running');
    const scene606=await ev('__s603.scene()'),start606=Date.now(),deadline606=start606+240000;
    report.native606.warmup=await ev('__s603.observe606(30000)');
    let totalFrames606=report.native606.warmup.frames,qualified606=false;
    while(Date.now()+5000<deadline606){const window606=await ev('__s603.observe606(5000)');totalFrames606+=window606.frames;report.native606.windows.push(window606);report.native606.elapsedMs=Date.now()-start606;persist();const last606=report.native606.windows.slice(-3);if(totalFrames606>=150&&metrics606.qualify(last606)&&window606.after.nightRemaining>=17){qualified606=true;break;}}
    report.native606.qualified=qualified606;report.native606.totalWarmFrames=totalFrames606;
    if(qualified606){
      report.native606.sequence=[];report.native606.sequence.push(await ev('__s603.observe606(5000)'));
      await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Profiler.start');report.native606.profileLaunched=true;
      try{report.native606.sequence.push(await ev('__s603.observe606(5000)'));}finally{const stopped606=await send('Profiler.stop');fs.writeFileSync(path.join(OUT,'T606-native.cpuprofile'),JSON.stringify(stopped606.profile));report.native606.profileFile='T606-native.cpuprofile';report.native606.rawProfileSHA256=hash(JSON.stringify(stopped606.profile));report.native606.sampledCPU=metrics606.summarizeProfile(stopped606.profile);await send('Profiler.disable');}
      report.native606.sequence.push(await ev('__s603.observe606(5000)'));
      report.native606.profileScreen=metrics606.profileScreen(...report.native606.sequence);report.native606.profileAccepted=report.native606.profileScreen.accepted;
    }
    report.native606.foregroundAfter=await foregroundState603();report.native606.final=await ev('__s603.status606()');
    check(scene606===await ev('__s603.scene()'),'canonical model unchanged during paused-simulation animated native measurement');
    check(report.native606.final.unwrapped&&report.native606.final.native,'original native functions remain unwrapped');
    if(!report.native606.foregroundAfter.valid)report.native606.profileAccepted=false;
    report.native606.decision=report.native606.profileAccepted?'Qualified sampled native CPU call tree available; sampled shares are not wall-clock component costs or a release/FPS pass.':'Measurement limit: native workload/runner stability or profiler-interference screen did not qualify. No product regression or optimization inference; stop without unchanged rerun.';
    console.log('NATIVE606 '+JSON.stringify({qualified:report.native606.qualified,profileLaunched:report.native606.profileLaunched,profileAccepted:report.native606.profileAccepted,warmFrames:totalFrames606,elapsedMs:Date.now()-start606,screen:report.native606.profileScreen,decision:report.native606.decision,sampledCPU:report.native606.profileAccepted?report.native606.sampledCPU:null}));
    report.coverage.core=true;persist();
