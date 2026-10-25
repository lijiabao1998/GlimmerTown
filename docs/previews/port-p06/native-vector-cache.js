/* P06-only static vector display lists. No bitmap/atlas rebake, omitted face,
 * changed style, clipping, ordering, or night light. Fake capture contexts and
 * night draws keep the exact original painters; actual Canvas can replay Path2D. */
(function(root){'use strict';
 let parts=null,allowed=new Set();const caches={part:new Map(),assembly:new Map()},LIMIT=128,counts={builds:0,hits:0,bypasses:0,draws:0};
 function signature(c,p,P,z,upper){const t=c.getTransform();return[GV.rot(),z,t.a,t.b,t.c,t.d,t.e,t.f,root.P01B.phase,...P(0,0,0),...P(1,0,0),...P(0,1,0),season(),upper,p.type,p.x,p.y,p.w,p.d,p.h,p.base,p.color,p.shipyard].join('/');}
 function record(original,self,p,P,z,bright,upper){const commands=[];let current=new root.Path2D(),last=[];const target={beginPath(){current=new root.Path2D();last=[];},fill(){commands.push(['fill',new root.Path2D(current)]);},stroke(){commands.push(['stroke',new root.Path2D(current)]);}};
  for(const method of['moveTo','lineTo','closePath','arc'])target[method]=(...args)=>{current[method](...args);last.push([method,args]);};
  const recorder=new Proxy(target,{set(o,k,v){if(!['fillStyle','strokeStyle','lineWidth'].includes(k))throw Error('Unrecorded static painter property: '+String(k));o[k]=v;commands.push(['set',k,v]);return true;}});
  original.call(self,recorder,p,P,z,bright,upper);return{commands,last};
 }
 function replay(c,value){for(const cmd of value.commands){if(cmd[0]==='set')c[cmd[1]]=cmd[2];else c[cmd[0]](cmd[1]);}/* fill(Path2D) does not alter current path: restore the original painter's final path too. */c.beginPath();for(const[method,args]of value.last)c[method](...args);}
 function wrap(object,key,kind){const original=object[key];object[key]=function(c,p,P,z,bright,upper=false){
  if(parts!==root.P01B.parts){parts=root.P01B.parts;allowed=new Set(parts);caches.part.clear();caches.assembly.clear();}
  if(!allowed.has(p)||root.__p06BaselinePerf||typeof root.CanvasRenderingContext2D!=='function'||!(c instanceof root.CanvasRenderingContext2D)||typeof root.Path2D!=='function'||this.phase===0||root.P01B.phase===0){counts.bypasses++;return original.call(this,c,p,P,z,bright,upper);}
  const cache=caches[kind],sig=signature(c,p,P,z,upper);let value=cache.get(p);if(!value||value.signature!==sig||value.layout!==root.P06?.layout){value={...record(original,this,p,P,z,bright,upper),signature:sig,layout:root.P06?.layout};if(!cache.has(p)&&cache.size>=LIMIT)cache.delete(cache.keys().next().value);cache.set(p,value);counts.builds++;}else counts.hits++;counts.draws++;replay(c,value);
 };return original;}
 const originals={};if(root.P01B&&root.P02){originals.part=wrap(root.P01B,'paint','part');originals.assembly=wrap(root.P02,'paintAssembly','assembly');}
 root.P06VectorCache={originals,clear(){caches.part.clear();caches.assembly.clear();},stats(){return{...counts,partEntries:caches.part.size,assemblyEntries:caches.assembly.size,limitPerKind:LIMIT,bitmapCanvases:0};},method:'Bounded original static vector commands; original styles/fill/stroke/order/final current path, capture/night bypass'};
if(root.P06Performance){const prior=root.P06Performance.stats;root.P06Performance.clearPaintCache=()=>root.P06VectorCache.clear();root.P06Performance.stats=()=>{const s=root.P06VectorCache.stats();return{...prior(),paintEntries:s.partEntries+s.assemblyEntries,paintEntryLimit:LIMIT*2,paintBuilds:s.builds,paintHits:s.hits,paintBypasses:s.bypasses,bitmapCanvases:0};};}
})(typeof window==='object'?window:globalThis);
