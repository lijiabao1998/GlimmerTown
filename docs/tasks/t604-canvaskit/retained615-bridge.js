  const originalLayer615=lotNightLayer574;
  let saved615=null,cache615=null,mode615='original',baseline615=null,slots615={original:{canvas:null,context:null},candidate:{canvas:null,context:null}},layerPixels615={};
  const actor615=()=>JSON.stringify({cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,confetti,fxParts});
  const model615=()=>JSON.stringify({day,money,pop,tiles});
  const visual615=()=>({visT,trafClock,waterT,waterF,rainbowT,flashT,shakeT,meteorTrail,meteorTime:meteorTrail?.t,windX441,windReport:window.__t441Wind,hasWindReport:Object.hasOwn(window,'__t441Wind')});
  const restoreVisual615=s=>{({visT,trafClock,waterT,waterF,rainbowT,flashT,shakeT,meteorTrail,windX441}=s);if(meteorTrail)meteorTrail.t=s.meteorTime;if(s.hasWindReport)window.__t441Wind=s.windReport;else delete window.__t441Wind;};
  const withSlot615=(key,fn,args)=>{const oldCanvas=lotNightCanvas574,oldCtx=lotNightCtx574;lotNightCanvas574=slots615[key].canvas;lotNightCtx574=slots615[key].context;try{return fn(...args);}finally{slots615[key]={canvas:lotNightCanvas574,context:lotNightCtx574};lotNightCanvas574=oldCanvas;lotNightCtx574=oldCtx;}};
  const dispatcher615=(...args)=>withSlot615(mode615==='candidate'?'candidate':'original',mode615==='candidate'?cache615.layer:originalLayer615,args);
  const delta615=(a,b)=>{if(a.length!==b.length)throw Error('Layer RGBA size mismatch');let pixels=0,maxChannelDelta=0;for(let i=0;i<a.length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(a[i+j]-b[i+j]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}if(changed)pixels++;}return {pixels,maxChannelDelta};};
  const copyPixels615=c=>{if(!c)return null;const s=document.createElement('canvas');s.width=c.width;s.height=c.height;const g=s.getContext('2d');g.drawImage(c,0,0);const d=g.getImageData(0,0,s.width,s.height).data;s.width=s.height=0;return d;};
  window.__retained615={
    synthetic:async()=>{
      const results=[],make=()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.fillStyle='rgba(255,70,30,.55)';g.fillRect(0,0,32,32);g.fillStyle='rgba(40,190,250,.35)';g.fillRect(5,4,21,19);return c;},sprite=make(),mask=make();
      const slots={base:{canvas:null,context:null},candidate:{canvas:null,context:null}};
      const invoke=(key,fn,args)=>{const c=lotNightCanvas574,g=lotNightCtx574;lotNightCanvas574=slots[key].canvas;lotNightCtx574=slots[key].context;try{return fn(...args);}finally{slots[key]={canvas:lotNightCanvas574,context:lotNightCtx574};lotNightCanvas574=c;lotNightCtx574=g;}};
      const makeCache=version=>TownRetained615.create({original:originalLayer615,getSurface:()=>({canvas:lotNightCanvas574,context:lotNightCtx574,privateClip:true}),sourceVersion:version,Path2D,tileSize:128});
      let cache=makeCache(x=>__source615.version(x));
      let lights=[{img:sprite,x:10.25,y:10.5,w:32.5,h:31.5},{occlude574:mask,x:20,y:20,w:16,h:16,a:.5},{rect:[270,10,32,16],col:'#ffe9a0'},{rect:[270,150,32,16],col:'#ff7777'}];
      // Failure-only diagnostics. Preserve bytes before raw readback or repair;
      // never turn a pixel failure into a new renderer/invalidation experiment.
      const detailedDelta=(original,candidate,width,includeSamples=false)=>{
        const delta=delta615(original,candidate),samples=[];
        let x0=Infinity,y0=Infinity,x1=-1,y1=-1;
        const alpha={different:0,rgbOnly:0,alphaOnly:0,rgbAndAlpha:0,maxDelta:0,original:{zero:0,one:0,partial:0,opaque:0},candidate:{zero:0,one:0,partial:0,opaque:0}};
        const bin=(counts,value)=>counts[value===0?'zero':value===1?'one':value===255?'opaque':'partial']++;
        for(let i=0;i<original.length;i+=4){
          const rgb=original[i]!==candidate[i]||original[i+1]!==candidate[i+1]||original[i+2]!==candidate[i+2],ad=original[i+3]!==candidate[i+3];
          if(!rgb&&!ad)continue;
          const pixel=i/4,x=pixel%width,y=Math.floor(pixel/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
          if(includeSamples&&samples.length<32)samples.push({x,y,original:Array.from(original.subarray(i,i+4)),candidate:Array.from(candidate.subarray(i,i+4))});
          if(ad)alpha.different++;alpha[rgb&&ad?'rgbAndAlpha':rgb?'rgbOnly':'alphaOnly']++;alpha.maxDelta=Math.max(alpha.maxDelta,Math.abs(original[i+3]-candidate[i+3]));bin(alpha.original,original[i+3]);bin(alpha.candidate,candidate[i+3]);
        }
        return {...delta,bbox:delta.pixels?{x0,y0,x1,y1}:null,samples,sampleLimit:includeSamples?32:0,alpha};
      };
      const snapshotPng=(bytes,width,height)=>{const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d'),im=g.createImageData(width,height);im.data.set(bytes);g.putImageData(im,0,0);try{return c.toDataURL('image/png');}finally{c.width=c.height=0;}};
      const stateKeys=['fillStyle','strokeStyle','globalAlpha','globalCompositeOperation','imageSmoothingEnabled','imageSmoothingQuality','filter','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset','font','textAlign','textBaseline','direction'];
      const sameStates=()=>stateKeys.every(k=>slots.base.context[k]===slots.candidate.context[k])&&JSON.stringify(slots.base.context.getLineDash())===JSON.stringify(slots.candidate.context.getLineDash())&&['a','b','c','d','e','f'].every(k=>slots.base.context.getTransform()[k]===slots.candidate.context.getTransform()[k]);
      const failSynthetic=(label,a,expectDifference,base,candidate,originalBytes,candidateBytes,stateSame,originalControlsApplicable=true)=>{
        const failure={label,expectDifference,stateSame,stateDifferences:base&&candidate?stateKeys.filter(k=>slots.base.context[k]!==slots.candidate.context[k]).map(k=>({property:k,original:slots.base.context[k],candidate:slots.candidate.context[k]})):[],stats:cache.stats().last,dimensions:base?{width:base.width,height:base.height}:null,layerPresence:{original:!!base,candidate:!!candidate},delta:base&&candidate?detailedDelta(originalBytes,candidateBytes,base.width,true):null,readback:null,controls:null},snapshots={};
        const capture=(name,bytes,width,height)=>{try{snapshots[name]=snapshotPng(bytes,width,height);}catch(error){(failure.snapshotErrors||=[]).push({name,error:String(error)});}};
        if(base&&candidate){
          const width=base.width,height=base.height;
          // These PNGs are made from preserved scratch-copy bytes, not a live
          // canvas that the subsequent readback/restore can mutate.
          capture('original-copy',originalBytes,width,height);capture('candidate-copy',candidateBytes,width,height);
          let originalRaw,candidateRaw;
          try{
            originalRaw=slots.base.context.getImageData(0,0,width,height).data;
            candidateRaw=slots.candidate.context.getImageData(0,0,width,height).data;
            failure.readback={rawDelta:detailedDelta(originalRaw,candidateRaw,width),originalCopyDelta:detailedDelta(originalRaw,originalBytes,width),candidateCopyDelta:detailedDelta(candidateRaw,candidateBytes,width)};
            capture('original-raw',originalRaw,width,height);capture('candidate-raw',candidateRaw,width,height);
          }catch(error){failure.readback={error:String(error)};}
          if(originalControlsApplicable){
            // Both controls use the unchanged original on the SAME two output
            // surfaces. They happen only after every failure snapshot is safe.
            try{
              const originalAgain=invoke('base',originalLayer615,[lights,a,width,height]),restored=invoke('candidate',originalLayer615,[lights,a,width,height]);
              const originalAgainBytes=copyPixels615(originalAgain),restoredBytes=copyPixels615(restored);
              failure.controls={afterRawCheckpoint:true,originalRepeatDelta:detailedDelta(originalBytes,originalAgainBytes,width),restoredDelta:detailedDelta(originalBytes,restoredBytes,width),betweenControlsDelta:detailedDelta(originalAgainBytes,restoredBytes,width),stateSame:sameStates()};
              if(originalRaw&&candidateRaw){
                const originalAgainRaw=slots.base.context.getImageData(0,0,width,height).data,restoredRaw=slots.candidate.context.getImageData(0,0,width,height).data;
                failure.controls.originalRawRepeatDelta=detailedDelta(originalRaw,originalAgainRaw,width);
                failure.controls.restoredRawDelta=detailedDelta(originalRaw,restoredRaw,width);
                failure.controls.betweenRawControlsDelta=detailedDelta(originalAgainRaw,restoredRaw,width);
              }
            }catch(error){failure.controls={...failure.controls,error:String(error)};}
          }else failure.controls={applicable:false,reason:'This assertion includes an external current-path fill, not an original-layer-only frame.'};
        }
        failure.restoredStateDifferences=base&&candidate?stateKeys.filter(k=>slots.base.context[k]!==slots.candidate.context[k]).map(k=>({property:k,original:slots.base.context[k],candidate:slots.candidate.context[k]})):[];const error=new Error('Synthetic retained contract failed '+label);failure.pngs=snapshots;failure.pngNote='Visualizations reconstructed from preserved RGBA arrays; putImageData/PNG encoding can premultiply or quantize. Exact coordinate arrays and numerical deltas are the evidence.';error.retainedEvidence={passed:false,failure,results,copyCalibration:{status:'not-run',reason:'Stopped at first synthetic failure before the byte/alpha matrix.'},source:__source615.stats()};throw error;
      };
      const compare=(label,a=.7,expectDifference=false)=>{
        const base=invoke('base',originalLayer615,[lights,a,384,256]),candidate=invoke('candidate',cache.layer,[lights,a,384,256]);
        if(!!base!==!!candidate)failSynthetic(label,a,expectDifference,base,candidate,null,null,false);
        const originalBytes=base?copyPixels615(base):null,candidateBytes=candidate?copyPixels615(candidate):null;
        const delta=base?delta615(originalBytes,candidateBytes):{pixels:0,maxChannelDelta:0},stateSame=!base||sameStates();
        if(!stateSame||(!expectDifference&&delta.pixels)||(expectDifference&&!delta.pixels))failSynthetic(label,a,expectDifference,base,candidate,originalBytes,candidateBytes,stateSame);
        results.push({label,delta,stateSame,stats:cache.stats().last});
      };
      try{compare('first');compare('same');for(const slot of Object.values(slots)){slot.context.beginPath();slot.context.rect(342,226,11,13);}lights[2].rect[0]=274;compare('retains-current-path');if(cache.stats().last.mode!=='partial')throw Error('Current-path probe did not exercise partial clipping');for(const slot of Object.values(slots)){slot.context.fillStyle='#ff33aa';slot.context.fill();}const pathOriginalBytes=copyPixels615(slots.base.canvas),pathCandidateBytes=copyPixels615(slots.candidate.canvas),pathDelta=delta615(pathOriginalBytes,pathCandidateBytes);if(pathDelta.pixels)failSynthetic('current-path-fill',.7,false,slots.base.canvas,slots.candidate.canvas,pathOriginalBytes,pathCandidateBytes,sameStates(),false);results.push({label:'current-path-fill',delta:pathDelta});compare('reseed-after-external-path-fill');lights[0].x=150;lights[2].rect[0]=280;compare('adjacent-dirty');if(cache.stats().last.mode!=='partial')throw Error('Adjacent probe did not exercise partial clipping');lights[0].x=10.25;lights[3].rect[1]=154;compare('disjoint-dirty');lights[2].rect[0]=276;compare('one-region');lights[0].x=127.5;compare('cross-tile');[lights[0],lights[1]]=[lights[1],lights[0]];compare('order-swap');sprite.getContext('2d').fillRect(0,0,7,7);compare('source-write');const boundPaint=sprite.getContext('2d').fillRect.bind(sprite.getContext('2d'));boundPaint(12,12,4,4);compare('bound-source-write');slots.candidate.canvas.width=slots.candidate.canvas.width;compare('same-output-width-reset');sprite.width=sprite.width;compare('same-width-reset');sprite.setAttribute('height',String(sprite.height));compare('same-height-attribute-reset');lights[1].img=make();compare('source-replacement');lights.pop();compare('removed-region');compare('alpha-change',.35);compare('zero-alpha',0);
        lights=[{img:make(),x:10.25,y:20.5,w:350.5,h:180.5},{occlude574:mask,x:20,y:30,w:16,h:16,a:.5},{occlude574:mask,x:300,y:160,w:16,h:16,a:.5},...Array.from({length:6},(_,i)=>({rect:[150,140+i*12,16,12],col:'#44aabb'}))];
        compare('large-fractional-source-seed');compare('large-fractional-source-hit');if(cache.stats().last.mode!=='hit')throw Error('Large source case failed to establish retained hit');
        lights[1].x=24;lights[2].x=304;compare('large-source-across-disjoint-clips');if(cache.stats().last.mode!=='partial'||cache.stats().last.rectangles!==2||cache.stats().last.executedPaints!==4||cache.stats().last.duplicatePaints!==1)throw Error('Disjoint source case did not execute two clips and duplicated image');
        lights[1].x=127.5;lights[2].y=164;compare('fractional-occluder-crosses-tile-edge');if(cache.stats().last.mode!=='partial'||cache.stats().last.rectangles!==2)throw Error('Cross-edge case did not execute two disjoint clips');
        lights=lights.filter(x=>!x.occlude574);compare('no-occluder');
        lights=[{img:sprite,x:10,y:10,w:32,h:32},{occlude574:mask,x:20,y:20,w:16,h:16,a:.5}];compare('return-from-no-layer');const bitmap=await createImageBitmap(sprite),prior=lights[0].img;lights[0].img=bitmap;compare('unknown-imagebitmap-original-fallback');lights[0].img=prior;bitmap.close();compare('return-from-unsupported-source');slots.candidate.canvas.dispatchEvent(new Event('contextlost'));compare('simulated-contextlost-fallback');slots.candidate.canvas.dispatchEvent(new Event('contextrestored'));compare('simulated-contextrestored-rebuild');
        const src=sprite.getContext('2d');src.fillStyle='#ffaa00';src.fillRect(0,0,32,32);cache.dispose();slots.base={canvas:null,context:null};slots.candidate={canvas:null,context:null};cache=makeCache(x=>{const v=__source615.version(x);return x===sprite?{...v,revision:0}:v;});compare('negative-control-initialize');compare('negative-control-seed');compare('negative-control-hit');if(cache.stats().last.mode!=='hit')throw Error('Negative control failed to establish retained hit');src.fillStyle='#00aaff';src.fillRect(0,0,32,32);compare('omitted-invalidation-detected',.7,true);
      }catch(error){if(error.retainedEvidence)return error.retainedEvidence;throw error;}finally{cache.dispose();}
      const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),im=g.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;im.data[i]=x;im.data[i+1]=255-x;im.data[i+2]=(x*17)%256;im.data[i+3]=y;}g.putImageData(im,0,0);const copied=copyPixels615(c),raw=g.getImageData(0,0,256,256).data,copyDelta=delta615(raw,copied);if(copyDelta.pixels){const failure={label:'scratch-copy-oracle',delta:detailedDelta(raw,copied,256,true),measurementLimit:true},snapshots={'copy-oracle-original':snapshotPng(raw,256,256),'copy-oracle-candidate':snapshotPng(copied,256,256)};failure.pngs=snapshots;failure.pngNote='Visualizations reconstructed from preserved RGBA arrays; putImageData/PNG encoding can premultiply or quantize. Exact coordinate arrays and numerical deltas are the evidence.';c.width=c.height=0;return {passed:false,results,copyDelta,copyCalibration:{status:'failed'},failure,source:__source615.stats()};}c.width=c.height=0;
      return {passed:true,results,copyDelta,copyCalibration:{status:'passed'},source:__source615.stats()};
    },
    install:()=>{if(saved615)throw Error('Already installed');saved615={running,visual:visual615(),canvas:lotNightCanvas574,context:lotNightCtx574};running=false;slots615.original={canvas:lotNightCanvas574,context:lotNightCtx574};cache615=TownRetained615.create({original:originalLayer615,getSurface:()=>({canvas:lotNightCanvas574,context:lotNightCtx574,privateClip:true}),sourceVersion:s=>__source615.version(s),Path2D,tileSize:128});lotNightLayer574=dispatcher615;return true;},
    beginView:()=>{cache615.invalidate();layerPixels615={};baseline615=visual615();return true;},
    step:dt=>{if(running)throw Error('Correctness sequence must be paused');advance(dt);baseline615=visual615();return {visT,actors:actor615().length};},
    render:mode=>{if(!saved615||running||!['original','candidate','restored'].includes(mode))throw Error('Invalid retained proof mode');mode615=mode;restoreVisual615(baseline615);const m=model615(),actors=actor615(),oldR=R;let rng=0;R=()=>{rng++;return oldR();};try{draw(0);if(rng||m!==model615()||actors!==actor615())throw Error('Retained draw changed model/actors/RNG');return {mode,rng,stats:mode==='candidate'?cache615.stats():null,source:__source615.stats()};}finally{R=oldR;}},
    layerPixels:mode=>{const slot=slots615[mode==='candidate'?'candidate':'original'],p=copyPixels615(slot.canvas);if(!p)return {noLayer:true};if(mode==='original'){layerPixels615.original=p;return {bytes:p.length};}const d=delta615(layerPixels615.original,p);if(mode==='candidate')layerPixels615.candidate=p;return d;},
    rawCheckpoint:()=>{const a=slots615.original,b=slots615.candidate;if(!a.canvas||!b.canvas)return {noLayer:true};const pa=a.context.getImageData(0,0,a.canvas.width,a.canvas.height).data,pb=b.context.getImageData(0,0,b.canvas.width,b.canvas.height).data;return {rawDelta:delta615(pa,pb),originalCopyDelta:delta615(pa,layerPixels615.original),candidateCopyDelta:delta615(pb,layerPixels615.candidate)};},
    stats:()=>cache615.stats(),
    invalidate:()=>{cache615.invalidate();return true;},
    dispose:()=>{lotNightLayer574=originalLayer615;cache615?.dispose();if(saved615){running=saved615.running;restoreVisual615(saved615.visual);lotNightCanvas574=saved615.canvas;lotNightCtx574=saved615.context;saved615=null;}slots615={original:{canvas:null,context:null},candidate:{canvas:null,context:null}};layerPixels615={};return {originalLayer:lotNightLayer574===originalLayer615};}
  };
