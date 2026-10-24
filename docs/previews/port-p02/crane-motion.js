/* Pure preview geometry and clock. No simulation state or random stream. */
(function(root,factory){const api=factory();root.QuayMotion=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const CYCLE=16000, LOW=20,HIGH=48, NEAR=1.10,FAR=1.90;
 const ease=t=>t*t*(3-2*t);
 function pose(ms,index=0){if(!Number.isFinite(ms))throw Error('Finite time required');const t=((ms+index*2000)%CYCLE+CYCLE)%CYCLE,stage=Math.floor(t/4000),u=ease((t%4000)/4000);return{stage,time:t,y:stage===0?NEAR:stage===1?NEAR+(FAR-NEAR)*u:stage===2?FAR:FAR-(FAR-NEAR)*u,z:stage===0?HIGH-(HIGH-LOW)*u:stage===1?LOW:stage===2?LOW+(HIGH-LOW)*u:HIGH};}
 function clock(){let elapsed=0,anchor=0,running=false;return{time(now){return elapsed+(running?Math.max(0,now-anchor):0);},play(now){if(!running){anchor=now;running=true;}},pause(now){elapsed=this.time(now);running=false;},reset(now){elapsed=0;anchor=now;running=false;},seek(ms,now){if(!Number.isFinite(ms)||ms<0)throw Error('Invalid seek');elapsed=ms;anchor=now;},get running(){return running;}};}
 function bounds(x,y,w,d,z,h){return{x0:x-w/2,x1:x+w/2,y0:y-d/2,y1:y+d/2,z0:z,z1:z+h};}
 function overlap(a,b){return a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0&&a.z0<b.z1&&a.z1>b.z0;}
 // Conservative AABB encloses every point of spreader, four ropes and trolley,
 // for all continuous times, not just a finite sample. z is native drawing units.
 function sweep(crane){return bounds(crane.x,crane.y+(NEAR+FAR)/2,.80,FAR-NEAR+.24,LOW,66-LOW);}
 function bodies(crane,ms,index){const p=pose(ms,index),y=crane.y+p.y;return{pose:p,spreader:bounds(crane.x,y,.76,.20,p.z,3),trolley:bounds(crane.x,y,.80,.24,64,2),ropes:[-.28,.28].flatMap(dx=>[-.06,.06].map(dy=>bounds(crane.x+dx,y+dy,.012,.012,p.z+3,64-p.z-3)))};}
 function clearance(crane,obstacles){const s=sweep(crane);return{safe:s.z0>0&&s.y0>=15&&!obstacles.some(o=>overlap(s,o.bounds||o)),sweep:s,intersections:obstacles.filter(o=>overlap(s,o.bounds||o))};}
 return{CYCLE,pose,clock,bounds,overlap,sweep,bodies,clearance};
});
