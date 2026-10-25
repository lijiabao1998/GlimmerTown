'use strict';
// Independent native-projection ray-depth oracle for the real vessel painter.
// No browser, saved state, generated evidence, or source rewriting is involved.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const V=require('./vessel-navigation.js'),Q=require('../port-p02/crane-motion.js');
const source=fs.readFileSync(path.join(__dirname,'vessel-bridge.js'),'utf8');
const EPS=1e-7;
function surfaceZ(point,polygon){
  // Triangulate each convex face in screen space, then interpolate world height.
  // On one isometric viewing ray, greater height is nearer the camera.
  for(let i=1;i<polygon.length-1;i++){
    const [a,b,c]=[polygon[0],polygon[i],polygon[i+1]];
    const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(d)<EPS)continue;
    const u=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/d;
    const v=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/d,w=1-u-v;
    if(Math.min(u,v,w)>=-EPS)return u*a[2]+v*b[2]+w*c[2];
  }
  return null;
}
function scene(rot,angle){
  // These are the native w2v/sxOf/syOf projection equations, not navigation helpers.
  const w2v=(x,y)=>rot===0?[x,y]:rot===1?[71-y,x]:rot===2?[71-x,71-y]:[y,71-x];
  const viewDep=(x,y)=>{const [a,b]=w2v(x,y);return a+b;};
  const project=(x,y,z)=>{const [a,b]=w2v(x,y);return[32*(a-b),16*(a+b)-z,z];};
  const context={window:{},QuayMotion:Q,VesselNavigation:V,P01B:{setup(){},phase:55},P02:{},viewDep,performance:{now:()=>0},URLSearchParams,location:{search:''},season:()=>0};
  vm.createContext(context);vm.runInContext(source,context,{filename:'vessel-bridge.js'});
  const bridge=context.window.P03;
  bridge.plan={at:()=>({x:26.5,y:36.5,angle,visible:true})};bridge.time=()=>0;
  const objects=bridge.objects().sort((a,b)=>a.dep-b.dep);
  const geometry=objects.flatMap(o=>o.faces||[o]);
  const projected=geometry.map(o=>({...o,polygon:o.points.map(p=>project(...p))}));
  let current=[];const painted=[];
  const canvas={beginPath(){current=[];},moveTo(x,y){current.push([x,y,0]);},lineTo(x,y){current.push([x,y,0]);},closePath(){},fill(){if(this.fillStyle[0]==='#')painted.push({polygon:current,color:this.fillStyle});},stroke(){}};
  for(const o of objects)bridge.paint(canvas,o,(...p)=>project(...p),1);
  return{geometry:projected,painted,viewDep};
}
function samples(s){return s.geometry.filter(o=>o.top).map(o=>({color:o.color,point:[0,1].map(i=>o.polygon.reduce((n,p)=>n+p[i],0)/o.polygon.length)}));}
function mismatch(s,sample,painted=s.painted){
  const hits=s.geometry.map(o=>({color:o.color,z:surfaceZ(sample.point,o.polygon)})).filter(o=>o.z!==null);
  const nearest=Math.max(...hits.map(o=>o.z));
  const allowed=hits.filter(o=>Math.abs(o.z-nearest)<EPS).map(o=>o.color);
  const last=painted.filter(o=>surfaceZ(sample.point,o.polygon)!==null).at(-1);
  return !last||!allowed.includes(last.color)?{sample:sample.color,point:sample.point,nearest,expected:allowed,actual:last?.color}:null;
}
let checked=0;const failures=[];
for(let rot=0;rot<4;rot++)for(let heading=0;heading<8;heading++){
  const s=scene(rot,heading*Math.PI/4);
  for(const sample of samples(s)){checked++;const failure=mismatch(s,sample);if(failure)failures.push({rot,heading,...failure});}
}
assert.deepEqual(failures,[],'Actual vessel painter hides a nearer surface behind a lower surface');
// Preserve an adversarial control: the original flat mean-ground-depth sort must fail.
const old=scene(0,Math.PI),flat=[...old.geometry].sort((a,b)=>a.points.reduce((n,p)=>n+old.viewDep(p[0],p[1]),0)/a.points.length-b.points.reduce((n,p)=>n+old.viewDep(p[0],p[1]),0)/b.points.length);
const originalFailures=samples(old).map(sample=>mismatch(old,sample,flat)).filter(Boolean);
assert(originalFailures.some(f=>['#b44f3b','#d6a348','#497f77'].includes(f.sample)),'Negative control must catch deck-over-cargo corruption');
console.log(JSON.stringify({passed:checked,rotations:4,headings:8,negativeControlRejected:true,originalFailures}));
