/* P05 only. Bounded spatial visibility cache; normalize duplicate clip vertices.
 * Original P04 module/thresholds remain unchanged. Empty edges cannot add the
 * complete subject to the outside set. No port rebake or persistent world write. */
(function(root){'use strict';const O=root.PortTransferOcclusion;
 const clean=poly=>poly.filter((v,i)=>{const p=poly[(i+poly.length-1)%poly.length];return Math.hypot(v[0]-p[0],v[1]-p[1])>1e-9;});
 root.LandsideOcclusion={clean,createCache(others,persistent=new Map()){
 const prepared=others.map(f=>O.prepare(f)),bins=new Map(),cell=64,key=f=>f.polygon.map(p=>p.join(',')).join(';'),keys=prepared.map(key),range=b=>{const a=[];for(let y=Math.floor(b.y0/cell);y<=Math.floor(b.y1/cell);y++)for(let x=Math.floor(b.x0/cell);x<=Math.floor(b.x1/cell);x++)a.push(x+','+y);return a;};
 prepared.forEach((f,i)=>{if(!f.plane)return;for(const k of range(f.bounds)){if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}});
 return{visible(points){const f=O.prepare(points);if(!f.plane)return[];const b=f.bounds,ids=[...new Set(range(b).flatMap(k=>bins.get(k)||[]))].filter(i=>{const o=prepared[i],a=o.bounds;return a.x0<b.x1-O.EPS&&a.x1>b.x0+O.EPS&&a.y0<b.y1-O.EPS&&a.y1>b.y0+O.EPS&&!o.plane.every((n,j)=>Math.abs(n-f.plane[j])<1e-10); }).sort((a,b)=>a-b),k=key(f)+'|'+ids.map(i=>keys[i]).join('|');
 if(persistent.has(k)){const v=persistent.get(k);persistent.delete(k);persistent.set(k,v);return v;}let pieces=[clean(f.polygon)];for(const mask of O.occlusionMasks(f,ids.map(i=>prepared[i]))){const m=clean(mask);if(m.length<3)continue;pieces=pieces.flatMap(p=>O.difference(clean(p),m).map(clean).filter(p=>p.length>=3&&Math.abs(O.area(p))>O.EPS));if(!pieces.length)break;}const v=pieces.map(p=>p.map(([x,y])=>[x,y,O.zAt(f,x,y)]));if(persistent.size>=512)persistent.delete(persistent.keys().next().value);persistent.set(k,v);return v;},get size(){return persistent.size;}};}};
})(typeof window==='object'?window:globalThis);
