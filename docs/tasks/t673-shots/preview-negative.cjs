'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),test=fs.readFileSync(path.join(root,'test_fixde.js'),'utf8'),html=fs.readFileSync(process.argv[2]||path.join(root,'index.html'),'utf8');
const source=test.slice(test.indexOf('  const on596=html.slice('),test.indexOf('  T6.reset();',test.indexOf('  const on596=html.slice(')));
function check(h){vm.runInNewContext(source,{html:h,assert});}
check(html);
const families=[670,671].filter(n=>html.includes('function spr'+n+'('));
const negatives=[];
function reject(name,h){let error='';try{check(h);}catch(e){error=e.message;}assert(error,name+' must fail');negatives.push({name,error:error.split('\n')[0]});}
reject('missing-legacy-query',html.replace('else if(k===2&&t596On())sy=','else if(k===2)sy='));
reject('unknown-extra-query',html+'\nfunction unrelated(){return t596On();}\n');
reject('missing-legacy-overlay-gate',html.replace('!s.__t596)drawActivityPocket422','true)drawActivityPocket422').replace('!s.__t596&&!s.__t'+families[0]+')drawActivityPocket422','true)drawActivityPocket422'));
let behavior=0;
for(const n of families){
 const prefix='function spr'+n+'(b,x,y,winter=false){if(!t'+n+'On()||t596On())return null;';
 reject('missing-family-preview-'+n,html.replace(prefix,prefix.replace('||t596On()','')));
 reject('missing-family-overlay-'+n,html.replace('!s.__t596&&!s.__t'+n+')drawActivityPocket422','!s.__t596)drawActivityPocket422'));
 const line=name=>{const a=html.indexOf('function '+name+'('),b=html.indexOf('\nfunction ',a+1);return html.slice(a,b<0?html.length:b);};
 for(const mode of ['off','window-preview','url-preview','window-valve','url-valve']){
  const C={window:{},location:{search:mode==='url-preview'?'?T596=1':mode==='url-valve'?'?noT'+n+'=1':''},Map,Math,season:()=>0};
  if(mode==='window-preview')C.window.__t596=true;if(mode==='window-valve')C.window['__noT'+n]=true;
  C['variant'+n]=()=>0;C['bake'+n]=()=>({family:n});
  vm.createContext(C);vm.runInContext([line('t596On'),line('t'+n+'On'),line('spr'+n)].join('\n')+'\nresult=spr'+n+'({k:1,lv:1},0,0,false);',C);
  assert(mode==='off'?C.result&&C.result.family===n:C.result===null,'actual selector '+n+' '+mode);behavior++;
 }
}
console.log(JSON.stringify({sourcePins:'passed',families,actualSelectorBehaviorCases:behavior,negative:negatives,limit:'Source checks and isolated actual-selector contracts; full game verify remains required.'},null,2));
