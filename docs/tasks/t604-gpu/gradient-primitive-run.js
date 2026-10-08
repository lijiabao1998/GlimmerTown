'use strict';
const path=require('path'),{createRequire}=require('module'),{gradientPrimitive604}=require('./gradient-primitive.js');
let source=require('./atlas-run.js').source;
const marker='}\n// Inverse only approved art changes,';
if(source.split(marker).length!==2)throw Error('Gradient bridge anchor drift');
source=source.replace(marker,'('+gradientPrimitive604.toString()+')(ctx,cvs);\n'+marker);
source=source.replace("path.join(OUT,'gpu604-direct-atlas-summary.json')","path.join(OUT,'gpu604-gradient-primitive.json')");
const begin=source.indexOf("    report.experiment='T604 direct native-vector raster into atlas tiles, without source-Canvas copies';"),end=source.indexOf('    report.finalFlags=await ev(',begin);
if(begin<0||end<begin)throw Error('Gradient experiment boundary drift');
source=source.slice(0,begin)+String.raw`
    report.experiment='T604 direct ordered GPU radial-gradient semantics';report.releaseGatePassed=false;report.performanceSamples=0;
    report.predeclared={phase:'night',viewport:[1400,900,1],selectedFieldsMax:12,variants:['float-no-dither','float-dither','half-dither'],pixelTolerance:0,wholeFrame:false,stoppingCondition:'Capture once; compare original-coordinate radial fields, eligible exact native circles and ordered interleaving controls. Keep every variant difference. No epsilon search, timing windows or renderer integration.'};
    report.engineSource={chromium:'152.0.7977.83',skia:'0873ec164a06966b90ae0d43ef783cfb180084ae',paths:['src/gpu/DitherUtils.cpp','src/sksl/sksl_graphite_frag.sksl','src/shaders/gradients/SkRadialGradient.cpp','third_party/blink/renderer/modules/canvas/canvas2d/canvas_gradient.cc']};
    report.source={index:hash(fs.readFileSync(path.join(ROOT,'index.html'))),sw:hash(fs.readFileSync(path.join(ROOT,'sw.js')))};
    check(report.source.index==='99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d'&&report.source.sw==='79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2','original game and SW bytes');
    check(report.browserVersion.product==='Chrome/152.0.7977.83','browser matches inspected gradient implementation revision');
    await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22),roots=await ev('__s603.roots()');
    check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'exact original seed22 roots');
    await camera(22,14,1,0,1,100,false);await sleep(500);await compositorBegin603();
    try{
      report.capture=await ev('__gradient604.capture()');report.before=await ev('__s603.compositorState()');persist();
      check(report.capture.captured.supported&&report.capture.eligiblePaints>0&&report.capture.exactCirclePaints>0,'captured supported original radial gradients and native circle paths');
      report.setup=await ev('__gradient604.setup()');report.proof=await ev('__gradient604.prove()');report.after=await ev('__s603.compositorState()');
      for(const[key,label]of[['sequence','field'],['circleSequence','nightlight']]){const assets=report.proof[key].images;delete report.proof[key].images;for(const[name,uri]of Object.entries(assets)){const file='T604-gradient-'+label+'-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(uri.split(',')[1],'base64'));report.screenshots.push(file);}}persist();
      check(JSON.stringify(report.before)===JSON.stringify(report.after),'actors, clocks, sky, dust and source state unchanged');
      check(report.proof.glError===0,'no direct-gradient GL errors');
      const all=[report.proof.sequence,report.proof.circleSequence,...report.proof.cases.flatMap(c=>[c.field,...(c.circle?[c.circle]:[])])];
      check(all.every(c=>c.nativeRepeat.changedPixels===0&&c.nativeParsedInput.changedPixels===0&&c.variants.every(v=>v.repeat.changedPixels===0)),'native repeats, parsed byte alpha inputs and all direct-gradient variants repeat exactly');
      check(report.proof.negative.wrongOrderNative.changedPixels>0&&report.proof.negative.wrongOrderGL.changedPixels>0&&report.proof.negative.wrongRadius.changedPixels>0&&report.proof.negative.restored.changedPixels===0,'original order and radial geometry negatives detect real errors with exact restoration');
      check(report.proof.negative.wrongRawAlpha.changedPixels>0,'raw CSS alpha without native byte conversion is detected');
      report.compositor={};for(const[mode,variant,label]of[['native',0,'native'],['gpu',0,'float-no-dither'],['gpu',1,'float-dither'],['gpu',2,'half-dither']]){
        await ev('new Promise(r=>requestAnimationFrame(()=>{__gradient604.show('+JSON.stringify(mode)+','+variant+');r(true)}))');
        const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),png=Buffer.from(shot.data,'base64'),file='T604-gradient-'+label+'-compositor.png',pixels=pngRgba603(png);fs.writeFileSync(path.join(OUT,file),png);report.screenshots.push(file);report.compositor[label]={file,rgbaSHA256:hash(pixels.rgba)};persist();
        check(report.compositor[label].rgbaSHA256===(mode==='native'?report.proof.circleSequence.nativeRGBA:report.proof.circleSequence.variants[variant].rgbaSHA256),'actual compositor matches original nightlight circle sequence '+label);
      }
      check(JSON.stringify(report.before)===JSON.stringify(await ev('__s603.compositorState()')),'source state unchanged after visible evidence');
      report.exactGo=report.proof.exactGo;report.completePrimitiveProof=true;report.scope='Captured gradient-field and eligible circle-paint component only. Original sprite commands, HUD and simulation are excluded. The original 55 FPS and image requirements remain unchanged.';persist();
    }finally{await ev('__gradient604.dispose();__gpu604.reset();true');await compositorEnd603();}
`+source.slice(end);
new Function('require','__filename','__dirname',source);
if(require.main===module){if(process.argv.includes('--check-overlay'))console.log('T604_GRADIENT_PRIMITIVE_SYNTAX_OK');else{const dir=path.resolve(__dirname,'../t603-shots');new Function('require','__filename','__dirname',source)(createRequire(path.join(dir,'scene603.js')),path.join(dir,'scene603.js'),dir);}}
module.exports={source};
