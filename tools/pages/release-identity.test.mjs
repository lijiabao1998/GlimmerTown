/** T627 release identity: current release from the commit, previous release from the live site,
 * and the negative controls showing every guard still bites (plan section 4, tests 1-10 and 13).
 * Temporary git repositories and injected live fetches only: no network, no runtime-file writes.
 * Run: node --test tools/pages/release-identity.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import identity from './release-identity.cjs';
import * as buildMain from './build-main.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const {RUNTIME_FILES,PAGES_BASE,SAVE_NAMESPACE,CACHE_PREFIX,sha256,gitBlobId}=identity;
const scratch=mkdtempSync(path.join(os.tmpdir(),'release-identity-'));
const emptyConfig=path.join(scratch,'empty.gitconfig');writeFileSync(emptyConfig,'');
// Fixture repositories ignore the developer's git configuration (autocrlf, hooks, templates).
const FIXTURE_GIT_ENV=(()=>{
  const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:emptyConfig,
    GIT_AUTHOR_NAME:'T627 fixture',GIT_AUTHOR_EMAIL:'fixture@t627.invalid',GIT_COMMITTER_NAME:'T627 fixture',GIT_COMMITTER_EMAIL:'fixture@t627.invalid'};
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE'])delete env[key];
  return env;
})();
// Calls into the module get an environment without CI or GitHub identity unless a test adds one.
const LOCAL_ENV=(()=>{const env={...process.env};for(const key of ['CI','GITHUB_ACTIONS','GITHUB_SHA','PAGES_PREV_COMMIT'])delete env[key];return env;})();
function g(dir,...args){
  const r=spawnSync('git',['-C',dir,...args],{env:FIXTURE_GIT_ENV,encoding:'utf8',windowsHide:true});
  if(r.status!==0)throw Error('fixture git '+args.join(' ')+': '+r.stderr);
  return r.stdout.trim();
}
const gitStatus=(dir,...args)=>spawnSync('git',['-C',dir,...args],{env:FIXTURE_GIT_ENV,windowsHide:true}).status;

// ---- Fixture: a miniature GlimmerTown history ----
const PNG=tag=>Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0xff]),Buffer.from('fixture-'+tag)]);
const LIVE_EXTRA='window.__noT596=0;window.__noT603=0;\n// replacement character kept in source: �\n';
function runtime(version,{indexExtra='',icon192='192'}={}){
  return {
    'index.html':`<!doctype html><script>\nconst SAVEKEY='glimmerville.v1';\nconst GAME_VER='${version}'; // fixture\n${indexExtra}</script>\n`,
    'sw.js':`const CACHE_PREFIX='glimmerville-shell-';\nconst APP_VER='${version}';\nconst CACHE=CACHE_PREFIX+'v'+APP_VER;\nconst LEGACY_CACHES=new Set(['gv-v1','gv-v2']);\n`,
    'manifest.json':'{"name":"fixture","start_url":"./index.html","scope":"./"}\n',
    'icon.svg':'<svg xmlns="http://www.w3.org/2000/svg"/>\n',
    'icon-v1-192.png':PNG(icon192),
    'icon-v1-512.png':PNG('512'),
    'icon-v1-maskable-512.png':PNG('maskable-512')
  };
}
const up=path.join(scratch,'upstream');mkdirSync(up);
g(up,'init','-q','-b','main');
g(up,'config','uploadpack.allowReachableSHA1InWant','true'); // as GitHub serves reachable commits by id
function commit(files,message){
  for(const [name,body] of Object.entries(files))writeFileSync(path.join(up,name),body);
  g(up,'add','--',...Object.keys(files));g(up,'commit','-q','-m',message);
  return g(up,'rev-parse','HEAD');
}
function branch(name,from,files,message){
  g(up,'checkout','-q','-b',name,from);const sha=commit(files,message);g(up,'checkout','-q','main');return sha;
}
const C={};
C.v10=commit({'.gitattributes':'* -text\n',...runtime('1.0')},'v1.0');
C.v11=commit(runtime('1.1',{indexExtra:LIVE_EXTRA}),'v1.1 (live)');
C.docs=commit({'README.md':'docs only\n'},'docs only');
C.side=branch('side',C.docs,runtime('1.5',{indexExtra:'// side-branch runtime\n'}),'side-branch runtime');
g(up,'merge','-q','--no-ff','-s','ours','--no-edit','side'); // side commit becomes a second parent only
C.main=g(up,'rev-parse','HEAD');
C.card=branch('card',C.main,runtime('1.2',{indexExtra:LIVE_EXTRA+'window.__noT699=0;window.__noT699=1;window.__noT62=0;\n'}),'card v1.2');
C.nobump=branch('nobump',C.main,{'index.html':runtime('1.1',{indexExtra:LIVE_EXTRA+'// one more byte\n'})['index.html']},'index changed without bump');
C.lower=branch('lower',C.main,runtime('1.0.9',{indexExtra:LIVE_EXTRA}),'lower version');
C.icon=branch('icon',C.main,{'icon-v1-192.png':PNG('192-redrawn')},'icon only');
C.badver=branch('badver',C.main,{'sw.js':runtime('1.3')['sw.js']},'APP_VER only');
C.stale=branch('stale',C.v10,{'NOTES.md':'branched before the live release\n'},'stale branch');
const work=path.join(scratch,'work');g(scratch,'clone','-q',up,work);
const at=ref=>{g(work,'checkout','-q','--detach',ref);return work;};

const liveOf=commitId=>identity.packageRelease(identity.releaseAt(work,commitId));
const LIVE=liveOf(C.v11);
const fetchFrom=(files,log=[])=>async name=>{log.push(name);assert(files.has(name),'unexpected live request '+name);return Buffer.from(files.get(name));};
const withFile=(files,name,bytes)=>new Map([...files].map(([n,b])=>[n,n===name?Buffer.from(bytes):b]));
function recorder(){
  const calls=[];
  return {calls,fetchGit:(root,args)=>{calls.push(args);identity.fetchGit(root,args);}};
}
const noDepth=calls=>calls.every(args=>!args.some(a=>a.startsWith('--depth')||a==='--unshallow'));
function fakeRelease(version,changes={}){
  const sourcePins=Object.fromEntries(RUNTIME_FILES.map(n=>[n,sha256(n+(changes[n]||''))]));
  return {version,sourcePins};
}

test('strict literals are unchanged and build-main re-exports the same namespace table',()=>{
  assert.deepEqual([...RUNTIME_FILES],['index.html','sw.js','manifest.json','icon.svg','icon-v1-192.png','icon-v1-512.png','icon-v1-maskable-512.png']);
  assert.equal(PAGES_BASE,'https://lijiabao1998.github.io/GlimmerTown/');
  assert.equal(SAVE_NAMESPACE,'glimmerville.main.v1');assert.equal(CACHE_PREFIX,'glimmerville-main-shell-');
  assert.deepEqual(JSON.parse(JSON.stringify(identity.substitutions)),{
    'index.html':[["const SAVEKEY='glimmerville.v1';","const SAVEKEY='glimmerville.main.v1';"]],
    'sw.js':[["const CACHE_PREFIX='glimmerville-shell-';","const CACHE_PREFIX='glimmerville-main-shell-';"],
      ["const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);","const LEGACY_CACHES=new Set([]);"]]});
  assert(Object.isFrozen(identity.substitutions)&&Object.isFrozen(identity.substitutions['sw.js'][1])&&Object.isFrozen(RUNTIME_FILES));
  assert.equal(buildMain.SAVE_NAMESPACE,SAVE_NAMESPACE);assert.equal(buildMain.CACHE_PREFIX,CACHE_PREFIX);
  assert.deepEqual(Object.keys(buildMain.PINS),[...RUNTIME_FILES]);
});

test('real checkout: derived pins equal build-main pins and both packagers give identical bytes',()=>{
  const cur=identity.currentRelease(ROOT);
  assert.deepEqual({...cur.sourcePins},{...buildMain.PINS});
  assert.equal(cur.cacheName,CACHE_PREFIX+'v'+cur.version);
  for(const name of RUNTIME_FILES){
    const packaged=identity.packageFile(name,cur.files.get(name),cur.sourcePins);
    assert(packaged.equals(buildMain.packageFile(name,cur.files.get(name))),name);
    assert(identity.verifyPackagedFile(name,packaged,cur.sourcePins));
    assert(identity.unpackageFile(name,packaged).equals(cur.files.get(name)),name);
  }
});

test('1. working tree must be a regular file byte-equal to the HEAD blob',t=>{
  at(C.main);
  const cur=identity.currentRelease(work,{env:LOCAL_ENV});
  assert.equal(cur.commit,C.main);assert.equal(cur.version,'1.1');assert.equal(cur.source,'HEAD');
  assert.equal(cur.cacheName,'glimmerville-main-shell-v1.1');
  for(const name of RUNTIME_FILES){
    assert.equal(cur.sourcePins[name],sha256(readFileSync(path.join(work,name))));
    assert.equal(cur.blobIds[name],g(work,'rev-parse',`HEAD:${name}`));
  }
  const manifest=path.join(work,'manifest.json');
  writeFileSync(manifest,readFileSync(manifest,'utf8').replace('fixture','fixturE'));
  assert.throws(()=>identity.currentRelease(work,{env:LOCAL_ENV}),/Runtime file differs from committed HEAD: manifest\.json/);
  g(work,'checkout','--','manifest.json');
  rmSync(path.join(work,'icon.svg'));
  assert.throws(()=>identity.currentRelease(work,{env:LOCAL_ENV}),/Runtime file differs from committed HEAD: icon\.svg/);
  g(work,'checkout','--','icon.svg');
  const png=path.join(work,'icon-v1-192.png');rmSync(png);mkdirSync(png);
  assert.throws(()=>identity.currentRelease(work,{env:LOCAL_ENV}),/Runtime file differs from committed HEAD: icon-v1-192\.png/);
  rmSync(png,{recursive:true});g(work,'checkout','--','icon-v1-192.png');
  const svg=path.join(work,'icon.svg'),copy=path.join(scratch,'icon-copy.svg');
  writeFileSync(copy,readFileSync(svg));rmSync(svg);
  let linked=true;try{symlinkSync(copy,svg,'file');}catch{linked=false;}
  if(linked)assert.throws(()=>identity.currentRelease(work,{env:LOCAL_ENV}),/Runtime file differs from committed HEAD: icon\.svg/);
  else t.diagnostic('symlink creation not permitted on this machine; same-bytes symlink case not exercised here');
  rmSync(svg,{force:true});g(work,'checkout','--','icon.svg');
  mkdirSync(path.join(work,'sub'),{recursive:true});
  assert.throws(()=>identity.currentRelease(path.join(work,'sub'),{env:LOCAL_ENV}),/top level/);
  assert.equal(identity.currentRelease(work,{env:LOCAL_ENV}).commit,C.main);
});

test('2. GITHUB_SHA must be the checked-out HEAD',()=>{
  at(C.main);
  assert.throws(()=>identity.currentRelease(work,{env:{...LOCAL_ENV,GITHUB_SHA:C.v11}}),/GITHUB_SHA .* does not match checked-out HEAD/);
  assert.throws(()=>identity.currentRelease(work,{env:{...LOCAL_ENV,GITHUB_SHA:''}}),/GITHUB_SHA  does not match checked-out HEAD/,'set but empty is still set');
  assert.equal(identity.currentRelease(work,{env:{...LOCAL_ENV,GITHUB_SHA:C.main}}).commit,C.main);
});

test('3. GAME_VER and APP_VER: each exactly once, well formed and equal',()=>{
  const idx=v=>`const SAVEKEY='glimmerville.v1';\nconst GAME_VER='${v}'; // c\n`,sw=v=>`const APP_VER='${v}';\nconst CACHE=CACHE_PREFIX+'v'+APP_VER;\n`;
  assert.equal(identity.parseVersion(idx('4.5'),sw('4.5')),'4.5');
  assert.equal(identity.parseVersion(Buffer.from(idx('4.5.6')),Buffer.from(sw('4.5.6'))),'4.5.6');
  assert.throws(()=>identity.parseVersion(idx('4.5'),sw('4.6')),/differ/);
  assert.throws(()=>identity.parseVersion(idx('4.5')+idx('4.5'),sw('4.5')),/exactly one index\.html GAME_VER/);
  assert.throws(()=>identity.parseVersion('const SAVEKEY=1;',sw('4.5')),/exactly one index\.html GAME_VER/);
  assert.throws(()=>identity.parseVersion(idx('4.5')+"const GAME_VER = '9.9';",sw('4.5')),/exactly one index\.html GAME_VER/);
  assert.throws(()=>identity.parseVersion(idx('4.5'),sw('4.5')+sw('4.5')),/exactly one sw\.js APP_VER/);
  assert.throws(()=>identity.parseVersion(idx('4.5'),'const CACHE=1;'),/exactly one sw\.js APP_VER/);
  assert.throws(()=>identity.parseVersion(idx('4.5'),"const APP_VER='4.5'\n"),/exactly one sw\.js APP_VER/);
  for(const bad of ['4','4.5.6.7','v4.5','4.5a',''])assert.throws(()=>identity.parseVersion(idx(bad),sw(bad)),/exactly one/,bad);
  assert.throws(()=>identity.releaseAt(work,C.badver),/GAME_VER and APP_VER differ: index\.html 1\.1, sw\.js 1\.3/);
});

test('4. runtime change needs a strictly higher version; order is numeric',()=>{
  for(const [lo,hi] of [[99,100],[9,10],[211,212],[212,213]]){
    assert.equal(identity.compareVersions(`11.${lo}`,`11.${hi}`),-1);assert.equal(identity.compareVersions(`11.${hi}`,`11.${lo}`),1);
  }
  assert.equal(identity.compareVersions('11.2','11.2.0'),0);assert.equal(identity.compareVersions('12.0','11.999.9'),1);
  for(const bad of ['11','11.x','1.2.3.4',' 1.2',undefined])assert.throws(()=>identity.compareVersions(bad,'1.0'),/Invalid version/);
  const live=identity.releaseAt(work,C.main);
  assert.throws(()=>identity.releaseDelta(live,identity.releaseAt(work,C.nobump)),/index\.html\), so the version must increase: 1\.1 -> 1\.1/);
  assert.throws(()=>identity.releaseDelta(live,identity.releaseAt(work,C.lower)),/version must increase: 1\.1 -> 1\.0\.9/);
  assert.throws(()=>identity.releaseDelta(fakeRelease('11.100'),fakeRelease('11.99',{'index.html':'x','sw.js':'x'})),/version must increase/);
  assert.deepEqual({...identity.releaseDelta(fakeRelease('11.99'),fakeRelease('11.100',{'index.html':'x','sw.js':'x'}))},
    {runtimeChanged:true,changedFiles:['index.html','sw.js'],previousVersion:'11.99',currentVersion:'11.100'});
  const card=identity.releaseDelta(live,identity.releaseAt(work,C.card));
  assert.equal(card.runtimeChanged,true);assert.deepEqual([...card.changedFiles],['index.html','sw.js']);
  const same=identity.releaseDelta(live,identity.releaseAt(work,C.v11));
  assert.equal(same.runtimeChanged,false);assert.deepEqual([...same.changedFiles],[]);
  assert.throws(()=>identity.releaseDelta(fakeRelease('1.0'),fakeRelease('1.1')),/Identical runtime with different versions/);
  assert.throws(()=>identity.releaseDelta({version:'1.0',sourcePins:{}},fakeRelease('1.0')),/lacks a source pin: index\.html/);
});

test('5. an icon change without a sw.js change is refused',()=>{
  assert.throws(()=>identity.releaseDelta(identity.releaseAt(work,C.main),identity.releaseAt(work,C.icon)),/icon-v1-192\.png\), so the version must increase/);
  // Even with a higher version (impossible from real files, where APP_VER lives in sw.js), sw.js must differ.
  assert.throws(()=>identity.releaseDelta(fakeRelease('1.0'),fakeRelease('1.1',{'icon-v1-192.png':'x'})),/but sw\.js did not/);
});

test('live release resolves to the newest first-parent main commit with the same seven blobs',async()=>{
  at(C.main);
  const log=[],rec=recorder();
  const prev=await identity.previousRelease(work,{fetchLive:fetchFrom(LIVE,log),env:LOCAL_ENV,fetchGit:rec.fetchGit});
  assert.equal(prev.commit,C.main,'newest match wins; the v1.1 commit itself is older with the same runtime');
  assert.equal(prev.source,'live');assert.equal(prev.version,'1.1');
  assert.deepEqual(log,[...RUNTIME_FILES]);assert.deepEqual(rec.calls,[]);
  for(const name of RUNTIME_FILES){
    assert.equal(prev.liveSHA256[name],sha256(LIVE.get(name)));
    assert(prev.packagedFiles.get(name).equals(LIVE.get(name)));
    assert(identity.verifyPackagedFile(name,LIVE.get(name),prev.sourcePins));
  }
  assert.equal(String(prev.readFile('README.md')),'docs only\n');
  const delta=identity.releaseDelta(prev,identity.currentRelease(work,{env:LOCAL_ENV}));
  assert.equal(delta.runtimeChanged,false);
  at(C.card);
  const fromCard=await identity.previousRelease(work,{fetchLive:fetchFrom(LIVE),env:LOCAL_ENV,fetchGit:rec.fetchGit});
  const cur=identity.currentRelease(work,{env:LOCAL_ENV});
  assert.equal(fromCard.commit,C.main);assert.equal(identity.releaseDelta(fromCard,cur).runtimeChanged,true);
  assert.deepEqual(identity.newEscapeFlags(fromCard.files.get('index.html'),cur.files.get('index.html')),['__noT699']);
  assert.deepEqual(rec.calls,[]);
});

test('6. live bytes matching no first-parent main commit, or only a side-branch commit, are refused',async()=>{
  at(C.main);
  assert.equal(gitStatus(work,'merge-base','--is-ancestor',C.side,'HEAD'),0,'side commit is an ancestor, so only the first-parent rule can refuse it');
  const side=liveOf(C.side),rec=recorder();
  await assert.rejects(identity.previousRelease(work,{fetchLive:fetchFrom(side),env:LOCAL_ENV,fetchGit:rec.fetchGit}),/Live release matches no first-parent commit on origin\/main/);
  assert.deepEqual(rec.calls,[['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']],'one plain refresh, never a depth fetch on a complete repository');
  const png=Buffer.from(LIVE.get('icon-v1-512.png'));png[png.length-1]^=1;
  await assert.rejects(identity.previousRelease(work,{fetchLive:fetchFrom(withFile(LIVE,'icon-v1-512.png',png)),env:LOCAL_ENV,fetchGit:rec.fetchGit}),/matches no first-parent commit/);
  assert(noDepth(rec.calls));assert.equal(g(work,'rev-parse','--is-shallow-repository'),'false');
});

test('7. a previous release that is not an ancestor of HEAD is refused',async()=>{
  at(C.stale);
  const rec=recorder();
  await assert.rejects(identity.previousRelease(work,{fetchLive:fetchFrom(LIVE),env:LOCAL_ENV,fetchGit:rec.fetchGit}),new RegExp(`Previous release ${C.main} is not an ancestor of HEAD ${C.stale}`));
  assert(noDepth(rec.calls));
});

test('8. packaged previous release must reproduce the live bytes exactly',async()=>{
  at(C.main);
  const index=LIVE.get('index.html'),fffd=Buffer.from('�');
  assert.equal(index.indexOf(fffd),index.lastIndexOf(fffd));assert(index.indexOf(fffd)>0);
  const lossy=Buffer.concat([index.subarray(0,index.indexOf(fffd)),Buffer.from([0xff]),index.subarray(index.indexOf(fffd)+fffd.length)]);
  // Decoding turns 0xFF back into U+FFFD, so the blob lookup really matches; only step 6 can refuse it.
  assert.equal(gitBlobId(identity.unpackageFile('index.html',lossy)),identity.releaseAt(work,C.main).blobIds['index.html']);
  await assert.rejects(identity.previousRelease(work,{fetchLive:fetchFrom(withFile(LIVE,'index.html',lossy)),env:LOCAL_ENV,fetchGit:recorder().fetchGit}),/Packaged previous release differs from live: index\.html/);
  // The same lossy byte is caught by verifyPackagedFile's byte round trip.
  assert.throws(()=>identity.verifyPackagedFile('index.html',lossy,identity.releaseAt(work,C.main).sourcePins),/Unexpected change outside namespace: index\.html/);
});

test('9. a missing or repeated namespace anchor in the live bytes is refused',async()=>{
  at(C.main);
  const text=name=>LIVE.get(name).toString('utf8');
  const cases=[
    ['index.html',text('index.html').replace(`const SAVEKEY='${SAVE_NAMESPACE}';`,"const SAVEKEY='glimmerville.v1';")],
    ['index.html',text('index.html')+`const SAVEKEY='${SAVE_NAMESPACE}';\n`],
    ['sw.js',text('sw.js').replace('const LEGACY_CACHES=new Set([]);',"const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);")],
    ['sw.js',text('sw.js').replace(`const CACHE_PREFIX='${CACHE_PREFIX}';`,"const CACHE_PREFIX='glimmerville-shell-';")]
  ];
  for(const [name,body] of cases){
    assert.notEqual(body,text(name));
    await assert.rejects(identity.previousRelease(work,{fetchLive:fetchFrom(withFile(LIVE,name,Buffer.from(body))),env:LOCAL_ENV,fetchGit:recorder().fetchGit}),
      new RegExp('Expected unique packaged namespace: '+name.replace('.','\\.')));
  }
  const empty=withFile(LIVE,'manifest.json',Buffer.alloc(0));
  await assert.rejects(identity.previousRelease(work,{fetchLive:fetchFrom(empty),env:LOCAL_ENV}),/Live file is empty: manifest\.json/);
});

test('10. PAGES_PREV_COMMIT is local-only and recorded as unverified',async()=>{
  at(C.card);
  const neverLive=async()=>{throw Error('override must not fetch the live site');};
  for(const ci of [{CI:'true'},{CI:'1'},{GITHUB_ACTIONS:'true'}])
    await assert.rejects(identity.previousRelease(work,{fetchLive:neverLive,env:{...LOCAL_ENV,...ci,PAGES_PREV_COMMIT:C.main}}),/local-only override and is refused under CI/);
  const prev=await identity.previousRelease(work,{fetchLive:neverLive,env:{...LOCAL_ENV,CI:'false',PAGES_PREV_COMMIT:C.main}});
  assert.equal(prev.source,'override-unverified');assert.equal(prev.commit,C.main);assert.equal(prev.liveSHA256,null);
  assert(prev.packagedFiles.get('index.html').equals(LIVE.get('index.html')));
  assert.equal((await identity.previousRelease(work,{fetchLive:neverLive,env:{...LOCAL_ENV,PAGES_PREV_COMMIT:C.main.slice(0,12)}})).commit,C.main);
  for(const bad of ['--upload-pack=x','HEAD~1',C.main.toUpperCase(),'zz'])
    await assert.rejects(identity.previousRelease(work,{fetchLive:neverLive,env:{...LOCAL_ENV,PAGES_PREV_COMMIT:bad}}),/lowercase hex commit id/,bad);
  at(C.stale);
  await assert.rejects(identity.previousRelease(work,{fetchLive:neverLive,env:{...LOCAL_ENV,PAGES_PREV_COMMIT:C.main}}),/is not an ancestor of HEAD/);
});

test('shallow CI checkout: history is deepened by the script itself and PREV is found',async()=>{
  const shallow=path.join(scratch,'shallow');
  g(scratch,'clone','-q','--depth=1','--branch','card','--no-tags',pathToFileURL(up).href,shallow);
  assert.equal(g(shallow,'rev-parse','--is-shallow-repository'),'true');
  assert.equal(gitStatus(shallow,'rev-parse','--verify','--quiet','refs/remotes/origin/main'),1);
  const rec=recorder();
  const prev=await identity.previousRelease(shallow,{fetchLive:fetchFrom(LIVE),env:LOCAL_ENV,fetchGit:rec.fetchGit});
  assert.equal(prev.commit,C.main);
  assert.deepEqual(rec.calls,[['fetch','--no-tags','--depth=100','origin','+refs/heads/main:refs/remotes/origin/main',C.card]]);
  const objects=path.join(scratch,'objects');
  g(scratch,'clone','-q','--depth=1','--branch','card','--no-tags',pathToFileURL(up).href,objects);
  const rec2=recorder();
  assert.equal(gitStatus(objects,'cat-file','-e',C.v10+'^{commit}'),128);
  identity.ensureObjects(objects,[C.v10],{fetchGit:rec2.fetchGit});
  assert.deepEqual(rec2.calls,[['fetch','--no-tags','--depth=1','origin',C.v10]]);
  assert.equal(identity.releaseAt(objects,C.v10).version,'1.0');
  assert.throws(()=>identity.ensureObjects(objects,[C.v10.slice(0,12)]),/full commit ids/);
});

test('complete repository: missing objects are fetched without --depth',()=>{
  const late=branch('late',C.main,{'NOTES.md':'pushed after the clone\n'},'late commit');
  const rec=recorder();
  assert.equal(gitStatus(work,'cat-file','-e',late+'^{commit}'),128);
  identity.ensureObjects(work,[C.main,late],{fetchGit:rec.fetchGit});
  assert.deepEqual(rec.calls,[['fetch','--no-tags','origin',late]]);
  assert.equal(g(work,'rev-parse','--is-shallow-repository'),'false');
});

test('live fetch: exact Pages URL, no-store, no redirects, 200 only, three tries',async()=>{
  const seen=[],sleep=async()=>{};
  const body=await identity.fetchLiveFile('sw.js',{sleep,fetchImpl:async(url,init)=>{seen.push({url,init});return new Response('worker');}});
  assert.equal(String(body),'worker');
  const url=new URL(seen[0].url);
  assert.equal(url.origin+url.pathname,PAGES_BASE+'sw.js');assert.deepEqual([...url.searchParams.keys()],['release-probe']);
  assert.match(url.searchParams.get('release-probe'),/^[0-9a-f-]{36}$/);
  assert.equal(seen[0].init.cache,'no-store');assert.equal(seen[0].init.redirect,'error');assert(seen[0].init.signal instanceof AbortSignal);
  let tries=0;const urls=new Set();
  const flaky=await identity.fetchLiveFile('index.html',{sleep,fetchImpl:async u=>{urls.add(u);if(++tries<3)throw Error('ECONNRESET');return new Response('page');}});
  assert.equal(String(flaky),'page');assert.equal(tries,3);assert.equal(urls.size,3,'fresh cache-busting nonce per try');
  for(const status of [203,404,500]){
    let n=0;
    await assert.rejects(identity.fetchLiveFile('icon.svg',{sleep,fetchImpl:async()=>{n++;return new Response('x',{status});}}),new RegExp(`after 3 tries: icon\\.svg: HTTP ${status}`));
    assert.equal(n,3);
  }
  await assert.rejects(identity.fetchLiveFile('icon.svg',{sleep,fetchImpl:async()=>({status:200,redirected:true,arrayBuffer:async()=>new ArrayBuffer(1)})}),/redirected/);
  await assert.rejects(identity.fetchLiveFile('../secret',{sleep,fetchImpl:async()=>new Response('x')}),/Not a runtime file/);
});

test('packaging needs explicit pins and rejects any change outside the namespace',()=>{
  const prev=identity.releaseAt(work,C.main);
  assert.throws(()=>identity.packageFile('index.html',prev.files.get('index.html')),/Source pins are required/);
  assert.throws(()=>identity.packageFile('README.md',Buffer.from('x'),{'README.md':sha256('x')}),/Unverified main source: README\.md/);
  assert.throws(()=>identity.packageFile('constructor',Buffer.from('x'),prev.sourcePins),/Unverified main source/);
  const changed=Buffer.from(prev.files.get('index.html').toString().replace("GAME_VER='1.1'","GAME_VER='9.0'"));
  assert(!changed.equals(prev.files.get('index.html')));
  assert.throws(()=>identity.packageFile('index.html',changed,prev.sourcePins),/Unverified main source: index\.html/);
  const packaged=identity.packageRelease(prev).get('index.html');
  const mutated=Buffer.from(packaged.toString().replace("GAME_VER='1.1'","GAME_VER='9.0'"));
  assert(!mutated.equals(packaged));
  assert.throws(()=>identity.verifyPackagedFile('index.html',mutated,prev.sourcePins),/Unexpected change outside namespace: index\.html/);
  assert.throws(()=>identity.verifyPackagedFile('README.md',Buffer.from('x'),prev.sourcePins),/Unexpected change outside namespace/);
  const png=Buffer.from(prev.files.get('icon-v1-192.png'));png[0]^=1;
  assert.throws(()=>identity.verifyPackagedFile('icon-v1-192.png',png,prev.sourcePins),/Unexpected change outside namespace/);
});

test('escape flags: only window.__noT### names new since PREV, T603 excluded',()=>{
  const prev='window.__noT596=0;window.__noT601=1;';
  const cur=prev+'window.__noT603=0;window.__noT699=0;if(window.__noT699)x();window.__noT700=1;window.__noT62=0;window.__noT6991x=0;window.__noT=1;';
  assert.deepEqual(identity.newEscapeFlags(prev,cur),['__noT699','__noT700']);
  assert.deepEqual(identity.newEscapeFlags(Buffer.from(cur),Buffer.from(cur)),[]);
});

test('releasePairSync resolves the pair in a child process and keeps every refusal',()=>{
  at(C.card);
  const env={...LOCAL_ENV,PAGES_PREV_COMMIT:C.main};
  const pair=identity.releasePairSync(work,{env});
  assert.equal(pair.current.commit,C.card);assert.equal(pair.current.version,'1.2');
  assert.equal(pair.previous.commit,C.main);assert.equal(pair.previous.source,'override-unverified');assert.equal(pair.previous.version,'1.1');
  assert.equal(pair.delta.runtimeChanged,true);assert.deepEqual(pair.newEscapeFlags,['__noT699']);
  assert.equal(JSON.parse(pair.previous.readFile('manifest.json')).name,'fixture');
  assert(pair.previous.files.get('index.html').equals(identity.releaseAt(work,C.main).files.get('index.html')));
  assert.throws(()=>identity.releasePairSync(work,{env:{...env,CI:'true'}}),/local-only override/);
  assert.throws(()=>identity.releasePairSync(work,{env:{...env,GITHUB_SHA:C.main}}),/GITHUB_SHA/);
  at(C.nobump);
  assert.throws(()=>identity.releasePairSync(work,{env}),/version must increase/);
});

test('13. harness DOM prefix: one anchor, pinned prefix bytes, free suffix',()=>{
  const real=readFileSync(path.join(ROOT,identity.HARNESS_FILE));
  const prefix=identity.harnessDomPrefix(ROOT);
  assert.equal(sha256(Buffer.from(prefix)),identity.HARNESS_DOM_PREFIX_SHA256);
  const anchor=Buffer.from(identity.HARNESS_DOM_ANCHOR),cut=real.indexOf(anchor);
  assert(cut>0);assert.equal(Buffer.byteLength(prefix),cut);
  const dir=path.join(scratch,'harness');mkdirSync(dir);
  const check=bytes=>{writeFileSync(path.join(dir,identity.HARNESS_FILE),bytes);return identity.harnessDomPrefix(dir);};
  assert.equal(check(Buffer.concat([real,Buffer.from('\n// appended suffix\n')])),prefix);
  const suffixEdit=Buffer.from(real);suffixEdit[cut+anchor.length+5]^=1;assert.equal(check(suffixEdit),prefix);
  for(const at of [0,100,cut-1]){
    const flipped=Buffer.from(real);flipped[at]^=1;
    assert.throws(()=>check(flipped),/Harness DOM prefix changed/,'byte '+at);
  }
  assert.throws(()=>check(Buffer.concat([real,Buffer.from('\n'),anchor,Buffer.from('\n')])),/exactly one harness DOM anchor/);
  assert.throws(()=>check(Buffer.concat([real.subarray(0,cut),real.subarray(cut+anchor.length)])),/exactly one harness DOM anchor/);
});

test.after(()=>rmSync(scratch,{recursive:true,force:true,maxRetries:3}));
