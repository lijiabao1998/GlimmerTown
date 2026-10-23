/* T707：列車關節化、線尾推拉折返、停站、閉塞。
   從 index.html 取出實際的 updTrains 與 T706／T707 的 helper 原文，在 vm 裡的小網格上重放（Math.random 換成固定種子的 LCG）。
   車廂位置用畫面實際呼叫的 cars707(tr) 取；離軌距離與車廂間距用獨立的幾何算（軌道中心線＝相鄰鐵路格中心的連線）。
   期望值的獨立來源：同一個場景用改前的原文（固定檔）跑一次＝改前行為。只驗車輛移動與每節車廂的位置，不是像素驗收。
   改前基準是同資料夾的固定檔 base-v11.247.js（T706 合併後 index.html 裡相關八個函式的原文，逐字抽出；怎麼產生的見 README.md），不在執行時讀 git 歷史。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../../..');
const HEAD=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const BASE_LABEL='base-v11.247.js';
const BASE=fs.readFileSync(path.join(__dirname,BASE_LABEL),'utf8');
// 關閥比對要連之後各卡的閥一起關（它們可能也改列車），才會等於改前：T707 起每一個 function tNNNOn(){ 的閥
const LATER=[...new Set([...HEAD.matchAll(/\nfunction t(\d+)On\(\)\{/g)].map(m=>+m[1]).filter(n=>n>=707))].map(n=>'__noT'+n);

function fn(src,name){ // 取一個頂層函式原文（大括號配對；這幾個函式沒有字串裡的大括號）
  const a=src.indexOf('\nfunction '+name+'(');if(a<0)return null;
  let d=0,i=src.indexOf('{',a);for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'&&--d===0)break;}
  return src.slice(a+1,i+1);
}
const later=src=>[...new Set([...src.matchAll(/\nfunction ([A-Za-z_]+(\d{3})(?:[A-Za-z_]\w*)?)\(/g)].filter(m=>+m[2]>=706).map(m=>m[1]))];
const laterConsts=src=>[...src.matchAll(/\nconst [A-Z_]+?(\d{3})=[^\n]*/g)].filter(m=>+m[1]>=706).map(m=>m[0].slice(1));
function world(src,{N,build,flags={}}){
  const names=['streetHash','listBldK','railDirs','updTrains','updTrams',...later(src)];
  const code=[...laterConsts(src),...names.map(n=>fn(src,n)).filter(Boolean)].join('\n');
  let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
  const tiles=Array.from({length:N*N},()=>({t:2,rail:0,tram:0,bld:null}));
  const C={N,tiles,trains:[],tramCars:[],DIRV:[[0,-1],[1,0],[0,1],[-1,0]],window:{...flags},location:{search:''},
    Math:Object.assign(Object.create(Math),{random:rnd}),T:i=>tiles[i],idx:(x,y)=>y*N+x,inMap:(x,y)=>x>=0&&y>=0&&x<N&&y<N,
    lotPorts574:()=>null,actualLot574:()=>null};
  C.vri=n=>Math.floor(C.Math.random()*n);
  vm.createContext(C);vm.runInContext(code,C);
  build(C);return C;
}
// 獨立幾何：到鐵路中心線（相鄰鐵路格中心連線）的距離
function railDist(C,fx,fy){
  let best=9;const R=(x,y)=>C.inMap(x,y)&&C.T(C.idx(x,y)).rail;
  for(let y=Math.floor(fy)-1;y<=Math.ceil(fy)+1;y++)for(let x=Math.floor(fx)-1;x<=Math.ceil(fx)+1;x++){
    if(!R(x,y))continue;const segs=[[x,y,x,y]];if(R(x+1,y))segs.push([x,y,x+1,y]);if(R(x,y+1))segs.push([x,y,x,y+1]);
    for(const [a,b,c,d] of segs){const vx=c-a,vy=d-b,L=vx*vx+vy*vy;let t=L?((fx-a)*vx+(fy-b)*vy)/L:0;t=Math.max(0,Math.min(1,t));best=Math.min(best,Math.hypot(fx-(a+vx*t),fy-(b+vy*t)));}
  }
  return best;
}
// 改前畫法的車廂位置（車頭方向往回推 ci*.62）——只在 G0 量改前的離軌距離用
const oldCars=tr=>[0,1,2].map(ci=>({fx:tr.x+[0,1,0,-1][tr.d]*(tr.p-ci*.62),fy:tr.y+[-1,0,1,0][tr.d]*(tr.p-ci*.62)}));
function run(C,n,{cars=true}={},dt=1/30){
  const log=[],steps=[];
  for(let s=0;s<n;s++){
    C.updTrains(dt);C.updTrams(dt);
    log.push(JSON.stringify(C.trains));
    steps.push(C.trains.map(tr=>({tr,head:[tr.x,tr.y,tr.p],flip:!!tr.flip,cars:cars?C.cars707(tr):oldCars(tr)})));
  }
  return{log,steps};
}
const station=(C,k,x,y)=>{C.tiles[C.idx(x,y)].bld={k,lv:1,v:0,age:60};};
const R=(C,x,y)=>{C.tiles[C.idx(x,y)].rail=1;};
const offStations=C=>{station(C,17,22,22);station(C,17,23,22);station(C,17,22,23);}; // 不靠鐵路的三座車站：讓上限＝2 列、又不出車不停站
// 轉角：一圈矩形環線（四個直角彎，沒有線尾）
const CORNER={N:24,build:C=>{for(let x=2;x<=14;x++){R(C,x,3);R(C,x,15);}for(let y=3;y<=15;y++){R(C,2,y);R(C,14,y);}offStations(C);C.trains.push({x:5,y:3,d:1,p:0,pt:0});}};
// 線尾：一條直線兩頭都是線尾
const DEADEND={N:24,build:C=>{for(let x=2;x<=10;x++)R(C,x,5);offStations(C);C.trains.push({x:4,y:5,d:1,p:0,pt:0});}};
// 對向：單線上兩列相向
const HEADON={N:24,build:C=>{for(let x=1;x<=20;x++)R(C,x,5);offStations(C);C.trains.push({x:5,y:5,d:1,p:0,pt:0},{x:15,y:5,d:3,p:0,pt:1});}};
// 車站：直線中段北邊一座車站，另一座不靠鐵路（上限 1 列，不另外出車）
const STATION={N:24,build:C=>{for(let x=1;x<=16;x++)R(C,x,5);station(C,17,12,4);station(C,17,22,22);C.trains.push({x:3,y:5,d:1,p:0,pt:0});}};
const SCENES=[['corner',CORNER,1800],['deadend',DEADEND,900],['headon',HEADON,900],['station',STATION,900]];

function check(src,base){
  const out={};
  // G1 轉角：每一步每一節都在軌道中心線上，相鄰兩節沿軌道間距 0.62（L 形路徑上弧長＝|dx|+|dy|）
  {const C=world(src,CORNER),r=run(C,1800);let off=0,gapErr=0,corners=0;
   for(const st of r.steps)for(const {cars} of st){for(const q of cars)off=Math.max(off,railDist(C,q.fx,q.fy));
     for(let i=0;i+1<cars.length;i++){const a=cars[i],b=cars[i+1];if(a.d!==b.d)corners++;gapErr=Math.max(gapErr,Math.abs(Math.abs(a.fx-b.fx)+Math.abs(a.fy-b.fy)-.62));}}
   assert(off<=.02,'G1 轉角時每節都在軌道上（最遠離軌 '+off.toFixed(3)+' 格）');
   assert(gapErr<=1e-6,'G1 相鄰兩節沿軌道的間距恆為 0.62（最大誤差 '+gapErr.toExponential(2)+'）');
   assert(corners>=60,'G1 真的轉過彎（相鄰兩節方向不同的取樣 '+corners+' 次）');
   out.corner={maxOff:+off.toFixed(4),gapErr,cornerSamples:corners};}
  // G1b 剛放上彎道格的列車（沒有走過的軌跡，例如剛生成、或 frame 場景直接放的車）：三節不疊在一起、都在軌道上、間距 0.62
  {const C=world(src,{N:24,build:C=>{for(let x=2;x<=14;x++){R(C,x,3);R(C,x,15);}for(let y=3;y<=15;y++){R(C,2,y);R(C,14,y);}offStations(C);}});
   let off=0,gapErr=0;
   for(const [x,y,d] of [[14,3,2],[14,15,3],[2,15,0],[2,3,1]])for(const p of [0,.3,.7]){const cars=C.cars707({x,y,d,p,pt:0});
     for(const q of cars)off=Math.max(off,railDist(C,q.fx,q.fy));for(let i=0;i+1<cars.length;i++)gapErr=Math.max(gapErr,Math.abs(Math.abs(cars[i].fx-cars[i+1].fx)+Math.abs(cars[i].fy-cars[i+1].fy)-.62));}
   assert(off<=.02&&gapErr<=1e-6,'G1b 剛放上彎道格的列車三節沿彎排開（最遠離軌 '+off.toFixed(3)+'、間距誤差 '+gapErr.toExponential(2)+'）');
   out.cornerPlaced={maxOff:off,gapErr};}
  // G2 線尾：沒有任何一節超出最後一格；折返那一步三節的位置集合前後相同；至少折返兩次
  {const C=world(src,DEADEND),r=run(C,900);let off=0,flips=0,jump=0;
   for(let s=0;s<r.steps.length;s++){const [st]=r.steps[s];for(const q of st.cars)off=Math.max(off,railDist(C,q.fx,q.fy));
     if(s>0&&r.steps[s-1][0].flip!==st.flip){flips++;const key=cs=>cs.map(q=>[q.fx,q.fy]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
       const A=key(r.steps[s-1][0].cars),B=key(st.cars);for(let i=0;i<A.length;i++)jump=Math.max(jump,Math.hypot(A[i][0]-B[i][0],A[i][1]-B[i][1]));}}
   assert(off<=.02,'G2 線尾沒有車廂開出軌道（最遠離軌 '+off.toFixed(3)+' 格）');
   assert(flips>=2&&jump<=1e-6,'G2 推拉折返不瞬移（折返 '+flips+' 次，前後最大位移 '+jump.toExponential(2)+'）');
   out.deadend={maxOff:+off.toFixed(4),flips,jump};}
  // G3 對向：兩列之間始終隔 ≥0.9 格（最近的兩節），而且不互相穿過（西邊那列整列永遠在東邊那列的西邊）
  {const C=world(src,HEADON),r=run(C,900);let gap=9,crossed=0;const [A,B]=C.trains;
   for(const st of r.steps){const a=st.find(e=>e.tr===A),b=st.find(e=>e.tr===B);assert(a&&b,'G3 兩列都還在');
     const ax=Math.max(...a.cars.map(q=>q.fx)),bx=Math.min(...b.cars.map(q=>q.fx));gap=Math.min(gap,bx-ax);if(bx<=ax)crossed++;}
   assert(crossed===0&&gap>=.9,'G3 對向兩列不互相穿過、始終隔 ≥0.9 格（最近 '+gap.toFixed(3)+' 格，穿過 '+crossed+' 步）');
   out.headon={minGap:+gap.toFixed(3)};}
  // G4 車站：在車站旁的格停 ≥1.4 秒
  {const C=world(src,STATION),r=run(C,900);let best=0,cur=0;
   for(let s=1;s<r.steps.length;s++){const h=r.steps[s][0].head,h0=r.steps[s-1][0].head;
     if(h[0]===12&&h[1]===5&&h[2]===h0[2]&&h0[0]===12)cur+=1/30;else cur=0;best=Math.max(best,cur);}
   assert(best>=1.4,'G4 在車站旁停 ≥1.4 秒（最長 '+best.toFixed(2)+' 秒）');
   out.station={dwellSecs:+best.toFixed(2)};}
  // G5 尾燈與機車：每列恰一節帶尾燈、恰一節是機車；推送時（flip）機車在最後一節、尾燈亮在它的前方（-1）
  {let n=0;for(const [,sc,k] of SCENES){const C=world(src,sc),r=run(C,k);for(const st of r.steps)for(const {flip,cars} of st){n++;
     assert.equal(cars.filter(q=>q.tail!==0).length,1,'G5 每列恰一節帶尾燈');assert.equal(cars.filter(q=>q.loco).length,1,'G5 每列恰一節機車');
     assert(cars[cars.length-1].tail!==0,'G5 尾燈在最後一節');assert.equal(cars[cars.length-1].loco,flip,'G5 推送時機車在最後');assert.equal(cars[cars.length-1].tail,flip?-1:1,'G5 推送時尾燈亮在機車前方');}}
   out.lamps={samples:n};}
  if(base){
    // G0：改前（T706 合併後的 main）在轉角與線尾都會離軌、對向會穿過——確認測試量得到差別
    const off0=sc=>{const C=world(base,sc),r=run(C,sc===CORNER?1800:900,{cars:false});let m=0;for(const st of r.steps)for(const {cars} of st)for(const q of cars)m=Math.max(m,railDist(C,q.fx,q.fy));return m;};
    const c0=off0(CORNER),d0=off0(DEADEND);
    let x0=0;{const C=world(base,HEADON),r=run(C,900,{cars:false});const [A,B]=C.trains;for(const st of r.steps){const a=st.find(e=>e.tr===A),b=st.find(e=>e.tr===B);if(a&&b&&Math.min(...b.cars.map(q=>q.fx))<=Math.max(...a.cars.map(q=>q.fx)))x0++;}}
    assert(c0>.3&&d0>.3&&x0>0,'G0 改前轉角與線尾離軌、對向穿過（轉角 '+c0.toFixed(2)+'、線尾 '+d0.toFixed(2)+'、穿過 '+x0+' 步）');
    // G6：T707 起的閥全關，四個場景每一步每一輛車都等於改前
    const flags=Object.fromEntries(LATER.map(k=>[k,true]));
    for(const [id,sc,k] of SCENES){const h=run(world(src,{...sc,flags}),k,{cars:false}),m=run(world(base,sc),k,{cars:false});
      assert.deepEqual(h.log,m.log,'G6 '+LATER.join('、')+' 全關時場景 '+id+' 逐步等於改前（'+BASE_LABEL+'）');}
    out.base={rev:BASE_LABEL,cornerOff:+c0.toFixed(3),deadendOff:+d0.toFixed(3),headonCrossedSteps:x0,closedValves:LATER};
  }
  return out;
}
const report={passed:true,limit:'Actual updTrains and T706/T707 helper source replayed on a small grid with a seeded Math.random; car positions come from cars707 (what draw uses). Movement and car placement only, not pixels.',result:check(HEAD,BASE),negativeControls:[]};
// G7：?noT707=1 關、?noT707=0 不誤關（t707On 原文）
{const C=world(HEAD,{N:4,build:()=>{}});C.location.search='?noT707=1';delete C.t707On.off;assert.equal(C.t707On(),false,'G7 ?noT707=1 關閉');
 const D=world(HEAD,{N:4,build:()=>{}});D.location.search='?noT707=0';delete D.t707On.off;assert.equal(D.t707On(),true,'G7 ?noT707=0 不誤關');}
// G8：畫面真的用 cars707，尾燈只畫在帶尾燈的那一節
assert(/const C707=nSeg===CARS707&&t707On\(\)&&t706On\(\)\?cars707\(tr\):null;/.test(HEAD),'G8 繪製迴圈用 cars707 取每節位置');
assert(HEAD.includes("else if(o.tail707!==0)nightSprites.push({rect:[sx-(o.tail707||1)*v[0]*z-z,sy-(o.tail707||1)*v[1]*z-z,2*z,2*z],col:'#ff4636'});"),'G8 尾燈只畫在帶尾燈的那一節');
for(const [id,mutate,expect] of [
  ['no-trail-sampling',t=>t.replace('function trainCar707(tr,i,P){','function trainCar707(tr,i,P){return {fx:tr.x+DIRV[tr.d][0]*(tr.p-i*SP707),fy:tr.y+DIRV[tr.d][1]*(tr.p-i*SP707),d:tr.d};'),'G1 '],
  ['straight-back-fill-only',t=>t.replace('const ds=railDirs706(cx,cy,\'rail\').filter(d=>d!==fwd);if(!ds.length)break;','const ds=railDirs706(cx,cy,\'rail\').filter(d=>d!==fwd);if(!ds.length||(k===0&&!ds.includes(back)))break;'),'G1b '],
  ['no-reverse-rebuild',t=>t.replace('function reverse707(c){','function reverse707(c){c.d=(c.d+2)%4;c.flip=!c.flip;c.v=0;c.trail=null;return;'),'G2 '],
  ['no-blocking',t=>t.replace('if(o&&o.some(t=>t!==c)){','if(false){'),'G3 '],
]){
  const t=mutate(HEAD);assert.notEqual(t,HEAD,id+': mutation applied');
  let reason='';try{check(t,null);}catch(e){reason=e.message;}
  assert(reason.startsWith(expect),id+': must fail first at '+expect.trim()+', got: '+reason.split('\n')[0]);
  report.negativeControls.push({mutation:id,reason:reason.split('\n')[0]});
}
console.log(JSON.stringify(report,null,2));
