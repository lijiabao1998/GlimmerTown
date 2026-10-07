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
  window.__gpu604={capture,prepare,render,measure,state:data,reset:()=>{if(gpu)gpu.dispose();if(layer)layer.remove();frames.length=0;active=gpu=layer=null;clonedBytes=0;return true;},info:()=>gpu&&gpu.info()};
}
module.exports={captureBridge604};
