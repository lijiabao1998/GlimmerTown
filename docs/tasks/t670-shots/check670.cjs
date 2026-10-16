/* T670 真 Canvas 像素結構驗證；不代替 Chrome／CI fp 原件。 */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const src=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
function run(mutation){
 const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
 const C={window:{},location:{search:''},Map,Math,Error,season:()=>1,streetHash:(x,y,s)=>((x*13+y*7+s)%220)/220,cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
 vm.createContext(C);vm.runInContext(part('function lotLine574(','function lotVariant574(')+part('function makeIso590(','function silhouette590(')+part('/* T670：第一波','/* T670 END')+(mutation==='duplicate'?'CATALOG670[1]=CATALOG670[0];':'')+(mutation==='valve'?'t670On=function(){return true;};':'')+'this.api={bake670,spr670,variant670,t670On,CATALOG670};',C);
 const A=C.api,hash=x=>crypto.createHash('sha256').update(x).digest('hex');
 assert.equal(A.CATALOG670.length,10,'model-count');assert.equal(new Set(A.CATALOG670.map(d=>d.id)).size,10,'model-identity');
 const expected=['parapet','dutch','gable','halfhip','catslide','stepped','hip','barrel','northlight','mansard'];
 assert.deepEqual(Array.from(A.CATALOG670,d=>d.m[0][6]),expected,'roof-structure-contract');
 assert.equal(A.t670On(),true,'valve-default');C.window.__noT670=true;assert.equal(A.t670On(),false,'global-valve');assert.equal(A.spr670({k:2,lv:1},1,1),null,'global-valve-fallback');C.window.__noT670=false;
 delete A.t670On.off;C.location.search='?noT670=1';assert.equal(A.t670On(),false,'query-valve');delete A.t670On.off;C.location.search='';
 for(const b of[{k:1},{k:3},{k:2,lv:2},{k:2,sz:2},{k:2,ref:[0,0]},{k:2,lot574:1}])assert.equal(A.variant670(b,1,2),-1,'unrelated-building');
 const b={k:2,lv:1,age:30},before=JSON.stringify(b),selected=new Set();for(let x=0;x<220;x++)selected.add(A.variant670(b,x,1));assert.equal(selected.size,11,'ten-models-and-old-fallback');assert.equal(JSON.stringify(b),before,'no-save-writes');
 const silhouettes=new Set(),records=[];
 for(let vi=0;vi<10;vi++)for(const[sea,snow]of[[0,false],[1,false],[2,false],[3,false],[3,true]]){
  const s=A.bake670(vi,snow,sea),q=A.bake670(vi,snow,sea),px=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,np=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data,qp=q.img.getContext('2d').getImageData(0,0,q.w,q.h).data;
  assert.equal(hash(px),hash(qp),'deterministic-pixels');let ink=0,lit=0,edge=0;
  for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const p=(y*s.w+x)*4;if(px[p+3]){ink++;if(x===0||x===s.w-1||y===0||y===s.h-1)edge++;}if(np[p+3]){lit++;assert(px[p+3],'night-outside-body');}}
  assert(ink>400,'visible-model');assert(lit>5,'night-windows');assert.equal(edge,0,'clipped-body');assert(Number.isFinite(s.ax)&&Number.isFinite(s.ay),'finite-anchor');
  if(sea===1){const mask=Buffer.from(Array.from(px).filter((_,i)=>i%4===3));silhouettes.add(hash(mask));const winter=A.bake670(vi,true,3);assert.notEqual(hash(px),hash(winter.img.getContext('2d').getImageData(0,0,winter.w,winter.h).data),'snow-changes-roof');}
  records.push({vi,sea,snow,w:s.w,h:s.h,ink,lit,hash:hash(px)});
 }
 assert.equal(silhouettes.size,10,'ten-distinct-silhouettes');return{passed:true,states:records.length,models:10,records};
}
const report=run();report.negativeControls=[];
for(const m of['duplicate','valve']){let error='';try{run(m);}catch(e){error=e.message;}assert(error,'negative-control-did-not-fail:'+m);report.negativeControls.push({mutation:m,rejected:true,reason:error.split('\n')[0]});}
console.log(JSON.stringify(report,null,2));
