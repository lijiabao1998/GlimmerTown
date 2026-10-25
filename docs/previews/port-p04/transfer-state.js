/* 獨立候選貨櫃帳：同一時間推導船位、吊具、歸屬、數量、占用，沒有逐幀累加。 */
(function(root,factory){const api=factory();root.ContainerTransfer=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const CARGO=Object.freeze({id:'P03-original-row1-col0',length:.65,width:.5,height:5,color:'#d6a348'});
const TARGET=Object.freeze({x:29.25,y:36.3,angle:Math.PI}),PICK=Object.freeze({x:30,y:35.99,z:7}),DROP=Object.freeze({x:30,y:34.62,z:2});
const ease=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*ease(Math.max(0,Math.min(1,t)));
function shipCargo(p){const x=-.75,y=.31,c=Math.cos(p.angle),s=Math.sin(p.angle);return{x:p.x+c*x-s*y,y:p.y+s*x+c*y,z:7};}
function compile(base,options={}){
 const originalAt=options.originalAt||base.at.bind(base),berth=base.phases.find(p=>p.name==='berthed');if(!berth)throw Error('No completed berth phase');
 const geometry=options.geometry,errors=options.errors||[];let phaseTime=berth.start;
 const specs=[['align',12000],['settle',2000],['lower-to-ship',4000],['lock',1000],['lift',4000],['translate',5000],['lower-to-yard',4000],['release',1000],['raise',4000],['return-rig',5000],['realign',12000]];
 const phases=specs.map(([name,ms])=>{const p={name,start:phaseTime,end:phaseTime+ms};phaseTime+=ms;return p;});
 const end=phaseTime,extra=end-berth.start,pickup=phases.find(p=>p.name==='lift').start,delivery=phases.find(p=>p.name==='raise').start;
 function at(ms){if(!Number.isFinite(ms)||ms<0)throw Error('Finite nonnegative time required');
  const phase=phases.find(p=>ms>=p.start&&ms<p.end),u=phase?(ms-phase.start)/(phase.end-phase.start):0;
  let ship=originalAt(ms<berth.start?ms:ms<end?berth.start:ms-extra),rig={x:PICK.x,y:PICK.y,z:48},owner=ms<pickup?'ship':ms<delivery?'rig':'yard',status=phase?.name||(ms<berth.start?'await-berth':'delivered');
  if(errors.length){ship=originalAt(ms);owner='ship';status='rejected';}
  else if(phase){const p=phase.name;
   if(p==='align')ship={...ship,x:lerp(base.berth.x,TARGET.x,u),y:lerp(base.berth.y,TARGET.y,u),state:'p04-align'};
   else if(p==='realign')ship={...ship,x:lerp(TARGET.x,base.berth.x,u),y:lerp(TARGET.y,base.berth.y,u),state:'p04-realign'};
   else ship={...ship,...TARGET,state:'berthed'};
   if(p==='lower-to-ship')rig.z=lerp(48,12,u);
   if(p==='lock')rig.z=12;
   if(p==='lift')rig.z=lerp(12,48,u);
   if(p==='translate')rig.y=lerp(PICK.y,DROP.y,u);
   if(p==='lower-to-yard'){rig.y=DROP.y;rig.z=lerp(48,7,u);}
   if(p==='release'){rig.y=DROP.y;rig.z=7;}
   if(p==='raise'){rig.y=DROP.y;rig.z=lerp(7,48,u);}
   if(p==='return-rig')rig.y=lerp(DROP.y,PICK.y,u);
  }
  const position=owner==='ship'?shipCargo(ship):owner==='rig'?{x:rig.x,y:rig.y,z:rig.z-CARGO.height}:{...DROP};
  return{time:ms,status,owner,cargo:{...CARGO,...position},ship,rig,counts:{ship:owner==='ship'?6:5,rig:owner==='rig'?1:0,yard:owner==='yard'?25:24,total:30},occupied:owner==='yard'?[{id:CARGO.id,...DROP}]:[],progress:errors.length?0:Math.max(0,Math.min(1,(ms-berth.start)/(delivery-berth.start))),errors};
 }
 return{phases,start:berth.start,end,extra,pickup,delivery,duration:base.duration+extra,geometry,errors,at};
}
return{CARGO,TARGET,PICK,DROP,shipCargo,compile};});
