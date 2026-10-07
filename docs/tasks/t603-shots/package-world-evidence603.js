// Collect the existing strict world result without uploading every matrix PNG.
// This runs after acceptance and cannot alter its status or pixel thresholds.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {pngRgba603,pixelDelta603}=require('./native603.js');
const arg=(name,fallback)=>{const s=process.argv.find(x=>x.startsWith('--'+name+'='));return s?s.slice(name.length+3):fallback;};
const source=path.resolve(arg('source','evidence/chrome')),out=path.resolve(arg('out','evidence/world-review'));
fs.mkdirSync(out,{recursive:true});
const summaryPath=path.join(source,'scene603-summary.json');
if(!fs.existsSync(summaryPath))throw Error('World result is absent; no acceptance claim can be collected');
const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));
fs.copyFileSync(summaryPath,path.join(out,'scene603-summary.json'));
const evidence={status:summary.status,error:summary.error||null,checks:summary.checks.length,screenshots:summary.screenshots.length,groups:{},failures:[]};
function copy(name){
  if(typeof name!=='string'||path.basename(name)!==name)throw Error('Invalid evidence filename');
  const bytes=fs.readFileSync(path.join(source,name));fs.writeFileSync(path.join(out,name),bytes);
  return {file:name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
for(const group of ['matrix','nativeZoomMatrix','nativeMobileMatrix','nativeMobileAligned']){
  const rows=summary[group]||[];
  evidence.groups[group]={rows:rows.length,legacyZero:rows.filter(r=>r.legacy&&r.legacy.changedPixels===0).length,artCaptured:rows.filter(r=>r.art).length};
  for(const row of rows){
    if(!row.legacy||row.legacy.changedPixels===0)continue;
    const reference=copy(row.legacy.referenceFile),actual=copy(row.legacy.failureFile);
    const a=pngRgba603(fs.readFileSync(path.join(out,reference.file))),b=pngRgba603(fs.readFileSync(path.join(out,actual.file)));
    const changedPixels=pixelDelta603(a,b);if(changedPixels!==row.legacy.changedPixels)throw Error('Stored failure count disagrees with full decoded pixels');
    let minX=a.w,minY=a.h,maxX=-1,maxY=-1,maxChannelDelta=0;const perY={},perDelta={};
    for(let i=0;i<a.rgba.length;i+=4){
      let d=0;for(let c=0;c<4;c++)d=Math.max(d,Math.abs(a.rgba[i+c]-b.rgba[i+c]));if(!d)continue;
      const x=(i/4)%a.w,y=Math.floor(i/4/a.w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);maxChannelDelta=Math.max(maxChannelDelta,d);perY[y]=(perY[y]||0)+1;perDelta[d]=(perDelta[d]||0)+1;
    }
    evidence.failures.push({key:row.key,group,changedPixels,width:a.w,height:a.h,bounds:{minX,minY,maxX,maxY},maxChannelDelta,perY,perDelta,reference,actual,referenceState:summary.nativeWorldBaseline[row.key].state,actualState:row.legacy.state});
  }
}
if(summary.nativeFxPositiveControl){
  const row=summary.nativeFxPositiveControl;copy(row.referenceFile);copy(row.actual.file);evidence.fxPositiveControl=row;
}
for(const key of ['nativeSkyNegativeControl','nativeFxNegativeControl','nativeNegativeControl']){
  const row=summary[key];if(!row)continue;
  for(const value of Object.values(row))if(value&&typeof value==='object'&&typeof value.file==='string')copy(value.file);
}
if(summary.failureScreenshot&&fs.existsSync(path.join(source,summary.failureScreenshot)))copy(summary.failureScreenshot);
fs.writeFileSync(path.join(out,'world-review.json'),JSON.stringify(evidence,null,2));
console.log('WORLD_REVIEW '+JSON.stringify(evidence));
