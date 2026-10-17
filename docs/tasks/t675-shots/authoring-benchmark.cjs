/* Authoring-only A/B. Runtime cold/warm acceptance remains separate. */
'use strict';
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks');
const contract=fs.readFileSync(path.join(__dirname,'candidate-contract.cjs'),'utf8').split('// Design specification')[0];
const candidate=new Function('require','__dirname',contract+'\nreturn ctx;')(require,__dirname);
const comparison=fs.readFileSync(path.join(__dirname,'compare-existing.cjs'),'utf8').split('const cases=')[0];
const base=new Function('require','__dirname',comparison+'\nreturn api;')(require,__dirname);
const time=f=>{const a=performance.now();f();return performance.now()-a;};
const stats=a=>{const b=[...a].sort((x,y)=>x-y);return {n:b.length,medianMs:b[Math.floor(b.length*.5)],p90Ms:b[Math.ceil(b.length*.9)-1]};};
for(let n=0;n<20;n++){candidate.bake(n%10,false,1);base.bake(3,n%10,1,2,1,2,false,1);}
const rows=[];for(let model=0;model<10;model++){const old=[],fresh=[];for(let n=0;n<30;n++){const A=()=>old.push(time(()=>base.bake(3,model,1,2,1,2,false,1))),B=()=>fresh.push(time(()=>candidate.bake(model,false,1)));if(n%2){B();A();}else{A();B();}}rows.push({model,baseline:stats(old),candidate:stats(fresh)});}
console.log(JSON.stringify({scope:'isolated native Canvas cold bake only, not Chrome/native or runtime hot-cache acceptance',samplesPerModel:30,order:'alternating A/B and B/A after 20 warm-up pairs',rows},null,2));
