// Disposable diagnostic only. No product source edit and no alternate raster path.
'use strict';
const assert=require('assert/strict'),crypto=require('crypto');
const {NATIVE_BLOCKS,assertNativeSource603}=require('./native603.js');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

// Bounds are in backing-store pixels BEFORE the original native block. Only an
// identity incoming transform is supported. A clip can reduce this support, not
// enlarge it; brightness(0) is the only filter set by the two pinned blocks.
// The two-pixel halo is fixed in this experiment. Do not tune it after results.
function canOmitOffcanvas603(g,x,y,w,h){
  if(!g||!g.canvas)return false;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return false;
  const right=x+w,bottom=y+h;
  if(!Number.isFinite(right)||!Number.isFinite(bottom))return false;
  const W=g.canvas.width,H=g.canvas.height;
  if(!Number.isInteger(W)||!Number.isInteger(H)||W<=0||H<=0)return false;
  if(!(right < -2 || x > W+2 || bottom < -2 || y > H+2))return false;
  // Read native state only for geometrically eligible draws. This cost is part
  // of every guarded timing window, never subtracted from measurements.
  if(g.globalCompositeOperation!=='source-over'||g.filter!=='none'||
     g.shadowBlur!==0||g.shadowOffsetX!==0||g.shadowOffsetY!==0||
     g.shadowColor!=='rgba(0, 0, 0, 0)'||
     !Number.isFinite(g.globalAlpha)||g.globalAlpha<0||g.globalAlpha>1||
     typeof g.getTransform!=='function')return false;
  let m;try{m=g.getTransform();}catch{return false;}
  return !!m&&m.a===1&&m.b===0&&m.c===0&&m.d===1&&m.e===0&&m.f===0;
}

function drawSource603(html){
  const start=html.indexOf('function draw(dt){'),end=html.indexOf('\n/* ===== T427 GPT',start);
  assert(start>=0&&end>start,'unique original draw boundary');
  const source=html.slice(start,end);
  assert(source.endsWith('\n}'),'draw body closes at pinned source boundary');
  new Function(source);
  return source;
}

function cloneDraw603(source,audit){
  let out=source.replace('function draw(dt){','function '+(audit?'offcanvasAuditDraw603':'offcanvasGuardedDraw603')+'(dt){');
  for(let i=0;i<2;i++){
    const block=NATIVE_BLOCKS[i];assert(out.split(block).length===2,'unique original block before overlay');
    const prefix=i?'      const shH=Math.max(2,s.h*z*.32);\n':'';
    const original=i?block.slice(prefix.length):block;
    const bounds=i?'bx+SHOX*z,by+s.h*z-shH+SHOY*z,s.w*z,shH':'ax2-rs.ax*z,ay2+(rs.ay-rs.h)*z*.35,rs.w*z,rs.h*z*.35';
    const test=audit?'offcanvasDecision603('+JSON.stringify(i?'shadow':'reflection')+','+(i?'o.x,o.y,s':'x,y,rs')+','+bounds+')':'canOmitOffcanvas603(ctx,'+bounds+')';
    out=out.replace(block,prefix+'      if(!'+test+'){\n'+original+'\n      }');
  }
  new Function(out);
  return out;
}

// Appended inside the existing test bridge. The original arm calls the exact
// original function, without any per-site flag/guard. Both arms share the same
// pre-existing lightweight work timer wrapper; there is no timed call tracing.
function offcanvasBridge603(){
  const originalDraw=drawReal603;
  const originalDaylight=daylight;let heldLight=null;
  daylight=function(){return heldLight||originalDaylight();};
  let mode='original',auditRows=null,auditGuarded=false,nextImage=0;
  const images=new WeakMap(),id=img=>{if(!images.has(img))images.set(img,++nextImage);return images.get(img);};
  const state=g=>{const m=g.getTransform();return {matrix:[m.a,m.b,m.c,m.d,m.e,m.f],alpha:g.globalAlpha,filter:g.filter,composite:g.globalCompositeOperation,shadow:[g.shadowColor,g.shadowBlur,g.shadowOffsetX,g.shadowOffsetY],smoothing:[g.imageSmoothingEnabled,g.imageSmoothingQuality]};};
  if(typeof offcanvasGuardedDraw603==='function')offcanvasDecision603=function(site,x,y,s,dx,dy,w,h){
    if(!auditRows)throw Error('Audit called outside post-timing snapshot');
    const omit=canOmitOffcanvas603(ctx,dx,dy,w,h);
    auditRows.push({site,tile:[x,y],image:id(s.img),sourceSize:[s.img.width,s.img.height],destination:[dx,dy,w,h],before:state(ctx),eligible:omit,skipped:auditGuarded&&omit});
    return auditGuarded&&omit;
  };
  __s603.offcanvasMode=value=>{
    if(!['original','guarded'].includes(value)||measureWork603||auditRows||(value==='guarded'&&typeof offcanvasGuardedDraw603!=='function'))throw Error('Invalid live renderer switch');
    drawReal603=value==='guarded'?offcanvasGuardedDraw603:originalDraw;mode=value;return mode;
  };
  __s603.offcanvasLight=time=>{
    if(measureWork603||auditRows)throw Error('Light switch during measurement');
    if(time===null){heldLight=null;return null;}
    if(!Number.isFinite(time))throw Error('Invalid held light');
    __s603.freezeVis(null);const originalTime=visT;
    try{visT=time;heldLight={...originalDaylight()};return {...heldLight};}finally{visT=originalTime;}
  };
  __s603.offcanvasState=()=>({mode,view:__s603.view(),viewport:__s603.viewport(),flags:__s603.flags(),quality,light:daylight(),clocks:{visT,trafClock,waterT,waterF},cache:__s603.cacheStats(),actors:compositorState603()});
  __s603.offcanvasAudit=(guarded,time,negative=false)=>{
    if(running||measureWork603||auditRows||compositorRunning603===null)throw Error('Audit requires frozen post-performance snapshot');
    const oldDraw=ctx.drawImage,oldRenderer=drawReal603,rows=[],calls=[];auditRows=rows;auditGuarded=guarded;
    ctx.drawImage=function(img,...args){
      if(this.filter==='brightness(0)')calls.push({image:id(img),args,state:state(this)});
      return oldDraw.call(this,img,...args);
    };
    drawReal603=offcanvasAuditDraw603;
    try{const frame=__s603.compositorFrame(false,time,negative?'wrong-edge':'native');return {frame,rows,calls,finalState:state(ctx)};}
    finally{ctx.drawImage=oldDraw;drawReal603=oldRenderer;auditRows=null;}
  };
}

function overlayHTML603(html){
  const native=assertNativeSource603(html); // Visible assertion BEFORE injection.
  const original=drawSource603(html),guarded=cloneDraw603(original,false),audit=cloneDraw603(original,true);
  const extra='\n'+canOmitOffcanvas603.toString()+'\nlet offcanvasDecision603;\n'+guarded+'\n'+audit+'\n';
  assert(html.split('window.GV={').length===2);
  return {html:html.replace('window.GV={',extra+'window.GV={'),proof:{sourceSHA256:native.sourceSHA256,originalDrawSHA256:hash(original),guardedDrawSHA256:hash(guarded),auditDrawSHA256:hash(audit),marginDevicePixels:2}};
}

function pairedVerdict603(windows){
  assert(windows.length===8,'exactly four balanced pairs are required');
  const pairs=[];
  for(let i=0;i<8;i+=2){const a=windows.slice(i,i+2),original=a.find(x=>x.mode==='original'),guarded=a.find(x=>x.mode==='guarded');assert(original&&guarded);pairs.push({fpsRatio:guarded.fps/original.fps,rafP95Ratio:guarded.raf.p95/original.raf.p95,warmP95Ratio:guarded.warmP95/original.warmP95});}
  const median=a=>{a=[...a].sort((x,y)=>x-y);return(a[1]+a[2])/2;};
  const ratio=median(pairs.map(p=>p.fpsRatio)),raf=median(pairs.map(p=>p.rafP95Ratio)),warm=median(pairs.map(p=>p.warmP95Ratio));
  const wins=pairs.filter(p=>p.fpsRatio>1).length;
  return {pairs,medianFPSRatio:ratio,medianRAFP95Ratio:raf,medianWarmP95Ratio:warm,wins,
    clearBenefit:wins>=3&&ratio>=1.05&&raf<=1.05&&warm<=1.05,
    noMaterialRegression:ratio>=.95&&raf<=1.05&&warm<=1.05};
}

module.exports={canOmitOffcanvas603,drawSource603,cloneDraw603,overlayHTML603,offcanvasBridge603,pairedVerdict603};
