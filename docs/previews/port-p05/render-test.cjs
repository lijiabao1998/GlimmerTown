'use strict';
// Actual generated P04 bridges/painters, independent ray-depth oracle, and
// a preserved adversarial old separated-queue renderer. No base source edits.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const V=require('../port-p03/vessel-navigation.js'),Q=require('../port-p02/crane-motion.js'),C=require('../port-p04/transfer-state.js'),G=require('../port-p04/geometry.js'),O=require('../port-p04/transfer-occlusion.js'),L=require('./landside-geometry.js'),D=require('./dispatch-state.js');
const html=fs.readFileSync(path.join(__dirname,'native-preview.html'),'utf8');
const marker=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i,'Build actual P04 native preview first');return html.slice(i,j);};
const vesselSource=marker('// Candidate-only native closure bridge.','/* P04 retained-geometry audit.'),p01Source=marker('// Independent P01-B preview bridge.','/* Pure preview geometry'),p04Source=marker('/* 原生閉包橋接；','/* 候選真道路、'),p02Source=fs.readFileSync(path.join(__dirname,'../port-p02/animation-bridge.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../port-p02/crane-assembly.js'),'utf8');
const grid={width:72,height:72,cells:Array.from({length:5184},(_,i)=>i>=72*35)},base=V.compile(grid),EPS=1e-7;
function surfaceZ(point,polygon){for(let i=1;i<polygon.length-1;i++){const[a,b,c]=[polygon[0],polygon[i],polygon[i+1]],d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<EPS)continue;const u=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/d,v=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/d,w=1-u-v;if(Math.min(u,v,w)>=-EPS)return u*a[2]+v*b[2]+w*c[2];}return null;}
function harness(rot,options={}){
 const w2v=(x,y)=>rot===0?[x,y]:rot===1?[71-y,x]:rot===2?[71-x,71-y]:[y,71-x],viewDep=(x,y)=>{const[a,b]=w2v(x,y);return a+b;},project=(x,y,z=0)=>{const[a,b]=w2v(x,y);return[32*(a-b),16*(a+b)-z,z];};
 let currentClip=null;
 const trackedO={...O,visible(face,others){currentClip=O.prepare(face);return O.visible(face,others);},createCache(others){const cache=O.createCache(others);return{...cache,visible(face){currentClip=O.prepare(face);return cache.visible(face);}};}};
 const c={window:{QuayMotion:Q,VesselNavigation:V,PortTransferGeometry:G,ContainerTransfer:C,PortTransferOcclusion:trackedO,LandsideGeometry:L,LandsideDispatch:D},GV:{rot:()=>rot,tile:(x,y)=>({t:y>=35?0:2,road:y===31&&x>=22&&x<=43?1:0})},viewDep,performance:{now:()=>0},URLSearchParams,location:{search:''},season:()=>0};
 let p04Code=p04Source.replaceAll('c.lineTo(v[0],v[1])','c.lineTo(v[0],v[1],v[2])').replaceAll('c.moveTo(v[0],v[1])','c.moveTo(v[0],v[1],v[2])');if(options.legacySeparated)p04Code=p04Code.replace('dep:1e9','dep:viewDep(f.x,f.y)+.003');
 vm.createContext(c);vm.runInContext(p01Source,c);c.P01B=c.window.P01B;c.P01B.build();vm.runInContext(p02Source,c);vm.runInContext(vesselSource,c);const P03=c.window.P03,P02=c.window.P02;P03.plan={...base,at:base.at.bind(base)};let now=0;P03.time=()=>now;P02.time=()=>now;vm.runInContext(p04Code,c);const P04=c.window.P04;P04.init();assert(!P04.error,P04.error);vm.runInContext(fs.readFileSync(path.join(__dirname,'dispatch-occlusion.js'),'utf8'),c);let p05=fs.readFileSync(path.join(__dirname,'dispatch-bridge.js'),'utf8').replaceAll('c.lineTo(p[0],p[1])','c.lineTo(p[0],p[1],p[2])').replaceAll('c.moveTo(p[0],p[1])','c.moveTo(p[0],p[1],p[2])');vm.runInContext(p05,c);const P05=c.window.P05;P05.init();assert(!P05.error,P05.error);
 const local=(x,y,z)=>project(x+20,y+20,z);
 return{P04,P05,parts:c.P01B.parts,project,frame(ms){
  now=ms;P04.begin();const vessel=P03.objects(),cargo=P04.objects(),rigs=P02.objects(),harbor=options.shipOnly?[]:[...c.P01B.parts.map(o=>({o,kind:'harbor-'+o.type,dep:['slab','reserve'].includes(o.type)?-100000:viewDep(o.x+20,o.y+20)+.001})),...rigs.map(o=>({o,kind:'rig',dep:o.dep}))],queue=[...P05.objects().map(o=>({o,kind:'new-'+o.kind+(o.body?'-'+o.body.id:''),dep:o.dep})),...harbor,...vessel.map(o=>({o,kind:'ship',dep:o.dep})),...cargo.map(o=>({o,kind:'transfer',dep:o.dep}))].sort((a,b)=>a.dep-b.dep),painted=[],rawCargo=[];let current=[],closed=false,owner='';
  const vertex=(x,y,z)=>[x,y,z===undefined&&currentClip?O.zAt(currentClip,x,y):z];
  const canvas={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,beginPath(){current=[];closed=false;},moveTo(x,y,z){current.push(vertex(x,y,z));},lineTo(x,y,z){current.push(vertex(x,y,z));},closePath(){closed=true;},arc(x,y,r,a,b){for(let i=0;i<=16;i++){const t=a+(b-a)*i/16;current.push([x+Math.cos(t)*r,y+Math.sin(t)*r,0]);}},fill(){if(!String(this.fillStyle).startsWith('rgba'))painted.push({polygon:current,color:this.fillStyle,owner});},stroke(){const pts=closed?[...current,current[0]]:current;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;const nx=-dy/len*this.lineWidth/2,ny=dx/len*this.lineWidth/2;painted.push({polygon:[[a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],[b[0]-nx,b[1]-ny,b[2]],[a[0]-nx,a[1]-ny,a[2]]],color:this.strokeStyle,owner});}}};
  for(const q of queue){owner=q.kind;currentClip=null;if(q.kind.startsWith('new-'))P05.paint(canvas,q.o,project,1);else if(q.kind==='ship')P03.paint(canvas,q.o,project,1);else if(q.kind==='rig'){if(q.o.upper)P02.paintAssembly.call(c.P01B,canvas,q.o.crane,local,1,1,true);else P02.paint(canvas,q.o,local,1,1);}else if(q.kind==='transfer'){
   rawCargo.push(...P04.capture(project,(ctx,p)=>c.P01B.paint(ctx,q.o,(x,y,z)=>p(x+20,y+20,z),1,1)).map(f=>({polygon:f.points,color:f.color,owner:'transfer'})));
   if(options.legacySeparated)c.P01B.paint(canvas,q.o,local,1,1);else P04.paint(canvas,q.o,project,1,1);
  }else c.P01B.paint(canvas,q.o,local,1,1);}
  const rawNew=P05.captureRaw(project,1).map(f=>({polygon:f.points,color:f.color,owner:'new-composite'}));const geometry=[...painted.filter(f=>f.owner!=='transfer'&&!f.owner.startsWith('new-')),...rawCargo,...rawNew];
  return{painted,geometry,rawCargo,vesselFaces:vessel.reduce((n,o)=>n+o.faces.length,0),cargoObjects:cargo.length,frame:P05.frame,queue:queue.map(q=>({kind:q.kind,dep:q.dep}))};
 },benchmark(ms,n=100){this.frame(ms);const sink={beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}},modes={};for(const mode of ['paused','changing']){const times=[];for(let i=0;i<n;i++){if(mode==='changing'){now=ms+i*16;P04.begin();P02.objects();}const part=P04.objects()[0],a=performance.now();P04.paint(sink,part,project,1,1);times.push(performance.now()-a);}times.sort((a,b)=>a-b);modes[mode]={iterations:n,medianMs:times[Math.floor(n*.5)],p95Ms:times[Math.floor(n*.95)],maxMs:times.at(-1)};}return{...modes,staticFaces:P04.maskStatic.length};}};
}
function audit(frame){
 
 const bound=f=>({...f,bb:{x0:Math.min(...f.polygon.map(v=>v[0])),x1:Math.max(...f.polygon.map(v=>v[0])),y0:Math.min(...f.polygon.map(v=>v[1])),y1:Math.max(...f.polygon.map(v=>v[1]))}}),geometry=frame.geometry.map(bound),painted=frame.painted.map(bound);
 const trace=(list,p)=>{const hits=[];for(const f of list)if(p[0]>=f.bb.x0-EPS&&p[0]<=f.bb.x1+EPS&&p[1]>=f.bb.y0-EPS&&p[1]<=f.bb.y1+EPS){const z=surfaceZ(p,f.polygon);if(z!==null)hits.push({f,z});}return hits;};
 const edge=(f,p)=>f.polygon.some((a,i)=>{const b=f.polygon[(i+1)%f.polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);return len>EPS&&Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/len<1e-5&&(p[0]-a[0])*(p[0]-b[0])+(p[1]-a[1])*(p[1]-b[1])<=EPS;});
 const inspect=p=>{const hits=trace(geometry,p);if(!hits.length)return null;const nearest=Math.max(...hits.map(h=>h.z)),allowed=hits.filter(h=>Math.abs(h.z-nearest)<EPS),last=trace(painted,p).at(-1);if(!last)return null;const relevant=allowed.some(h=>h.f.owner==='transfer'||h.f.owner.startsWith('new-'))||last.f.owner==='transfer'||last.f.owner.startsWith('new-');
  // Corrugation strokes are intentional surface decals on this same cargo,
  // not independently floating solids that can occlude their own parent.
  if(!relevant||allowed.some(h=>h.f.owner===last.f.owner&&(h.f.owner==='transfer'||h.f.color===last.f.color)))return null;
  return{boundary:allowed.some(h=>edge(h.f,p))||edge(last.f,p),point:p,expected:allowed.map(h=>({owner:h.f.owner,color:h.f.color,z:h.z})),actual:{owner:last.f.owner,color:last.f.color,z:last.z}};
 };
 const failures=[],source=[...frame.geometry,...frame.painted.filter(f=>f.owner==='transfer')],samples=source.filter(f=>f.polygon.length>=3).map(face=>({point:[0,1].map(i=>face.polygon.reduce((n,p)=>n+p[i],0)/face.polygon.length),owner:face.owner}));let boundaryProbes=0;
 for(const sample of samples){const bad=inspect(sample.point);if(!bad)continue;if(!bad.boundary){failures.push({sampleOwner:sample.owner,...bad});continue;}
  // A zero-area clip boundary belongs to both adjacent polygons. Probe all
  // eight neighboring subpixel interiors, preserving both sides of the edge.
  for(let i=0;i<8;i++){boundaryProbes++;const angle=i*Math.PI/4,p=[sample.point[0]+Math.cos(angle)*.002,sample.point[1]+Math.sin(angle)*.002],q=inspect(p);if(q&&!q.boundary)failures.push({sampleOwner:sample.owner,edgeProbe:true,...q});}
 }
 return{failures,samples:samples.length,boundaryProbes};
}
const upstream=harness(0);upstream.P05.init({fullYard:true});assert(upstream.P05.error);assert.equal(upstream.P05.plan.at(170000).owner,'ship');upstream.P05.init();assert(!upstream.P05.error);assert.equal(upstream.P05.plan.at(170000).owner,'dispatched');
let sampleCount=0,frameCount=0,boundaryProbes=0;const failures=[];
for(let rot=0;rot<4;rot++){const h=harness(rot),p=h.P05.plan,times=[p.start-1,...p.phases.flatMap(f=>[f.start,(f.start+f.end)/2,f.end-.001]),p.finished+1000];for(const ms of times){const f=h.frame(ms),a=audit(f);sampleCount+=a.samples;boundaryProbes+=a.boundaryProbes;frameCount++;for(const fail of a.failures)failures.push({rot,time:ms,status:f.frame.status,...fail});}}
const report={frameCount,sampleCount,boundaryProbes,failureCount:failures.length,failures:failures.slice(0,80)};fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/p05-render.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.equal(failures.length,0,'Actual P05 native queue disagrees with independent ray depth');
