  const originalCanvas611=cvs,originalContext611=ctx;
  let opaqueCanvas611=null,opaqueContext611=null,saved611=null;
  const actors611=()=>JSON.stringify({cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,confetti,fxParts});
  const model611=()=>JSON.stringify({day,money,pop,tiles});
  const select611=opaque=>{
    if(!saved611||running)throw Error('Opaque proof requires paused original animation');
    if(opaque&&!opaqueCanvas611){opaqueCanvas611=originalCanvas611.cloneNode(false);opaqueContext611=opaqueCanvas611.getContext('2d',{alpha:false});if(opaqueContext611.getContextAttributes().alpha!==false)throw Error('Opaque context option unsupported');}
    const next=opaque?opaqueCanvas611:originalCanvas611,nextCtx=opaque?opaqueContext611:originalContext611;
    if(cvs!==next){next.className=cvs.className;next.style.cssText=cvs.style.cssText;cvs.replaceWith(next);cvs=next;ctx=nextCtx;}
    // Both original and candidate get the same normal resize reset.
    resize();return ctx.getContextAttributes();
  };
  window.__opaque611={
    pause:()=>{if(saved611)throw Error('Already paused');saved611={running,visT,trafClock,waterT,waterF,rainbowT,flashT,shakeT,meteorTrail,meteorTime:meteorTrail?.t,windX441,windReport:window.__t441Wind,hasWindReport:Object.hasOwn(window,'__t441Wind')};running=false;return true;},
    frame:(opaque,phase)=>{const attrs=select611(opaque);visT=phase;trafClock=100;waterT=0;waterF=0;rainbowT=saved611.rainbowT;flashT=saved611.flashT;shakeT=saved611.shakeT;meteorTrail=saved611.meteorTrail;if(meteorTrail)meteorTrail.t=saved611.meteorTime;const before=model611(),actors=actors611(),oldR=R;let rng=0;
      R=()=>{rng++;return oldR();};try{draw(0);if(rng||before!==model611()||actors!==actors611())throw Error('Opaque proof changed model/actors/RNG');return {attrs,width:W,height:H,dpr:DPR,rng,visT,phase,opaque};}finally{R=oldR;}
    },
    resizeOnly:opaque=>{const attrs=select611(opaque),r=cvs.getBoundingClientRect();const x=Math.floor(r.left+r.width/2-32),y=Math.floor(r.top+r.height/2-32);for(const [dx,dy]of [[0,0],[63,0],[0,63],[63,63],[32,32]])if(document.elementFromPoint(x+dx,y+dy)!==cvs)throw Error('Lifecycle canvas sample is obscured');return {attrs,clip:{x,y,width:64,height:64,scale:1},background:getComputedStyle(document.body).backgroundColor};},
    pixels:()=>{const d=ctx.getImageData(0,0,W,H).data;let nonOpaque=0;for(let i=3;i<d.length;i+=4)if(d[i]!==255)nonOpaque++;let binary='';for(let i=0;i<d.length;i+=16384)binary+=String.fromCharCode(...d.subarray(i,i+16384));return {width:W,height:H,nonOpaque,base64:btoa(binary)};},
    restore:()=>{if(saved611){select611(false);({running,visT,trafClock,waterT,waterF,rainbowT,flashT,shakeT,meteorTrail,windX441}=saved611);if(meteorTrail)meteorTrail.t=saved611.meteorTime;if(saved611.hasWindReport)window.__t441Wind=saved611.windReport;else delete window.__t441Wind;saved611=null;}opaqueCanvas611?.remove();opaqueCanvas611=null;opaqueContext611=null;return {originalCanvas:cvs===originalCanvas611,originalContext:ctx===originalContext611,attrs:ctx.getContextAttributes()};}
  };
