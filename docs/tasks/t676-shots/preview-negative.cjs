'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),test=fs.readFileSync(path.join(root,'test_fixde.js'),'utf8'),html=fs.readFileSync(process.argv[2]||path.join(root,'index.html'),'utf8');
const source=test.slice(test.indexOf('  // T673：CI 也執行'),test.indexOf('  T6.reset();',test.indexOf('  // T673：CI 也執行')));
function check(h,contract=source){vm.runInNewContext(contract,{html:h,assert,vm,Map,Math});}
check(html);
const families=[670,671,675].filter(n=>html.includes('function spr'+n+'('));
const negatives=[];
if(families.includes(675)){let error='';try{check(html,source.replace('[670,671,675]','[670,671]'));}catch(e){error=e.message;}assert(error,'omitting named family 675 must fail');negatives.push({name:'missing-675-registration',error:error.split('\n')[0]});}
function reject(name,h){let error='';try{check(h);}catch(e){error=e.message;}assert(error,name+' must fail');negatives.push({name,error:error.split('\n')[0]});}
reject('missing-legacy-query',html.replace('else if(k===2&&t596On())sy=','else if(k===2)sy='));
reject('unknown-extra-query',html+'\nfunction unrelated(){return t596On();}\n');
reject('missing-legacy-overlay-gate',html.replace(/!s\.__t596(?:&&!s\.__t(?:670|671|675))*\)drawActivityPocket422/,'true)drawActivityPocket422'));
let behavior=0;
for(const n of families){
 const prefix='function spr'+n+'(b,x,y,winter=false){if(!t'+n+'On()||t596On())return null;';
 reject('missing-family-preview-'+n,html.replace(prefix,prefix.replace('||t596On()','')));
 reject('missing-family-overlay-'+n,html.replace('&&!s.__t'+n,''));
 const behaviorSource=source.slice(0,source.indexOf('  // G1a／G2 原文釘'));
 for(const [name,replacement] of [['ignored-preview',prefix.replace('||t596On()','||false')],['ignored-family-valve',prefix.replace('!t'+n+'On()','false')]]){
  let error='';try{vm.runInNewContext(behaviorSource,{html:html.replace(prefix,replacement),families673:[n],on596:html.split('\n').find(l=>l.startsWith('function t596On(')),assert,vm,Map,Math});}catch(e){error=e.message;}
  assert(error.includes('T673 G2'),'actual selector negative must fail T673 G2: '+name);negatives.push({name:name+'-'+n,error:error.split('\n')[0]});
 }
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
