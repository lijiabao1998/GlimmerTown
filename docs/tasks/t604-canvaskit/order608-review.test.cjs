'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path').resolve(__dirname,'../../..')+'/';
const { create } = require(path+'docs/tasks/t604-canvaskit/order608.cjs');
const source = fs.readFileSync(path+'index.html','utf8');
const start=source.indexOf('function lotOrder574('),end=source.indexOf('\nfunction lotObjectOrder574',start);
const original=new Function('return ('+source.slice(start,end)+')')();
const same=(actual,expected)=>{assert.equal(actual.cycles574,expected.cycles574);assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i++)assert.equal(actual[i],expected[i]);};
const chain=n=>Array.from({length:n},(_,i)=>({id:i,lot574:true,foot574:[i,i,i+.5,i+.5]}));
test('genuine nested call runs busy fallback and preserves both identities',()=>{
 const p=create(original), nested=chain(11).reverse(),expected=original(nested,true); let triggered=0;
 const a=chain(9).reverse(),first=a[0],foot=first.foot574;
 Object.defineProperty(first,'foot574',{get(){if(!triggered++){same(p.order(nested,true),expected);assert.equal(p.stats().fallbacks,1);}return foot;}});
 const result=p.order(a,true); same(result,original(a,true));
 assert.equal(p.stats().calls,2);assert.equal(p.stats().pooled,1);assert.equal(p.stats().fallbacks,1);
});
test('partial edge graph throwing drops edge-heavy lease and remains usable',()=>{
 const p=create(original,{maxNodes:16,maxRetainedEdges:1}),a=chain(8);let reads=0;
 const foot=a[7].foot574;Object.defineProperty(a[7],'foot574',{get(){reads++;throw Error('partial edge failure');}});
 assert.throws(()=>p.order(a),/partial edge failure/);assert.equal(reads,1);
 assert.equal(p.stats().discards,1);assert.equal(p.stats().capacity,0);
 const b=chain(2).reverse();same(p.order(b),original(b));assert.equal(p.stats().growths,2);
});
test('dispose inside getter leaves active result valid and future calls fallback',()=>{
 const p=create(original),a=chain(9).reverse(),first=a[0],foot=first.foot574;let triggered=false;
 Object.defineProperty(first,'foot574',{get(){if(!triggered){triggered=true;p.dispose();const b=chain(3).reverse();same(p.order(b),original(b));}return foot;}});
 same(p.order(a),original(a));assert.equal(p.stats().capacity,0);assert.equal(p.stats().retainedEdges,0);
 const b=chain(7).reverse();same(p.order(b),original(b));assert.equal(p.stats().fallbacks,2);
});
test('growth/shrink/reset plus fresh owned output and frozen records',()=>{
 const p=create(original,{maxNodes:65}),held=[];
 for(const n of [0,1,16,17,65,2,33,0,66,1,65,4])for(const sparse of[false,true]){
  const a=chain(n).reverse();for(const item of a){Object.freeze(item.foot574);Object.freeze(item);}Object.freeze(a);
  const actual=p.order(a,sparse);same(actual,original(a,sparse));held.push({actual,copy:actual.slice(),cycles:actual.cycles574});
  for(const prev of held){assert.deepEqual(prev.actual.slice(),prev.copy);assert.equal(prev.actual.cycles574,prev.cycles);}
 }
 assert.equal(p.stats().fallbacks,2);assert.equal(p.stats().capacity,65);
});
test('input geometry and lot flags are freshly recomputed on every call',()=>{
 const p=create(original),a=chain(25).reverse();for(let i=0;i<50;i++){
  for(let j=0;j<a.length;j++){const item=a[j],x=(i*j*13)%31,y=(i+j*17)%37;item.foot574=(i+j)%9?[x,y,x+2,y+3]:null;item.lot574=(i+j)%3===0;}
  same(p.order(a,true),original(a,true));same(p.order(a,false),original(a,false));a.reverse();
 }
});
test('explicit cycle break and stable ties retain exact original output',()=>{
 let seed=83929;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};let cyclic;
 for(let k=0;k<10000&&!cyclic;k++){const a=Array.from({length:9},(_,id)=>{const x=Math.floor(rand()*10),y=Math.floor(rand()*10);return{id,lot574:true,foot574:[x,y,x+1+Math.floor(rand()*5),y+1+Math.floor(rand()*5)]};});if(original(a).cycles574>0)cyclic=a;}
 assert.ok(cyclic,'cycle fixture must actually have a cycle');const p=create(original);for(let i=0;i<10;i++)for(const sparse of[false,true])same(p.order(cyclic,sparse),original(cyclic,sparse));
 const ties=Array.from({length:8},(_,id)=>({id,lot574:true,foot574:[0,0,1,1]}));same(p.order(ties,true),original(ties,true));assert.deepEqual(p.order(ties).map(o=>o.id),ties.map(o=>o.id));
 console.log('Explicit cyclic fixture:',JSON.stringify(cyclic));
});
test('zero capacities, edge-cap equality and post-error reset',()=>{
 const zero=create(original,{maxNodes:0,maxRetainedEdges:0});same(zero.order([]),original([]));const one=chain(1);same(zero.order(one),original(one));assert.equal(zero.stats().capacity,0);assert.equal(zero.stats().fallbacks,1);const p=create(original,{maxNodes:16,maxRetainedEdges:3}),a=chain(3);same(p.order(a),original(a));assert.equal(p.stats().retainedEdges,3);assert.equal(p.stats().discards,0);assert.throws(()=>p.order([null,{}]),TypeError);const b=chain(2).reverse();same(p.order(b),original(b));
});
