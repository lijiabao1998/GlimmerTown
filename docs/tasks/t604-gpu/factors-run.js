'use strict';
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
let source=require('./atlas-run.js').source;
source=source.replace("path.join(OUT,'gpu604-direct-atlas-summary.json')","path.join(OUT,'gpu604-pixel-factors.json')");
const begin=source.indexOf("    report.experiment='T604 direct native-vector raster into atlas tiles, without source-Canvas copies';"),end=source.indexOf('    report.finalFlags=await ev(',begin);if(begin<0||end<begin)throw Error('Pixel factor boundaries drift');
source=source.slice(0,begin)+String.raw`
    report.experiment='T604 bounded three-stage pixel attribution';report.releaseGatePassed=false;report.performanceSamples=0;report.originalNoGo={head:'f2b081a2c176573f0cc2d0fd68715bcc7bfb68e6',run:37697723273};report.phases={};
    report.stoppingCondition='One fixed captured day/night vector stream. End after R/G/T/W stage attribution, fresh native-raster repeats, backdrop/UV negative controls and state-invariance checks. Any unstable repeat invalidates attribution. No FPS or integration.';
    report.source={index:hash(fs.readFileSync(path.join(ROOT,'index.html'))),sw:hash(fs.readFileSync(path.join(ROOT,'sw.js')))};
    check(report.source.index==='99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d'&&report.source.sw==='79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2','original approved art/runtime/SW bytes unchanged');
    report.blendControl=await ev('__atlas604.conformance()');persist();check(report.blendControl.glError===0&&report.blendControl.cases.every(c=>c.difference.max<=3&&c.repeat.changed===0&&c.restored.changed===0),'independent colored-backdrop blend conformance and exact repeat/restoration');check(report.blendControl.cases.find(c=>c.blend==='multiply').wrongSourceOver.max>20,'known nonblack multiply input detects wrong outer blend');
    await ev('document.getElementById("bNewGame").click();__s603.grow22()');const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22),roots=await ev('__s603.roots()');check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'same original seed22 956-root city');
    for(const[phase,time]of[['day',55],['night',100]]){
      await ev('__gpu604.reset();true');await camera(22,14,1,0,1,time,false);await sleep(500);await compositorBegin603();
      try{
        const p=report.phases[phase]={capture:await ev('__atlas604.capture()')};persist();check(p.capture.supported,'same supported original vector semantics '+phase);p.setup=await ev('__atlas604.prepare()');p.before=await ev('__s603.compositorState()');persist();
        const factors=await ev('__atlas604.factorize()'),assets=factors.assets;delete factors.assets;p.factors=factors;p.after=await ev('__s603.compositorState()');
        for(const[name,uri]of Object.entries(assets)){const file='T604-factors-'+phase+'-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(uri.split(',')[1],'base64'));report.screenshots.push(file);}persist();
        check(JSON.stringify(p.before)===JSON.stringify(p.after),'actors, sky, dust and clocks unchanged across factorization '+phase);check(factors.glError===0,'no GL error '+phase);check(Object.values(factors.nonOpaquePixels).every(n=>n===0),'opaque backdrop invariant in every stage '+phase);
        check(Object.values(factors.repeats).every(d=>d.changedPixels===0),'all four fresh frame repeats and GL restoration exact '+phase);check(Object.values(factors.pageRepeats).flat().every(d=>d.changedPixels===0),'original and translated native atlas pages rerasterize exactly '+phase);check(['wrongNativeLighter','wrongGLLighter','wrongUV'].every(k=>factors.negative[k].changedPixels>0),'visible native/GL wrong lighter and shifted UV controls detected '+phase);
        p.multiplyControl={nativeChanges:factors.negative.wrongNativeMultiply.changedPixels,GLChanges:factors.negative.wrongGLMultiply.changedPixels,sourceTiles:factors.tiles.filter(t=>t.blend==='multiply').map(t=>({index:t.index,alphaPixels:t.alphaPixels,nonBlackPixels:t.nonBlackPixels})),note:'Actual-scene multiply control is retained even when this input makes multiply and source-over equivalent; the independent nonblack checkerboard control is required separately.'};persist();
        // Match raw framebuffer attribution to the actual visible compositor.
        p.compositor={};for(const stage of ['R','G','T','W']){
          await ev('new Promise(r=>requestAnimationFrame(()=>{__atlas604.showFactor('+JSON.stringify(stage)+');r(true)}))');const q=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),bytes=Buffer.from(q.data,'base64'),file='T604-factors-'+phase+'-'+stage+'-compositor.png',pixels=pngRgba603(bytes);fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);p.compositor[stage]={file,rgbaSHA256:hash(pixels.rgba)};persist();check(p.compositor[stage].rgbaSHA256===factors.frameHashes[stage],'actual compositor equals attributed RGBA '+phase+'/'+stage);
        }
        check(JSON.stringify(p.before)===JSON.stringify(await ev('__s603.compositorState()')),'source state remains fixed after screenshots '+phase);persist();
      }finally{await ev('__atlas604.dispose();__gpu604.reset();true');await compositorEnd603();}
    }
    report.completeAttribution=true;persist();
`+source.slice(end);
new Function('require','__filename','__dirname',source);
if(require.main===module){if(process.argv.includes('--check-overlay'))console.log('T604_PIXEL_FACTORS_SYNTAX_OK');else{const dir=path.resolve(__dirname,'../t603-shots');new Function('require','__filename','__dirname',source)(createRequire(path.join(dir,'scene603.js')),path.join(dir,'scene603.js'),dir);}}
module.exports={source};
