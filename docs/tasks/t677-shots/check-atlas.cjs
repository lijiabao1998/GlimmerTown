'use strict';
// Independent review only: read exact T677 product files; no repository writes.
// A recording context is NOT a browser/pixel acceptance substitute.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const root=process.argv[2]||path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('docs/tasks/t677-shots/product-runtime.js'),atlas=read('docs/tasks/t677-shots/product-atlas.js'),native=read('index.html');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const projection=native.slice(native.indexOf('function viewRotEff(){'),native.indexOf('function isoW2V('));
const season=native.match(/const season=\(\)=>\{[^\n]+/)[0];
const models=['slab-marking','slab-rail','edge','box#dba346','box#527d8b','box#47796a','box#d9d4b7','box#c95538','crane','lamp','vessel','truck','gate','landside-crane','transfer-cargo'];
function create(search='',source=atlas,code=runtime){
  const c={URLSearchParams,location:{search},N:72,tiles:[],day:137,viewRot:2,daylight:()=>({b:1}),doPlace(){},undo(){},undoPlace(){},idx:(x,y)=>y*72+x};c.window=c;c.T=i=>c.tiles[i];c.GV={rot:()=>c.viewRot};
  c.document={createElement(tag){assert.equal(tag,'canvas');let bounds=[Infinity,Infinity,-Infinity,-Infinity],width=1;const trace=[];
    function point(x,y,pad=0){assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(pad),'finite draw coordinates');bounds=[Math.min(bounds[0],x-pad),Math.min(bounds[1],y-pad),Math.max(bounds[2],x+pad),Math.max(bounds[3],y+pad)];}
    const g={};for(const k of ['beginPath','closePath','fill','stroke'])g[k]=(...args)=>trace.push([k,...args]);for(const k of ['moveTo','lineTo'])g[k]=(x,y,...rest)=>{point(x,y,width/2);trace.push([k,x,y,...rest]);};g.arc=(x,y,r,a,b)=>{assert(Number.isFinite(r)&&r>=0&&Number.isFinite(a)&&Number.isFinite(b));point(x,y,r+width/2);trace.push(['arc',x,y,r,a,b]);};
    for(const k of ['fillStyle','strokeStyle','lineWidth'])Object.defineProperty(g,k,{set(v){if(k==='lineWidth')width=v;trace.push([k,v]);}});
    return{width:0,height:0,getContext(type){assert.equal(type,'2d');return g;},get bounds(){return bounds;},get trace(){return trace;}};
  }};
  vm.createContext(c);vm.runInContext(projection+'\n'+season+'\n'+code+'\n'+source,c);return c;
}
function inventory(c){const out=[];c.emit=(family,key,{img})=>{assert.equal(family,'art677');assert.equal(img.width,256);assert.equal(img.height,192);assert(img.trace.length>0);assert(img.bounds[0]>=0&&img.bounds[1]>=0&&img.bounds[2]<=256&&img.bounds[3]<=192,'canvas crop '+key+' '+img.bounds);out.push({key,bounds:img.bounds,traceSHA256:sha(JSON.stringify(img.trace))});};vm.runInContext('art677(emit)',c);return out;}
const c=create(),layout={reviewSentinel:1},frame={reviewSentinel:2};c.P06.layout=layout;c.P04.frame=frame;c.P01B.phase=31;c.P06.timeMs=12345;c.P06.acceptedMs=12345;const parts=JSON.stringify(c.P01B.parts);
const out=inventory(c);assert.equal(out.length,480);assert.equal(new Set(out.map(v=>v.key)).size,480);for(const m of models)for(let s=0;s<4;s++)for(let n=0;n<2;n++)for(let r=0;r<4;r++)assert(out.some(x=>x.key===`${m}_${s}_${n}_${r}`),'missing '+m);
function restored(){assert.equal(c.day,137);assert.equal(c.viewRot,2);assert.equal(c.P01B.phase,31);assert.equal(c.P06.layout,layout);assert.equal(c.P04.frame,frame);assert.equal(c.P06.timeMs,12345);assert.equal(c.P06.acceptedMs,12345);assert.equal(JSON.stringify(c.P01B.parts),parts);}
restored();c.emit=()=>{throw Error('intentional visitor failure')};assert.throws(()=>vm.runInContext('art677(emit)',c),/intentional visitor failure/);restored();assert.equal(sha(JSON.stringify(inventory(c))),sha(JSON.stringify(out)));
c.__noT677=true;assert.equal(inventory(c).length,0);restored();assert.equal(inventory(create('?noT677=1')).length,0);
// Prove native-global typo and lost restoration are caught by this harness.
assert.throws(()=>inventory(create('',atlas.replaceAll('viewRot','rot'))),/rot is not defined/);
const broken=create('',atlas.replace('viewRot=saved.viewRot;',''));inventory(broken);assert.notEqual(broken.viewRot,2);
// Distinct slab rail branch is actually recorded, not merely listed.
const mutantRuntime=runtime.replace("'#4f6167'","'#ff00ff'");assert.notEqual(mutantRuntime,runtime);
const mutated=inventory(create('',atlas,mutantRuntime)),deltas=out.filter((row,i)=>row.traceSHA256!==mutated[i].traceSHA256);assert.equal(deltas.length,16);assert(deltas.every(row=>row.key.startsWith('slab-rail_')));
const cargoMutant=runtime.replace("height:5,color:'#d6a348'","height:5,color:'#ff00ff'"),cargoRecords=inventory(create('',atlas,cargoMutant)),cargoDeltas=out.filter((row,i)=>row.traceSHA256!==cargoRecords[i].traceSHA256);assert.equal(cargoDeltas.length,32);assert(cargoDeltas.every(row=>row.key.startsWith('transfer-cargo_')));
console.log(JSON.stringify({status:'passed',notBrowser:true,entries:out.length,models:models.length,statesPerModel:32,finiteBounds:true,geometryFitsCanvas:true,normalAndThrowRestoration:true,deterministic:true,valves:true,negativeControls:['undefined rotation variable rejected','missing rotation restoration detected','rail paint mutation changes all16 day rail models','loose cargo color mutation changes32 day/night seasonal records'],runtimeSHA256:sha(runtime),atlasSHA256:sha(atlas),recordingSHA256:sha(JSON.stringify(out)),bounds:out},null,2));
