/* T671 blackhouse: actual T149 draw hook and recorded gradient geometry.
   Software opening masks by default; --native explicitly checks native parity.
   This isolates production call behavior; it is not a complete browser frame. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),{createCanvas,backend}=require('./pixel-contract.cjs');
const src=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const predicate='if(nightDepth>0&&s.night&&(bd.k===5||bd.pw)&&!(bd.k===4&&s.__t601)){';
assert.equal(src.split(predicate).length,2,'original unique T149 predicate preserved');
const start=src.indexOf(predicate),tail=src.indexOf('ctx.restore();',start),end=src.indexOf('}',tail)+1,original=src.slice(start,end);
const guard='if(!(s.__t671&&s.lotMeta574&&s.lotMeta574.variant===0)){';
function run(mutation=false){
 const C={window:{},location:{search:''},Map,Math,Error,season:()=>1,t596On:()=>false,cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
 vm.createContext(C);vm.runInContext(part('function lotLine574(','function lotVariant574(')+part('function makeIso590(','function silhouette590(')+src.match(/function streetHash\([\s\S]*?\n}/)[0]+part('/* T671：第二波','/* T671 END')+';this.api={bake671,variant671};',C);
 const s=C.api.bake671(0,false,1),bd={k:1,lv:1,age:60,pw:true},records=[];
 assert.equal(C.api.variant671(bd,39,3),0,'natural blackhouse selection');assert.equal(s.__t671,1,'actual blackhouse family metadata');assert.equal(s.lotMeta574.variant,0,'actual blackhouse variant metadata');
 const ctx={save(){},restore(){},beginPath(){},fill(){records.push({type:'fill'});},arc(...args){records.push({type:'arc',args});},createRadialGradient(...args){records.push({type:'gradient',args});return {addColorStop(...args){records.push({type:'stop',args});}};}};
 Object.assign(C,{ctx,s,bd,bx:0,by:0,z:1,nightDepth:1});
 vm.runInContext(original,C);const expected=JSON.parse(JSON.stringify(records));
 assert.deepEqual(records.find(r=>r.type==='arc').args,[40,44,44,0,Math.PI*2],'original blackhouse radius44 ground pool reached');
 assert.deepEqual(records.filter(r=>r.type==='stop').map(r=>r.args),[[0,'rgba(255,206,130,0.300)'],[1,'rgba(255,206,130,0)']],'original positive light gradient');
 const mask=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;
 assert.equal(mask[(44*s.w+40)*4+3],0,'pool center outside blackhouse opening mask');
 assert(44+44>s.h&&40+44>s.w,'pool extends beyond entire sprite bounds');
 const outerStart=src.lastIndexOf(guard,start);assert(outerStart>=0,'actual blackhouse-only outer guard present');
 const between=src.slice(outerStart+guard.length,start).replace(/\/\/[^\n]*/g,'');assert.equal(between.trim(),'','outer guard directly wraps original T149 branch');
 const close=src.slice(end).match(/^\s*}/);assert(close,'actual outer guard closes after original branch');
 const actualHook=src.slice(outerStart,end+close[0].length),hook=mutation?actualHook.replace(guard,'if(true){'):actualHook;
 records.length=0;vm.runInContext(hook,C);assert.equal(records.length,0,'blackhouse T149 ground glow excluded');assert.deepEqual(s.night.getContext('2d').getImageData(0,0,s.w,s.h).data,mask,'blackhouse own night pixels untouched');assert(mask.some((v,i)=>i%4===3&&v>0),'blackhouse retains lit opening pixels');
 C.s={...s};delete C.s.__t671;records.length=0;vm.runInContext(hook,C);assert.deepEqual(records,expected,'legacy glow unchanged');
 C.s={...C.s,__t670:1};records.length=0;vm.runInContext(hook,C);assert.deepEqual(records,expected,'T670-marker routing unchanged');
 for(let v=1;v<10;v++){C.s=C.api.bake671(v,false,1);records.length=0;vm.runInContext(original,C);const old=JSON.parse(JSON.stringify(records));assert(old.some(r=>r.type==='arc'),'other T671 original glow exists');records.length=0;vm.runInContext(hook,C);assert.deepEqual(records,old,'other T671 model '+v+' unchanged');}
 C.s={...s,__t601:true};delete C.s.__t671;C.bd={k:4,pw:true};records.length=0;vm.runInContext(hook,C);assert.equal(records.length,0,'original T601 park exclusion preserved');delete C.s.__t601;records.length=0;vm.runInContext(original,C);const oldPark=JSON.parse(JSON.stringify(records));records.length=0;vm.runInContext(hook,C);assert.deepEqual(records,oldPark,'unmarked park original routing unchanged');
 C.bd=bd;C.nightDepth=0;records.length=0;vm.runInContext(hook,C);assert.equal(records.length,0,'original daytime exclusion preserved');
 return {passed:true,position:[39,3],originalArc:[40,44,44,0,Math.PI*2],otherT671ModelsPreserved:9};
}
const report=run();report.backend=backend;report.limit='Recorded actual production T149 gradient geometry with software/native opening masks; not complete-browser acceptance.';
let reason='';try{run(true);}catch(e){reason=e.message;}assert(reason.includes('blackhouse T149 ground glow excluded'),'guard-removal mutant fails at intended assertion');report.negative={mutation:'remove-blackhouse-ground-glow-exclusion',reason:reason.split('\n')[0]};console.log(JSON.stringify(report,null,2));
