/* T671 真 Canvas 像素結構驗證；不代替 Chrome／CI fp 原件。 */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const src=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
function run(mutation){
 const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
 const C={window:{},location:{search:''},Map,Math,Error,season:()=>1,t596On:()=>!!C.window.__t596,rainDays:0,streetHash:(x,y,s)=>((x*13+y*7+s)%220)/220,cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
 vm.createContext(C);vm.runInContext(part('function lotLine574(','function lotVariant574(')+part('function makeIso590(','function silhouette590(')+part('/* T671：第二波','/* T671 END').replace(mutation==='preview-priority'?'||t596On()':'NEVER_MATCH','')+(mutation==='duplicate'?'CATALOG671[1]=CATALOG671[0];':'')+(mutation==='valve'?'t671On=function(){return true;};':'')+'this.api={bake671,spr671,variant671,t671On,CATALOG671};',C);
 const A=C.api,hash=x=>crypto.createHash('sha256').update(x).digest('hex');
 assert.equal(A.CATALOG671.length,10,'model-count');assert.equal(new Set(A.CATALOG671.map(d=>d.id)).size,10,'model-identity');
 assert.equal(A.CATALOG671[0].id,'blackhouse','first-structure-contract');
 assert.equal(A.t671On(),true,'valve-default');C.window.__noT671=true;assert.equal(A.t671On(),false,'global-valve');assert.equal(A.spr671({k:1,lv:1},1,1),null,'global-valve-fallback');C.window.__noT671=false;
 delete A.t671On.off;C.location.search='?noT671=1';assert.equal(A.t671On(),false,'query-valve');delete A.t671On.off;C.location.search='';
 for(const b of[{k:2},{k:3},{k:1,lv:2},{k:1,sz:2},{k:1,ref:[0,0]},{k:1,lot574:1}])assert.equal(A.variant671(b,1,2),-1,'unrelated-building');
 const b={k:1,lv:1,age:30},before=JSON.stringify(b),selected=new Set();for(let x=0;x<220;x++)selected.add(A.variant671(b,x,1));assert.equal(selected.size,11,'ten-models-and-old-fallback');assert.equal(JSON.stringify(b),before,'no-save-writes');
 const hook=src.split('\n').find(l=>l.includes('if(t671On()&&sea===3&&b.k===1'));assert(hook,'smoke-hook-present');
 const route=(b,x,sea=3)=>{C.b=b;C.x=x;C.y=1;C.sea=sea;return vm.runInContext('(()=>{let offs=[{dx:999,dy:999}],col=null,u596=false;'+(mutation==='smoke-disconnected'?'':hook)+'\nreturn {offs,col,u596};})()',C);};
 let tested=0;const seen=new Set();for(let x=0;x<220;x++){const b={k:1,lv:1,age:30,pw:true},v=A.variant671(b,x,1);if(seen.has(v))continue;seen.add(v);const q=route(b,x);if(v<0){assert.equal(q.offs[0].dx,999,'fallback-smoke-unchanged');continue;}tested++;assert.equal(JSON.stringify(q.offs),JSON.stringify(A.bake671(v,false,1).smoke),'selected-smoke-offsets');assert(q.u596,'smoke-screen-anchor');assert.equal(route({...b,age:0},x).offs.length,0,'construction-smoke-cleared');C.window.__noT671=true;assert.equal(route(b,x).offs[0].dx,999,'smoke-valve-fallback');delete C.window.__noT671;}
 assert.equal(tested,10,'ten-smoke-selection-cases');
 C.window.__t596=true;for(let x=0;x<220;x++)assert.equal(A.spr671({k:1,lv:1},x,1),null,'explicit-preview-takes-priority');delete C.window.__t596;assert(!A.bake671(0,false,1).__t596,'independent-preview-marker');
 const silhouettes=new Set(),records=[];
 for(let vi=0;vi<10;vi++)for(const[sea,snow]of[[0,false],[1,false],[2,false],[3,false],[3,true]]){
  const s=A.bake671(vi,snow,sea),q=A.bake671(vi,snow,sea),px=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,np=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data,qp=q.img.getContext('2d').getImageData(0,0,q.w,q.h).data;
  assert.equal(hash(px),hash(qp),'deterministic-pixels');let ink=0,lit=0,edge=0;
  for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const p=(y*s.w+x)*4;if(px[p+3]){ink++;if(x===0||x===s.w-1||y===0||y===s.h-1)edge++;}if(np[p+3]){lit++;assert(px[p+3],'night-outside-body');}}
  assert(ink>400,'visible-model');assert(lit>5,'night-openings model '+vi);assert.equal(edge,0,'clipped-body');assert(Number.isFinite(s.ax)&&Number.isFinite(s.ay),'finite-anchor');
  if(sea===1){const mask=Buffer.from(Array.from(px).filter((_,i)=>i%4===3));silhouettes.add(hash(mask));const winter=A.bake671(vi,true,3);assert.notEqual(hash(px),hash(winter.img.getContext('2d').getImageData(0,0,winter.w,winter.h).data),'snow-changes-roof');}
  records.push({vi,sea,snow,w:s.w,h:s.h,ink,lit,hash:hash(px)});
 }
 assert.equal(silhouettes.size,10,'ten-distinct-silhouettes');return{passed:true,states:records.length,models:10,records};
}
const report=run();report.negativeControls=[];
for(const m of['duplicate','valve','smoke-disconnected','preview-priority']){let error='';try{run(m);}catch(e){error=e.message;}assert(error,'negative-control-did-not-fail:'+m);report.negativeControls.push({mutation:m,rejected:true,reason:error.split('\n')[0]});}
console.log(JSON.stringify(report,null,2));
