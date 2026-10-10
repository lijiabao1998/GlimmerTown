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
 const cv=(w,h)=>{state.alloc++;const pair=canvas(w,h);state.canvases.push(pair[0]);return pair;},rng=()=>{state.rng++;fail('G07_RNG','rendering consumed a random stream');},safeMath=Object.create(Math);safeMath.random=rng;
 const fixture=(which,k,v,stage,winter)=>{state.legacyCalls.push({which,k,v,stage,winter});const[c,g]=cv(96,120),[nc,ng]=cv(96,120);g.fillStyle='#897252';g.fillRect(8,8,80,110);ng.fillStyle='#e9cb8f';ng.fillRect(20,20,3,4);return{img:c,night:nc,w:96,h:120,ax:48,ay:112,lotMeta574:{sz:BASE_PLAN[k][1],kind:k,variant:v,stage,winter,hooks:{smoke:[[30,22]],steam:[[50,32]],sign:[62,42],work:[20,26,10,5]}}};};
 const body=helpers+'\n'+(options.block||BLOCK)+'\nreturn {bake:bake634,spr:spr634,on:t634On,variant:v634,legacy:legacyArt634,reg:ART634,rcis:RCI_CATALOG634,remain:REMAIN634,legacyIds:LEGACY634,cache:CACHE634,stats:STAT634,limit:LIMIT634};';
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
function test(name,run){try{const detail=run();report.passed.push({name,detail:detail||true});console.log('PASS '+name);}catch(e){report.failed.push({name,guard:e.guard||'UNEXPECTED',message:e.message});console.error('FAIL '+name+': '+e.message);}}
function red(name,guard,run){try{run();report.negativeControls.push({name,passed:false,expected:guard,actual:'no failure'});fail('G10_RED_CONTROL',name+' did not fail');}catch(e){if(e.guard===guard){report.negativeControls.push({name,passed:true,firstGuard:e.guard});return;}if(e.guard==='G10_RED_CONTROL')throw e;report.negativeControls.push({name,passed:false,expected:guard,actual:e.guard||e.message});throw e;}}
const api=makeAPI();
test('Literal coverage, integrated source equality, and baseline lot sizes',()=>{checkFamilies(api);const fragments=PARTS.map(p=>fs.readFileSync(path.join(__dirname,p),'utf8')).join('\n')+'\nconst ART634={...CIVIC634,...INDUSTRY634,...RCI634};';need(BLOCK===fragments.trim(),'G01_INTEGRATION','integrated block differs from submitted fragments');need(same(lotPlan(SOURCE),BASE_PLAN),'G01_FOOTPRINT_SOURCE','candidate changed baseline lot plan');for(const key of EXPECTED_RCI){const a=api.rcis[key];need(typeof a.name==='string'&&a.name&&typeof a.archetype==='string'&&a.archetype&&Array.isArray(a.m)&&a.m.length,'G01_RCI_KEYS','incomplete '+key);for(const m of a.m)need(m.slice(0,6).every(Number.isFinite)&&m[0]>=0&&m[1]>=0&&m[2]>0&&m[3]>0&&m[0]+m[2]<=1&&m[1]+m[3]<=1,'G02_GEOMETRY','RCI mass outside one tile '+key);}return{families:72,rciKeys:108,legacy:11};});
test('Approved 601/602/603 original renderers remain byte-identical',()=>{const names=['bakeArt601','bakeArt602','bakeArt603','art601_k4','art601_k5','art601_k8','art601_k60','art601_k63','art601_k66','art601_k81','art601_k97','kit602','art602_k53','art602_k104','art602_k117','art602_k97','kit603','art603_k29','art603_k85','art603_k92','art603_k88'];for(const n of names)need(fn(n)===fn(n,BASE_SOURCE),'G01_APPROVED_SOURCE',n+' changed from baseline');return{functions:names.length};});
test('Default-off, strict opt-in, both escape valves, and no cold rendering',()=>{
 for(const search of['','?T634=0','?T634=10','?xT634=1','?T634=1&noT634=1','?noT634&T634=1']){const a=makeAPI({search});need(a.on()===false,'G06_FLAGS','unexpected opt-in '+search);a.win.__t634={};need(a.on()===false,'G06_FLAGS','truthy object enabled candidate');for(const k of[1,3,22,8,53])need(a.spr(immovable({k,lv:2,v:1,we:1}),4,5)===null,'G06_FLAGS','default returned candidate');need(a.state.alloc===0&&a.stats.bakes===0&&a.cache.size===0,'G06_FLAGS','default path allocated art');}
 for(const search of['?T634=1','?x=1&T634=1','?T634=1&noT634=0']){const a=makeAPI({search});need(a.on()===true,'G06_FLAGS','explicit opt-in failed');a.win.__noT634=true;need(a.on()===false&&a.spr({k:1,lv:1,v:0})===null,'G06_FLAGS','runtime escape failed');}
 const a=makeAPI();a.win.__t634=true;need(a.on()===true,'G06_FLAGS','runtime opt-in failed');a.win.__noT634=true;need(a.spr({k:1,lv:1,v:0})===null,'G06_FLAGS','runtime escape did not win');return'12 URL/runtime cases plus no-allocation reads';
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
 red('Omit ferris-wheel anchor','G05_REQUIRED_HOOK',()=>{const a=makeAPI(),s=a.bake(76,0,BASE_PLAN[76][1]);delete s.lotMeta574.hooks.wheel;checkSprite(s,76,BASE_PLAN[76][1],'wheel mutation');});
 return{controls:report.negativeControls.length};
});
report.status=report.failed.length?'failed':'passed';console.log(JSON.stringify(report,null,2));process.exitCode=report.failed.length?1:0;
