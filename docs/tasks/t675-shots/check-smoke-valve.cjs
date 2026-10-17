/* T675：執行原煙粒產生／更新／繪製入隊接點；不代替完整 Chrome 畫幀。 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync('index.html','utf8'),lines=src.split('\n');
function run(mutation){
 const on=lines.find(l=>l.startsWith('function t675On(')),spawn=lines.find(l=>l.includes('smokes.push({wx,wy,age:0,life:'));
 let tag=lines.find(l=>l.includes('if(ownSmoke675)smokes[smokes.length-1].__t675=true;')),queue=lines.find(l=>l.includes('for(const s of smokes)')&&l.includes('objs.push('));
 const a=src.indexOf('  for(let i=smokes.length-1;i>=0;i--){');let update=src.slice(a,src.indexOf('\n}\n',a));
 assert(on&&spawn&&tag&&queue,'source hooks present');
 if(mutation==='missing-tag')tag='';if(mutation==='missing-draw-filter')queue=queue.replace('if(!s.__t675||t675On())','');if(mutation==='missing-purge')update=update.replace(/    if\(s\.__t675&&!t675On\(\)\)\{[^\n]+\n/,'');
 const C={window:{},location:{search:''},Math:Object.assign(Object.create(Math),{random:()=>.5}),smokes:[],objs:[],wx:10,wy:20,weather:false,col:'#d8d2c6',big:false,x:1,y:1,viewDep:()=>2,lot574:null,ownSmoke675:[{}],lodFar:false,dt:.1};vm.createContext(C);vm.runInContext(on+'\n'+spawn+'\n'+tag,C);assert(C.smokes[0].__t675,'family emission tagged');
 C.ownSmoke675=null;vm.runInContext(spawn+'\n'+tag,C);assert(!C.smokes[1].__t675,'legacy emission unchanged');
 vm.runInContext(queue,C);assert.equal(C.objs.length,2,'both visible while enabled');
 C.window.__noT675=true;C.objs=[];vm.runInContext(queue,C);assert.equal(C.objs.length,1,'paused close immediately suppresses existing family particle');assert(!C.objs[0].smoke.__t675,'legacy smoke stays visible');
 vm.runInContext(update,C);assert.equal(C.smokes.length,1,'closed valve purges only family particles');assert(!C.smokes[0].__t675);assert.equal(C.smokes[0].age,.1,'legacy age unchanged');assert.equal(C.smokes[0].wy,18.6,'legacy drift unchanged');
 return true;
}
assert(run());const negative=[];for(const m of['missing-tag','missing-draw-filter','missing-purge']){let reason='';try{run(m);}catch(e){reason=e.message.split('\n')[0];}assert(reason,'negative control failed to reject '+m);negative.push({mutation:m,reason});}
console.log(JSON.stringify({passed:true,negative,limit:'Actual source hooks with isolated particle inputs; not full game/browser performance acceptance.'},null,2));
