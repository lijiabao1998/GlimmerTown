/* T677 BEGIN：P01–P06正式單港單批；不改原城市經濟或存檔。 */
function t677On(){if(t677On.off===undefined){const q=(typeof location!=='undefined'&&location.search)||'';t677On.off=/(?:^|[?&])noT677(?:=1)?(?:&|$)/.test(q);}return !window.__noT677&&!t677On.off;}
/* Pure preview geometry and clock. No simulation state or random stream. */
(function(root,factory){const api=factory();root.QuayMotion=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const CYCLE=16000, LOW=20,HIGH=48, NEAR=1.10,FAR=1.90;
 const ease=t=>t*t*(3-2*t);
 function pose(ms,index=0){if(!Number.isFinite(ms))throw Error('Finite time required');const t=((ms+index*2000)%CYCLE+CYCLE)%CYCLE,stage=Math.floor(t/4000),u=ease((t%4000)/4000);return{stage,time:t,y:stage===0?NEAR:stage===1?NEAR+(FAR-NEAR)*u:stage===2?FAR:FAR-(FAR-NEAR)*u,z:stage===0?HIGH-(HIGH-LOW)*u:stage===1?LOW:stage===2?LOW+(HIGH-LOW)*u:HIGH};}
 function bounds(x,y,w,d,z,h){return{x0:x-w/2,x1:x+w/2,y0:y-d/2,y1:y+d/2,z0:z,z1:z+h};}
 function overlap(a,b){return a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0&&a.z0<b.z1&&a.z1>b.z0;}
 // Conservative AABB encloses every point of spreader, four ropes and trolley,
 // for all continuous times, not just a finite sample. z is native drawing units.
 function sweep(crane){return bounds(crane.x,crane.y+(NEAR+FAR)/2,.80,FAR-NEAR+.24,LOW,66-LOW);}
 function bodies(crane,ms,index){const p=pose(ms,index),y=crane.y+p.y;return{pose:p,spreader:bounds(crane.x,y,.76,.20,p.z,3),trolley:bounds(crane.x,y,.80,.24,64,2),ropes:[-.28,.28].flatMap(dx=>[-.06,.06].map(dy=>bounds(crane.x+dx,y+dy,.012,.012,p.z+3,64-p.z-3)))};}
 function clearance(crane,obstacles){const s=sweep(crane);return{safe:s.z0>0&&s.y0>=15&&!obstacles.some(o=>overlap(s,o.bounds||o)),sweep:s,intersections:obstacles.filter(o=>overlap(s,o.bounds||o))};}
 return{CYCLE,pose,bounds,overlap,sweep,bodies,clearance};
});

/* P03 pure deterministic navigation. Native tile units; no RNG, economy or saved state. */
(function(root,factory){const api=factory();root.VesselNavigation=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const HULL=Object.freeze({length:5,width:1.4,height:17}),RADIUS=4,DIR=[[1,0],[0,1],[-1,0],[0,-1]],EPS=1e-8;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),norm=a=>((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
function corners(p,h=HULL,extra=0){const c=Math.cos(p.angle),s=Math.sin(p.angle),l=h.length/2+extra,w=h.width/2+extra;return [[-l,-w],[l,-w],[l,w],[-l,w]].map(([x,y])=>[p.x+c*x-s*y,p.y+s*x+c*y]);}
function intersects(poly,x,y){const axes=[[1,0],[0,1]];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];axes.push([-(b[1]-a[1]),b[0]-a[0]]);}const cell=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];return axes.every(([u,v])=>{const a=poly.map(p=>p[0]*u+p[1]*v),b=cell.map(p=>p[0]*u+p[1]*v);return Math.min(...a)<Math.max(...b)-EPS&&Math.max(...a)>Math.min(...b)+EPS;});}
function water(grid,x,y,portal){if(x>=0&&y>=0&&x<grid.width&&y<grid.height)return !!grid.cells[y*grid.width+x];return !!portal&&y>=grid.height&&x>=portal.x0&&x<portal.x1;}
function validPose(grid,p,h=HULL,extra=0,portal=null){const poly=corners(p,h,extra),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);for(let y=Math.floor(Math.min(...ys));y<Math.ceil(Math.max(...ys));y++)for(let x=Math.floor(Math.min(...xs));x<Math.ceil(Math.max(...xs));x++)if(!water(grid,x,y,portal)&&intersects(poly,x,y))return false;return true;}
function occupied(grid,p,h=HULL){const a=corners(p,h),xs=a.map(v=>v[0]),ys=a.map(v=>v[1]),out=[];for(let y=Math.floor(Math.min(...ys));y<Math.ceil(Math.max(...ys));y++)for(let x=Math.floor(Math.min(...xs));x<Math.ceil(Math.max(...xs));x++)if(intersects(a,x,y))out.push([x,y]);return out;}
function line(a,b){const length=dist(a,b);return{kind:'line',a:{...a},b:{...b},length,pose(u){return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,angle:a.angle};}};}
function turn(a,sign,r=RADIUS){const cx=a.x-sign*Math.sin(a.angle)*r,cy=a.y+sign*Math.cos(a.angle)*r,delta=sign*Math.PI/2;return{kind:'arc',a:{...a},length:r*Math.PI/2,radius:r,delta,pose(u){const angle=a.angle+delta*u;return{x:cx+sign*Math.sin(angle)*r,y:cy-sign*Math.cos(angle)*r,angle:norm(angle)};}};}
// Each interval uses an inflated midpoint OBB containing every hull point throughout it.
// Bound = center arc travel + rotation travel of the farthest hull point; conservative, continuous.
function swept(grid,segment,h=HULL,portal=null){const n=Math.max(1,Math.ceil(segment.length/.16)),corner=Math.hypot(h.length,h.width)/2,da=Math.abs(segment.delta||0)/n,extra=segment.length/n/2+corner*da/2+1e-7;for(let i=0;i<n;i++)if(!validPose(grid,segment.pose((i+.5)/n),h,extra,portal))return false;return validPose(grid,segment.pose(0),h,0,portal)&&validPose(grid,segment.pose(1),h,0,portal);}
function component(grid,start){const sx=Math.floor(start.x),sy=Math.floor(start.y);if(!water(grid,sx,sy))return new Set();const seen=new Set([sy*grid.width+sx]),q=[[sx,sy]];for(let n=0;n<q.length;n++){const[x,y]=q[n];for(const[dx,dy]of DIR){const a=x+dx,b=y+dy,k=b*grid.width+a;if(a>=0&&b>=0&&a<grid.width&&b<grid.height&&water(grid,a,b)&&!seen.has(k)){seen.add(k);q.push([a,b]);}}}return seen;}
function search(grid,start,goal,h=HULL){const key=p=>`${Math.round(p.x*2)},${Math.round(p.y*2)},${Math.round(norm(p.angle)/(Math.PI/2))%4}`,target=key(goal),open=[{p:start,g:0,f:dist(start,goal),seq:0}],best=new Map([[key(start),0]]),parent=new Map();let serial=1,expanded=0;while(open.length&&expanded++<40000){open.sort((a,b)=>a.f-b.f||a.g-b.g||a.seq-b.seq);const n=open.shift(),k=key(n.p);if(n.g>best.get(k)+EPS)continue;if(k===target){const out=[];let cur=k;while(parent.has(cur)){const e=parent.get(cur);out.push(e.s);cur=e.from;}return{segments:out.reverse(),expanded};}const d=DIR[Math.round(norm(n.p.angle)/(Math.PI/2))%4],f=line(n.p,{x:n.p.x+d[0],y:n.p.y+d[1],angle:n.p.angle});for(const s of[f,turn(n.p,-1),turn(n.p,1)]){const p=s.pose(1);p.x=Math.round(p.x*2)/2;p.y=Math.round(p.y*2)/2;const nk=key(p),g=n.g+s.length;if(g>=(best.get(nk)??Infinity)-EPS||!swept(grid,s,h))continue;best.set(nk,g);parent.set(nk,{from:k,s});open.push({p,g,f:g+dist(p,goal),seq:serial++});}}throw Error('No complete swept-hull route to berth or exit');}
function mergeLines(a){const out=[];for(const s of a){const p=out.at(-1);if(p&&p.kind==='line'&&s.kind==='line'&&Math.abs(norm(p.a.angle)-norm(s.a.angle))<EPS)out[out.length-1]=line(p.a,s.b);else out.push(s);}return out;}
function profile(length,v0,v1,limit,a=.6){const peak=Math.min(limit,Math.sqrt(a*length+(v0*v0+v1*v1)/2)),t0=(peak-v0)/a,t1=(peak-v1)/a,d0=(v0+peak)*t0/2,d1=(v1+peak)*t1/2,dc=Math.max(0,length-d0-d1),tc=dc/peak,total=t0+tc+t1;return{duration:total*1000,at(ms){const t=Math.max(0,Math.min(total,ms/1000));if(t<t0)return v0*t+a*t*t/2;if(t<t0+tc)return d0+peak*(t-t0);const q=t-t0-tc;return Math.min(length,d0+dc+peak*q-a*q*q/2);}};}
function compile(grid,opts={}){const h=opts.hull||HULL,berth=opts.berth||{x:26.5,y:36.5,angle:Math.PI,quayY:35},entry=opts.entry||{x:40.5,y:grid.height-3.5,angle:Math.PI*1.5},portal={x0:Math.floor(entry.x-h.width/2-.5),x1:Math.ceil(entry.x+h.width/2+.5)},outside={x:entry.x,y:grid.height+h.length/2+.6,angle:entry.angle};if(Math.abs(Math.sin(berth.angle))>EPS||berth.y-h.width/2<=berth.quayY||berth.y-h.width/2-berth.quayY>1)throw Error('Wrong berth alignment or quay clearance');
const conn=component(grid,berth);if(!conn.has((grid.height-1)*grid.width+Math.floor(entry.x)))throw Error('Harbor has no connected boundary exit');const arrival=line(outside,entry);if(!swept(grid,arrival,h,portal))throw Error('Boundary entrance cannot fit full hull');if(!validPose(grid,berth,h))throw Error('Berth cannot fit full hull');
const inbound=search(grid,entry,berth,h),exitPose={...entry,angle:Math.PI/2},outbound=search(grid,berth,exitPose,h),end={...outside,angle:Math.PI/2},departure=line(exitPose,end);if(!swept(grid,departure,h,portal))throw Error('Boundary exit cannot fit full hull');
const phases=[];let time=0;const hold=(name,ms,p,visible)=>{phases.push({name,start:time,end:time+ms,pose:()=>({...p}),visible});time+=ms;};const travel=(ss,out)=>{ss=mergeLines(ss);const limits=ss.map((s,i)=>s.kind==='arc'?.65:((!out&&i===ss.length-1)||(out&&i===0))?.4:1.5);const velocities=[0,...limits.slice(1).map((v,i)=>Math.min(v,limits[i])),0];ss.forEach((s,i)=>{const pr=profile(s.length,velocities[i],velocities[i+1],limits[i]);phases.push({name:out?(i===0?'unberthing':'outbound'):(i===ss.length-1?'berthing':'inbound'),start:time,end:time+pr.duration,segment:s,pose:t=>s.pose(pr.at(t)/s.length),visible:true});time+=pr.duration;});};hold('waiting',2000,outside,false);travel([arrival,...inbound.segments],false);hold('berthed',6000,berth,true);travel([...outbound.segments,departure],true);hold('outside',2000,end,false);return{grid,hull:h,berth,entry,portal,phases,duration:time,expanded:inbound.expanded+outbound.expanded,segments:[arrival,...inbound.segments,...outbound.segments,departure],at(ms){if(!Number.isFinite(ms)||ms<0)throw Error('Finite nonnegative time required');const t=ms%time,p=phases.find(p=>t<p.end)||phases.at(-1),pose=p.pose(t-p.start);return{...pose,state:p.name,time:t,visible:p.visible&&pose.y-h.length/2<grid.height};}};}
return{HULL,RADIUS,corners,intersects,validPose,occupied,swept,line,turn,component,search,compile,profile};});

/* P04 retained-geometry audit. World x/y are tiles; z is native drawing height.
 * P01B part coordinates alone receive +20. No coordinate, collider or tile edits.
 * Strict intersection rejects penetration; face contact remains legal.
 */
(function(root,factory){const api=factory();root.PortTransferGeometry=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const EPS=1e-9,CARGO=Object.freeze({w:.65,d:.5,h:5}),RIG=Object.freeze({spreaderW:.76,spreaderD:.20,spreaderH:3,trolleyW:.80,trolleyD:.24,trolleyZ:64,trolleyH:2,ropeW:.012});
 function cargoShape(value={}){const c={w:value.w===undefined?(value.length===undefined?CARGO.w:value.length):value.w,d:value.d===undefined?(value.width===undefined?CARGO.d:value.width):value.d,h:value.h===undefined?(value.height===undefined?CARGO.h:value.height):value.h};if(!Object.values(c).every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid cargo dimensions');return c;}
 function bounds(x,y,w,d,z,h){return{x0:x-w/2,x1:x+w/2,y0:y-d/2,y1:y+d/2,z0:z,z1:z+h};}
 function overlap(a,b){return a.x0<b.x1-EPS&&a.x1>b.x0+EPS&&a.y0<b.y1-EPS&&a.y1>b.y0+EPS&&a.z0<b.z1-EPS&&a.z1>b.z0+EPS;}
 function union(a,b){return{x0:Math.min(a.x0,b.x0),x1:Math.max(a.x1,b.x1),y0:Math.min(a.y0,b.y0),y1:Math.max(a.y1,b.y1),z0:Math.min(a.z0,b.z0),z1:Math.max(a.z1,b.z1)};}
 function axisGaps(a,b){const out={};for(const k of ['x','y','z'])out[k]=Math.max(b[k+'0']-a[k+'1'],a[k+'0']-b[k+'1']);return out;}
 function separation(a,b){const g=axisGaps(a,b);return Math.max(g.x,g.y,g.z);}
 function validBox(b){return ['x','y','z'].every(k=>Number.isFinite(b[k+'0'])&&Number.isFinite(b[k+'1'])&&b[k+'1']>=b[k+'0']);}
 function staticObstacles(parts,options={}){
  const offset=options.offset===undefined?20:options.offset,out=[];
  const add=(id,kind,b,extra={})=>out.push({id,name:id,kind,bounds:b,...extra});
  const box=(id,kind,x,y,w,d,z,h,extra)=>add(id,kind,bounds(x,y,w,d,z,h),extra);
  // A line is not a filled gantry side. Subdivision retains its actual diagonal.
  // Padding deliberately exceeds 3px/64tile in plan; z covers the 3px stroke.
  const line=(id,kind,a,b,xyPad=.06,zPad=1.5,n=32)=>{for(let i=0;i<n;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/n),q=a.map((v,k)=>v+(b[k]-v)*(i+1)/n);add(id+'/'+i,kind,{x0:Math.min(p[0],q[0])-xyPad,x1:Math.max(p[0],q[0])+xyPad,y0:Math.min(p[1],q[1])-xyPad,y1:Math.max(p[1],q[1])+xyPad,z0:Math.min(p[2],q[2])-zPad,z1:Math.max(p[2],q[2])+zPad});}};
  parts.forEach((p,index)=>{
   const x=p.x+offset,y=p.y+offset,id=p.type+'-'+index;
   if(['box','slab','edge'].includes(p.type)){
    box(id,p.type,x,y,p.w,p.d,p.base||0,p.h,{support:p.type==='slab'||p.type==='box'});
    if(p.type==='edge')box(id+'/bollard','bollard',x,y+.08,.14,.13,0,3);
   }
   if(p.type!=='crane')return;
   for(const dx of[-.48,.48])for(const dy of[-.52,.52]){
    box(id+'/foot/'+dx+'/'+dy,'foot',x+dx,y+dy,.22,.22,0,4);
    box(id+'/pillar/'+dx+'/'+dy,'pillar',x+dx,y+dy,.12,.15,2,65);
   }
   for(const dx of[-.48,.48]){
    line(id+'/brace-a/'+dx,'brace',[x+dx,y-.52,5],[x+dx,y+.52,61]);
    line(id+'/brace-b/'+dx,'brace',[x+dx,y+.52,5],[x+dx,y-.52,61]);
   }
   box(id+'/crossbar','crossbar',x,y,.95,.5,59,8);
   box(id+'/cabin','cabin',x,y+.5,.4,.35,56,7);
   for(let rung=8;rung<58;rung+=5)line(id+'/rung/'+rung,'ladder',[x+.41,y-.55,rung],[x+.55,y-.55,rung],.025,.5,1);
   // Unchanged P02 conservative upper-assembly envelope. It contains beams,
   // stays and mast centerlines and lamps; its underside is z67, not z68.
   box(id+'/upper','upper',x,y+.725,1.12,2.95,67,22);
  });
  return out;
 }
 function rigBodies(x,y,spreaderZ){
  if(![x,y,spreaderZ].every(Number.isFinite)||spreaderZ+RIG.spreaderH>RIG.trolleyZ)throw Error('Invalid rig pose');
  return{spreader:bounds(x,y,RIG.spreaderW,RIG.spreaderD,spreaderZ,RIG.spreaderH),trolley:bounds(x,y,RIG.trolleyW,RIG.trolleyD,RIG.trolleyZ,RIG.trolleyH),ropes:[-.28,.28].flatMap(dx=>[-.06,.06].map(dy=>bounds(x+dx,y+dy,RIG.ropeW,RIG.ropeW,spreaderZ+RIG.spreaderH,RIG.trolleyZ-spreaderZ-RIG.spreaderH)))};
 }
 function bodyList(x,y,z,loaded,cargo=CARGO){cargo=cargoShape(cargo);const r=rigBodies(x,y,z),a=[{id:'spreader',bounds:r.spreader},{id:'trolley',bounds:r.trolley},...r.ropes.map((b,i)=>({id:'rope-'+i,bounds:b}))];if(loaded)a.push({id:'cargo',bounds:bounds(x,y,cargo.w,cargo.d,z-cargo.h,cargo.h)});return a;}
 function worldPoint(p,x,y){const c=Math.cos(p.angle),s=Math.sin(p.angle);return[p.x+c*x-s*y,p.y+s*x+c*y];}
 function polygonBox(points,z,h){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),z0:z,z1:z+h};}
 function shipCargo(pose){const out=[];for(let row=0;row<2;row++)for(let col=0;col<3;col++){const x=-.75+col*.72,y=-.31+row*.62,c=worldPoint(pose,x,y),b=polygonBox([[-.325,-.25],[.325,-.25],[.325,.25],[-.325,.25]].map(([dx,dy])=>worldPoint(pose,x+dx,y+dy)),7,5);out.push({id:'P03-original-row'+row+'-col'+col,row,col,x:c[0],y:c[1],z:7,bounds:b,kind:'ship-cargo'});}return out;}
 function shipObstacles(pose,options={}){
  const out=[],poly=(id,xy,z,h)=>out.push({id,name:id,kind:'ship',bounds:polygonBox(xy.map(([x,y])=>worldPoint(pose,x,y)),z,h)});
  poly('ship-hull',[[-2.5,-.55],[1.65,-.7],[2.5,0],[1.65,.7],[-2.5,.55]],1,5);
  poly('ship-deck',[[-2.35,-.5],[1.6,-.6],[2.25,0],[1.6,.6],[-2.35,.5]],6,1);
  const box=(id,x,y,w,d,z,h)=>poly(id,[[x-w/2,y-d/2],[x+w/2,y-d/2],[x+w/2,y+d/2],[x-w/2,y+d/2]],z,h);
  box('ship-cabin',-1.85,0,.62,1,7,8);box('ship-cabin-cap',-1.85,0,.66,1.06,13,2);box('ship-mast',-1.95,0,.25,.3,15,2);
  const excluded=new Set([].concat(options.excludeCargoId||options.excludeCargoIds||[]));
  return out.concat(shipCargo(pose).filter(c=>!excluded.has(c.id)));
 }
 function supportAt(target,obstacles,cargo=CARGO){
  cargo=cargoShape(cargo);
  const footprint=bounds(target.x,target.y,cargo.w,cargo.d,target.z,cargo.h),corners=[[footprint.x0,footprint.y0],[footprint.x1,footprint.y0],[footprint.x1,footprint.y1],[footprint.x0,footprint.y1]],surfaces=obstacles.filter(o=>o.support&&Math.abs(o.bounds.z1-target.z)<EPS);
  // Retained .98-tile slabs have .02 expansion joints. All four container
  // corners must rest on coplanar solid supports; an edge-only balance is invalid.
  const cornerSupport=corners.map(([x,y])=>surfaces.filter(o=>x>=o.bounds.x0-EPS&&x<=o.bounds.x1+EPS&&y>=o.bounds.y0-EPS&&y<=o.bounds.y1+EPS).map(o=>o.id));
  return{safe:cornerSupport.every(a=>a.length>0),cornerSupport,z:target.z};
 }
 function phaseSweeps(phase,cargo=CARGO){const a=bodyList(phase.a.x,phase.a.y,phase.a.z,phase.loaded,cargo),b=bodyList(phase.b.x,phase.b.y,phase.b.z,phase.loaded,cargo);return a.map((v,i)=>({id:v.id,bounds:union(v.bounds,b[i].bounds)}));}
 function validateSweep(source,target,height,options={}){
  if(source&&source.source){const all=source;source=all.source;target=all.target;height=all.liftZ===undefined?48:all.liftZ;options=all;}
  const cargo=cargoShape(options.cargo),liftZ=height===undefined?48:height,obstacles=options.obstacles||[],pick=source.z+cargo.h,drop=target.z+cargo.h;
  if(![source.x,source.y,source.z,target.x,target.y,target.z,liftZ].every(Number.isFinite)||liftZ<Math.max(pick,drop)||liftZ+RIG.spreaderH>RIG.trolleyZ||Math.abs(source.x-target.x)>EPS)throw Error('Transfer requires a finite same-x original gantry path');
  if(!obstacles.every(o=>validBox(o.bounds||o)))throw Error('Invalid obstacle bounds');
  const p=(v,z)=>({x:v.x,y:v.y,z}),phases=[
   {name:'approach',a:p(source,liftZ),b:p(source,pick),loaded:false},
   {name:'hoist',a:p(source,pick),b:p(source,liftZ),loaded:true},
   {name:'traverse',a:p(source,liftZ),b:p(target,liftZ),loaded:true},
   {name:'lower',a:p(target,liftZ),b:p(target,drop),loaded:true},
   {name:'release-lift',a:p(target,drop),b:p(target,liftZ),loaded:false},
   {name:'return',a:p(target,liftZ),b:p(source,liftZ),loaded:false}
  ];
  const failures=[],margins={};
  const tested=phases.map(phase=>{
   const sweeps=phaseSweeps(phase,cargo),hits=[];
   for(const body of sweeps)for(const obstacle of obstacles){const b=obstacle.bounds||obstacle,g=axisGaps(body.bounds,b),distance=Math.max(g.x,g.y,g.z);if(overlap(body.bounds,b)){const hit={phase:phase.name,body:body.id,obstacle:obstacle.id||obstacle.name||'obstacle',gaps:g};hits.push(hit);failures.push(hit);}else{const key=body.id+'/'+(obstacle.kind||'obstacle');if(!margins[key]||distance<margins[key].distance)margins[key]={distance,axisGaps:g,phase:phase.name,obstacle:obstacle.id||obstacle.name||'obstacle'};}}
   return{...phase,sweeps,hits};
  });
  const support=options.requireSupport===false?{safe:true,skipped:true}:supportAt(target,obstacles,cargo);
  const rail=options.crane?{safe:Math.min(source.y,target.y)-RIG.trolleyD/2>=options.crane.y-.7-EPS&&Math.max(source.y,target.y)+RIG.trolleyD/2<=options.crane.y+2.15+EPS&&Math.abs(source.x-options.crane.x)<EPS,min:options.crane.y-.7,max:options.crane.y+2.15}:null;
  return{safe:failures.length===0&&support.safe&&(!rail||rail.safe),source:{...source},target:{...target},liftZ,cargo,phases:tested,failures,support,rail,margins,method:'Continuous monotone AABB phase envelopes; exact solid boxes; retained padded upper envelope and subdivided brace envelopes; four-corner coplanar support'};
 }
 return{EPS,CARGO,RIG,cargoShape,bounds,overlap,union,axisGaps,separation,staticObstacles,rigBodies,bodyList,shipCargo,shipObstacles,supportAt,phaseSweeps,validateSweep};
});

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

/* Pure projected-face visibility, used only by the P04 transfer overlay.
 * Screen vertices retain native world height: [screenX, screenY, worldZ].
 * At one isometric viewing ray, larger worldZ is nearer the camera.
 */
(function(root,factory){const api=factory();root.PortTransferOcclusion=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const EPS=1e-7;
 function area(poly){let n=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];n+=a[0]*b[1]-b[0]*a[1];}return n/2;}
 function plane(poly){for(let i=1;i<poly.length-1;i++){const[a,b,c]=[poly[0],poly[i],poly[i+1]],d=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(d)<EPS)continue;const x=((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/d,y=((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/d;return[x,y,a[2]-x*a[0]-y*a[1]];}return null;}
 function prepare(points,project){if(points&&points.polygon&&'plane'in points)return points;const polygon=project?points.map(p=>project(...p)):points.map(p=>[p[0],p[1],p[2]]),p=plane(polygon);return{polygon,plane:p,bounds:{x0:Math.min(...polygon.map(p=>p[0])),x1:Math.max(...polygon.map(p=>p[0])),y0:Math.min(...polygon.map(p=>p[1])),y1:Math.max(...polygon.map(p=>p[1]))},area:Math.abs(area(polygon))};}
 function zAt(face,x,y){const p=face.plane;return p[0]*x+p[1]*y+p[2];}
 function clipHalfPlane(poly,a,b,c,epsilon=EPS){const out=[];if(!poly.length)return out;let prev=poly.at(-1),pv=a*prev[0]+b*prev[1]+c,pi=pv>=-epsilon;for(const cur of poly){const cv=a*cur[0]+b*cur[1]+c,ci=cv>=-epsilon;if(ci!==pi){const t=pv/(pv-cv);out.push([prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])]);}if(ci)out.push([cur[0],cur[1]]);prev=cur;pv=cv;pi=ci;}return out;}
 function edgePlanes(poly){const sign=area(poly)>=0?1:-1;return poly.map((p,i)=>{const q=poly[(i+1)%poly.length],a=-(q[1]-p[1])*sign,b=(q[0]-p[0])*sign;return[a,b,-a*p[0]-b*p[1]];});}
 function intersection(subject,clip){let out=subject.map(p=>[p[0],p[1]]);for(const p of edgePlanes(clip)){out=clipHalfPlane(out,...p);if(out.length<3)return[];}return Math.abs(area(out))>EPS?out:[];}
 function boundsOverlap(a,b){return a.x0<b.x1-EPS&&a.x1>b.x0+EPS&&a.y0<b.y1-EPS&&a.y1>b.y0+EPS;}
 function occlusionMasks(cargoFaceScreen3d,otherFacesScreen3d){const cargo=prepare(cargoFaceScreen3d),out=[];if(!cargo.plane||cargo.area<EPS)return out;for(const other of otherFacesScreen3d){const o=prepare(other);if(!o.plane||o.area<EPS||!boundsOverlap(cargo.bounds,o.bounds))continue;let poly=intersection(cargo.polygon,o.polygon);if(!poly.length)continue;const a=o.plane[0]-cargo.plane[0],b=o.plane[1]-cargo.plane[1],c=o.plane[2]-cargo.plane[2]-EPS;poly=clipHalfPlane(poly,a,b,c,0);if(poly.length>=3&&Math.abs(area(poly))>EPS)out.push(poly);}return out;}
 // Exact difference of convex polygons as disjoint convex pieces. Successive
 // differences subtract the UNION of masks, never their even-odd XOR.
 function difference(subject,clip){let inside=subject.map(p=>[p[0],p[1]]);const outside=[];for(const[a,b,c]of edgePlanes(clip)){const piece=clipHalfPlane(inside,-a,-b,-c,0);if(piece.length>=3&&Math.abs(area(piece))>EPS)outside.push(piece);inside=clipHalfPlane(inside,a,b,c,0);if(inside.length<3||Math.abs(area(inside))<=EPS)break;}return outside;}
 function subtractMasks(cargo,masks){if(!cargo.plane||cargo.area<EPS)return[];let pieces=[cargo.polygon.map(p=>[p[0],p[1]])];for(const mask of masks){pieces=pieces.flatMap(piece=>difference(piece,mask));if(!pieces.length)break;}return pieces.map(poly=>poly.map(([x,y])=>[x,y,zAt(cargo,x,y)]));}
 function visible(cargoFaceScreen3d,otherFacesScreen3d){const cargo=prepare(cargoFaceScreen3d);return subtractMasks(cargo,occlusionMasks(cargo,otherFacesScreen3d));}
 // Create once per rendered frame. Equivalent opaque/rgba paths reuse results.
 function createCache(occluders){const others=occluders.map(p=>prepare(p)),cache=new Map();function get(points){const f=prepare(points),key=f.polygon.map(p=>p.join(',')).join(';');if(!cache.has(key))cache.set(key,{face:f,masks:occlusionMasks(f,others)});return cache.get(key);}return{occluders:others,masks(points){return get(points).masks;},visible(points){const r=get(points);if(!r.visible)r.visible=subtractMasks(r.face,r.masks);return r.visible;},get size(){return cache.size;}};}
 function batch(cargoFaces,occluders){const others=occluders.map(p=>prepare(p));return cargoFaces.map(p=>{const face=prepare(p);return{face,polygons:visible(face,others)};});}
 return{EPS,area,plane,prepare,zAt,clipHalfPlane,intersection,difference,occlusionMasks,visible,batch,createCache};
});

/* 候選真道路、全車占用與低位伸縮轉運吊機；不改城市格或正式經濟。 */
(function(r,f){const a=f();r.LandsideGeometry=a;if(typeof module==='object'&&module.exports)module.exports=a;})(typeof window==='object'?window:globalThis,function(){
'use strict';const EPS=1e-9,TRUCK=Object.freeze({length:2,width:.7,height:9,deckLength:1.05,deckWidth:.62,deckZ:4,cargoOffset:-.25}),LOAD=Object.freeze({x:29.75,y:31.5,angle:Math.PI}),GATE=Object.freeze({x:22,y:31.5,direction:-1}),key=(x,y)=>x+','+y;
const box=(x,y,w,d,z,h)=>({x0:x-w/2,x1:x+w/2,y0:y-d/2,y1:y+d/2,z0:z,z1:z+h}),hit=(a,b)=>a.x0<b.x1-EPS&&a.x1>b.x0+EPS&&a.y0<b.y1-EPS&&a.y1>b.y0+EPS&&a.z0<b.z1-EPS&&a.z1>b.z0+EPS;
function corners(p,body=TRUCK){const c=Math.cos(p.angle),s=Math.sin(p.angle);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[p.x+c*x*body.length/2-s*y*body.width/2,p.y+s*x*body.length/2+c*y*body.width/2]);}
function bounds(p,body=TRUCK){const q=corners(p,body);return{x0:Math.min(...q.map(v=>v[0])),x1:Math.max(...q.map(v=>v[0])),y0:Math.min(...q.map(v=>v[1])),y1:Math.max(...q.map(v=>v[1])),z0:0,z1:body.height};}
function roads(addConnector=true){const cells=new Set();for(let x=22;x<=43;x++)cells.add(key(x,31));if(addConnector)for(let x=19;x<22;x++)cells.add(key(x,31));return cells;}
function intersectsCell(poly,x,y){const axes=[[1,0],[0,1]];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];axes.push([a[1]-b[1],b[0]-a[0]]);}const cell=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];for(const[a,b]of axes){const p=poly.map(v=>v[0]*a+v[1]*b),q=cell.map(v=>v[0]*a+v[1]*b);if(Math.max(...p)<=Math.min(...q)+EPS||Math.max(...q)<=Math.min(...p)+EPS)return false;}return true;}
function occupied(p,body=TRUCK){const poly=corners(p,body),b=bounds(p,body),out=[];for(let y=Math.floor(b.y0);y<Math.ceil(b.y1);y++)for(let x=Math.floor(b.x0);x<Math.ceil(b.x1);x++)if(intersectsCell(poly,x,y))out.push(key(x,y));return out;}
function legal(p,cells,obstacles=[],body=TRUCK){const missing=occupied(p,body).filter(k=>!cells.has(k)),b=bounds(p,body),hits=obstacles.filter(o=>hit(b,o.bounds||o)).map(o=>o.id||'obstacle');return{safe:!missing.length&&!hits.length,missing,hits};}
function line(a,b){const angle=Math.atan2(b.y-a.y,b.x-a.x),length=Math.hypot(b.x-a.x,b.y-a.y);return{kind:'line',length,pose:u=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,angle}),linear:true};}
function arc(cx,cy,r,a,b){return{kind:'arc',length:r*Math.abs(b-a),radius:r,angleSpan:b-a,pose:u=>{const q=a+(b-a)*u;return{x:cx+Math.cos(q)*r,y:cy+Math.sin(q)*r,angle:q+(b>a?Math.PI/2:-Math.PI/2)};}};}
function sweep(segment,cells,obstacles=[],body=TRUCK){const failures=[];if(segment.linear){const a=bounds(segment.pose(0),body),b=bounds(segment.pose(1),body),u={x0:Math.min(a.x0,b.x0),x1:Math.max(a.x1,b.x1),y0:Math.min(a.y0,b.y0),y1:Math.max(a.y1,b.y1),z0:0,z1:body.height};for(let y=Math.floor(u.y0);y<Math.ceil(u.y1);y++)for(let x=Math.floor(u.x0);x<Math.ceil(u.x1);x++)if(!cells.has(key(x,y)))failures.push({reason:'road',cell:key(x,y)});for(const o of obstacles)if(hit(u,o.bounds||o))failures.push({reason:'collision',id:o.id});return{safe:!failures.length,failures,method:'Exact continuous straight swept rectangle'};}
 // Every tiny interval uses a circumscribed continuous envelope, including
 // rotational corner travel, so unsampled space is rejected, not ignored.
 const n=Math.max(1,Math.ceil(segment.length/.015)),radius=Math.hypot(body.length,body.width)/2,pad=(segment.length+radius*Math.abs(segment.angleSpan||0))/n;
 for(let i=0;i<=n;i++){const p=segment.pose(i/n),b=bounds(p,body),u={x0:b.x0-pad,x1:b.x1+pad,y0:b.y0-pad,y1:b.y1+pad,z0:0,z1:body.height};for(let y=Math.floor(u.y0);y<Math.ceil(u.y1);y++)for(let x=Math.floor(u.x0);x<Math.ceil(u.x1);x++)if(!cells.has(key(x,y))){failures.push({reason:'turn-road',cell:key(x,y),sample:i});break;}for(const o of obstacles)if(hit(u,o.bounds||o))failures.push({reason:'turn-collision',id:o.id,sample:i});if(failures.length)break;}return{safe:!failures.length,failures,method:'Conservative interval envelope with bounded translation and corner rotation',samples:n+1,pad};}
function route(cells,obstacles=[],gate=GATE){const gateValid=gate.x===22&&gate.y===31.5&&gate.direction===-1;const approach=line({x:42.7,y:31.5},LOAD),outbound=line(LOAD,{x:20.8,y:31.5}),checks=[sweep(approach,cells,obstacles),sweep(outbound,cells,obstacles)];return{safe:gateValid&&checks.every(c=>c.safe),failures:[...(!gateValid?['Illegal gate']:[]),...checks.flatMap(c=>c.failures)],approach,outbound,gate,checks,load:LOAD,fullyOutside:p=>bounds(p).x1<gate.x-EPS};}
function cargoOnTruck(p){return{x:p.x+Math.cos(p.angle)*TRUCK.cargoOffset,y:p.y+Math.sin(p.angle)*TRUCK.cargoOffset,z:TRUCK.deckZ};}
function craneBodies(extension=0,trolleyY=32.8,hookZ=18){const ymin=32.6+(31.3-32.6)*extension,ymax=33+(34.8-33)*extension;return[{id:'transfer-pedestal',bounds:box(29,32.8,.42,.42,2,2)},{id:'transfer-column',bounds:box(29,32.8,.16,.16,4,21)},{id:'transfer-cantilever',bounds:box(29.5,32.8,1.16,.16,23,2)},{id:'transfer-telescopic-rail',bounds:box(30,(ymin+ymax)/2,.16,ymax-ymin,23,2)},{id:'transfer-trolley',bounds:box(30,trolleyY,.56,.2,21,2)},{id:'transfer-spreader',bounds:box(30,trolleyY,.72,.16,hookZ,1)},...[-.25,.25].flatMap(x=>[-.05,.05].map(y=>({id:'transfer-rope',bounds:box(30+x,trolleyY+y,.01,.01,hookZ+1,21-hookZ-1)})))];}
function transferGeometry(obstacles){const phases=[{name:'extend',a:[0,32.8,18],b:[1,32.8,18]},{name:'approach',a:[1,32.8,18],b:[1,34.62,18]},{name:'lower',a:[1,34.62,18],b:[1,34.62,7]},{name:'lift',a:[1,34.62,7],b:[1,34.62,17],cargo:true},{name:'traverse',a:[1,34.62,17],b:[1,31.5,17],cargo:true},{name:'lower-truck',a:[1,31.5,17],b:[1,31.5,9],cargo:true},{name:'raise-empty',a:[1,31.5,9],b:[1,31.5,18]}],failures=[];
 for(const phase of phases){const a=craneBodies(...phase.a),b=craneBodies(...phase.b);if(phase.cargo){a.push({id:'cargo',bounds:box(30,phase.a[1],.65,.5,phase.a[2]-5,5)});b.push({id:'cargo',bounds:box(30,phase.b[1],.65,.5,phase.b[2]-5,5)});}for(let i=0;i<a.length;i++){const x=a[i].bounds,y=b[i].bounds,u={x0:Math.min(x.x0,y.x0),x1:Math.max(x.x1,y.x1),y0:Math.min(x.y0,y.y0),y1:Math.max(x.y1,y.y1),z0:Math.min(x.z0,y.z0),z1:Math.max(x.z1,y.z1)};for(const o of obstacles)if(hit(u,o.bounds))failures.push({phase:phase.name,body:a[i].id,obstacle:o.id});}}
 return{safe:!failures.length,failures,phases,method:'Full monotone endpoint-union swept solids, actual telescoping beam and four ropes'};}
return{EPS,TRUCK,LOAD,GATE,key,box,hit,corners,bounds,roads,occupied,legal,line,arc,sweep,route,cargoOnTruck,craneBodies,transferGeometry};});

/* 唯一貨物帳和預約：同一絕對時刻純函數，不改任何城市帳。 */
(function(r,f){const a=f();r.LandsideDispatch=a;if(typeof module==='object'&&module.exports)module.exports=a;})(typeof window==='object'?window:globalThis,function(){
'use strict';const ID='P03-original-row1-col0',CARGO={id:ID,length:.65,width:.5,height:5,color:'#d6a348'},ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},mix=(a,b,u)=>a+(b-a)*ease(u);
function inventory(parts){return Array.from(parts).filter(p=>p.type==='box').map((p,i)=>({id:'P01-scene-stock-'+String(i+1).padStart(2,'0'),source:'retained-initial-scene-stock; not demonstrated imported logistics',owner:'yard',x:p.x+20,y:p.y+20,z:p.base||0,length:p.w,width:p.d,height:p.h}));}
function compile(p04,route,options={}){const stock=options.stock||[],errors=[];if(p04.errors?.length)errors.push('Upstream P04 cargo was not delivered');if(stock.length!==24)errors.push('Expected24 retained scene cargo');if(!route.safe)errors.push('Truck route unavailable');if(options.id&&options.id!==ID)errors.push('Wrong cargo ID');if(options.duplicate)errors.push('Duplicate load rejected');if(options.fullYard)errors.push('No compatible available yard slot');if(options.geometry&&!options.geometry.safe)errors.push('Transfer lifting geometry blocked');if(options.deckLength&&options.deckLength<CARGO.length||options.deckWidth&&options.deckWidth<CARGO.width)errors.push('Incompatible cargo dimensions');
 const start=p04.end+2000,approachStart=p04.end-20000,approachEnd=p04.end-2000;let t=start;const phases=[['extend',2000],['approach-hook',3000],['lower-hook',3000],['lock',1000],['lift',3000],['traverse',5000],['lower-truck',3000],['release',1000],['raise-empty',2000],['outbound',14000]].map(([name,ms])=>{const p={name,start:t,end:t+ms};t+=ms;return p;});const get=n=>phases.find(p=>p.name===n),pickup=get('lift').start,loaded=get('raise-empty').start,drive=get('outbound').start,finished=t;
 function at(ms){const p=p04.at(ms),phase=phases.find(f=>ms>=f.start&&ms<f.end),u=phase?(ms-phase.start)/(phase.end-phase.start):0;let truck=ms<approachStart?route.approach.pose(0):ms<approachEnd?route.approach.pose(ease((ms-approachStart)/(approachEnd-approachStart))):route.approach.pose(1),extension=ms<start?0:ms>=get('extend').end?1:ease(u),hook={x:30,y:32.8,z:18},owner=p.owner==='rig'?'crane':p.owner,cargo={...p.cargo},status=ms<approachStart?'awaiting-yard':ms<approachEnd?'truck-inbound':ms<start?'reserved-ready':phase?.name||'dispatched';
  if(!errors.length){if(ms>=drive)truck=route.outbound.pose(ease(Math.min(1,(ms-drive)/(finished-drive))));if(ms>=get('approach-hook').start)hook.y=34.62;if(phase?.name==='approach-hook')hook.y=mix(32.8,34.62,u);if(phase?.name==='lower-hook')hook.z=mix(18,7,u);if(phase?.name==='lock')hook.z=7;if(phase?.name==='lift')hook.z=mix(7,17,u);if(phase?.name==='traverse'){hook.z=17;hook.y=mix(34.62,31.5,u);}if(phase?.name==='lower-truck'){hook.y=31.5;hook.z=mix(17,9,u);}if(phase?.name==='release'){hook.y=31.5;hook.z=9;}if(ms>=loaded){hook.y=31.5;hook.z=phase?.name==='raise-empty'?mix(9,18,u):18;}
   if(ms>=pickup&&ms<loaded){owner='crane';cargo={...CARGO,x:hook.x,y:hook.y,z:hook.z-5};}if(ms>=loaded){owner=ms>=finished&&route.fullyOutside(truck)?'dispatched':'truck';cargo={...CARGO,x:truck.x+Math.cos(truck.angle)*-.25,y:truck.y+Math.sin(truck.angle)*-.25,z:4};}
  }else{status='rejected';truck=route.approach.pose(0);extension=0;hook={x:30,y:32.8,z:18};}
  const counts={ship:owner==='ship'?6:5,crane:owner==='crane'?1:0,yard:24+(owner==='yard'?1:0),truck:owner==='truck'?1:0,dispatched:owner==='dispatched'?1:0,total:30};
  const occupied=[...stock.map(s=>({id:s.id,x:s.x,y:s.y,z:s.z})),...(owner==='yard'?[{id:ID,x:30,y:34.62,z:2}]:[])],reservation=!errors.length&&ms>=approachStart&&ms<loaded?{id:ID,slot:'P04-delivery-slot',vehicle:'P05-truck-01',status:ms<pickup?'reserved':'lifting'}:null;
  return{time:ms,p04:p,status,owner,cargo,truck,hook,extension,counts,occupied,reservation,capacity:{slots:25,occupied:occupied.length,free:25-occupied.length,initialSceneSlots:24},manifest:[...stock,...Array.from({length:6},(_,i)=>{const row=i/3|0,col=i%3,x=-.75+col*.72,y=-.31+row*.62,s=p.ship;return{...CARGO,id:'P03-original-row'+row+'-col'+col,owner:'ship',source:'retained P03 vessel manifest',x:s.x+Math.cos(s.angle)*x-Math.sin(s.angle)*y,y:s.y+Math.sin(s.angle)*x+Math.cos(s.angle)*y,z:7};}).filter(c=>c.id!==ID),{...cargo,owner,source:'P03 original ship row1 col0'}],errors};
 }
 return{start,approachStart,approachEnd,phases,pickup,loaded,drive,finished,duration:Math.max(p04.duration,finished+2000),errors,at};}
return{ID,CARGO,inventory,compile};});

/* P05 only. Bounded spatial visibility cache; normalize duplicate clip vertices.
 * Original P04 module/thresholds remain unchanged. Empty edges cannot add the
 * complete subject to the outside set. No port rebake or persistent world write. */
(function(root){'use strict';const O=root.PortTransferOcclusion;
 const clean=poly=>poly.filter((v,i)=>{const p=poly[(i+poly.length-1)%poly.length];return Math.hypot(v[0]-p[0],v[1]-p[1])>1e-9;});
 root.LandsideOcclusion={clean,createCache(others,persistent=new Map()){
 const prepared=others.map(f=>O.prepare(f)),bins=new Map(),cell=64,key=f=>f.polygon.map(p=>p.join(',')).join(';'),keys=prepared.map(key),range=b=>{const a=[];for(let y=Math.floor(b.y0/cell);y<=Math.floor(b.y1/cell);y++)for(let x=Math.floor(b.x0/cell);x<=Math.floor(b.x1/cell);x++)a.push(x+','+y);return a;};
 prepared.forEach((f,i)=>{if(!f.plane)return;for(const k of range(f.bounds)){if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}});
 return{visible(points){const f=O.prepare(points);if(!f.plane)return[];const b=f.bounds,ids=[...new Set(range(b).flatMap(k=>bins.get(k)||[]))].filter(i=>{const o=prepared[i],a=o.bounds;return a.x0<b.x1-O.EPS&&a.x1>b.x0+O.EPS&&a.y0<b.y1-O.EPS&&a.y1>b.y0+O.EPS&&!o.plane.every((n,j)=>Math.abs(n-f.plane[j])<1e-10); }).sort((a,b)=>a-b),k=key(f)+'|'+ids.map(i=>keys[i]).join('|');
 if(persistent.has(k)){const v=persistent.get(k);persistent.delete(k);persistent.set(k,v);return v;}let pieces=[clean(f.polygon)];for(const mask of O.occlusionMasks(f,ids.map(i=>prepared[i]))){const m=clean(mask);if(m.length<3)continue;pieces=pieces.flatMap(p=>O.difference(clean(p),m).map(clean).filter(p=>p.length>=3&&Math.abs(O.area(p))>O.EPS));if(!pieces.length)break;}const v=pieces.map(p=>p.map(([x,y])=>[x,y,O.zAt(f,x,y)]));if(persistent.size>=512)persistent.delete(persistent.keys().next().value);persistent.set(k,v);return v;},get size(){return persistent.size;}};}};
})(typeof window==='object'?window:globalThis);

const P01B=window.P01B={phase:55,parts:[],
build(){this.parts=[];const add=p=>this.parts.push(p);
 // Small independent quays and yard slabs, never a giant sprite.
 for(let x=3;x<15;x++)for(let y=12;y<15;y++)add({type:'slab',x:x+.5,y:y+.5,w:.98,d:.98,h:2,color:'#829097'});
 for(let x=3;x<15;x++)add({type:'edge',x:x+.5,y:14.96,w:1,d:.13,h:5,color:'#cad2cd'});
 const colors=['#c95538','#dba346','#527d8b','#47796a','#d9d4b7'];
 for(const base of[6,12])for(let row=0;row<3;row++)for(let col=0;col<2;col++)for(let level=0;level<(3-row);level++)add({type:'box',x:base+.6+col*1.15,y:([12.35,13.05,14.05])[row],w:1.0,d:.7,h:10,base:level*10+2,color:colors[(row*2+col+base)%5]});
 for(const x of[4,7,10,13])add({type:'crane',x,y:14.08,w:1.15,d:1.15,h:87,color:'#dfb448'});
 for(let x=3;x<16;x+=2)add({type:'lamp',x,y:10.9,h:39});
 for(let x=2;x<24;x++)add({type:'reserve',x:x+.5,y:4.5});
 for(let x=18;x<23;x++)for(let y=10;y<15;y++)if(y!==11)add({type:'reserve',x:x+.5,y:y+.5,shipyard:true});
},
paint(c,p,P,z,bright){const base=p.base||0,night=this.phase===0,winter=season()===3;
 const poly=(a,color)=>{c.beginPath();a.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fillStyle=color;c.fill();};
 const line=(a,b,col,width=1)=>{c.beginPath();c.moveTo(...P(...a));c.lineTo(...P(...b));c.strokeStyle=col;c.lineWidth=width*z;c.stroke();};
 const tint=col=>{const n=parseInt(col.slice(1),16),f=night?.43:1;return `rgb(${(n>>16)*f},${(n>>8&255)*f},${(n&255)*f})`;};
 const box=(x,y,w,d,h,col,lo=0)=>{const x0=x-w/2,x1=x+w/2,y0=y-d/2,y1=y+d/2;const faces=[[[x0,y0,lo],[x1,y0,lo],[x1,y0,lo+h],[x0,y0,lo+h]],[[x1,y0,lo],[x1,y1,lo],[x1,y1,lo+h],[x1,y0,lo+h]],[[x1,y1,lo],[x0,y1,lo],[x0,y1,lo+h],[x1,y1,lo+h]],[[x0,y1,lo],[x0,y0,lo],[x0,y0,lo+h],[x0,y1,lo+h]]];faces.sort((a,b)=>a.reduce((n,v)=>n+P06.dep(v[0]+20,v[1]+20),0)-b.reduce((n,v)=>n+P06.dep(v[0]+20,v[1]+20),0));for(let fi=0;fi<faces.length;fi++){poly(faces[fi],tint(col));poly(faces[fi],`rgba(0,0,0,${[.05,.20,.12,.30][fi]})`);}poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],winter?'#dce4df':tint(col));if(!winter)poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],'rgba(255,255,255,.16)');};
 if(['slab','edge','box'].includes(p.type)){box(p.x,p.y,p.w,p.d,p.h,p.color,base);if(p.type==='box'&&P06.dep(p.x+20,p.y+20+.1)>P06.dep(p.x+20,p.y+20))for(let i=1;i<6;i++)line([p.x-p.w/2+i*p.w/6,p.y+p.d/2,base+1],[p.x-p.w/2+i*p.w/6,p.y+p.d/2,base+p.h-1],night?'#182b34':'#344c52',.7);if(p.type==='slab'&&p.y===12.5)line([p.x-.35,p.y-.24,2.2],[p.x+.35,p.y-.24,2.2],night?'#90988d':'#ebe3c3',1.3);if(p.type==='slab'&&(p.y===13.5||p.y===14.5))line([p.x-.49,p.y-.12,2.2],[p.x+.49,p.y-.12,2.2],night?'#414951':'#4f6167',1.6);if(p.type==='edge'){line([p.x-.32,p.y,6],[p.x+.32,p.y,6],'#dfb449',2);box(p.x,p.y+.08,.14,.13,3,'#293b43');}return;}
 if(p.type==='crane'&&P02.active()){P02.paintAssembly.call(this,c,p,P,z,bright);return;}if(p.type==='crane'){for(const dx of[-.48,.48])for(const dy of[-.52,.52]){box(p.x+dx,p.y+dy,.12,.15,65,p.color,2);box(p.x+dx,p.y+dy,.22,.22,4,'#283842');}for(const dx of[-.48,.48]){line([p.x+dx,p.y-.52,5],[p.x+dx,p.y+.52,61],tint(p.color),3);line([p.x+dx,p.y+.52,5],[p.x+dx,p.y-.52,61],tint(p.color),3);line([p.x+dx,p.y-.7,68],[p.x+dx,p.y+2.15,68],tint(p.color),5);line([p.x+dx,p.y-.6,87],[p.x+dx,p.y+2.15,68],tint(p.color),2);line([p.x+dx,p.y-.6,68],[p.x+dx,p.y-.6,87],tint(p.color),3);line([p.x+dx,p.y+1.5,68],[p.x+dx,p.y+1.5,26],night?'#859596':'#3a4a50',.7);}box(p.x,p.y,.95,.5,8,p.color,59);box(p.x,p.y+.5,.4,.35,7,'#386b80',56);box(p.x,p.y+1.5,.95,.16,3,'#d1a345',23);for(let rung=8;rung<58;rung+=5)line([p.x+.41,p.y-.55,rung],[p.x+.55,p.y-.55,rung],night?'#9e9b7b':'#e9d99a',1);for(const dx of[-.5,.5]){box(p.x+dx,p.y,.12,.17,2,'#e9e5bd',68);if(night){const q=P(p.x+dx,p.y,70);c.fillStyle='#fff0b9';c.beginPath();c.arc(...q,2.7*z,0,Math.PI*2);c.fill();}}return;}
 if(p.type==='lamp'){line([p.x,p.y,0],[p.x,p.y,p.h],night?'#899591':'#4e6065',2);line([p.x,p.y,p.h],[p.x+.25,p.y,p.h],night?'#ffeea0':'#59686b',3);if(night){const q=P(p.x+.25,p.y,p.h);c.fillStyle='#ffe5a0';c.beginPath();c.arc(...q,3*z,0,Math.PI*2);c.fill();}return;}
 if(p.type==='reserve'){const col=p.shipyard?'#85958a':'#a4ac92';line([p.x-.35,p.y-.3,1],[p.x+.35,p.y+.3,1],tint(col),1);if(!p.shipyard){line([p.x-.5,p.y-.2,1],[p.x+.5,p.y-.2,1],tint('#626c68'),2);line([p.x-.5,p.y+.2,1],[p.x+.5,p.y+.2,1],tint('#626c68'),2);}return;}
}
};

const QuayMotion=window.QuayMotion;
const P02=window.P02={frameTime:0,active(){return P06.active();},time(){return P06.timeMs;},
objects(){this.frameTime=this.time();return P01B.parts.filter(p=>p.type==='crane').flatMap((p,i)=>{const b=QuayMotion.bodies(p,this.frameTime,i),y=p.y+b.pose.y,dep=P06.dep(p.x+20,y+20)+.002;return[{type:'craneMotion',x:p.x,y,w:.8,d:.24,h:66,geometry:b,index:i,dep},{upper:true,crane:p,dep:Math.max(dep,P06.dep(p.x+20,p.y+20)+.001)+.001}];});},
paint(c,p,P,z,bright){const night=P01B.phase===0,g=p.geometry;
 const poly=(pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q);});c.closePath();c.fill();};
 const box=(b,col)=>{const {x0,x1,y0,y1,z0,z1}=b;const faces=[[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],[[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1]],[[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1]]];faces.sort((a,b)=>a.reduce((n,v)=>n+P06.dep(v[0]+20,v[1]+20),0)-b.reduce((n,v)=>n+P06.dep(v[0]+20,v[1]+20),0));faces.forEach((f,i)=>{poly(f,col);poly(f,`rgba(0,0,0,${[.05,.20,.12,.30][i]})`);});poly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],season()===3?'#dce4df':col);};
 box(g.spreader,night?'#b4a35e':'#e2b84f');
 for(const r of g.ropes){c.strokeStyle=night?'#bac8ca':'#33474d';c.lineWidth=.7*z;c.beginPath();c.moveTo(...P((r.x0+r.x1)/2,(r.y0+r.y1)/2,r.z0));c.lineTo(...P((r.x0+r.x1)/2,(r.y0+r.y1)/2,r.z1));c.stroke();}
 box(g.trolley,night?'#b2a671':'#efd278');
 }
};

// Native queue splits lower frame, moving rig and upper boom into separate nodes.
// Lower frame y <=14.755, motion y>=15.06. Upper boom z>=68, motion z<=66.
P02.paintAssembly=function(c,p,P,z,bright,upperOnly=false){const base=p.base||0,night=this.phase===0,winter=season()===3;
 const poly=(a,color)=>{c.beginPath();a.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fillStyle=color;c.fill();};
 const line=(a,b,col,width=1)=>{c.beginPath();c.moveTo(...P(...a));c.lineTo(...P(...b));c.strokeStyle=col;c.lineWidth=width*z;c.stroke();};
 const tint=col=>{const n=parseInt(col.slice(1),16),f=night?.43:1;return `rgb(${(n>>16)*f},${(n>>8&255)*f},${(n&255)*f})`;};
 const box=(x,y,w,d,h,col,lo=0)=>{const x0=x-w/2,x1=x+w/2,y0=y-d/2,y1=y+d/2;const faces=[[[x0,y0,lo],[x1,y0,lo],[x1,y0,lo+h],[x0,y0,lo+h]],[[x1,y0,lo],[x1,y1,lo],[x1,y1,lo+h],[x1,y0,lo+h]],[[x1,y1,lo],[x0,y1,lo],[x0,y1,lo+h],[x1,y1,lo+h]],[[x0,y1,lo],[x0,y0,lo],[x0,y0,lo+h],[x0,y1,lo+h]]];faces.sort((a,b)=>a.reduce((n,v)=>n+P06.dep(v[0]+20,v[1]+20),0)-b.reduce((n,v)=>n+P06.dep(v[0]+20,v[1]+20),0));for(let fi=0;fi<faces.length;fi++){poly(faces[fi],tint(col));poly(faces[fi],`rgba(0,0,0,${[.05,.20,.12,.30][fi]})`);}poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],winter?'#dce4df':tint(col));if(!winter)poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],'rgba(255,255,255,.16)');};

 const lower=()=>{for(const dx of[-.48,.48])for(const dy of[-.52,.52]){box(p.x+dx,p.y+dy,.12,.15,65,p.color,2);box(p.x+dx,p.y+dy,.22,.22,4,'#283842');}for(const dx of[-.48,.48]){line([p.x+dx,p.y-.52,5],[p.x+dx,p.y+.52,61],tint(p.color),3);line([p.x+dx,p.y+.52,5],[p.x+dx,p.y-.52,61],tint(p.color),3);}box(p.x,p.y,.95,.5,8,p.color,59);box(p.x,p.y+.5,.4,.35,7,'#386b80',56);for(let rung=8;rung<58;rung+=5)line([p.x+.41,p.y-.55,rung],[p.x+.55,p.y-.55,rung],night?'#9e9b7b':'#e9d99a',1);};
 const upper=()=>{for(const dx of[-.48,.48]){line([p.x+dx,p.y-.7,68],[p.x+dx,p.y+2.15,68],tint(p.color),5);line([p.x+dx,p.y-.6,87],[p.x+dx,p.y+2.15,68],tint(p.color),2);line([p.x+dx,p.y-.6,68],[p.x+dx,p.y-.6,87],tint(p.color),3);}for(const dx of[-.5,.5]){box(p.x+dx,p.y,.12,.17,2,'#e9e5bd',68);if(night){const q=P(p.x+dx,p.y,70);c.fillStyle='#fff0b9';c.beginPath();c.arc(...q,2.7*z,0,Math.PI*2);c.fill();}}};
 if(upperOnly)upper();else lower();
};

const P03=window.P03={plan:null,error:null,active(){return P06.active();},time(){return P06.timeMs;},
objects(){if(!this.active())return[];const p=P04.frame?P04.frame.ship:this.plan.at(this.time());this.frame=p;if(!p.visible)return[];const c=Math.cos(p.angle),s=Math.sin(p.angle),world=([x,y,h])=>[p.x+c*x-s*y,p.y+s*x+c*y,h];
 const groups=[];const prism=(xy,lo,hi,col)=>{const a=xy.map(v=>world([...v,lo])),b=xy.map(v=>world([...v,hi]));const faces=xy.map((_,i)=>[a[i],a[(i+1)%a.length],b[(i+1)%a.length],b[i]]);faces.sort((a,b)=>a.reduce((v,q)=>v+P06.dep(q[0],q[1]),0)-b.reduce((v,q)=>v+P06.dep(q[0],q[1]),0));faces.push(b);const group=faces.map((points,i)=>({points,color:col,top:i===faces.length-1,shade:i%3*.10}));groups.push({faces:group,dep:b.reduce((v,q)=>v+P06.dep(q[0],q[1]),0)/b.length,lo});};
 // Exact visible hull lies inside the same 5 x 1.4 footprint used by navigation.
 prism([[-2.5,-.55],[1.65,-.7],[2.5,0],[1.65,.7],[-2.5,.55]],1,6,'#234d62');
 prism([[-2.35,-.5],[1.6,-.6],[2.25,0],[1.6,.6],[-2.35,.5]],6,7,'#b1b5a5');
 const box=(x,y,l,w,lo,hi,col)=>prism([[x-l/2,y-w/2],[x+l/2,y-w/2],[x+l/2,y+w/2],[x-l/2,y+w/2]],lo,hi,col);
 for(let row=0;row<2;row++)for(let col=0;col<3;col++)if(row===1&&col===0&&!P04.onShip()){groups.push({faces:[],dep:0,lo:7});}else box(-.75+col*.72,-.31+row*.62,.65,.5,7,12,['#b44f3b','#d6a348','#497f77'][(row+col)%3]);
 box(-1.85,0,.62,1,7,15,'#e0ddd1');box(-1.85,0,.66,1.06,13,15,'#42697a');box(-1.95,0,.25,.3,15,17,'#d5d2bb');const base=groups.slice(0,2),cabin={dep:groups[8].dep,lo:7,faces:groups.slice(8).flatMap(g=>g.faces)},upper=[...groups.slice(2,8),cabin].sort((a,b)=>a.dep-b.dep||a.lo-b.lo);return[{dep:P06.dep(p.x,p.y)+.0001,faces:[...base,...upper].flatMap(g=>g.faces)}];},
paint(c,object,P,z){for(const o of object.faces){c.beginPath();o.points.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fillStyle=o.top&&season()===3?'#e2e8e2':o.color;c.fill();c.fillStyle=`rgba(0,0,0,${(window.P01B.phase===0?.52:0)+o.shade})`;c.fill();c.strokeStyle=window.P01B.phase===0?'#172c35':'#294650';c.lineWidth=.35*z;c.stroke();}}
};

const P04=window.P04={plan:null,error:null,frame:null,active(){return P06.active();},
begin(){if(this.active())this.frame=this.plan.at(P03.time());else this.frame=null;},
onShip(){return !this.active()||!this.frame||this.frame.owner==='ship';},
objects(){if(!this.active()||!this.frame||this.frame.owner==='ship')return[];const f=this.frame.cargo;return[{type:'box',x:f.x-20,y:f.y-20,w:f.length,d:f.width,h:f.height,base:f.z,color:f.color,dep:1e9}];}
};
const p04oldRig=P02.objects.bind(P02);P02.objects=function(){const objects=p04oldRig();if(!P04.active()||!P04.frame||P04.frame.errors.length)return objects;const r=P04.frame.rig,g=window.PortTransferGeometry.rigBodies(r.x,r.y,r.z);const local=b=>({x0:b.x0-20,x1:b.x1-20,y0:b.y0-20,y1:b.y1-20,z0:b.z0,z1:b.z1});for(const o of objects)if(o.index===2){o.geometry={spreader:local(g.spreader),trolley:local(g.trolley),ropes:g.ropes.map(local)};o.y=r.y-20;o.dep=P06.dep(r.x,r.y)+.002;}P04.rigFrame=objects;return objects;};

// 唯一交接櫃最後繪製，但依真實原生面片的射線深度扣除前景遮擋，非永遠蓋在最上層。
P04.capture=function(project,draw,all=false){const faces=[];let points=[],lastZ=0,closed=false;const P=(x,y,z=0)=>{lastZ=z;const q=project(x,y,z);return[q[0],q[1],z];};
 const c={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,beginPath(){points=[];closed=false;},moveTo(x,y,z){points.push([x,y,z??lastZ]);},lineTo(x,y,z){points.push([x,y,z??lastZ]);},closePath(){closed=true;},arc(...args){const[x,y,r,a,b]=args.length===6?[args[0],args[1],args[3],args[4],args[5]]:args;for(let i=0;i<=16;i++){const t=a+(b-a)*i/16;points.push([x+Math.cos(t)*r,y+Math.sin(t)*r,lastZ]);}},fill(){if(points.length>=3&&(all||!String(this.fillStyle).startsWith('rgba')))faces.push({points:points.map(p=>p.slice()),color:this.fillStyle});},stroke(){const path=closed&&points.length?[...points,points[0]]:points;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;const nx=-dy/len*this.lineWidth/2,ny=dx/len*this.lineWidth/2;faces.push({points:[[a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],[b[0]-nx,b[1]-ny,b[2]],[a[0]-nx,a[1]-ny,a[2]]],color:this.strokeStyle});}}};draw(c,P);return faces;};
P04.paint=function(c,part,P,z,bright){const O=window.PortTransferOcclusion,key=[GV.rot(),z,...P(0,0,0),window.P01B.phase===0].join('/'),renderKey=[key,window.P01B.phase,season(),this.frame.time,P02.frameTime,P05.active()].join('/');const replay=commands=>{for(const{poly,color}of commands){c.fillStyle=color;c.beginPath();poly.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.closePath();c.fill();}};if(this.renderKey===renderKey){replay(this.renderCommands);return;}
 if(this.maskKey!==key){this.maskKey=key;this.maskStatic=this.capture(P,(q,p)=>{const local=(x,y,h)=>p(x+20,y+20,h);for(const part of window.P01B.parts)if(['slab','edge','box','crane','lamp'].includes(part.type))window.P01B.paint(q,part,local,z,bright);}).map(f=>O.prepare(f.points));}
 const moving=this.capture(P,(q,p)=>{for(const ship of P03.objects())P03.paint(q,ship,p,z);if(P05.active())for(const o of P05.rawObjects())P05.rawPaint(q,o,p,z);const local=(x,y,h)=>p(x+20,y+20,h);for(const rig of(this.rigFrame||P02.objects()))if(rig.upper)P02.paintAssembly.call(window.P01B,q,rig.crane,local,z,bright,true);else P02.paint(q,rig,local,z,bright);});
 const occluders=[...this.maskStatic,...moving.map(f=>O.prepare(f.points))];const cargo=this.capture(P,(q,p)=>window.P01B.paint(q,part,(x,y,h)=>p(x+20,y+20,h),z,bright),true);
 const masks=O.createCache(occluders),commands=[];for(const face of cargo)for(const poly of masks.visible(face.points))if(poly.length>=3)commands.push({poly,color:face.color});this.renderKey=renderKey;this.renderCommands=commands;this.occlusionBuilds=(this.occlusionBuilds||0)+1;replay(commands);
};

const P05=window.P05={plan:null,frame:null,error:null,active(){return P06.active();},
begin(){this.frame=this.active()?this.plan.at(P03.time()):null;},
objects(){return this.rawObjects().map((source,index)=>({kind:'composite',source,index,dep:source.kind==='crane'?Math.max(...[28.79,30.36].flatMap(x=>[31.3,34.8].map(y=>P06.dep(x,y))))+.01:source.dep}));},
paint(c,o,P,z){if(o.kind!=='composite')return this.rawPaint(c,o,P,z);const O=window.PortTransferOcclusion,key=[GV.rot(),z,...P(0,0,0),P01B.phase,season()].join('/'),rk=key+'/'+this.frame.time+'/'+P02.frameTime;
 const replay=()=>{for(const f of this.paintCommands[o.index]||[]){c.fillStyle=f.color;c.beginPath();f.poly.forEach((v,i)=>i?c.lineTo(v[0],v[1],v[2]):c.moveTo(v[0],v[1],v[2]));c.closePath();c.fill();}};if(this.paintKey===rk){replay();return;}
 if(this.staticKey!==key){this.staticKey=key;this.staticFaces=P04.capture(P,(q,p)=>{for(const part of P01B.parts)if(['slab','edge','box','crane','lamp'].includes(part.type))P01B.paint(q,part,(x,y,h)=>p(x+20,y+20,h),z,1);}).map(f=>O.prepare(f.points));}
 const nativeMoving=P04.capture(P,(q,p)=>{for(const ship of P03.objects())P03.paint(q,ship,p,z);for(const rig of(P04.rigFrame||P02.objects()))if(rig.upper)P02.paintAssembly.call(P01B,q,rig.crane,(x,y,h)=>p(x+20,y+20,h),z,1,true);else P02.paint(q,rig,(x,y,h)=>p(x+20,y+20,h),z,1);});
 const faces=this.captureRaw(P,z),masks=window.LandsideOcclusion.createCache([...this.staticFaces,...nativeMoving.map(f=>O.prepare(f.points)),...faces.map(f=>O.prepare(f.points))],this.visibilityCache||(this.visibilityCache=new Map()));this.paintCommands=[];for(const f of faces)for(const poly of masks.visible(f.points))if(poly.length>=3)(this.paintCommands[f.group]||(this.paintCommands[f.group]=[])).push({poly,color:f.color});this.paintKey=rk;this.clipBuilds=(this.clipBuilds||0)+1;replay();
 },
captureRaw(P,z){return this.rawObjects().flatMap((o,group)=>P04.capture(P,(q,p)=>this.rawPaint(q,o,p,z),true).map(f=>({...f,group})));},
rawPaint(c,o,P,z){const f=this.frame,L=window.LandsideGeometry,night=window.P01B.phase===0,winter=season()===3,faces=[],col=v=>{const n=parseInt(v.slice(1),16),k=night?.43:1;return`rgb(${(n>>16)*k},${(n>>8&255)*k},${(n&255)*k})`;};
 const poly=(q,color)=>{c.beginPath();q.forEach((v,i)=>{const p=P(...v);i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]);});c.closePath();c.fillStyle=color;c.fill();};
 const box=(b,color)=>{const{x0:a,x1:b1,y0:d,y1:e,z0:l,z1:h}=b;const q=[[[a,d,l],[b1,d,l],[b1,d,h],[a,d,h]],[[b1,d,l],[b1,e,l],[b1,e,h],[b1,d,h]],[[b1,e,l],[a,e,l],[a,e,h],[b1,e,h]],[[a,e,l],[a,d,l],[a,d,h],[a,e,h]]];q.sort((a,b)=>a.reduce((s,p)=>s+P06.dep(p[0],p[1]),0)-b.reduce((s,p)=>s+P06.dep(p[0],p[1]),0));for(let i=2;i<q.length;i++){poly(q[i],col(color));}poly([[a,d,h],[b1,d,h],[b1,e,h],[a,e,h]],winter?'#dce4df':col(color));};
 if(o.kind==='road'){box(L.box(o.x,o.y,1,1,0,.15),'#666d70');poly([[o.x-.34,o.y-.025,.2],[o.x+.34,o.y-.025,.2],[o.x+.34,o.y+.025,.2],[o.x-.34,o.y+.025,.2]],'#ddd5b6');return;}
 if(o.kind==='gate'){for(const y of[30.95,32.05])box(L.box(22,y,.13,.13,0,12),'#cf9e38');return;}
 if(o.kind==='crane'){box(o.body.bounds,o.body.id.includes('rope')?'#35434b':o.body.id.includes('column')?'#4b9299':'#78a9ad');return;}
 if(o.kind==='truck'){const p=f.truck,transform=(x,y)=>[p.x+Math.cos(p.angle)*x-Math.sin(p.angle)*y,p.y+Math.sin(p.angle)*x+Math.cos(p.angle)*y],part=(x,y,w,d,b,h,color)=>{const v=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>transform(x+a,y+b)),q=[];for(let i=0;i<4;i++)q.push([[...v[i],b],[...v[(i+1)%4],b],[...v[(i+1)%4],b+h],[...v[i],b+h]]);q.sort((a,b)=>a.reduce((s,p)=>s+P06.dep(p[0],p[1]),0)-b.reduce((s,p)=>s+P06.dep(p[0],p[1]),0));for(const face of q.slice(2))poly(face,col(color));poly(v.map(v=>[...v,b+h]),winter?'#dce4df':col(color));};
  for(const x of[-.72,-.38,.68])for(const y of[-.30,.30])part(x,y,.22,.10,.2,2.2,'#25313b');part(-.25,0,1.15,.62,2.4,1.6,'#435d6b');part(.68,0,.6,.66,2.2,5.8,'#b9603d');part(.7,0,.36,.67,5,1.8,'#466e7d');part(.95,0,.08,.60,2.2,.6,'#e1d29d');if(['truck','dispatched'].includes(f.owner))part(-.25,0,.65,.5,4,5,'#d6a348');return;}
 }
};
const p05begin=P04.begin.bind(P04);P04.begin=function(){p05begin();P05.begin();};
const p05cargo=P04.objects.bind(P04);P04.objects=function(){if(!P05.active()||!P05.frame||P05.frame.time<P05.plan.pickup)return p05cargo();const f=P05.frame;if(f.owner!=='crane')return[];return[{type:'box',x:f.cargo.x-20,y:f.cargo.y-20,w:f.cargo.length,d:f.cargo.width,h:f.cargo.height,base:f.cargo.z,color:f.cargo.color,dep:1e9}];};

/* 原生城市布局適配：只讀實際格、完整原尺寸，沒有補路／填海／財政寫入。 */
(function(r,f){const a=f();r.NativeHarborLayout=a;if(typeof module==='object'&&module.exports)module.exports=a;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const ORIENTATIONS=['南岸','西岸','北岸','東岸'];
const key=(x,y)=>x+','+y,land=t=>t&&(t.t===1||t.t===2),root=t=>t?.bld&&!t.bld.ref?t.bld:null;
function rotate(x,y,q,n){return q===0?[x,y]:q===1?[n-y,x]:q===2?[n-x,n-y]:[y,n-x];}
function frame(world,port,q){const n=world.width,pts=[[port.x,port.y],[port.x+port.size,port.y],[port.x,port.y+port.size],[port.x+port.size,port.y+port.size]].map(p=>rotate(...p,(4-q)%4,n)),ox=Math.min(...pts.map(p=>p[0])),oy=Math.min(...pts.map(p=>p[1])),dx=ox-23,dy=oy-32;
 const point=(x,y)=>rotate(x+dx,y+dy,q,n),inverse=(x,y)=>{const p=rotate(x,y,(4-q)%4,n);return[p[0]-dx,p[1]-dy];},tile=(x,y)=>{const p=point(x+.5,y+.5),a=Math.floor(p[0]),b=Math.floor(p[1]);return a>=0&&b>=0&&a<n&&b<n?world.cells[b*n+a]:null;};return{q,dx,dy,point,inverse,tile};}
function inventory(world){const ports=[],warehouses=[],freight=[],counts={water:0,docks:0,roads:0,rails:0,trams:0};for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){const t=world.cells[y*world.width+x],b=root(t);if(t.t===0)counts.water++;if(t.dock)counts.docks++;if(t.road)counts.roads++;if(t.rail)counts.rails++;if(t.tram)counts.trams++;if(b){const v={key:key(x,y),x,y,size:b.sz||b.lot574||1,k:b.k,age:b.age||0};if(b.k===18)ports.push(v);if(b.k===64)warehouses.push(v);if(b.k===110)freight.push(v);}}return{ports,warehouses,freight,counts};}
function signature(t){if(!t)return'outside';const b=t.bld;return[t.t,t.el||0,t.road||0,t.oneway||0,t.rail||0,t.tram||0,t.dock||0,t.bridge||0,t.wm||0,t.tree||0,t.zone||0,t.ruin||0,t.deco||0,b?.k||0,b?.ref?.join(',')||'',b?.sz||b?.lot574||0,b&&b.age<9?'building':'complete'].join('/');}
function inspect(world,port,q,parts,api,options={}){const F=frame(world,port,q),errors=[],add=(code,message,cells=[])=>errors.push({code,message,cells}),n=world.width,L=api.L,G=api.G,V=api.V,C=api.C,D=api.D,watched=new Set(),watch=(x,y)=>{const p=F.point(x+.5,y+.5),a=Math.floor(p[0]),b=Math.floor(p[1]);if(a>=0&&b>=0&&a<n&&b<n)watched.add(key(a,b));return F.tile(x,y);};
 /* T677：四角轉換後逐格監看完整 AABB，排除僅接觸邊界及地圖外格；不做逐幀全城掃描。 */
 const watchBounds=b=>{const p=[[b.x0,b.y0],[b.x1,b.y0],[b.x0,b.y1],[b.x1,b.y1]].map(v=>F.point(...v)),xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<Math.min(n,Math.ceil(Math.max(...ys)));y++)for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<Math.min(n,Math.ceil(Math.max(...xs)));x++)watched.add(key(x,y));};
 const selected=t=>{const b=t?.bld;return b&&b.k===18&&((b.ref&&b.ref[0]===port.x&&b.ref[1]===port.y)||(!b.ref&&t===world.cells[port.y*n+port.x]));};
 if(port.size!==3)add('PORT_SIZE','原生港口不是已驗證的 3×3 足跡');if(port.age<9)add('PORT_CONSTRUCTION','港口仍在施工，尚未可營運');
 const blocked=[],waterEdge=[];for(let y=32;y<35;y++)for(let x=23;x<35;x++){const t=watch(x,y);if(!land(t)||t.el!==undefined&&t.el!==(world.cells[port.y*n+port.x].el||0)||t.bld&&!selected(t)||t.road||t.rail||t.tram||t.tree||t.zone||t.ruin||t.deco)blocked.push(key(x,y));}if(blocked.length)add('APRON_BLOCKED','原尺寸岸橋／堆場需要連續 12×3 等高合法陸地；地塊被占用或不足',blocked);
 for(let x=23;x<35;x++){const t=watch(x,35);if(!t||t.t!==0)waterEdge.push(key(x,35));}if(waterEdge.length)add('SHORE_DIRECTION','此靠岸方向沒有完整水岸',waterEdge);
 const docks=[];for(let x=23;x<35;x++)if(watch(x,35)?.dock)docks.push(key(x,35));if(!docks.length)add('DOCK_MISSING','此港區岸線沒有真實原生 dock');
 const lampHits=[];for(const p of parts.filter(p=>p.type==='lamp')){const t=watch(Math.floor(p.x+20),Math.floor(p.y+20));if(!land(t)||t.bld||t.tree||t.rail||t.tram)lampHits.push(key(p.x+20,p.y+20));}if(lampHits.length)add('EQUIPMENT_BLOCKED','原港區照明／設備占用與城市建築或軌道衝突',lampHits);
 const cells=new Set(),water=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=rotate(x+.5,y+.5,q,n),t=world.cells[Math.floor(p[1])*n+Math.floor(p[0])];water.push(!!t&&t.t===0&&!t.bld&&!t.road&&!t.bridge&&!t.dock&&!t.rail&&!t.tram);if(land(t)&&t.road&&!t.oneway&&!t.bld&&!t.rail&&!t.tram)cells.add(key(x-F.dx,y-F.dy));}
 const nativeObstacles=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const t=world.cells[y*n+x],b=root(t);if(!b||x===port.x&&y===port.y)continue;const sz=b.sz||b.lot574||1,pts=[[x,y],[x+sz,y],[x,y+sz],[x+sz,y+sz]].map(p=>F.inverse(...p));nativeObstacles.push({id:'native-building-'+x+'-'+y,bounds:{x0:Math.min(...pts.map(p=>p[0])),x1:Math.max(...pts.map(p=>p[0])),y0:Math.min(...pts.map(p=>p[1])),y1:Math.max(...pts.map(p=>p[1])),z0:0,z1:160}});}
 const obstacles=G.staticObstacles(parts),equipmentHits=[];for(const o of obstacles)watchBounds(o.bounds);for(const a of obstacles)for(const b of nativeObstacles)if(G.overlap(a.bounds,b.bounds))equipmentHits.push(b.id);if(equipmentHits.length)add('CRANE_OCCUPIED','岸橋完整實體／掃掠被原生建築占用',[...new Set(equipmentHits)]);
 let startX=31.2;while(startX<80&&L.legal({x:startX+.5,y:31.5,angle:Math.PI},cells,nativeObstacles).safe)startX+=.5;startX=Math.min(42.7,startX);
 const approach=L.line({x:startX,y:31.5},L.LOAD),outbound=L.line(L.LOAD,{x:20.8,y:31.5}),checks=[L.sweep(approach,cells,nativeObstacles),L.sweep(outbound,cells,nativeObstacles)],route={safe:checks.every(c=>c.safe),approach,outbound,gate:L.GATE,checks,load:L.LOAD,fullyOutside:p=>L.bounds(p).x1<L.GATE.x-L.EPS};
 for(const s of[approach,outbound])for(let u=0;u<=1.0001;u+=.02)for(const k of L.occupied(s.pose(u))){const[x,y]=k.split(',').map(Number);watch(x,y);}
 if(!route.safe)add('ROAD_GATE','真實道路無法承載整車進場／裝載／全車出閘；不會補造道路',checks.flatMap(c=>c.failures).map(v=>v.cell||v.id));
 /* 原生倉庫／貨運站必須以真道路接到出閘路網；不把全城存在當作連通。 */
 const inv=inventory(world),roadStart=key(20,31),connected=new Set(cells.has(roadStart)?[roadStart]:[]),queue=[...connected],parents=new Map();for(let i=0;i<queue.length;i++){const[x,y]=queue[i].split(',').map(Number);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const k=key(x+dx,y+dy);if(cells.has(k)&&!connected.has(k)){connected.add(k);parents.set(k,queue[i]);queue.push(k);}}}
 const access=b=>{const found=[];for(let y=b.y-1;y<=b.y+b.size;y++)for(let x=b.x-1;x<=b.x+b.size;x++){if(x>=b.x&&x<b.x+b.size&&y>=b.y&&y<b.y+b.size)continue;if((x<b.x||x>=b.x+b.size)&&(y<b.y||y>=b.y+b.size))continue;const p=F.inverse(x+.5,y+.5),k=key(Math.floor(p[0]),Math.floor(p[1]));if(connected.has(k))found.push(k);}return found;},supports={};
 for(const[kind,list,code]of[['warehouse',inv.warehouses,'WAREHOUSE'],['freight',inv.freight,'FREIGHT']]){const eligible=list.filter(b=>b.age>=9).map(b=>({building:b,access:access(b)})).filter(b=>b.access.length);if(!eligible.length)add(code+'_UNREACHABLE','缺少已完工且與真實出閘道路連通的'+(kind==='warehouse'?'倉庫 k64':'貨運站 k110'));else{const chosen=eligible[0];supports[kind]=chosen;const b=chosen.building;for(let y=b.y;y<b.y+b.size;y++)for(let x=b.x;x<b.x+b.size;x++)watched.add(key(x,y));let k=chosen.access[0];while(k){const[x,y]=k.split(',').map(Number);watch(x,y);k=parents.get(k);}}}
 // 出閘不是一個中心點：保留原兩根實體門柱，檢查完整占地及真地格。
 const gateHits=[],gateBodies=[30.95,32.05].map(y=>L.box(22,y,.13,.13,0,12));for(const b of gateBodies){for(const o of nativeObstacles)if(G.overlap(b,o.bounds))gateHits.push(o.id);for(let y=Math.floor(b.y0);y<=Math.floor(b.y1);y++)for(let x=Math.floor(b.x0);x<=Math.floor(b.x1);x++){const t=watch(x,y);if(!land(t)||t.bld||t.rail||t.tram||t.tree||t.zone||t.ruin||t.deco)gateHits.push(key(x,y));}}if(gateHits.length)add('GATE_OCCUPIED','出閘門柱完整占地不是合法空間；需要真陸地且不能與建築／路軌／樹木重疊',[...new Set(gateHits)]);
 const geometry=L.transferGeometry([...obstacles,...nativeObstacles]);for(const phase of geometry.phases){const a=L.craneBodies(...phase.a),b=L.craneBodies(...phase.b);for(let i=0;i<a.length;i++)watchBounds(G.union(a[i].bounds,b[i].bounds));if(phase.cargo){const c=D.CARGO,box=p=>L.box(30,p[1],c.length,c.width,p[2]-c.height,c.height);watchBounds(G.union(box(phase.a),box(phase.b)));}}if(!geometry.safe)add('LANDSIDE_SWEEP','陸側吊架完整掃掠被占用',geometry.failures.map(v=>v.obstacle));
 let nav=null,p04=null,p05=null,rawNav=null;const navFailures=[];
 if(!errors.length&&!options.quick){const grid={width:n,height:n,cells:water},berth={x:26.5+F.dx,y:36.5+F.dy,angle:Math.PI,quayY:35+F.dy},entries=[];for(let x=1.5;x<n-1;x++)if(V.validPose(grid,{x,y:n-3.5,angle:Math.PI*1.5}))entries.push(x);entries.sort((a,b)=>Math.abs(a-(40.5+F.dx))-Math.abs(b-(40.5+F.dx)));
  for(const x of entries.slice(0,4)){try{rawNav=V.compile(grid,{berth,entry:{x,y:n-3.5,angle:Math.PI*1.5}});break;}catch(e){navFailures.push(e.message);}}
  if(!rawNav)add('WATER_ROUTE','未驗證到足以容納整艘船的連續外海進出航道（保守路徑規劃）',navFailures.length?navFailures:['邊界無完整船寬入口']);
  else{const local=p=>({...p,x:p.x-F.dx,y:p.y-F.dy}),raw=p=>({...p,x:p.x+F.dx,y:p.y+F.dy}),originalAt=ms=>local(rawNav.at(ms));nav={...rawNav,berth:local(rawNav.berth),entry:local(rawNav.entry),at:originalAt};
   const shipErrors=[],slide=V.line(raw(nav.berth),raw(C.TARGET));if(!V.swept(grid,slide)||!V.swept(grid,V.line(raw(C.TARGET),raw(nav.berth))))shipErrors.push('真實靠泊對位全船掃掠不合法');
   const craneGeometry=G.validateSweep({source:C.PICK,target:C.DROP,liftZ:48,obstacles:[...obstacles,...nativeObstacles,...G.shipObstacles(C.TARGET,{excludeCargoId:C.CARGO.id})],cargo:C.CARGO,crane:{x:30,y:34.08}});for(const phase of craneGeometry.phases)for(const body of phase.sweeps)watchBounds(body.bounds);if(!craneGeometry.safe)shipErrors.push('原岸橋／貨櫃完整交接掃掠受阻');
   p04=C.compile(nav,{originalAt,geometry:craneGeometry,errors:shipErrors});p05=D.compile(p04,route,{stock:D.inventory(parts),geometry});if(p05.errors.length)add('HANDOFF_GEOMETRY','貨櫃交接條件未成立',p05.errors);
   // 與原 V.swept 相同的保守連續掃掠覆蓋，而非幾個中心點／端點的監看近似。
   const watchSweep=s=>{const steps=Math.max(1,Math.ceil(s.length/.16)),corner=Math.hypot(V.HULL.length,V.HULL.width)/2,extra=s.length/steps/2+corner*Math.abs(s.delta||0)/steps/2+1e-7;for(let i=0;i<steps;i++){const poly=V.corners(s.pose((i+.5)/steps),V.HULL,extra),xs=poly.map(v=>v[0]),ys=poly.map(v=>v[1]);for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<Math.min(n,Math.ceil(Math.max(...ys)));y++)for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<Math.min(n,Math.ceil(Math.max(...xs)));x++)if(V.intersects(poly,x,y)){const p=rotate(x+.5,y+.5,q,n);watched.add(key(Math.floor(p[0]),Math.floor(p[1])));}}};
   for(const s of rawNav.segments)watchSweep(s);watchSweep(slide);
  }
 }
 const planKey=JSON.stringify({port:port.key,q,offset:[F.dx,F.dy],nav:rawNav&&{entry:rawNav.entry,berth:rawNav.berth,segments:rawNav.segments,phases:rawNav.phases.map(p=>[p.name,p.start,p.end])},truck:[approach.pose(0),approach.pose(1),outbound.pose(0),outbound.pose(1)],times:p05&&[p05.start,p05.pickup,p05.loaded,p05.drive,p05.finished,p05.duration]});
 const watchList=[...watched].map(k=>{const[x,y]=k.split(',').map(Number);return{k,x,y,signature:signature(world.cells[y*n+x])};});
 return{valid:!errors.length,planKey,port,q,orientation:ORIENTATIONS[q],frame:F,errors,docks,route,geometry,nav,rawNav,p04,p05,watchList,footprint:{apron:[23,32,35,35],gate:{...L.GATE},noGeneratedRoad:true},native:{warehouses:inv.warehouses,freight:inv.freight,supports},navFailures};
}
return{ORIENTATIONS,rotate,frame,inventory,signature,inspect};});

const NativeHarborLayout=window.NativeHarborLayout,LandsideGeometry=window.LandsideGeometry,PortTransferGeometry=window.PortTransferGeometry,VesselNavigation=window.VesselNavigation,ContainerTransfer=window.ContainerTransfer,LandsideDispatch=window.LandsideDispatch;
const P06=window.P06={enabled:false,mode:'live',timeMs:0,layout:null,worldCells:null,reasons:[],lastFrame:null,revision:0,scans:0,acceptedMs:0,refresh(){},
world(){return{width:N,height:N,cells:tiles||[]};},
api(){return{L:LandsideGeometry,G:PortTransferGeometry,V:VesselNavigation,C:ContainerTransfer,D:LandsideDispatch};},
map(x,y){return this.layout?this.layout.frame.point(x,y):[x,y];},
dep(x,y){const p=this.map(x,y);return viewDep(p[0]-.5,p[1]-.5);},
checkWorld(){if(this.layout&&this.worldCells!==tiles){if(this.layout.valid||this.reasons[0]?.code!=='WORLD_REPLACED'){this.layout.valid=false;this.reasons=[{code:'WORLD_REPLACED',message:'城市已新建／重新載入；原港區帳凍結，不能把舊貨櫃帶入另一份城市。請明確重設本批貨物帳後重新檢查。'}];}return false;}return true;},
active(){return this.checkWorld()&&this.enabled&&!!this.layout?.valid&&t677On();},
scan(){if(!tiles?.length)return{ports:[],warehouses:[],freight:[],counts:{},reasons:[{code:'NO_CITY',message:'請先開啟正常城市'}]};this.scans++;return NativeHarborLayout.inventory(this.world());},
enable(portKey,q){this.enabled=true;if(!this.checkWorld()){this.refresh();return this.inspect();}const inv=this.scan(),port=portKey?inv.ports.find(p=>p.key===portKey):inv.ports[0];this.enabled=true;if(!port){this.reasons=[{code:'PORT_MISSING',message:'城市沒有原生港口 k18'}];this.layout&& (this.layout.valid=false);this.refresh();return this.inspect();}
  if(this.layout&&this.timeMs>0&&(this.layout.port.key!==port.key||q!==undefined&&+q!==this.layout.q)){this.reasons=[{code:'RESET_REQUIRED',message:'既有貨櫃仍在本港；換港／方向前須明確重設本批貨物帳，不能瞬移貨物'}];this.layout.valid=false;this.refresh();return this.inspect();}
  const orientations=q===undefined?(this.layout&&this.timeMs>0?[this.layout.q]:[0,1,2,3]):[+q],candidates=orientations.map(o=>NativeHarborLayout.inspect(this.world(),port,o,P01B.parts,this.api(),{quick:true}));let selected=null;
  for(const c of candidates.filter(c=>c.valid)){const full=NativeHarborLayout.inspect(this.world(),port,c.q,P01B.parts,this.api());if(full.valid){selected=full;break;}if(!selected)selected=full;}
  selected=selected?.valid?selected:(selected||candidates.sort((a,b)=>a.errors.length-b.errors.length)[0]);
  if(this.layout&&this.timeMs>0&&selected.valid&&selected.planKey!==this.layout.planKey){selected.valid=false;selected.errors.push({code:'PLAN_GEOMETRY_CHANGED',message:'航道／貨車路徑已改變；保留原貨櫃與車輛位置，明確重設後才能採用新航次'});}
  if(!selected.valid){this.reasons=selected.errors;if(this.layout)this.layout.valid=false;else{this.layout=selected;this.worldCells=tiles;}this.refresh();return this.inspect();}
  this.layout=selected;this.worldCells=tiles;this.reasons=[];P03.plan=selected.nav;P03.error=null;P04.plan=selected.p04;P04.error=null;P04.baseAt=selected.nav.at;P05.plan=selected.p05;P05.geometry=selected.geometry;P05.route=selected.route;P05.connector=[];P05.originalRoads=[...selected.route.checks];P05.error=null;P04.renderKey=null;P05.paintKey=null;P05.staticKey=null;P05.visibilityCache=new Map();this.update();this.refresh();return this.inspect();
 },
disable(){this.enabled=false;this.refresh();},
reset(){this.timeMs=0;this.acceptedMs=0;this.lastFrame=null;const old=this.layout;this.layout=null;this.worldCells=null;this.reasons=[];if(this.enabled)this.enable(old?.port.key,old?.q);this.refresh();},
changed(){this.revision++;if(this.active())this.checkTopology();this.refresh();},
checkTopology(){if(!this.checkWorld()||!this.layout?.valid)return false;const bad=this.layout.watchList.filter(p=>NativeHarborLayout.signature(T(idx(p.x,p.y)))!==p.signature);if(bad.length){this.layout.valid=false;this.reasons=[{code:'LAYOUT_CHANGED',message:'港口／道路／水域／設備空間已變動，營運凍結；修復後按重新檢查。貨櫃清單與時間保留。',cells:bad.map(p=>p.k)}];this.refresh();return false;}return true;},
advance(ms){if(this.active()&&this.checkTopology()&&this.mode==='live'&&ms>0){const d=Math.min(ms,Math.max(0,this.layout.p05.duration-this.timeMs));this.timeMs+=d;this.acceptedMs+=d;this.update();}},
update(){if(!this.active())return;P04.frame=P04.plan.at(this.timeMs);P05.frame=P05.plan.at(this.timeMs);this.lastFrame=P05.frame;},
inspect(){const active=this.active(),l=this.layout,f=this.lastFrame;return{enabled:this.enabled,valid:!!l?.valid,active,reasons:this.reasons,clock:{timeMs:this.timeMs,acceptedMs:this.acceptedMs,mode:this.mode},mode:this.mode,frame:f,plan:l?.p05?{start:l.p05.start,pickup:l.p05.pickup,loaded:l.p05.loaded,drive:l.p05.drive,finished:l.p05.finished,duration:l.p05.duration,p04:{start:l.p04.start,pickup:l.p04.pickup,delivery:l.p04.delivery,end:l.p04.end}}:null,layout:l?{port:l.port,q:l.q,orientation:l.orientation,footprint:l.footprint,docks:l.docks,watchCount:l.watchList.length,errors:l.errors,noGeneratedRoad:true,native:l.native}:null,scans:this.scans,revision:this.revision};},
focus(){if(this.layout){const p=this.map(29,33);GV.setZoom(1.5);GV.lookAt(...p);GV.forceDraw();}},
legacyReserved(x,y){if(!this.active())return false;const p=this.layout.frame.inverse(x,y);return p[0]>=23&&p[0]<=36&&p[1]>=34&&p[1]<=40;}
};
const doPlace677Native=doPlace;doPlace=function(...args){try{return doPlace677Native(...args);}finally{P06.changed();}};
const undo677Native=undo;undo=function(...args){try{return undo677Native(...args);}finally{P06.changed();}};
const undoPlace677Native=undoPlace;undoPlace=function(...args){try{return undoPlace677Native(...args);}finally{P06.changed();}};
P01B.build();
P05.rawObjects=function(){if(!this.active()||!this.frame)return[];const L=LandsideGeometry,f=this.frame,a=[{kind:'gate',x:22,y:31.5,dep:P06.dep(22,31.5)+.002}];for(const b of L.craneBodies(f.extension,f.hook.y,f.hook.z)){const q=b.bounds;a.push({kind:'crane',body:b,x:(q.x0+q.x1)/2,y:(q.y0+q.y1)/2,dep:P06.dep((q.x0+q.x1)/2,(q.y0+q.y1)/2)+.002});}a.push({kind:'truck',x:f.truck.x,y:f.truck.y,dep:P06.dep(f.truck.x,f.truck.y)+.003});return a;};
/* 暫停／繪圖只讀，不重建路徑，不累加貨量。 */
const p06begin=P04.begin.bind(P04);P04.begin=function(){if(P06.active()){P01B.phase=daylight().b<.62?0:55;P02.frameTime=P06.timeMs;p06begin();P06.lastFrame=P05.frame;}else{P04.frame=null;P05.frame=null;}};


/* P06-only exact geometry cache acceleration. Original P05 remains the reference.
 * No pixels, faces, clipping tolerance, traffic, or simulation work is omitted.
 * The baseline flag is for paired acceptance, never a player/save preference. */
(function(root){'use strict';
 const O=root.PortTransferOcclusion,L=root.LandsideOcclusion,original=L.createCache,metadata=new WeakMap(),intern=new Map();let serial=0;
 const CELL=64,MAX_KEYS=8192,range=b=>{const out=[];for(let y=Math.floor(b.y0/CELL);y<=Math.floor(b.y1/CELL);y++)for(let x=Math.floor(b.x0/CELL);x<=Math.floor(b.x1/CELL);x++)out.push(x+','+y);return out;};
 function meta(f){let m=metadata.get(f);if(!m){m={cells:range(f.bounds),id:0};metadata.set(f,m);}return m;}
 function id(f,m=meta(f)){if(m.id)return m.id;const key=f.polygon.map(p=>p.join(',')).join(';');let n=intern.get(key);if(n===undefined){n=++serial;if(intern.size>=MAX_KEYS)intern.delete(intern.keys().next().value);intern.set(key,n);}return m.id=n;}
 function accelerated(others,persistent=new Map()){
  const prepared=others.map(f=>O.prepare(f)),metas=prepared.map(meta),bins=new Map();
  prepared.forEach((f,i)=>{if(!f.plane)return;for(const k of metas[i].cells){if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}});
  return{visible(points){const f=O.prepare(points);if(!f.plane)return[];const b=f.bounds,ids=[...new Set(meta(f).cells.flatMap(k=>bins.get(k)||[]))].filter(i=>{const o=prepared[i],a=o.bounds;return a.x0<b.x1-O.EPS&&a.x1>b.x0+O.EPS&&a.y0<b.y1-O.EPS&&a.y1>b.y0+O.EPS&&!o.plane.every((n,j)=>Math.abs(n-f.plane[j])<1e-10);}).sort((a,b)=>a-b),k='p06/'+id(f)+'|'+ids.map(i=>id(prepared[i],metas[i])).join(',');
   if(persistent.has(k)){const v=persistent.get(k);persistent.delete(k);persistent.set(k,v);return v;}
   let pieces=[L.clean(f.polygon)];for(const mask of O.occlusionMasks(f,ids.map(i=>prepared[i]))){const m=L.clean(mask);if(m.length<3)continue;pieces=pieces.flatMap(p=>O.difference(L.clean(p),m).map(L.clean).filter(p=>p.length>=3&&Math.abs(O.area(p))>O.EPS));if(!pieces.length)break;}
   const v=pieces.map(p=>p.map(([x,y])=>[x,y,O.zAt(f,x,y)]));if(persistent.size>=512)persistent.delete(persistent.keys().next().value);persistent.set(k,v);return v;
  },get size(){return persistent.size;}};
 }
 L.createCache=function(...args){return accelerated(...args);};
})(typeof window==='object'?window:globalThis);

/* P06-only static vector display lists. No bitmap/atlas rebake, omitted face,
 * changed style, clipping, ordering, or night light. Fake capture contexts and
 * night draws keep the exact original painters; actual Canvas can replay Path2D. */
(function(root){'use strict';
 let parts=null,allowed=new Set();const caches={part:new Map(),assembly:new Map()},LIMIT=128,counts={builds:0,hits:0,bypasses:0,draws:0};
 function signature(c,p,P,z,upper){const t=c.getTransform();return[GV.rot(),z,t.a,t.b,t.c,t.d,t.e,t.f,root.P01B.phase,...P(0,0,0),...P(1,0,0),...P(0,1,0),season(),upper,p.type,p.x,p.y,p.w,p.d,p.h,p.base,p.color,p.shipyard].join('/');}
 function record(original,self,p,P,z,bright,upper){const commands=[];let current=new root.Path2D(),last=[];const target={beginPath(){current=new root.Path2D();last=[];},fill(){commands.push(['fill',new root.Path2D(current)]);},stroke(){commands.push(['stroke',new root.Path2D(current)]);}};
  for(const method of['moveTo','lineTo','closePath','arc'])target[method]=(...args)=>{current[method](...args);last.push([method,args]);};
  const recorder=new Proxy(target,{set(o,k,v){if(!['fillStyle','strokeStyle','lineWidth'].includes(k))throw Error('Unrecorded static painter property: '+String(k));o[k]=v;commands.push(['set',k,v]);return true;}});
  original.call(self,recorder,p,P,z,bright,upper);return{commands,last};
 }
 function replay(c,value){for(const cmd of value.commands){if(cmd[0]==='set')c[cmd[1]]=cmd[2];else c[cmd[0]](cmd[1]);}/* fill(Path2D) does not alter current path: restore the original painter's final path too. */c.beginPath();for(const[method,args]of value.last)c[method](...args);}
 function wrap(object,key,kind){const original=object[key];object[key]=function(c,p,P,z,bright,upper=false){
  if(parts!==root.P01B.parts){parts=root.P01B.parts;allowed=new Set(parts);caches.part.clear();caches.assembly.clear();}
  if(!allowed.has(p)||typeof root.CanvasRenderingContext2D!=='function'||!(c instanceof root.CanvasRenderingContext2D)||typeof root.Path2D!=='function'||this.phase===0||root.P01B.phase===0){counts.bypasses++;return original.call(this,c,p,P,z,bright,upper);}
  const cache=caches[kind],sig=signature(c,p,P,z,upper);let value=cache.get(p);if(!value||value.signature!==sig||value.layout!==root.P06?.layout){value={...record(original,this,p,P,z,bright,upper),signature:sig,layout:root.P06?.layout};if(!cache.has(p)&&cache.size>=LIMIT)cache.delete(cache.keys().next().value);cache.set(p,value);counts.builds++;}else counts.hits++;counts.draws++;replay(c,value);
 };return original;}
 wrap(root.P01B,'paint','part');wrap(root.P02,'paintAssembly','assembly');
})(typeof window==='object'?window:globalThis);

/* T677 END */
