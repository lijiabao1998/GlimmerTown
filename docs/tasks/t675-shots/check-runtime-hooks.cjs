/* T675 actual routing lines under isolated inputs; not full-browser acceptance. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8'),lines=html.split('\n');
const line=s=>{const a=lines.filter(l=>l.includes(s));assert.equal(a.length,1,s);return a[0];};
const draw=line('if(t675On()){const p675=spr675(bd,o.x,o.y'),reflection=line('if(t675On()){const p675=spr675(bd,x,y'),smoke=line('let ownSmoke675=false;');
let checks=0;
for(const enabled of[false,true])for(const picked of[false,true])for(const snowy of[false,true]){
 const legacy={old:true},fresh={__t675:1,smoke:[{dx:2,dy:-20}]},calls=[];
 const C={t675On:()=>enabled,spr675:(b,x,y,snow)=>{calls.push([b,x,y,snow]);return picked?fresh:null;},bd:{k:3,lv:2},o:{x:7,y:8},x:7,y:8,win:snowy,snowLvl:snowy?1:0,inWinter:()=>snowy,rainDays:snowy?1:0,s:legacy};vm.createContext(C);vm.runInContext(draw,C);assert.strictEqual(C.s,enabled&&picked?fresh:legacy);assert.equal(calls.length,enabled?1:0);if(enabled)assert.deepEqual(calls[0],[C.bd,7,8,snowy]);
 const result=vm.runInContext('(function(){'+reflection+'\nreturn null;})()',C);assert.strictEqual(result,enabled&&picked?fresh:null);checks+=3;
}
for(const powered of[false,true])for(const riot of[false,true])for(const age of[3,9])for(const outlets of[[],[{dx:1,dy:-9}]]){
 const previous=[{dx:99,dy:99}],C={t675On:()=>true,b:{k:3,pw:powered,riot,age},spr675:()=>({__t675:1,smoke:outlets}),x:2,y:3,sea:1,rainDays:0,offs:previous,u596:false};vm.createContext(C);vm.runInContext(smoke+'\nthis.tag=ownSmoke675;',C);const own=powered&&!riot;assert.strictEqual(C.tag,own);assert.strictEqual(C.u596,own);if(own)assert.deepEqual(JSON.parse(JSON.stringify(C.offs)),age>=9?outlets:[]);else assert.strictEqual(C.offs,previous);checks+=3;
}
// Explicit negative control: reflection must use the same exact selected sprite.
assert.throws(()=>{const C={t675On:()=>true,spr675:()=>({__t675:1}),bd:{},x:1,y:2,inWinter:()=>false,rainDays:0};vm.createContext(C);const bad=reflection.replace('if(p675)return p675;','');assert(vm.runInContext('(function(){'+bad+'\nreturn null;})()',C));},assert.AssertionError);
console.log(JSON.stringify({passed:true,checks,negativeControls:1,scope:'Actual source draw/reflection/smoke routing with isolated inputs, not Chrome.'}));
