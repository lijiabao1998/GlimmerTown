// T603 單次標準macOS雲端前景診斷；產品與Linux驗收檔完全不變。
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sourcePath=path.join(__dirname,'scene603.js'),original=fs.readFileSync(sourcePath,'utf8');
let source=original;
const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Foreground overlay anchor missing or ambiguous: '+a.slice(0,80));source=source.replace(a,b);};
replace("const {spawn}=require('child_process');","const {spawn,spawnSync}=require('child_process');");
replace("const PHASE=arg('phase','full');","const PHASE='core';");
replace("headless:true,performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'","headless:false,performanceNote:'Foreground standard macOS cloud desktop; this is not a physical target-device measurement.'");
replace("['--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),","[");
replace("    const executable=chromePath();check(executable,'Chrome executable exists');","    check(process.platform==='darwin','foreground diagnostic only supports the approved standard macOS runner');\n    report.sourceSHA256="+JSON.stringify(crypto.createHash('sha256').update(original).digest('hex'))+";\n    const executable=chromePath();check(executable,'Chrome executable exists');");
replace("report.graphicsLaunch='Original headless --disable-gpu configuration restored after default-graphics diagnostic; both modes failed the unchanged absolute RAF floor on software-only CI';","report.graphicsLaunch='Headed Chrome on standard macos-15, default graphics, no sandbox/GPU security overrides';");
const qualify=`
    // Browser diagnostics precede any game navigation. Existing slot3 pre-navigation guard remains intact.
    report.foregroundEnvironment={platform:process.platform,arch:process.arch,displays:spawnSync('/usr/sbin/system_profiler',['SPDisplaysDataType'],{encoding:'utf8'}).stdout};
    await send('Page.enable');await send('Runtime.enable');
    await send('Page.navigate',{url:'chrome://gpu'});await sleep(1500);
    const gpuText=await ev('(()=>{const walk=n=>n.nodeType===3?n.nodeValue:(n.shadowRoot?walk(n.shadowRoot):"")+[...n.childNodes].map(walk).join("\\n");return walk(document.body);})()');
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
const compile=new Function('require','__filename','__dirname',source);
if(process.argv.includes('--check-overlay'))console.log('T603_FOREGROUND_OVERLAY_SYNTAX_OK '+crypto.createHash('sha256').update(source).digest('hex'));
else compile(require,sourcePath,__dirname);
