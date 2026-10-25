/* P06-only exact geometry cache acceleration. Original P05 remains the reference.
 * No pixels, faces, clipping tolerance, traffic, or simulation work is omitted.
 * The baseline flag is for paired acceptance, never a player/save preference. */
(function(root){'use strict';
 const O=root.PortTransferOcclusion,L=root.LandsideOcclusion,original=L.createCache,metadata=new WeakMap(),intern=new Map();let serial=0;
 const CELL=64,MAX_KEYS=8192,range=b=>{const out=[];for(let y=Math.floor(b.y0/CELL);y<=Math.floor(b.y1/CELL);y++)for(let x=Math.floor(b.x0/CELL);x<=Math.floor(b.x1/CELL);x++)out.push(x+','+y);return out;};
 function meta(f){let m=metadata.get(f);if(!m){m={cells:range(f.bounds),id:0};metadata.set(f,m);}return m;}
 function id(f,m=meta(f)){if(m.id)return m.id;const key=f.polygon.map(p=>p.join(',')).join(';');let n=intern.get(key);if(n===undefined){n=++serial;if(intern.size>=MAX_KEYS)intern.delete(intern.keys().next().value);intern.set(key,n);}return m.id=n;}
 function accelerated(others,persistent=new Map()){
  const prepared=others.map(f=>O.prepare(f)),metas=prepared.map(meta),bins=new Map();
  prepared.forEach((f,i)=>{if(!f.plane)return;for(const k of metas[i].cells){if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}});
  return{visible(points){const f=O.prepare(points);if(!f.plane)return[];const b=f.bounds,ids=[...new Set(meta(f).cells.flatMap(k=>bins.get(k)||[]))].filter(i=>{const o=prepared[i],a=o.bounds;return a.x0<b.x1-O.EPS&&a.x1>b.x0+O.EPS&&a.y0<b.y1-O.EPS&&a.y1>b.y0+O.EPS&&!o.plane.every((n,j)=>Math.abs(n-f.plane[j])<1e-10);}).sort((a,b)=>a-b),k='p06/'+id(f)+'|'+ids.map(i=>id(prepared[i],metas[i])).join(',');
   if(persistent.has(k)){const v=persistent.get(k);persistent.delete(k);persistent.set(k,v);return v;}
   let pieces=[L.clean(f.polygon)];for(const mask of O.occlusionMasks(f,ids.map(i=>prepared[i]))){const m=L.clean(mask);if(m.length<3)continue;pieces=pieces.flatMap(p=>O.difference(L.clean(p),m).map(L.clean).filter(p=>p.length>=3&&Math.abs(O.area(p))>O.EPS));if(!pieces.length)break;}
   const v=pieces.map(p=>p.map(([x,y])=>[x,y,O.zAt(f,x,y)]));if(persistent.size>=512)persistent.delete(persistent.keys().next().value);persistent.set(k,v);return v;
  },get size(){return persistent.size;}};
 }
 L.createCache=function(...args){return root.__p06BaselinePerf?original(...args):accelerated(...args);};
 root.P06Performance={reference:original,accelerated,stats:()=>({internedKeys:intern.size,keyLimit:MAX_KEYS,serial,cacheLimit:512}),method:'Exact polygon strings interned to never-reused IDs; WeakMap static metadata; unchanged clipping arithmetic/order'};
})(typeof window==='object'?window:globalThis);
