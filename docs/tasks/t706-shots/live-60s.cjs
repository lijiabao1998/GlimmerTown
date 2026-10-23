/* T706 真 Chromium 對照：真的遊戲迴圈（requestAnimationFrame → advance → updTrains／updTrams）跑固定秒數，
   數生成、刪車、走過的格。只觀察（包一層 updTrains／updTrams 計數），不改遊戲行為。
   用法：node live-60s.cjs <index.html> <輸出資料夾> <標記> [查詢字串，如 ?noT706=1]
   場景 A：東西向直線鐵路，三座車站都在線旁（車站與軌道平行）。
   場景 B：鐵路與輕軌在 (30,50)／(31,50) 頭接頭，兩邊各自從線尾的車站出車。 */
'use strict';
const fs=require('fs'),http=require('http');
const [file,out,tag,query='']=process.argv.slice(2);
const src=fs.readFileSync(file,'utf8');
const page=src.replace('window.GV={',()=>'window.__ev=function(s){return eval(s);};window.GV={');
if(page===src)throw new Error('找不到 window.GV={');
const SCENES={
  A:{secs:60,look:[32,40],build:`for(let x=18;x<=46;x++)T(idx(x,40)).rail=1;
    for(const [x,y] of [[24,39],[40,39],[32,41]])T(idx(x,y)).bld={k:17,lv:1,v:0,age:60,pw:true,h:1};`},
  B:{secs:30,look:[31,50],build:`for(let x=18;x<=30;x++)T(idx(x,50)).rail=1;T(idx(18,51)).rail=1;T(idx(18,52)).rail=1;
    for(let x=31;x<=44;x++)T(idx(x,50)).tram=1;T(idx(44,51)).tram=1;T(idx(44,52)).tram=1;
    T(idx(17,50)).bld={k:17,lv:1,v:0,age:60,pw:true,h:1};T(idx(18,53)).bld={k:17,lv:1,v:0,age:60,pw:true,h:1};
    T(idx(45,50)).bld={k:21,lv:1,v:0,age:60,pw:true,h:1};T(idx(44,53)).bld={k:21,lv:1,v:0,age:60,pw:true,h:1};`},
};
(async()=>{
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(page);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
  const rep={tag,query};
  for(const [id,sc] of Object.entries(SCENES)){
    const ctx=await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
    await ctx.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');});
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(origin+'/'+query);
    await p.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:120000});
    await p.evaluate(b=>__ev(`(function(){GV.setMapSize(72);GV.newWorldSeeded(706);GV.setDiff(3);GV.ai(false);GV.setSpeed(0);
      const st=document.getElementById('start');if(st)st.classList.add('hide');
      for(const a of [cars,citizens,trains,cargoShips,tramCars,ambulances,buses,rbuses])a.length=0;
      for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});
      ${b}
      recalcAllMasks();if(typeof recalcAllRailMasks==='function')recalcAllRailMasks();groundDirty=true;
      const L={spawns:0,deleted:0,tiles:new Set(),best:0,frames:0,simSecs:0};window.__L706=L;const life=new Map();
      const wrap=(f,arr)=>function(dt){const before=new Set(arr());f(dt);const after=new Set(arr());L.simSecs+=dt/2;
        for(const c of before)if(!after.has(c)){L.deleted++;life.delete(c);}
        for(const c of after){if(!before.has(c)){L.spawns++;life.set(c,new Set());}const s=life.get(c);s.add(c.x+','+c.y);L.tiles.add(c.x+','+c.y);if(s.size>L.best)L.best=s.size;}};
      updTrains=wrap(updTrains,()=>trains);updTrams=wrap(updTrams,()=>tramCars);
      speed=0;running=true;})()`),sc.build);
    await p.evaluate(([x,y])=>{GV.setZoom(1.6);GV.lookAt(x,y);},sc.look);
    await p.waitForTimeout(sc.secs*1000);
    const r=await p.evaluate(()=>__ev(`running=false;({spawns:__L706.spawns,deleted:__L706.deleted,tilesVisited:__L706.tiles.size,longestRunTiles:__L706.best,simSecs:+__L706.simSecs.toFixed(1),trains:trains.length,trams:tramCars.length})`));
    r.pageErrors=errs.length;r.wallSecs=sc.secs;
    {const u=await p.evaluate(()=>__ev(`(function(){groundDirty=true;visT=55;GV.forceDraw();const c=document.createElement('canvas');c.width=800;c.height=440;c.getContext('2d').drawImage(cvs,(W/2)*DPR-400,(H/2)*DPR-220,800,440,0,0,800,440);return c.toDataURL();})()`));
     fs.writeFileSync(`${out}/${tag}-${id}.png`,Buffer.from(u.split(',')[1],'base64'));} // 遊戲畫布本身（不含選單層）
    rep[id]=r;await ctx.close();
  }
  console.log(JSON.stringify(rep));
  await br.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
