    // Standalone correctness experiment, substituted for retained614-experiment.js.
    // No timing, FPS estimate, quality change, or generalized pixel allowance.
    report.candidate='T616 retained native transition correctness';report.releaseGatePassed=false;
    const t616=report.retained616={accepted:false,correctnessPassed:false,pendingJudgment:false,performanceRun:false,releaseGatePassed:false,zeroRGBARequired:true,knownT615ExceptionApplied:false,unapprovedTiny:[],comparisons:[],actions:[],lifecycle:{gpuContextLoss:{verified:false,status:'not-run',reason:'Trusted loss/restoration of actual retained Canvas2D surfaces has not been established. Synthetic events and freeze/resume are not GPU context-loss evidence.'}},limits:{jobMinutes:15,workMinutes:12,maxComparisons:240,maxBackingWidth:2800,maxBackingHeight:1800},snapshotScope:'Complete game canvas; HUD/toast UI hidden only within each diagnostic comparison. No timing or production-page HUD changes.'};
    const deadline616=Date.now()+12*60*1000;
    const bounded616=()=>{if(Date.now()>deadline616)throw Error('T616 work deadline reached; remaining cases are not passed');if(t616.comparisons.length>=240)throw Error('T616 comparison cap reached');};
    const detail616=(a,b)=>{
      if(a.w!==b.w||a.h!==b.h)throw Error('T616 compositor dimensions mismatch');
      let pixels=0,maxChannelDelta=0,x0=Infinity,y0=Infinity,x1=-1,y1=-1;const points=[];
      for(let i=0;i<a.rgba.length;i+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a.rgba[i+k]-b.rgba[i+k]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}if(!changed)continue;const p=i/4,x=p%a.w,y=Math.floor(p/a.w);pixels++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);if(points.length<32)points.push({x,y,original:Array.from(a.rgba.subarray(i,i+4)),candidate:Array.from(b.rgba.subarray(i,i+4))});}
      return {pixels,maxChannelDelta,bbox:pixels?{x0,y0,x1,y1}:null,points,sampleLimit:32};
    };
    const capture616=async()=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const bytes=Buffer.from(r.data,'base64');return {bytes,pixels:pngRgba603(bytes)};};
    const saveShots616=(label,shots)=>{for(const [mode,s]of Object.entries(shots)){const file='T616-'+label.replace(/[^a-zA-Z0-9.-]/g,'-')+'-'+mode+'.png';fs.writeFileSync(path.join(OUT,file),s.bytes);report.screenshots.push(file);}};
    const summarizeTiny616=()=>{
      const summary={affectedComparisons:t616.unapprovedTiny.filter(r=>r.index!==undefined).length,totalComparisons:t616.comparisons.length,rawCheckpoints:t616.unapprovedTiny.filter(r=>r.rawDelta).length,accepted:false,coordinateUnionComplete:true,surfaces:{}};
      for(const [kind,key]of [['compositor','pixelDelta'],['layer','layerDelta'],['rawLayer','rawDelta']]){
        const union=new Map();let affected=0,totalChangedPixels=0,maxChannelDelta=0;
        for(const row of t616.unapprovedTiny){const d=row[key];if(!d?.pixels)continue;affected++;totalChangedPixels+=d.pixels;maxChannelDelta=Math.max(maxChannelDelta,d.maxChannelDelta);if(d.points.length!==d.pixels)summary.coordinateUnionComplete=false;
          const size=row.dimensions?.[kind]||row.dimensions?.layer||{};
          for(const point of d.points){const id=[size.width,size.height,point.x,point.y].join(':');let item=union.get(id);if(!item){item={width:size.width,height:size.height,x:point.x,y:point.y,occurrences:0,firstLabel:row.label,lastLabel:row.label};union.set(id,item);}item.occurrences++;item.lastLabel=row.label;}
        }
        summary.surfaces[kind]={affected,totalChangedPixels,maxChannelDelta,uniqueCoordinates:union.size,coordinateUnion:[...union.values()]};
      }
      summary.affectedFraction=summary.totalComparisons?summary.affectedComparisons/summary.totalComparisons:0;t616.tinySummary=summary;return summary;
    };
    const compare616=async(label,advance=false)=>{
      bounded616();if(advance)await ev('__retained616.step(.05)');const inputs=await ev('__retained616.snapshot()');
      if(inputs.viewport.width>2800||inputs.viewport.height>1800)throw Error('T616 backing surface cap exceeded');
      await ev('__retained616.beginCapture()');
      try{
      const original=await ev('__retained616.render("original")'),a=await capture616(),originalLayer=await ev('__retained616.layerPixels("original")');
      const candidate=await ev('__retained616.render("candidate")'),b=await capture616(),layerDelta=await ev('__retained616.layerPixels("candidate")');
      const restored=await ev('__retained616.render("restored")'),c=await capture616(),layerRestoreDelta=await ev('__retained616.layerPixels("restored")');
      const dimensions={compositor:{width:a.pixels.w,height:a.pixels.h},layer:{width:originalLayer.width,height:originalLayer.height}};
      const row={index:t616.comparisons.length,label,advanced:advance,inputs,dimensions,original,candidate,restored,pixelDelta:detail616(a.pixels,b.pixels),restoreDelta:detail616(a.pixels,c.pixels),layerDelta,layerRestoreDelta};t616.comparisons.push(row);
      const presence=layerDelta.presenceMismatch||layerDelta.dimensionMismatch||layerRestoreDelta.presenceMismatch||layerRestoreDelta.dimensionMismatch;
      if(row.pixelDelta.pixels||row.restoreDelta.pixels||layerDelta.pixels||layerRestoreDelta.pixels||presence){
        saveShots616(label,{original:a,candidate:b,restored:c});
        const measurement=!!(row.restoreDelta.pixels||layerRestoreDelta.pixels||layerRestoreDelta.presenceMismatch||layerRestoreDelta.dimensionMismatch);
        const tiny=!measurement&&!presence&&row.pixelDelta.pixels<=3&&row.pixelDelta.maxChannelDelta<=1&&(layerDelta.pixels||0)<=3&&(layerDelta.maxChannelDelta||0)<=2;
        if(tiny){
          row.classification='unapprovedTiny';row.accepted=false;row.failureEvidence={preservedCompositorPNGs:true,exactCoordinateRGBA: true,rawReadAndRepairDeferred:true,reason:'Continue bounded safety cases without clearing or repairing the retained candidate.'};
          t616.unapprovedTiny.push({index:row.index,label,dimensions,pixelDelta:row.pixelDelta,layerDelta});t616.pendingJudgment=true;t616.firstFailure||=row;summarizeTiny616();
          persist();console.log('RETAINED616_UNAPPROVED_TINY '+JSON.stringify(t616.unapprovedTiny.at(-1)));return row;
        }
        row.failureEvidence=await ev('__retained616.failureEvidence()');t616.firstFailure||=row;t616.materialFailure=row;
        t616.decision=measurement?'Original-repeat changed; measurement limit, no candidate attribution.':presence?'Layer presence or dimensions changed; correctness failure.':'New quantified RGBA difference requires judgment; the approved T615 frame-55 exception does not authorize this transition.';
        persist();console.log('RETAINED616_FAILURE '+JSON.stringify(row));throw Error(t616.decision);
      }
      if(row.index===0||label==='final')saveShots616(label,{original:a,candidate:b,restored:c});
      persist();return row;
      }finally{await ev('__retained616.endCapture()');}
    };
    const action616=async(label,expression)=>{
      bounded616();const result=await ev(expression+';__retained616.snapshot()');t616.actions.push({label,result});
      await ev('GV.save();true');const before=await ev('__s603.saved()');
      for(let sample=0;sample<3;sample++)await compare616(label+'-'+sample,sample>0);
      await ev('GV.save();true');check(before===await ev('__s603.saved()'),'T616 canonical save unchanged by comparison/animation '+label);
    };
    const resize616=async(width,height,dpr)=>{
      for(const nextWidth of [width+1,width]){
        if(Math.round(nextWidth*dpr)>2800||Math.round(height*dpr)>1800)throw Error('T616 requested viewport exceeds bound');
        await send('Emulation.setDeviceMetricsOverride',{width:nextWidth,height,deviceScaleFactor:dpr,mobile:width===390});
        let actual,matched=false;for(let attempt=0;attempt<25;attempt++){bounded616();actual=await ev('__retained616.viewport()');if(actual.cssWidth===nextWidth&&actual.cssHeight===height&&actual.dpr===dpr&&actual.devicePixelRatio===dpr&&actual.width===Math.round(nextWidth*dpr)&&actual.height===Math.round(height*dpr)){matched=true;break;}await sleep(100);}
        check(matched,'T616 actual resize/DPR '+JSON.stringify({width:nextWidth,height,dpr,actual}));
      }
    };
    let installed616Host=false;
    try{
      report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'T616 approved art flags unchanged');
      t616.sourceObserver=await ev('__source614.stats()');check(t616.sourceObserver.installed,'T616 preboot source observer installed');
      t616.synthetic=await ev('__retained614.synthetic()');
      if(t616.synthetic.failure){for(const [name,data]of Object.entries(t616.synthetic.failure.pngs||{})){if(!/^[a-z-]+$/.test(name)||!data.startsWith('data:image/png;base64,'))throw Error('T616 invalid synthetic evidence');const file='T616-synthetic-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(data.slice(data.indexOf(',')+1),'base64'));report.screenshots.push(file);}delete t616.synthetic.failure.pngs;}
      check(t616.synthetic.passed&&t616.synthetic.copyDelta.pixels===0,'T616 inherited native source/reset/order/negative-control contracts');
      await ev('document.getElementById("bNewGame").click();__s603.grow22();GV.setSpeed(0);GV.ai(false);true');
      const manifest616=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')),fixture616=manifest616.cities.find(c=>c.seed===22),roots616=await ev('__s603.roots()');
      check(!roots616.bad&&roots616.rows.length===fixture616.roots&&hash(JSON.stringify(roots616.rows))===fixture616.rootSHA256,'T616 exact genuine seed22 roots');
      const focus616=(await ev('__s603.census(85)'))[0];check(!!focus616,'T616 visible senior-center focus exists');
      await ev('GV.setSeason(1);GV.weather(0);GV.setRot(0);GV.setZoom(1);GV.setVisT(100);GV.lookAt('+(focus616[0]+1)+','+(focus616[1]+1)+');true');
      installed616Host=true;t616.install=await ev('__retained616.install()');const startGuards616=await ev('__retained616.guards()');t616.initialGuards=startGuards616;
      await compare616('seed');await compare616('seed-repeat');await compare616('retained-hit');
      check(t616.comparisons.some(r=>r.candidate.stats?.last?.mode==='hit'),'T616 established retained hit before transitions');
      const home616='GV.lookAt('+(focus616[0]+1)+','+(focus616[1]+1)+')';
      await action616('pan','GV.lookAt('+(focus616[0]+3)+','+(focus616[1]+2)+')');await action616('pan-return',home616);
      await action616('fractional-pan','__retained616.offsetCamera(.375,.625)');await action616('fractional-return',home616);
      for(const zoom of [.7,.49,.5,.99,1,1.25,1])await action616('zoom-'+zoom,'GV.setZoom('+zoom+')');
      for(const rotation of [1,2,3,0])await action616('rotation-'+rotation,'GV.setRot('+rotation+')');
      for(const season of [3,0,2,1])await action616('season-'+season,'GV.setSeason('+season+')');
      for(const time of [35,36,55])await action616('light-'+time,'GV.setVisT('+time+')');
      for(const weather of [1,2,0])await action616('day-weather-'+weather,'GV.weather('+weather+')');
      for(const time of [75,82.5,100])await action616('light-'+time,'GV.setVisT('+time+')');
      await action616('winter-rain','GV.setSeason(3);GV.weather(1)');await action616('summer-clear','GV.setSeason(1);GV.weather(0)');
      for(const [width,height,dpr]of [[1401,901,1],[390,844,1],[390,844,2],[1400,900,1]]){await resize616(width,height,dpr);await action616('viewport-'+width+'x'+height+'-dpr'+dpr,'true');}
      for(const kind of ['width','height-attribute','reset','replace']){const reset=await ev('__retained616.resetOutput('+JSON.stringify(kind)+')');t616.actions.push({label:'output-reset-'+kind,reset});if(reset.supported)await action616('output-reset-'+kind,'true');}
      const root616=(await ev('__s603.census(85)'))[0];check(!!root616,'T616 edit root exists');
      await action616('edit-focus','GV.setVisT(100);GV.setRot(0);GV.setZoom(1);GV.lookAt('+(root616[0]+1)+','+(root616[1]+1)+')');
      const editRoots616=await ev('__s603.roots()');await ev('GV.save();true');const editSave616=await ev('__s603.saved()');
      await action616('demolish','if(!GV.placeUndo("doze",'+root616[0]+','+root616[1]+'))throw Error("T616 genuine demolition failed")');
      check(JSON.stringify(editRoots616)!==JSON.stringify(await ev('__s603.roots()')),'T616 demolition actually changes roots');
      await action616('undo','GV.undo()');check(JSON.stringify(editRoots616)===JSON.stringify(await ev('__s603.roots()')),'T616 undo restores exact roots/ref structure');
      await ev('GV.save();true');check(editSave616===await ev('__s603.saved()'),'T616 undo restores canonical save');
      await action616('save-load','GV.save();if(!GV.load())throw Error("T616 own save failed to load");GV.setSpeed(0);GV.ai(false)');
      for(const fixture of manifest616.cities){
        const raw=fs.readFileSync(path.join(__dirname,'fixtures',fixture.file),'utf8');check(hash(raw)===fixture.saveSHA256,'T616 fixture source hash '+fixture.seed);
        await action616('load-seed-'+fixture.seed,'localStorage.setItem("glimmerville.main.v1.s3",'+JSON.stringify(raw)+');if(!GV.load())throw Error("T616 fixture load failed");GV.setSpeed(0);GV.ai(false);GV.setVisT(100)');
        const roots=await ev('__s603.roots()');check(!roots.bad&&roots.rows.length===fixture.roots&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'T616 fixture root/ref hash '+fixture.seed);
      }
      await action616('new-world','GV.newWorldSeeded(616);GV.setSpeed(0);GV.ai(false);GV.setVisT(100)');
      const initialRaw616=fs.readFileSync(path.join(__dirname,'fixtures',fixture616.file),'utf8');
      await action616('return-seed22','localStorage.setItem("glimmerville.main.v1.s3",'+JSON.stringify(initialRaw616)+');if(!GV.load())throw Error("T616 final fixture load failed");GV.setSpeed(0);GV.ai(false);GV.setSeason(1);GV.weather(0);GV.setVisT(100);GV.setRot(0);GV.setZoom(1);'+home616);
      // Real browser freeze/resume, without synthetic events or a page reload.
      const lifecycleBefore616=await ev('__retained616.lifecycle()');let frozen616=false;
      try{await send('Page.setWebLifecycleState',{state:'frozen'});frozen616=true;await sleep(150);await send('Page.setWebLifecycleState',{state:'active'});frozen616=false;await send('Page.bringToFront');await sleep(100);const after=await ev('__retained616.lifecycle()'),events=after.events.slice(lifecycleBefore616.events.length);t616.lifecycle.freezeResume={attempted:true,before:lifecycleBefore616,after,verified:after.timeOrigin===lifecycleBefore616.timeOrigin&&events.some(e=>e.type==='freeze'&&e.trusted)&&events.some(e=>e.type==='resume'&&e.trusted),scope:'Real browser lifecycle while game is paused for identical-input correctness; live-loop recovery not claimed.'};}
      catch(error){t616.lifecycle.freezeResume={attempted:true,verified:false,error:String(error)};}
      finally{if(frozen616)try{await send('Page.setWebLifecycleState',{state:'active'});}catch(error){t616.lifecycle.resumeError=String(error);throw error;}}
      await action616('after-native-freeze-resume','true');
      await compare616('final');t616.rawCheckpoint=await ev('__retained616.rawCheckpoint()');
      if(!t616.rawCheckpoint.notApplicable){
        for(const key of ['originalCopyDelta','candidateCopyDelta'])check(t616.rawCheckpoint[key].pixels===0,'T616 final '+key+' exact');
        const raw=t616.rawCheckpoint.rawDelta;
        if(raw.pixels&&raw.pixels<=3&&raw.maxChannelDelta<=2){t616.unapprovedTiny.push({label:'final-raw-checkpoint',dimensions:{rawLayer:{width:t616.rawCheckpoint.width,height:t616.rawCheckpoint.height}},rawDelta:raw,accepted:false});t616.pendingJudgment=true;summarizeTiny616();console.log('RETAINED616_UNAPPROVED_TINY '+JSON.stringify(t616.unapprovedTiny.at(-1)));}
        else check(raw.pixels===0,'T616 final raw layer exact');
      }
      // Raw observation advances the output revision. Verify its next rebuild
      // and later retention instead of claiming the readback was invisible.
      await action616('after-raw-checkpoint','true');
      t616.finalGuards=await ev('__retained616.guards()');check(t616.finalGuards.originalFrame&&t616.finalGuards.originalAdvance&&t616.finalGuards.originalDraw,'T616 original frame/advance/draw identities preserved');check(t616.finalGuards.quality===startGuards616.quality,'T616 quality unchanged');check(t616.finalGuards.source.installed,'T616 source observation remained supported');
      check(t616.comparisons.some(r=>r.candidate.layerCalls===0)&&t616.comparisons.some(r=>r.candidate.returnedLayer),'T616 exercised no-layer daytime and actual retained night layer');
      t616.safetyCasesCompleted=true;t616.transitionPixelsPassed=t616.unapprovedTiny.length===0;t616.correctnessPassed=t616.transitionPixelsPassed;t616.lifecycleCoverageComplete=!!t616.lifecycle.freezeResume?.verified&&t616.lifecycle.gpuContextLoss.verified;
      t616.decision=t616.pendingJudgment?'Bounded safety cases completed with quantified unapproved tiny pixel differences; acceptance remains pending judgment. No tolerance was added.':'Transition pixels, state and save checks passed. Real GPU context loss and live-loop lifecycle recovery remain unverified; this report is not full release acceptance or FPS evidence.';
    }catch(error){t616.error=String(error.stack||error);t616.decision||='Transition correctness did not complete; retain first failure and do not infer a pass.';persist();throw error;}
    finally{
      if(installed616Host){t616.restore=await ev('__retained616.dispose()');check(t616.restore.originalLayer,'T616 original native layer restored');}
      t616.sourceObserverDisposal=await ev('__source614.dispose();__source614.stats()');check(t616.sourceObserverDisposal.disposed&&t616.sourceObserverDisposal.weakEntries===0,'T616 source observer hooks/registry disposed');persist();
      summarizeTiny616();persist();
    }
    console.log('RETAINED616 '+JSON.stringify({correctnessPassed:t616.correctnessPassed,pendingJudgment:t616.pendingJudgment,comparisons:t616.comparisons.length,tinySummary:t616.tinySummary,lifecycle:t616.lifecycle,decision:t616.decision}));report.coverage.core=true;persist();
