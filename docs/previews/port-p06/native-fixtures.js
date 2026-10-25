/* 獨立驗收／示範建立器：地形與建築均走原生工具；不屬營運判準。 */
window.P06Test={fixture:null,placementLog:[],
 buildCity(name='south',busy=false){if(window.P06){P06.disable();P06.layout=null;P06.timeMs=0;P06.acceptedMs=0;P06.reasons=[];P06.mode='live';P06.lastFrame=null;}GV.setMapSize(72);GV.newWorldSeeded(707);running=false;speed=0;GV.ai(false);money=100000000;terraBrush=1;this.placementLog=[];
  const q={south:0,west:1,north:2,east:3,offset:0}[name]??0,px=name==='offset'?25:16,py=name==='offset'?30:24,coast=py+3,n=N,rot=(x,y)=>q===0?[x,y]:q===1?[n-y,x]:q===2?[n-x,n-y]:[y,n-x],cell=(x,y)=>rot(x+.5,y+.5).map(Math.floor),put=(tool,x,y)=>{const p=cell(x,y),why=canPlace(tool,...p);if(!why){const ok=GV.place(tool,...p);this.placementLog.push({tool,x:p[0],y:p[1],ok});return ok;}return false;};
  /* 同正常玩家先清地、填土/挖水、削平，再放設施；沒有直接捏造 root/ref。 */
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const[a,b]=cell(x,y);let t=T(idx(a,b));while(!canPlace('doze',a,b)){GV.place('doze',a,b);t=T(idx(a,b));}if(t.t===1)GV.place('fill',a,b);if(y<coast&&t.t===0)GV.place('tland',a,b);if(y>=coast&&t.t===2)GV.place('tdig',a,b);if(t.t===2&&t.el)GV.place('traise',a,b);}
  const rootPlace=(tool,x,y,size)=>{const pts=[rot(x,y),rot(x+size,y),rot(x,y+size),rot(x+size,y+size)],a=Math.min(...pts.map(p=>p[0])),b=Math.min(...pts.map(p=>p[1])),why=canPlace(tool,a,b);if(why)throw Error(tool+' fixture rejected: '+why);const ok=GV.place(tool,a,b);this.placementLog.push({tool,x:a,y:b,ok});if(!ok)throw Error('Native placement failed '+tool);return[a,b];};
  const port=rootPlace('port',px,py,3);for(let x=px-4;x<=px+20;x++)put('road',x,py-1);put('dock',px+11,coast);
  const warehouse=rootPlace('warehouse',px+1,py-5,3),freight=rootPlace('freight',px+9,py-6,4);put('road',px+1,py-2);put('road',px+9,py-2);
  for(let x=3;x<n-3;x++)put('road',x,8);for(let y=8;y<py-1;y++)put('road',px-4,y);
  rootPlace('plant',3,3,3);rootPlace('water',7,3,1);
  // 真道路接通電廠／水廠與住宅商業工業；不用只含公園診所的空城冒充繁忙城市。
  for(let y=6;y<=8;y++)put('road',5,y);for(let y=4;y<=8;y++)put('road',7,y);for(let y=8;y<py-7;y++)put('road',3,y);
  const urbanEnd=busy?n-4:30;
  for(let y=10,row=0;y<py-7;y+=3,row++){for(let x=3;x<urbanEnd;x++)put('road',x,y+1);for(let x=4;x<urbanEnd-1;x++){const kind=['zr','zr','zc','zi'][(Math.floor((x-4)/3)+row)%4];put(kind,x,y);if(y+2<py-7)put(kind,x,y+2);}}
  for(let x=11;x<(busy?64:24);x+=8){rootPlace('plant',x,3,3);rootPlace('water',x+4,3,1);for(let y=6;y<=8;y++)put('road',x+2,y);for(let y=4;y<=8;y++)put('road',x+4,y);}
  for(let x=4,i=0;x<urbanEnd-3;x+=4,i++){const svc=['fire','police','clinic','recycling','park'][i%5];try{rootPlace(svc,x,py-6,plannedLotSize574(svc));}catch(e){/* 真實占用就跳過，不穿過原生倉庫／貨運站。 */}}
  // 水塔走真水管，不把道路視作隱形水管；沿現存道路鋪設原生 wpipe。
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const[a,b]=cell(x,y);if(T(idx(a,b)).road)put('wpipe',x,y);}
  /* 以原生 tick 完工並真實長出人口。相同種子／工具／tick 序列用在無 P06 對照。 */
  for(let i=0;i<(busy?80:60);i++)tick();for(const a of[cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;
  simAcc=0;running=false;speed=0;groundDirty=true;tool='pan';selTile=null;hover.x=hover.y=-1;weather=0;quality=1;visT=55;trafClock=12;waterT=waterF=0;shakeT=0;document.querySelector('#start').style.display='none';stopTitleAnim();
  this.fixture={name,q,px,py,port,warehouse,freight,busy,coast,cell,rot};GV.setRot(0);GV.setZoom(1.05);GV.lookAt(...cell(px+7,py+1));draw(0);this.syncHud();window.P06?.refresh();return{...this.snapshot(),fixture:{name,q,port,warehouse,freight,busy},placements:this.placementLog.length};
 },
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid advance');advance(seconds);return this.snapshot();},
 snapshot(){return{day,simAcc,speed,running,money,pop,N,stats:GV.stats(),chain:GV.chain346(),world:JSON.stringify(tiles),nativeTicks:window.__p06Ticks||0,traffic:{cars:cars.length,citizens:citizens.length,cargoShips:cargoShips.length,trains:trains.length,service:ambulances.length+recycleTrucks.length+ladderTrucks.length+policeCars.length+schoolBuses.length,buses:buses.length+rbuses.length},diag:this.diag(),candidate:window.P06?.inspect()||null};},
 economyState(){return{day,money,pop,simAcc,stats:GV.stats(),fin:{...fin},chain:GV.chain346(),supplies,transitRidership,smokeAcc,roadLoad:Array.from(roadLoad),roadPass:Array.from(roadPass),land:Array.from(LAND),world:JSON.stringify(tiles)};},
 diag(){const seen=new Set();let canvases=0,pixels=0;const walk=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(typeof HTMLCanvasElement!=='undefined'&&o instanceof HTMLCanvasElement){canvases++;pixels+=o.width*o.height;return;}if(o instanceof Map){for(const v of o.values())walk(v);return;}for(const v of Object.values(o))walk(v);};walk(SPR);walk(CACHE634);return{canvases,pixels,rgbaBytes:pixels*4,native634:CACHE634.size,bake:{...(window.__p06Bake||{})},p05Cache:window.P05?.visibilityCache?.size||0,p05ClipBuilds:window.P05?.clipBuilds||0};},
 skyStars(value){if(value!==undefined){if(!Array.isArray(value)||value.length!==90||value.some(s=>!Array.isArray(s)||s.length!==3||s.some(v=>!Number.isFinite(v))))throw Error('Native star input must be 90 finite triples');stars.splice(0,stars.length,...value.map(s=>s.slice()));}return stars.map(s=>s.slice());},
 syncHud(){updHud();document.querySelector('#bSpeed').textContent=speed===0?'⏸ 暫停':speed===1?'▶ 1x':speed===2?'▶ 2x':speed===3?'⏩ 3x':'⏩ 5x';},
 setRun(run,s=1){running=!!run;GV.setSpeed(s);lastT=performance.now();this.syncHud();return{running,speed};},
 setSpeed(s){GV.setSpeed(s);return speed;},
 view({rot=0,zoom=1.05,phase=55,season:sea=0}={}){GV.setRot(rot);GV.setZoom(zoom);visT=phase;GV.setSeason(sea);rainDays=sea===3?6:0;weather=0;waterT=waterF=0;trafClock=12;shakeT=0;groundDirty=true;const f=this.fixture;if(f)GV.lookAt(...f.cell(f.px+7,f.py+1));draw(0);return true;},
 // Test-only view-cache observation/control: no world, simulation or fiscal writes.
 groundState(){return{dirty:groundDirty,key:groundCacheKey,allocated:!!groundCache,width:groundCache?.width||0,height:groundCache?.height||0,canvasCount:groundCache?1:0,camera:{x:cam.x,y:cam.y,z:cam.z},rot:GV.rot(),waterF,day,DPR};},
 invalidateGround(){groundDirty=true;return this.groundState();},
 visualState(){return{flashT,shakeT,weather};},
 draw(dt=0){if(!Number.isFinite(dt)||dt<0||dt>.05)throw Error('Visual draw dt must be 0..0.05');draw(dt);},
 mutate(kind){const f=this.fixture;if(!f)throw Error('No native fixture');const p=(x,y)=>f.cell(x,y),place=(tool,x,y)=>GV.place(tool,...p(x,y));let result;
  if(kind==='remove-port'||kind==='port')result=GV.place('doze',...f.port);
  else if(kind==='rebuild-port'){result=GV.place('port',...f.port);for(let i=0;i<12;i++)tick();}
  else if(kind==='road'||kind==='broken-road')result=place('doze',f.px+3,f.py-1);
  else if(kind==='repair-road')result=place('road',f.px+3,f.py-1);
  else if(kind==='dock'||kind==='missing-dock')result=place('doze',f.px+11,f.coast);
  else if(kind==='repair-dock')result=place('dock',f.px+11,f.coast);
  else if(kind==='yard'||kind==='occupied-yard'||kind==='crane')result=place('park',f.px+5,f.py+1);
  else if(kind==='repair-yard')result=place('doze',f.px+5,f.py+1);
  else if(kind==='water'||kind==='blocked-water'){for(let x=0;x<N;x++)place('tland',x,f.coast+6);result=true;}
  else if(kind==='narrow-water'){for(let x=f.px+1;x<f.px+12;x++)place('tland',x,f.coast+1);result=true;}
  else if(kind==='gate'||kind==='illegal-gate')result=place('doze',f.px-3,f.py-1);
  else if(kind==='warehouse')result=GV.place('doze',...f.warehouse);
  else if(kind==='freight')result=GV.place('doze',...f.freight);
  else throw Error('Unknown mutation '+kind);window.P06?.changed();draw(0);return{kind,result,inspection:window.P06?.inspect()||null};
 }
};
