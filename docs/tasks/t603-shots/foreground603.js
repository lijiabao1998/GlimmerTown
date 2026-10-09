// T603 單次標準macOS雲端前景診斷；產品與Linux驗收檔完全不變。
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sourcePath=path.join(__dirname,'scene603.js'),original=fs.readFileSync(sourcePath,'utf8');
let source=original;
const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Foreground overlay anchor missing or ambiguous: '+a.slice(0,80));source=source.replace(a,b);};
replace("const {spawn}=require('child_process');","const {spawn,spawnSync}=require('child_process');");
const displaySwift="import Foundation\nimport CoreGraphics\nimport AppKit\nlet display = CGMainDisplayID()\nlet modes = (CGDisplayCopyAllDisplayModes(display, nil) as? [CGDisplayMode]) ?? []\nfunc describe(_ m: CGDisplayMode) -> [String: Any] { return [\"id\": m.ioDisplayModeID, \"width\": m.width, \"height\": m.height, \"pixelWidth\": m.pixelWidth, \"pixelHeight\": m.pixelHeight, \"refreshRate\": m.refreshRate, \"desktopUsable\": m.isUsableForDesktopGUI()] }\nfunc emit(_ value: [String: Any]) { let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]); print(String(data: data, encoding: .utf8)!) }\nguard let before = CGDisplayCopyDisplayMode(display) else { emit([\"ok\": false, \"reason\": \"No current display mode\"]); exit(2) }\nlet action = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : \"prepare\"\nlet restoreID = CommandLine.arguments.count > 2 ? UInt32(CommandLine.arguments[2]) : nil\nlet suitable = modes.filter { $0.isUsableForDesktopGUI() && $0.width >= 1400 && $0.height >= 900 }.sorted { a, b in\n let pa = a.width >= 1600 && a.height >= 1000 ? 0 : 1, pb = b.width >= 1600 && b.height >= 1000 ? 0 : 1\n return pa != pb ? pa < pb : a.width * a.height < b.width * b.height\n}\nlet target = action == \"restore\" ? restoreID.flatMap { wanted in modes.first(where: { $0.ioDisplayModeID == wanted }) } : (before.width >= 1400 && before.height >= 900 ? before : suitable.first)\nvar result: [String: Any] = [\"displayID\": display, \"action\": action, \"before\": describe(before), \"restoreID\": before.ioDisplayModeID, \"modes\": modes.map(describe), \"changed\": false]\nif action == \"inspect\" { result[\"ok\"] = true; emit(result); exit(0) }\nguard let chosen = target else { result[\"ok\"] = false; result[\"reason\"] = \"No enumerated supported mode fits the unchanged viewport\"; emit(result); exit(2) }\nif chosen.ioDisplayModeID != before.ioDisplayModeID {\n var config: CGDisplayConfigRef?\n var error = CGBeginDisplayConfiguration(&config)\n if error == .success, let config = config {\n  error = CGConfigureDisplayWithDisplayMode(config, display, chosen, nil)\n  if error == .success { error = CGCompleteDisplayConfiguration(config, .forSession) }\n  else { CGCancelDisplayConfiguration(config) }\n }\n result[\"configureError\"] = error.rawValue\n if error != .success { result[\"ok\"] = false; result[\"reason\"] = \"Session-only display configuration refused\"; emit(result); exit(2) }\n result[\"changed\"] = true\n}\nThread.sleep(forTimeInterval: 0.5)\nguard let after = CGDisplayCopyDisplayMode(display) else { result[\"ok\"] = false; result[\"reason\"] = \"No display mode after configuration\"; emit(result); exit(2) }\nresult[\"after\"] = describe(after)\nresult[\"screens\"] = NSScreen.screens.map { screen in [\"frameWidth\": screen.frame.width, \"frameHeight\": screen.frame.height, \"visibleWidth\": screen.visibleFrame.width, \"visibleHeight\": screen.visibleFrame.height, \"scale\": screen.backingScaleFactor] }\nresult[\"ok\"] = after.ioDisplayModeID == chosen.ioDisplayModeID\nemit(result)\n";
replace("const check=(v,m)=>",'const displaySwift603='+JSON.stringify(displaySwift)+';\nconst configureDisplay603=(action,id)=>{const nativePath=path.join(DIR,"display603.swift");fs.writeFileSync(nativePath,displaySwift603);const r=spawnSync("/usr/bin/xcrun",["swift",nativePath,action,...(id===undefined?[]:[String(id)])],{encoding:"utf8",timeout:60000});let data;try{data=JSON.parse(r.stdout);}catch{throw Error("Display helper did not return JSON: "+String(r.stderr).slice(-3000));}return {...data,exitCode:r.status,stderr:r.stderr};};\nconst check=(v,m)=>');
replace('let browser,ws,exitCode=2,server,captureFailure=null;','let browser,ws,exitCode=2,server,captureFailure=null,restoreDisplay603=null;');

replace("const PHASE=arg('phase','full');","const PHASE='core';");
replace("headless:true,performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'","headless:false,performanceNote:'Foreground standard macOS cloud desktop; this is not a physical target-device measurement.'");
replace("['--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),","[");
replace("    const executable=chromePath();check(executable,'Chrome executable exists');","    check(process.platform==='darwin','foreground diagnostic only supports the approved standard macOS runner');\n    report.sourceSHA256="+JSON.stringify(crypto.createHash('sha256').update(original).digest('hex'))+";\n    const executable=chromePath();check(executable,'Chrome executable exists');\n    report.displayBefore603=configureDisplay603('inspect');check(report.displayBefore603.ok&&report.displayBefore603.exitCode===0,'original display mode recorded before any change');\n    restoreDisplay603=async()=>{try{browser?.kill();}catch{}await sleep(1000);return configureDisplay603('restore',report.displayBefore603.restoreID);};\n    report.displayMode603=configureDisplay603('prepare');\n    check(report.displayMode603.ok&&report.displayMode603.exitCode===0,'supported session display fits unchanged viewport');");
replace("report.graphicsLaunch='Original headless --disable-gpu configuration restored after default-graphics diagnostic; both modes failed the unchanged absolute RAF floor on software-only CI';","report.graphicsLaunch='Headed Chrome on standard macos-15, default graphics, no sandbox/GPU security overrides';");
const gpuExpression='(()=>{const walk=n=>n.nodeType===3?n.nodeValue:(n.shadowRoot?walk(n.shadowRoot):"")+[...n.childNodes].map(walk).join(String.fromCharCode(10));return walk(document.body);})()';
new Function(gpuExpression); // 另驗真正傳給瀏覽器的字串，避免只驗外層語法。
const qualify=`
    // Browser diagnostics precede any game navigation. Existing slot3 pre-navigation guard remains intact.
    report.foregroundEnvironment={platform:process.platform,arch:process.arch,displays:spawnSync('/usr/sbin/system_profiler',['SPDisplaysDataType'],{encoding:'utf8'}).stdout};
    await send('Page.enable');await send('Runtime.enable');
    await send('Page.navigate',{url:'chrome://gpu'});await sleep(1500);
    const gpuText=await ev(${JSON.stringify(gpuExpression)});
    fs.writeFileSync(path.join(OUT,'chrome-gpu.txt'),gpuText);report.foregroundEnvironment.gpuReportCaptured=/Graphics Feature Status/i.test(gpuText)&&/Canvas/i.test(gpuText);
    const gpu=report.gpuInfo||{},features=gpu.featureStatus||{},enabled=k=>/^enabled/.test(features[k]||'');
    report.foregroundEnvironment.acceleratedCanvas=enabled('2d_canvas')&&enabled('gpu_compositing')&&enabled('rasterization')&&!/SwiftShader|llvmpipe|Software Renderer|Microsoft Basic Render|WARP/i.test(JSON.stringify(gpu.devices||[]));
    const foregroundState603=async(activate=false)=>{
      let opened={status:null};if(activate){opened=spawnSync('/usr/bin/open',['-a','Google Chrome'],{encoding:'utf8'});await send('Page.bringToFront');await sleep(300);}
      const front=spawnSync('/usr/bin/lsappinfo',['front'],{encoding:'utf8'}),app=front.status===0?spawnSync('/usr/bin/lsappinfo',['info','-only','bundleid,name',front.stdout.trim()],{encoding:'utf8'}):{status:-1,stdout:''};
      const page=await ev('({visible:document.visibilityState,focused:document.hasFocus(),innerWidth,innerHeight,outerWidth,outerHeight,screenWidth:screen.width,screenHeight:screen.height,dpr:devicePixelRatio})');
      const state={openExit:opened.status,frontExit:front.status,appExit:app.status,app:app.stdout,page};
      state.valid=(!activate||opened.status===0)&&front.status===0&&app.status===0&&/com\\.google\\.Chrome/.test(app.stdout)&&page.visible==='visible'&&page.focused&&page.screenWidth>=1400&&page.screenHeight>=900;return state;
    };
    try{const w=await send('Browser.getWindowForTarget');await send('Browser.setWindowBounds',{windowId:w.windowId,bounds:{windowState:'fullscreen'}});await sleep(1000);report.foregroundEnvironment.window=await send('Browser.getWindowForTarget');}catch(e){report.foregroundEnvironment.windowError=String(e);}
    report.foregroundEnvironment.initial=await foregroundState603(true);
    report.foregroundEnvironment.viewportFits=report.foregroundEnvironment.initial.page.innerWidth>=1400&&report.foregroundEnvironment.initial.page.innerHeight>=900;
    if(!report.foregroundEnvironment.gpuReportCaptured||!report.foregroundEnvironment.acceleratedCanvas||!report.foregroundEnvironment.initial.valid||!report.foregroundEnvironment.viewportFits){report.foregroundEnvironment.acceptance='unverified: accelerated Canvas/compositing or a usable focused desktop was not established';persist();throw Error(report.foregroundEnvironment.acceptance);}
    report.foregroundEnvironment.acceptance='environment qualified; day/night >=55 FPS still required';
`;
replace("    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');",qualify+"    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');");
const anchor="for(const off of[true,false]){const mode=off?'baseline':'candidate';await ev('window.__noT603='+off+';true');await camera(focus[0]+1,focus[1]+1,1,0,1,time,false);";
replace(anchor,anchor+"const foregroundBefore=await foregroundState603(true);check(foregroundBefore.valid,'native foreground verified before desktop '+phase+'/'+mode);");
replace("pair[mode]={cold,firstCache:first.cache,warm,warmP95:pct(warm,.95),raf:frames,...work};","const foregroundAfter=await foregroundState603();check(foregroundAfter.valid,'native foreground verified after desktop '+phase+'/'+mode);pair[mode]={cold,firstCache:first.cache,warm,warmP95:pct(warm,.95),raf:frames,...work,foregroundBefore,foregroundAfter};");
replace("      const b=pair.baseline,c=pair.candidate;if(","      const b=pair.baseline,c=pair.candidate;perfCheck(c.raf.frames/(c.raf.elapsed/1000)>=55,'foreground desktop '+phase+' measured >=55 FPS');if(");
replace('function f(t){if(last!==undefined)','function f(t){if(document.visibilityState!=="visible"||!document.hasFocus()){clearTimeout(timer);reject(Error("Foreground lost during sampled RAF"));return;}if(last!==undefined)');
replace('finally{report.exceptions=errors;','finally{if(restoreDisplay603){try{report.displayRestore603=await restoreDisplay603();if(!report.displayRestore603.ok||report.displayRestore603.exitCode!==0){report.status=\'failed\';exitCode=2;}}catch(e){report.displayRestoreError603=String(e);report.status=\'failed\';exitCode=2;}}report.exceptions=errors;');
const compositorHost603=String.raw`    const compositorBegin603=async()=>{
      const frozen=await ev('__s603.compositorFreeze(true)');check(frozen.running===false,'game update loop stopped only for post-performance compositor snapshots');
      const ui=await ev('new Promise((resolve,reject)=>{const start=performance.now();function poll(){const state=__s603.compositorUI();if(state.toasts===0&&!state.tweenPending)resolve(state);else if(performance.now()-start>8000)reject(Error("Snapshot UI did not settle "+JSON.stringify(state)));else setTimeout(poll,50);}poll();})');
      check(ui.toasts===0&&!ui.tweenPending,'toast and HUD animations settled before compositor capture');
      await ev('window.__snapshotAnimations603=document.getAnimations().filter(a=>a.playState==="running");for(const a of window.__snapshotAnimations603)a.pause();__s603.snapshotCanvasOnly(true);true');return frozen;
    };
    const compositorEnd603=async()=>ev('__s603.snapshotCanvasOnly(false);for(const a of window.__snapshotAnimations603||[])a.play();delete window.__snapshotAnimations603;__s603.compositorFreeze(false);true');
    const compositorCapture603=async(name,artOff,time,mode='native',save=true)=>{
      const state=await ev('__s603.compositorFrame('+artOff+','+time+','+JSON.stringify(mode)+')'),shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:state.viewport.cssWidth,height:state.viewport.cssHeight,scale:1}}),after=await ev('__s603.compositorState()'),bytes=Buffer.from(shot.data,'base64'),pixels=pngRgba603(bytes);
      check(pixels.w===1400&&pixels.h===900&&state.viewport.width===1400&&state.viewport.height===900&&state.viewport.dpr===1,'unchanged full compositor canvas 1400x900 '+name);
      check(snapshotUnchanged603(state,after),'snapshot actors and clocks stationary across compositor presentation '+name);
      const file=save?'T603-compositor-'+name+'.png':null;if(file){fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);}return {file,state,after,pixels,sha256:hash(bytes),rgbaSHA256:hash(pixels.rgba)};
    };
    const compositorStable603=async(name,artOff,time,mode='native')=>{
      await compositorCapture603(name+'-warm0',artOff,time,mode,false);await compositorCapture603(name+'-warm1',artOff,time,mode,false);
      const a=await compositorCapture603(name+'-a',artOff,time,mode),b=await compositorCapture603(name+'-b',artOff,time,mode),unstablePixels=pixelDelta603(a.pixels,b.pixels);
      check(unstablePixels===0,'exact zero-difference native compositor repeats '+name);check(JSON.stringify(a.state.counts)===JSON.stringify(b.state.counts),'native site counts stable '+name);return {...b,unstablePixels,repeatFile:a.file};
    };
    const compositorRecord603=({pixels,...r})=>r;
`;
replace("    const view=()=>ev('__s603.view()');",compositorHost603+"    const view=()=>ev('__s603.view()');");
const escapeStart603=source.indexOf('    // Compare actual game canvas bytes against a separate exact-base source page.'),escapeEnd603=source.indexOf('    report.pixelCases=[];',escapeStart603);
if(escapeStart603<0||escapeEnd603<escapeStart603)throw Error('Exact legacy-frame block missing');
source=source.slice(0,escapeStart603)+String.raw`    const verifyEscapeFrames603=async()=>{
      const compareFrames=async label=>{
        await ev('window.__noT603=true;__s603.comparisonRig();__s603.compositorFreeze(true);true');await compositorBegin603();const out={};report.comparisonDiagnostics=report.comparisonDiagnostics||{};report.comparisonDiagnostics[label]=[];
        try{for(let r=0;r<4;r++)for(const se of[0,3])for(const time of[55,100]){const key=r+'/'+se+'/'+time;await ev('__s603.comparisonSetup('+r+','+se+','+time+')');const frame=await compositorStable603(label+'-canvas-'+key.replaceAll('/','-'),true,time);out[key]={file:frame.file,rgbaSHA256:frame.rgbaSHA256};report.comparisonDiagnostics[label].push({key,...compositorRecord603(frame)});}}finally{await compositorEnd603();}
        return out;
      };
      const escapeFrames=await compareFrames('escape'),beforeBase=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/baseline603.html'});await ready(beforeBase);
      const baseIdentity=await ev('__s603.documentIdentity()');check(baseIdentity.version==='11.211'&&baseIdentity.civicFactory==='undefined'&&baseIdentity.url==='/baseline603.html','actual baseline document identity excludes service-worker candidate fallback');report.baseDocumentIdentity=baseIdentity;
      const baseFrames=await compareFrames('base');report.escapeFrameComparison={backend:'compositor PNG RGBA',base:baseFrames,escape:escapeFrames,changedPixels:{}};
      for(const key of Object.keys(baseFrames)){const delta=pixelDelta603(pngRgba603(fs.readFileSync(path.join(OUT,baseFrames[key].file))),pngRgba603(fs.readFileSync(path.join(OUT,escapeFrames[key].file))));report.escapeFrameComparison.changedPixels[key]=delta;check(delta===0,'actual escape-valve compositor frame equals exact-main full RGBA '+key);}
      check(Object.keys(report.escapeFrameComparison.changedPixels).length===16,'all 16 actual escape-valve canvas frames equal exact-main source');
      const beforeCandidate=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready(beforeCandidate);check(await ev('__s603.flags().T603&&__s603.documentIdentity().version==="11.212"&&__s603.documentIdentity().civicFactory==="function"'),'candidate identity and enabled state restored after exact-base comparison');
    };
`+source.slice(escapeEnd603);
const nativePixelPairs603=String.raw`    // These snapshots start after all original cold/warm/RAF/performance gates have sampled live updates.
    report.compositorTimePolicy603='Snapshot-only stopped game update loop, fixed scene clocks and actors, settled HUD, paused CSS, live browser compositor. No Canvas getImageData/toDataURL in frame comparison; performance windows remain fully live.';
    report.foregroundNativePairs=[];
    await compositorBegin603();
    try{for(const zoom of[1,1.25])for(const [light,time]of[['day',55],['night',100]]){
      await camera(focus[0]+1,focus[1]+1,zoom,0,1,time,false);
      const native=await compositorStable603('native-art-z'+zoom+'-'+light,false,time),legacy=await compositorStable603('native-legacy-z'+zoom+'-'+light,true,time),restored=await compositorStable603('native-restored-z'+zoom+'-'+light,false,time);
      const row={zoom,light,native:compositorRecord603(native),legacy:compositorRecord603(legacy),restored:compositorRecord603(restored),artChangedPixels:pixelDelta603(native.pixels,legacy.pixels),restoredPixels:pixelDelta603(native.pixels,restored.pixels)};report.foregroundNativePairs.push(row);persist();check(row.restoredPixels===0,'art toggle restores exact compositor pixels z'+zoom+'/'+light);
    }
    check(report.foregroundNativePairs.some(r=>r.native.state.counts.reflectionCalls>0)&&report.foregroundNativePairs.some(r=>r.native.state.counts.shadowCalls>0),'foreground native frames exercise actual reflection and shadow draws');
    check(report.foregroundNativePairs.some(r=>r.artChangedPixels>0),'foreground art escape actually changes the selected civic scene');
    report.foregroundNativeNegativeControls=[];
    for(const [light,time]of[['day',55],['night',100]]){await camera(focus[0]+1,focus[1]+1,1,0,1,time,false);const good=await compositorStable603('control-'+light+'-good',false,time),bad=await compositorStable603('control-'+light+'-wrong-edge',false,time,'wrong-edge'),restored=await compositorStable603('control-'+light+'-restored',false,time),row={light,wrongEdgePixels:pixelDelta603(good.pixels,bad.pixels),restoredPixels:pixelDelta603(good.pixels,restored.pixels),good:compositorRecord603(good),bad:compositorRecord603(bad),restored:compositorRecord603(restored)};report.foregroundNativeNegativeControls.push(row);persist();check(bad.state.counts.wrongEdges>0&&row.wrongEdgePixels>0&&row.restoredPixels===0,'compositor catches wrong native draw edge and exact restoration '+light);}
    }finally{await compositorEnd603();}
    await verifyEscapeFrames603();
    await ev('window.__noT603=false;GV.setDay('+performanceOriginalDay+');true');
`;
replace('    report.coverage.core=true;persist();}',nativePixelPairs603+'    report.coverage.core=true;persist();}');
const nativePinBaseline=`
    // Compare original and candidate pixels on the same qualified GPU backend, never rebase from candidate output.
    const nativeBaseOrigin603=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/baseline603.html'});await ready(nativeBaseOrigin603);
    const nativeBaseIdentity603=await ev('__s603.documentIdentity()');check(nativeBaseIdentity603.version==='11.211'&&nativeBaseIdentity603.civicFactory==='undefined'&&nativeBaseIdentity603.url==='/baseline603.html','native GPU pin baseline is exact immutable main document');
    const nativeMainPins603=await ev('__s603.pins()');fs.writeFileSync(path.join(OUT,'native-main-sprite-pins.json'),JSON.stringify(nativeMainPins603));report.nativePinBaselineIdentity=nativeBaseIdentity603;
    const nativeCandidateOrigin603=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready(nativeCandidateOrigin603);check(await ev('__s603.flags().T603&&__s603.documentIdentity().version==="11.212"'),'candidate restored after native GPU pin baseline capture');
`;
replace('    // Baseline fixture is immutable v11.211, not the candidate pin file.',nativePinBaseline+'    // Baseline fixture is immutable v11.211, not the candidate pin file.');
replace("const baseline=pinsOf(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','sprite-pins-v11.211.json'),'utf8'))),candidate=","const frozenPinManifest603=pinsOf(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','sprite-pins-v11.211.json'),'utf8'))),baseline=pinsOf(nativeMainPins603),candidate=");
replace('report.candidatePinDiff=[...new Set([...Object.keys(candidate),...Object.keys(actual)])].filter(k=>JSON.stringify(candidate[k])!==JSON.stringify(actual[k]));','report.candidatePinDiff=[...new Set([...Object.keys(candidate),...Object.keys(frozenPinManifest603)])].filter(k=>JSON.stringify(candidate[k])!==JSON.stringify(frozenPinManifest603[k]));report.crossBackendPinDifference=Object.keys(frozenPinManifest603).filter(k=>JSON.stringify(frozenPinManifest603[k])!==JSON.stringify(baseline[k]));');
replace("'candidate pins match Chromium: '","'candidate approved pin manifest remains frozen: '");
const compile=new Function('require','__filename','__dirname',source);
if(process.argv.includes('--check-overlay'))console.log('T603_FOREGROUND_OVERLAY_SYNTAX_OK '+crypto.createHash('sha256').update(source).digest('hex'));
else compile(require,sourcePath,__dirname);
