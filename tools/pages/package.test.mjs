import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {buildMain,packageFile,verifyPackagedFile,PINS,SAVE_NAMESPACE,CACHE_PREFIX,CACHE_NAME,APP_VERSION,SOURCE_COMMIT} from './build-main.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const scratch=mkdtempSync(path.join(os.tmpdir(),'main-pages-contract-'));
const out=path.join(scratch,'site');
const manifest=buildMain({root:ROOT,out});
test('only seven verified runtime files are packaged; every change reverses to approved main bytes',()=>{
  assert.deepEqual(readdirSync(out).sort(),Object.keys(PINS).sort());
  for(const name of Object.keys(PINS))assert(verifyPackagedFile(name,readFileSync(path.join(out,name))));
  assert.equal(manifest.saveNamespace,SAVE_NAMESPACE);
  assert.equal(manifest.legacyCacheCleanup,false);
  assert.equal(manifest.sourceCommit,SOURCE_COMMIT);assert.equal(manifest.appVersion,APP_VERSION);
  assert.equal(CACHE_NAME,CACHE_PREFIX+'v'+APP_VERSION);
  assert.deepEqual(Object.keys(manifest.sourceBlobIds),Object.keys(PINS));
  for(const name of Object.keys(PINS))assert.equal(manifest.files[name].sourceSHA256,PINS[name]);
});
test('unapproved source and mutations beyond namespace fail closed',()=>{
  for(const [file,check,error] of [[path.join(ROOT,'index.html'),packageFile,/Unverified/],[path.join(out,'index.html'),verifyPackagedFile,/Unexpected/]]){
    const t=readFileSync(file,'utf8'),m=t.replace(/const GAME_VER='[\d.]+'/,"const GAME_VER='99.0'");
    assert.notEqual(m,t,'version mutation must change the bytes');
    assert.throws(()=>check('index.html',Buffer.from(m)),error);
  }
  assert.throws(()=>buildMain({root:ROOT,out}),/new or empty/);
  assert.throws(()=>buildMain({root:ROOT,out:ROOT}),/source root/);
});
test('missing input fails before creating any partial package',()=>{
  const root=path.join(scratch,'incomplete');mkdirSync(root);
  cpSync(path.join(ROOT,'index.html'),path.join(root,'index.html'));
  assert.throws(()=>buildMain({root,out:path.join(scratch,'failed')}));
  assert(!readdirSync(scratch).includes('failed'));
});
test('project manifest, registration and app shell remain relative and complete',()=>{
  const html=readFileSync(path.join(out,'index.html'),'utf8'),sw=readFileSync(path.join(out,'sw.js'),'utf8');
  const m=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8'));
  assert.equal(m.start_url,'./index.html');assert.equal(m.scope,'./');
  assert(html.includes("register('./sw.js',{scope:'./',updateViaCache:'none'})"));
  assert(html.includes(`const SAVEKEY='${SAVE_NAMESPACE}';`));
  assert(!html.includes("'glimmerville.v1'"));
  const paths=m.icons.map(i=>i.src);for(const n of paths)assert(n in PINS);
  assert(sw.includes(`const CACHE_PREFIX='${CACHE_PREFIX}';`));
});
function worker(code){
  const handlers={},calls={open:[],addAll:[],deleted:[],claimed:0,skip:0};
  const owned=[CACHE_PREFIX+'v0.0.1',CACHE_PREFIX+'v0.0.2'];
  const keep=['glimmerville-shell-v11.211','gv-v1','gv-v2','lab-shell-vT731','unrelated',CACHE_NAME];
  vm.runInNewContext(code,{URL,Set,Response,self:{location:new URL('https://lijiabao1998.github.io/GlimmerTown/sw.js'),registration:{scope:'https://lijiabao1998.github.io/GlimmerTown/'},addEventListener:(k,f)=>handlers[k]=f,skipWaiting:async()=>{calls.skip++;},clients:{claim:async()=>{calls.claimed++;}}},caches:{open:async k=>{calls.open.push(k);return{addAll:async a=>calls.addAll.push(Array.from(a))};},keys:async()=>[...owned,...keep],delete:async k=>{calls.deleted.push(k);return true;}}});
  return {handlers,calls,owned,keep};
}
async function event(fn){let pending;fn({waitUntil:p=>{pending=p;}});assert(pending);await pending;}
test('install owns only its cache and requires the full app shell',async()=>{
  const w=worker(readFileSync(path.join(out,'sw.js'),'utf8'));await event(w.handlers.install);
  assert.deepEqual(w.calls.open,[CACHE_NAME]);
  assert.deepEqual(w.calls.addAll,[['./index.html','./manifest.json','./icon.svg','./icon-v1-192.png','./icon-v1-512.png','./icon-v1-maskable-512.png']]);
  assert.equal(w.calls.skip,1);
});
test('activation deletes only old main-owned caches and preserves Lab plus legacy sentinels',async()=>{
  const w=worker(readFileSync(path.join(out,'sw.js'),'utf8'));await event(w.handlers.activate);
  assert.deepEqual(w.calls.deleted,w.owned);assert.equal(w.calls.claimed,1);
  for(const key of w.keep)assert(!w.calls.deleted.includes(key));
});
test('negative control: restoring legacy cleanup is detected by shared-origin sentinels',async()=>{
  const code=readFileSync(path.join(out,'sw.js'),'utf8').replace('const LEGACY_CACHES=new Set([]);',"const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);");
  const w=worker(code);await event(w.handlers.activate);
  assert(w.calls.deleted.includes('gv-v1')&&w.calls.deleted.includes('gv-v2'));
  assert.throws(()=>assert.deepEqual(w.calls.deleted,w.owned));
});
test('negative control: restoring shared save namespace is rejected by byte contract',()=>{
  const broken=readFileSync(path.join(out,'index.html'),'utf8').replace(`const SAVEKEY='${SAVE_NAMESPACE}';`,"const SAVEKEY='glimmerville.v1';");
  assert.throws(()=>verifyPackagedFile('index.html',Buffer.from(broken)),/packaged namespace/);
});
