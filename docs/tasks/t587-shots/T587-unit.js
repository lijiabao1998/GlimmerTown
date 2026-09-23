/* T587 exact red-source; mutates in memory, never the product files. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..','..','..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tests=fs.readFileSync(path.join(root,'test_fixde.js'),'utf8');
const a=tests.indexOf('/* ===== T587 舊單格道路接縫');
const b=tests.indexOf("\n  console.log('\\nFIX-D/FIX-E",a);
if(a<0||b<a)throw Error('T587 test block missing');
const block=tests.slice(a,b);
function run(source){
  let n=0;const context={html:source,window:{__t587Foot:{keys:10,day:0,night:0,winter:0}},
    assert:(ok,msg)=>{if(!ok)throw Error(msg);n++;}};
  try{vm.runInNewContext(block,context,{timeout:3000});return{green:true,passes:n};}
  catch(e){return{green:false,firstRed:e.message};}
}
function mutate(name,from,to,target){
  const a=html.indexOf('  function buildSpritesS18(){'),b=html.indexOf('  const genRoadLvl=',a);
  if(a<0||b<a)throw Error('S18 source slice missing');
  const section=html.slice(a,b);if(section.split(from).length!==2)throw Error(name+' anchor not unique');
  const source=html.slice(0,a)+section.replace(from,to)+html.slice(b),r=run(source);
  if(r.green||!r.firstRed.startsWith(target))throw Error(name+' bad first red '+JSON.stringify(r));
  console.log(name+' -> '+r.firstRed);
}
const control=run(html);if(!control.green)throw Error('control '+control.firstRed);
console.log('control green: '+control.passes+' T587 assertions');
mutate('wrong-key',"'16_1_0'","'16_1_1'",'T587 G1a ');
mutate('day-detached','report.day+=clipFoot586(s.img,s)','report.day+=0','T587 G1a ');
mutate('kill-switch-dead','if(window.__noSeam587||','if(false&&window.__noSeam587||','T587 G1b ');
mutate('random-token','report.keys++;','spriteTexRand();report.keys++;','T587 G1c ');
