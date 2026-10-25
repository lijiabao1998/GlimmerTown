'use strict';
/* Candidate-owned orchestrator. No existing predicate, fixture, tool or workflow is edited.
   node docs/previews/port-p01b/regression.cjs [--repo=/checkout] [--lane=validate|focused|fingerprints]
   validate is the original non-browser validation plus actual-preview routing/save checks.
   fingerprints explicitly launches the original fp_snapshot.py against both sources.
   Browser rendering/interaction/full-frame parity belongs to chromium.cjs, not this runner. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process');
const opt=(k,d)=>{const s=process.argv.find(a=>a.startsWith('--'+k+'='));return s?s.slice(k.length+3):d;};
const HERE=__dirname,ROOT=path.resolve(opt('repo',fs.existsSync(path.resolve(HERE,'../../../test_fixde.js'))?path.resolve(HERE,'../../..'):path.resolve(HERE,'../GlimmerTown-port-exploration'))),OUT=path.resolve(opt('out',path.join(HERE,'evidence/p01c-regression'))),LANE=opt('lane','validate');
const PYTHON=process.env.PYTHON||'python3',NODE=process.execPath;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');
if(!['validate','focused','fingerprints'].includes(LANE))throw Error('Unknown --lane');
fs.mkdirSync(OUT,{recursive:true});
const report={kind:'P01-C original regression orchestration',lane:LANE,status:'running',started:new Date().toISOString(),scope:{baseline:'Untouched repository runtime and original tests',candidate:'Exact native-preview.html bytes; original T706/T707 source replays and original oldsave602/603 wrappers',notEquivalentTo:'This report is not a production CI gate, browser visual acceptance, or deployment approval'},checks:[],errors:[],notRun:[]};
const persist=()=>fs.writeFileSync(path.join(OUT,'regression-'+LANE+'.json'),JSON.stringify(report,null,2)+'\n');
const env={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',NODE_PATH:[process.env.NODE_PATH||'',path.join(HERE,'node_modules')].filter(Boolean).join(path.delimiter)};
function command(id,exe,args,cwd=ROOT,extra={}){
 const started=Date.now(),r=cp.spawnSync(exe,args,{cwd,env,encoding:'utf8',maxBuffer:50*1024*1024,timeout:25*60*1000,...extra});
 fs.writeFileSync(path.join(OUT,id+'.log'),(r.stdout||'')+(r.stderr||''));
 const row={id,command:[exe,...args],cwd,exit:r.status,signal:r.signal||null,error:r.error?.message||null,durationMs:Date.now()-started,passed:r.status===0&&!r.error,log:id+'.log'};report.checks.push(row);persist();console.log(`${row.passed?'PASS':'FAIL'} ${id} exit=${r.status}`);return r;
}
function inventory(){const names=cp.execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8'}).split('\0').filter(Boolean).filter(p=>!p.startsWith('docs/previews/'));return Object.fromEntries(names.filter(p=>fs.existsSync(path.join(ROOT,p))&&fs.statSync(path.join(ROOT,p)).isFile()).map(p=>[p,hash(fs.readFileSync(path.join(ROOT,p)))]));}
const before=inventory();
report.originalSource={rootIndexSHA256:before['index.html'],testSuiteSHA256:before['test_fixde.js'],trackedFileCount:Object.keys(before).length,SPR:JSON.parse(read(path.join(ROOT,'docs/SPR_PINS.json'))).__meta,ART:JSON.parse(read(path.join(ROOT,'docs/ART_PINS.json'))).__meta};
report.previewSHA256=hash(fs.readFileSync(path.join(HERE,'native-preview.html')));
const baselineFile=path.join(HERE,'baseline/index.html');
if(fs.existsSync(baselineFile)&&hash(fs.readFileSync(baselineFile))!==before['index.html'])throw Error('Repository index differs from the candidate-pinned baseline');
const STAGE=fs.mkdtempSync(path.join(os.tmpdir(),'p01c-original-guards-'));
// Overlay only the runtime. Tests and fixture expectations remain exact bytes from the original tree.
function link(a,b){fs.symlinkSync(a,b,fs.statSync(a).isDirectory()?'dir':'file');}
for(const e of fs.readdirSync(ROOT)){if(e==='index.html'||e==='docs')continue;link(path.join(ROOT,e),path.join(STAGE,e));}
fs.copyFileSync(path.join(HERE,'native-preview.html'),path.join(STAGE,'index.html'));
fs.mkdirSync(path.join(STAGE,'docs/tasks'),{recursive:true});
for(const e of fs.readdirSync(path.join(ROOT,'docs'))){if(e==='tasks')continue;link(path.join(ROOT,'docs',e),path.join(STAGE,'docs',e));}
for(const e of fs.readdirSync(path.join(ROOT,'docs/tasks'))){const from=path.join(ROOT,'docs/tasks',e),to=path.join(STAGE,'docs/tasks',e);if(['t706-shots','t707-shots'].includes(e))fs.cpSync(from,to,{recursive:true});else link(from,to);}
try{
 if(LANE==='validate'){
  const workflow=read(path.join(ROOT,'.github/workflows/town-main-pages-candidate.yml'));
  const minimums=[...workflow.matchAll(/tools\/verify\.py --min-pass (\d+)/g)].map(m=>+m[1]);
  if(!minimums.length)throw Error('Cannot resolve original workflow PASS floor');
  report.originalWorkflowMinPass=Math.max(...minimums);
  command('baseline-verify',PYTHON,['-B','-u','tools/verify.py','--min-pass',String(report.originalWorkflowMinPass)]);
  command('baseline-toolchain',PYTHON,['-B','-m','unittest','tools.test_toolchain']);
  for(const [id,args] of [
   ['baseline-pixels602',['docs/tasks/t602-shots/test602.js']],
   ['baseline-pixels603',['docs/tasks/t603-shots/test603.js']],
   ['baseline-clearance603',['docs/tasks/t603-shots/clearance603.js','index.html','-','1']],
   ['baseline-native-contracts',['tools/pages/native-correctness.cjs','--self-test']],
   ['baseline-release-contracts',['tools/pages/release-correctness.cjs','--self-test']],
   ['baseline-native-diagnostic-contracts',['--test','tools/pages/native-mac-diagnostic.test.cjs','tools/pages/native-portability-diagnostic.test.cjs']],
   ['baseline-approved-contracts',['--test','tools/approved_art.test.cjs']],
   ['baseline-approved-registry',['tools/approved_art.cjs','--check-all']],
   ['baseline-frame-contracts',['tools/pages/frame-compare.cjs','--self-test']],
   ['baseline-independent634',['docs/tasks/t634-shots/check634.cjs']],
  ])command(id,NODE,args);
 }
 if(LANE!=='fingerprints'){
  for(const [label,target] of [['baseline',ROOT],['candidate',STAGE]]){
   for(const [id,rel] of [['t706','docs/tasks/t706-shots/check-trains.cjs'],['t707','docs/tasks/t707-shots/check-articulation.cjs']]){
    const script=path.join(target,rel);if(hash(fs.readFileSync(script))!==before[rel])throw Error('Original train guard bytes changed: '+rel);
    const r=command(label+'-'+id,NODE,[script],target);
    if(r.status===0){const j=JSON.parse(r.stdout);fs.writeFileSync(path.join(OUT,label+'-'+id+'.json'),JSON.stringify(j,null,2)+'\n');}
   }
   for(const n of [602,603])command(label+'-oldsave'+n,NODE,[path.join(ROOT,'docs/tasks/t'+n+'-shots/oldsave'+n+'.js'),'--repo='+target,'--json='+path.join(OUT,label+'-oldsave'+n+'.json')],ROOT);
  }
  report.notRun.push('Native Chromium inherited SPR/ART recomputation: run --lane=fingerprints in a permitted browser environment.','Original full browser release/frame matrices and candidate visual/input/performance checks are not replaced by these Node checks.','Full test_fixde/verify validates the baseline, not the standalone preview: preview deliberately disables persistent autosave and PWA registration, so their original source-contract assertions are not equivalent.');
 }else{
  // Explicit transport adapter strengthens the original launch without changing its checks.
  if(process.platform==='linux'){env.CHROME_PATH=path.join(HERE,'chrome-sandboxed.sh');report.browserTransport={adapter:'chrome-sandboxed.sh',effect:'Removes only the original --no-sandbox argument; real Chrome sandbox stays enabled',realBinary:process.env.CHROME_SANDBOXED_BINARY||'/usr/bin/google-chrome',adapterSHA256:hash(fs.readFileSync(env.CHROME_PATH))};}
  for(const [label,target] of [['baseline',ROOT],['candidate',STAGE]])command(label+'-original-fingerprints',PYTHON,['-B',path.join(ROOT,'tools/fp_snapshot.py'),'--repo',target,'--check','--report',path.join(OUT,label+'-original-fingerprints.json')],target);
  report.notRun.push('Non-browser regression was not requested in this lane.','This fingerprint lane checks original inherited atlas keys only, not the new P01-C drawing assets or whole-frame valve equality.');
 }
}catch(e){report.errors.push(e.stack||String(e));console.error(e.stack||e);}
finally{
 const after=inventory(),changed=Object.keys(before).filter(p=>before[p]!==after[p]);
 report.originalBytesUnchanged=changed.length===0;report.originalChangedPaths=changed;
 report.finished=new Date().toISOString();report.status=!report.errors.length&&report.originalBytesUnchanged&&report.checks.every(c=>c.passed)?'passed':'failed';persist();
 fs.rmSync(STAGE,{recursive:true,force:true});
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(c=>!c.passed).map(c=>c.id),originalBytesUnchanged:report.originalBytesUnchanged,report:path.join(OUT,'regression-'+LANE+'.json')}));
 process.exitCode=report.status==='passed'?0:1;
}
