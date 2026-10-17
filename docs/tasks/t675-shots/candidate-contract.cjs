/* T675 isolated candidate checks. This is not runtime/Chrome acceptance. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../../..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const slice=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const ctx={window:{},Map,Math,Error,cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
vm.createContext(ctx);vm.runInContext(slice('function lotLine574(','function lotVariant574(')+slice('function makeIso590(','function silhouette590(')+fs.readFileSync(path.join(__dirname,'art675.js'),'utf8')+'\nthis.bake=bake675;',ctx);
// Design specification fixed independently of actual hook count. Only the raised grain store has no combustion outlet.
const outlets=[1,1,1,3,0,1,1,2,6,2];
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>crypto.createHash('sha256').update(pixels(c)).digest('hex');
function check(s,i){
 assert.equal(s.__t675,1,'family');assert.equal(s.lotMeta574.kind,3,'industrial');assert.equal(s.lotMeta574.stage,2,'level');assert.equal(s.lotMeta574.variant,i,'variant');
 assert.equal(s.smoke.length,outlets[i],'outlet-count');assert.equal(s.lotMeta574.hooks.smoke.length,outlets[i],'metadata-outlet-count');
 assert.equal(s.w,80,'width');assert(s.h>20&&s.h<=144,'height');assert(s.ax>=0&&s.ax<s.w&&s.ay>=0&&s.ay<s.h,'anchor');
 const a=pixels(s.img),b=pixels(s.night);assert.equal(a.length,b.length,'mask-size');let night=0,body=0;
 for(let p=3;p<a.length;p+=4){if(a[p])body++;if(b[p]){night++;assert(a[p]>0,'night-outside-body');}}
 assert(body>150,'body-pixels');assert(night>0,'missing-night-openings');
 const seen=new Uint8Array(s.w*s.h),components=[];for(let n=0;n<seen.length;n++){if(seen[n]||!a[n*4+3])continue;let size=0;const q=[n];seen[n]=1;while(q.length){const p=q.pop(),x=p%s.w,y=Math.floor(p/s.w);size++;for(let yy=Math.max(0,y-1);yy<=Math.min(s.h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(s.w-1,x+1);xx++){const k=yy*s.w+xx;if(!seen[k]&&a[k*4+3]){seen[k]=1;q.push(k);}}}components.push(size);}assert.equal(components.length,1,'disconnected-body-component');
 for(let n=0;n<s.smoke.length;n++){const p=s.smoke[n],q=s.lotMeta574.hooks.smoke[n];assert.equal(p.dx+s.ax,q[0],'hook-x');assert.equal(p.dy+s.ay,q[1],'hook-y');assert(q[0]>=0&&q[0]<s.w&&q[1]>=0&&q[1]<s.h,'hook-bounds');}
 return {body,night,hash:hash(s.img),nightHash:hash(s.night)};
}
const rows=[];for(const [winter,sea]of[[false,0],[false,1],[false,2],[false,3],[true,3]]){const seen=new Set();for(let i=0;i<10;i++){const s=ctx.bake(i,winter,sea),r=check(s,i);assert(!seen.has(r.hash),'duplicate-model');seen.add(r.hash);assert.equal(hash(ctx.bake(i,winter,sea).img),r.hash,'non-deterministic');rows.push({model:i,winter,season:sea,...r});}}
const negatives=[];
function reject(name,i,change,expected){const s=ctx.bake(i,false,1);change(s);assert.throws(()=>check(s,i),new RegExp(expected));negatives.push({name,firstFailure:expected});}
reject('missing-night-mask',0,s=>s.night.getContext('2d').clearRect(0,0,s.w,s.h),'missing-night-openings');
reject('missing-chimney',0,s=>s.smoke.pop(),'outlet-count');
reject('invented-granary-smoke',4,s=>s.smoke.push({dx:0,dy:0}),'outlet-count');
reject('floating-body-pixel',0,s=>{s.img.getContext('2d').fillRect(0,0,1,1);},'disconnected-body-component');
reject('wrong-family',0,s=>s.__t675=0,'family');
reject('out-of-bounds-hook',0,s=>{s.smoke[0].dx=1000;s.lotMeta574.hooks.smoke[0][0]=1000+s.ax;},'hook-bounds');
reject('night-outside-body',0,s=>{s.img.getContext('2d').clearRect(0,0,1,1);s.night.getContext('2d').fillRect(0,0,1,1);},'night-outside-body');
assert.throws(()=>ctx.bake(-1,false,1),/unknown model/);assert.throws(()=>ctx.bake(10,false,1),/unknown model/);
process.stdout.write(JSON.stringify({status:'pass',scope:'isolated Canvas candidates only; no runtime, CI or Chrome claim',cases:rows.length,negativeControls:negatives,rows},null,2)+'\n');
