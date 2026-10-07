'use strict';
const path = require('path'), { createRequire } = require('module');
const { nativePrefixBridge604 } = require('./prefix.js');
let source = require('./atlas-run.js').source;
const marker = '}\n// Inverse only approved art changes,';
if (source.split(marker).length !== 2) throw Error('Native prefix bridge anchor drift');
source = source.replace(marker, '(' + nativePrefixBridge604.toString() + ')(ctx,cvs,()=>groundCache);\n' + marker);
source = source.replace("path.join(OUT,'gpu604-direct-atlas-summary.json')", "path.join(OUT,'gpu604-native-prefix.json')");
const begin = source.indexOf("    report.experiment='T604 direct native-vector raster into atlas tiles, without source-Canvas copies';");
const end = source.indexOf('    report.finalFlags=await ev(', begin);
if (begin < 0 || end < begin) throw Error('Native prefix experiment boundary drift');
source = source.slice(0, begin) + String.raw`
    report.experiment='T604 original-coordinate opaque pre-image prefix';
    report.releaseGatePassed=false;report.performanceSamples=0;report.phases={};
    report.originalNoGo={head:'f2b081a2c176573f0cc2d0fd68715bcc7bfb68e6',run:37697723273};
    report.predeclared={viewport:[1400,900,1],prefixExtraBytes:5040000,maxTotalTextureBytes:128*1024*1024,unchangedAtlasPacking:true,prefixPixelTolerance:0,samePixelGLTolerance:0,maxRemainingErrorFraction:.25,orders:['atlas','prefix','prefix','atlas'],windowMs:3000,minimumComponentFPS:55,maxMedianCPUms:8};
    report.stoppingCondition='Per phase: exact original prefix before the first ground-cache image, repeat/opacity/order controls, same-pixel GL equality and at least 75% reduction of total changed pixels must hold before one ABBA component-cost pass. Otherwise collect pixel evidence and skip that phase timing. No integration or release.';
    report.source={componentBase:'23564a810546e585758236553d1432c3aacb760b',index:hash(fs.readFileSync(path.join(ROOT,'index.html'))),sw:hash(fs.readFileSync(path.join(ROOT,'sw.js')))};
    check(report.source.index==='99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d'&&report.source.sw==='79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2','exact original product bytes');
    await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22),roots=await ev('__s603.roots()');
    check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'original seed22 city');
    const median=a=>{a=[...a].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
    const take=async(phase,stage)=>{await ev('new Promise(r=>requestAnimationFrame(()=>{__prefix604.show('+JSON.stringify(stage)+');r(true)}))');const q=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),bytes=Buffer.from(q.data,'base64'),file='T604-prefix-'+phase+'-'+stage+'.png',pixels=pngRgba603(bytes);fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);return {file,rgbaSHA256:hash(pixels.rgba)};};
    for(const[phase,time]of[['day',55],['night',100]]){
      await ev('__gpu604.reset();true');await camera(22,14,1,0,1,time,false);await sleep(500);await compositorBegin603();
      try{
        const p=report.phases[phase]={capture:await ev('__prefix604.capture()'),windows:[]};persist();
        check(p.capture.supported&&!p.capture.semantics.clips,'original supported vectors without source clips '+phase);
        check(p.capture.prefixBoundary.firstImageIsGroundCache&&p.capture.prefixBoundary.imageCallsBeforeBoundary===0,'prefix ends before first original ground-cache image '+phase);
        p.setup=await ev('__prefix604.prepare()');p.before=await ev('__s603.compositorState()');persist();
        check(p.setup.prefix.extraTextureBytes===5040000&&p.setup.prefix.totalTextureBytes<=128*1024*1024&&p.setup.prefix.additionalClipCalls===0,'explicit additional 4.81 MiB and no prefix clip '+phase);
        const original=await ev('__atlas604.factorize()');delete original.assets;p.originalFactors=original;persist();
        p.pixels=await ev('__prefix604.validate('+JSON.stringify({stages:original.stages})+')');p.after=await ev('__s603.compositorState()');persist();
        check(JSON.stringify(p.before)===JSON.stringify(p.after),'source actors, clocks, sky and dust unchanged '+phase);
        p.compositor={};for(const stage of ['prefix','R','G','T','W']){p.compositor[stage]=await take(phase,stage);persist();check(p.compositor[stage].rgbaSHA256===p.pixels.frameHashes[stage],'actual compositor equals native-prefix attributed pixels '+phase+'/'+stage);}
        check(JSON.stringify(p.before)===JSON.stringify(await ev('__s603.compositorState()')),'source unchanged after evidence '+phase);
        if(!p.pixels.correctnessGo){p.timingSkipped='Prefix identity, controlled assembly or major error-reduction condition failed';persist();continue;}
        check(p.pixels.prefixComparison.originalBeforeFirstImage.changedPixels===0&&p.pixels.prefixComparison.GLUpload.changedPixels===0,'exact native source prefix and one-upload output before timing '+phase);
        // Fresh surfaces remove pixel-readback and proof texture allocation from
        // the paired timing. Original packing and captured commands stay fixed.
        p.timingSetup=await ev('__prefix604.prepare()');persist();
        for(const mode of ['atlas','prefix'])await ev('__prefix604.measure('+JSON.stringify(mode)+',1000)');
        for(const mode of report.predeclared.orders){
          check((await foregroundState603(true)).valid,'foreground before prefix cost '+phase+'/'+mode);
          const w=await ev('__prefix604.measure('+JSON.stringify(mode)+',3000)');
          w.fps=w.intervals.length/(w.elapsed/1000);w.cpuMedian=median(w.rows.map(r=>r.totalMs));w.cpuP95=pct(w.rows.map(r=>r.totalMs),.95);
          for(const field of ['rasterMs','uploadMs','drawMs','prefixRasterMs','remainingRasterMs','prefixUploadMs','atlasUploadMs'])if(w.rows.every(r=>Number.isFinite(r[field])))w[field+'Median']=median(w.rows.map(r=>r[field]));
          p.windows.push(w);report.performanceSamples++;persist();check((await foregroundState603()).valid,'foreground after prefix cost '+phase+'/'+mode);
        }
        const ws=p.windows.filter(w=>w.mode==='prefix');p.costGo=ws.every(w=>w.fps>=55)&&median(ws.map(w=>w.cpuMedian))<=8;
        p.timedSurfaceCompositor={};for(const mode of ['atlas','prefix']){
          await ev('new Promise(r=>requestAnimationFrame(()=>{__prefix604.renderMode('+JSON.stringify(mode)+');r(true)}))');
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),png=Buffer.from(shot.data,'base64'),file='T604-prefix-'+phase+'-timed-'+mode+'.png',pixels=pngRgba603(png);fs.writeFileSync(path.join(OUT,file),png);report.screenshots.push(file);p.timedSurfaceCompositor[mode]={file,rgbaSHA256:hash(pixels.rgba)};persist();
          check(p.timedSurfaceCompositor[mode].rgbaSHA256===(mode==='atlas'?original.frameHashes.W:p.pixels.frameHashes.W),'fresh timing surfaces preserve proved component output '+phase+'/'+mode);
        }
        p.gpu=await ev('__atlas604.info()');p.afterTiming=await ev('__s603.compositorState()');persist();
        check(JSON.stringify(p.before)===JSON.stringify(p.afterTiming),'no source state changes in component timing '+phase);
      }finally{await ev('__atlas604.dispose();__gpu604.reset();true');await compositorEnd603();}
    }
    report.correctnessGo=Object.values(report.phases).every(p=>p.pixels.correctnessGo);
    report.costGo=Object.values(report.phases).every(p=>p.costGo===true);
    report.pixelGatePassed=Object.values(report.phases).every(p=>p.pixels.pixelGatePassed);
    report.completePrefixEvidence=true;report.scope='Vector component only. No image commands, HUD, simulation or full-game FPS. Original 55 FPS and product pixel requirements remain.';persist();
` + source.slice(end);
new Function('require', '__filename', '__dirname', source);
if (require.main === module) {
  if (process.argv.includes('--check-overlay')) console.log('T604_NATIVE_PREFIX_SYNTAX_OK');
  else {
    const dir = path.resolve(__dirname, '../t603-shots');
    new Function('require', '__filename', '__dirname', source)(createRequire(path.join(dir, 'scene603.js')), path.join(dir, 'scene603.js'), dir);
  }
}
module.exports = { source };
