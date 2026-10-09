'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const BASE='cbacfa220e3fb1c9356afdb1f9b916cbaa4eede3';
const ADDED=['tools/pages/NATIVE-MAC-DIAGNOSTIC619.md','.github/workflows/town-native-mac-diagnostic-619.yml','tools/pages/native-mac-source-gate.cjs','tools/pages/native-mac-diagnostic.cjs','tools/pages/native-mac-diagnostic.test.cjs'].sort();
const PINS={'index.html':'99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d','sw.js':'79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2','tools/pages/native-correctness.cjs':'57a779ea15366761cd84dc34fe4f4776e7f0f9c830cfc8333031c7096b8698b5','docs/tasks/t603-shots/scene603.js':'8d0083b3eba2083165bbf150fe7252215e8330559077923638c4cb00b62e355e'};
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
  selfTest();if(process.argv.includes('--self-test')){console.log('T619_SOURCE_GATE_SELF_TEST_OK');return;}
  const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:30000});
  assert.equal(git('rev-parse','HEAD^').trim(),BASE,'One diagnostic commit must directly descend from exact reviewed release head');
  assert.equal(git('rev-list','--parents','-n','1','HEAD').trim().split(/\s+/).length,2,'No additional merge parent');
  validateChanges(git('diff','--name-status','--no-renames',BASE,'HEAD'));
  for(const [file,expected]of Object.entries(PINS))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex'),expected,'Exact original source '+file);
  console.log('T619_EXACT_BASE_SOURCE_GATE_OK '+BASE);
}
module.exports={validateChanges,selfTest,BASE,ADDED,PINS};
if(require.main===module)main();
