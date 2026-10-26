/* T717 同頁、同城 AB/BA 交錯 40 輪；保留全部 raw，無慢幀裁除，JS 與強制刷新總耗時分列。 */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {launch717,open717,prepare717}=require('./browser717.cjs');
const [head,out]=process.argv.slice(2);if(!head||!out)throw Error('usage: node perfab.cjs <candidate.html> <out.json>');
const stats=xs=>{const s=[...xs].sort((a,b)=>a-b);return {n:s.length,median:s.length%2?s[Math.floor(s.length/2)]:(s[s.length/2-1]+s[s.length/2])/2,p95:s[Math.ceil(.95*s.length)-1],min:s[0],max:s[s.length-1]};};
(async()=>{let browser,p;fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
 const report={complete:false,collectionStatus:'not-started',performanceVerdict:'not-assessed',conditions:[],warmup:'Four alternating untimed draws per condition; all 80 subsequently measured draws are retained. Native periodic water/cache costs are not filtered.',note:'Cloud headless forced-readback measurement; renderer/GPU unqualified, not native-GPU FPS or active-gameplay evidence. No samples discarded.'};
 const save=()=>fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 save();try{browser=await launch717();report.collectionStatus='collecting';p=await open717(browser,head);report.sourceHash=p.sourceHash;report.city=p.city;report.tileHash=p.tileHash;
 for(const [id,vt,z] of [['day-z1',55,1],['night-z1',5,1],['day-z2',55,2],['night-z2',5,2],['day-z0.6',55,.6],['night-z0.6',5,.6]]){
  await prepare717(p,{vt,z,rot:0});
  const raw=await p.page.evaluate(()=>__ev717(`(function(){const raw=[];for(let w=0;w<4;w++){window.__noT717=!!(w%2);GV.forceDraw();ctx.getImageData(0,0,1,1);}for(let i=0;i<40;i++)for(const off of (i%2?[true,false]:[false,true])){window.__noT717=off;ctx.getImageData(0,0,1,1);const enabled=t717On(),waterBefore=waterF;const t=performance.now();GV.forceDraw();const js=performance.now()-t;ctx.getImageData(0,0,1,1);const total=performance.now()-t;raw.push({round:i,off,enabled,waterBefore,waterAfter:waterF,js,total});}window.__noT717=false;return raw;})()`));
  const row={id,raw,summary:null};report.conditions.push(row);save();
  assert.equal(raw.length,80,'all 40 interleaved pairs retained');assert(raw.every(r=>Number.isFinite(r.js)&&r.js>=0&&Number.isFinite(r.total)&&r.total>=r.js&&r.enabled===!r.off),'finite samples and actual valve state');
  const summary={};for(const [label,off]of [['off',true],['on',false]]){const r=raw.filter(x=>x.off===off);assert.equal(r.length,40,'40 samples per mode');summary[label]={js:stats(r.map(x=>x.js)),total:stats(r.map(x=>x.total))};}
  row.summary=summary;save();console.log(id,JSON.stringify(summary));
 }
 report.errors=p.errors;report.complete=report.conditions.length===6&&p.errors.length===0;report.collectionStatus=report.complete?'collected':'incomplete';save();assert(report.complete,'incomplete performance samples');
 }catch(error){report.collectionStatus='failed';report.failure=error.message;throw error;}finally{if(p)report.errors=p.errors;save();if(p)await p.close();if(browser)await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
