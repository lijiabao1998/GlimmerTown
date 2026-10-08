    // CPU component audit only. These frozen-frame samples are not live FPS.
    report.candidate='T604 exact-state recorder and Paint call CPU audit';
    report.scope604='Diagnostic-only temporary adapters on the identical original frozen night input. Zero live FPS samples; no production renderer change or release claim.';
    report.performanceSamples=0;
    report.costScope604={performanceSamples:0,productRendererChanged:false,acceptedImageCandidate:'a26fceaea8c8a42be4322e52f13ea1bbe7dced04',modes:['baseline','state-cache','paint-dedup','both','both','paint-dedup','state-cache','baseline'],warmFrames:2,sampledFrames:3,thresholdFPS:55};
    await ev(fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/cost-adapters604.js'),'utf8')+';true');
    await ev(`window.__costSignature604=async()=>{
      const p=__townRenderer604.lastPacket,images=new Map();
      const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const style=s=>s&&typeof s==='object'&&['linear','radial'].includes(s.type)?{type:s.type,args:s.args,stops:s.stops}:s;
      const commands=[];
      for(const c of p.commands){
        const row={kind:c.kind,args:c.args,path:c.path,state:{...c.state,fillStyle:style(c.state.fillStyle),strokeStyle:style(c.state.strokeStyle)}};
        if(c.nativePath||c.kind==='native')throw Error('Unexpected opaque native semantics in cost packet');
        if(c.image){const im=c.image;if(!images.has(im.source)){let canvas=im.source;if(typeof canvas.getContext!=='function'){canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;canvas.getContext('2d').drawImage(im.source,0,0);}const bytes=canvas.getContext('2d').getImageData(0,0,im.width,im.height).data;images.set(im.source,{width:im.width,height:im.height,sha256:await digest(bytes)});}row.image=images.get(im.source);}
        commands.push(row);
      }
      return {sha256:await digest(new TextEncoder().encode(JSON.stringify({width:p.width,height:p.height,faults:p.faults,commands}))),commands:commands.length,images:images.size};
    };true`);
    const originalMicro604=fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/recorder-browser-contracts.js'),'utf8');
    report.cachedRecorderContracts604=await ev(`(()=>{const Original=TownRecorder604.Recorder,hooks=[];TownRecorder604.Recorder=function(...a){const r=new Original(...a);hooks.push(TownCost604.installStateCache(r));return r;};try{return (${originalMicro604});}finally{TownRecorder604.Recorder=Original;for(const hook of hooks.reverse())hook.restore();}})()`);
    check(report.cachedRecorderContracts604.every(r=>r.changedPixels===0),'state-read cache preserves original native recorder microcases exactly');
    report.costWindows604=[];let expectedSignature604=null,expectedCostImage604=null;
    for(const [windowIndex,mode]of report.costScope604.modes.entries()){
      await ev(`(()=>{const c=__townRenderer604;window.__costHooks604=[];${mode==='state-cache'||mode==='both'?'__costHooks604.push(TownCost604.installStateCache(c.recorder));':''}${mode==='paint-dedup'||mode==='both'?'__costHooks604.push(TownCost604.installPaintDedup(c.CK));':''}return true;})()`);
      try{
        for(let i=0;i<2;i++)await ev('__audit604.costFrame()');
        const frames=[];for(let i=0;i<3;i++)frames.push(await ev('__audit604.costFrame()'));
        check(frames.every(r=>r.actualGPU&&r.frame.backend==='gpu'&&r.rngCalls===0&&r.sceneSame),'cost frames preserve real GPU, single draw and game/RNG state '+windowIndex+'/'+mode);
        const signature=await ev('__costSignature604()');
        if(expectedSignature604===null)expectedSignature604=signature.sha256;
        check(signature.sha256===expectedSignature604,'all paint parameters, paths, gradients and source image bytes identical '+windowIndex+'/'+mode);
        const shot=await capture604('cost-'+windowIndex+'-'+mode),stats=await ev('__costHooks604.map(h=>h.stats)');
        if(expectedCostImage604===null)expectedCostImage604=shot.pixels;
        const delta=delta604(expectedCostImage604,shot.pixels);
        check(delta.pixels===0,'zero added full-compositor pixel differences '+windowIndex+'/'+mode);
        report.costWindows604.push({windowIndex,mode,frames,signature,stats,screenshot:record604(shot),delta});persist();
      }finally{await ev('for(const h of __costHooks604.reverse())h.restore();delete window.__costHooks604;true');}
    }
    const medianCost604=values=>{const a=[...values].sort((a,b)=>a-b),mid=Math.floor(a.length/2);return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;};
    report.costSummary604={};for(const mode of [...new Set(report.costScope604.modes)]){
      const rows=report.costWindows604.filter(w=>w.mode===mode).flatMap(w=>w.frames.map(r=>r.frame));
      report.costSummary604[mode]={frames:rows.length};
      for(const field of ['producerMs','replayMs','totalDrawMs','validationMs','prepareMs','uploadMs','drawMs','flushMs'])report.costSummary604[mode][field]=medianCost604(rows.map(r=>r[field]));
    }
    report.costDecision604={original55Passed:false,wholeGamePerformanceSamples:0,exactParameterAndPixelControlsPassed:true,note:'Component CPU costs on one frozen original-input frame only. No live FPS sampled; original 55 FPS and original-backend pixel results remain unchanged. Evaluate remaining cost before any larger renderer redesign.'};
    report.costDecision604.cpuBudgetMs=1000/55;
    report.costDecision604.remainingMeasuredCPUms=report.costSummary604.both.totalDrawMs;
    report.costDecision604.remainingCPUtoBudgetRatio=report.costSummary604.both.totalDrawMs/(1000/55);
    report.costDecision604.componentSavingsRatio=report.costSummary604.both.totalDrawMs/report.costSummary604.baseline.totalDrawMs;
    check(hash(JSON.stringify(await ev('__audit604.restoreActors()')))===report.sharedActorInput604.candidateBeforeSHA256,'original actor data restored after component audit');
    await compositorEnd603();report.coverage.core=true;persist();
