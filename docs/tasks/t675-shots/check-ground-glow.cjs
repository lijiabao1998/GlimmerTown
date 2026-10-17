/* T675 kiln-only ground-pool applicability. Original production hook replay, not Chrome. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),src=fs.readFileSync(path.join(root,'index.html'),'utf8');
const contract=fs.readFileSync(path.join(__dirname,'candidate-contract.cjs'),'utf8').split('// Design specification')[0];
if(!process.argv.includes('--native'))process.argv.push('--software');
const C=new Function('require','__dirname',contract+'\nreturn ctx;')(require,__dirname);
const guard='if(!(s.__t675&&s.lotMeta574&&(s.lotMeta574.variant===2||s.lotMeta574.variant===9))){',start=src.indexOf(guard),end=src.indexOf('// T675 窯口地面光池適用性',start);assert(start>=0&&end>start,'exact source guard present');const hook=src.slice(start,end);
const predicate='if(nightDepth>0&&s.night&&(bd.k===5||bd.pw)&&!(bd.k===4&&s.__t601)){',p=src.indexOf(predicate,start),tail=src.indexOf('ctx.restore();',p),original=src.slice(p,src.indexOf('}',tail)+1);assert.equal(src.split(predicate).length,2,'original unique predicate retained');
const records=[],ctx={save(){},restore(){},beginPath(){},fill(){},arc(...a){records.push(a);},createRadialGradient(){return {addColorStop(){}};}};
Object.assign(C,{ctx,bd:{k:3,lv:2,pw:true},bx:0,by:0,z:1,nightDepth:1});
const pixels=s=>s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;
function run(code){for(let i=0;i<10;i++){C.s=C.bake(i,false,1);const before=pixels(C.s);assert(before.some((v,k)=>k%4===3&&v>0),'night opening retained');records.length=0;vm.runInContext(original,C);const old=records.map(a=>a.slice());assert.equal(old.length,1,'old powered radius44 pool');assert.equal(old[0][2],44);records.length=0;vm.runInContext(code,C);if(i===2||i===9)assert.equal(records.length,0,'kiln-pool excluded');else assert.deepEqual(records,old,'other eight models retain original pool');assert.deepEqual(pixels(C.s),before,'night mask unchanged');}
 C.s=C.bake(2,false,1);delete C.s.__t675;records.length=0;vm.runInContext(code,C);assert.equal(records.length,1,'legacy retains pool');C.s.__t670=1;records.length=0;vm.runInContext(code,C);assert.equal(records.length,1,'T670 retains pool');C.s.__t671=1;C.s.lotMeta574.variant=0;records.length=0;vm.runInContext(code,C);assert.equal(records.length,0,'T671 blackhouse remains excluded');delete C.s.__t671;C.nightDepth=0;records.length=0;vm.runInContext(code,C);assert.equal(records.length,0,'day remains zero');C.nightDepth=1;}
run(hook);let reason='';try{run(hook.replace(guard,'if(true){'));}catch(e){reason=e.message;}assert(reason.includes('kiln-pool excluded'),'negative fails at intended assertion');
console.log(JSON.stringify({passed:true,models:10,excluded:[2,9],negativeControls:1,scope:'actual source pool geometry and unchanged night masks; not complete Chrome frame'}));
