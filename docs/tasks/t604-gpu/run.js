// Standalone component experiment using the already qualified native Mac shell.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{createRequire}=require('module');
const {captureBridge604}=require('./capture.js');
const baseDir=path.resolve(__dirname,'../t603-shots'),baseRequire=createRequire(path.join(baseDir,'foreground603.js'));
const original=fs.readFileSync(path.join(baseDir,'foreground603.js'),'utf8'),tail="const compile=new Function('require','__filename','__dirname',source);";
if(original.split(tail).length!==2)throw Error('Native shell boundary drift');
let source=new Function('require','__dirname',original.slice(0,original.indexOf(tail))+'\nreturn source;')(baseRequire,baseDir);
const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('T604 runner anchor drift: '+a.slice(0,100));source=source.replace(a,b);};
replace('}\n// Inverse only approved art changes,','('+captureBridge604.toString()+')();\n}\n// Inverse only approved art changes,');
const moduleText=fs.readFileSync(path.join(__dirname,'ordered-gpu.js'),'utf8');
replace("fs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));","html=html.replace('<head>','<head><script>'+"+JSON.stringify(moduleText)+"+'</script>');\nfs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));");
replace("path.join(OUT,'scene603-summary.json')","path.join(OUT,'gpu604-summary.json')");
const start=source.indexOf('    report.flags=await ev('),end=source.indexOf('    report.finalFlags=await ev(',start);if(start<0||end<=start)throw Error('Experiment boundaries drift');
const experiment=String.raw`
    report.experiment='T604 ordered WebGL2 image-command component prototype';
    report.scope='Recorded original drawImage commands only; vector paths, gradients, text, game updates and HUD are excluded and counted. Not a playable renderer or full-game performance gate. Original 55 FPS requirement remains failed on PR5.';
    report.predeclared={platform:'macos-15',viewport:[1400,900,1],sourceFrames:3,phaseTimes:{day:55,night:100},scopes:['filtered','all-images'],windowMs:3000,orders:['native','gpu','gpu','native','native','gpu','gpu','native'],benefitRatio:1.5,minWinningPairs:3,releaseGatePassed:false};
    report.source={base:'23564a810546e585758236553d1432c3aacb760b',indexSHA256:hash(fs.readFileSync(path.join(ROOT,'index.html'))),swSHA256:hash(fs.readFileSync(path.join(ROOT,'sw.js')))};
    check(report.source.indexSHA256==='99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d','unchanged approved-art source index');
    check(report.source.swSHA256==='79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2','unchanged source SW');
    check(await ev('typeof Gpu604.OrderedGpu604==="function"&&typeof __gpu604.capture==="function"'),'isolated GPU and capture modules loaded');
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22);
    await ev('document.getElementById("bNewGame").click();__s603.grow22()');const roots=await ev('__s603.roots()');
    check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'exact original seed22 956-root city');
    const median=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
    const capturePng=async(label,mode,negative=false)=>{
      await ev('__gpu604.render('+JSON.stringify(mode)+',0,'+negative+');true');
      // Render again in RAF immediately before compositor capture; default GL
      // drawing buffer is not preserved, exactly as it would be in a game.
      await ev('new Promise(r=>requestAnimationFrame(()=>{__gpu604.render('+JSON.stringify(mode)+',0,'+negative+');r(true)}))');
      const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),bytes=Buffer.from(s.data,'base64'),file='T604-'+label+'.png',pixels=pngRgba603(bytes);fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);check(pixels.w===1400&&pixels.h===900,'exact compositor dimensions '+label);return {file,pixels,rgbaSHA256:hash(pixels.rgba)};
    };
    const delta=(a,b)=>{let changed=0,max=0,total=0;for(let i=0;i<a.rgba.length;i+=4){let yes=false;for(let k=0;k<4;k++){const d=Math.abs(a.rgba[i+k]-b.rgba[i+k]);max=Math.max(max,d);total+=d;if(d)yes=true;}if(yes)changed++;}return {changedPixels:changed,maxChannelDelta:max,meanAbsoluteChannelDelta:total/a.rgba.length};};
    report.phases={};
    for(const [phase,time]of Object.entries(report.predeclared.phaseTimes)){
      await ev('__gpu604.reset();true');await camera(22,14,1,0,1,time,false);await ev('__s603.freezeVis(null);true');await sleep(1000);
      const p=report.phases[phase]={capture:[],scopes:{}};report.currentPhase=phase;persist();
      for(let i=0;i<3;i++){
        await ev('__s603.compositorFreeze(true)');p.capture.push(await ev('__gpu604.capture()'));await ev('__s603.compositorFreeze(false)');await sleep(200);
      }
      check(p.capture.every(c=>c.commands>0&&c.reflections===46&&c.shadows===(phase==='night'?230:0)),'actual original reflection/shadow counts '+phase);
      check(p.capture[2].after.clocks.visT>p.capture[0].before.clocks.visT,'source clocks advance between recorded frames '+phase);
      await compositorBegin603();
      try{
        const scene=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}});const sceneFile='T604-'+phase+'-original-game-context.png';fs.writeFileSync(path.join(OUT,sceneFile),Buffer.from(scene.data,'base64'));report.screenshots.push(sceneFile);p.originalGameContext=sceneFile;
        for(const scope of report.predeclared.scopes){
          const s=p.scopes[scope]={setup:await ev('__gpu604.prepare('+JSON.stringify(scope)+')'),windows:[]};report.currentScope=scope;persist();
          check(!/SwiftShader|llvmpipe|Software Renderer/i.test(s.setup.gpu.renderer),'native GPU renderer verified '+phase+'/'+scope);
          // Texture upload and screenshot readback are outside every timed window.
          for(const mode of ['native','gpu'])await ev('__gpu604.measure('+JSON.stringify(mode)+',1500)');
          for(const mode of report.predeclared.orders){
            const foregroundBefore=await foregroundState603(true);check(foregroundBefore.valid,'foreground before '+phase+'/'+scope+'/'+mode);
            const r=await ev('__gpu604.measure('+JSON.stringify(mode)+',3000)'),foregroundAfter=await foregroundState603();
            check(foregroundAfter.valid,'foreground after '+phase+'/'+scope+'/'+mode);r.fps=r.intervals.length/(r.elapsed/1000);r.cpuP95=pct(r.cpu,.95);r.frameP95=pct(r.intervals,.95);r.foregroundBefore=foregroundBefore;r.foregroundAfter=foregroundAfter;s.windows.push(r);persist();
          }
          const pairs=[];for(let i=0;i<s.windows.length;i+=2){const rows=s.windows.slice(i,i+2),a=rows.find(x=>x.mode==='native'),b=rows.find(x=>x.mode==='gpu');pairs.push({fpsRatio:b.fps/a.fps,nativeFPS:a.fps,gpuFPS:b.fps,cpuRatio:b.cpuP95/a.cpuP95,frameP95Ratio:b.frameP95/a.frameP95});}
          s.paired={pairs,medianFPSRatio:median(pairs.map(x=>x.fpsRatio)),winningPairs:pairs.filter(x=>x.fpsRatio>=1.5).length,medianCpuRatio:median(pairs.map(x=>x.cpuRatio))};s.paired.clearComponentBenefit=s.paired.medianFPSRatio>=1.5&&s.paired.winningPairs>=3;
          const a=await capturePng(phase+'-'+scope+'-native-a','native'),b=await capturePng(phase+'-'+scope+'-native-b','native'),g=await capturePng(phase+'-'+scope+'-gpu','gpu'),g2=await capturePng(phase+'-'+scope+'-gpu-repeat','gpu'),bad=await capturePng(phase+'-'+scope+'-gpu-negative','gpu',true),restored=await capturePng(phase+'-'+scope+'-gpu-restored','gpu');
          s.pixels={nativeRepeat:delta(a.pixels,b.pixels),gpuRepeat:delta(g.pixels,g2.pixels),newRenderer:delta(b.pixels,g.pixels),negative:delta(g.pixels,bad.pixels),restored:delta(g.pixels,restored.pixels),files:[a,b,g,g2,bad,restored].map(({file,rgbaSHA256})=>({file,rgbaSHA256}))};persist();
          check(s.pixels.nativeRepeat.changedPixels===0&&s.pixels.gpuRepeat.changedPixels===0,'both backends repeat exactly '+phase+'/'+scope);
          check(s.pixels.negative.changedPixels>0&&s.pixels.restored.changedPixels===0,'real wrong-image-position control detected and restored '+phase+'/'+scope);
          s.lastRender=await ev('__gpu604.render("gpu",0)');s.finalGpu=await ev('__gpu604.info()');persist();
        }
      }finally{await ev('__gpu604.reset()');await compositorEnd603();}
    }
    report.releaseGatePassed=false;report.completeComponentEvidence=true;report.visualApprovalRequired=true;persist();
`;
source=source.slice(0,start)+experiment+source.slice(end);
new Function('require','__filename','__dirname',source);
if(require.main===module){if(process.argv.includes('--check-overlay'))console.log('T604_OVERLAY_SYNTAX_OK '+crypto.createHash('sha256').update(source).digest('hex'));else new Function('require','__filename','__dirname',source)(baseRequire,path.join(baseDir,'scene603.js'),baseDir);}
module.exports={source};
