const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),M=require('./crane-motion.js');
const env={window:{}};vm.runInNewContext(fs.readFileSync('bridge.js','utf8'),env);env.window.P01B.build();const parts=env.window.P01B.parts,cranes=parts.filter(p=>p.type==='crane'),obstacles=[];
function add(name,x,y,w,d,z,h){obstacles.push({name,bounds:M.bounds(x,y,w,d,z,h)});}
for(const p of parts){if(['box','slab','edge'].includes(p.type))add(p.type,p.x,p.y,p.w,p.d,p.base||0,p.h);if(p.type==='crane'){
 // Conservative unions cover full legs, diagonal braces, cabin, beams, stay cables, lamps.
 add('frame',p.x,p.y,1.18,1.26,0,68);add('boom and upper stays',p.x,p.y+.725,1.12,2.95,67,22);
 add('cabin',p.x,p.y+.5,.4,.35,56,7);
 }}
for(const [x,y,size,h] of [[3,7,3,100],[7,7,3,100],[11,7,4,100]])add('native facility conservative roof envelope',x+size/2,y+size/2,size,size,0,h);
const results=cranes.map(c=>M.clearance(c,obstacles));results.forEach(r=>assert(r.safe));for(let i=0;i<cranes.length;i++)for(let j=i+1;j<cranes.length;j++)assert(!M.overlap(M.sweep(cranes[i]),M.sweep(cranes[j])),'Moving assemblies disjoint for every time');
for(const [i,c] of cranes.entries())for(let t=0;t<=M.CYCLE;t+=13){const b=M.bodies(c,t,i),s=M.sweep(c);for(const v of [b.spreader,b.trolley,...b.ropes])for(const axis of ['x','y','z']){assert(v[axis+'0']>=s[axis+'0']-1e-9);assert(v[axis+'1']<=s[axis+'1']+1e-9);}}
assert(!M.clearance(cranes[0],[M.sweep(cranes[0])]).safe,'Injected obstacle negative control');assert(!M.clearance({...cranes[0],y:13},[]).safe,'Water edge negative control');
for(let i=0;i<4;i++)for(let t=0;t<16000;t+=37)assert.deepEqual(M.pose(t,i),M.pose(t+M.CYCLE,i));
function sample(step){const c=M.clock();c.play(100);for(let now=100;now<9876;now+=step)c.time(now);return c.time(9876);}
assert.equal(sample(1000/60),sample(1000/7));assert.equal(sample(5000),sample(1000/60));
const c=M.clock();c.play(10);c.pause(110);assert.equal(c.time(910),100);c.play(1010);assert.equal(c.time(1210),300);c.reset(1300);assert.equal(c.time(3000),0);assert(!c.running);c.seek(555,4000);assert.equal(c.time(5000),555);
for(const f of ['crane-motion.js','animation-bridge.js'])assert(!/Math\.random|\b(?:R|ri|rand)\(/.test(fs.readFileSync(f,'utf8')));
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/p02-motion-unit.json',JSON.stringify({passed:true,method:'Analytical conservative continuous swept volumes plus sampled containment; explicit obstacle/water-edge negative controls',cranes:results,obstacles,cycleMs:M.CYCLE,checks:['four complete volumes','four ropes per crane','continuous swept envelope','injected collision rejects','shore crossing rejects','periodic replay','60Hz/7Hz/5s jump equality','pause/resume/reset/seek','no simulation RNG calls'],limitations:'Native facility envelope conservative; browser visual ordering requires actual Chromium evidence.'},null,2));console.log('P02 geometry/time tests PASS');
// Test the actual bridge queue implementation, not a reimplementation of its comparator.
for(let rot=0;rot<4;rot++){
 const dep=(x,y)=>[x+y,x-y,-x-y,-x+y][rot],ctx={window:{QuayMotion:M,P01B:env.window.P01B},P01B:env.window.P01B,performance:{now:()=>0},URLSearchParams,viewDep:dep};
 vm.runInNewContext(fs.readFileSync('animation-bridge.js','utf8'),ctx);
 for(let ms=0;ms<=16000;ms+=50){ctx.window.P02.clock.seek(ms,0);const objects=ctx.window.P02.objects();assert.equal(objects.length,8);for(let i=0;i<4;i++){const motion=objects[i*2],upper=objects[i*2+1],base=dep(cranes[i].x+20,cranes[i].y+20)+.001;assert(upper.dep>Math.max(base,motion.dep));assert.equal(motion.dep>base,dep(0,1)>dep(0,0));}}
 if(rot===0||rot===3){ctx.window.P02.clock.seek(4850,0);const motion=ctx.window.P02.objects()[0],edgeX=rot===0?3.5:4.5,edge=dep(edgeX+20,14.96+20)+.001,old=dep(4+20,14.08+20)+.001;assert(motion.dep>edge,'Low spreader must be in front of quay edge');assert(old<edge,'Old grouped-anchor negative control exposes edge occlusion');}
}
console.log('P02 actual native queue constraints PASS');
