/* T717 全幀 A/A、main/閥關、main/閥開：3時相×4縮放×4視角。每張差異數與最大色階全保留。 */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {launch717,open717,shot717,hash}=require('./browser717.cjs');
const {pngRgba603}=require('../t603-shots/native603.js');
const [base,head,out]=process.argv.slice(2);if(!base||!head||!out)throw Error('usage: node eq.cjs <immutable-main.html> <candidate.html> <out>');
function delta(a,b){assert.equal(a.w,b.w);assert.equal(a.h,b.h);let pixels=0,maxColor=0;for(let i=0;i<a.rgba.length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(a.rgba[i+j]-b.rgba[i+j]);if(d)changed=true;maxColor=Math.max(maxColor,d);}if(changed)pixels++;}return {pixels,maxColor,total:a.w*a.h};}
(async()=>{
 fs.mkdirSync(out,{recursive:true});let browser;const pages=[];
 const report={passed:false,source:{},city:{},conditions:[],errors:[],limit:'This cloud Chromium evidence is not macOS native-GPU evidence.'};
 const save=()=>fs.writeFileSync(path.join(out,'eq.json'),JSON.stringify(report,null,2)+'\n');
 save();try{
  browser=await launch717();const A=await open717(browser,base);pages.push(A);const AA=await open717(browser,base,false,A.stars);pages.push(AA);const B=await open717(browser,head,false,A.stars);pages.push(B);const OFF=await open717(browser,head,true,A.stars);pages.push(OFF);
  report.source={base:A.sourceHash,head:B.sourceHash};report.city=A.city;report.tileHash=A.tileHash;for(const p of pages){assert.deepEqual(p.stars,A.stars,'same sky inputs');assert.deepEqual(p.city,A.city,'same AI-grown city statistics');assert.equal(p.tileHash,A.tileHash,'same complete AI-grown tile data');}
  for(const [phase,vt] of [['day',55],['night',5],['dusk',80]])for(const z of [.6,1,2,3])for(const rot of [0,1,2,3]){
   const c={phase,vt,z,rot},id=`v${vt}-z${z}-r${rot}`,images=[];
   for(const [label,p] of [['main',A],['main-repeat',AA],['on',B],['off',OFF]]){
    const bytes=await shot717(p,c);fs.writeFileSync(path.join(out,id+'-'+label+'.png'),bytes);images.push(pngRgba603(bytes));
   }
   const aa=delta(images[0],images[1]),off=delta(images[0],images[3]),on=delta(images[0],images[2]);
   const row={id,...c,aa,off,on,passed:aa.pixels===0&&off.pixels===0&&on.pixels<=on.total/10000};report.conditions.push(row);save();console.log(JSON.stringify(row));
  }
  report.errors=pages.flatMap(p=>p.errors);report.passed=report.conditions.length===48&&report.conditions.every(x=>x.passed)&&report.errors.length===0;save();
  assert(report.passed,'T717 image predicates failed; all raw images and per-condition differences retained');
 }catch(error){report.failure=error.message;throw error;}finally{report.errors=pages.flatMap(p=>p.errors);save();for(const p of pages)await p.close();if(browser)await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
