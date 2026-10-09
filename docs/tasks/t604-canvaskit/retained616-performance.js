    report.candidate='T616 live native retained-layer performance';report.releaseGatePassed=false;
    const perf616=report.retained616Performance={arm:process.env.T616_PERF_ARM||'paired',zoom:Number(process.env.T616_PERF_ZOOM||1),measurementBoundMs:240000,
      warm:[],qualification:[],rows:[],qualified:false,accepted:false,releaseGatePassed:false,
      scope:'Unwrapped native game rAF/advance/draw; simulation speed zero with original live visual animation. Full frame counts and intervals, no component-derived FPS.',
      visualContract:'Frozen T614 passed29synthetic and120city exact pixels; transitions and full regression remain separate gates. No T615 visual exception is applied to this candidate.',
      observerOverhead:{isolated:false,note:'Paired mode has observer in both arms. Net product comparison requires separate fresh observer-free / candidate-only / observer-free pages.'}};
    if(!['paired','observer-free','native-t603','observer-only','candidate-only'].includes(perf616.arm)||![1,.7].includes(perf616.zoom))throw Error('Invalid T616 child arm/zoom');
    const metrics616=require('../t604-canvaskit/retained616-performance-metrics.cjs');
    report.flags=await ev('__s603.flags()');check(report.flags.T603===(perf616.arm!=='observer-free')&&!report.flags.T596&&!report.flags.T600,'T616 expected exact main or approved-art flags preserved');
    perf616.sourceBaseline=perf616.arm==='observer-free'?{commit:'329f660e3d5f011ac28454cb6d6a68f8525c69cc',gitBlob:'3c065a4952706a51147c3f64080ba2489977fb16',sha256:'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265',scope:'Exact live T602 index reconstructed by verified inverse art transform, isolated save namespace only'}:{commit:'23564a810546e585758236553d1432c3aacb760b',scope:perf616.arm==='native-t603'?'Approved native T603, no observer or retention':'Approved native T603 with retained614 overlay and source observer'};
    const fixture616=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')).cities.find(c=>c.seed===22);
    const raw616=fs.readFileSync(path.join(__dirname,'fixtures',fixture616.file),'utf8');
    perf616.city=await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const roots616=await ev('__s603.roots()');check(!roots616.bad&&roots616.rows.length===fixture616.roots&&hash(JSON.stringify(roots616.rows))===fixture616.rootSHA256,'T616 exact canonical seed22 roots');
    await ev('GV.save();true');check(await ev('__s603.saved()')===await ev('__s603.sourceSaved('+JSON.stringify(raw616)+')'),'T616 canonical save matches fixture before timing');
    const focus616=(await ev('__s603.census(85)'))[0];
    // One deterministic startup phase before all warmup. No later clock writes.
    await ev('GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom('+perf616.zoom+');GV.lookAt('+(focus616[0]+1)+','+(focus616[1]+1)+');GV.setVisT(100);true');
    perf616.foregroundBefore=await foregroundState603(true);check(perf616.foregroundBefore.valid,'T616 foreground qualified before live warmup');
    perf616.initial=await ev('__retained616Perf.install({observerFree:'+(['observer-free','native-t603'].includes(perf616.arm))+'})');
    check(perf616.initial.unwrapped&&perf616.initial.native&&perf616.initial.layerExpected&&perf616.initial.running&&perf616.initial.speed===0,'T616 original frame/advance/draw remain unwrapped');
    const scene616=await ev('__s603.scene()'),save616=await ev('__s603.saved()');
    const started616=Date.now(),deadline616=started616+240000;let watchdog616;
    const singleMode616=perf616.arm==='candidate-only'?'candidate':'original';
    try{await Promise.race([(async()=>{
      const warmModes616=perf616.arm==='paired'?['original','candidate']:[singleMode616,singleMode616];
      for(const mode of warmModes616){const row=await ev('__retained616Perf.observe(20000,'+JSON.stringify(mode)+')');perf616.warm.push({mode,...row});persist();}
      perf616.warmFrames=perf616.warm.reduce((n,w)=>n+w.frames,0);
      perf616.warmReady=perf616.warmFrames>=150&&perf616.warm.every(w=>w.validFrames&&w.gameFramesMatched&&w.after.unwrapped&&w.after.layerExpected)&&Date.now()-started616<60000;
      if(!perf616.warmReady){perf616.decision='Measurement limit: two live warm windows did not qualify within the declared bound.';return;}
      const qualificationMode616=perf616.arm==='candidate-only'?'candidate':'original';
      await ev('__retained616Perf.mode('+JSON.stringify(qualificationMode616)+')');
      const first616=await ev('__retained616Perf.status()'),cycle616=first616.cycle;
      const target616=Math.floor((first616.visT-cycle616*.75)/cycle616+1)*cycle616+cycle616*.75;
      const alignmentStart616=Date.now();let seenDay616=first616.light.b>.34;
      perf616.alignment={ready:false,targetVisT:target616,maxAttempts:1,maxWaitMs:150000,observations:[]};
      while(Date.now()-alignmentStart616<=150000&&Date.now()+50000<deadline616){
        const state=await ev('__retained616Perf.status()');
        if(Date.now()-alignmentStart616>150000||state.visT>target616+1.5){perf616.alignment.missedEarliestBoundary=true;break;}
        if(state.light.b>.34)seenDay616=true;
        if(seenDay616&&state.light.b===.34&&state.visT>=target616){perf616.alignment.firstNight=state;perf616.alignment.ready=state.nightRemaining>=53.5;break;}
        const prior=perf616.alignment.observations.at(-1);if(!prior||state.visT-prior.visT>=5)perf616.alignment.observations.push(state);
        await sleep(250);
      }
      perf616.alignment.elapsedMs=Date.now()-alignmentStart616;persist();
      if(!perf616.alignment.ready){perf616.decision='Measurement limit: missed the first next natural night or lacked complete-sequence time reserve; no second attempt.';return;}
      for(let i=0;i<3;i++){if(Date.now()+35000>deadline616)throw Error('T616 lacks complete sequence reserve');perf616.qualification.push(await ev('__retained616Perf.observe(5000)'));persist();}
      perf616.qualificationScreen={stable:metrics616.qualify(perf616.qualification),nightReserve:perf616.qualification.at(-1).after.nightRemaining};
      perf616.qualified=perf616.qualificationScreen.stable&&perf616.qualificationScreen.nightReserve>=35&&Date.now()+35000<=deadline616;
      if(!perf616.qualified){perf616.decision='Measurement limit: fixed three-window mean/median/p95 qualification or 35-second natural-night reserve failed; no replacement windows.';return;}
      const modes616=perf616.arm==='paired'?['original','candidate','candidate','original','original','candidate']:Array(6).fill(singleMode616);
      for(const [index,mode]of modes616.entries()){
        const row=await ev('__retained616Perf.observe(5000,'+JSON.stringify(mode)+')');
        perf616.rows.push({index,pair:Math.floor(index/2),...row,distribution:metrics616.distribution([row])});persist();
        if(Date.now()>=deadline616)throw Error('T616 absolute measurement deadline');
      }
      perf616.result=perf616.arm==='paired'?metrics616.screenPaired(perf616.rows):{
        stable:metrics616.qualify(perf616.rows,6),distribution:metrics616.distribution(perf616.rows),
        absolute55:metrics616.qualify(perf616.rows,6)&&perf616.rows.every(w=>metrics616.distribution([w]).fps>=55),netProductNonRegression:false,
        scope:'One fresh-page arm only; combine observer-free / candidate-only / observer-free rows using screenNet before a net product conclusion.'};
      perf616.accepted=perf616.result.stable;
      perf616.decision=perf616.accepted?(perf616.arm==='paired'?'Qualified observer-inclusive paired diagnostic; inspect nonregression/benefit fields. Net product adoption is not established.':'Qualified fresh-page arm retained for net original/candidate/original comparison; this arm alone is not release acceptance.'):'Measurement limit: final mode distributions or frame/animation validity failed. Retain every sample; no unchanged rerun.';
    })(),new Promise((_,reject)=>{watchdog616=setTimeout(()=>{perf616.deadlineExpired=true;perf616.accepted=false;perf616.decision='Measurement limit: absolute 240-second live measurement bound exhausted.';persist();try{browser.kill();}catch{}reject(Error('T616 absolute 240-second deadline'));},Math.max(0,deadline616-Date.now()));})]);
    }catch(error){perf616.error=String(error);perf616.accepted=false;perf616.decision||='T616 live measurement stopped with an error; no release inference.';}
    finally{clearTimeout(watchdog616);perf616.elapsedMs=Date.now()-started616;
      if(!perf616.deadlineExpired){try{
        perf616.foregroundAfter=await foregroundState603();perf616.final=await ev('__retained616Perf.status()');
        await ev('GV.save();true'); // Regenerate canonical save after timing, not just read unchanged storage.
        perf616.invariants={scene:scene616===await ev('__s603.scene()'),save:save616===await ev('__s603.saved()'),unwrapped:perf616.final.unwrapped,native:perf616.final.native,layerExpected:perf616.final.layerExpected,foreground:perf616.foregroundAfter.valid};
        perf616.finalCounters=await ev('__retained616Perf.counters()');perf616.restore=await ev('__retained616Perf.dispose()');
        if(!Object.values(perf616.invariants).every(Boolean)||!perf616.restore.originalLayer||!perf616.restore.unwrapped){perf616.accepted=false;perf616.decision='T616 model/save/function/foreground restoration invariant failed; do not adopt.';}
      }catch(error){perf616.cleanupError=String(error);perf616.accepted=false;}}
      persist();}
    console.log('RETAINED616_PERFORMANCE '+JSON.stringify({arm:perf616.arm,zoom:perf616.zoom,qualified:perf616.qualified,accepted:perf616.accepted,result:perf616.result,decision:perf616.decision,elapsedMs:perf616.elapsedMs}));
    report.coverage.core=true;persist();
