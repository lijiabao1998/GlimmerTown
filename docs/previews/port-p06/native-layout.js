/* 原生城市布局適配：只讀實際格、完整原尺寸，沒有補路／填海／財政寫入。 */
(function(r,f){const a=f();r.NativeHarborLayout=a;if(typeof module==='object'&&module.exports)module.exports=a;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const ORIENTATIONS=['南岸','西岸','北岸','東岸'];
const key=(x,y)=>x+','+y,land=t=>t&&(t.t===1||t.t===2),root=t=>t?.bld&&!t.bld.ref?t.bld:null;
function rotate(x,y,q,n){return q===0?[x,y]:q===1?[n-y,x]:q===2?[n-x,n-y]:[y,n-x];}
function frame(world,port,q){const n=world.width,pts=[[port.x,port.y],[port.x+port.size,port.y],[port.x,port.y+port.size],[port.x+port.size,port.y+port.size]].map(p=>rotate(...p,(4-q)%4,n)),ox=Math.min(...pts.map(p=>p[0])),oy=Math.min(...pts.map(p=>p[1])),dx=ox-23,dy=oy-32;
 const point=(x,y)=>rotate(x+dx,y+dy,q,n),inverse=(x,y)=>{const p=rotate(x,y,(4-q)%4,n);return[p[0]-dx,p[1]-dy];},tile=(x,y)=>{const p=point(x+.5,y+.5),a=Math.floor(p[0]),b=Math.floor(p[1]);return a>=0&&b>=0&&a<n&&b<n?world.cells[b*n+a]:null;};return{q,dx,dy,point,inverse,tile};}
function inventory(world){const ports=[],warehouses=[],freight=[],counts={water:0,docks:0,roads:0,rails:0,trams:0};for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){const t=world.cells[y*world.width+x],b=root(t);if(t.t===0)counts.water++;if(t.dock)counts.docks++;if(t.road)counts.roads++;if(t.rail)counts.rails++;if(t.tram)counts.trams++;if(b){const v={key:key(x,y),x,y,size:b.sz||b.lot574||1,k:b.k,age:b.age||0};if(b.k===18)ports.push(v);if(b.k===64)warehouses.push(v);if(b.k===110)freight.push(v);}}return{ports,warehouses,freight,counts};}
function signature(t){if(!t)return'outside';const b=t.bld;return[t.t,t.el||0,t.road||0,t.rail||0,t.tram||0,t.dock||0,t.bridge||0,t.wm||0,t.tree||0,t.zone||0,t.ruin||0,t.deco||0,b?.k||0,b?.ref?.join(',')||'',b?.sz||b?.lot574||0,b&&b.age<9?'building':'complete'].join('/');}
function inspect(world,port,q,parts,api,options={}){const F=frame(world,port,q),errors=[],add=(code,message,cells=[])=>errors.push({code,message,cells}),n=world.width,L=api.L,G=api.G,V=api.V,C=api.C,D=api.D,watched=new Set(),watch=(x,y)=>{const p=F.point(x+.5,y+.5),a=Math.floor(p[0]),b=Math.floor(p[1]);if(a>=0&&b>=0&&a<n&&b<n)watched.add(key(a,b));return F.tile(x,y);};
 const selected=t=>{const b=t?.bld;return b&&b.k===18&&((b.ref&&b.ref[0]===port.x&&b.ref[1]===port.y)||(!b.ref&&t===world.cells[port.y*n+port.x]));};
 if(port.size!==3)add('PORT_SIZE','原生港口不是已驗證的 3×3 足跡');if(port.age<9)add('PORT_CONSTRUCTION','港口仍在施工，尚未可營運');
 const blocked=[],waterEdge=[];for(let y=32;y<35;y++)for(let x=23;x<35;x++){const t=watch(x,y);if(!land(t)||t.el!==undefined&&t.el!==(world.cells[port.y*n+port.x].el||0)||t.bld&&!selected(t)||t.road||t.rail||t.tram||t.tree||t.zone||t.ruin||t.deco)blocked.push(key(x,y));}if(blocked.length)add('APRON_BLOCKED','原尺寸岸橋／堆場需要連續 12×3 等高合法陸地；地塊被占用或不足',blocked);
 for(let x=23;x<35;x++){const t=watch(x,35);if(!t||t.t!==0)waterEdge.push(key(x,35));}if(waterEdge.length)add('SHORE_DIRECTION','此靠岸方向沒有完整水岸',waterEdge);
 const docks=[];for(let x=23;x<35;x++)if(watch(x,35)?.dock)docks.push(key(x,35));if(!docks.length)add('DOCK_MISSING','此港區岸線沒有真實原生 dock');
 const lampHits=[];for(const p of parts.filter(p=>p.type==='lamp')){const t=watch(Math.floor(p.x+20),Math.floor(p.y+20));if(!land(t)||t.bld||t.tree||t.rail||t.tram)lampHits.push(key(p.x+20,p.y+20));}if(lampHits.length)add('EQUIPMENT_BLOCKED','原港區照明／設備占用與城市建築或軌道衝突',lampHits);
 const cells=new Set(),water=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=rotate(x+.5,y+.5,q,n),t=world.cells[Math.floor(p[1])*n+Math.floor(p[0])];water.push(!!t&&t.t===0&&!t.bld&&!t.road&&!t.bridge&&!t.dock&&!t.rail&&!t.tram);if(land(t)&&t.road&&!t.bld&&!t.rail&&!t.tram)cells.add(key(x-F.dx,y-F.dy));}
 const nativeObstacles=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const t=world.cells[y*n+x],b=root(t);if(!b||x===port.x&&y===port.y)continue;const sz=b.sz||b.lot574||1,pts=[[x,y],[x+sz,y],[x,y+sz],[x+sz,y+sz]].map(p=>F.inverse(...p));nativeObstacles.push({id:'native-building-'+x+'-'+y,bounds:{x0:Math.min(...pts.map(p=>p[0])),x1:Math.max(...pts.map(p=>p[0])),y0:Math.min(...pts.map(p=>p[1])),y1:Math.max(...pts.map(p=>p[1])),z0:0,z1:160}});}
 const obstacles=G.staticObstacles(parts),equipmentHits=[];for(const a of obstacles)for(const b of nativeObstacles)if(G.overlap(a.bounds,b.bounds))equipmentHits.push(b.id);if(equipmentHits.length)add('CRANE_OCCUPIED','岸橋完整實體／掃掠被原生建築占用',[...new Set(equipmentHits)]);
 let startX=31.2;while(startX<80&&L.legal({x:startX+.5,y:31.5,angle:Math.PI},cells,nativeObstacles).safe)startX+=.5;startX=Math.min(42.7,startX);
 const approach=L.line({x:startX,y:31.5},L.LOAD),outbound=L.line(L.LOAD,{x:20.8,y:31.5}),checks=[L.sweep(approach,cells,nativeObstacles),L.sweep(outbound,cells,nativeObstacles)],route={safe:checks.every(c=>c.safe),approach,outbound,gate:L.GATE,checks,load:L.LOAD,fullyOutside:p=>L.bounds(p).x1<L.GATE.x-L.EPS};
 for(const s of[approach,outbound])for(let u=0;u<=1.0001;u+=.02)for(const k of L.occupied(s.pose(u))){const[x,y]=k.split(',').map(Number);watch(x,y);}
 if(!route.safe)add('ROAD_GATE','真實道路無法承載整車進場／裝載／全車出閘；不會補造道路',checks.flatMap(c=>c.failures).map(v=>v.cell||v.id));
 /* 原生倉庫／貨運站必須以真道路接到出閘路網；不把全城存在當作連通。 */
 const inv=inventory(world),roadStart=key(20,31),connected=new Set(cells.has(roadStart)?[roadStart]:[]),queue=[...connected],parents=new Map();for(let i=0;i<queue.length;i++){const[x,y]=queue[i].split(',').map(Number);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const k=key(x+dx,y+dy);if(cells.has(k)&&!connected.has(k)){connected.add(k);parents.set(k,queue[i]);queue.push(k);}}}
 const access=b=>{const found=[];for(let y=b.y-1;y<=b.y+b.size;y++)for(let x=b.x-1;x<=b.x+b.size;x++){if(x>=b.x&&x<b.x+b.size&&y>=b.y&&y<b.y+b.size)continue;if((x<b.x||x>=b.x+b.size)&&(y<b.y||y>=b.y+b.size))continue;const p=F.inverse(x+.5,y+.5),k=key(Math.floor(p[0]),Math.floor(p[1]));if(connected.has(k))found.push(k);}return found;},supports={};
 for(const[kind,list,code]of[['warehouse',inv.warehouses,'WAREHOUSE'],['freight',inv.freight,'FREIGHT']]){const eligible=list.filter(b=>b.age>=9).map(b=>({building:b,access:access(b)})).filter(b=>b.access.length);if(!eligible.length)add(code+'_UNREACHABLE','缺少已完工且與真實出閘道路連通的'+(kind==='warehouse'?'倉庫 k64':'貨運站 k110'));else{const chosen=eligible[0];supports[kind]=chosen;const b=chosen.building;for(let y=b.y;y<b.y+b.size;y++)for(let x=b.x;x<b.x+b.size;x++)watched.add(key(x,y));let k=chosen.access[0];while(k){const[x,y]=k.split(',').map(Number);watch(x,y);k=parents.get(k);}}}
 const geometry=L.transferGeometry([...obstacles,...nativeObstacles]);if(!geometry.safe)add('LANDSIDE_SWEEP','陸側吊架完整掃掠被占用',geometry.failures.map(v=>v.obstacle));
 let nav=null,p04=null,p05=null,rawNav=null;const navFailures=[];
 if(!errors.length&&!options.quick){const grid={width:n,height:n,cells:water},berth={x:26.5+F.dx,y:36.5+F.dy,angle:Math.PI,quayY:35+F.dy},entries=[];for(let x=1.5;x<n-1;x++)if(V.validPose(grid,{x,y:n-3.5,angle:Math.PI*1.5}))entries.push(x);entries.sort((a,b)=>Math.abs(a-(40.5+F.dx))-Math.abs(b-(40.5+F.dx)));
  for(const x of entries.slice(0,4)){try{rawNav=V.compile(grid,{berth,entry:{x,y:n-3.5,angle:Math.PI*1.5}});break;}catch(e){navFailures.push(e.message);}}
  if(!rawNav)add('WATER_ROUTE','未驗證到足以容納整艘船的連續外海進出航道（保守路徑規劃）',navFailures.length?navFailures:['邊界無完整船寬入口']);
  else{const local=p=>({...p,x:p.x-F.dx,y:p.y-F.dy}),raw=p=>({...p,x:p.x+F.dx,y:p.y+F.dy}),originalAt=ms=>local(rawNav.at(ms));nav={...rawNav,berth:local(rawNav.berth),entry:local(rawNav.entry),at:originalAt};
   const shipErrors=[],slide=V.line(raw(nav.berth),raw(C.TARGET));if(!V.swept(grid,slide)||!V.swept(grid,V.line(raw(C.TARGET),raw(nav.berth))))shipErrors.push('真實靠泊對位全船掃掠不合法');
   const craneGeometry=G.validateSweep({source:C.PICK,target:C.DROP,liftZ:48,obstacles:[...obstacles,...nativeObstacles,...G.shipObstacles(C.TARGET,{excludeCargoId:C.CARGO.id})],cargo:C.CARGO,crane:{x:30,y:34.08}});if(!craneGeometry.safe)shipErrors.push('原岸橋／貨櫃完整交接掃掠受阻');
   p04=C.compile(nav,{originalAt,geometry:craneGeometry,errors:shipErrors});p05=D.compile(p04,route,{stock:D.inventory(parts),geometry});if(p05.errors.length)add('HANDOFF_GEOMETRY','貨櫃交接條件未成立',p05.errors);
   for(const s of rawNav.segments)for(let u=0;u<=1.0001;u+=Math.min(.1,1/Math.max(1,s.length*5)))for(const[x,y]of V.occupied(grid,s.pose(u))){const p=rotate(x+.5,y+.5,q,n);if(p[0]>=0&&p[1]>=0&&p[0]<n&&p[1]<n)watched.add(key(Math.floor(p[0]),Math.floor(p[1])));}
   for(const p of [C.TARGET,nav.berth])for(const[x,y]of V.occupied(grid,raw(p))){watch(x-F.dx,y-F.dy);}
  }
 }
 const watchList=[...watched].map(k=>{const[x,y]=k.split(',').map(Number);return{k,x,y,signature:signature(world.cells[y*n+x])};});
 return{valid:!errors.length,port,q,orientation:ORIENTATIONS[q],frame:F,errors,docks,route,geometry,nav,rawNav,p04,p05,watchList,footprint:{apron:[23,32,35,35],gate:{...L.GATE},noGeneratedRoad:true},native:{warehouses:inv.warehouses,freight:inv.freight,supports},navFailures};
}
return{ORIENTATIONS,rotate,frame,inventory,signature,inspect};});
