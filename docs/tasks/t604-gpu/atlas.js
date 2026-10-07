'use strict';
function packRects604(rects,size=4096,maxPages=2){
  const rows=rects.map(r=>({...r})).sort((a,b)=>b.h-a.h||b.w-a.w||a.index-b.index),slots=[],pages=[];let page=0,x=0,y=0,rowHeight=0;
  for(const r of rows){if(!Number.isInteger(r.w)||!Number.isInteger(r.h)||r.w<1||r.h<1||r.w+2>size||r.h+2>size)throw Error('Atlas rectangle invalid or too large');if(x+r.w+2>size){x=0;y+=rowHeight;rowHeight=0;}if(y+r.h+2>size){page++;x=y=rowHeight=0;}if(page>=maxPages)throw Error('Atlas exceeds two bounded pages');slots.push({...r,page,x:x+1,y:y+1});pages[page]={width:size,height:size};x+=r.w+2;rowHeight=Math.max(rowHeight,r.h+2);}
  return {slots:slots.sort((a,b)=>a.index-b.index),pages,bytes:pages.length*size*size*4};
}
function atlasBridge604(ctx,cvs,pack){
  const props=['fillStyle','strokeStyle','globalAlpha','globalCompositeOperation','filter','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','font','textAlign','textBaseline','direction','imageSmoothingEnabled'];
  let trace=[],audit,semantics,reference,mirror,layer,gpu,atlases=[],slots=new Map(),commands=[],revision=0,compiled,paints=[],direct=[],mode='native';
  function capture(){
    trace=[];const old={};let pending=0,lastBlend=null,batch=0,currentPath=[];semantics={paintCalls:0,types:{},filters:{},blends:{},styles:{},texts:0,clips:0,pathObjects:0};
    const flush=()=>{if(pending){trace.push({name:'flush',args:[batch++]});pending=0;lastBlend=null;}};
    const transform=()=>{const m=ctx.getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f];};
    const wrap=(name,observe)=>{old[name]=ctx[name];ctx[name]=function(...a){observe(a);return old[name].apply(this,a);};};
    for(const name of ['beginPath','closePath','moveTo','lineTo','rect','roundRect','arc','ellipse','quadraticCurveTo','bezierCurveTo','arcTo'])wrap(name,a=>{const op={name,args:a,transform:transform()};if(name==='beginPath')currentPath=[];currentPath.push(op);trace.push(op);});
    wrap('clip',()=>{semantics.clips++;});wrap('drawImage',flush);
    for(const name of ['fillRect','strokeRect','fill','stroke','fillText','strokeText','clearRect'])wrap(name,a=>{
      const blend=name==='clearRect'?'clear':ctx.globalCompositeOperation;if(pending&&lastBlend!==blend)flush();pending++;lastBlend=blend;semantics.paintCalls++;semantics.types[name]=(semantics.types[name]||0)+1;semantics.filters[ctx.filter]=(semantics.filters[ctx.filter]||0)+1;semantics.blends[blend]=(semantics.blends[blend]||0)+1;if(/Text$/.test(name))semantics.texts++;if(a.some(v=>v&&typeof v==='object'))semantics.pathObjects++;
      const style=ctx[name.startsWith('stroke')?'strokeStyle':'fillStyle'],kind=typeof style==='string'?'color':style.constructor.name;semantics.styles[kind]=(semantics.styles[kind]||0)+1;trace.push({name,args:a,transform:transform(),state:Object.fromEntries(props.map(p=>[p,ctx[p]])),dash:ctx.getLineDash(),path:(name==='fill'||name==='stroke')?currentPath.slice():null});
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
  function compileDirect(){
    direct=[];let operations=[];const flush=index=>{const slot=slots.get(index);if(!slot){operations=[];return;}const bounds=audit.batches[index].bounds,dx=slot.x-bounds[0],dy=slot.y-bounds[1],g=atlases[slot.page].g,previous=Object.fromEntries(props.map(p=>[p,g[p]])),objects=[],ids=new Map(),lines=[];let matrix='',dash='[]';
      const value=v=>{if(v&&typeof v==='object'){if(!ids.has(v)){ids.set(v,objects.length);objects.push(v);}return 'paints['+ids.get(v)+']';}return JSON.stringify(v);};
      const setMatrix=m=>{const n=[m[0],m[1],m[2],m[3],m[4]+dx,m[5]+dy],s=JSON.stringify(n);if(s!==matrix){lines.push('g.setTransform('+n.join(',')+');');matrix=s;}};
      for(const op of operations){if(op.path){for(const p of op.path){setMatrix(p.transform);lines.push('g.'+p.name+'('+p.args.map(value).join(',')+');');}}setMatrix(op.transform);for(const[p,v]of Object.entries(op.state))if(previous[p]!==v){lines.push('g.'+p+'='+value(v)+';');previous[p]=v;}const ds=JSON.stringify(op.dash);if(ds!==dash){lines.push('g.setLineDash('+ds+');');dash=ds;}lines.push('g.'+op.name+'('+op.args.map(value).join(',')+');');}
      direct.push({index,slot,paints:objects,render:new Function('g','paints',lines.join('\n')),commands:lines.length});operations=[];
    };
    for(const op of trace){if(op.name==='flush')flush(op.args[0]);else if(op.state)operations.push(op);}if(operations.length)throw Error('Unflushed direct atlas vector operations');return {batches:direct.length,commands:direct.reduce((n,b)=>n+b.commands,0),sourceCanvasCopies:0};
  }
  function prepare(){
    dispose();const packed=pack(audit.batches.map((b,index)=>({index,w:b.bounds[2],h:b.bounds[3]})).filter(r=>r.w&&r.h));slots=new Map(packed.slots.map(s=>[s.index,s]));layer=document.createElement('div');layer.style='position:fixed;inset:0;z-index:2147483647;background:#233445';layer.style.setProperty('visibility','visible','important');
    const canvas=id=>{const c=document.createElement('canvas');c.id=id;c.width=cvs.width;c.height=cvs.height;c.style='position:absolute;inset:0;width:100%;height:100%';c.style.setProperty('visibility','visible','important');layer.append(c);return c;};reference=canvas('atlas-native604').getContext('2d');const gc=canvas('atlas-gpu604');document.body.append(layer);gpu=new Gpu604.OrderedGpu604(gc);const mc=document.createElement('canvas');mc.width=cvs.width;mc.height=cvs.height;mirror=mc.getContext('2d');
    atlases=packed.pages.map(p=>{const c=document.createElement('canvas');c.width=p.width;c.height=p.height;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return {canvas:c,g};});
    commands=packed.slots.map(s=>{const b=audit.batches[s.index];return {image:atlases[s.page].canvas,crop:[s.x,s.y,s.w,s.h],dst:b.bounds.slice(),transform:[1,0,0,1,0,0],alpha:1,filter:'none',smoothing:false,blend:b.blend,revision:0};});
    return {packing:packed,compile:compile(),direct:compileDirect(),gpu:gpu.info(),note:'Direct raster into translated, bounded atlas tiles; zero source-Canvas copies. Image commands and simulation still excluded.'};
  }
  const clear=g=>{g.save();g.resetTransform();g.clearRect(0,0,g.canvas.width,g.canvas.height);g.restore();};
  function render(which,negative=false){mode=which;reference.canvas.style.display=which==='native'?'block':'none';gpu.canvas.style.display=which==='atlas'?'block':'none';const start=performance.now();let rasterMs=0,uploadMs=0,drawMs=0;
    if(which==='native'){clear(reference);reference.save();reference.resetTransform();reference.globalAlpha=1;reference.globalCompositeOperation='source-over';reference.filter='none';reference.fillStyle='#233445';reference.fillRect(0,0,cvs.width,cvs.height);reference.restore();compiled(reference,paints,()=>{});rasterMs=performance.now()-start;}
    else if(which==='atlas'){
      for(const a of atlases)clear(a.g);for(const b of direct){const g=atlases[b.slot.page].g,s=b.slot;g.save();g.resetTransform();g.beginPath();g.rect(s.x,s.y,s.w,s.h);g.clip();try{b.render(g,b.paints);}finally{g.restore();}}rasterMs=performance.now()-start;
      const upload=performance.now();revision++;for(const a of atlases){a.g.save();a.g.fillStyle=revision%2?'#030507':'#070503';a.g.fillRect(0,0,1,1);a.g.restore();gpu.upload(a.canvas,revision);}for(const c of commands)c.revision=revision;uploadMs=performance.now()-upload;
      const draw=performance.now();const rows=negative?commands.map(c=>({...c,dst:[c.dst[0]+3,...c.dst.slice(1)]})):commands;gpu.render(rows);drawMs=performance.now()-draw;
    }else throw Error('Unknown atlas mode');return {mode:which,rasterMs,uploadMs,drawMs,totalMs:performance.now()-start};
  }
  function measure(which,ms){return new Promise((resolve,reject)=>{const start=performance.now(),rows=[],intervals=[];let last;const timer=setTimeout(()=>reject(Error('Atlas RAF stalled')),ms+20000);function f(t){try{if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Atlas lost foreground');if(last!==undefined)intervals.push(t-last);last=t;rows.push(render(which));if(t-start>=ms){clearTimeout(timer);resolve({mode:which,elapsed:t-start,rows,intervals});}else requestAnimationFrame(f);}catch(e){clearTimeout(timer);reject(e);}}requestAnimationFrame(f);});}
  function conformance(){
    const c=document.createElement('canvas');c.width=64;c.height=64;const renderer=new Gpu604.OrderedGpu604(c),make=()=>{const c=document.createElement('canvas');c.width=c.height=64;return c;},background=make(),bg=background.getContext('2d');bg.fillStyle='#215b91';bg.fillRect(0,0,64,64);bg.fillStyle='#d2aa53';for(let y=0;y<64;y+=8)for(let x=0;x<64;x+=8)if((x+y)%16===0)bg.fillRect(x,y,8,8);
    renderer.upload(background,0);const result=[];const pixelDelta=(a,b)=>{let changed=0,max=0;for(let i=0;i<a.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(a[i+k]-b[i+k]));if(d)changed++;max=Math.max(max,d);}return {changed,max};};
    const get=()=>{const g=renderer.gl,raw=new Uint8Array(64*64*4),out=new Uint8Array(raw.length);g.readPixels(0,0,64,64,g.RGBA,g.UNSIGNED_BYTE,raw);for(let y=0;y<64;y++)out.set(raw.subarray((63-y)*256,(64-y)*256),y*256);return out;};
    try{for(const blend of ['source-over','lighter','screen','multiply']){const ref=make(),tile=make(),a=ref.getContext('2d'),b=tile.getContext('2d');a.drawImage(background,0,0);for(const g of[a,b]){g.globalCompositeOperation=blend;g.fillStyle='rgba(200,80,40,.4)';g.fillRect(4,4,42,50);const q=g.createLinearGradient(0,0,64,64);q.addColorStop(0,'rgba(30,190,220,.2)');q.addColorStop(1,'rgba(220,60,160,.7)');g.fillStyle=q;g.fillRect(18,12,42,48);}renderer.upload(tile,0);const rows=[{image:background,dst:[0,0,64,64],smoothing:false},{image:tile,dst:[0,0,64,64],smoothing:false,blend}];renderer.render(rows);const actual=get(),expected=a.getImageData(0,0,64,64).data;renderer.render(rows);const repeat=get();let wrong=null;if(blend==='multiply'){renderer.render([rows[0],{...rows[1],blend:'source-over'}]);wrong=pixelDelta(actual,get());renderer.render(rows);}result.push({blend,difference:pixelDelta(expected,actual),repeat:pixelDelta(actual,repeat),wrongSourceOver:wrong,restored:pixelDelta(actual,get())});}return {cases:result,glError:renderer.gl.getError(),note:'Two-layer gradient/checkerboard compositing control. Rounding bounds here do not change any product pixel gate.'};}finally{renderer.dispose();}
  }
  function dispose(){if(gpu)gpu.dispose();if(layer)layer.remove();gpu=layer=mirror=reference=null;atlases=[];commands=[];direct=[];revision=0;}
  window.__atlas604={capture,prepare,render,measure,conformance,dispose,info:()=>gpu&&gpu.info()};
}
module.exports={packRects604,atlasBridge604};
