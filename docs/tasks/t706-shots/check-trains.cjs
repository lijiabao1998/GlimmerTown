/* T706：列車／輕軌各走自己的軌道，生成時面向軌道方向。
   從 index.html 取出實際的 updTrains／updTrams／railDirs／railDirs706／spawnDir706／t706On／listBldK／streetHash 原文，
   在 vm 裡的小網格上重放（Math.random 換成固定種子的 LCG）。期望值的獨立來源：同一個場景用 git 上 main 的原文跑一次＝改前行為。
   只驗車輛移動與生成，不是像素驗收。改前基準固定為 eacb7ff（v11.245，T704／T706 之前的 main，永久留在歷史裡；可用參數覆寫）。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..');
const HEAD=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const BASE_REV=process.argv[2]||'eacb7ff';
const BASE=execFileSync('git',['show',BASE_REV+':index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:64e6});
// 關閥比對要連之後各卡的閥一起關（它們可能也改列車移動），才會等於改前：T706 起每一個 function tNNNOn(){ 的閥
const LATER=[...new Set([...HEAD.matchAll(/\nfunction t(\d+)On\(\)\{/g)].map(m=>+m[1]).filter(n=>n>=706))].map(n=>'__noT'+n);

function fn(src,name){ // 取一個頂層函式原文（大括號配對；這幾個函式沒有字串裡的大括號）
  const a=src.indexOf('\nfunction '+name+'(');if(a<0)return null;
  let d=0,i=src.indexOf('{',a);for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'&&--d===0)break;}
  return src.slice(a+1,i+1);
}
// 之後的卡（T707 起）在 updTrains 裡加的頂層函式與常數也一起載入，閥關時它們不會被用到，但要有定義
const later=src=>[...new Set([...src.matchAll(/\nfunction ([A-Za-z_]+(\d{3})(?:[A-Za-z_]\w*)?)\(/g)].filter(m=>+m[2]>706).map(m=>m[1]))];
const laterConsts=src=>[...src.matchAll(/\nconst [A-Z_]+?(\d{3})=[^\n]*/g)].filter(m=>+m[1]>706).map(m=>m[0].slice(1));
function world(src,{N,build,flags={}}){
  const names=['streetHash','listBldK','railDirs','updTrains','updTrams','t706On','railDirs706','spawnDir706',...later(src)];
  const code=[...names.map(n=>fn(src,n)).filter(Boolean),...laterConsts(src)].join('\n');
  let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
  const tiles=Array.from({length:N*N},()=>({t:2,rail:0,tram:0,bld:null}));
  const C={N,tiles,trains:[],tramCars:[],DIRV:[[0,-1],[1,0],[0,1],[-1,0]],window:{...flags},location:{search:''},
    Math:Object.assign(Object.create(Math),{random:rnd}),T:i=>tiles[i],idx:(x,y)=>y*N+x,inMap:(x,y)=>x>=0&&y>=0&&x<N&&y<N,
    lotPorts574:()=>null,actualLot574:()=>null};
  C.vri=n=>Math.floor(C.Math.random()*n);
  vm.createContext(C);vm.runInContext(code,C);
  build(C);return C;
}
// 跑 n 步，記錄每一步每輛車的狀態、被刪掉的車數、走過的格
function run(C,n,dt=1/30){
  const seen=new Set(),log=[];let deleted=0;
  for(let s=0;s<n;s++){
    const before=new Set([...C.trains,...C.tramCars]);
    C.updTrains(dt);C.updTrams(dt);
    const after=new Set([...C.trains,...C.tramCars]);
    for(const c of before)if(!after.has(c))deleted++;
    for(const c of after)seen.add(c.x+','+c.y);
    log.push(JSON.stringify([C.trains,C.tramCars]));
  }
  return{deleted,tiles:seen.size,log};
}
const station=(C,k,x,y)=>{C.tiles[C.idx(x,y)].bld={k,lv:1,v:0,age:60};};
const line=(C,key,x0,x1,y)=>{for(let x=x0;x<=x1;x++)C.tiles[C.idx(x,y)][key]=1;};
// 場景 A：車站在軌道北邊，軌道東西向（和車站平行）——改前新車面向南方、下一步就開進草地被刪
const SCENE_A={N:20,build:C=>{station(C,17,5,5);station(C,17,14,5);line(C,'rail',1,18,6);}};
// 場景 B：鐵路接輕軌——改前列車開上輕軌格被刪；輕軌開上鐵路格被刪
const SCENE_B={N:20,build:C=>{station(C,17,3,5);station(C,17,6,5);station(C,21,13,5);station(C,21,16,5);line(C,'rail',1,9,6);line(C,'tram',10,18,6);
  C.trains.push({x:8,y:6,d:1,p:.5,pt:0});C.tramCars.push({x:11,y:6,d:3,p:.5});}};
function check(src,base){
  const out={};
  // G1：場景 A 生成後零刪除、走遍軌道
  const a=run(world(src,SCENE_A),1800);
  assert.equal(a.deleted,0,'G1 車站旁的直線生成後不會開出軌道（被刪 '+a.deleted+' 次）');
  assert(a.tiles>=12,'G1 列車真的沿線跑（走過 '+a.tiles+' 格）');
  // G2：場景 B 鐵路與輕軌互不越界
  const b=run(world(src,SCENE_B),900);
  assert.equal(b.deleted,0,'G2 鐵路與輕軌在接頭處各自折返，不開上對方的軌道（被刪 '+b.deleted+' 次）');
  out.a={deleted:a.deleted,tiles:a.tiles};out.b={deleted:b.deleted,tiles:b.tiles};
  if(base){
    // G0：改前（main 原文）兩個場景都會刪車——確認測試量得到差別
    const a0=run(world(base,SCENE_A),1800),b0=run(world(base,SCENE_B),900);
    assert(a0.deleted>0&&b0.deleted>0,'G0 main 原文在兩個場景都會刪車（A '+a0.deleted+'、B '+b0.deleted+'）');
    // G3：兩個閥各自退回 main：同一串亂數下每一步每輛車逐一相同
    for(const flags of [Object.fromEntries(LATER.map(k=>[k,true]))]){
      for(const [id,sc,n] of [['A',SCENE_A,1800],['B',SCENE_B,900]]){
        const h=run(world(src,{...sc,flags}),n),m=run(world(base,sc),n);
        assert.deepEqual(h.log,m.log,'G3 '+LATER.join('、')+' 全關時場景 '+id+' 逐步等於改前（'+BASE_REV+'）');
      }
    }
    out.base={rev:BASE_REV,a:a0.deleted,b:b0.deleted,closedValves:LATER};
  }
  return out;
}
const report={passed:true,limit:'Actual updTrains/updTrams/railDirs source replayed on a small grid with a seeded Math.random; vehicle routing only.',result:check(HEAD,BASE),negativeControls:[]};
// ?noT706=1 也要關得掉（t706On 原文）
{const C=world(HEAD,{N:4,build:()=>{}});C.location.search='?noT706=1';delete C.t706On.off;assert.equal(C.t706On(),false,'G4 ?noT706=1 關閉');
 const D=world(HEAD,{N:4,build:()=>{}});D.location.search='?noT706=0';delete D.t706On.off;assert.equal(D.t706On(),true,'G4 ?noT706=0 不誤關');}
for(const [id,mutate,expect] of [
  ['spawn-ignores-track',t=>t.replace('if(!own.length||own.includes(d0))return d0;','return d0;'),'G1 '],
  ['routing-mixes-rail-and-tram',t=>t.replace("if(!T(idx(x,y))[key])return [];","key=null;").replace("T(idx(nx,ny))[key])ds.push(d);","(T(idx(nx,ny)).rail||T(idx(nx,ny)).tram))ds.push(d);"),'G2 '],
]){
  const t=mutate(HEAD);assert.notEqual(t,HEAD,id+': mutation applied');
  let reason='';try{check(t,null);}catch(e){reason=e.message;}
  assert(reason.startsWith(expect),id+': must fail first at '+expect.trim()+', got: '+reason.split('\n')[0]);
  report.negativeControls.push({mutation:id,reason:reason.split('\n')[0]});
}
console.log(JSON.stringify(report,null,2));
