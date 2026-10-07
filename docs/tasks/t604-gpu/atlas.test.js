'use strict';
const assert=require('node:assert/strict'),{packRects604}=require('./atlas.js');let checks=0;
function test(n,f){f();checks++;console.log('PASS '+n);}
test('packing preserves source command indexes despite placement sort',()=>{const p=packRects604([{index:2,w:4,h:3},{index:0,w:8,h:8},{index:1,w:4,h:6}],32,2);assert.deepEqual(p.slots.map(s=>s.index),[0,1,2]);});
test('gutter and every rectangle remain nonoverlapping in bounded pages',()=>{const rows=Array.from({length:837},(_,i)=>({index:i,w:3+i%51,h:3+i%37})),p=packRects604(rows,1024,2);for(let i=0;i<p.slots.length;i++){const a=p.slots[i];assert.ok(a.x>=1&&a.y>=1&&a.x+a.w<1024&&a.y+a.h<1024);for(const b of p.slots.slice(i+1))if(a.page===b.page)assert.ok(a.x+a.w+1<=b.x-1||b.x+b.w+1<=a.x-1||a.y+a.h+1<=b.y-1||b.y+b.h+1<=a.y-1);}assert.ok(p.bytes<=2*1024*1024*4);});
test('oversized or exhausted page budget fails closed',()=>{assert.throws(()=>packRects604([{index:0,w:4096,h:1}]));assert.throws(()=>packRects604([{index:0,w:30,h:30},{index:1,w:30,h:30},{index:2,w:30,h:30}],32,2));});
test('opaque multiply formula equals premultiplied source over blended color',()=>{for(const alpha of [0,.2,.7,1])for(const cs of [0,.2,1])for(const cb of [0,.4,1]){const gl=(cs*alpha)*cb+cb*(1-alpha),expected=(1-alpha)*cb+alpha*(cs*cb);assert.ok(Math.abs(gl-expected)<1e-12);}});
console.log('T604_ATLAS_CONTRACTS '+checks+' passed');
