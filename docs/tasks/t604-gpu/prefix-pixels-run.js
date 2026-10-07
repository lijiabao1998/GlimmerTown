'use strict';
const path = require('path'), { createRequire } = require('module');
let source = require('./prefix-run.js').source;
source = source.replace("path.join(OUT,'gpu604-native-prefix.json')", "path.join(OUT,'gpu604-prefix-surfaces.json')");
source = source.replace("report.experiment='T604 original-coordinate opaque pre-image prefix';", "report.experiment='T604 opaque prefix and fresh-surface pixel identity; zero FPS samples';");
source = source.replace("report.stoppingCondition='Per phase: exact original prefix before the first ground-cache image, repeat/opacity/order controls, same-pixel GL equality and at least 75% reduction of total changed pixels must hold before one ABBA component-cost pass. Otherwise collect pixel evidence and skip that phase timing. No integration or release.';", "report.stoppingCondition='Retain the failed 3cdfb2c surface identity guard. Collect both day/night prefix proof, then fixed 1/32 draw source-surface conditions and an independent 32-draw repeat. No FPS samples or timing windows. Stop after actual compositor and identical-source Canvas/GL attribution.';");
const originalLine = "const original=await ev('__atlas604.factorize()');delete original.assets;p.originalFactors=original;persist();";
if (source.split(originalLine).length !== 2) throw Error('Original atlas image evidence anchor drift');
source = source.replace(originalLine, "const original=await ev('__atlas604.factorize()');for(const[name,uri]of Object.entries(original.assets)){const file='T604-prefix-'+phase+'-old-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(uri.split(',')[1],'base64'));report.screenshots.push(file);}delete original.assets;p.originalFactors=original;persist();");
const begin = source.indexOf('        if(!p.pixels.correctnessGo)');
const end = source.indexOf('      }finally', begin);
if (begin < 0 || end < begin) throw Error('Conditional timing block drift');
source = source.slice(0, begin) + String.raw`
        p.surfaceProbes={};
        for(const[label,mode,draws]of[['atlas1','atlas',1],['atlas32','atlas',32],['prefix1','prefix',1],['prefix32','prefix',32],['prefix32repeat','prefix',32]]){
          const q=await ev('__prefix604.probeFresh('+JSON.stringify(mode)+','+draws+')'),assets=q.assets;delete q.assets;p.surfaceProbes[label]=q;
          for(const[name,uri]of Object.entries(assets)){const file='T604-prefix-'+phase+'-'+label+'-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(uri.split(',')[1],'base64'));report.screenshots.push(file);}persist();
          // The last RAF painted the GL surface. Read the actual compositor,
          // without another source redraw that could hide a frame transition.
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),png=Buffer.from(shot.data,'base64'),file='T604-prefix-'+phase+'-'+label+'-compositor.png',pixels=pngRgba603(png);fs.writeFileSync(path.join(OUT,file),png);report.screenshots.push(file);q.compositor={file,rgbaSHA256:hash(pixels.rgba)};persist();
          check(q.compositor.rgbaSHA256===q.rgbaSHA256,'fresh source actual compositor equals attributed frame '+phase+'/'+label);
          check(q.glError===0,'no fresh-source GL errors '+phase+'/'+label);
        }
        const probes=Object.values(p.surfaceProbes);p.proofPixelIdentityPassed=probes.every(q=>q.previousProofDifference.changedPixels===0);
        p.sameSourceAssemblyPassed=probes.every(q=>q.actualSameSourceCanvasVsGL.changedPixels===0);
        p.nativePrefixPassed=probes.filter(q=>q.mode==='prefix').every(q=>q.originalPrefixDifference.changedPixels===0);
        p.independentWarmRepeatPassed=p.surfaceProbes.prefix32.rgbaSHA256===p.surfaceProbes.prefix32repeat.rgbaSHA256;
        p.timingReady=p.proofPixelIdentityPassed&&p.sameSourceAssemblyPassed&&p.nativePrefixPassed&&p.independentWarmRepeatPassed;
        p.afterProbes=await ev('__s603.compositorState()');persist();check(JSON.stringify(p.before)===JSON.stringify(p.afterProbes),'original source state remains fixed through all fresh-surface conditions '+phase);
` + source.slice(end);
source = source.replace("report.costGo=Object.values(report.phases).every(p=>p.costGo===true);", "report.costGo=false;report.timingReady=Object.values(report.phases).every(p=>p.timingReady);report.failedPriorRun=37703549966;report.noPerformanceResample=true;");
new Function('require', '__filename', '__dirname', source);
if (require.main === module) {
  if (process.argv.includes('--check-overlay')) console.log('T604_PREFIX_SURFACES_SYNTAX_OK');
  else {
    const dir = path.resolve(__dirname, '../t603-shots');
    new Function('require', '__filename', '__dirname', source)(createRequire(path.join(dir, 'scene603.js')), path.join(dir, 'scene603.js'), dir);
  }
}
module.exports = { source };
