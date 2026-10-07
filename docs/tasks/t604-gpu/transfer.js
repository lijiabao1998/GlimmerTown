'use strict';
// A disposable observer and synthetic transport benchmark, not a renderer hook.
function transferBridge604(ctx,cvs){
  let batches=[],gpu=null,layer=null,patches=[],commands=[],revision=0;
  function audit(render){
    const old={},groups=[];let current=null,path=null,unknownPath=false,pathScale=1,vectorCalls=0;
    const union=(a,b)=>!a?b:!b?a:[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];
    const points=rows=>{const m=ctx.getTransform();pathScale=Math.max(pathScale,Math.hypot(m.a,m.b),Math.hypot(m.c,m.d));const p=rows.map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]);return [Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))];};
    const rect=(x,y,w,h)=>points([[x,y],[x+w,y],[x,y+h],[x+w,y+h]]);
    const flush=()=>{if(current){const r=current.bounds||[0,0,0,0],x=Math.max(0,Math.floor(r[0])),y=Math.max(0,Math.floor(r[1])),right=Math.min(cvs.width,Math.ceil(r[2])),bottom=Math.min(cvs.height,Math.ceil(r[3]));groups.push({...current,bounds:[x,y,Math.max(0,right-x),Math.max(0,bottom-y)],area:Math.max(0,right-x)*Math.max(0,bottom-y)});current=null;}};
    const wrap=(name,observe)=>{old[name]=ctx[name];ctx[name]=function(...a){observe(a);return old[name].apply(this,a);};};
    wrap('beginPath',()=>{path=null;unknownPath=false;pathScale=1;});
    for(const name of ['moveTo','lineTo'])wrap(name,a=>{path=union(path,points([[a[0],a[1]]]));});
    wrap('rect',a=>{path=union(path,rect(...a));});
    wrap('roundRect',a=>{path=union(path,rect(...a.slice(0,4)));});
    wrap('arc',a=>{path=union(path,rect(a[0]-a[2],a[1]-a[2],a[2]*2,a[2]*2));});
    wrap('ellipse',a=>{const r=Math.max(a[2],a[3]);path=union(path,rect(a[0]-r,a[1]-r,2*r,2*r));});
    for(const name of ['quadraticCurveTo','bezierCurveTo'])wrap(name,a=>{const p=[];for(let i=0;i<a.length;i+=2)p.push([a[i],a[i+1]]);path=union(path,points(p));});
    wrap('arcTo',()=>{unknownPath=true;});
    wrap('drawImage',flush);
    for(const name of ['fillRect','strokeRect','fill','stroke','fillText','strokeText','clearRect'])wrap(name,a=>{
      vectorCalls++;const blend=name==='clearRect'?'clear':ctx.globalCompositeOperation;if(current&&current.blend!==blend)flush();if(!current)current={blend,calls:0,types:{},bounds:null,fallbacks:0};current.calls++;current.types[name]=(current.types[name]||0)+1;
      let box;if(name.endsWith('Rect'))box=rect(...a);else if((name==='fill'||name==='stroke')&&!unknownPath&&!a.some(v=>v&&typeof v==='object'))box=path;else{box=[0,0,cvs.width,cvs.height];current.fallbacks++;}
      if(box){const m=ctx.getTransform(),scale=Math.max(pathScale,Math.hypot(m.a,m.b),Math.hypot(m.c,m.d)),stroke=name.startsWith('stroke')?ctx.lineWidth*scale*Math.max(2,ctx.miterLimit)/2:0,pad=2+stroke+ctx.shadowBlur*3+Math.abs(ctx.shadowOffsetX)+Math.abs(ctx.shadowOffsetY);box=[box[0]-pad,box[1]-pad,box[2]+pad,box[3]+pad];current.bounds=union(current.bounds,box);}
    });
    let result;try{result=render();flush();}finally{for(const[k,fn]of Object.entries(old))ctx[k]=fn;}
    batches=groups;return {capture:result,vectorCalls,batches:groups,summary:{batches:groups.length,visibleBatches:groups.filter(b=>b.area).length,totalPixels:groups.reduce((n,b)=>n+b.area,0),maxPixels:Math.max(0,...groups.map(b=>b.area)),fallbacks:groups.reduce((n,b)=>n+b.fallbacks,0),blendCounts:groups.reduce((o,b)=>(o[b.blend]=(o[b.blend]||0)+1,o),{})}};
  }
  function prepare(size){
    dispose();layer=document.createElement('div');layer.style='position:fixed;inset:0;z-index:2147483647;background:#233445';layer.style.setProperty('visibility','visible','important');const c=document.createElement('canvas');c.width=cvs.width;c.height=cvs.height;c.style='width:100%;height:100%';c.style.setProperty('visibility','visible','important');layer.append(c);document.body.append(layer);gpu=new Gpu604.OrderedGpu604(c);
    let bytes=0;const visible=batches.filter(b=>b.area);for(const b of visible){const[x,y,w,h]=b.bounds,p=document.createElement('canvas');p.width=size==='minimum'?1:w;p.height=size==='minimum'?1:h;bytes+=p.width*p.height*4;if(bytes>128*1024*1024)throw Error('Conservative vector patch pool exceeds 128 MiB; reject unbounded transport');const g=p.getContext('2d');g.fillStyle='rgba(90,140,180,.15)';g.fillRect(0,0,p.width,p.height);patches.push({canvas:p,g});commands.push({image:p,dst:[x,y,size==='minimum'?1:w,size==='minimum'?1:h],transform:[1,0,0,1,0,0],alpha:1,smoothing:false,filter:'none',blend:'source-over',revision:0});gpu.upload(p,0);}
    return {size,patches:patches.length,bytes,gpu:gpu.info(),note:'Synthetic changed-source transport floor: native vector raster work is excluded; source-over replay does not represent full-scene blend correctness.'};
  }
  function frame(update){let uploadMs=0,drawMs=0;const t=performance.now();if(update){revision++;for(let i=0;i<patches.length;i++){const p=patches[i];p.g.clearRect(0,0,1,1);p.g.fillStyle=revision%2?'#7392a1':'#7194a3';p.g.fillRect(0,0,1,1);commands[i].revision=revision;gpu.upload(p.canvas,revision);}}uploadMs=performance.now()-t;const t2=performance.now();gpu.render(commands);drawMs=performance.now()-t2;return {uploadMs,drawMs,totalMs:performance.now()-t};}
  function measure(update,ms){return new Promise((resolve,reject)=>{const start=performance.now(),rows=[],intervals=[];let prev;const timer=setTimeout(()=>reject(Error('Transport RAF stalled')),ms+15000);function step(t){try{if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Transport lost foreground');if(prev!==undefined)intervals.push(t-prev);prev=t;rows.push(frame(update));if(t-start>=ms){clearTimeout(timer);resolve({update,elapsed:t-start,intervals,rows,revision});}else requestAnimationFrame(step);}catch(e){clearTimeout(timer);reject(e);}}requestAnimationFrame(step);});}
  function dispose(){if(gpu)gpu.dispose();if(layer)layer.remove();gpu=layer=null;patches=[];commands=[];revision=0;}
  window.__transfer604={capture:()=>audit(()=>__gpu604.capture()),prepare,measure,dispose};
}
module.exports={transferBridge604};
