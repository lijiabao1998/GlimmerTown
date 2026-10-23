/* T707 改前基準（固定檔）：v11.247（T706 合併後）index.html 裡這八個函式的原文，逐字抽出、未改一字。
   check-articulation.cjs 讀這個檔當「改前」，不在執行時去 git 歷史裡找（淺層 clone、原始碼壓縮包也能跑）。
   怎麼產生的寫在同資料夾的 README.md。這個檔不是程式的一部分，遊戲不會載入它。 */

function streetHash(x,y,salt){
  let h=(x*374761393+y*668265263+salt*2246822519)|0;
  h=Math.imul(h^(h>>>15),2246822519);
  h=Math.imul(h^(h>>>13),3266489917);
  h^=h>>>16;
  return(h>>>0)/4294967296;
}
function listBldK(k){
  const a=[];for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&!b.ref&&b.k===k)a.push(i);}return a;
}
function railDirs(x,y){
  const t=T(idx(x,y));if(!t.rail&&!t.tram)return [];
  const ds=[];
  if(inMap(x,y-1)&&(T(idx(x,y-1)).rail||T(idx(x,y-1)).tram))ds.push(0);
  if(inMap(x+1,y)&&(T(idx(x+1,y)).rail||T(idx(x+1,y)).tram))ds.push(1);
  if(inMap(x,y+1)&&(T(idx(x,y+1)).rail||T(idx(x,y+1)).tram))ds.push(2);
  if(inMap(x-1,y)&&(T(idx(x-1,y)).rail||T(idx(x-1,y)).tram))ds.push(3);
  return ds;
}
function updTrains(dt){
  const sts=listBldK(17).concat(listBldK(55)); // T234：中央車站亦為列車起訖點
  const target=sts.length>=2?Math.min(4,sts.length-1):0; // T234：中央車站入網後上限 3→4 列
  while(trains.length<target){
    const si=sts[vri(sts.length)],x=si%N,y=(si/N)|0;
    const ds=[];                                             // T63 FIX-F：站牌本身無 rail 旗標，不可用 railDirs(x,y)（其首行要求自身即為 rail 才回傳鄰邊，站牌恆回空陣列致列車永不生成）；改為直接掃描站牌四鄰的 rail 格
    const ports574=T(si).bld.lot574?lotPorts574(x,y,actualLot574(T(si).bld),'rail'):null;
    if(ports574){for(let d=0;d<4;d++)if(ports574[d])ds.push(d);}else{
    if(inMap(x,y-1)&&T(idx(x,y-1)).rail)ds.push(0);
    if(inMap(x+1,y)&&T(idx(x+1,y)).rail)ds.push(1);
    if(inMap(x,y+1)&&T(idx(x,y+1)).rail)ds.push(2);
    if(inMap(x-1,y)&&T(idx(x-1,y)).rail)ds.push(3);
    }
    if(!ds.length)break;
    const d0=ds[vri(ds.length)];
    const tx0=ports574?ports574[d0][0]:x+DIRV[d0][0],ty0=ports574?ports574[d0][1]:y+DIRV[d0][1];
    const pt=window.__noVeh?0:(streetHash(tx0,ty0,940)<.5?0:1); // T155：車廂塗裝（0既有暗紅/1新塗裝）依生成格座標決定性挑選，不消耗R()，終生固定；__noVeh 時恆 0＝零位移
    trains.push({x:tx0,y:ty0,d:t706On()?spawnDir706(tx0,ty0,d0,'rail'):d0,p:0,pt}); // 生在鄰接的軌道格（站牌格本身不可行走）；T706：面向軌道
    if(trains.length>=target)break;
  }
  for(let i=trains.length-1;i>=0;i--){
    const c=trains[i];
    if(!inMap(c.x,c.y)||!T(idx(c.x,c.y)).rail){trains.splice(i,1);continue;}
    c.p+=dt*1.1;if(c.p<1)continue;c.p-=1;
    c.x+=DIRV[c.d][0];c.y+=DIRV[c.d][1];
    if(!inMap(c.x,c.y)||!T(idx(c.x,c.y)).rail){trains.splice(i,1);continue;}
    const ds=t706On()?railDirs706(c.x,c.y,'rail'):railDirs(c.x,c.y);if(!ds.length){trains.splice(i,1);continue;} // T706：只走鐵路，接輕軌處當線尾折返
    const rev=(c.d+2)%4;const fwd=ds.filter(d=>d!==rev);c.d=fwd.length?fwd[vri(fwd.length)]:rev;
  }
  if(trains.length>target)trains.length=target;
}
function updTrams(dt){
  const sts=listBldK(21);
  const target=sts.length>=2?Math.min(4,sts.length):0;
  while(tramCars.length<target){
    const si=sts[vri(sts.length)],x=si%N,y=(si/N)|0;
    const ds=[];                                             // T65：仿 T63 FIX-F，站牌本身無 tram 旗標，不可用 railDirs(x,y)（其首行要求自身即帶 tram 才回傳鄰邊，站牌恆回空陣列致電車永不生成）；改為直接掃描站牌四鄰的 tram 格
    const ports574=T(si).bld.lot574?lotPorts574(x,y,actualLot574(T(si).bld),'tram'):null;
    if(ports574){for(let d=0;d<4;d++)if(ports574[d])ds.push(d);}else{
    if(inMap(x,y-1)&&T(idx(x,y-1)).tram)ds.push(0);
    if(inMap(x+1,y)&&T(idx(x+1,y)).tram)ds.push(1);
    if(inMap(x,y+1)&&T(idx(x,y+1)).tram)ds.push(2);
    if(inMap(x-1,y)&&T(idx(x-1,y)).tram)ds.push(3);
    }
    if(!ds.length)break;
    const d0=ds[vri(ds.length)];
    const tx1=ports574?ports574[d0][0]:x+DIRV[d0][0],ty1=ports574?ports574[d0][1]:y+DIRV[d0][1]; // T706：先算出生成格，好面向軌道
    tramCars.push({x:tx1,y:ty1,d:t706On()?spawnDir706(tx1,ty1,d0,'tram'):d0,p:0}); // T574：新月台可從任一側軌道出車，仍只用既有兩次 vri
    if(tramCars.length>=target)break;
  }
  for(let i=tramCars.length-1;i>=0;i--){
    const c=tramCars[i];
    if(!inMap(c.x,c.y)||!T(idx(c.x,c.y)).tram){tramCars.splice(i,1);continue;}
    c.p+=dt*1.3;if(c.p<1)continue;c.p-=1;
    c.x+=DIRV[c.d][0];c.y+=DIRV[c.d][1];
    if(!inMap(c.x,c.y)||!T(idx(c.x,c.y)).tram){tramCars.splice(i,1);continue;}
    const ds=t706On()?railDirs706(c.x,c.y,'tram'):railDirs(c.x,c.y);if(!ds.length){tramCars.splice(i,1);continue;} // T706：只走輕軌
    const rev=(c.d+2)%4;const fwd=ds.filter(d=>d!==rev);c.d=fwd.length?fwd[vri(fwd.length)]:rev;
  }
  if(tramCars.length>target)tramCars.length=target;
}
function t706On(){if(t706On.off===undefined){const q=(typeof location!=='undefined'&&location.search)||'';t706On.off=/(?:^|[?&])noT706(?:=1)?(?:&|$)/.test(q);}return !window.__noT706&&!t706On.off;}
function railDirs706(x,y,key){
  if(!T(idx(x,y))[key])return [];
  const ds=[];
  for(let d=0;d<4;d++){const nx=x+DIRV[d][0],ny=y+DIRV[d][1];if(inMap(nx,ny)&&T(idx(nx,ny))[key])ds.push(d);}
  return ds;
}
function spawnDir706(x,y,d0,key){ // 軌道接得到 d0 就照舊；接不到（軌道和車站平行）改走軌道方向，用格雜湊挑，不多抽亂數；孤立一格照舊（T574 G13j）
  const own=railDirs706(x,y,key);
  if(!own.length||own.includes(d0))return d0;
  return own[Math.floor(streetHash(x,y,706)*own.length)%own.length];
}
