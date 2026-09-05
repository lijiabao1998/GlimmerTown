/* T576 唯讀健康度跑檯。stdout 留可比較的 JSON 行，不存檔、不重釘、不部署。
   node tools/health_panel.js --smoke
   node tools/health_panel.js --runtime <frozen-index.html> [--smoke]
   預設固定 12 種子連續 900 tick；--smoke 為官方三種子 400 tick。
   PASS/HEALTH_DONE 只代表量測完成；健康度判定見 HEALTH_SUMMARY，不代表完整 verify。 */
'use strict';
const fs=require('fs'),path=require('path'),Module=require('module'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const ALL_SEEDS=[7,9,15,22,123,301,528,777,3001,3002,3003,5150];
function options576(args){
  let runtime=path.join(ROOT,'index.html'),smoke=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--smoke')smoke=true;
    else if(args[i]==='--runtime'&&args[i+1]&&!args[i+1].startsWith('--'))runtime=path.resolve(args[++i]);
    else throw Error('usage: node tools/health_panel.js [--runtime <index.html>] [--smoke]');
  }
  return {runtime,seeds:smoke?[301,7,22]:ALL_SEEDS.slice(),days:smoke?400:900};
}
function bootstrap576(source){
  const anchor='const N = window.GV.N();',at=source.indexOf(anchor);
  if(at<0||source.indexOf(anchor,at+anchor.length)>=0)throw Error('T576 bootstrap anchor drift');
  const boot=source.slice(0,at),storage='const store = {};';
  if(boot.split(storage).length!==2)throw Error('T576 storage anchor drift');
  return boot.replace(storage,"const store = {'glimmerville.v1.slot':'3'};");
}
function summary576(rows,seeds,days,floors){
  const metrics=['pop','buildings','roads','zones','poweredBld'],checkpoints=days===900?[400,900]:[400];
  if(rows.length!==seeds.length*checkpoints.length)throw Error('T576 incomplete measurements');
  const seen=new Set(),belowFloor=[],collapse={};
  for(const d of checkpoints)collapse[d]=0;
  for(const row of rows){
    const key=row.seed+':'+row.ticks;
    if(!seeds.includes(row.seed)||!checkpoints.includes(row.ticks)||seen.has(key))throw Error('T576 duplicate/foreign measurement');
    seen.add(key);
    for(const m of metrics)if(!Number.isSafeInteger(row[m])||row[m]<0)throw Error('T576 invalid metric '+m);
    if(!Number.isFinite(row.money)||!Number.isSafeInteger(row.roots)||row.roots<0)throw Error('T576 invalid money/roots');
    if(row.pop<500)collapse[row.ticks]++;
    const floor=floors.seeds['seed'+row.seed];
    if(row.ticks===400&&floor)for(const m of metrics)if(row[m]<floor[m].floor)
      belowFloor.push({seed:row.seed,metric:m,floor:floor[m].floor,actual:row[m]});
  }
  return {complete:true,seeds:seeds.length,collapseBelow500:collapse,belowFloor};
}
function main576(args){
  const opt=options576(args),testFile=path.join(ROOT,'test_fixde.js');
  const source=fs.readFileSync(opt.runtime,'utf8'),testSource=fs.readFileSync(testFile,'utf8');
  const sha=crypto.createHash('sha256').update(source).digest('hex'),rows=[];
  const boot=bootstrap576(testSource),savedRead=fs.readFileSync,savedLog=console.log;
  const floorFile=path.join(ROOT,'docs','HEALTH-PINS.json'),floors=JSON.parse(savedRead(floorFile,'utf8'));
  fs.readFileSync=function(file,...rest){
    return path.resolve(String(file))===path.join(ROOT,'index.html')?source:savedRead.call(fs,file,...rest);
  };
  console.log=(...a)=>{if(!String(a[0]).startsWith('PASS:'))savedLog(...a);};
  const run=new Module(testFile,module);run.filename=testFile;run.paths=Module._nodeModulePaths(ROOT);
  run.__healthRow576=row=>{rows.push(row);savedLog('HEALTH '+JSON.stringify(row));};
  try{
    savedLog('HEALTH_RECIPE '+JSON.stringify({...opt,sha,map:72,diff:1,slot:3,testSha:crypto.createHash('sha256').update(testSource).digest('hex')}));
    run._compile(boot+`
for(const seed of ${JSON.stringify(opt.seeds)}){
  const G=window.GV,started=Date.now();
  G.setMapSize(72);G.newWorldSeeded(seed);G.setDiff(1);G.ai(true);
  for(let d=1;d<=${opt.days};d++){
    G.step(1);
    if(d===400||d===900){
      const s=G.stats(),kinds={};let roots=0;
      for(let y=0;y<72;y++)for(let x=0;x<72;x++){
        const b=G.tile(x,y).bld;if(b&&!b.ref){roots++;kinds[b.k]=(kinds[b.k]||0)+1;}
      }
      module.__healthRow576({seed,ticks:d,pop:s.pop,buildings:s.buildings,
        roads:s.roads,zones:s.zones,poweredBld:s.poweredBld,money:s.money,roots,kinds,ms:Date.now()-started});
    }
  }
  G.ai(false);
}
`,testFile);
    const result=summary576(rows,opt.seeds,opt.days,floors);
    savedLog('HEALTH_SUMMARY '+JSON.stringify(result));
    if(result.belowFloor.length){console.error('FAIL: T576 health floor regression');return 1;}
    savedLog('HEALTH_DONE');return 0;
  }finally{fs.readFileSync=savedRead;console.log=savedLog;}
}
module.exports={options576,bootstrap576,summary576};
if(require.main===module){
  try{process.exit(main576(process.argv.slice(2)));}
  catch(error){console.error('FAIL: T576 health panel',error.stack||error);process.exit(1);}
}
