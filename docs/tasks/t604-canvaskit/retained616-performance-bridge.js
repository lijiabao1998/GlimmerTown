  // T616 live-only bridge. No wrappers or assignments to frame/advance/draw or clocks.
  const originals616={frame,advance,draw,updHud,lotObjectOrder574,layer:lotNightLayer574};
  let cache616=null,installed616=false,mode616='original',observing616=false;
  const observer616=()=>window.__source616||window.__source614||null;
  const intact616=()=>frame===originals616.frame&&advance===originals616.advance&&draw===originals616.draw&&updHud===originals616.updHud&&lotObjectOrder574===originals616.lotObjectOrder574;
  const status616=()=>{
    const light=daylight(),phase=(visT%CYCLE+CYCLE)%CYCLE,o=observer616();
    return {unwrapped:intact616(),layerExpected:lotNightLayer574===(mode616==='candidate'?cache616?.layer:originals616.layer),native:typeof window.__townRenderer604==='undefined',
      installed:installed616,mode:mode616,observerInstalled:!!o?.stats().installed,observerPresent:!!o,
      running,speed,quality,width:W,height:H,dpr:DPR,cam:{...cam},rot:viewRotEff(),season:season(),weather,day,
      visible:document.visibilityState,focused:document.hasFocus(),visT,trafClock,waterT,waterF,light,cycle:CYCLE,
      frameTimestamp:lastT,nightRemaining:light.b===.34?(phase<=CYCLE*.25?CYCLE*.25-phase:CYCLE*1.25-phase):0};
  };
  const select616=mode=>{
    if(!installed616||!['original','candidate'].includes(mode))throw Error('Invalid T616 live mode');
    if(mode==='candidate'&&!cache616)throw Error('Candidate requires preboot observer');
    if(mode!==mode616)cache616?.invalidate();
    mode616=mode;lotNightLayer574=mode==='candidate'?cache616.layer:originals616.layer;
  };
  window.__retained616Perf={
    install:({observerFree=false}={})=>{
      if(installed616||!intact616()||lotNightLayer574!==originals616.layer||!running||speed!==0)throw Error('T616 needs an untouched running native game at simulation speed zero');
      const o=observer616();
      if(observerFree?!!o:!o?.stats().installed)throw Error('T616 observer installation does not match fresh-page arm');
      if(o)cache616=TownRetained614.create({original:originals616.layer,getSurface:()=>({canvas:lotNightCanvas574,context:lotNightCtx574,privateClip:true}),sourceVersion:s=>o.version(s),Path2D,tileSize:128});
      installed616=true;select616('original');return status616();
    },
    mode:mode=>{if(observing616)throw Error('Mode change inside observation');select616(mode);return status616();},
    status:status616,
    counters:()=>({cache:cache616?.stats()||null,source:observer616()?.stats()||null}),
    observe:(ms,nextMode)=>new Promise((resolve,reject)=>{
      if(!installed616||observing616||!Number.isFinite(ms)||ms<250||ms>30000){reject(Error('Invalid T616 observation'));return;}
      observing616=true;const requestedAt=performance.now(),intervals=[];let first,last,before,countersBefore,raf=0,finished=false,validFrames=true,gameFramesMatched=true;
      const finish=error=>{if(finished)return;finished=true;observing616=false;clearTimeout(timer);cancelAnimationFrame(raf);if(error){reject(error);return;}
        resolve({requestedMs:ms,requestElapsed:performance.now()-requestedAt,elapsed:last-first,frames:intervals.length,intervals,before,after:status616(),validFrames,gameFramesMatched,
          countersBefore,countersAfter:window.__retained616Perf.counters()});};
      const timer=setTimeout(()=>finish(Error('T616 live observation stalled')),ms+15000);
      const sample=t=>{try{
        validFrames=validFrames&&document.visibilityState==='visible'&&document.hasFocus()&&running&&speed===0&&intact616();
        // The game's original rAF is registered earlier and renders once per callback.
        // A timer fallback or missing game callback invalidates this observation.
        gameFramesMatched=gameFramesMatched&&Math.abs(lastT-t)<.001;
        if(first===undefined){if(nextMode!==undefined)select616(nextMode);first=last=t;before=status616();countersBefore=window.__retained616Perf.counters();}
        else{intervals.push(t-last);last=t;}
        if(t-first>=ms)finish();else raf=requestAnimationFrame(sample);
      }catch(error){finish(error);}};
      raf=requestAnimationFrame(sample);
    }),
    dispose:()=>{if(observing616)throw Error('Cannot dispose active T616 observation');lotNightLayer574=originals616.layer;cache616?.dispose();cache616=null;installed616=false;mode616='original';return {originalLayer:lotNightLayer574===originals616.layer,unwrapped:intact616()};}
  };
