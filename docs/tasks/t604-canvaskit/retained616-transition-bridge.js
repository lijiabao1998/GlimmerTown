  // Test-only continuation of retained614-bridge.js, inside bridge603().
  // The production frame/advance/draw functions and the retained helper are not
  // replaced. One candidate surface/cache survives every transition.
  let installed616=false,activeRender616=null,lastCandidateArgs616=null;
  let copies616={},renders616={},surfaceIds616=new WeakMap(),nextSurface616=0;
  const lifecycle616=[],listeners616=[];
  let snapshotStyle616=null,pausedAnimations616=[];
  const surfaceId616=c=>{if(!c)return null;if(!surfaceIds616.has(c))surfaceIds616.set(c,++nextSurface616);return surfaceIds616.get(c);};
  const deltaDetail616=(a,b,width)=>{
    if(!a||!b||a.length!==b.length)throw Error('T616 RGBA dimensions/presence mismatch');
    let pixels=0,maxChannelDelta=0,x0=Infinity,y0=Infinity,x1=-1,y1=-1;
    const points=[];
    for(let i=0;i<a.length;i+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a[i+k]-b[i+k]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}if(!changed)continue;
      const p=i/4,x=p%width,y=Math.floor(p/width);pixels++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      if(points.length<32)points.push({x,y,original:Array.from(a.subarray(i,i+4)),candidate:Array.from(b.subarray(i,i+4))});
    }
    return {pixels,maxChannelDelta,bbox:pixels?{x0,y0,x1,y1}:null,points,sampleLimit:32};
  };
  const watchedDispatcher616=(...args)=>{
    const record=activeRender616;
    if(record)record.layerCalls++;
    const result=dispatcher614(...args);
    if(record){record.returned=result;record.returnedLayer=!!result;record.surfaceId=surfaceId616(result);}
    if(mode614==='candidate')lastCandidateArgs616=args;
    return result;
  };
  const recordLifecycle616=event=>{if(lifecycle616.length<64)lifecycle616.push({type:event.type,trusted:event.isTrusted,visible:document.visibilityState,time:performance.now()});};
  window.__retained616={
    install:()=>{
      if(installed616)throw Error('T616 already installed');
      __retained614.install();installed616=true;lotNightLayer574=watchedDispatcher616;
      for(const type of ['freeze','resume','visibilitychange']){document.addEventListener(type,recordLifecycle616);listeners616.push([document,type,recordLifecycle616]);}
      baseline614=visual614();return {installed:true,cacheInvalidatedBetweenActions:false,snapshotScope:'Complete game canvas; HUD/toast UI hidden only within each diagnostic comparison.'};
    },
    snapshot:()=>{if(!installed616||running)throw Error('T616 snapshot requires installed paused diagnostic');baseline614=visual614();copies616={};renders616={};return {view:__s603.view(),light:daylight(),viewport:{width:W,height:H,dpr:DPR,cssWidth:innerWidth,cssHeight:innerHeight,devicePixelRatio}};},
    beginCapture:()=>{
      if(snapshotStyle616)throw Error('T616 capture already active');snapshotStyle616=document.createElement('style');snapshotStyle616.id='retained616-canvas-snapshot';
      snapshotStyle616.textContent='#hud,#toolcats,#tools,#zoomer,#mini,#miniToggle,#hint,#toasts { visibility:hidden !important; }';document.head.append(snapshotStyle616);
      pausedAnimations616=document.getAnimations().filter(a=>a.playState==='running');for(const a of pausedAnimations616)a.pause();return true;
    },
    endCapture:()=>{snapshotStyle616?.remove();snapshotStyle616=null;for(const a of pausedAnimations616)try{a.play();}catch{}pausedAnimations616=[];return true;},
    step:dt=>{if(!Number.isFinite(dt)||dt<0||dt>.05)throw Error('T616 step outside fixed correctness schedule');return __retained614.step(dt);},
    render:mode=>{
      if(!installed616||running||!['original','candidate','restored'].includes(mode))throw Error('T616 invalid render');
      const record={layerCalls:0,returnedLayer:false,surfaceId:null,returned:null};activeRender616=record;
      let result;try{result=__retained614.render(mode);}finally{activeRender616=null;}
      renders616[mode]=record;
      const stats=mode==='candidate'&&record.layerCalls?cache614.stats():null;
      return {...result,stats,layerCalls:record.layerCalls,returnedLayer:record.returnedLayer,surfaceId:record.surfaceId,retainedBytes:cache614.stats().retainedBytes};
    },
    layerPixels:mode=>{
      const record=renders616[mode];if(!record)throw Error('T616 pixels requested before render');
      const canvas=record.returned,copy=canvas?{width:canvas.width,height:canvas.height,bytes:copyPixels614(canvas)}:null;
      copies616[mode]=copy;
      if(mode==='original')return {layerCalls:record.layerCalls,present:!!copy,width:copy?.width||0,height:copy?.height||0};
      const original=copies616.original;
      if(!!original!==!!copy||renders616.original.layerCalls!==record.layerCalls)return {presenceMismatch:true,pixels:null};
      if(!copy)return {notInvoked:record.layerCalls===0,noLayer:true,pixels:0,maxChannelDelta:0};
      if(original.width!==copy.width||original.height!==copy.height)return {dimensionMismatch:true,pixels:null};
      return deltaDetail616(original.bytes,copy.bytes,copy.width);
    },
    failureEvidence:()=>{
      const a=copies616.original,b=copies616.candidate,sa=slots614.original,sb=slots614.candidate;
      if(!a||!b||a.width!==b.width||a.height!==b.height)return {available:false,reason:'No comparable current returned layers'};
      const originalRaw=sa.context.getImageData(0,0,a.width,a.height).data,candidateRaw=sb.context.getImageData(0,0,b.width,b.height).data;
      const result={available:true,width:a.width,height:a.height,copiedDelta:deltaDetail616(a.bytes,b.bytes,a.width),rawDelta:deltaDetail616(originalRaw,candidateRaw,a.width),originalCopyDelta:deltaDetail616(originalRaw,a.bytes,a.width),candidateCopyDelta:deltaDetail616(candidateRaw,b.bytes,b.width)};
      const model=model614(),actors=actor614(),oldR=R;let rng=0;R=()=>{rng++;return oldR();};
      try{if(lastCandidateArgs616){const restored=withSlot614('candidate',originalLayer614,lastCandidateArgs616),copy=copyPixels614(restored),raw=slots614.candidate.context.getImageData(0,0,a.width,a.height).data;result.repair={sameCandidateSurface:true,copiedDelta:deltaDetail616(a.bytes,copy,a.width),rawDelta:deltaDetail616(originalRaw,raw,a.width)};}}
      catch(error){result.repair={error:String(error)};}
      finally{R=oldR;result.invariants={rng,modelUnchanged:model===model614(),actorsUnchanged:actors===actor614()};}
      return result;
    },
    rawCheckpoint:()=>{
      const a=copies616.original,b=copies616.candidate;if(!a||!b)return {notApplicable:true,reason:'Current draw did not return both layers'};
      if(a.width!==b.width||a.height!==b.height)throw Error('T616 raw checkpoint dimensions mismatch');
      const pa=slots614.original.context.getImageData(0,0,a.width,a.height).data,pb=slots614.candidate.context.getImageData(0,0,b.width,b.height).data;
      return {width:a.width,height:a.height,rawDelta:deltaDetail616(pa,pb,a.width),originalCopyDelta:deltaDetail616(pa,a.bytes,a.width),candidateCopyDelta:deltaDetail616(pb,b.bytes,b.width)};
    },
    offsetCamera:(dx,dy)=>{cam.x+=dx;cam.y+=dy;groundDirty=true;return {...cam};},
    viewport:()=>({cssWidth:innerWidth,cssHeight:innerHeight,width:W,height:H,canvasWidth:cvs.width,canvasHeight:cvs.height,dpr:DPR,devicePixelRatio}),
    resetOutput:kind=>{const s=slots614.candidate;if(!s.canvas)throw Error('T616 output not established');if(kind==='width')s.canvas.width=s.canvas.width;else if(kind==='height-attribute')s.canvas.setAttribute('height',String(s.canvas.height));else if(kind==='reset'){if(typeof s.context.reset!=='function')return {supported:false};s.context.reset();}else if(kind==='replace'){slots614.candidate={canvas:null,context:null};}else throw Error('T616 unknown output reset');return {supported:true,kind};},
    lifecycle:()=>({events:lifecycle616.slice(),visible:document.visibilityState,focused:document.hasFocus(),timeOrigin:performance.timeOrigin,cacheCalls:cache614?.stats().calls||0,retainedBytes:cache614?.stats().retainedBytes||0}),
    guards:()=>({originalFrame:frame===originals606.frame,originalAdvance:advance===originals606.advance,originalDraw:draw===originals606.draw,quality,source:__source614.stats(),cache:cache614?.stats()}),
    dispose:()=>{
      for(const [target,type,listener]of listeners616)target.removeEventListener(type,listener);listeners616.length=0;
      snapshotStyle616?.remove();snapshotStyle616=null;for(const a of pausedAnimations616)try{a.play();}catch{}pausedAnimations616=[];
      lastCandidateArgs616=null;copies616={};renders616={};activeRender616=null;installed616=false;
      return __retained614.dispose();
    }
  };
