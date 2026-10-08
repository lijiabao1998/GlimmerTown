    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved T603 art effective flags preserved');
    report.scope604='First whole-night feasibility experiment. Native source and game commands retained. All fallback/producer costs counted. Original 55 FPS and pixel gates reported separately; this experiment cannot authorize release.';
    const manifest604=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')),fixture604=manifest604.cities.find(c=>c.seed===22);
    const raw604=fs.readFileSync(path.join(__dirname,'fixtures',fixture604.file),'utf8');
    const grow604=async(snapshot=false)=>{
      await ev('document.getElementById("bNewGame").click();__s603.grow22();if('+snapshot+')__s603.compositorFreeze(true);true');
      const roots=await ev('__s603.roots()');check(!roots.bad&&roots.rows.length===fixture604.roots&&hash(JSON.stringify(roots.rows))===fixture604.rootSHA256,'same seeded 956-root city generated');
      await ev('GV.save();true');const saved=await ev('__s603.saved()'),expected=await ev('__s603.sourceSaved('+JSON.stringify(raw604)+')');check(saved===expected,'canonical game/save fields equal immutable fixture');
      const focus=await ev('__s603.census(85)[0]');await camera(focus[0]+1,focus[1]+1,1,0,1,100,false);return {roots:roots.rows.length,rootSHA256:hash(JSON.stringify(roots.rows)),focus,saveSHA256:hash(saved)};
    };
    const navigate604=async(mode,snapshot=false)=>{const before=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+(mode==='native'?'/native604.html':'/index.html?renderer=canvaskit')});await ready(before);if(mode==='gpu'){const loaded=await ev('__townRenderer604.ready');report.lastLoad604=loaded;check(loaded.status==='ready','pinned CanvasKit WASM loaded from same origin');}await foregroundState603(true);return grow604(snapshot);};
    const capture604=async(name)=>{const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),bytes=Buffer.from(result.data,'base64'),file='T604-'+name+'.png';fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);return {file,sha256:hash(bytes),pixels:pngRgba603(bytes)};};
    const record604=({pixels,...row})=>row;
    const delta604=(a,b)=>{let pixels=0,max=0,total=0;for(let i=0;i<a.rgba.length;i+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a.rgba[i+k]-b.rgba[i+k]);max=Math.max(max,d);total+=d;changed||=d!==0;}if(changed)pixels++;}return {pixels,maxChannelDelta:max,absoluteChannelSum:total};};
    const firstReady604=await ev('__townRenderer604.ready');check(firstReady604.status==='ready','cold pinned WASM initializes');
    report.firstColdLoad604={renderer:firstReady604,resources:await ev('performance.getEntriesByType("resource").map(r=>({path:new URL(r.name).pathname,duration:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize}))')};
    report.recorderContracts604=await ev(fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/recorder-browser-contracts.js'),'utf8'));check(report.recorderContracts604.every(r=>r.changedPixels===0),'native replay preserves all isolated recorder semantics');
    report.initialNative604=await navigate604('native',true);
    await compositorBegin603();
    const shared604=await ev('({stars:__s603.snapshotStars(),fx:__s603.snapshotFx(),actors:__audit604.actors()})');
    const native604=await compositorStable603('604-original-night',false,100);
    report.nativeSnapshot604=compositorRecord603(native604);
    await compositorEnd603();
    await ev('for(const [k,v]of Object.entries({"glimmerville.v1":"lab-sentinel","glimmerville.v1.slot":"2","glimmerville.v1.s1":"lab-slot-1","glimmerville.v1.s2":"lab-slot-2","glimmerville.v1.s3":"lab-slot-3"}))localStorage.setItem(k,v);true');
    report.candidateCity604=await navigate604('gpu',true);
    report.coldLoad604={...await ev('__townRenderer604.info()'),resources:await ev('performance.getEntriesByType("resource").filter(r=>/canvaskit|t604-/.test(r.name)).map(r=>({name:new URL(r.name).pathname,duration:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize}))')};
    persist();
    await compositorBegin603();const originalActors604=await ev('__audit604.actors()');
    report.sharedActorInput604={nativeSHA256:hash(JSON.stringify(shared604.actors)),candidateBeforeSHA256:hash(JSON.stringify(originalActors604)),source:'Complete native-boot actor data, including all citizen and confetti fields. Snapshot only; independent live performance boots remain unchanged.'};
    await ev('__s603.snapshotStars('+JSON.stringify(shared604.stars)+');__s603.snapshotFx('+JSON.stringify(shared604.fx)+');__audit604.actors('+JSON.stringify(shared604.actors)+');true');
    check(hash(JSON.stringify(await ev('__audit604.actors()')))===report.sharedActorInput604.nativeSHA256,'all native actor fields copied exactly for frozen image comparison');
    await ev('__townRenderer604.setMode("native");true');
    const recorded604=await compositorStable603('604-recorded-native-night',false,100);
    report.nativeReplay604={...compositorRecord603(recorded604),differenceFromOriginal:delta604(native604.pixels,recorded604.pixels)};
    await ev('__townRenderer604.setMode("gpu");true');
    const gpu604=await compositorStable603('604-canvaskit-night',false,100);
    report.gpuSnapshot604={...compositorRecord603(gpu604),renderer:await ev('__townRenderer604.info()'),differenceFromOriginal:delta604(native604.pixels,gpu604.pixels),differenceFromRecordedNative:delta604(recorded604.pixels,gpu604.pixels)};
    report.inputEquality604={actors:native604.state.actors===gpu604.state.actors,sky:native604.state.sky===gpu604.state.sky,fx:native604.state.fx===gpu604.state.fx,counts:JSON.stringify(native604.state.actorCounts)===JSON.stringify(gpu604.state.actorCounts)};
    check(Object.values(report.inputEquality604).every(Boolean),'same complete actor, star and dust inputs for whole-city comparison');
    persist();
    if(report.gpuSnapshot604.renderer.backend!=='gpu')throw Error('Whole-night scene fell back: '+JSON.stringify(report.gpuSnapshot604.renderer.fallbackReasons));
    report.replayAudit604=await ev('__audit604.replay()');check(report.replayAudit604.rngCalls===0&&report.replayAudit604.sceneSame&&report.replayAudit604.clockSame,'GPU and native packet replay consumes zero game RNG and changes no model or clocks');
    // T256's opaque ocean covers the first sky paint in this camera. Perturb
    // that actual visible background command, retaining all later commands.
    report.negativeInput604=await ev('(()=>{const c=__townRenderer604,p=c.lastPacket,commands=p.commands.slice(),firstImage=commands.findIndex(x=>x.kind==="image"),index=commands.findIndex((x,i)=>i<firstImage&&x.kind==="fillRect"&&x.args[0]===0&&x.args[1]===0&&x.args[2]===p.width&&x.args[3]===p.height&&x.state.fillStyle?.type==="linear");if(index<1)throw Error("Visible opaque T256 background boundary missing");const original=commands[index];commands[index]={...original,state:{...original.state,fillStyle:"#ff00ff"}};c.player.render({...p,commands});c.show("gpu");return {index,firstImage,kind:original.kind,args:original.args,gradient:original.state.fillStyle,backendIsGPU:c.surface.reportBackendTypeIsGPU()};})()');
    const wrong604=await capture604('wrong-sky-control');await ev('__townRenderer604.player.render(__townRenderer604.lastPacket);__townRenderer604.show("gpu");true');const restored604=await capture604('restored-night');
    report.negative604={wrong:record604(wrong604),restored:record604(restored604),wrongDelta:delta604(gpu604.pixels,wrong604.pixels),restoreDelta:delta604(gpu604.pixels,restored604.pixels)};
    check(report.negativeInput604.backendIsGPU&&report.negative604.wrongDelta.pixels>100&&report.negative604.restoreDelta.pixels===0,'actual GPU compositor catches wrong visible ocean and exact restoration');
    report.fallback604=await ev('__audit604.fallback()');check(report.fallback604.draws===1&&report.fallback604.info.backend==='native'&&report.fallback604.info.lastFrame.reasons.some(s=>/text/i.test(s)),'unsupported text invokes whole-frame native fallback after one game draw');
    await shot('604-whole-frame-text-fallback');await ev('GV.forceDraw();true');check(await ev('__townRenderer604.info().backend==="gpu"'),'next supported frame returns to GPU');
    check(hash(JSON.stringify(await ev('__audit604.restoreActors()')))===report.sharedActorInput604.candidateBeforeSHA256,'original candidate actor objects and fields restored before live measurements');
    await compositorEnd603();
    // Check real controls with the GPU canvas over the unchanged input canvas.
    const z604=(await view()).cam.z;await click(el('zin'));check((await view()).cam.z>z604,'real zoom button works with GPU presentation');await click(el('zout'));
    await click('document.querySelector("[data-tid=pan]")');const point604={x:700,y:520},beforePan604=(await view()).cam;
    check(await ev('document.elementFromPoint(700,520).id==="game"'),'GPU presentation leaves real game pointer target intact');
    await mouse('mousePressed',700,520,{button:'left',buttons:1,clickCount:1});await mouse('mouseMoved',750,540,{button:'left',buttons:1});await mouse('mouseReleased',750,540,{button:'left',buttons:0,clickCount:1});
    check(Math.hypot((await view()).cam.x-beforePan604.x,(await view()).cam.y-beforePan604.y)>10,'real drag pans the same game camera');
    // Interleaved independent pages, one unchanged live game loop per sample.
    report.paired604=[];
    for(const mode of ['native','gpu','gpu','native']){
      const city=await navigate604(mode);await sleep(1800);const foregroundBefore=await foregroundState603(true),state=await ev('__s603.scene()');check(foregroundBefore.valid,'foreground qualified before '+mode);
      const counter=mode==='gpu'?await ev('__townRenderer604.info()'):null;
      const frames=await raf(5000),after=mode==='gpu'?await ev('__townRenderer604.info()'):null,foregroundAfter=await foregroundState603();
      check(foregroundAfter.valid&&state===await ev('__s603.scene()'),'live '+mode+' sample remains focused and paused city content unchanged');
      const row={mode,city,raf:frames,fps:frames.frames/(frames.elapsed/1000),foregroundBefore,foregroundAfter,renderer:after,counts:after?{total:after.frames-counter.frames,gpu:after.gpuFrames-counter.gpuFrames,fallback:after.fallbackFrames-counter.fallbackFrames}:null};report.paired604.push(row);persist();
    }
    const med604=a=>[...a].sort((a,b)=>a-b).reduce((s,n)=>s+n,0)/a.length;
    const n604=report.paired604.filter(r=>r.mode==='native'),g604=report.paired604.filter(r=>r.mode==='gpu');
    report.performance604={nativeFPS:med604(n604.map(r=>r.fps)),gpuFPS:med604(g604.map(r=>r.fps)),allGPUFrames:g604.every(r=>r.counts.gpu>0&&r.counts.fallback===0),absolute55:g604.every(r=>r.fps>=55)};
    report.performance604.ratio=report.performance604.gpuFPS/report.performance604.nativeFPS;
    report.performance604.measurableBenefit=report.performance604.allGPUFrames&&Math.min(...g604.map(r=>r.fps))>Math.max(...n604.map(r=>r.fps))*1.1;
    // CPU attribution is sampled only after the uninstrumented RAF comparison.
    await navigate604('gpu');await ev('__townRenderer604.measureStart();true');await raf(2000);report.cpu604=await ev('__townRenderer604.measureEnd()');
    await shot('604-whole-night-with-hud');persist();
    // Same-origin offline shell and isolated game storage. Loopback is a secure
    // context but this is not a claim of deployed HTTPS acceptance.
    await ev('GV.save();true');const save604=await ev('__s603.saved()'),roots604=await ev('__s603.roots()');
    await ev('navigator.serviceWorker.ready');await sleep(2000);
    report.cache604=await ev('(async()=>{const out=[];for(const name of await caches.keys()){const cache=await caches.open(name),files=[];for(const req of await cache.keys()){const response=await cache.match(req),bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest("SHA-256",bytes);files.push({path:new URL(req.url).pathname,bytes:bytes.byteLength,sha256:[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("")});}out.push({name,files});}return {caches:out,storage:await navigator.storage.estimate(),controlled:!!navigator.serviceWorker.controller};})()');
    const shell604=report.cache604.caches.find(c=>c.name.startsWith('glimmerville-main-shell-'));
    check(shell604&&shell604.files.some(f=>f.path.endsWith('canvaskit.wasm'))&&shell604.files.some(f=>f.path.endsWith('t604-controller.js')),'offline shell contains pinned WASM and full renderer');
    const lock604=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/vendor/canvaskit-0.42.0.lock.json'),'utf8'));
    check(shell604.files.find(f=>f.path.endsWith('canvaskit.wasm')).sha256===lock604.files['bin/canvaskit.wasm'].sha256,'cached WASM SHA256 equals pinned official release');
    await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});const origin604=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:false});await ready(origin604);await ev('__townRenderer604.ready');await click(el('bContinue'));await ev('GV.setSpeed(0);GV.ai(false);true');
    check(save604===await ev('__s603.saved()')&&JSON.stringify(roots604)===JSON.stringify(await ev('__s603.roots()')),'offline Continue restores exact city and canonical saved fields');
    await ev('GV.save();if(!GV.load())throw Error("Offline load failed");GV.setSpeed(0);true');check(save604===await ev('__s603.saved()'),'offline save/load preserves canonical game contents');
    check(await ev('localStorage.getItem("glimmerville.v1")==="lab-sentinel"&&localStorage.getItem("glimmerville.v1.slot")==="2"&&[1,2,3].every(i=>localStorage.getItem("glimmerville.v1.s"+i)==="lab-slot-"+i)'),'legacy Lab namespace remains byte-for-byte unchanged');
    report.offline604={secureContext:await ev('isSecureContext'),deployedHTTPS:false,renderer:await ev('__townRenderer604.info()'),savedSHA256:hash(save604),labIsolation:true};await shot('604-offline-continue');
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    report.originalPixelGatePassed604=report.gpuSnapshot604.differenceFromOriginal.pixels===0;
    report.decision604=report.performance604.measurableBenefit?'Measurable stage-one whole-frame benefit; imagery/full regression and original gates still required.':'NO-GO: no measured whole-frame benefit. Stop integration and retain evidence.';
    report.coverage.core=true;persist();
