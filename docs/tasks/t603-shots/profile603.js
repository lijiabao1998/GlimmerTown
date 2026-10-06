// T603 bounded diagnosis only: unchanged product, no release acceptance or benchmark rerun.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../..');
const product=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex');
if(product!=='6c1575ef7dbfec26abf363a39e5bcae8224c47ef98d4db1140926e53691aed69')throw Error('Diagnostic runtime differs from frozen T603 candidate');
let source;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'foreground603.js'),'utf8'),{require,__dirname,process:{argv:['node','foreground603.js','--check-overlay']},console:{log(){}},Function:function(...args){if(args.length>1)source=args.at(-1);return function(){};}});
if(!source)throw Error('Foreground harness was not captured');
const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Profile anchor missing or ambiguous: '+a.slice(0,80));source=source.replace(a,b);};
function pngRgba603(bytes){
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Not PNG');
  let w,h,bpp;const idat=[];
  for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p),kind=bytes.toString('ascii',p+4,p+8),data=bytes.subarray(p+8,p+8+n);if(kind==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);if(data[8]!==8||![2,6].includes(data[9])||data[12]!==0||w>8192||h>8192)throw Error('Unsupported screenshot PNG');bpp=data[9]===6?4:3;}if(kind==='IDAT')idat.push(data);p+=n+12;if(kind==='IEND')break;}
  if(!w||!h||!bpp)throw Error('Incomplete PNG');const raw=require('zlib').inflateSync(Buffer.concat(idat)),stride=w*bpp,pixels=Buffer.alloc(w*h*bpp),rgba=Buffer.alloc(w*h*4);if(raw.length!==(stride+1)*h)throw Error('PNG row length mismatch');
  const paeth=(a,b,c)=>{const p=a+b-c,A=Math.abs(p-a),B=Math.abs(p-b),C=Math.abs(p-c);return A<=B&&A<=C?a:B<=C?b:c;};
  for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Unknown PNG filter');for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?pixels[i-bpp]:0,b=y?pixels[i-stride]:0,c=y&&x>=bpp?pixels[i-stride-bpp]:0,predict=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);pixels[i]=(raw[y*(stride+1)+1+x]+predict)&255;}}
  for(let i=0,j=0;i<pixels.length;i+=bpp,j+=4){rgba[j]=pixels[i];rgba[j+1]=pixels[i+1];rgba[j+2]=pixels[i+2];rgba[j+3]=bpp===4?pixels[i+3]:255;}return {w,h,rgba};
}
function pixelDelta603(a,b){if(a.w!==b.w||a.h!==b.h)throw Error('Screenshot dimensions differ');let n=0;for(let i=0;i<a.rgba.length;i+=4)if(a.rgba[i]!==b.rgba[i]||a.rgba[i+1]!==b.rgba[i+1]||a.rgba[i+2]!==b.rgba[i+2]||a.rgba[i+3]!==b.rgba[i+3])n++;return n;}
replace("const PHASE='core';","const PHASE='profile';");
replace("['full','core','world','neighbors','raster'].includes(PHASE)","['full','core','world','neighbors','raster','profile'].includes(PHASE)");
replace('coverage:{core:false,world:false,neighbors:false,raster:false},diagnosticOnly:PHASE===\'raster\'','coverage:{core:false,world:false,neighbors:false,raster:false,profile:false},diagnosticOnly:true');
replace("const check=(v,m)=>",pngRgba603.toString()+'\n'+pixelDelta603.toString()+"\nconst check=(v,m)=>");
replace("categories:'devtools.timeline,cc,gpu,blink'","categories:'devtools.timeline,cc,gpu,blink,v8,disabled-by-default-skia'");
replace('const traceFrameWork603=async label=>','const traceFrameWork603=async(label,stopProfile)=>');
replace("await sleep(5000);await send('Tracing.end');","await sleep(5000);const stopped=await stopProfile();await send('Tracing.end');");
replace('return {file,uncompressedBytes:Buffer.byteLength(text)};','return {file,uncompressedBytes:Buffer.byteLength(text),dataLossOccurred:done.dataLossOccurred??null,stopped};');
replace('  window.__s603={',`  let focusWatch603=0,focusLost603=false;
  let compositorRunning603=null;
  const compositorState603=()=>{const lists={cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti},rows={};for(const[k,arr]of Object.entries(lists))rows[k]=arr.map(o=>Object.fromEntries(Object.keys(o).sort().filter(k=>o[k]===null||['number','string','boolean'].includes(typeof o[k])).map(k=>[k,o[k]])));const text=JSON.stringify(rows);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return {running,actors:(h>>>0).toString(16),counts:Object.fromEntries(Object.entries(lists).map(([k,v])=>[k,v.length])),visT,trafClock,waterT,waterF};};
  window.__s603={
    profileFocusStart:()=>{focusLost603=false;const f=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())focusLost603=true;focusWatch603=requestAnimationFrame(f);};focusWatch603=requestAnimationFrame(f);return true;},
    profileFocusStop:()=>{cancelAnimationFrame(focusWatch603);return {lost:focusLost603};},
    compositorState:compositorState603,
    compositorUI:()=>({toasts:document.getElementById('toasts').children.length,tweenPending:tweenHudRAF!==null}),
    compositorFreeze:on=>{if(on){if(compositorRunning603===null)compositorRunning603=running;running=false;}else if(compositorRunning603!==null){running=compositorRunning603;compositorRunning603=null;}return compositorState603();},
    compositorFrame:(off,time)=>{if(running)throw Error('Compositor snapshots require a stopped visual update loop');window.__noT603=false;window.__noClip603=off;trafClock=55;waterT=0;waterF=0;__s603.freezeVis(time);GV.forceDraw();return {viewport:__s603.viewport(),cam:{...cam},...compositorState603()};},
    compositorBadClip:on=>{if(!clipReal603)throw Error('Missing native helper');clipFilter603=on?function(g,img,x,y,w,h){const used=clipReal603(g,img,x,y,w,h);if(used){const m=g.getTransform(),a=m.a*x+m.e,b=m.a*(x+w)+m.e,p=new Path2D();p.rect((a+b)/2,0,Math.abs(b-a)/2,g.canvas.height);g.resetTransform();g.clip(p);g.setTransform(m);}return used;}:clipReal603;return true;},`);
const start=source.indexOf("    if(PHASE==='full'||PHASE==='core'){"),endAnchor='    report.coverage.core=true;persist();}',end=source.indexOf(endAnchor,start)+endAnchor.length;
if(start<0||end<start)throw Error('Unique original core section not found');
const profileBlock=`    if(PHASE==='profile'){
      report.acceptanceStatus='blocked: original qualified Mac run37535607860 failed night55FPS and mobile-night relative budget; this diagnostic cannot clear those results';
      report.referenceAcceptanceRun=37535607860;report.runtimeSHA256='${product}';report.profileCases=[];const snapshotOnly=process.argv.includes('--snapshot-only');report.referenceProfileRun=snapshotOnly?37542608418:null;
      const origin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(origin);await ev('document.getElementById("bNewGame").click();true');await growCity('profile-fresh-desktop');
      const originalDay=(await view()).day,focus=report.census[85][0];await camera(focus[0]+1,focus[1]+1,1,0,1,100,false);const canonical=await ev('__s603.scene()');
      for(const item of(snapshotOnly?[]:[{name:'night-original',artOff:true,clipOff:true,time:100},{name:'night-art-only',artOff:false,clipOff:true,time:100},{name:'night-candidate',artOff:false,clipOff:false,time:100}])){
        await ev('window.__noT603='+item.artOff+';window.__noClip603='+item.clipOff+';__s603.clear();true');await camera(focus[0]+1,focus[1]+1,1,0,1,item.time,false);for(let i=0;i<30;i++)await ev('__s603.drawMs()');
        const foregroundBefore=await foregroundState603(true);check(foregroundBefore.valid,'profile foreground before '+item.name);await ev('__s603.profileFocusStart();__s603.perfStart();true');
        await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Profiler.start');const collected=await traceFrameWork603(item.name,async()=>{const cpu=await send('Profiler.stop'),audit=await ev('({work:__s603.perfWork(),focusAudit:__s603.profileFocusStop()})');return {cpu,...audit};});const {stopped:{cpu,work,focusAudit},...trace}=collected;await send('Profiler.disable');const foregroundAfter=await foregroundState603();
        const cpuFile='T603-'+item.name+'-cpu.json.gz';fs.writeFileSync(path.join(OUT,cpuFile),require('zlib').gzipSync(JSON.stringify(cpu.profile)));check(cpu.profile.nodes.length>0&&work.work.draw.calls>0&&!focusAudit.lost&&foregroundAfter.valid,'real foreground game profile collected '+item.name);check(canonical===await ev('__s603.scene()'),'profiling leaves city unchanged '+item.name);
        report.profileCases.push({...item,trace,cpuFile,cpuDurationMs:(cpu.profile.endTime-cpu.profile.startTime)/1000,...work,foregroundBefore,foregroundAfter,focusAudit,instrumented:true,acceptanceTiming:false});persist();
      }
      await ev('window.__noT603=false;delete window.__noClip603;true');report.compositorPairs=[];
      report.compositorFrozen=await ev('__s603.compositorFreeze(true)');check(report.compositorFrozen.running===false,'visual update loop stopped for snapshots, outside live profiling');
      report.compositorTimePolicy='Game update loop stopped; explicit manual real-renderer draws with frozen game clocks and paused CSS; browser time stays live so the native compositor can present every frame; no Canvas getImageData/toDataURL';
      report.compositorUiSettled=await ev('new Promise((resolve,reject)=>{const start=performance.now();function poll(){const state=__s603.compositorUI();if(state.toasts===0&&!state.tweenPending)resolve(state);else if(performance.now()-start>8000)reject(Error("Snapshot UI did not settle "+JSON.stringify(state)));else setTimeout(poll,50);}poll();})');check(report.compositorUiSettled.toasts===0&&!report.compositorUiSettled.tweenPending,'natural toast removal and HUD tween complete before screenshots');
      report.pausedCssAnimations=await ev('(()=>{let n=0;for(const a of document.getAnimations())if(a.playState==="running"){a.pause();n++;}return n;})()');
      const capture=async(name,off,time)=>{const state=await ev('__s603.compositorFrame('+off+','+time+')'),shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),after=await ev('__s603.compositorState()'),bytes=Buffer.from(shot.data,'base64'),file='T603-compositor-'+name+'.png';fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);const pixels=pngRgba603(bytes);check(pixels.w===1400&&pixels.h===900&&state.viewport.dpr===1,'full unchanged compositor viewport '+name);check(state.running===false&&after.running===false&&state.actors===report.compositorFrozen.actors&&after.actors===state.actors&&['visT','trafClock','waterT','waterF'].every(k=>after[k]===state[k]),'listed actor scalars and clocks stationary across compositor capture '+name);return {file,state,after,pixels,sha256:hash(bytes)};};
      for(const [light,time]of[['day',55],['night',100]]){await camera(focus[0]+1,focus[1]+1,1,0,1,time,false);await capture(light+'-warm0',true,time);await capture(light+'-warm1',true,time);const a=await capture(light+'-off-a',true,time),b=await capture(light+'-off-b',true,time),c=await capture(light+'-on-a',false,time),d=await capture(light+'-on-b',false,time);const row={light,baselineUnstable:pixelDelta603(a.pixels,b.pixels),candidateUnstable:pixelDelta603(c.pixels,d.pixels),changedPixels:pixelDelta603(b.pixels,c.pixels),frames:[a,b,c,d].map(({pixels,...v})=>v)};report.compositorPairs.push(row);persist();check(row.baselineUnstable===0&&row.candidateUnstable===0,'stable compositor repeats '+light);}
      await camera(focus[0]+1,focus[1]+1,1,0,1,55,false);await capture('control-warm',false,55);const good=await capture('control-good',false,55);await ev('__s603.compositorBadClip(true)');let bad;try{bad=await capture('control-wrong-edge',false,55);}finally{await ev('__s603.compositorBadClip(false)');}const restored=await capture('control-restored',false,55);report.compositorNegativeControl={wrongEdgePixels:pixelDelta603(good.pixels,bad.pixels),restoredPixels:pixelDelta603(good.pixels,restored.pixels)};check(report.compositorNegativeControl.wrongEdgePixels>0&&report.compositorNegativeControl.restoredPixels===0,'compositor detects actual wrong clip edge and restored control');
      await ev('delete window.__noClip603;GV.setDay('+originalDay+');__s603.compositorFreeze(false);true');report.coverage.profile=true;persist();
    }`;
source=source.slice(0,start)+profileBlock+source.slice(end);
replace("check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '+report.performanceFailures.join('; '));","check(report.referenceAcceptanceRun===37535607860&&report.acceptanceStatus.startsWith('blocked:'),'profiling cannot replace failed release acceptance');");
replace("report.status='passed';exitCode=0;","report.status='diagnostic-collected';exitCode=0;");
new Function('require','__filename','__dirname',source);
if(process.argv.includes('--check-profile'))console.log('T603_PROFILE_SYNTAX_OK '+crypto.createHash('sha256').update(source).digest('hex'));
else new Function('require','__filename','__dirname',source)(require,path.join(__dirname,'scene603.js'),__dirname);
module.exports={pngRgba603,pixelDelta603};
