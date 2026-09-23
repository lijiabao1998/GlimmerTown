/* T588 read-only, in-memory official-recipe city diagnostic. Never opens player storage. */
'use strict';
const fs=require('fs'),path=require('path'),Module=require('module');
const rootArg=process.argv.find(a=>a.startsWith('--root='));
const root=rootArg?path.resolve(rootArg.slice(7)):path.resolve(__dirname,'..','..','..'),testFile=path.join(root,'test_fixde.js');
const {bootstrap576}=require(path.join(root,'tools','health_panel.js'));
const testSource=fs.readFileSync(testFile,'utf8');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const anchor='window.GV={';
if(original.split(anchor).length!==2)throw Error('T588 GV anchor drift');
let source=original.replace(anchor,
  "window.__t588AI=()=>({radius:aiR,net:fin?.net??null,powerCap:computePower(),poor:money<800,lock:powLockDays532,dem:{...dem}});"+anchor);
if(process.argv.includes('--roadlab')){
  const site='  const adjPipe4=(x,y)=>{';
  if(source.split(site).length!==2)throw Error('T588 roadlab site drift');
  const lab=`  /* T588 LAB ONLY: breadth-first minimum connection to the existing 6-grid, tested in memory. */
  if(roadBudget>0&&roadBudget===(poor?2:6)&&day%10===0
    &&money>COST.nuclear+RESERVE&&pop<500&&!powLock532&&aiR>=N){
    const prev588=new Int32Array(N*N);prev588.fill(-2);
    const depth588=new Uint8Array(N*N),queue588=[];
    for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){
      const i=idx(xx,yy);if(tiles[i].road){prev588[i]=-1;queue588.push(i);}
    }
    let goal588=-1;
    for(let head588=0;head588<queue588.length;head588++){
      const i=queue588[head588],d=depth588[i],x=i%N,y=(i/N)|0;
      if(d>0&&(x%6===0||y%6===0)){goal588=i;break;}
      if(d>=6)continue;
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
        if(nx<x0||nx>x1||ny<y0||ny>y1)continue;
        const j=idx(nx,ny);if(prev588[j]!==-2||tiles[j].road)continue;
        if(canPlace('road',nx,ny)!==null)continue;
        prev588[j]=i;depth588[j]=d+1;queue588.push(j);
      }
    }
    if(goal588>=0){
      const path588=[];for(let j=goal588;prev588[j]>=0;j=prev588[j])path588.push(j);
      path588.reverse();
      for(const j of path588){if(!roadBudget)break;if(!tryP('road',j%N,(j/N)|0))break;roadBudget--;}
    }
  }
`;
  source=source.replace(site,lab+site);
}
if(process.argv.includes('--linklab')||process.argv.includes('--link12')){
  const linkCap=process.argv.includes('--link12')?12:6;
  const site='function powerLinkPlan576(tool,x0,y0,x1,y1,roads,actions,cash,reserve){';
  if(source.split(site).length!==2)throw Error('T588 linklab helper site drift');
  const helper=`/* T588 LAB ONLY: deterministic alternative road and axis when the nearest direct link is blocked. */
function powerAltLink588(x,y,sz,roads){
  let best=null,bestLen=${linkCap+1};
  for(const i of roads){
    const rx=i%N,ry=(i/N)|0,ax=clamp(rx,x,x+sz-1),ay=clamp(ry,y,y+sz-1);
    const dist=Math.abs(rx-ax)+Math.abs(ry-ay);if(dist<2||dist>${linkCap+1}||dist-1>=bestLen)continue;
    for(let axis=0;axis<2;axis++){
      let cx=ax,cy=ay,ok=true;const cells=[];
      while(cx!==rx||cy!==ry){
        if(axis===0?(cx!==rx):(cy===ry))cx+=Math.sign(rx-cx);else cy+=Math.sign(ry-cy);
        if(cx===rx&&cy===ry)break;
        if(tiles[idx(cx,cy)].road)continue;
        if(canPlace('road',cx,cy)!==null){ok=false;break;}
        cells.push([cx,cy]);
      }
      if(ok&&cells.length&&cells.length<bestLen){best=cells;bestLen=cells.length;}
    }
  }
  return best;
}
window.__t588Alt=(x,y,sz)=>powerAltLink588(x,y,sz,tickRoad.filter(i=>tiles[i].road&&tiles[i].rp));
`;
  source=source.replace(site,helper+site);
  const old="    const link=lotRoadLink574(x,y,sz,roads);\n    if(!link||!link.length||link.length>6||link.length+1>actions)continue;\n    if(!link.every(p=>canPlace('road',p[0],p[1])===null))continue;";
  if(source.split(old).length!==2)throw Error('T588 linklab call site drift');
  const replacement=`    let link=lotRoadLink574(x,y,sz,roads);\n    if(!link||!link.length||link.length>${linkCap}||!link.every(p=>canPlace('road',p[0],p[1])===null))\n      link=powerAltLink588(x,y,sz,roads);\n    if(!link||!link.length||link.length>${linkCap}||link.length+1>actions)continue;\n    if(!link.every(p=>canPlace('road',p[0],p[1])===null))continue;`;
  source=source.replace(old,replacement);
}
if(process.argv.includes('--aidlab')){
  const old='money=Math.max(money,COST.geo+RESERVE+50);';
  if(source.split(old).length!==2)throw Error('T588 aidlab site drift');
  source=source.replace(old,'money=Math.max(money,COST.geo+RESERVE+180);');
}
if(process.argv.includes('--exactaid')){
  const old='if(powLock532&&powCap<bldN+6&&money<COST.geo+RESERVE&&day-powAid532>=POWLOCK_AID_GAP532){';
  if(source.split(old).length!==2)throw Error('T588 exactaid condition drift');
  source=source.replace(old,'if(powLock532&&powCap<bldN+6&&money<COST.geo+RESERVE&&day-powAid532>=POWLOCK_AID_GAP532&&day%4===0){');
  const grant='money=Math.max(money,COST.geo+RESERVE+50);';
  if(source.split(grant).length!==2)throw Error('T588 exactaid grant drift');
  source=source.replace(grant,`const roadsAid588=tickRoad.filter(i=>tiles[i].road&&tiles[i].rp);
    const planAid588=powerLinkPlan576('geo',x0,y0,x1,y1,roadsAid588,MAXA-acts,Infinity,RESERVE);
    let targetAid588=COST.geo+RESERVE+50;
    if(planAid588){targetAid588=placeCost('geo',planAid588.x,planAid588.y)+RESERVE;
      for(const p of planAid588.link)targetAid588+=placeCost('road',p[0],p[1]);}
    money=Math.max(money,targetAid588);`);
}
const all=process.argv.includes('--all')||process.argv.includes('--all900'),one=process.argv.includes('--one5150'),quick=process.argv.includes('--all')||one||process.argv.includes('--short')||process.argv.includes('--trace');
const seedArg=process.argv.find(a=>/^--seed=\d+$/.test(a));
const chosen=seedArg?[Number(seedArg.slice(7))]:one?[5150]:all?[7,9,15,22,123,301,528,777,3001,3002,3003,5150]:quick?[22,301,5150]:[22,301,5150,123],stop=quick?400:900;
const observations=process.argv.includes('--all900')?[400,900]:process.argv.includes('--trace')?[50,100,150,200,250,300,350,400]:(quick?[400]:[100,200,300,400,900]);
const savedRead=fs.readFileSync,savedLog=console.log;
fs.readFileSync=function(file,...rest){return path.resolve(String(file))===path.join(root,'index.html')?source:savedRead.call(fs,file,...rest);};
console.log=(...args)=>{if(!String(args[0]).startsWith('PASS:'))savedLog(...args);};
const m=new Module(testFile,module);m.filename=testFile;m.paths=Module._nodeModulePaths(root);
try{
  m._compile(bootstrap576(testSource)+`
const seeds588=${JSON.stringify(chosen)};
for(const seed588 of seeds588){
  const G=window.GV;G.setMapSize(72);G.newWorldSeeded(seed588);G.setDiff(1);G.ai(true);
  for(let d588=1;d588<=${stop};d588++){
    G.step(1);
    if(!${JSON.stringify(observations)}.includes(d588))continue;
    const s588=G.stats(),a588=window.__t588AI(),N588=G.N(),map588=[];
    if(${process.argv.includes('--summary')}){
      console.log('SUMMARY588 '+JSON.stringify({seed:seed588,day:d588,pop:s588.pop,money:s588.money,roads:s588.roads,zones:s588.zones,buildings:s588.buildings,powered:s588.poweredBld,happy:s588.happy,lock:a588.lock,net:a588.net,radius:a588.radius}));
      continue;
    }
    let sx588=0,sy588=0,roots588=0;
    for(let y588=0;y588<N588;y588++)for(let x588=0;x588<N588;x588++){
      const t588=G.tile(x588,y588);map588.push(t588);
      if(t588.bld&&!t588.bld.ref){sx588+=x588;sy588+=y588;roots588++;}
    }
    const cx588=roots588?Math.round(sx588/roots588):N588>>1,
      cy588=roots588?Math.round(sy588/roots588):N588>>1;
    const x0=Math.max(1,cx588-a588.radius),x1=Math.min(N588-2,cx588+a588.radius),
      y0=Math.max(1,cy588-a588.radius),y1=Math.min(N588-2,cy588+a588.radius);
    const at=(x,y)=>x>=0&&x<N588&&y>=0&&y<N588?map588[y*N588+x]:null;
    const adj=(x,y,sz)=>{for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++){
      for(const[qx,qy]of[[x+dx+1,y+dy],[x+dx-1,y+dy],[x+dx,y+dy+1],[x+dx,y+dy-1]])
        if(at(qx,qy)?.road)return true;
    }return false;};
    let roadGrid588=0,roadAny588=0,zoneEmpty588=0,geo588=0,geoNear588=0,geoAdj588=0;
    const roadAnyExamples588=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const t=at(x,y);if(!t)continue;
      if(!t.road&&adj(x,y,1)&&G.canPlaceTool('road',x,y)===null){
        roadAny588++;if(roadAnyExamples588.length<10)roadAnyExamples588.push([x,y]);
        if(x%6===0||y%6===0)roadGrid588++;
      }
      if(!t.zone&&!t.bld&&!t.road&&t.t!==0&&G.canPlaceTool('zr',x,y)===null)zoneEmpty588++;
      if(x+2<=x1&&y+2<=y1&&G.canPlaceTool('geo',x,y)===null){geo588++;if(adj(x,y,3))geoAdj588++;}
    }
    let altN588=0,altMin588=99;const altExamples588=[];
    for(let y=1;y<N588-3;y++)for(let x=1;x<N588-3;x++)if(G.canPlaceTool('geo',x,y)===null){
      geoNear588++;
      if(seed588===5150&&d588===400&&window.__t588Alt){
        const link=window.__t588Alt(x,y,3);
        if(link){altN588++;altMin588=Math.min(altMin588,link.length);
          if(altExamples588.length<8)altExamples588.push([x,y,link.length]);}
      }
    }
    console.log('DIAG588 '+JSON.stringify({seed:seed588,day:d588,pop:s588.pop,money:s588.money,
      roads:s588.roads,zones:s588.zones,buildings:s588.buildings,powered:s588.poweredBld,
      happy:s588.happy,dem:s588.dem,roots:roots588,ai:a588,center:[cx588,cy588],
      roadGrid:roadGrid588,roadAny:roadAny588,roadAnyExamples:roadAnyExamples588,
      zoneEmpty:zoneEmpty588,geoWithin:geo588,geoRoadAdj:geoAdj588,geoWholeMap:geoNear588,
      altN:altN588,altMin:altMin588,altExamples:altExamples588}));
  }
  G.ai(false);
}
`,testFile);
}finally{fs.readFileSync=savedRead;console.log=savedLog;}
process.exit(0);
