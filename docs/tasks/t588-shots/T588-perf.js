/* T588 throwaway, in-memory same-city CPU probe. No player storage or runtime writes. */
'use strict';
const fs=require('fs'),path=require('path'),Module=require('module'),crypto=require('crypto');
const arg=process.argv.find(a=>a.startsWith('--root='));
const root=arg?path.resolve(arg.slice(7)):path.resolve(__dirname,'..','..','..'),testFile=path.join(root,'test_fixde.js');
const frozenArg=process.argv.find(a=>a.startsWith('--frozen-root='));
const frozenRoot=frozenArg?path.resolve(frozenArg.slice(14)):root;
const {bootstrap576}=require(path.join(root,'tools','health_panel.js'));
const testSource=fs.readFileSync(testFile,'utf8'),original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const anchor='  aiStep(); // T260：AI 市長每日決策';
if(original.split(anchor).length!==2)throw Error('T588 perf anchor drift');
const source=original.replace(anchor,
  "  {const t588=process.hrtime.bigint();aiStep();window.__t588AiNs.push(Number(process.hrtime.bigint()-t588));} // T260：AI 市長每日決策");
let frozenSnapshot=null;
{
  const frozenFile=path.join(frozenRoot,'test_fixde.js');
  const freeze=new Module(frozenFile,module);freeze.filename=frozenFile;freeze.paths=Module._nodeModulePaths(frozenRoot);
  freeze._compile(bootstrap576(fs.readFileSync(frozenFile,'utf8'))+`
const F588=window.GV;F588.setMapSize(72);F588.newWorldSeeded(22);F588.setDiff(1);F588.ai(true);
for(let d=0;d<300;d++)F588.step(1);
F588.save();module.__snapshot588=F588.rawSave();
`,frozenFile);
  frozenSnapshot=freeze.__snapshot588;
  if(!frozenSnapshot)throw Error('T588 frozen city save failed');
}
const oldRead=fs.readFileSync,oldLog=console.log;
fs.readFileSync=function(file,...rest){return path.resolve(String(file))===path.join(root,'index.html')?source:oldRead.call(fs,file,...rest);};
console.log=(...args)=>{if(!String(args[0]).startsWith('PASS:'))oldLog(...args);};
const rows=[];
try{
  for(let rep=0;rep<3;rep++){
    // A fresh game module per replicate: load() does not reset every derived snapshot field.
    // Reusing one module made the first population 0 and later replicates inherit 476.
    const m=new Module(testFile,module);m.filename=testFile;m.paths=Module._nodeModulePaths(root);
    m._compile(bootstrap576(testSource)+`
localStorage.setItem('glimmerville.v1.s3',${JSON.stringify(frozenSnapshot)});
const G588=window.GV;window.__t588AiNs=[];
if(!G588.load())throw Error('T588 frozen city load failed');
  const start588=G588.stats();window.__t588AiNs=[];
  const t588=process.hrtime.bigint();for(let d=0;d<100;d++)G588.step(1);
  const totalMs588=Number(process.hrtime.bigint()-t588)/1e6;
  const aiMs588=window.__t588AiNs.reduce((a,b)=>a+b,0)/1e6;
  const end588=G588.stats();
  module.__row588={rep:${rep+1},from:[start588.day,start588.pop,start588.money],
    to:[end588.day,end588.pop,end588.money],totalMs:+totalMs588.toFixed(2),
    aiMs:+aiMs588.toFixed(2),nonAiMs:+(totalMs588-aiMs588).toFixed(2),aiCalls:window.__t588AiNs.length};
`,testFile);
    rows.push(m.__row588);
  }
}finally{fs.readFileSync=oldRead;console.log=oldLog;}
if(new Set(rows.map(r=>JSON.stringify(r.to))).size!==1)throw Error('T588 perf replay nondeterministic: '+JSON.stringify(rows));
oldLog('PERF588 '+JSON.stringify({root,frozenRoot,seed:22,at:300,steps:100,
  snapshotBytes:frozenSnapshot.length,snapshotSha:crypto.createHash('sha256').update(frozenSnapshot).digest('hex'),rows}));
process.exit(0);
