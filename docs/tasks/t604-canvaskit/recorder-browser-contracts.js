(()=>{
  const rows=[];
  const cases={
    'gradient creation and paint transforms':g=>{g.fillStyle='#203141';g.fillRect(0,0,64,64);g.translate(7.3,5.7);const p=g.createRadialGradient(8,8,0,12,10,20);p.addColorStop(0,'rgba(255,129,80,.26)');p.addColorStop(1,'rgba(0,100,255,0)');g.resetTransform();g.transform(1.7,.15,-.3,.8,4,6);g.fillStyle=p;g.fillRect(-5,-5,50,50);},
    'path construction transform and clip':g=>{g.fillStyle='#345';g.fillRect(0,0,64,64);g.save();g.translate(3.2,7.1);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(44,0,39,43);g.resetTransform();g.lineTo(0,61);g.closePath();g.clip();g.scale(1.2,.8);g.fillStyle='#abcdef';g.fillRect(0,0,60,60);g.restore();g.strokeStyle='#f80';g.lineWidth=2.5;g.stroke();},
    'compositing alpha and native text fallback':g=>{g.fillStyle='#163749';g.fillRect(0,0,64,64);g.globalAlpha=.37;g.globalCompositeOperation='multiply';g.fillStyle='#b48f42';g.fillRect(7,7,44,40);g.globalCompositeOperation='lighter';g.fillStyle='#a35588';g.fillRect(20,10,32,37);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.font='13px sans-serif';g.fillStyle='#fff';g.fillText('Test',4,58);},
    'source canvas mutation snapshots':g=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='#f00';x.fillRect(0,0,16,16);g.drawImage(c,0,0,32,32);x.fillStyle='#0f0';x.fillRect(0,0,16,16);g.drawImage(c,32,0,32,32);c.width=16;x.fillStyle='#00f';x.fillRect(0,0,16,16);g.drawImage(c,16,32,32,32);},
    'main canvas self-image forces faithful fallback':g=>{g.fillStyle='#f84';g.fillRect(0,0,25,25);g.drawImage(g.canvas,0,0,25,25,30,30,25,25);}
  };
  for(const [name,draw]of Object.entries(cases)){
    const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=64;a.height=b.height=64;
    const ag=a.getContext('2d'),bg=b.getContext('2d'),r=new TownRecorder604.Recorder(b,bg);draw(ag);r.begin();draw(r.context);const p=r.end();r.replayNative(p);
    const x=ag.getImageData(0,0,64,64).data,y=bg.getImageData(0,0,64,64).data;let changedPixels=0,max=0;
    for(let i=0;i<x.length;i+=4){let changed=false;for(let k=0;k<4;k++){max=Math.max(max,Math.abs(x[i+k]-y[i+k]));changed||=x[i+k]!==y[i+k];}changedPixels+=changed?1:0;}
    rows.push({name,changedPixels,max,faults:p.faults,imageSnapshots:p.imageSnapshots});
  }
  return rows;
})()
