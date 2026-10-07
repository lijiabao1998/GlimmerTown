// One bounded native-Mac experiment. Builds only disposable HTML; never writes index.html.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {offcanvasBridge603}=require('./offcanvas603.js');
const original=fs.readFileSync(path.join(__dirname,'foreground603.js'),'utf8');
const tail="const compile=new Function('require','__filename','__dirname',source);";
if(original.split(tail).length!==2)throw Error('Foreground builder boundary drift');
// Reuse the qualified native-display/CDP/compositor setup, without running its
// test suite. Then replace only the experiment body and disposable injection.
let source=new Function('require','__dirname',original.slice(0,original.indexOf(tail))+'\nreturn source;')(require,__dirname);
const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Offcanvas runner anchor drift: '+a.slice(0,90));source=source.replace(a,b);};
replace("const {assertNativeSource603,pngRgba603,pixelDelta603,snapshotUnchanged603}=require('./native603.js');","const {assertNativeSource603,pngRgba603,pixelDelta603,snapshotUnchanged603}=require('./native603.js');\nconst {overlayHTML603,pairedVerdict603}=require('./offcanvas603.js');");
replace('advanceReal603=advance,drawReal603=draw,hudReal603=updHud;','advanceReal603=advance,hudReal603=updHud;let drawReal603=draw;');
replace('}\n// Inverse only approved art changes,', '('+offcanvasBridge603.toString()+')();\n}\n// Inverse only approved art changes,');
replace("fs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));", "const overlay=overlayHTML603(html);report.offcanvasOverlay=overlay.proof;html=overlay.html;\nfs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));");
replace("path.join(OUT,'scene603-summary.json')","path.join(OUT,'offcanvas603-summary.json')");
const shotStart=source.indexOf('    const shot=async name=>'),shotEnd=source.indexOf('    captureFailure=async()=>',shotStart);
if(shotStart<0||shotEnd<shotStart)throw Error('UI screenshot boundary drift');
source=source.slice(0,shotStart)+"    const shot=async name=>{report.mobileUILandmarks=report.mobileUILandmarks||[];report.mobileUILandmarks.push(name);};\n"+source.slice(shotEnd);
// Existing screenshot helpers require desktop dimensions. This diagnostic's
// own snapshot routine below checks the actual desktop OR mobile dimensions.
const start=source.indexOf('    report.flags=await ev('),end=source.indexOf('    report.finalFlags=await ev(',start);
if(start<0||end<=start)throw Error('Experiment boundary drift');
const experiment=String.raw`
    report.experiment='T603 conservative whole-block offcanvas omission; diagnostic only';
    report.predeclared={marginDevicePixels:2,windowMs:5000,phaseWarmupMs:10000,phaseWarmupDraws:10,windowWarmupMs:1500,windowWarmupDraws:5,pairs:4,orders:['original','guarded','guarded','original','original','guarded','guarded','original'],warmSamples:{desktop:30,mobile:10},fpsBenefit:1.05,requiredWinningPairs:3,maxMedianRegression:1.05,absoluteDesktopFPS:55};
    report.scope='Same-session guard effect, independent immutable-main regression, and absolute 55 FPS are separate results. No product/publish action.';
    report.timingPolicy='No canvas readback, frozen animation, draw-call tracing, screenshot, or DevTools trace inside timed windows. Full real advance/draw/HUD remain live at the established speed=0 city setting. Hold daylight() output alone; visT/trafClock/waterT and live actor updates progress.';
    report.scenarios={};report.timing={};report.snapshots=[];report.phaseWarmups=[];
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22);
    const fixtureRaw=fs.readFileSync(path.join(__dirname,'fixtures',fixture.file),'utf8');check(hash(fixtureRaw)===fixture.saveSHA256,'immutable seed22 save fixture hash');
    const identityKey=s=>JSON.stringify({viewport:s.viewport,cam:s.view.cam,day:s.view.day,rot:s.view.rot,season:s.view.season,quality:s.quality});
    const navigate=async(main)=>{const origin=await ev('performance.timeOrigin');await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+(main?'/baseline603.html':'/index.html')});await ready(origin);const id=await ev('__s603.documentIdentity()');check(main?id.version==='11.211'&&id.civicFactory==='undefined'&&id.url==='/baseline603.html':id.version==='11.212'&&id.civicFactory==='function'&&id.url==='/index.html','independent document identity '+(main?'immutable-main':'candidate'));return id;};
    const setViewport=async mobile=>{await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1400,height:mobile?844:900,deviceScaleFactor:1,mobile});await sleep(500);};
    const prepare=async(platform,main,label)=>{
      const mobile=platform==='mobile';await setViewport(false);const identity=await navigate(main);
      const stats=await ev('document.getElementById("bNewGame").click();__s603.grow22()'),roots=await ev('__s603.roots()');
      check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'exact grown seed22 roots '+label);
      check(stats.day===fixture.day&&stats.pop===fixture.stats.pop,'genuine grown seed22 day/population '+label);
      if(mobile){
        await setViewport(true);const target=(await ev('__s603.census(85)'))[0];
        // Same genuine post-touch/load/toolbar scenario as the failed mobile gate.
        await testUI('offcanvas-'+label,true,target);await verifyMobileZoomLanes();
        await ev('GV.setSpeed(0);GV.setRot(0);GV.setZoom(.7);true');
        const built=report.mobileConstruction;check(built.site.x===35&&built.site.y===27&&built.beforeRootCount===956&&built.afterRootCount===957,'actual mobile touch fixture adds dogpark at 35,27');
      }else await camera(22,14,1,0,1,55,false);
      const finalIdentity=await ev('__s603.documentIdentity()');check(JSON.stringify(finalIdentity)===JSON.stringify(identity),'same independent source after scenario reload '+label);
      const s=await ev('__s603.offcanvasState()'),r=await ev('__s603.roots()'),rootSHA256=hash(JSON.stringify(r.rows));
      check(s.view.running&&s.view.speed===0&&s.quality===1,'live standard quality scenario '+label);
      check(s.viewport.width===(mobile?390:1400)&&s.viewport.height===(mobile?844:900)&&s.viewport.dpr===1&&s.viewport.devicePixelRatio===1,'actual viewport/DPR '+label);
      check(r.rows.length===(mobile?957:956)&&!r.bad,'actual scenario roots '+label);
      if(!mobile)check(s.view.cam.x===256&&s.view.cam.y===576&&s.view.cam.z===1,'exact desktop camera 256,576,z1');
      const record={identity,state:s,rootSHA256,roots:r.rows.length};report.scenarios[label]=record;
      const prior=report.scenarios[platform+'-main-before'];if(prior)check(prior.rootSHA256===rootSHA256&&identityKey(prior.state)===identityKey(s),'independent main/candidate scenario identity '+label);
      persist();return record;
    };
    const measure=async(platform,phase,time,mode,label)=>{
      await ev('__s603.offcanvasMode('+JSON.stringify(mode)+');__s603.offcanvasLight('+time+');true');
      // A fixed live warmup, not a retry-until-green loop. No cache clear in a
      // paired window; both modes share exactly the same original sprite cache.
      await sleep(1500);for(let i=0;i<5;i++)await ev('__s603.drawMs()');
      const foregroundBefore=await foregroundState603(true);check(foregroundBefore.valid,'native foreground before '+label);
      const before=await ev('__s603.offcanvasState()'),warm=[];
      for(let i=0;i<(platform==='mobile'?10:30);i++)warm.push(await ev('__s603.drawMs()'));
      await ev('__s603.perfStart()');let frames,work;
      try{frames=await raf(5000);}finally{work=await ev('__s603.perfWork()');}
      const after=await ev('__s603.offcanvasState()'),foregroundAfter=await foregroundState603();
      const result={mode,label,phase,warm,warmP95:pct(warm,.95),raf:frames,fps:frames.frames/(frames.elapsed/1000),work,before,after,foregroundBefore,foregroundAfter};
      report.lastWindow=result;persist();
      check(foregroundAfter.valid&&before.view.running&&after.view.running&&before.mode===mode&&after.mode===mode,'native foreground and live renderer retained '+label);
      check(identityKey(before)===identityKey(after)&&before.flags.T603===after.flags.T603,'no camera, light-independent scenario, quality or art drift '+label);
      check(JSON.stringify(before.light)===JSON.stringify(after.light)&&after.clocks.visT>before.clocks.visT&&after.clocks.trafClock>before.clocks.trafClock,'real visT and traffic clocks progress at steady light '+label);
      check(work.work.advance.calls>0&&work.work.draw.calls>0&&work.work.hud.calls>0,'real advance/draw/HUD calls sampled '+label);
      if(after.cache.bakes!==before.cache.bakes){report.invalidWindow={label,reason:'sprite rebake during measured window; no optimization-regression verdict',bakeDelta:after.cache.bakes-before.cache.bakes};persist();}
      check(after.cache.bakes===before.cache.bakes,'zero sprite rebakes inside warm/RAF windows '+label);
      return result;
    };
    // Each platform brackets the same-document O/G pairs with two independent
    // main boots. Every requested window is retained; no adaptive retries.
    for(const platform of ['desktop','mobile']){
      const runs=report.timing[platform]={mainBefore:{},candidate:{},mainAfter:{}};
      for(const stage of ['mainBefore','candidate','mainAfter']){
        await prepare(platform,stage!=='candidate',platform+'-'+(stage==='mainBefore'?'main-before':stage));
        for(const [phase,time]of [['day',55],['night',100]]){
          await ev('__s603.offcanvasMode("original");__s603.offcanvasLight('+time+');true');
          const warmupBefore=await ev('__s603.offcanvasState()');await sleep(10000);for(let i=0;i<10;i++)await ev('__s603.drawMs()');
          const warmupAfter=await ev('__s603.offcanvasState()');report.phaseWarmups.push({platform,stage,phase,fixedDurationMs:10000,fixedDraws:10,before:warmupBefore,after:warmupAfter,bakeDelta:warmupAfter.cache.bakes-warmupBefore.cache.bakes});persist();
          check(warmupAfter.clocks.visT>warmupBefore.clocks.visT&&warmupAfter.clocks.trafClock>warmupBefore.clocks.trafClock,'fixed phase warmup retains live clocks '+platform+'/'+stage+'/'+phase);
          const rows=runs[stage][phase]=[];
          const order=stage==='candidate'?report.predeclared.orders:['original','original'];
          for(let i=0;i<order.length;i++){rows.push(await measure(platform,phase,time,order[i],platform+'/'+stage+'/'+phase+'/'+i));persist();}
        }
      }
    }
    report.timingFinished=true;persist();
    const countSites=rows=>({reflection:rows.filter(r=>r.site==='reflection').length,shadow:rows.filter(r=>r.site==='shadow').length});
    const compareArguments=(normal,guarded)=>{
      check(normal.rows.length===normal.calls.length,'every original filtered draw has one source-site audit row');
      check(guarded.calls.length===guarded.rows.filter(r=>!r.skipped).length,'guarded calls equal retained source sites');
      check(JSON.stringify(normal.rows.map(({skipped,...r})=>r))===JSON.stringify(guarded.rows.map(({skipped,...r})=>r)),'every pre-block input/state/eligibility/order identical');
      check(JSON.stringify(normal.calls.filter((_,i)=>!normal.rows[i].eligible))===JSON.stringify(guarded.calls),'all retained image identities, exact arguments, alpha, sampling, transform and composite preserved');
      check(JSON.stringify(normal.finalState)===JSON.stringify(guarded.finalState),'native canvas state restored after omissions');
    };
    const capture=async(platform,label,guarded,time,negative=false)=>{
      const r=await ev('__s603.offcanvasAudit('+guarded+','+time+','+negative+')');
      const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:r.frame.viewport.cssWidth,height:r.frame.viewport.cssHeight,scale:1}});
      const after=await ev('__s603.compositorState()'),bytes=Buffer.from(screenshot.data,'base64'),pixels=pngRgba603(bytes),file='T603-offcanvas-'+label+'.png';
      fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);
      fs.writeFileSync(path.join(OUT,file.replace(/\.png$/,'.json')),JSON.stringify({...r,after,file,rgbaSHA256:hash(pixels.rgba)},null,2));persist();
      check(snapshotUnchanged603(r.frame,after),'post-timing snapshot actors/sky/clocks stationary '+label);
      check(pixels.w===(platform==='desktop'?1400:390)&&pixels.h===(platform==='desktop'?900:844),'exact full canvas dimensions '+label);
      return {...r,file,rgbaSHA256:hash(pixels.rgba),pixels};
    };
    const record=({pixels,...r})=>r;
    for(const platform of ['desktop','mobile']){
      await prepare(platform,false,platform+'-snapshots');await ev('__s603.offcanvasLight(null)');await compositorBegin603();
      try{for(const [phase,time]of [['day',55],['night',100]]){
        const label=platform+'-'+phase;
        // Settle identical native presentation before the frozen A/A/B/A series.
        await ev('__s603.offcanvasAudit(false,'+time+',false);__s603.offcanvasAudit(false,'+time+',false);true');
        const a=await capture(platform,label+'-original-a',false,time),b=await capture(platform,label+'-original-b',false,time);
        check(pixelDelta603(a.pixels,b.pixels)===0,'original repeat full RGBA zero '+label);
        const guarded=await capture(platform,label+'-guarded',true,time);compareArguments(b,guarded);
        const pixels=pixelDelta603(b.pixels,guarded.pixels);check(pixels===0,'guarded full RGBA exact zero '+label);
        const restored=await capture(platform,label+'-restored',false,time);compareArguments(restored,guarded);
        check(pixelDelta603(b.pixels,restored.pixels)===0,'original restoration full RGBA zero '+label);
        const counts=countSites(b.rows),skips=countSites(guarded.rows.filter(r=>r.skipped)),row={platform,phase,counts,skips,changedPixels:pixels,original:record(b),guarded:record(guarded),restored:record(restored)};
        report.snapshots.push(row);persist();
        if(platform==='desktop')check(counts.reflection===46&&counts.shadow===(phase==='night'?230:0)&&skips.reflection===3&&skips.shadow===(phase==='night'?48:0),'exact desktop dry-audit count reproduction '+phase);
        else check(counts.reflection===0&&skips.reflection===0,'actual mobile LOD has zero reflection calls '+phase);
        if(b.calls.length){const bad=await capture(platform,label+'-wrong-edge',true,time,true),again=await capture(platform,label+'-after-negative',true,time);row.negative={changedPixels:pixelDelta603(guarded.pixels,bad.pixels),restoredPixels:pixelDelta603(guarded.pixels,again.pixels),bad:record(bad),restored:record(again)};persist();check(bad.frame.counts.wrongEdges>0&&row.negative.changedPixels>0&&row.negative.restoredPixels===0,'wrong retained edge detected and exact restoration '+label);}
      }}finally{await compositorEnd603();}
    }
    // Evaluate once, after all declared evidence. These independent outcomes
    // cannot cancel one another and are never represented as release approval.
    report.paired={};report.regressionVsIndependentMain={};report.absolute55={};
    const median=a=>{a=[...a].sort((x,y)=>x-y);const i=a.length>>1;return a.length%2?a[i]:(a[i-1]+a[i])/2;};
    for(const platform of ['desktop','mobile'])for(const phase of ['day','night']){
      const key=platform+'/'+phase,r=report.timing[platform],paired=report.paired[key]=pairedVerdict603(r.candidate[phase]);
      const main=[...r.mainBefore[phase],...r.mainAfter[phase]],candidate=r.candidate[phase].filter(x=>x.mode==='guarded');
      const ref={warmP95:median(main.map(x=>x.warmP95)),rafP95:median(main.map(x=>x.raf.p95)),fps:median(main.map(x=>x.fps))},actual={warmP95:median(candidate.map(x=>x.warmP95)),rafP95:median(candidate.map(x=>x.raf.p95)),fps:median(candidate.map(x=>x.fps))};
      report.regressionVsIndependentMain[key]={reference:ref,candidate:actual,warmLimit:ref.warmP95*1.5+5,rafLimit:ref.rafP95*1.5+5,pass:actual.warmP95<=ref.warmP95*1.5+5&&actual.rafP95<=ref.rafP95*1.5+5&&actual.fps>=ref.fps/2};
      if(platform==='desktop')report.absolute55[phase]={required:55,allGuardedWindowsPass:candidate.every(x=>x.fps>=55),fps:candidate.map(x=>x.fps)};
      perfCheck(paired.noMaterialRegression,'guard no material paired regression '+key);
    }
    perfCheck(Object.values(report.paired).some(x=>x.clearBenefit),'predeclared clear paired benefit in at least one scene');
    report.diagnosticAccepted=report.performanceFailures.length===0;
    for(const [phase,result]of Object.entries(report.absolute55))perfCheck(result.allGuardedWindowsPass,'probe desktop '+phase+' >=55 FPS in every guarded window (formal suite remains separate)');
    for(const [key,result]of Object.entries(report.regressionVsIndependentMain))perfCheck(result.pass,'independent original-main warm/RAF relative budget '+key);
    report.releaseGatePassed=false;
    report.releaseGateNote='This isolated probe never passes the complete release gate. Original full validation and independent image review are still required; absolute 55 and independent-main regression outcomes remain explicit.';
    persist();check(report.performanceFailures.length===0,'STOP: experiment performance requirement failed; do not tune margin, repeat CI, or publish: '+report.performanceFailures.join('; '));
`;
source=source.slice(0,start)+experiment+source.slice(end);
// Our final candidate snapshot prepare restores the candidate identity.
new Function('require','__filename','__dirname',source);
if(require.main===module){
  if(process.argv.includes('--check-overlay'))console.log('T603_OFFCANVAS_OVERLAY_SYNTAX_OK '+crypto.createHash('sha256').update(source).digest('hex'));
  else new Function('require','__filename','__dirname',source)(require,__filename,__dirname);
}
module.exports={source};
