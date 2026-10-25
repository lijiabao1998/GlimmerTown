'use strict';
// Exact geometry regression, not a substitute for sandbox Chromium pixel/perf tests.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const c={};c.globalThis=c;vm.createContext(c);for(const p of['../port-p04/transfer-occlusion.js','../port-p05/dispatch-occlusion.js','native-performance.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),c);
const O=c.PortTransferOcclusion,P=c.P06Performance,canonical=x=>JSON.stringify(x),oldStore=new Map(),newStore=new Map();let checks=0,seed=9072;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function face(x,y,z,w,h,axis=0){return axis?[[x,y,z],[x+w,y,z+2],[x+w,y+h,z+2],[x,y+h,z]]:[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]];}
const statics=Array.from({length:90},(_,i)=>O.prepare(face((i%15)*7-50,Math.floor(i/15)*9-28,i%9,7,9,i%2)));
for(let frame=0;frame<50;frame++){
 const dynamic=Array.from({length:30},(_,i)=>face((i%10)*7-45+frame*.31,Math.floor(i/10)*9-27,5+i%8,6,8,i%2));
 const others=[...statics,...dynamic],a=P.reference(others,oldStore),b=P.accelerated(others,newStore);
 for(let i=0;i<35;i++){const points=i<30?dynamic[i]:face(rand()*120-60,rand()*70-35,rand()*12,7,9,i%2);assert.equal(canonical(b.visible(points)),canonical(a.visible(points)),`frame ${frame} face ${i}`);checks++;}
 assert(oldStore.size<=512&&newStore.size<=512);
}
// Degenerate/duplicate/coplanar vertices and exact cell/epsilon boundaries.
for(const p of [[],[[0,0,0],[0,0,0],[0,0,0]],[[0,0,0],[64,0,0],[64,64,0],[64,64,0],[0,64,0]],face(-64,-64,2,64,64),face(64-O.EPS,0,1,64,64)]){
 const others=[face(-64,-64,4,128,128,1),face(0,0,2,64,64)];assert.equal(canonical(P.accelerated(others).visible(p)),canonical(P.reference(others).visible(p)));checks++;
}
// Exercise interner eviction without ever recycling an ID or allowing stale hits.
for(let i=0;i<8300;i++){const p=face(i*2,0,1,1,1);P.accelerated([]).visible(p);}assert(P.stats().internedKeys<=8192);assert(P.stats().serial>8192);
for(let i=0;i<20;i++){const p=face(i,0,i%3,5,5);assert.equal(canonical(P.accelerated(statics,newStore).visible(p)),canonical(P.reference(statics,oldStore).visible(p)));checks++;}
// A cache-key mutant omitting occluder identity must be detected (no loose tolerance).
const subject=face(0,0,0,10,10),cover=face(0,0,5,10,10),shared=new Map();
assert.equal(canonical(P.accelerated([cover],shared).visible(subject)),canonical(P.reference([cover]).visible(subject)));
assert.equal(canonical(P.accelerated([],shared).visible(subject)),canonical(P.reference([]).visible(subject)));checks+=2;
const bad={PortTransferOcclusion:O,LandsideOcclusion:{clean:c.LandsideOcclusion.clean,createCache:P.reference}};bad.globalThis=bad;vm.createContext(bad);
const source=fs.readFileSync(path.join(__dirname,'native-performance.js'),'utf8'),anchor="ids.map(i=>id(prepared[i],metas[i])).join(',')";assert(source.includes(anchor));vm.runInContext(source.replace(anchor,"''"),bad);const poisoned=new Map();bad.P06Performance.accelerated([cover],poisoned).visible(subject);
assert.notEqual(canonical(bad.P06Performance.accelerated([],poisoned).visible(subject)),canonical(P.reference([]).visible(subject)),'Cache-key omission mutant escaped');
const r={passed:true,checks,cacheKeyMutantRejected:true,stats:P.stats(),method:'Bit-exact polygon coordinates/order against untouched P05, static reuse + moving faces + degeneracies + bounded interner eviction; not browser evidence'};
fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});fs.writeFileSync(path.join(__dirname,'evidence/performance-equivalence.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
