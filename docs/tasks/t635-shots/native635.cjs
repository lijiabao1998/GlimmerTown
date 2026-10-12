// T635 已批准原生預覽與真實行為fixture。只注入隔離測試頁，不進執行期七檔package。
'use strict';
function visualBridge635(){
  window.__fireQA635={
    freeze:()=>{running=false;GV.setSpeed(0);GV.ai(false);},
    scene:(legacy=false)=>{
      $('#bNewGame').click();GV.setMapSize(72);GV.setDiff(3);GV.newWorldSeeded(635);GV.setSpeed(0);GV.ai(false);running=false;
      for(let y=5;y<67;y++)for(let x=5;x<67;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=(x+y)%4;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}
      const put=(k,n,x,y,v=0,lot=true)=>{for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)T(idx(x+dx,y+dy)).bld=(dx||dy)?{k,ref:[x,y]}:{k,lv:1,v,age:60,pw:true,wa:true,h:.8,...(n>1?{sz:n}:{}),...(lot?{lot574:1}:{})};};
      for(let x=18;x<=50;x++){GV.place('road',x,33);GV.place('road',x,38);}
      for(let y=23;y<=40;y++){GV.place('road',21,y);GV.place('road',48,y);}
      const locs=legacy?[[6,1,24,32],[30,1,31,32],[61,3,40,30]]:[[6,2,24,31],[30,3,31,30],[61,4,40,29]];
      for(const [k,n,x,y]of locs)put(k,n,x,y,0,!legacy);
      for(let x=23;x<=46;x+=2){put(1,1,x,34,(x/2|0)%12,false);put(2,1,x,37,(x/2|0)%12,false);}
      for(const [x,y]of[[23,29],[28,29],[36,29],[46,27]]){GV.place('park',x,y);const b=T(idx(x,y)).bld;if(b)b.age=60;}
      for(const [x,y]of[[27,25],[37,26],[46,23],[24,40]])T(idx(x,y)).tree=1;
      for(let y=5;y<67;y++)for(let x=5;x<67;x++)recalcMask(x,y);
      for(const t of tiles)if(t.bld&&!t.bld.ref){t.bld.pw=true;t.bld.wa=true;} // 已完工、通電美術布局台架；功能另用真放置／供電管線驗。
      GV.setDay(10);GV.setRot(0);GV.setZoom(1.4);GV.lookAt(34,32);$('#start').style.display='none';weather=0;rainDays=0;rainbowT=0;groundDirty=true;for(const a of[fxParts,confetti,cars,smokes])a.length=0;
      return locs.map(([k,n,x,y])=>({k,n,x,y}));
    },
    draw:(night=false,sea=0,snow=false,rot=0,z=1.4)=>{GV.setSeason(sea);rainDays=snow?SNOW_ACC_DAYS:0;weather=0;GV.setVisT(night?5:55);trafClock=12;waterF=0;waterT=0;rainbowT=0;flashT=0;shakeT=0;GV.setRot(rot);GV.setZoom(z);GV.lookAt(34,32);groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';GV.forceDraw();return cvs.toDataURL();},
    pins:()=>{
      const tab=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;tab[n]=c;}
      const hash=c=>{let r=0xffffffff;for(const b of c.getContext('2d').getImageData(0,0,c.width,c.height).data)r=tab[(r^b)&255]^(r>>>8);return((r^0xffffffff)>>>0).toString(16);};
      return Object.fromEntries(GV.sprAtlas356().entries.map(e=>[e.fam+'/'+e.key,[hash(e.img),...(e.night?[hash(e.night)]:[]),...(e.nightCity?[hash(e.nightCity)]:[])]]));
    },
    sheet:(winter=false,night=false)=>{
      const ks=[6,30,61],c=document.createElement('canvas');c.width=1560;c.height=850;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle=night?'#182d3a':'#e5e8e0';g.fillRect(0,0,c.width,c.height);g.fillStyle=night?'#ecede4':'#314b54';g.font='bold 25px sans-serif';g.fillText('TOWN / THREE FIRE DESIGNS / '+(winter?'SNOW':night?'NIGHT':'DAY')+' / OPT-IN CANDIDATE',24,35);
      const records=[];for(let j=0;j<2;j++)for(let i=0;i<3;i++){const k=ks[i],n=j?([1,1,3][i]):([2,3,4][i]),s=bakeFire635(k,n,winter),x=i*520,y=62+j*390,q=Math.min(3,480/s.w,320/s.h);g.fillStyle=night?'#233e49':'#f6f4ec';g.fillRect(x+8,y+5,504,374);g.save();if(night)g.globalAlpha=.46;g.drawImage(s.img,x+260-s.ax*q,y+344-s.ay*q,s.w*q,s.h*q);g.restore();if(night){g.save();g.globalCompositeOperation='screen';g.drawImage(s.night,x+260-s.ax*q,y+344-s.ay*q,s.w*q,s.h*q);g.restore();}g.fillStyle=night?'#e6e9df':'#34535b';g.font='17px sans-serif';g.fillText(['VILLAGE / TIMBER DOORS','TOWN / THREE STONE ARCHES','REGIONAL / HALL + OFFICE'][i],x+25,y+30);g.fillText((j?'OLD SAVE ':'CURRENT ')+n+'x'+n+' / k'+k,x+25,y+365);const a=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data,b=s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;let orphan=0,light=0,clipped=0,opaqueWarm=0;for(let py=0;py<s.h;py++)for(let px=0;px<s.w;px++){const p=(py*s.w+px)*4;if(b[p+3]){light++;if(!a[p+3])orphan++;if([[170,101,80],[185,117,86],[238,234,224]].some(c=>c.every((v,j)=>v===a[p+j]))&&b[p]>150&&b[p+1]>145&&b[p+2]>100)opaqueWarm++;}if(a[p+3]&&(px===0||px===s.w-1||py===0||py>=s.ay+1))clipped++;}records.push({k,n,w:s.w,h:s.h,ax:s.ax,ay:s.ay,orphan,light,clipped,opaqueWarm});}
      return{png:c.toDataURL(),records};
    }
  };
}
function behaviorBridge635(){
  const state=()=>({day,money,pop,jobs,tiles:JSON.parse(JSON.stringify(tiles)),fleet:{...svcFleet},trucks:GV.svcTrucks(),fin:JSON.parse(JSON.stringify(fin)),coverage:[26,35,44].map(x=>['fire','fire2','fireHQ'].map(k=>GV.cov(k,x,31)))});
  window.__behavior635={
    setup:(legacy=false)=>{
      $('#bNewGame').click();GV.setMapSize(72);GV.setDiff(1);GV.newWorldSeeded(635);GV.ai(false);GV.setSpeed(0);running=false;disastersOn=false;GV.addMoney(200000);
      for(let y=16;y<43;y++)for(let x=17;x<55;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.el=0;t.zone=0;t.bld=null;t.road=0;t.rc=0;t.mask=0;t.rail=0;t.tram=0;t.wp=0;}
      for(let x=19;x<=51;x++){GV.place('road',x,30);GV.place('wpipe',x,30);}for(let y=20;y<=38;y++){GV.place('road',21,y);GV.place('wpipe',21,y);}
      GV.place('plant',22,23);GV.place('water',22,26);
      const placed=[];for(const [tool,k,x,y,n]of[['fire',6,24,28,2],['fireStation2',30,31,27,3],['fireHQ',61,40,26,4]]){
        const m0=money,cost=placeCost(tool,x,y),legal=canPlace(tool,x,y),ok=GV.place(tool,x,y),b=T(idx(x,y)).bld;
        if(!ok||!b||b.k!==k||b.sz!==n||!b.lot574)throw Error('real new placement failed '+tool);
        placed.push({tool,k,x,y,cost,spent:m0-money,legal,root:JSON.parse(JSON.stringify(b)),refs:tiles.filter(t=>t.bld&&t.bld.ref&&t.bld.ref[0]===x&&t.bld.ref[1]===y).length});
      }
      if(legacy){for(const p of placed){for(let dy=0;dy<p.root.sz;dy++)for(let dx=0;dx<p.root.sz;dx++)T(idx(p.x+dx,p.y+dy)).bld=null;const n=p.k===61?3:1;for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)T(idx(p.x+dx,p.y+dy)).bld=dx||dy?{k:p.k,ref:[p.x,p.y]}:{k:p.k,lv:2,v:1,age:60,pw:true,wa:true,h:.6,...(n>1?{sz:n}:{})};}}
      for(const x of[26,35,44])T(idx(x,31)).bld={k:1,lv:1,v:0,age:40,pw:false,wa:false,h:.6};
      for(let y=16;y<43;y++)for(let x=17;x<55;x++)recalcMask(x,y);computePower();computeWater();rebuildCov();
      const stages=[];for(const d of[0,4,4,1,3]){if(d)GV.step(d);stages.push({day,ages:placed.map(p=>T(idx(p.x,p.y)).bld.age)});}
      const upgrades=[];for(const p of placed){const before=money,want=upCost(p.k,T(idx(p.x,p.y)).bld.lv),level=GV.upgrade(p.x,p.y);upgrades.push({k:p.k,level,cost:want,spent:before-money});}
      const pre=state();GV.save();const raw=localStorage.getItem(slotKey(3)),saved=JSON.parse(raw);if(!GV.load())throw Error('slot3 load failed');running=false;GV.setSpeed(0);GV.ai(false);GV.save();const savedAgain=JSON.parse(localStorage.getItem(slotKey(3)));
      const semantic=d=>{const o={...d};delete o.ts;delete o.timestamp;return o;};
      const roundtrip=JSON.stringify(semantic(saved))===JSON.stringify(semantic(savedAgain));
      const saveFacts={version:saved.v,keys:Object.keys(saved).sort(),exactSemanticRoundtrip:roundtrip,footprints:placed.map(p=>({k:p.k,b:GV.tile(p.x,p.y).bld})),savedBl:saved.bl};
      return{placed,stages,upgrades,saveFacts,pre,after:state()};
    },
    fire:()=>{
      const targets=[26,35,44].filter(x=>T(idx(x,31)).bld);const ignition=targets.map(x=>({x,ok:GV.ignite(x,31)}));const trace=[];
      for(let i=0;i<80;i++){updFireTrucks(.25);if(i%12===0)GV.step(1);if(i%4===0)trace.push({i,fire:targets.map(x=>T(idx(x,31)).bld?.fire||0),trucks:GV.svcTrucks(),samples:GV.svcResponseSample()});}
      return{ignition,trace,after:state(),samples:GV.svcResponseSample()};
    },
    visual:(age=60,hovered=false,wet=false)=>{
      for(const p of[[24,28],[31,27],[40,26]]){const b=T(idx(...p)).bld;if(b){b.age=age;b.pw=true;}}
      hover.x=hovered?31:-1;hover.y=hovered?27:-1;weather=wet?1:0;rainDays=wet?4:0;GV.setSeason(1);GV.setVisT(wet?55:5);trafClock=12;waterT=waterF=rainbowT=shakeT=0;GV.setRot(0);GV.setZoom(1.6);GV.lookAt(35,29);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';groundDirty=true;GV.forceDraw();return cvs.toDataURL();
    },
    reflection:()=>[6,30,61].map(k=>({k,legacySingle:reflectSprite({k,lv:1,v:0},20,20)===null,multigrid:reflectSprite({k,lv:1,v:0,sz:3},20,20)===null})),
    random:()=>{const old=Math.random,oldR=R,oldRand=rand;let draws=0,r=0,s=0;Math.random=()=>{draws++;return .5;};R=(...a)=>{r++;return oldR(...a);};rand=(...a)=>{s++;return oldRand(...a);};try{for(const k of[6,30,61])for(const n of[k===61?3:1,k===6?2:k===30?3:4])for(const snow of[false,true])bakeFire635(k,n,snow);}finally{Math.random=old;R=oldR;rand=oldRand;}return{browser:draws,world:{R:r,rand:s}};}
  };
}
module.exports={visualBridge635,behaviorBridge635};
