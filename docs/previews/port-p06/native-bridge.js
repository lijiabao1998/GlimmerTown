/* 只接原生城市已接受的模擬時間；候選帳永不寫入城市產業、財政或存檔。 */
const P06=window.P06={enabled:false,mode:'live',timeMs:0,layout:null,reasons:[],lastFrame:null,revision:0,scans:0,acceptedMs:0,
 world(){return{width:N,height:N,cells:tiles||[]};},
 api(){return{L:LandsideGeometry,G:PortTransferGeometry,V:VesselNavigation,C:ContainerTransfer,D:LandsideDispatch};},
 map(x,y){return this.layout?this.layout.frame.point(x,y):[x,y];},
 dep(x,y){const p=this.map(x,y);return viewDep(p[0],p[1]);},
 active(){return this.enabled&&!!this.layout?.valid&&!window.__noP06;},
 scan(){if(!tiles?.length)return{ports:[],warehouses:[],freight:[],counts:{},reasons:[{code:'NO_CITY',message:'請先開啟正常城市'}]};this.scans++;return NativeHarborLayout.inventory(this.world());},
 enable(portKey,q){const inv=this.scan(),port=inv.ports.find(p=>p.key===portKey)||inv.ports[0];this.enabled=true;window.__noHarborP01B=true;if(!port){this.reasons=[{code:'PORT_MISSING',message:'城市沒有原生港口 k18'}];this.layout&& (this.layout.valid=false);this.refresh();return this.inspect();}
  if(this.layout&&this.timeMs>0&&(this.layout.port.key!==port.key||q!==undefined&&+q!==this.layout.q)){this.reasons=[{code:'RESET_REQUIRED',message:'既有貨櫃仍在本港；換港／方向前須明確重設候選帳，不能瞬移貨物'}];this.layout.valid=false;this.refresh();return this.inspect();}
  const orientations=q===undefined?[0,1,2,3]:[+q],candidates=orientations.map(o=>NativeHarborLayout.inspect(this.world(),port,o,P01B.parts,this.api(),{quick:true}));let selected=null;
  for(const c of candidates.filter(c=>c.valid)){const full=NativeHarborLayout.inspect(this.world(),port,c.q,P01B.parts,this.api());if(full.valid){selected=full;break;}if(!selected)selected=full;}
  selected=selected?.valid?selected:(selected||candidates.sort((a,b)=>a.errors.length-b.errors.length)[0]);
  if(this.layout&&this.timeMs>0&&selected.valid&&Math.abs(selected.p05.start-this.layout.p05?.start)>1e-7){selected.valid=false;selected.errors.push({code:'REPLAY_TIMING_CHANGED',message:'航道已改變；保留原貨櫃位置，明確重設後才能採用新航次'});}
  if(!selected.valid){this.reasons=selected.errors;if(this.layout)this.layout.valid=false;else this.layout=selected;this.refresh();return this.inspect();}
  this.layout=selected;this.reasons=[];P03.plan=selected.nav;P03.error=null;P04.plan=selected.p04;P04.error=null;P04.baseAt=selected.nav.at;P05.plan=selected.p05;P05.geometry=selected.geometry;P05.route=selected.route;P05.connector=[];P05.originalRoads=[...selected.route.checks];P05.error=null;P04.renderKey=null;P05.paintKey=null;P05.staticKey=null;P05.visibilityCache=new Map();this.update();this.refresh();return this.inspect();
 },
 disable(){this.enabled=false;window.__noHarborP01B=true;this.refresh();},
 reset(){this.timeMs=0;this.acceptedMs=0;this.lastFrame=null;const old=this.layout;this.layout=null;this.reasons=[];if(this.enabled)this.enable(old?.port.key,old?.q);this.refresh();},
 live(){this.mode='live';this.refresh();},
 replay(ms){if(!Number.isFinite(ms)||ms<0)throw Error('重播時間必須非負有限值');this.mode='replay';if(!this.layout?.valid)return false;this.timeMs=Math.min(ms,this.layout.p05.duration);this.update();this.refresh();draw(0);return true;},
 changed(){this.revision++;if(this.active())this.checkTopology();this.refresh();},
 checkTopology(){if(!this.layout?.valid)return false;const bad=this.layout.watchList.filter(p=>NativeHarborLayout.signature(T(idx(p.x,p.y)))!==p.signature);if(bad.length){this.layout.valid=false;this.reasons=[{code:'LAYOUT_CHANGED',message:'港口／道路／水域／設備空間已變動，營運凍結；修復後按重新檢查。貨櫃清單與時間保留。',cells:bad.map(p=>p.k)}];window.__noHarborP01B=true;this.refresh();return false;}return true;},
 advance(ms){if(this.active()&&this.checkTopology()&&this.mode==='live'&&ms>0){const d=Math.min(ms,Math.max(0,this.layout.p05.duration-this.timeMs));this.timeMs+=d;this.acceptedMs+=d;this.update();}},
 update(){if(!this.active())return;window.__noHarborP01B=false;P04.frame=P04.plan.at(this.timeMs);P05.frame=P05.plan.at(this.timeMs);this.lastFrame=P05.frame;},
 status(){if(!this.enabled)return'P06 關閉：原生 T707 城市，沒有候選營運';if(this.reasons.length)return'不能營運：'+this.reasons.map(r=>r.message).join('；');const f=this.lastFrame;if(!f)return'等待合法布局';const c=f.counts;return`${this.layout.orientation} ${this.layout.port.key}｜${this.mode==='replay'?'固定時間重播（非產量）':'城市模擬同步'} ${(this.timeMs/1000).toFixed(1)}s｜${f.status}｜船 ${c.ship} 吊 ${c.crane} 場 ${c.yard} 車 ${c.truck} 出閘 ${c.dispatched}＝${c.total}｜無新增收入`;},
 inspect(){const l=this.layout,f=this.lastFrame;return{enabled:this.enabled,valid:!!l?.valid,active:this.active(),reasons:this.reasons,clock:{timeMs:this.timeMs,acceptedMs:this.acceptedMs,mode:this.mode},mode:this.mode,frame:f,plan:l?.p05?{start:l.p05.start,pickup:l.p05.pickup,loaded:l.p05.loaded,drive:l.p05.drive,finished:l.p05.finished,duration:l.p05.duration,p04:{start:l.p04.start,pickup:l.p04.pickup,delivery:l.p04.delivery,end:l.p04.end}}:null,layout:l?{port:l.port,q:l.q,orientation:l.orientation,footprint:l.footprint,docks:l.docks,watchCount:l.watchList.length,errors:l.errors,noGeneratedRoad:true,native:l.native}:null,scans:this.scans,revision:this.revision};},
 refresh(){const out=document.getElementById('p06-status');if(out)out.textContent=this.status();},
 focus(){if(this.layout){const p=this.map(29,33);GV.setZoom(1.5);GV.lookAt(...p);GV.forceDraw();}},
 legacyReserved(x,y){if(!this.active())return false;const p=this.layout.frame.inverse(x,y);return p[0]>=23&&p[0]<=36&&p[1]>=34&&p[1]<=40;}
};
window.P01B.build();
/* P01–P05 各繪製器／純狀態機保留；只替換候選初始化、坐標投影與時鐘來源。 */
window.P01B.setup=()=>{throw Error('P06 native mode never creates the fixed P01 scene');};
window.P01B.redraw=()=>draw(0);
P02.active=()=>P06.active();P03.active=()=>P06.active();P04.active=()=>P06.active();P05.active=()=>P06.active();
P03.time=()=>P06.timeMs;P02.time=()=>P06.timeMs;
P03.seek=ms=>P06.replay(ms);P04.seek=ms=>P06.replay(ms);P05.seek=ms=>P06.replay(ms);
P03.play=()=>P06.live();P03.pause=()=>{P06.mode='replay';};P03.reset=()=>P06.reset();
P05.rawObjects=function(){if(!this.active()||!this.frame)return[];const L=LandsideGeometry,f=this.frame,a=[{kind:'gate',x:22,y:31.5,dep:P06.dep(22,31.5)+.002}];for(const b of L.craneBodies(f.extension,f.hook.y,f.hook.z)){const q=b.bounds;a.push({kind:'crane',body:b,x:(q.x0+q.x1)/2,y:(q.y0+q.y1)/2,dep:P06.dep((q.x0+q.x1)/2,(q.y0+q.y1)/2)+.002});}a.push({kind:'truck',x:f.truck.x,y:f.truck.y,dep:P06.dep(f.truck.x,f.truck.y)+.003});return a;};
/* 暫停／繪圖只讀，不重建路徑，不累加貨量。 */
const p06begin=P04.begin.bind(P04);P04.begin=function(){if(P06.active()){P01B.phase=daylight().b<.62?0:55;P02.frameTime=P06.timeMs;p06begin();P06.lastFrame=P05.frame;}else{P04.frame=null;P05.frame=null;}};
window.__noHarborP01B=true;
