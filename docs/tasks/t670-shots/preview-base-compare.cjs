/* T670：抽取真選圖／倒影分支，比對 main；隔離烘圖，不冒稱完整瀏覽器。 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const sources=[fs.readFileSync(process.argv[2],'utf8'),fs.readFileSync('index.html','utf8')];
function fn(s,n){const a=s.indexOf('function '+n+'(');assert(a>=0,n);const l=s.slice(a,s.indexOf('\n',a));return l.endsWith('}')?l:s.slice(a,s.indexOf('\n}',a)+2);}
function run(s,no634,mutate=false){
 const C={window:{__t596:true,__noT634:no634},location:{search:''},Map,Math,season:()=>1,inWinter:()=>false,rainDays:0,REMAIN634:new Set([2]),LEGACY634:new Set(),CACHE634:new Map(),STAT634:{hits:0,fail:0,pixels:0,bakes:0},LIMIT634:{entries:99,pixels:999},v634:()=>0,spritePixels634:()=>1,bake634:()=>({family:634}),spr596:()=>({family:596}),t635On:()=>false,t638On:()=>false};
 vm.createContext(C);let code=fn(s,'t596On')+'\n'+fn(s,'t634On')+'\n'+fn(s,'spr634')+'\n'+fn(s,'reflectSprite');
 if(s.includes('function spr670(')){C.variant670=()=>0;C.bake670=()=>({family:670});code+='\n'+fn(s,'t670On')+'\n'+fn(s,'spr670').replace(mutate?'||t596On()':'__NEVER_MATCH__','');}
 const lines=s.split('\n'),chain=lines.filter(l=>l.includes('const p596=spr596(bd,true,o.x,o.y)')||l.includes('const p634=spr634(bd,o.x,o.y')||l.includes('const p670=spr670(bd,o.x,o.y')).join('\n');
 C.bd={k:2,lv:1};C.o={x:0,y:0};C.win=false;C.snowLvl=0;C.cropStage574=2;
 return vm.runInContext(code+'\n(()=>{let s={family:0};'+chain+'\n;return {draw:s.family,reflection:reflectSprite(bd,0,0).family};})()',C);
}
const cases=[];for(const no634 of[false,true]){const base=run(sources[0],no634),head=run(sources[1],no634);assert.equal(JSON.stringify(head),JSON.stringify(base),'T670 must preserve existing explicit-preview base selection');assert.equal(base.draw,no634?596:634);assert.equal(base.reflection,no634?596:634);cases.push({t634Enabled:!no634,base,head});}
assert.notEqual(JSON.stringify(run(sources[1],false,true)),JSON.stringify(run(sources[0],false)),'negative control must expose removed T670 yield');
console.log(JSON.stringify({cases,negativeControl:'removed T670 yield changes base selection',limit:'Actual selection and reflection source with isolated bake identities; not full-game pixel or browser acceptance.'},null,2));
