    report.candidate='T604 direct state and paint producer feasibility';
    report.scope604='Diagnostic-only direct emitter on the unchanged real game draw. Full forceDraw wall time retains native canonicalization, path/clip, source snapshot, offscreen and allocation costs. Reference decode and unchanged GPU replay are separate measured costs. No live FPS or native batch-consumer claim.';
    report.performanceSamples=0;
    report.directScope604={sourceCandidate:'a26fceaea8c8a42be4322e52f13ea1bbe7dced04',productRendererChanged:false,wholeGamePerformanceSamples:0,order:['baseline','direct','direct','baseline'],warmFrames:2,sampledFrames:5,cpuBudgetMs:1000/55,researchScreenMs:8,metadataNormalizedAcrossDraws:['packet.producerMs','gradient.id','gradient.version','image.id','image.revision'],sameDrawMirrorNormalizesNothing:true};
    await ev(fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/direct-writer604.js'),'utf8')+';true');
    await ev(`window.__directCanonical604=async(packet,semantic=false)=>{
      const sources=new Map(),scratch=new DataView(new ArrayBuffer(8));
      const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
      for(const command of packet.commands){if(!command.image)continue;const im=command.image,source=im.source;if(sources.has(source))continue;let canvas=source;if(typeof source.getContext!=='function'){canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;canvas.getContext('2d').drawImage(source,0,0);}sources.set(source,{width:im.width,height:im.height,sha256:await digest(canvas.getContext('2d').getImageData(0,0,im.width,im.height).data)});}
      const active=new Set();
      const visit=(value,path)=>{
        if(value===null)return ['null'];if(value===undefined)return ['undefined'];
        if(typeof value==='number'){scratch.setFloat64(0,value,false);return ['float64',scratch.getUint32(0,false),scratch.getUint32(4,false)];}
        if(typeof value==='string'||typeof value==='boolean')return [typeof value,value];
        if(sources.has(value))return ['image-source',sources.get(value)];
        if(!value||typeof value!=='object'||active.has(value))throw Error('Opaque or cyclic direct packet input '+path);
        active.add(value);let result;
        if(Array.isArray(value))result=['array',value.map((v,i)=>visit(v,path+'.'+i))];
        else{if(Object.getPrototypeOf(value)!==Object.prototype)throw Error('Non-data direct packet field '+path);const keys=Object.keys(value).sort().filter(key=>!semantic||!(path==='packet'&&key==='producerMs'||['linear','radial'].includes(value.type)&&['id','version'].includes(key)||Object.hasOwn(value,'source')&&Object.hasOwn(value,'width')&&['id','revision'].includes(key)));result=['object',keys.map(key=>[key,visit(value[key],path+'.'+key)])];}
        active.delete(value);return result;
      };
      const canonical=visit(packet,'packet'),text=JSON.stringify(canonical),differences=[];
      if(semantic){if(!window.__directExpectedCanonical604)window.__directExpectedCanonical604=canonical;const compare=(a,b,path)=>{if(differences.length>=20||Object.is(a,b))return;if(Array.isArray(a)&&Array.isArray(b)){if(a.length!==b.length)differences.push({path,expectedLength:a.length,actualLength:b.length});for(let i=0;i<Math.min(a.length,b.length);i++)compare(a[i],b[i],path+'.'+i);}else differences.push({path,expected:a,actual:b});};compare(__directExpectedCanonical604,canonical,'canonical');}
      return {sha256:await digest(new TextEncoder().encode(text)),canonicalBytes:new TextEncoder().encode(text).byteLength,commands:packet.commands.length,uniqueStates:new Set(packet.commands.map(c=>c.state)).size,sourceImages:sources.size,differences};
    };true`);
    report.directInputs604=await ev('__audit604.startCostInputs()');
    const frameGuard604=r=>r.drawCalls===1&&r.endCalls===1&&r.rngCalls===0&&r.sceneSame;
    const replayGuard604=r=>r.actualGPU&&r.rngCalls===0&&r.sceneSame&&r.clocksSame;
    // Mirror adds original object allocations only here, outside accepted timing.
    report.directMirrorInstallation604=await ev('(()=>{const start=performance.now();window.__directHook604=TownDirect604.install(__townRenderer604.recorder,{mirror:true});const installationMs=performance.now()-start;return {installationMs,initialStats:__directHook604.stats};})()');
    try{
      report.directMirror604={frame:await ev('__audit604.directFrame()')};
      await ev('window.__directPacket604=__directHook604.decode(__directFrame604);true');
      report.directMirror604.reference=await ev('__directCanonical604(__directFrame604.reference)');
      report.directMirror604.decoded=await ev('__directCanonical604(__directPacket604)');
      report.directMirror604.identity=await ev('(()=>{const a=__directFrame604.reference,b=__directPacket604,forward=new Map(),reverse=new Map();for(let i=0;i<a.commands.length;i++){const x=a.commands[i],y=b.commands[i];if(x.image&&x.image.source!==y.image.source)return false;if(forward.has(x.state)&&forward.get(x.state)!==y.state||reverse.has(y.state)&&reverse.get(y.state)!==x.state)return false;forward.set(x.state,y.state);reverse.set(y.state,x.state);}return true;})()');
      report.directMirror604.stats=await ev('__directHook604.inspect(__directFrame604)');
      report.directMirror604.replay=await ev('__audit604.directReplay()');
      const mirrorImage604=await capture604('direct-mirror');report.directMirror604.screenshot=record604(mirrorImage604);report.directMirror604.delta=delta604(gpu604.pixels,mirrorImage604.pixels);persist();
      check(frameGuard604(report.directMirror604.frame),'direct mirror runs complete original game draw exactly once without RNG or model mutation');
      check(report.directMirror604.reference.sha256===report.directMirror604.decoded.sha256&&report.directMirror604.identity,'same-draw mirror preserves every Float64, field, allocation id, source byte, state alias and painter order');
      check(replayGuard604(report.directMirror604.replay)&&report.directMirror604.delta.pixels===0,'direct mirror has zero additional full-compositor GPU pixel differences');
      report.directNegative604=await ev('(async()=>{const packet=__directPacket604,good=await __directCanonical604(packet,true),commands=packet.commands.slice(),first=commands[0];commands[0]={...first,state:{...first.state,globalAlpha:first.state.globalAlpha===0.125?0.25:0.125}};const wrong=await __directCanonical604({...packet,commands},true),restored=await __directCanonical604(packet,true);delete window.__directExpectedCanonical604;return {good,wrong,restored};})()');
      check(report.directNegative604.good.sha256!==report.directNegative604.wrong.sha256&&report.directNegative604.good.sha256===report.directNegative604.restored.sha256,'semantic normalization detects changed real paint parameter and exact restoration');
    }finally{await ev('__directHook604.restore();delete window.__directHook604;true');}
    report.directWindows604=[];let expectedDirectSignature604=null;
    for(const [index,mode]of report.directScope604.order.entries()){
      const installation=mode==='direct'?await ev('(()=>{const start=performance.now();window.__directHook604=TownDirect604.install(__townRenderer604.recorder);const installationMs=performance.now()-start;return {installationMs,initialStats:__directHook604.stats};})()'):null;
      const samples=[];
      try{
        for(let i=0;i<report.directScope604.warmFrames+report.directScope604.sampledFrames;i++){
          const row=await ev('__audit604.directFrame()');
          check(frameGuard604(row),'complete single draw preserves model/RNG '+index+'/'+i);
          row.decode=await ev(`(()=>{const start=performance.now();window.__directPacket604=${mode==='direct'?'__directHook604.decode(__directFrame604)':'__directFrame604'};return {referenceDecodeMs:performance.now()-start,stats:${mode==='direct'?'__directHook604.inspect(__directFrame604)':'null'}};})()`);
          row.signature=await ev('__directCanonical604(__directPacket604,true)');
          if(expectedDirectSignature604===null)expectedDirectSignature604=row.signature.sha256;
          if(row.signature.sha256!==expectedDirectSignature604){report.directMismatch604={index,mode,iteration:i,row};persist();throw Error('Direct writer changed complete render parameters or source pixels');}
          row.replay=await ev('__audit604.directReplay()');
          check(replayGuard604(row.replay),'unchanged GPU consumer preserves model/RNG/clocks '+index+'/'+i);
          row.currentConsumerTotalMs=row.producerWallMs+row.decode.referenceDecodeMs+row.replay.replayWallMs;
          if(i>=report.directScope604.warmFrames)samples.push(row);
        }
        const screenshot=await capture604('direct-'+index+'-'+mode),delta=delta604(gpu604.pixels,screenshot.pixels);
        report.directWindows604.push({index,mode,installation,samples,screenshot:record604(screenshot),delta});persist();
        check(delta.pixels===0,'zero added whole-city GPU pixels after '+index+'/'+mode);
      }finally{if(mode==='direct')await ev('__directHook604.restore();delete window.__directHook604;true');}
    }
    const medianDirect604=a=>{a=[...a].sort((x,y)=>x-y);const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
    const summarizeDirect604=rows=>{const values={producerWallMs:r=>r.producerWallMs,recorderProducerMs:r=>r.recorderProducerMs,referenceDecodeMs:r=>r.decode.referenceDecodeMs,unchangedReplayWallMs:r=>r.replay.replayWallMs,currentConsumerTotalMs:r=>r.currentConsumerTotalMs};const out={samples:rows.length};for(const [key,get]of Object.entries(values)){const a=rows.map(get);out[key]={median:medianDirect604(a),min:Math.min(...a),max:Math.max(...a)};}return out;};
    report.directSummary604={};for(const mode of ['baseline','direct'])report.directSummary604[mode]=summarizeDirect604(report.directWindows604.filter(w=>w.mode===mode).flatMap(w=>w.samples));
    for(const w of report.directWindows604)w.summary=summarizeDirect604(w.samples);
    const directProducer604=report.directSummary604.direct.producerWallMs;
    report.directDecision604={exactSameDrawMirror:true,exactAcrossDrawRenderParameters:true,addedGPUFramePixels:0,wholeGamePerformanceSamples:0,original55Passed:false,nativeBatchConsumerAvailable:false,releaseGatePassed:false,fullProducerExceedsFrameBudget:directProducer604.median>1000/55,stableResearchScreen:directProducer604.max<=8,decision:directProducer604.median>1000/55?'NO-GO: complete direct producer alone exceeds 55 FPS frame budget. Stop this design; do not start consumer/WASM integration.':directProducer604.max<=8?'Producer-only research screen met; a real consumer still needs a separately justified feasibility proof.':'No stable 8 ms producer evidence; do not start larger consumer/WASM integration.',accounting:'Measured full forceDraw wall includes original offscreen and native/path work. One-time installation/initial arena allocations are separately reported outside steady-state draw timing. Source-write notifications are counts, not a complete operation or allocation profile. Reference decode and unchanged Player replay remain explicit costs; neither is claimed eliminated. Replay excludes presentation/compositor scheduling and is not a full-frame FPS measurement.'};
    report.directRestoredInputs604=await ev('__audit604.restoreCostInputs()');
    check(JSON.stringify(report.directRestoredInputs604)===JSON.stringify(report.directInputs604.captured),'all original diagnostic clocks restored exactly');
    check(hash(JSON.stringify(await ev('__audit604.restoreActors()')))===report.sharedActorInput604.candidateBeforeSHA256,'original actor data restored after direct-emitter diagnostic');
    await compositorEnd603();report.coverage.core=true;persist();
