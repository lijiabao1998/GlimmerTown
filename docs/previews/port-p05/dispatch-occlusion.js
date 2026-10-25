/* P05 only: normalize numerical duplicate clip vertices before subtracting.
 * A zero-length clipping edge otherwise contributes the whole subject to the
 * outside set. Original P04 module and its acceptance baseline stay unchanged. */
(function(root){'use strict';const O=root.PortTransferOcclusion;
 const clean=poly=>poly.filter((v,i)=>{const p=poly[(i+poly.length-1)%poly.length];return Math.hypot(v[0]-p[0],v[1]-p[1])>1e-9;});
 root.LandsideOcclusion={clean,createCache(others){const cache=O.createCache(others),result=new Map();return{visible(points){const f=O.prepare(points),key=JSON.stringify(points);if(result.has(key))return result.get(key);if(!f.plane)return[];let pieces=[clean(f.polygon)];for(const mask of cache.masks(points)){const m=clean(mask);if(m.length<3)continue;pieces=pieces.flatMap(p=>O.difference(clean(p),m).map(clean).filter(p=>p.length>=3&&Math.abs(O.area(p))>O.EPS));if(!pieces.length)break;}const v=pieces.map(p=>p.map(([x,y])=>[x,y,O.zAt(f,x,y)]));result.set(key,v);return v;}};}};
})(typeof window==='object'?window:globalThis);
