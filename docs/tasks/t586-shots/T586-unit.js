/* Fast red-source for the exact T586 block in test_fixde.js. Does not edit product files. */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..','..','..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tests=fs.readFileSync(path.join(root,'test_fixde.js'),'utf8');
const start=tests.indexOf('/* ===== T586 舊城單格地腳');
const end=tests.indexOf("\n  console.log('\\nFIX-D/FIX-E",start);
if(start<0||end<start)throw Error('T586 test block missing');
const block=tests.slice(start,end);
function run(source){
  const hits=[];
  const context={html:source,window:{__t586Foot:{keys:4,day:1169,night:0,winter:0}},
    Uint8ClampedArray,
    assert:(pass,message)=>{if(!pass)throw Error(message);hits.push(message);}};
  try{vm.runInNewContext(block,context,{timeout:3000});return{ok:true,hits:hits.length};}
  catch(e){return{ok:false,firstRed:e.message};}
}
function mutate(name,from,to,target){
  if(html.split(from).length!==2)throw Error(name+': mutation anchor not unique');
  const result=run(html.replace(from,to));
  if(result.ok||!result.firstRed.startsWith(target))throw Error(name+' bad first red '+JSON.stringify(result));
  console.log(name+' → '+result.firstRed);
}
const green=run(html);if(!green.ok)throw Error('control '+green.firstRed);
console.log('control green: '+green.hits+' T586 assertions');
mutate('mask-dead','if(y>=ay||Math.abs(x-ax)>half){','if(false){','T586 G3 ');
mutate('whitelist-wrong',"['29_1_0','30_1_0','67_1_0','69_1_0']","['29_1_0','30_1_0','67_1_0','68_1_0']",'T586 G1a ');
mutate('kill-switch-dead','if(window.__noFoundation586||','if(false&&window.__noFoundation586||','T586 G1b ');
mutate('night-detached','report.night+=clipFoot586(s.night,s)','report.night+=0','T586 G1a ');
