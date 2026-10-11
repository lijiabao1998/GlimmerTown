/* T634 focused software-Canvas guards. This never starts the game/browser, touches saves, or substitutes for Chromium acceptance. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),{createCanvas}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'../../..'),SOURCE=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const BASE=process.env.T634_BASE||'d88e36d',BASE_SOURCE=cp.execFileSync('git',['show',BASE+':index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:12*1024*1024});
/* Independent task-card contract; never derive these expected identities from the renderer or its inventory. */
const EXPECTED_IDS=[1,2,3,9,16,22,24,25,26,27,31,45,46,49,50,51,54,57,58,59,62,64,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,86,89,90,91,93,94,96,98,99,100,101,103,107,109,110,111,112,115,116,118,119,120,121,122,123,124,125,126,127,128,129,131,132,133];
const EXPECTED_RCI=[
 '1_1_0','1_1_1','1_1_2','1_1_3','1_1_4','1_1_5','1_1_6','1_1_7','1_1_8','1_1_9','1_1_10','1_1_11',
 '1_2_0','1_2_1','1_2_2','1_2_3','1_2_4','1_2_5','1_2_6','1_2_7','1_2_8','1_2_9','1_2_10','1_2_11',
 '1_3_0','1_3_1','1_3_2','1_3_3','1_3_4','1_3_5','1_3_6','1_3_7','1_3_8','1_3_9','1_3_10','1_3_11',
 '2_1_0','2_1_1','2_1_2','2_1_3','2_1_4','2_1_5','2_1_6','2_1_7','2_1_8','2_1_9','2_1_10','2_1_11',
 '2_2_0','2_2_1','2_2_2','2_2_3','2_2_4','2_2_5','2_2_6','2_2_7','2_2_8','2_2_9','2_2_10','2_2_11',
 '2_3_0','2_3_1','2_3_2','2_3_3','2_3_4','2_3_5','2_3_6','2_3_7','2_3_8','2_3_9','2_3_10','2_3_11',
 '3_1_0','3_1_1','3_1_2','3_1_3','3_1_4','3_1_5','3_1_6','3_1_7','3_1_8','3_1_9','3_1_10','3_1_11',
 '3_2_0','3_2_1','3_2_2','3_2_3','3_2_4','3_2_5','3_2_6','3_2_7','3_2_8','3_2_9','3_2_10','3_2_11',
 '3_3_0','3_3_1','3_3_2','3_3_3','3_3_4','3_3_5','3_3_6','3_3_7','3_3_8','3_3_9','3_3_10','3_3_11'
];
const EXPECTED_LEGACY=[8,29,53,60,63,66,85,88,92,104,117];
/* Empty night layers are valid for unlit sculptures; RCI and explicit work/beacon families must emit light. */
const REQUIRED_NIGHT=[1,2,3,62,69,76,121];
const REQUIRED_HOOKS={22:['field','farmer','sprinkler','sign'],26:['rotor'],46:['radar'],58:['steam','aviation'],62:['smoke','work'],69:['aviation'],76:['wheel'],89:['radar','aviation'],107:['smoke'],121:['smoke','work'],133:['radar','aviation']};
const PARTS=['core634.js','civic634.js','industry634.js','rci634.js'];
const START='/* ===== T634 WHOLE BATCH BEGIN ===== */',END='/* ===== T634 WHOLE BATCH END ===== */';
const report={kind:'supplemental software-Canvas regression; not browser acceptance',baseline:BASE,passed:[],failed:[],negativeControls:[],notRun:['Real Chromium pixels, in-game four rotations and interaction/overlay composition','Full verify.py / six simulation sentinels / original SPR fingerprint suite','Actual old-save load-save-load round trips and real legacy-art raster comparison','Physical-device frame timing and deployment checks'],counts:{renders:0,rci:0,facilities:0,legacyFixtures:0,cacheEvictions:0}};
function fail(code,msg){const e=new Error(code+': '+msg);e.guard=code;throw e;}
function need(ok,code,msg){if(!ok)fail(code,msg);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function sorted(a){return a.slice().sort((x,y)=>String(x).localeCompare(String(y),'en',{numeric:true}));}
function sha(b){return crypto.createHash('sha256').update(b).digest('hex');}
/* Independent retained-memory accounting: inspect actual canvas objects and dimensions, never the runtime pixel helper. */
function retainedCanvases(s){return [...new Set(Object.values(s).filter(c=>c&&typeof c.getContext==='function'&&Number.isFinite(c.width)&&Number.isFinite(c.height)))];}
function retainedPixels(s){return retainedCanvases(s).reduce((n,c)=>n+c.width*c.height,0);}
function fn(name,src=SOURCE){
 const start=src.indexOf('function '+name+'(');need(start>=0,'G00_HARNESS','missing function '+name);const body=src.indexOf('{',start);let d=1,i=body+1,q='',comment='';
 for(;d&&i<src.length;i++){const c=src[i],n=src[i+1];if(comment==='line'){if(c==='\n')comment='';continue;}if(comment==='block'){if(c==='*'&&n==='/'){comment='';i++;}continue;}if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==='/'&&n==='/'){comment='line';i++;continue;}if(c==='/'&&n==='*'){comment='block';i++;continue;}if(c==='\''||c==='"'||c==='`'){q=c;continue;}if(c==='{')d++;if(c==='}')d--;}
 need(d===0,'G00_HARNESS','unclosed function '+name);return src.slice(start,i);
}
function lotPlan(src){const a=src.indexOf('const LOT_PLAN574='),b=src.indexOf('\nconst BUILD_LOTS574=',a);need(a>=0&&b>a,'G00_HARNESS','lot plan missing');return new Function(src.slice(a,b)+';return LOT_PLAN574;')();}
const BASE_PLAN=lotPlan(BASE_SOURCE),helpers=['shade','lotLine574','lotPoly574','lotEllipse574','hashLocal590'].map(n=>fn(n)).join('\n');
const bi=SOURCE.indexOf(START),ei=SOURCE.indexOf(END,bi);need(bi>=0&&ei>bi,'G00_HARNESS','integrated candidate block missing');
const BLOCK=SOURCE.slice(bi+START.length,ei).trim();
function canvas(w,h){const c=createCanvas(w,h),g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g];}
function makeAPI(options={}){
 const win={},location={search:options.search||''},state={sea:0,alloc:0,rng:0,legacyCalls:[],canvases:[]};
 const cv=(w,h)=>{state.alloc++;if(options.noArt)fail('G11_SMOKE_PURITY','smoke ordering attempted canvas allocation');const pair=canvas(w,h);state.canvases.push(pair[0]);return pair;},rng=()=>{state.rng++;fail('G07_RNG','rendering consumed a random stream');},safeMath=Object.create(Math);safeMath.random=rng;
 const fixture=(which,k,v,stage,winter)=>{state.legacyCalls.push({which,k,v,stage,winter});const[c,g]=cv(96,120),[nc,ng]=cv(96,120);g.fillStyle='#897252';g.fillRect(8,8,80,110);ng.fillStyle='#e9cb8f';ng.fillRect(20,20,3,4);return{img:c,night:nc,w:96,h:120,ax:48,ay:112,lotMeta574:{sz:BASE_PLAN[k][1],kind:k,variant:v,stage,winter,hooks:{smoke:[[30,22]],steam:[[50,32]],sign:[62,42],work:[20,26,10,5]}}};};
 const body=helpers+'\n'+(options.block||BLOCK)+'\nreturn {bake:bake634,spr:spr634,on:t634On,variant:v634,legacy:legacyArt634,reg:ART634,rcis:RCI_CATALOG634,remain:REMAIN634,legacyIds:LEGACY634,cache:CACHE634,stats:STAT634,limit:LIMIT634,orderSmoke:orderSmoke634,orderMasses:orderRCIMasses634,roofPitch:rciRoofPitch634};';
 const names=['cv','season','clamp','window','location','Math','R','ri','rand','spriteTexRand','LOT_PLAN574','LOT603','LOT602','bakeArt601','bakeArt602','bakeArt603'];
 const api=new Function(...names,body)(cv,()=>state.sea,(x,a,b)=>Math.max(a,Math.min(b,x)),win,location,safeMath,rng,rng,rng,rng,BASE_PLAN,new Set([29,85,88,92]),new Set([53,104,117]),(...a)=>fixture(601,...a),(...a)=>fixture(602,...a),(...a)=>fixture(603,...a));
 const release=(keep=[])=>{const retained=new Set(keep);for(const c of state.canvases)if(!retained.has(c)){c.width=1;c.height=1;}state.canvases=state.canvases.filter(c=>retained.has(c));};return {...api,win,state,release};
}
function checkFamilies(api){need(same(sorted(Object.keys(api.reg).map(Number)),sorted(EXPECTED_IDS)),'G01_FAMILY_SET','renderer registry differs from 72 task-card ids');need(same(sorted([...api.remain]),sorted(EXPECTED_IDS)),'G01_FAMILY_SET','dispatch family set differs');need(same(sorted(Object.keys(api.rcis)),sorted(EXPECTED_RCI)),'G01_RCI_KEYS','catalog differs from 108 literal keys');need(same(sorted([...api.legacyIds]),sorted(EXPECTED_LEGACY)),'G01_LEGACY_SET','legacy adaptation set differs');}
function checkSprite(s,k,n,label,requireLight=true){
 need(s&&s.img&&s.night,'G02_GEOMETRY',label+' missing sprite');need(s.w===n*64+16&&s.img.width===s.w&&s.night.width===s.w,'G02_GEOMETRY',label+' width/footprint drift');need(s.h===s.img.height&&s.h===s.night.height&&s.h>8&&s.h<=n*32+192,'G02_GEOMETRY',label+' invalid height');need(s.ax===s.w/2&&s.h-s.ay===8&&s.lotMeta574.sz===n,'G02_GEOMETRY',label+' anchor/footprint drift');
 const d=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,l=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;let ink=0,light=0,orphan=0,edge=0;
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const i=(y*s.w+x)*4+3;if(d[i]){ink++;if(x===0||x===s.w-1||y===0||y===s.h-1)edge++;}if(l[i]){light++;if(!d[i])orphan++;}}
 need(orphan===0,'G03_ORPHAN_LIGHT',label+' has '+orphan+' night pixels outside day alpha');need(ink>10&&edge===0,'G02_GEOMETRY',label+' empty/clipped sprite: '+ink+'/'+edge);if(requireLight)need(light>0,'G03_NIGHT_PRESENT',label+' empty night layer');
 const hooks=s.lotMeta574.hooks;for(const [key,val]of Object.entries(hooks)){if(typeof val==='boolean')continue;need(Array.isArray(val),'G05_HOOK_GEOMETRY',label+'/'+key+' is not an array');if(!val.length)continue;const ps=typeof val[0]==='number'?[val]:val;for(const p of ps){need(Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite),'G05_HOOK_GEOMETRY',label+'/'+key+' invalid point');need(p[0]>=0&&p[0]<s.w&&p[1]>=0&&p[1]<s.h,'G05_HOOK_GEOMETRY',label+'/'+key+' outside canvas');if(key==='work')need(p.length===4&&p[2]>0&&p[3]>0,'G05_HOOK_GEOMETRY',label+' bad work rectangle');}}
 for(const h of REQUIRED_HOOKS[k]||[])need(Array.isArray(hooks[h])&&hooks[h].length>0,'G05_REQUIRED_HOOK',label+' missing '+h);
 if(k===26){const v=s.lotMeta574.variant;if(v===2)need(hooks.rotorStatic===true,'G05_REQUIRED_HOOK',label+' vertical-axis rotor must suppress legacy blades');else need(Array.isArray(hooks.rotors)&&hooks.rotors.length===v+1&&hooks.rotors.every(p=>p.length===3&&p[2]>0),'G05_REQUIRED_HOOK',label+' horizontal turbines need one animated anchor each');}
 if(k===46)need(hooks.radarStatic===true,'G05_REQUIRED_HOOK',label+' static weather dish must suppress legacy overlay');
 const hookSmoke=[...(hooks.smoke||[]),...(hooks.steam||[])].map(p=>({dx:p[0]-s.ax,dy:p[1]-s.ay}));need(same(s.smoke,hookSmoke),'G05_SMOKE_ANCHOR',label+' smoke differs from canvas hooks');
 return {hash:sha(Buffer.from(d)),nightHash:sha(Buffer.from(l)),ink,light,h:s.h};
}
function unique(rows,code='G04_RCI_DISTINCT'){const seen=new Map();for(const r of rows){need(!seen.has(r.hash),code,r.key+' duplicates '+seen.get(r.hash));seen.set(r.hash,r.key);}}
function immovable(obj){return new Proxy(Object.freeze(obj),{set(){fail('G07_STATE_WRITE','bd set');},deleteProperty(){fail('G07_STATE_WRITE','bd delete');},defineProperty(){fail('G07_STATE_WRITE','bd define');}});}
/* 獨立煙序真值：以物件身分和手寫次序驗本體→煙→前景，不拿 renderer 的排序當答案。 */
function smokeReadonly634(value,label='object'){
 if(!value||typeof value!=='object')return value;
 for(const key of Object.keys(value))value[key]=smokeReadonly634(value[key],label+'.'+key);
 return new Proxy(Object.freeze(value),{set(){fail('G07_STATE_WRITE',label+' set');},deleteProperty(){fail('G07_STATE_WRITE',label+' delete');},defineProperty(){fail('G07_STATE_WRITE',label+' define');}});
}
function smokeRoot634(id,x,y,k,sz,extra={}){return smokeReadonly634({id,x,y,dep:40-x,t:{bld:{k,...(sz===undefined?{}:{sz}),v:0,age:12,pw:1,...extra}}},id);}
function smokeParticle634(id,x,y,sz,extra={}){return smokeReadonly634({id,dep:-10,smoke:{wx:21,wy:32,age:0,life:2.8,col:'#c9ccc4',big:false,dep:7,...(x===undefined?{}:{lot574:{x,y,sz,dx:2,dy:-30}}),...extra}},id);}
function smokeBirth634(k=3,n=1){
 const root=smokeRoot634('root',4,7,k,n),front=smokeRoot634('foreground',5,9,4,1),back=smokeReadonly634({id:'background',dep:90,ped:{at:2}}),p=smokeParticle634('birth',4,7,n);
 return {input:[p,back,root,front],expected:[back,root,p,front]};
}
function checkSmokeOrder634(a,input,expected,label,off=false){
 const original=input.slice(),snapshots=original.map(o=>JSON.stringify(o)),before=JSON.stringify(a.stats),alloc=a.state.alloc,rng=a.state.rng,cache=a.cache.size;
 const result=a.orderSmoke(input);
 if(off)need(result===input,'G06_FLAGS',label+' did not return original array');
 need(input.length===expected.length&&input.every((o,i)=>o===expected[i]),'G11_SMOKE_ATTACHMENT',label+' expected '+expected.map(o=>o.id).join(',')+'; got '+input.map(o=>o.id).join(','));
 need(original.every((o,i)=>JSON.stringify(o)===snapshots[i]),'G07_STATE_WRITE',label+' mutated building, particle, drift, age or color');
 need(a.state.alloc===alloc&&a.state.rng===rng&&JSON.stringify(a.stats)===before&&a.cache.size===cache,'G11_SMOKE_PURITY',label+' allocated/baked art, used random or touched the sprite cache');
}
function test(name,run){try{const detail=run();report.passed.push({name,detail:detail||true});console.log('PASS '+name);}catch(e){report.failed.push({name,guard:e.guard||'UNEXPECTED',message:e.message});console.error('FAIL '+name+': '+e.message);}}
function red(name,guard,run){try{run();report.negativeControls.push({name,passed:false,expected:guard,actual:'no failure'});fail('G10_RED_CONTROL',name+' did not fail');}catch(e){if(e.guard===guard){report.negativeControls.push({name,passed:true,firstGuard:e.guard});return;}if(e.guard==='G10_RED_CONTROL')throw e;report.negativeControls.push({name,passed:false,expected:guard,actual:e.guard||e.message});throw e;}}
/* Lab 修訂的獨立比例規格：只守已約定的級別與退回高瘦版，不取烘圖結果反推門檻。 */
function checkProportions634(a){
 const caps={1:{height:34,floors:2},2:{height:50,floors:3},3:{height:65,floors:5}},levels={1:[],2:[],3:[]};
 for(const id of EXPECTED_RCI){const lv=Number(id.split('_')[1]),row=a.rcis[id];for(const m of row.m){need(m[4]<=caps[lv].height&&m[5]<=caps[lv].floors,'G12_RCI_PROPORTIONS',id+' restored excessive height or storey count');}levels[lv].push(Math.max(...row.m.map(m=>m[4])));}
 const means={};for(const lv of[1,2,3])means[lv]=levels[lv].reduce((x,y)=>x+y,0)/levels[lv].length;
 need(means[1]+4<means[2]&&means[2]+6<means[3],'G12_RCI_PROPORTIONS','levels flattened into the same silhouette height');
 for(const id of['1_1_0','1_1_6','1_2_0','1_2_1'])need(a.rcis[id].m.length===1&&a.rcis[id].m[0][2]>=.8,'G12_RCI_TERRACE','terrace roof fragmented into tiny towers');
 return{caps,meanEaveHeightByLevel:means,continuousTerraces:4};
}
/* Physical prism/ray oracle is independent of the painter's depth heuristic. */
function geometryOverlap634(a,b){return[Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])),Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]))];}
function checkJoins634(api){
 const allowedStacks=new Set(['1_3_7','2_2_1','2_3_3','2_3_11']);let contacts=0,pairs=0;
 for(const id of EXPECTED_RCI){const ms=api.rcis[id].m;for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){
  pairs++;const a=ms[i],b=ms[j],o=geometryOverlap634(a,b);if(o[0]>.002&&o[1]>.002){const inside=b[0]>=a[0]-.001&&b[1]>=a[1]-.001&&b[0]+b[2]<=a[0]+a[2]+.001&&b[1]+b[3]<=a[1]+a[3]+.001;need(allowedStacks.has(id)&&i===0&&inside&&b[4]>a[4]&&b[9]&&b[9].stack===i,'G13_INTERSECTION',id+' has visible interpenetrating masses');}
 }
 for(let j=1;j<ms.length;j++){const m=ms[j],join=m[9];if(!join||join.attach===undefined)continue;const a=ms[join.attach];need(a&&join.attach!==j,'G13_JOIN','missing parent '+id);const axis=join.face==='u'?0:1,other=1-axis,overlap=Math.min(a[other]+a[other+2],m[other]+m[other+2])-Math.max(a[other],m[other]);need(Math.abs(a[axis]+a[axis+2]-m[axis])<=.002&&overlap>.025,'G13_JOIN',id+' detached or buried attachment');contacts++;}
 }
 for(const [id,face,maxHeight,maxPitch]of[['1_1_5','v',10,2],['3_2_4','u',13,3],['1_1_8','u',11,2],['2_1_9','v',12,2],['3_3_3','u',14,3]]){
  const ms=api.rcis[id].m,m=ms[1],j=m[9];need(j&&j.attach===0&&j.face===face&&j.chimney===false,'G13_JOIN',id+' is not an explicit shared-wall annex');
  need(m[5]===1&&m[4]<=maxHeight&&m[4]<ms[0][4]&&m[4]<=ms[0][4]/Math.max(1,ms[0][5])*1.35,'G13_ANNEX_PROPORTIONS',id+' single-storey annex towers above its parent storey rhythm');
  need(api.roofPitch(m)<=maxPitch&&api.roofPitch(m,true)<=3,'G13_ANNEX_ROOF',id+' annex retained standalone main-roof pitch');
 }
 return{catalogs:108,pairs,contacts,intentionalContainedRoofTowers:4};
}
function checkMassOrder634(api){
 let pairs=0;const rayHit=(p,b)=>{const[u,v,z]=p,[a,c,du,dv,h]=b,lo=Math.max(0,a-u,c-v,-z/32),hi=Math.min(a+du-u,c+dv-v,(h-z)/32);return hi>lo+.0001&&hi>.0001;};
 for(const id of EXPECTED_RCI){const rows=api.orderMasses(api.rcis[id].m);need(rows.length===api.rcis[id].m.length&&new Set(rows.map(x=>x.i)).size===rows.length,'G14_MASS_ORDER',id+' omitted a mass');
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const early=rows[i].m,late=rows[j].m,o=geometryOverlap634(early,late);if(o[0]>.002&&o[1]>.002)continue;pairs++;
   const[u,v,du,dv,h]=late;for(let x=1;x<8;x++)for(let y=1;y<8;y++)for(const p of[[u+du*x/8,v+dv,h*y/8],[u+du,v+dv*x/8,h*y/8],[u+du*x/8,v+dv*y/8,h]])need(!rayHit(p,early),'G14_MASS_ORDER',id+' later-painted rear wall crosses nearer solid at '+p.join(','));
  }
 }
 return{catalogs:108,nonintersectingPairs:pairs,rayDirection:[1,1,32]};
}
function checkGroundFootprints634(api){
 const inv=JSON.parse(fs.readFileSync(path.join(__dirname,'asset-coverage-baseline.json'))),noop=()=>{},g=new Proxy({},{get:()=>noop,set:()=>true});let primary=0,draws=0,points=0;
 for(const row of inv.building_types.filter(r=>r.remaining_new)){primary+=(row.k<=3?3:1)*(row.k<=3?12:3);for(const n of new Set([row.new_size,row.old_size]))for(let lv=1;lv<=(row.k<=3?3:1);lv++)for(let v=0;v<(row.k<=3?12:3);v++){
  const P=(u,v,z=0)=>{if(z<=.01){points++;need(u>=-.001&&v>=-.001&&u<=n+.001&&v<=n+.001,'G15_GROUND_FOOTPRINT',row.k+'/'+lv+'/'+v+' real ground point exceeds lot');}return[(u-v)*32,(u+v)*16-z];},quad=(u,v,du,dv,z=0)=>[P(u,v,z),P(u+du,v,z),P(u+du,v+dv,z),P(u,v+dv,z)];
  const T={k:row.k,v,n,lv,we:1,stage:2,sea:0,winter:false,g,ng:g,P,quad,poly:noop,line:noop,ell:noop,LIT:noop,H:()=>.5,box:(u,v,du,dv,h,c,z=0)=>{quad(u,v,du,dv,z);return quad(u,v,du,dv,h+z);},occlude:noop,shade:x=>x,hooks:{}};api.reg[row.k].draw(T);draws++;
 }}need(primary===315,'G15_GROUND_FOOTPRINT','did not examine every primary design');return{primary,draws,points};
}
function traceBayAPI634(block=BLOCK){
 const old='const shell=(m,annex=false)=>{',injected='const shell=(m,annex=false)=>{if(annex)window.__bayTrace634.push({m,parent:window.__bayParent634});else window.__bayParent634=m;';need(block.includes(old),'G00_HARNESS','shell trace anchor absent');return makeAPI({block:block.replace(old,injected)});
}
function checkGeneratedBays634(a){
 let bays=0;for(const id of EXPECTED_RCI){const[k,lv,v]=id.split('_').map(Number);a.win.__bayTrace634=[];a.bake(k,v,1,lv,1,2,false,1);
  for(const row of a.win.__bayTrace634){bays++;const m=row.m;need(m[0]>=0&&m[1]>=0&&m[0]+m[2]<=1&&m[1]+m[3]<=1,'G16_GENERATED_BAY','generated bay exceeds lot '+id);for(const q of a.rcis[id].m){if(q===row.parent)continue;const o=geometryOverlap634(m,q);need(o[0]<=.001||o[1]<=.001,'G16_GENERATED_BAY',id+' procedural bay penetrates another wing');}}
  a.release();
 }need(bays>=30,'G16_GENERATED_BAY','all projecting bays were removed instead of repairing blocked wall segments');return{catalogs:108,actualGeneratedBays:bays};
}
/* Immutable physical witness points above the parent's maximum roof, recorded
   before repair. These are pixels that an opaque rear roof must never erase. */
function checkRoofTowers634(a){
 const probes=[['1_3_7',33,155],['2_3_3',32,154],['2_3_11',33,141]];let buried=0;
 const sample=(s,x,rawY,layer='img')=>Array.from(s[layer].getContext('2d').getImageData(x,rawY-(224-s.h),1,1).data);
 for(const[id,x,y]of probes){const[k,lv,v]=id.split('_').map(Number),ms=a.rcis[id].m,s=a.bake(k,v,1,lv,1,2,false,1);need(sample(s,x,y,'night')[3]>100,'G17_EXPOSED_TOWER',id+' exposed upper window erased by a rear roof');
  const parent=ms[0],tower=ms[1];a.rcis[id].m=[parent];const base=a.bake(k,v,1,lv,1,2,false,1);a.rcis[id].m=ms;
  for(const f of[.25,.5,.75])for(const dz of[4,8]){const u=tower[0]+tower[2]*f,vv=tower[1]+tower[3],z=parent[4]-dz,xx=Math.round(40+32*(u-vv)),yy=Math.round(184+16*(u+vv)-z);need(same(sample(s,xx,yy),sample(base,xx,yy))&&same(sample(s,xx,yy,'night'),sample(base,xx,yy,'night')),'G17_BURIED_TOWER',id+' buried tower wall or light painted through parent roof');buried++;}a.release();
 }
 return{exposedWindows:probes.length,buriedSurfaceComparisons:buried};
}
const api=makeAPI();
test('Literal coverage, integrated source equality, and baseline lot sizes',()=>{checkFamilies(api);const fragments=PARTS.map(p=>fs.readFileSync(path.join(__dirname,p),'utf8')).join('\n')+'\nconst ART634={...CIVIC634,...INDUSTRY634,...RCI634};';need(BLOCK===fragments.trim(),'G01_INTEGRATION','integrated block differs from submitted fragments');need(same(lotPlan(SOURCE),BASE_PLAN),'G01_FOOTPRINT_SOURCE','candidate changed baseline lot plan');for(const key of EXPECTED_RCI){const a=api.rcis[key];need(typeof a.name==='string'&&a.name&&typeof a.archetype==='string'&&a.archetype&&Array.isArray(a.m)&&a.m.length,'G01_RCI_KEYS','incomplete '+key);for(const m of a.m)need(m.slice(0,6).every(Number.isFinite)&&m[0]>=0&&m[1]>=0&&m[2]>0&&m[3]>0&&m[0]+m[2]<=1&&m[1]+m[3]<=1,'G02_GEOMETRY','RCI mass outside one tile '+key);}return{families:72,rciKeys:108,legacy:11};});
test('Lab-referenced RCI mass limits retain a readable three-level hierarchy',()=>checkProportions634(api));
test('Every RCI attachment is an exterior shared-wall join or an intentional contained roof tower',()=>checkJoins634(api));
test('Mass paint order agrees with independent isometric solid-ray occlusion',()=>checkMassOrder634(api));
test('All315 designs and all new/old sizes stay within their actual ground footprint',()=>checkGroundFootprints634(api));
test('Actual nested-shell bay calls never occupy another wing base',()=>checkGeneratedBays634(traceBayAPI634()));
test('Contained upper-storey windows survive while buried walls stay under the roof',()=>checkRoofTowers634(makeAPI()));
test('Approved 601/602/603 original renderers remain byte-identical',()=>{const names=['bakeArt601','bakeArt602','bakeArt603','art601_k4','art601_k5','art601_k8','art601_k60','art601_k63','art601_k66','art601_k81','art601_k97','kit602','art602_k53','art602_k104','art602_k117','art602_k97','kit603','art603_k29','art603_k85','art603_k92','art603_k88'];for(const n of names)need(fn(n)===fn(n,BASE_SOURCE),'G01_APPROVED_SOURCE',n+' changed from baseline');return{functions:names.length};});
test('Default-off, strict opt-in, both escape valves, and no cold rendering',()=>{
 for(const search of['','?T634=0','?T634=10','?xT634=1','?T634=1&noT634=1','?noT634&T634=1']){const a=makeAPI({search});need(a.on()===false,'G06_FLAGS','unexpected opt-in '+search);a.win.__t634={};need(a.on()===false,'G06_FLAGS','truthy object enabled candidate');for(const k of[1,3,22,8,53])need(a.spr(immovable({k,lv:2,v:1,we:1}),4,5)===null,'G06_FLAGS','default returned candidate');need(a.state.alloc===0&&a.stats.bakes===0&&a.cache.size===0,'G06_FLAGS','default path allocated art');}
 for(const search of['?T634=1','?x=1&T634=1','?T634=1&noT634=0']){const a=makeAPI({search});need(a.on()===true,'G06_FLAGS','explicit opt-in failed');a.win.__noT634=true;need(a.on()===false&&a.spr({k:1,lv:1,v:0})===null,'G06_FLAGS','runtime escape failed');}
 const a=makeAPI();a.win.__t634=true;need(a.on()===true,'G06_FLAGS','runtime opt-in failed');a.win.__noT634=true;need(a.spr({k:1,lv:1,v:0})===null,'G06_FLAGS','runtime escape did not win');return'12 URL/runtime cases plus no-allocation reads';
});
test('Candidate smoke attaches after actual n1/n3 owners and before foreground without side effects',()=>{
 const a=makeAPI({search:'?T634=1',noArt:true});let cases=0;
 for(const k of[3,58,53])for(const n of[1,3]){const f=smokeBirth634(k,n);checkSmokeOrder634(a,f.input,f.expected,'k'+k+'/n'+n);checkSmokeOrder634(a,f.input,f.expected,'idempotent k'+k+'/n'+n);cases+=2;}
 const rootA=smokeRoot634('A-default-n1',4,7,3),rootB=smokeRoot634('B-n3',14,17,58,3),rootC=smokeRoot634('C-legacy-n1',24,27,53,1),front=smokeRoot634('foreground',15,21,4,1);
 const a1=smokeParticle634('A-first',4,7,1),a2=smokeParticle634('A-second',4,7,1,{age:1.1,wx:29,wy:9,col:'#e1e7e3',big:true}),b1=smokeParticle634('B-first',14,17,3),b2=smokeParticle634('B-second',14,17,3),c1=smokeParticle634('C-first',24,27,1),world=smokeParticle634('world'),ped=smokeReadonly634({id:'pedestrian',dep:500,ped:{at:2}});
 const input=[b1,a1,world,rootA,ped,c1,rootB,a2,front,rootC,b2],expected=[world,rootA,a1,a2,ped,rootB,b1,b2,front,rootC,c1];
 checkSmokeOrder634(a,input,expected,'interleaved owners and stable particle order');cases++;
 const zero=smokeRoot634('zero-size-fallback',30,31,3,0),z=smokeParticle634('zero-size-smoke',30,31,1);checkSmokeOrder634(a,[z,zero,front],[zero,z,front],'bd.sz || 1 fallback');cases++;
 const source=fn('orderSmoke634');need(!/\b(?:cv|bake634|legacyArt634|getContext|getImageData|putImageData)\s*\(/.test(source),'G11_SMOKE_PURITY','ordering includes canvas/baking work');
 need(/lotObjectOrder574\(objs\);[^\n]*\n\s*orderSmoke634\(objs\);/.test(fn('draw')),'G11_SMOKE_ATTACHMENT','draw does not apply candidate attachment immediately after existing lot ordering');
 return{cases,owners:'k3, k58, legacy k53',footprints:[1,3],allocation:a.state.alloc,randomCalls:a.state.rng};
});
test('Smoke ordering preserves default-off, escape valves, protected roots and unmatched particles',()=>{
 let disabled=0;for(const [search,flags]of[['',{}],['?T634=0',{}],['?T634=10',{}],['?xT634=1',{}],['?T634=1&noT634=1',{}],['?noT634&T634=1',{}],['',{__t634:{}}],['?T634=1',{__noT634:true}],['',{__t634:true,__noT634:true}]]){
  const a=makeAPI({search,noArt:true});Object.assign(a.win,flags);const f=smokeBirth634();checkSmokeOrder634(a,f.input,f.input.slice(),'disabled '+search,true);disabled++;
 }
 const a=makeAPI({search:'?T634=1',noArt:true}),candidate=smokeRoot634('candidate',4,7,3,1),protectedRoot=smokeRoot634('protected-k5',14,17,5,3),trueLot=smokeRoot634('true-lot',24,27,58,3,{lot574:true}),legacyLot=smokeRoot634('legacy-true-lot',34,37,53,3,{lot574:true}),ref=smokeRoot634('ref',44,47,3,1,{ref:1}),front=smokeRoot634('foreground',7,10,4,1);
 const protectedSmoke=smokeParticle634('protected-smoke',14,17,3),lotSmoke=smokeParticle634('true-lot-smoke',24,27,3),legacySmoke=smokeParticle634('legacy-lot-smoke',34,37,3),refSmoke=smokeParticle634('ref-smoke',44,47,1),wrongSize=smokeParticle634('wrong-size',4,7,3),wrongX=smokeParticle634('wrong-x',5,7,1),wrongY=smokeParticle634('wrong-y',4,8,1),absent=smokeParticle634('absent-root',54,57,1),world=smokeParticle634('world-smoke'),riot=smokeParticle634('riot-smoke',undefined,undefined,undefined,{riot:true,col:'#4c4b49'}),good=smokeParticle634('candidate-smoke',4,7,1);
 const untouched=[protectedSmoke,lotSmoke,legacySmoke,refSmoke,wrongSize,wrongX,wrongY,absent,world,riot,candidate,front,protectedRoot,trueLot,legacyLot,ref];
 checkSmokeOrder634(a,untouched.slice(),untouched,'all excluded ownership paths');
 const input=[good,...untouched],expected=[...untouched.slice(0,11),good,...untouched.slice(11)];checkSmokeOrder634(a,input,expected,'eligible smoke mixed with all excluded paths');
 checkSmokeOrder634(a,[],[],'empty array');const runtime=makeAPI({noArt:true});runtime.win.__t634=true;const f=smokeBirth634();checkSmokeOrder634(runtime,f.input,f.expected,'runtime opt-in');
 return{disabled,excludedCases:10,mixedOwners:6,canvasAllocations:a.state.alloc};
});
test('Four seasons, snow/no-snow, wealth, geometry, night occlusion, hooks and distinct designs',()=>{
 const groups=new Map();let rci=0,facilities=0;
 for(const k of EXPECTED_IDS){const n=BASE_PLAN[k][1];for(let lv=1;lv<=(k<=3?3:1);lv++)for(let v=0;v<(k<=3?12:3);v++){
  const key=[k,lv,v].join('_'),wealthHashes=new Set();for(const we of k===1?[0,1,2]:[1])for(let sea=0;sea<4;sea++){
   let dry;for(const winter of[false,true]){const s=api.bake(k,v,n,lv,we,2,winter,sea),r=checkSprite(s,k,n,key+'/'+we+'/'+sea+'/'+Number(winter),REQUIRED_NIGHT.includes(k));report.counts.renders++;
    if(!winter)dry=r.hash;else need(dry!==r.hash,'G04_SNOW_DISTINCT',key+' snow identical at season '+sea+' wealth '+we);
    if(sea===1&&!winter){if(k===1)wealthHashes.add(r.hash);if(we===1){const group=k+'_'+lv;if(!groups.has(group))groups.set(group,[]);groups.get(group).push({key,hash:r.hash});}}api.release();
   }
  }
  if(k===1)need(wealthHashes.size===3,'G04_WEALTH_DISTINCT',key+' wealth finishes identical');if(k<=3)rci++;else facilities++;
 }
 }
 for(const [key,rows]of groups)unique(rows,Number(key.split('_')[0])<=3?'G04_RCI_DISTINCT':'G04_FACILITY_DISTINCT');
 for(let k=1;k<=3;k++)for(let lv=1;lv<=3;lv++){const shapes=[];for(let v=0;v<12;v++){const key=[k,lv,v].join('_'),m=api.rcis[key].m.map(m=>[...m.slice(0,6),m[7]]);shapes.push({key,hash:sha(JSON.stringify(m))});}unique(shapes,'G04_RCI_STRUCTURAL');}
 need(api.state.rng===0,'G07_RNG','random stream was touched');report.counts.rci=rci;report.counts.facilities=facilities;return{renders:report.counts.renders,rci,facilities,randomCalls:api.state.rng};
});
test('Cache identity, bounded eviction, full visual key, read-only bd and zero random calls',()=>{
 const a=makeAPI({search:'?T634=1'}),bd=immovable({k:1,lv:2,v:7,we:1,age:12,lot574:false,sz:1,den:2}),before=JSON.stringify(bd);
 need(a.spr(bd,4,5,false,2,false)===null&&a.state.alloc===0,'G08_CACHE','cold lookup baked');const s=a.spr(bd,4,5),alloc=a.state.alloc;need(s&&a.spr(bd,4,5)===s&&a.state.alloc===alloc,'G08_CACHE','cache hit rebaked');need(JSON.stringify(bd)===before,'G07_STATE_WRITE','save-visible bd changed');
 const changed=[{...bd,we:0},{...bd,we:2},{...bd,lv:3},{...bd,v:8}];for(const b of changed)need(a.spr(immovable(b),4,5)!==s,'G08_CACHE','key omitted wealth/level/variant');need(a.spr(bd,4,5,true)!==s,'G08_CACHE','snow omitted from key');a.state.sea=2;need(a.spr(bd,4,5)!==s,'G08_CACHE','season omitted from key');need(a.spr(bd,4,5,false,3)!==s,'G08_CACHE','stage omitted from key');
 need(a.spr({k:4,lv:1,v:0})===null&&a.spr({k:1,ref:1})===null&&a.spr(null)===null,'G08_CACHE','approved/ref/null path overridden');
 for(const k of EXPECTED_IDS)for(let v=0;v<(k<=3?12:3);v++){a.state.sea=v%4;const r=a.spr(immovable({k,lv:k<=3?2:1,v,sz:BASE_PLAN[k][1],we:1}),17,23,!!(v%2));need(r,'G08_CACHE','cache render failed k'+k);const pixels=[...a.cache.values()].reduce((n,s)=>n+retainedPixels(s),0);need(a.cache.size<=192&&a.stats.pixels<=16000000&&a.stats.pixels===pixels,'G08_CACHE','unbounded cache or incorrect pixel ledger');a.release([...a.cache.values()].flatMap(retainedCanvases));}
 need(a.cache.size<a.stats.bakes,'G08_CACHE','eviction never exercised');report.counts.cacheEvictions=a.stats.bakes-a.cache.size;need(a.state.rng===0&&a.stats.fail===0,'G07_RNG','random/failure during cache sweep');const result={entries:a.cache.size,pixels:a.stats.pixels,bakes:a.stats.bakes,evictions:report.counts.cacheEvictions};a.release();
 const b=makeAPI({search:'?T634=1'});need(b.limit.entries===192&&b.limit.pixels===16000000,'G08_CACHE','published limits changed');
 for(let sea=0;sea<4;sea++)for(let stage=0;stage<4;stage++)for(let v=0;v<3;v++)for(const winter of[false,true]){b.state.sea=sea;need(b.spr(immovable({k:51,v,sz:BASE_PLAN[51][1]}),13,19,winter,stage),'G08_CACHE','large family bake failed');const pixels=[...b.cache.values()].reduce((n,s)=>n+retainedPixels(s),0);need(b.stats.pixels<=16000000&&b.stats.pixels===pixels,'G08_PIXEL_LIMIT','pixel-cap branch or ledger failed');b.release([...b.cache.values()].flatMap(retainedCanvases));}
 need(b.stats.bakes===96&&b.cache.size<96,'G08_PIXEL_LIMIT','pixel-only eviction was not exercised below entry cap');result.pixelOnly={bakes:b.stats.bakes,entries:b.cache.size,pixels:b.stats.pixels,evictions:b.stats.bakes-b.cache.size};b.release();return result;
});
test('Legacy adapters select approved renderer and preserve requested old footprint (fixtures)',()=>{
 const a=makeAPI({search:'?T634=1'});for(const k of EXPECTED_LEGACY)for(const n of[1,2])for(const winter of[false,true]){
  const bd=immovable({k,v:1,sz:n,lv:1}),before=JSON.stringify(bd),s=a.spr(bd,3,5,winter,3),q=n/BASE_PLAN[k][1],call=a.state.legacyCalls.at(-1),expected=[29,85,88,92].includes(k)?603:[53,104,117].includes(k)?602:601;
  need(s&&call.which===expected&&call.k===k&&call.v===1&&call.stage===3&&call.winter===winter,'G09_LEGACY_ROUTE','wrong renderer or arguments k'+k);need(s.w===Math.ceil(96*q)&&s.h===Math.ceil(120*q)&&s.ax===48*q&&s.ay===112*q&&s.lotMeta574.sz===n,'G09_LEGACY_GEOMETRY','legacy footprint/anchor changed k'+k);need(same(s.lotMeta574.hooks.sign,[62*q,42*q])&&same(s.lotMeta574.hooks.work,[20*q,26*q,10*q,5*q]),'G09_LEGACY_GEOMETRY','legacy hook scaling mismatch');need(JSON.stringify(bd)===before,'G07_STATE_WRITE','legacy bd changed');report.counts.legacyFixtures++;
  need(a.spr(immovable({...bd,lot574:true}),3,5,winter,3)===null,'G09_LEGACY_ROUTE','approved modern lot replaced');a.release([...a.cache.values()].flatMap(retainedCanvases));
 }a.release();return{cases:report.counts.legacyFixtures,scope:'synthetic source canvases; approved original renderers checked separately for byte identity'};
});
test('Negative controls first fail at their intended behavioral guards',()=>{
 red('Remove required family 133','G01_FAMILY_SET',()=>{const a=makeAPI();delete a.reg[133];checkFamilies(a);});
 red('Draw residential v1 as v0','G04_RCI_DISTINCT',()=>{const a=makeAPI(),draw=a.reg[1].draw;a.reg[1].draw=T=>draw({...T,v:0});const rows=[0,1].map(v=>({key:'1_1_'+v,hash:checkSprite(a.bake(1,v,1,1,1,2,false,1),1,1,'duplicate').hash}));unique(rows);});
 red('Inject orphan night pixel','G03_ORPHAN_LIGHT',()=>{const a=makeAPI(),s=a.bake(1,0,1,1,1,2,false,1);s.night.getContext('2d').fillStyle='#fff';s.night.getContext('2d').fillRect(0,0,1,1);checkSprite(s,1,1,'orphan mutation');});
 red('Consume Math.random in rendering','G07_RNG',()=>{const bad=BLOCK.replace('draw(T){drawRCI634(T);}','draw(T){Math.random();drawRCI634(T);}');need(bad!==BLOCK,'G00_HARNESS','random mutation anchor absent');makeAPI({block:bad}).bake(1,0,1);});
 red('Remove candidate smoke attachment','G11_SMOKE_ATTACHMENT',()=>{const old=fn('orderSmoke634',BLOCK),bad=BLOCK.replace(old,'function orderSmoke634(objs){return objs;}');need(bad!==BLOCK,'G00_HARNESS','smoke attachment mutation anchor absent');const a=makeAPI({block:bad,search:'?T634=1',noArt:true}),f=smokeBirth634();checkSmokeOrder634(a,f.input,f.expected,'missing attachment');});
 red('Allocate art while ordering smoke','G11_SMOKE_PURITY',()=>{const old=fn('orderSmoke634',BLOCK),bad=BLOCK.replace(old,old.replace('{','{cv(1,1);'));need(bad!==BLOCK,'G00_HARNESS','smoke allocation mutation anchor absent');const a=makeAPI({block:bad,search:'?T634=1',noArt:true}),f=smokeBirth634();checkSmokeOrder634(a,f.input,f.expected,'allocation mutation');});
 red('Mutate particle age while ordering smoke','G07_STATE_WRITE',()=>{const old=fn('orderSmoke634',BLOCK),bad=BLOCK.replace(old,old.replace('{','{objs[0].smoke.age++;'));need(bad!==BLOCK,'G00_HARNESS','smoke state mutation anchor absent');const a=makeAPI({block:bad,search:'?T634=1',noArt:true}),f=smokeBirth634();checkSmokeOrder634(a,f.input,f.expected,'age mutation');});
 red('Omit ferris-wheel anchor','G05_REQUIRED_HOOK',()=>{const a=makeAPI(),s=a.bake(76,0,BASE_PLAN[76][1]);delete s.lotMeta574.hooks.wheel;checkSprite(s,76,BASE_PLAN[76][1],'wheel mutation');});
 red('Restore old 66px residential tower mass','G12_RCI_PROPORTIONS',()=>{const a=makeAPI();a.rcis['1_3_0'].m[0][4]=66;checkProportions634(a);});
 red('Split broad worker terrace back into three towers','G12_RCI_TERRACE',()=>{const a=makeAPI(),m=a.rcis['1_1_0'].m[0];a.rcis['1_1_0'].m=[m.slice(),m.slice(),m.slice()];checkProportions634(a);});
 red('Restore cottage annex buried inside main walls','G13_INTERSECTION',()=>{const a=makeAPI();a.rcis['1_1_5'].m[1]=[.5211,.6254,.2004,.1985,9,0,'brick','gable','door'];checkJoins634(a);});
 red('Restore a 23px single-storey brewery annex','G13_ANNEX_PROPORTIONS',()=>{const a=makeAPI();a.rcis['3_2_4'].m[1][4]=23;checkJoins634(a);});
 red('Give low annexes standalone 8px roofs','G13_ANNEX_ROOF',()=>{const a=makeAPI();a.roofPitch=()=>8;checkJoins634(a);});
 red('Restore right-bottom-sum ordering','G14_MASS_ORDER',()=>{const a=makeAPI();a.orderMasses=ms=>ms.map((m,i)=>({m,i})).sort((a,b)=>a.m[0]+a.m[1]+a.m[2]+a.m[3]-b.m[0]-b.m[1]-b.m[2]-b.m[3]||a.i-b.i);checkMassOrder634(a);});
 red('Place a base corner across the lot boundary','G15_GROUND_FOOTPRINT',()=>{const a=makeAPI(),old=a.reg[1].draw;a.reg[1].draw=T=>{old(T);T.P(1.1,.5,0);};checkGroundFootprints634(a);});
 red('Allow procedural bays through attached wings','G16_GENERATED_BAY',()=>{const bad=BLOCK.replace('if(!collision)out.push(b);','out.push(b);');need(bad!==BLOCK,'G00_HARNESS','bay mutation anchor absent');checkGeneratedBays634(traceBayAPI634(bad));});
 red('Paint contained towers before the entire rear roof','G17_EXPOSED_TOWER',()=>{const bad=BLOCK.replace('else if(a[9]&&a[9].stack===j)edge(j,i);else if(b[9]&&b[9].stack===i)edge(i,j);','else if(a[9]&&a[9].stack===j)edge(i,j);else if(b[9]&&b[9].stack===i)edge(j,i);');need(bad!==BLOCK,'G00_HARNESS','stack-order mutation anchor absent');checkRoofTowers634(makeAPI({block:bad}));});
 red('Remove roof-intersection masking from upper towers','G17_BURIED_TOWER',()=>{const old=fn('clipRCITower634',BLOCK),bad=BLOCK.replace(old,'function clipRCITower634(T,m,parent){T.g.save();T.ng.save();}');need(bad!==BLOCK,'G00_HARNESS','tower-clip mutation absent');checkRoofTowers634(makeAPI({block:bad}));});
 return{controls:report.negativeControls.length};
});
report.status=report.failed.length?'failed':'passed';console.log(JSON.stringify(report,null,2));process.exitCode=report.failed.length?1:0;
