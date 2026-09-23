/* T588 destructive proofs: each legal in-memory source mutation must fail on its named first guard. */
'use strict';
const fs=require('fs'),path=require('path'),Module=require('module'),cp=require('child_process');
const root=path.resolve(__dirname,'..','..','..'),testFile=path.join(root,'test_fixde.js');
const {bootstrap576}=require(path.join(root,'tools','health_panel.js'));
const cases={
  alt:{old:'link=wide588?powerAltLink588(x,y,sz,roads,maxLink):null;',new:'link=null;',first:'T588 G1 '},
  cost:{old:"for(const p of plan.link)due+=placeCost('road',p[0],p[1]);",new:"for(const p of [])due+=placeCost('road',p[0],p[1]);",first:'T588 G2 '},
  aiduse:{old:"if(aidPlan588)aidTarget588=Math.max(aidTarget588,powerAidCost588('geo',aidPlan588,RESERVE));",new:'if(aidPlan588)aidTarget588=aidTarget588;',first:'T588 G7 seed5150 '},
  grid:{old:'return path.reverse(); // 從既有路向外鋪',new:'return null; // 從既有路向外鋪',first:'T588 G5 '},
  roaduse:{old:'const path588=roadGridBridge588(x0,y0,x1,y1,Math.min(roadBudget,spare588,6));',new:'const path588=null;',first:'T588 G7 seed22 '},
  lock:{old:'const powLongLock588=powLock532&&powLockDays532>=POWLOCK_HOLD532+POWLOCK_AID_GAP532&&aiR>=N/2;',new:'const powLongLock588=powLock532&&powLockDays532>=POWLOCK_HOLD532+POWLOCK_AID_GAP532;',first:'T588 G6b '},
  roadguard:{old:'money>COST.nuclear+RESERVE&&pop<500&&!powLock532&&aiR>=N',new:'money>COST.nuclear+RESERVE&&pop<0&&!powLock532&&aiR>=N',first:'T588 G6c '},
  rng:{old:'function powerAltLink588(x,y,sz,roads,maxLink){',new:'function powerAltLink588(x,y,sz,roads,maxLink){R();',first:'T588 G6a '}
};
if(!process.argv.includes('--mutant')){
  for(const id of Object.keys(cases)){
    const r=cp.spawnSync(process.execPath,[__filename,'--mutant',id],{cwd:root,encoding:'utf8',maxBuffer:1024*1024,timeout:90000});
    const first=(r.stderr+'\n'+r.stdout).split(/\r?\n/).find(s=>s.startsWith('FAIL:'))||'';
    if(r.status!==1||!first.startsWith('FAIL: '+cases[id].first))
      throw Error('T588 red '+id+' wrong first red: status='+r.status+' first='+first+' stderr='+r.stderr.slice(0,200));
    console.log('RED588 '+id+' exit=1 first='+first);
  }
  process.exit(0);
}
const id=process.argv[process.argv.indexOf('--mutant')+1],c=cases[id];if(!c)throw Error('unknown mutant');
const source=fs.readFileSync(path.join(root,'test_fixde.js'),'utf8');
const begin='/* ===== T588 電源替代接路／按施工單補足紓困，不得只是多發錢 ===== */';
const end='/* ===== T588 電源接路 END ===== */';
const a=source.indexOf(begin),b=source.indexOf(end);
if(a<0||b<=a)throw Error('guard anchors missing');
const indexFile=path.join(root,'index.html'),original=fs.readFileSync(indexFile,'utf8');
if(original.split(c.old).length!==2)throw Error('mutation source not unique: '+id);
const mutated=original.replace(c.old,c.new),read=fs.readFileSync,log=console.log;
fs.readFileSync=function(file,...args){return path.resolve(String(file))===indexFile?mutated:read.call(fs,file,...args);};
console.log=(...args)=>{if(!String(args[0]).startsWith('PASS:'))log(...args);};
const m=new Module(testFile,module);m.filename=testFile;m.paths=Module._nodeModulePaths(root);
try{m._compile(bootstrap576(source)+'\n'+source.slice(a,b+end.length),testFile);}
finally{fs.readFileSync=read;console.log=log;}
throw Error('mutant escaped T588 guard: '+id);
