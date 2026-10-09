  let orderPool608=null,orderMode608='original',verifyCalls608=0,proofSaved608=null;
  const originalOrder608=lotOrder574;
  const verifyOrder608=(items,sparse=false)=>{const a=originalOrder608(items,sparse),b=orderPool608.order(items,sparse);if(a===b||a.length!==b.length||a.cycles574!==b.cycles574||a.some((x,i)=>x!==b[i]))throw Error('Pooled topology changed exact identity/order/cycles');verifyCalls608++;return a;};
  const mode608=mode=>{if(!orderPool608)throw Error('Order pool not installed');if(!['original','pooled','verify'].includes(mode))throw Error('Unknown order mode');orderMode608=mode;lotOrder574=mode==='original'?originalOrder608:mode==='pooled'?orderPool608.order:verifyOrder608;};
  window.__order608={
    install:()=>{if(orderPool608)throw Error('Already installed');orderPool608=TownOrder608.create(originalOrder608,{maxNodes:2048,maxRetainedEdges:262144});return true;},mode:mode608,
    stats:()=>({mode:orderMode608,verifyCalls:verifyCalls608,...orderPool608.stats()}),
    pause:()=>{if(proofSaved608)throw Error('Proof already paused');proofSaved608={running,visT,trafClock,waterT,waterF,rainbowT};running=false;return true;},
    frame:mode=>{if(!proofSaved608||running)throw Error('Proof requires paused original RAF');mode608(mode);visT=100;trafClock=100;waterT=0;waterF=0;rainbowT=proofSaved608.rainbowT;const before=JSON.stringify({day,money,pop,tiles}),actors=JSON.stringify({cars,trains,tramCars,cargoShips,smokes,citizens}),oldR=R;let rng=0;R=()=>{rng++;return oldR();};try{GV.forceDraw();if(rng||before!==JSON.stringify({day,money,pop,tiles})||actors!==JSON.stringify({cars,trains,tramCars,cargoShips,smokes,citizens}))throw Error('Order proof changed model/actors/RNG');return {mode,verifyCalls:verifyCalls608,stats:orderPool608.stats()};}finally{R=oldR;}},
    resume:()=>{mode608('original');if(proofSaved608){({running,visT,trafClock,waterT,waterF,rainbowT}=proofSaved608);proofSaved608=null;}return true;},
    dispose:()=>{lotOrder574=originalOrder608;if(proofSaved608){({running,visT,trafClock,waterT,waterF,rainbowT}=proofSaved608);proofSaved608=null;}orderPool608?.dispose();return true;}
  };
