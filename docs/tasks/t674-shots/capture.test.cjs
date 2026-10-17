'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{plan,validate,bridge}=require('./capture.cjs');
const fixture=()=>({commit:'candidate',family:670,models:Array.from({length:10},(_,variant)=>({variant,frames:plan().map(s=>({...s,png:'frame.png',sha256:'hash',slot:'3',bodyDrawn:true,reflected:true,hoverApplied:true,overlayChanged:true,variant,nightDraws:s.night?1:0,smokeCount:[6,7].includes(variant)?0:1,chimneys:[6,7].includes(variant)?0:1}))}))});
test('complete ten-model coverage accepted',()=>assert(validate(fixture(),'candidate')));
test('missing model negative control',()=>{const r=fixture();r.models.pop();assert.throws(()=>validate(r,'candidate'),/missing model/);});
test('missing required state negative control',()=>{const r=fixture();r.models[2].frames.pop();assert.throws(()=>validate(r,'candidate'),/missing state/);});
test('wrong candidate negative control',()=>assert.throws(()=>validate(fixture(),'other'),/SHA mismatch/));
for(const layer of ['hover','construction6','pedestrian','smoke'])test('absent '+layer+' negative control',()=>{const r=fixture(),f=r.models[3].frames.find(f=>f.layer===layer);f.hoverApplied=f.overlayChanged=false;f.smokeCount=0;assert.throws(()=>validate(r,'candidate'));});
test('wrong selected model negative control',()=>{const r=fixture();r.models[2].variant=1;assert.throws(()=>validate(r,'candidate'),/wrong variant/);});
test('bridge parses without rewriting production source',()=>assert.doesNotThrow(()=>new Function('return ('+bridge.toString().replace('FAMILY_NUMBER','670')+')')));

test('missing night layer rejected',()=>{const r=fixture();r.models[0].frames.find(f=>f.night).nightDraws=0;assert.throws(()=>validate(r,'candidate'),/night layer/);});
test('zero chimneys cannot excuse required smoke',()=>{const r=fixture(),f=r.models[0].frames.find(f=>f.layer==='smoke');f.chimneys=f.smokeCount=0;f.overlayChanged=false;assert.throws(()=>validate(r,'candidate'),/required chimney/);});
test('declared chimneyless model must remain chimneyless',()=>{const r=fixture();r.models[6].frames.find(f=>f.layer==='smoke').chimneys=1;assert.throws(()=>validate(r,'candidate'),/chimneyless model changed/);});
test('chimneyless model cannot emit smoke',()=>{const r=fixture();r.models[7].frames.find(f=>f.layer==='smoke').smokeCount=1;assert.throws(()=>validate(r,'candidate'),/emits smoke/);});
test('far missing body rejected',()=>{const r=fixture();r.models[0].frames.find(f=>f.layer==='far').bodyDrawn=false;assert.throws(()=>validate(r,'candidate'),/model not drawn/);});
