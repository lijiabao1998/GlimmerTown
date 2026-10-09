'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const BASE='16514fd27a2c143c0f0c79a3d08197150d72438f';
const ADDED=['tools/pages/NATIVE-PORTABILITY620.md','.github/workflows/town-native-portability-620.yml','tools/pages/native-portability-source-gate.cjs','tools/pages/native-portability-diagnostic.cjs','tools/pages/native-portability-diagnostic.test.cjs'].sort();
const PINS={'tools/pages/native-mac-diagnostic.cjs':'4b653115b6cb24022349cdaef9f8895cda8a0af844e488cb53b1ec4974a82e68','tools/pages/native-mac-diagnostic.test.cjs':'86ede45b95650887b5eb4aa307ee490052cf894bcdd85d202af98e4b19498d5b','index.html':'99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d','sw.js':'79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2','tools/pages/native-correctness.cjs':'57a779ea15366761cd84dc34fe4f4776e7f0f9c830cfc8333031c7096b8698b5','docs/tasks/t603-shots/scene603.js':'8d0083b3eba2083165bbf150fe7252215e8330559077923638c4cb00b62e355e'};
function validateChanges(text){
  const rows=text.trim().split('\n').filter(Boolean).map(row=>row.split('\t'));
  assert(rows.every(row=>row.length===2&&row[0]==='A'),'Only explicitly added diagnostic files allowed');
  assert.deepEqual(rows.map(row=>row[1]).sort(),ADDED,'Exact diagnostic-only file set required');
}
function selfTest(){
  const rows=ADDED.map(p=>'A\t'+p);validateChanges(rows.join('\n'));
  for(let i=0;i<rows.length;i++){
    assert.throws(()=>validateChanges(rows.filter((_,j)=>i!==j).join('\n')));
    for(const status of ['M','D','R100']){const altered=[...rows];altered[i]=altered[i].replace(/^A/,status);assert.throws(()=>validateChanges(altered.join('\n')));}
  }
  assert.throws(()=>validateChanges([...rows,'M\tindex.html'].join('\n')));
  assert.throws(()=>validateChanges([...rows,'A\tunexpected.js'].join('\n')));
  assert.throws(()=>validateChanges([...rows,rows[0]].join('\n')));
}
function main(){
  selfTest();if(process.argv.includes('--self-test')){console.log('T620_SOURCE_GATE_SELF_TEST_OK');return;}
  const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:30000});
  assert.equal(git('rev-parse','HEAD^').trim(),BASE,'One diagnostic commit must directly descend from exact reviewed release head');
  assert.equal(git('rev-list','--parents','-n','1','HEAD').trim().split(/\s+/).length,2,'No additional merge parent');
  validateChanges(git('diff','--name-status','--no-renames',BASE,'HEAD'));
  for(const [file,expected]of Object.entries(PINS))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex'),expected,'Exact original source '+file);
  console.log('T620_EXACT_BASE_SOURCE_GATE_OK '+BASE);
}
module.exports={validateChanges,selfTest,BASE,ADDED,PINS};
if(require.main===module)main();
