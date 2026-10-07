'use strict';
function packRects604(rects,size=4096,maxPages=2){
  const rows=rects.map(r=>({...r})).sort((a,b)=>b.h-a.h||b.w-a.w||a.index-b.index),slots=[],pages=[];let page=0,x=0,y=0,rowHeight=0;
  for(const r of rows){if(!Number.isInteger(r.w)||!Number.isInteger(r.h)||r.w<1||r.h<1||r.w+2>size||r.h+2>size)throw Error('Atlas rectangle invalid or too large');if(x+r.w+2>size){x=0;y+=rowHeight;rowHeight=0;}if(y+r.h+2>size){page++;x=y=rowHeight=0;}if(page>=maxPages)throw Error('Atlas exceeds two bounded pages');slots.push({...r,page,x:x+1,y:y+1});pages[page]={width:size,height:size};x+=r.w+2;rowHeight=Math.max(rowHeight,r.h+2);}
  return {slots:slots.sort((a,b)=>a.index-b.index),pages,bytes:pages.length*size*size*4};
}
function atlasBridge604(ctx,cvs,pack){
  const props=['fillStyle','strokeStyle','globalAlpha','globalCompositeOperation','filter','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','font','textAlign','textBaseline','direction','imageSmoothingEnabled'];
  let trace=[],audit,semantics,reference,mirror,layer,gpu,atlases=[],slots=new Map(),commands=[],revision=0,compiled,paints=[],mode='native';
  function capture(){
    trace=[];const old={};let pending=0,lastBlend=null,batch=0;semantics={paintCalls:0,types:{},filters:{},blends:{},styles:{},texts:0,clips:0,pathObjects:0};
    const flush=()=>{if(pending){trace.push({name:'flush',args:[batch++]});pending=0;lastBlend=null;}};
    const transform=()=>{const m=ctx.getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f];};
    const wrap=(name,observe)=>{old[name]=ctx[name];ctx[name]=function(...a){observe(a);return old[name].apply(this,a);};};
    for(const name of ['beginPath','closePath','moveTo','lineTo','rect','roundRect','arc','ellipse','quadraticCurveTo','bezierCurveTo','arcTo'])wrap(name,a=>trace.push({name,args:a,transform:transform()}));
    wrap('clip',()=>{semantics.clips++;});wrap('drawImage',flush);
    for(const name of ['fillRect','strokeRect','fill','stroke','fillText','strokeText','clearRect'])wrap(name,a=>{
      const blend=name==='clearRect'?'clear':ctx.globalCompositeOperation;if(pending&&lastBlend!==blend)flush();pending++;lastBlend=blend;semantics.paintCalls++;semantics.types[name]=(semantics.types[name]||0)+1;semantics.filters[ctx.filter]=(semantics.filters[ctx.filter]||0)+1;semantics.blends[blend]=(semantics.blends[blend]||0)+1;if(/Text$/.test(name))semantics.texts++;if(a.some(v=>v&&typeof v==='object'))semantics.pathObjects++;
      const style=ctx[name.startsWith('stroke')?'strokeStyle':'fillStyle'],kind=typeof style==='string'?'color':style.constructor.name;semantics.styles[kind]=(semantics.styles[kind]||0)+1;trace.push({name,args:a,transform:transform(),state:Object.fromEntries(props.map(p=>[p,ctx[p]])),dash:ctx.getLineDash()});
    });
    try{audit=__transfer604.capture();flush();}finally{for(const[k,fn]of Object.entries(old))ctx[k]=fn;}
    if(batch!==audit.batches.length||semantics.paintCalls!==audit.vectorCalls)throw Error('Atlas/vector observer sequence mismatch');
    const supported=Object.keys(semantics.blends).every(x=>['source-over','lighter','screen','multiply'].includes(x))&&Object.keys(semantics.filters).every(x=>x==='none')&&Object.keys(semantics.styles).every(x=>['color','CanvasGradient'].includes(x))&&!semantics.clips&&!semantics.pathObjects&&!semantics.texts;
    return {audit,semantics,supported,events:trace.length};
  }
  function compile(){const lines=[],previous={},objects=[],ids=new Map();let matrix='',dash='';const value=v=>{if(v&&typeof v==='object'){if(!ids.has(v)){ids.set(v,objects.length);objects.push(v);}return 'paints['+ids.get(v)+']';}return JSON.stringify(v);};
    for(const op of trace){if(op.name==='flush'){lines.push('flush('+op.args[0]+');');continue;}const m=JSON.stringify(op.transform);if(m!==matrix){lines.push('g.setTransform('+op.transform.join(',')+');');matrix=m;}if(op.state){for(const[p,v]of Object.entries(op.state))if(previous[p]!==v){lines.push('g.'+p+'='+value(v)+';');previous[p]=v;}const d=JSON.stringify(op.dash);if(d!==dash){lines.push('g.setLineDash('+d+');');dash=d;}}lines.push('g.'+op.name+'('+op.args.map(value).join(',')+');');}
    paints=objects;compiled=new Function('g','paints','flush',lines.join('\n'));return {commands:lines.length,gradientObjects:objects.length};
  }
  function prepare(){
    dispose();const packed=pack(audit.batches.map((b,index)=>({index,w:b.bounds[2],h:b.bounds[3]})).filter(r=>r.w&&r.h));slots=new Map(packed.slots.map(s=>[s.index,s]));layer=document.createElement('div');layer.style='position:fixed;inset:0;z-index:2147483647;background:#233445';layer.style.setProperty('visibility','visible','important');
    const canvas=id=>{const c=document.createElement('canvas');c.id=id;c.width=cvs.width;c.height=cvs.height;c.style='position:absolute;inset:0;width:100%;height:100%';c.style.setProperty('visibility','visible','important');layer.append(c);return c;};reference=canvas('atlas-native604').getContext('2d');const gc=canvas('atlas-gpu604');document.body.append(layer);gpu=new Gpu604.OrderedGpu604(gc);const mc=document.createElement('canvas');mc.width=cvs.width;mc.height=cvs.height;mirror=mc.getContext('2d');
    atlases=packed.pages.map(p=>{const c=document.createElement('canvas');c.width=p.width;c.height=p.height;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return {canvas:c,g};});
    commands=packed.slots.map(s=>{const b=audit.batches[s.index];return {image:atlases[s.page].canvas,crop:[s.x,s.y,s.w,s.h],dst:b.bounds.slice(),transform:[1,0,0,1,0,0],alpha:1,filter:'none',smoothing:false,blend:b.blend,revision:0};});
    return {packing:packed,compile:compile(),gpu:gpu.info(),note:'One/few dirty atlas uploads; original native vector commands re-rasterized each frame. Image commands and simulation still excluded.'};
  }
  const clear=g=>{g.save();g.resetTransform();g.clearRect(0,0,g.canvas.width,g.canvas.height);g.restore();};
  function render(which,negative=false){mode=which;reference.canvas.style.display=which==='native'?'block':'none';gpu.canvas.style.display=which==='atlas'?'block':'none';const start=performance.now();let rasterMs=0,uploadMs=0,drawMs=0;
    if(which==='native'){clear(reference);reference.save();reference.resetTransform();reference.globalAlpha=1;reference.globalCompositeOperation='source-over';reference.filter='none';reference.fillStyle='#233445';reference.fillRect(0,0,cvs.width,cvs.height);reference.restore();compiled(reference,paints,()=>{});rasterMs=performance.now()-start;}
    else if(which==='atlas'){
      clear(mirror);for(const a of atlases)clear(a.g);compiled(mirror,paints,index=>{const s=slots.get(index);if(!s)return;const b=audit.batches[index],g=atlases[s.page].g;g.drawImage(mirror.canvas,...b.bounds,s.x,s.y,s.w,s.h);mirror.save();mirror.resetTransform();mirror.clearRect(...b.bounds);mirror.restore();});rasterMs=performance.now()-start;
      const upload=performance.now();revision++;for(const a of atlases){a.g.fillStyle=revision%2?'#030507':'#070503';a.g.fillRect(0,0,1,1);gpu.upload(a.canvas,revision);}for(const c of commands)c.revision=revision;uploadMs=performance.now()-upload;
      const draw=performance.now();const rows=negative?commands.map(c=>({...c,dst:[c.dst[0]+3,...c.dst.slice(1)]})):commands;gpu.render(rows);drawMs=performance.now()-draw;
    }else throw Error('Unknown atlas mode');return {mode:which,rasterMs,uploadMs,drawMs,totalMs:performance.now()-start};
  }
  function measure(which,ms){return new Promise((resolve,reject)=>{const start=performance.now(),rows=[],intervals=[];let last;const timer=setTimeout(()=>reject(Error('Atlas RAF stalled')),ms+20000);function f(t){try{if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Atlas lost foreground');if(last!==undefined)intervals.push(t-last);last=t;rows.push(render(which));if(t-start>=ms){clearTimeout(timer);resolve({mode:which,elapsed:t-start,rows,intervals});}else requestAnimationFrame(f);}catch(e){clearTimeout(timer);reject(e);}}requestAnimationFrame(f);});}
  function dispose(){if(gpu)gpu.dispose();if(layer)layer.remove();gpu=layer=mirror=reference=null;atlases=[];commands=[];revision=0;}
  window.__atlas604={capture,prepare,render,measure,dispose,info:()=>gpu&&gpu.info()};
}
module.exports={packRects604,atlasBridge604};
