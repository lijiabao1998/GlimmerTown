/* T671: replay actual legacy overlay functions and guarded draw call sites.
   Repository software masks by default; isolated call inputs, not browser acceptance. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{createCanvas,backend}=require('./pixel-contract.cjs');
const src=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
const part=(a,b)=>{const start=src.indexOf(a),end=src.indexOf(b,start);assert(start>=0&&end>start,'source section '+a);return src.slice(start,end);};
const fun=n=>{const m=src.match(new RegExp('^function '+n+'\\([\\s\\S]*?\\n}', 'm'));assert(m,'source function '+n);return m[0];};
const specs=[
 {id:'identity',name:'drawNightIdentity423',xy:[39,3],args:'ctx,o,bd,s,bx,by,z,drawA,nightDepth',snow:false},
 {id:'roof',name:'drawRooftop425',xy:[39,3],args:'ctx,o,bd,s,bx,by,z,drawA',snow:false},
 {id:'material',name:'drawMaterialResponse430',xy:[23,12],args:'ctx,o,bd,s,bx,by,z,drawA,wetLvl,snowLvl,nightDepth',snow:true},
 {id:'life',name:'drawLivedIn421',xy:[36,8],args:'ctx,o,bd,s,bx,by,z,drawA',snow:false}
];
function run(spec,mutation=false){
 const C={window:{},location:{search:''},Map,Math,Error,season:()=>spec.snow?3:1,t596On:()=>false,visT:0,weather:0,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),kcatOf:()=> 'R',cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
 const constants=['const visualWealth446D=','const roofLifeIntensity446=','window.__noRoofLife446='].map(prefix=>{const line=src.split('\n').find(l=>l.startsWith(prefix));assert(line,'production constant '+prefix);return line;}).join('\n');
 vm.createContext(C);vm.runInContext(part('function lotLine574(','function lotVariant574(')+part('function makeIso590(','function silhouette590(')+fun('streetHash')+part('function detailAlpha432(','function streetPermit432(')+fun('roofAnchor425')+fun(spec.name)+constants+part('/* T671：第二波','/* T671 END')+';this.api={bake671,variant671,overlay:'+spec.name+'};',C);
 const s=C.api.bake671(0,spec.snow,spec.snow?3:1),o={x:spec.xy[0],y:spec.xy[1]},bd={k:1,lv:1,age:60,pw:true,we:1},calls=[];
 assert.equal(C.api.variant671(bd,o.x,o.y),0,spec.id+': natural blackhouse selection');
 const ctx={save(){},restore(){},fillRect(...a){calls.push(a)},createRadialGradient(){return {addColorStop(){}}},beginPath(){},arc(){},fill(){}};
 Object.assign(C,{ctx,o,bd,s,bx:0,by:0,z:1,drawA:1,nightDepth:spec.snow?0:1,wetLvl:0,snowLvl:spec.snow?1:0});
 const original='if(!s.__t590)'+spec.name+'('+spec.args+');';
 vm.runInContext(original,C);assert(calls.length>0,spec.id+': positive production overlay and coordinate gate reached');
 const body=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,night=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;
 const alpha=(mask,x,y)=>x<0||x>=s.w||y<0||y>=s.h?0:mask[(y*s.w+x)*4+3];
 const points=r=>{const a=[];for(let y=Math.ceil(r[1]);y<r[1]+r[3];y++)for(let x=Math.ceil(r[0]);x<r[0]+r[2];x++)a.push([x,y]);return a;};
 if(spec.id==='identity'){
  assert.deepEqual(calls,[[39,40,2,3]],'identity: original misplaced lamp geometry');
  assert(points(calls[0]).every(([x,y])=>alpha(night,x,y)===0),'identity: lamp outside all opening pixels');
 }else if(spec.id==='roof'){
  assert.deepEqual(calls,[[22,9,1,5],[19,8,5,1],[20,7,4,1],[24,8,1,1]],'roof: original satellite geometry');
  assert(calls.flatMap(points).every(([x,y])=>alpha(body,x,y)===0),'roof: satellite outside body');
  let top=0;while(top<s.h&&!alpha(body,22,top))top++;assert(top>=23,'roof: gap below mast through y22');
 }else if(spec.id==='material'){
  assert.deepEqual(calls[0],[24,7,5,1],'material: original equipment snow geometry');
  assert(points(calls[0]).every(([x,y])=>alpha(body,x,y)===0),'material: snow line entirely outside snowy body');
 }else{
  assert.equal(calls.length,4,'life: original AC unit details reached');
  assert(calls.flatMap(points).every(([x,y])=>alpha(body,x,y)===0),'life: AC unit outside body at sampled pixel centers');
 }
 const originalRects=calls.map(r=>r.slice());
 const escaped=original.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=src.match(new RegExp('if\\(!s\\.__t671\\)\\{\\s*'+escaped+'[^}]*\\}'));
 assert(match,spec.id+': actual family exclusion call site present');
 const hook=mutation?match[0].replace('if(!s.__t671)','if(true)'):match[0];
 calls.length=0;vm.runInContext(hook,C);assert.equal(calls.length,0,spec.id+': T671 legacy overlay excluded');
 C.s={...s};delete C.s.__t671;calls.length=0;vm.runInContext(hook,C);assert.deepEqual(calls,originalRects,spec.id+': unmarked legacy routing unchanged');
 C.s={...C.s,__t670:1};calls.length=0;vm.runInContext(hook,C);assert.deepEqual(calls,originalRects,spec.id+': T670-marker routing unchanged');
 C.s={...C.s,__t590:1};calls.length=0;vm.runInContext(hook,C);assert.equal(calls.length,0,spec.id+': original T590 exclusion retained');
 return {id:spec.id,position:spec.xy,originalRects,passed:true};
}
const report={passed:true,backend,limit:'Actual source functions and draw call hooks with explicit software/native mask backend; isolated inputs, not full-browser or full T670 render acceptance.',cases:specs.map(s=>run(s)),negativeControls:[]};
for(const spec of specs){let reason='';try{run(spec,true);}catch(e){reason=e.message;}assert(reason.includes(spec.id+': T671 legacy overlay excluded'),spec.id+': mutation must fail at own exclusion');report.negativeControls.push({mutation:'remove-'+spec.id+'-exclusion',reason:reason.split('\n')[0]});}
console.log(JSON.stringify(report,null,2));
