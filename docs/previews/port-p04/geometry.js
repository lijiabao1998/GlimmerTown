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
