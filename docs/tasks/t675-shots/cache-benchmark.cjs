/* Isolated actual selector hot-cache A/B; not browser/native timing. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{performance}=require('perf_hooks');
const root=path.resolve(__dirname,'../../..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'('),body=html.indexOf('{',start);assert(start>=0,name);let d=1,i=body+1;for(;d;i++){if(html[i]==='{')d++;else if(html[i]==='}')d--;}return html.slice(start,i);}
const contract=fs.readFileSync(path.join(__dirname,'candidate-contract.cjs'),'utf8').split('// Design specification')[0];
const candidate=new Function('require','__dirname',contract+'\nreturn ctx;')(require,__dirname);
const comparison=fs.readFileSync(path.join(__dirname,'compare-existing.cjs'),'utf8').split('const cases=')[0];
const base=new Function('require','__dirname',comparison+'\nreturn api;')(require,__dirname);
const declarations=['const REMAIN634=','const LEGACY634=','const CACHE634='].map(p=>html.split('\n').find(l=>l.startsWith(p))).join('\n');
const functions=['t634On','v634','spritePixels634','spr634','streetHash','t596On'].map(fn).join('\n');
const selector=fs.readFileSync(path.join(__dirname,'selector675.js'),'utf8');assert(html.includes(selector.trim()));
const api=new Function('bake634','bake675',"const window={},location={search:''},season=()=>1;\n"+declarations+'\n'+functions+'\n'+selector+'\nreturn {old:spr634,fresh:spr675,variant:variant675};')(base.bake,candidate.bake);
const stats=a=>{const b=[...a].sort((x,y)=>x-y);return{n:b.length,medianUs:b[Math.floor(b.length*.5)],p90Us:b[Math.ceil(b.length*.9)-1]};};
const positions=[[23,18],[42,18],[22,19],[30,18],[18,18],[36,18],[19,18],[44,18],[34,18],[27,18]],batch=1000,rows=[];
for(let model=0;model<10;model++){const [x,y]=positions[model],b=Object.freeze({k:3,lv:2,v:model}),old=[],fresh=[];assert.equal(api.variant(b,x,y),model);const A=api.old(b,x,y),B=api.fresh(b,x,y);assert(A&&B);for(let i=0;i<200;i++){assert.strictEqual(api.old(b,x,y),A);assert.strictEqual(api.fresh(b,x,y),B);}
 const sample=(f,out)=>{const t=performance.now();for(let j=0;j<batch;j++)f(b,x,y);out.push((performance.now()-t)*1000/batch);};for(let n=0;n<30;n++){if(n%2){sample(api.fresh,fresh);sample(api.old,old);}else{sample(api.old,old);sample(api.fresh,fresh);}}rows.push({model,baseline:stats(old),candidate:stats(fresh)});}
console.log(JSON.stringify({scope:'isolated original spr634 and actual spr675 hot-cache selectors; excludes rendering, browser and mobile/native timing',samplesPerModel:30,callsPerSample:batch,order:'alternating AB/BA after 200 warmup pairs',rows},null,2));
