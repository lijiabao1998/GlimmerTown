/* 原生閉包橋接；不寫地圖、存檔或正式模擬。 */
const P04=window.P04={enabled:!new URLSearchParams(typeof location==='object'?location.search:'').has('noP04'),plan:null,error:null,frame:null,buildCount:0,
 active(){return this.enabled&&!window.__noP04&&P03.active()&&P02.active()&&!!this.plan;},
 init(options={}){try{const nav=P03.plan;if(!nav)return;this.baseAt=nav.__p04OriginalAt||nav.at.bind(nav);nav.__p04OriginalAt=this.baseAt;
  const G=window.PortTransferGeometry,C=window.ContainerTransfer,target=options.berth||C.TARGET,errors=[];
  const slide=window.VesselNavigation.line(nav.berth,target),back=window.VesselNavigation.line(target,nav.berth);
  if(!window.VesselNavigation.swept(nav.grid,slide,nav.hull)||!window.VesselNavigation.swept(nav.grid,back,nav.hull))errors.push('Full hull docking alignment is blocked');
  if(Math.abs(target.angle-Math.PI)>1e-8||Math.hypot(target.x-C.TARGET.x,target.y-C.TARGET.y)>1e-8)errors.push('Wrong transfer berth alignment');
  const obstacles=[...G.staticObstacles(window.P01B.parts,{offset:20}),...G.shipObstacles(target,{excludeCargoId:C.CARGO.id})];
  if(options.fullYard)obstacles.push({id:'full-yard-negative-control',bounds:G.bounds(C.DROP.x,C.DROP.y,C.CARGO.length,C.CARGO.width,2,20)});
  const geometry=G.validateSweep({source:C.PICK,target:C.DROP,liftZ:48,obstacles,cargo:C.CARGO,crane:{x:30,y:34.08}});if(!geometry.safe)errors.push('Cargo or rig sweep blocked');
  this.plan=C.compile(nav,{originalAt:this.baseAt,geometry,errors});this.buildCount++;this.error=errors.join('; ')||null;
  nav.at=ms=>this.active()?this.plan.at(ms).ship:this.baseAt(ms);
  this.frame=this.plan.at(P03.time());
 }catch(e){this.error=e.message;this.plan=null;}},
 begin(){if(this.active())this.frame=this.plan.at(P03.time());else this.frame=null;},
 onShip(){return !this.active()||!this.frame||this.frame.owner==='ship';},
 objects(){if(!this.active()||!this.frame||this.frame.owner==='ship')return[];const f=this.frame.cargo;return[{type:'box',x:f.x-20,y:f.y-20,w:f.length,d:f.width,h:f.height,base:f.z,color:f.color,dep:1e9}];},
 toggle(){this.enabled=!this.enabled;window.P01B.redraw();},seek(ms){P03.seek(ms);},
 status(){if(!this.frame)return'P04關閉：完整P03原航次';const f=this.frame;return`${f.status}｜${f.owner}｜船${f.counts.ship} 吊具${f.counts.rig} 堆場${f.counts.yard} 合計${f.counts.total}｜${Math.round(f.progress*100)}%${this.error?'｜拒絕：'+this.error:''}`;}
};
const p04setup=window.P01B.setup.bind(window.P01B);window.P01B.setup=function(){p04setup();P04.init();};
const p04oldRig=P02.objects.bind(P02);P02.objects=function(){const objects=p04oldRig();if(!P04.active()||!P04.frame||P04.frame.errors.length)return objects;const r=P04.frame.rig,g=window.PortTransferGeometry.rigBodies(r.x,r.y,r.z);const local=b=>({x0:b.x0-20,x1:b.x1-20,y0:b.y0-20,y1:b.y1-20,z0:b.z0,z1:b.z1});for(const o of objects)if(o.index===2){o.geometry={spreader:local(g.spreader),trolley:local(g.trolley),ropes:g.ropes.map(local)};o.y=r.y-20;o.dep=viewDep(r.x,r.y)+.002;}P04.rigFrame=objects;return objects;};

// 唯一交接櫃最後繪製，但依真實原生面片的射線深度扣除前景遮擋，非永遠蓋在最上層。
P04.capture=function(project,draw,all=false){const faces=[];let points=[],lastZ=0,closed=false;const P=(x,y,z=0)=>{lastZ=z;const q=project(x,y,z);return[q[0],q[1],z];};
 const c={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,beginPath(){points=[];closed=false;},moveTo(x,y,z){points.push([x,y,z??lastZ]);},lineTo(x,y,z){points.push([x,y,z??lastZ]);},closePath(){closed=true;},arc(x,y,r,a,b){for(let i=0;i<=16;i++){const t=a+(b-a)*i/16;points.push([x+Math.cos(t)*r,y+Math.sin(t)*r,lastZ]);}},fill(){if(points.length>=3&&(all||!String(this.fillStyle).startsWith('rgba')))faces.push({points:points.map(p=>p.slice()),color:this.fillStyle});},stroke(){const path=closed&&points.length?[...points,points[0]]:points;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;const nx=-dy/len*this.lineWidth/2,ny=dx/len*this.lineWidth/2;faces.push({points:[[a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],[b[0]-nx,b[1]-ny,b[2]],[a[0]-nx,a[1]-ny,a[2]]],color:this.strokeStyle});}}};draw(c,P);return faces;};
P04.paint=function(c,part,P,z,bright){const O=window.PortTransferOcclusion,key=[GV.rot(),z,...P(0,0,0),window.P01B.phase===0].join('/'),renderKey=[key,window.P01B.phase,season(),this.frame.time,P02.frameTime].join('/');const replay=commands=>{for(const{poly,color}of commands){c.fillStyle=color;c.beginPath();poly.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.closePath();c.fill();}};if(this.renderKey===renderKey){replay(this.renderCommands);return;}
 if(this.maskKey!==key){this.maskKey=key;this.maskStatic=this.capture(P,(q,p)=>{const local=(x,y,h)=>p(x+20,y+20,h);for(const part of window.P01B.parts)if(['slab','edge','box','crane','lamp'].includes(part.type))window.P01B.paint(q,part,local,z,bright);}).map(f=>O.prepare(f.points));}
 const moving=this.capture(P,(q,p)=>{for(const ship of P03.objects())P03.paint(q,ship,p,z);const local=(x,y,h)=>p(x+20,y+20,h);for(const rig of(this.rigFrame||P02.objects()))if(rig.upper)P02.paintAssembly.call(window.P01B,q,rig.crane,local,z,bright,true);else P02.paint(q,rig,local,z,bright);});
 const occluders=[...this.maskStatic,...moving.map(f=>O.prepare(f.points))];const cargo=this.capture(P,(q,p)=>window.P01B.paint(q,part,(x,y,h)=>p(x+20,y+20,h),z,bright),true);
 const masks=O.createCache(occluders),commands=[];for(const face of cargo)for(const poly of masks.visible(face.points))if(poly.length>=3)commands.push({poly,color:face.color});this.renderKey=renderKey;this.renderCommands=commands;this.occlusionBuilds=(this.occlusionBuilds||0)+1;replay(commands);
};
