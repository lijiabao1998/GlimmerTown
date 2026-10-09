function bridge603(){
  // Test setup and read-only inspectors only. No assignments to frame/advance/draw,
  // no RNG wrapper, no Canvas hooks, no production-clock override.
  const originals606={frame,advance,draw,updHud,lotNightLayer574,lotObjectOrder574};
  const canonical606=raw=>{const d=saveInflate(JSON.parse(raw)),out={};for(const k of ['v','n','seed','money','day','df','bl','lots574','ter','tre','rd','zn','gvc'])out[k]=d[k];return JSON.stringify(out);};
  const status606=()=>{const light=daylight(),phase=(visT%CYCLE+CYCLE)%CYCLE;return {unwrapped:frame===originals606.frame&&advance===originals606.advance&&draw===originals606.draw&&updHud===originals606.updHud&&lotNightLayer574===originals606.lotNightLayer574&&lotObjectOrder574===originals606.lotObjectOrder574,native:typeof window.__townRenderer604==='undefined',running,speed,quality,width:W,height:H,dpr:DPR,cam:{...cam},rot:viewRotEff(),season:season(),weather,visible:document.visibilityState,focused:document.hasFocus(),visT,trafClock,waterT,waterF,day,light,nightRemaining:light.b===.34?(phase<CYCLE*.25?CYCLE*.25-phase:CYCLE*1.25-phase):0};};
  window.__s603={
    flags:()=>({T603:t603On(),T596:t596On(),T600:t596On()&&!t600Off()}),
    view:()=>({cam:{...cam},speed,running,day,rot:viewRotEff(),season:season(),visible:document.visibilityState}),
    scene:()=>JSON.stringify({day,money,pop,tiles}),
    saved:()=>canonical606(localStorage.getItem(slotKey(3))),sourceSaved:canonical606,
    roots:()=>{const rows=[];let bad=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(!b||b.ref)continue;rows.push([idx(x,y),b.k,b.lv,b.v,b.sz||1,!!b.lot574]);if(b.sz>=2)for(let yy=0;yy<b.sz;yy++)for(let xx=0;xx<b.sz;xx++){if(!xx&&!yy)continue;const q=inMap(x+xx,y+yy)&&T(idx(x+xx,y+yy)).bld;if(!q||!q.ref||q.ref[0]!==x||q.ref[1]!==y)bad++;}}return {rows,bad};},
    census:k=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=T(idx(x,y)).bld;if(b&&!b.ref&&b.k===k)out.push([x,y,b.sz||1]);}return out;},
    grow22:()=>{GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let step=0;step<420;step++)GV.step(1);GV.ai(false);GV.setSpeed(0);updHud();return GV.stats();},
    status606,
    observe606:ms=>new Promise((resolve,reject)=>{const start=performance.now(),before=status606(),intervals=[];let last,validFrames=true;const timeout=setTimeout(()=>reject(Error('Native rAF observation stalled')),ms+15000);function sample(t){validFrames=validFrames&&document.visibilityState==='visible'&&document.hasFocus()&&running;if(last!==undefined)intervals.push(t-last);last=t;if(t-start>=ms){clearTimeout(timeout);resolve({elapsed:t-start,frames:intervals.length,intervals,before,after:status606(),validFrames});}else requestAnimationFrame(sample);}requestAnimationFrame(sample);})
  };
}
