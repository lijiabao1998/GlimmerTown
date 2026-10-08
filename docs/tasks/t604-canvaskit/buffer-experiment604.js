    report.candidate='T604 exact typed-command representation proof';
    report.scope604='One actual retained whole-night packet. Encode/decode and explicit arena/materialization costs only; not producer replacement, bulk WASM execution, live FPS or release acceptance.';
    report.performanceSamples=0;
    report.bufferScope604={inputPackets:1,wholeGamePerformanceSamples:0,productRendererChanged:false,order:['fresh','reuse','reuse','fresh'],warmCycles:2,sampledCycles:8,sourceCandidate:'a26fceaea8c8a42be4322e52f13ea1bbe7dced04'};
    await ev(fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/buffer-codec604.js'),'utf8')+';true');
    await ev(`window.__bufferOriginal604=__townRenderer604.lastPacket;
      window.__bufferCanonical604=async packet=>{
        const sources=new Map(),scratch=new DataView(new ArrayBuffer(8));
        const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
        for(const command of packet.commands){if(!command.image)continue;const image=command.image,source=image.source;if(sources.has(source))continue;let canvas=source;if(typeof source.getContext!=='function'){canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(source,0,0);}const pixels=canvas.getContext('2d').getImageData(0,0,image.width,image.height).data;sources.set(source,{width:image.width,height:image.height,sha256:await digest(pixels)});}
        const active=new Set();
        const visit=value=>{
          if(value===null)return ['null'];if(value===undefined)return ['undefined'];
          if(typeof value==='number'){scratch.setFloat64(0,value,false);return ['float64',scratch.getUint32(0,false),scratch.getUint32(4,false)];}
          if(typeof value==='string'||typeof value==='boolean')return [typeof value,value];
          if(sources.has(value))return ['image-source',sources.get(value)];
          if(!value||typeof value!=='object'||active.has(value))throw Error('Unsupported or cyclic packet input');
          active.add(value);let out;
          if(Array.isArray(value))out=['array',value.map(visit)];
          else {if(Object.getPrototypeOf(value)!==Object.prototype)throw Error('Non-data packet field');out=['object',Object.keys(value).sort().map(key=>[key,visit(value[key])])];}
          active.delete(value);return out;
        };
        const text=JSON.stringify(visit(packet));return {sha256:await digest(new TextEncoder().encode(text)),canonicalBytes:new TextEncoder().encode(text).byteLength,commands:packet.commands.length,uniqueStates:new Set(packet.commands.map(c=>c.state)).size,sourceImages:sources.size};
      };true`);
    report.bufferOriginal604=await ev('__bufferCanonical604(__bufferOriginal604)');
    report.bufferCodec604=await ev('(()=>{const codec=window.__bufferCodec604=new TownBuffer604.Codec(),handle=codec.encode(__bufferOriginal604);window.__bufferDecoded604=codec.decode(handle);return codec.inspect(handle);})()');
    report.bufferDecoded604=await ev('__bufferCanonical604(__bufferDecoded604)');
    check(report.bufferOriginal604.sha256===report.bufferDecoded604.sha256,'typed codec preserves all Float64 fields, metadata, command order and source-image pixel bytes');
    report.bufferIdentity604=await ev('(()=>{const a=__bufferOriginal604,b=__bufferDecoded604,states=new Map();for(let i=0;i<a.commands.length;i++){const x=a.commands[i],y=b.commands[i];if(x.image&&x.image.source!==y.image.source)return false;if(states.has(x.state)&&states.get(x.state)!==y.state)return false;states.set(x.state,y.state);}return true;})()');
    check(report.bufferIdentity604,'decoded state indexes preserve aliasing and exact original Canvas image source identities');
    const originalReplay604=await ev('__audit604.bufferReplay("original")'),originalBufferImage604=await capture604('buffer-original-packet');
    const decodedReplay604=await ev('__audit604.bufferReplay("decoded")'),decodedBufferImage604=await capture604('buffer-decoded-packet');
    report.bufferPixels604={original:record604(originalBufferImage604),decoded:record604(decodedBufferImage604),delta:delta604(originalBufferImage604.pixels,decodedBufferImage604.pixels),fromApprovedSnapshot:delta604(gpu604.pixels,decodedBufferImage604.pixels),originalReplay:originalReplay604,decodedReplay:decodedReplay604};
    check([originalReplay604,decodedReplay604].every(r=>r.actualGPU&&r.rngCalls===0&&r.sceneSame&&r.clocksSame),'original and decoded packet replay change no model, RNG or visual clocks and use actual GPU');
    check(report.bufferPixels604.delta.pixels===0&&report.bufferPixels604.fromApprovedSnapshot.pixels===0,'typed decode produces exact approved whole-city GPU pixels');
    report.bufferWindows604=[];
    for(const mode of report.bufferScope604.order){
      const result=await ev(`(()=>{const input=__bufferOriginal604,reuse=${mode==='reuse'},shared=reuse?new TownBuffer604.Codec():null;let last=null;
        const one=()=>{const start=performance.now(),codec=reuse?shared:new TownBuffer604.Codec(),afterConstructor=performance.now(),handle=codec.encode(input),afterEncode=performance.now(),decoded=codec.decode(handle),afterDecode=performance.now();last=decoded;return {constructorMs:afterConstructor-start,encodeMs:afterEncode-afterConstructor,decodeMs:afterDecode-afterEncode,totalMs:afterDecode-start,stats:codec.inspect(handle)};};
        for(let i=0;i<2;i++)one();const samples=[];for(let i=0;i<8;i++)samples.push(one());window.__bufferDecoded604=last;return {mode:${JSON.stringify(mode)},samples};})()`);
      result.signature=await ev('__bufferCanonical604(__bufferDecoded604)');check(result.signature.sha256===report.bufferOriginal604.sha256,'all timed '+mode+' codec cycles retain exact complete packet data');
      result.replay=await ev('__audit604.bufferReplay("decoded")');const screenshot=await capture604('buffer-'+report.bufferWindows604.length+'-'+mode);
      result.screenshot=record604(screenshot);result.delta=delta604(originalBufferImage604.pixels,screenshot.pixels);
      check(result.delta.pixels===0&&result.replay.actualGPU&&result.replay.rngCalls===0&&result.replay.sceneSame&&result.replay.clocksSame,'timed '+mode+' codec result remains exact whole-frame GPU output with no game changes');
      report.bufferWindows604.push(result);persist();
    }
    const medianBuffer604=a=>{a=[...a].sort((x,y)=>x-y);const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
    report.bufferSummary604={};for(const mode of ['fresh','reuse']){const samples=report.bufferWindows604.filter(w=>w.mode===mode).flatMap(w=>w.samples),row={samples:samples.length};for(const key of ['constructorMs','encodeMs','decodeMs','totalMs'])row[key]={median:medianBuffer604(samples.map(s=>s[key])),min:Math.min(...samples.map(s=>s[key])),max:Math.max(...samples.map(s=>s[key]))};report.bufferSummary604[mode]=row;}
    report.bufferDecision604={exactRoundtrip:true,exactSourcePixels:true,exactPainterOrder:true,addedPixelDifferences:0,performanceSamples:0,producerSpeedupMeasured:false,bulkWASMExecuted:false,releaseGatePassed:false,note:'Measured transcoding an already-created real packet. Arena/materialization statistics are implementation counters, not total V8 heap allocations. The official SDK has no general typed-command batch entry; this codec is not yet a faster producer or renderer.'};
    check(hash(JSON.stringify(await ev('__audit604.restoreActors()')))===report.sharedActorInput604.candidateBeforeSHA256,'original actor data restored after typed-buffer diagnostic');
    await compositorEnd603();report.coverage.core=true;persist();
