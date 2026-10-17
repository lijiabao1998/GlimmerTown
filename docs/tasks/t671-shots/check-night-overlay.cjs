/* T671：真選款座標與真細節判定重放；不改既有夜燈函式。 */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),{createCanvas,backend}=require('./pixel-contract.cjs');
const src=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const hook=(src.match(/if\(!s\.__t671\)\{\s*if\(!s\.__t590\)drawNightMicro431\(ctx,o,bd,s,bx,by,z,drawA,nightDepth\);[^}]*\}/)||[])[0];
assert(hook,'actual night overlay hook present');
function run(mutation=false){
 const C={window:{},location:{search:''},Map,Math,Error,season:()=>1,t596On:()=>false,visT:0,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),kcatOf:()=> 'R',cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
 vm.createContext(C);vm.runInContext(part('function lotLine574(','function lotVariant574(')+part('function makeIso590(','function silhouette590(')+src.match(/function streetHash\([\s\S]*?\n}/)[0]+part('function detailAlpha432(','function streetPermit432(')+src.match(/function drawNightMicro431\([\s\S]*?\n}/)[0]+part('/* T671：第二波','/* T671 END')+';this.api={bake671,variant671,detailPermit432,drawNightMicro431};',C);
 const A=C.api,s=A.bake671(0,false,1),bd={k:1,lv:1,age:30,pw:true},o={x:39,y:3},calls=[];
 assert.equal(A.variant671(bd,o.x,o.y),0,'natural blackhouse selection');assert(A.detailPermit432(o.x,o.y,431,1,.42),'fixture exercises actual detail permit');
 const ctx={save(){},restore(){},fillRect(...a){calls.push(a)}};
 A.drawNightMicro431(ctx,o,bd,s,0,0,1,1,1);assert.equal(calls.length,3,'positive legacy overlay reached');
 const mask=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;
 assert(calls.every(([x,y])=>mask[(y*s.w+x)*4+3]===0),'legacy lights fall outside blackhouse openings');
 Object.assign(C,{ctx,o,bd,s,bx:0,by:0,z:1,drawA:1,nightDepth:1});calls.length=0;
 vm.runInContext(mutation?hook.replace('if(!s.__t671)','if(true)'):hook,C);
 assert.equal(calls.length,0,'T671 generic lights excluded');
 C.s={...s};delete C.s.__t671;calls.length=0;vm.runInContext(hook,C);assert.equal(calls.length,3,'unmarked legacy sprites retain overlay');
 C.s={...C.s,__t670:1};calls.length=0;vm.runInContext(hook,C);assert.equal(calls.length,3,'T670 route unchanged');
 return {passed:true,position:[39,3],legacyLightRects:3};
}
const report=run();report.backend=backend;report.limit="Actual source hooks with software-mask replay by default; --native is explicit parity mode. Not full-browser acceptance.";let reason='';try{run(true);}catch(e){reason=e.message;}assert(reason.includes('T671 generic lights excluded'),'negative control fails at target');report.negative={mutation:'remove-t671-exclusion',reason:reason.split('\n')[0]};console.log(JSON.stringify(report,null,2));
