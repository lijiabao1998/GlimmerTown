'use strict';
// Injected into the existing closure only in the runner's disposable HTML.
function captureBridge604(){
  const frames=[];let active=null,gpu=null,layer=null,clonedBytes=0;
  const data=()=>({view:__s603.view(),clocks:{visT,trafClock,waterT,waterF},viewport:__s603.viewport(),roots:__s603.roots().rows.length});
  function capture(){
    if(running)throw Error('Capture requires a stopped source renderer');
    const commands=[],seen=new Map(),counts={},originals={},before=data();
    function snapshot(image){if(seen.has(image))return seen.get(image);const bytes=image.width*image.height*4;if(clonedBytes+bytes>192*1024*1024)throw Error('Recorded source snapshots exceed 192 MiB');const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);clonedBytes+=bytes;seen.set(image,c);return c;}
    for(const name of ['fill','stroke','fillRect','strokeRect','fillText','strokeText','clearRect','clip']){originals[name]=ctx[name];ctx[name]=function(...args){counts[name]=(counts[name]||0)+1;return originals[name].apply(this,args);};}
    originals.drawImage=ctx.drawImage;ctx.drawImage=function(image,...args){
      if(this.shadowBlur!==0||this.shadowOffsetX!==0||this.shadowOffsetY!==0)throw Error('Unexpected native image shadow state');
      let crop,dst;if(args.length===2){crop=[0,0,image.width,image.height];dst=[...args,image.width,image.height];}else if(args.length===4){crop=[0,0,image.width,image.height];dst=args;}else if(args.length===8){crop=args.slice(0,4);dst=args.slice(4);}else throw Error('Unknown drawImage signature');
      if(crop[2]===0||crop[3]===0||dst[2]===0||dst[3]===0||crop[0]>=image.width||crop[1]>=image.height||crop[0]+crop[2]<=0||crop[1]+crop[3]<=0){counts.noopImages=(counts.noopImages||0)+1;return originals.drawImage.call(this,image,...args);}
      const m=this.getTransform(),c={image:snapshot(image),crop,dst:dst.slice(),transform:[m.a,m.b,m.c,m.d,m.e,m.f],alpha:this.globalAlpha,filter:this.filter,blend:this.globalCompositeOperation,smoothing:this.imageSmoothingEnabled,revision:0};
      Gpu604.normalize(c);commands.push(c);return originals.drawImage.call(this,image,...args);
    };
    try{GV.forceDraw();if(counts.clip)throw Error('Path clips are outside this image-stream prototype');}finally{for(const[k,fn]of Object.entries(originals))ctx[k]=fn;}
    const after=data(),index=frames.length;frames.push(commands);return {index,before,after,commands:commands.length,filtered:commands.filter(c=>c.filter==='brightness(0)').length,reflections:commands.filter(c=>c.filter==='brightness(0)'&&c.transform[3]<0).length,shadows:commands.filter(c=>c.filter==='brightness(0)'&&c.transform[3]>=0).length,sourceTextures:seen.size,clonedBytes,excludedVectorCalls:counts,composites:[...new Set(commands.map(c=>c.blend))],sampling:[...new Set(commands.map(c=>c.smoothing))]};
  }
  function mount(){if(layer)return;layer=document.createElement('div');layer.id='gpu604-layer';layer.style='position:fixed;inset:0;z-index:2147483647;background:#233445';layer.style.setProperty('visibility','visible','important');for(const id of ['reference604','gpu604']){const c=document.createElement('canvas');c.id=id;c.width=cvs.width;c.height=cvs.height;c.style='position:absolute;inset:0;width:100%;height:100%;display:none';c.style.setProperty('visibility','visible','important');layer.append(c);}document.body.append(layer);gpu=new Gpu604.OrderedGpu604(document.getElementById('gpu604'));}
  function prepare(scope){mount();if(!['all-images','filtered'].includes(scope))throw Error('Unknown component scope');active=frames.map(rows=>scope==='filtered'?rows.filter(c=>c.filter==='brightness(0)'):rows);const t=performance.now();let uploads=0;for(const rows of active)for(const c of rows)uploads+=gpu.upload(c.image,c.revision)?1:0;return {scope,uploadMs:performance.now()-t,uploads,counts:active.map(a=>a.length),gpu:gpu.info()};}
  function render(mode,index=0,negative=false){
    if(!active)throw Error('No prepared command stream');const original=active[index%active.length],rows=negative?original.map(c=>({...c,transform:[...c.transform.slice(0,4),c.transform[4]+3,c.transform[5]]})):original;
    const ref=document.getElementById('reference604'),out=document.getElementById('gpu604');ref.style.display=mode==='native'?'block':'none';out.style.display=mode==='gpu'?'block':'none';
    if(mode==='native'){Gpu604.reference(ref.getContext('2d'),rows);return {commands:rows.length};}if(mode==='gpu')return gpu.render(rows);throw Error('Unknown renderer');
  }
  function measure(mode,ms){
    return new Promise((resolve,reject)=>{const start=performance.now(),cpu=[],intervals=[];let prev,framesDrawn=0;const timeout=setTimeout(()=>reject(Error('Component RAF stalled')),ms+15000);
      function step(t){if(document.visibilityState!=='visible'||!document.hasFocus()){clearTimeout(timeout);reject(Error('Component window lost foreground'));return;}if(prev!==undefined)intervals.push(t-prev);prev=t;const t0=performance.now();render(mode,framesDrawn++);cpu.push(performance.now()-t0);if(t-start>=ms){clearTimeout(timeout);resolve({mode,elapsed:t-start,framesDrawn,intervals,cpu,sourceFrameCount:active.length});}else requestAnimationFrame(step);}requestAnimationFrame(step);
    });
  }
  function auditPoints(points){
    if(!active||running)throw Error('Pixel audit requires a prepared frozen component');
    const rows=active[0],native=document.getElementById('reference604').getContext('2d'),g=gpu.gl,ids=new Map(),assets={};
    for(const c of rows)if(!ids.has(c.image))ids.set(c.image,ids.size);
    const meta=(c,index)=>({index,sourceId:ids.get(c.image),size:[c.image.width,c.image.height],crop:c.crop,dst:c.dst,transform:c.transform,alpha:c.alpha,filter:c.filter,blend:c.blend,smoothing:c.smoothing});
    const covers=(raw,x,y)=>{const c=Gpu604.normalize(raw),[a,b,d,e,tx,ty]=c.transform,[dx,dy,dw,dh]=c.dst;const v=[[dx,dy],[dx+dw,dy],[dx,dy+dh],[dx+dw,dy+dh]].map(([px,py])=>[a*px+d*py+tx,b*px+e*py+ty]);return x+1>=Math.min(...v.map(p=>p[0]))-2&&x<=Math.max(...v.map(p=>p[0]))+2&&y+1>=Math.min(...v.map(p=>p[1]))-2&&y<=Math.max(...v.map(p=>p[1]))+2;};
    const sample=(commands,x,y)=>{Gpu604.reference(native,commands);const n=Array.from(native.getImageData(x,y,1,1).data);gpu.render(commands);const v=new Uint8Array(4);g.readPixels(x,g.drawingBufferHeight-1-y,1,1,g.RGBA,g.UNSIGNED_BYTE,v);return {native:n,gpu:Array.from(v),maxDelta:Math.max(...n.map((k,i)=>Math.abs(k-v[i])))};};
    const coordinates=(c,x,y)=>{const[a,b,d,e,tx,ty]=c.transform,det=a*e-b*d;if(!det)return null;const px=(e*(x+.5-tx)-d*(y+.5-ty))/det,py=(-b*(x+.5-tx)+a*(y+.5-ty))/det;const[sx,sy,sw,sh]=c.crop,[dx,dy,dw,dh]=c.dst;return {local:[px,py],sourceCenter:[sx+(px-dx)/dw*sw,sy+(py-dy)/dh*sh],edgeDistance:[px-dx,dx+dw-px,py-dy,dy+dh-py]};};
    const results=[];for(const[x,y]of points){const full=sample(rows,x,y),selected=rows.map((c,i)=>({c,i})).filter(({c})=>covers(c,x,y)),steps=[];let before=sample([],x,y);for(let i=0;i<selected.length;i++){const {c,index}= {c:selected[i].c,index:selected[i].i},after=sample(selected.slice(0,i+1).map(r=>r.c),x,y);if(after.maxDelta||before.maxDelta){const id=ids.get(c.image);if(!(id in assets))assets[id]=c.image.toDataURL('image/png');steps.push({command:meta(c,index),coordinates:coordinates(c,x,y),before,after});}before=after;}results.push({point:[x,y],full,selectedCommands:selected.length,selectedFinal:before,steps});}
    return {points:results,assets,commands:rows.map(meta),glError:g.getError(),gpu:gpu.info(),note:'Synchronous post-timing pixel attribution only; no performance samples in this run.'};
  }
  window.__gpu604={capture,prepare,render,measure,auditPoints,state:data,reset:()=>{if(gpu)gpu.dispose();if(layer)layer.remove();frames.length=0;active=gpu=layer=null;clonedBytes=0;return true;},info:()=>gpu&&gpu.info()};
}
module.exports={captureBridge604};
