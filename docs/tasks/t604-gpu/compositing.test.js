'use strict';
const assert=require('node:assert/strict');
// Premultiplied colors. This checks algebra, not raster pixel equivalence.
const blend=(m,s,b)=>{const a=m==='lighter'?Math.min(1,s[3]+b[3]):s[3]+b[3]*(1-s[3]);return [...[0,1,2].map(i=>m==='source-over'?s[i]+b[i]*(1-s[3]):m==='multiply'?s[i]*b[i]+s[i]*(1-b[3])+b[i]*(1-s[3]):m==='screen'?s[i]+b[i]-s[i]*b[i]:Math.min(1,s[i]+b[i])),a];};
let seed=603;const next=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),pixel=()=>{const a=next();return[next()*a,next()*a,next()*a,a];};let cases=0;
for(const mode of ['source-over','multiply','screen','lighter'])for(let trial=0;trial<1000;trial++){const backdrop=pixel(),sources=[pixel(),pixel(),pixel(),pixel()];let direct=backdrop,group=[0,0,0,0];for(const s of sources){direct=blend(mode,s,direct);group=blend(mode,s,group);}const merged=blend(mode,group,backdrop);assert.ok(direct.every((n,i)=>Math.abs(n-merged[i])<1e-12));cases++;}
const backdrop=[.2,.5,.8,1],source=[.4,.1,.2,.5],multiply=blend('multiply',source,backdrop),wrong=blend('source-over',source,backdrop);assert.ok(multiply.some((v,i)=>Math.abs(v-wrong[i])>.1));
console.log('T604_COMPOSITING_ALGEBRA '+cases+' same-mode groups passed; incorrect source-over flattening rejected. Does not waive raster comparisons.');
