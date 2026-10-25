/* 原生閉包橋接；不寫地圖、存檔或正式模擬。 */
const P04=window.P04={enabled:!new URLSearchParams(typeof location==='object'?location.search:'').has('noP04'),plan:null,error:null,frame:null,buildCount:0,
 active(){return this.enabled&&!window.__noP04&&P03.active()&&!!this.plan;},
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
 objects(){if(!this.active()||!this.frame||this.frame.owner==='ship')return[];const f=this.frame.cargo;return[{type:'box',x:f.x-20,y:f.y-20,w:f.length,d:f.width,h:f.height,base:f.z,color:f.color,dep:viewDep(f.x,f.y)+.003}];},
 toggle(){this.enabled=!this.enabled;window.P01B.redraw();},seek(ms){P03.seek(ms);},
 status(){if(!this.frame)return'P04關閉：完整P03原航次';const f=this.frame;return`${f.status}｜${f.owner}｜船${f.counts.ship} 吊具${f.counts.rig} 堆場${f.counts.yard} 合計${f.counts.total}｜${Math.round(f.progress*100)}%${this.error?'｜拒絕：'+this.error:''}`;}
};
const p04setup=window.P01B.setup.bind(window.P01B);window.P01B.setup=function(){p04setup();P04.init();};
const p04oldRig=P02.objects.bind(P02);P02.objects=function(){const objects=p04oldRig();if(!P04.active()||!P04.frame||P04.frame.errors.length)return objects;const r=P04.frame.rig,g=window.PortTransferGeometry.rigBodies(r.x,r.y,r.z);const local=b=>({x0:b.x0-20,x1:b.x1-20,y0:b.y0-20,y1:b.y1-20,z0:b.z0,z1:b.z1});for(const o of objects)if(o.index===2){o.geometry={spreader:local(g.spreader),trolley:local(g.trolley),ropes:g.ropes.map(local)};o.y=r.y-20;o.dep=viewDep(r.x,r.y)+.002;}return objects;};
