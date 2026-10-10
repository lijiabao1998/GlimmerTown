/** Upgrade contracts and real product save round-trip in the pinned Node DOM mock.
 * These tests do not launch Chrome or establish browser/OS offline evidence.
 * T627: the old side is the release the live Pages site serves (release-identity R3), so loading
 * this file reads the live site and git; set PAGES_PREV_COMMIT only when offline (refused in CI).
 * With no runtime change the real-pair boot test is skipped with its reason, and a never-skipped
 * test proves that skip happens only when all seven source pins are equal. The frozen pair
 * 329f660 (live on 2026-10-07, 11.211) -> T603 4dd0fa4 always exercises the change path.
 */
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import identity from './release-identity.cjs';
import {loadVerifiedPackage,browserPrepareSave,browserLoadObservation,foreignStorageFixture} from './browser-main.mjs';
import {PINS,SAVE_NAMESPACE,CACHE_PREFIX,CACHE_NAME,APP_VERSION,SOURCE_COMMIT,sha256} from './build-main.mjs';
import {options,liveRelease,upgradePlan,upgradeSkipReason,UPGRADE_NOT_APPLICABLE,assertUpgradeWorker,assertUpgradeCaches,assertUpgradeSave,assertUpgradeDocument,browserUpdateWorker,browserCityModel} from './published-main.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const pack=loadVerifiedPackage(process.env.PAGES_SITE);after(()=>pack.cleanup());
const prev=await liveRelease(ROOT),plan=upgradePlan(pack.files,prev);
// The real-pair boot test's skip option; it may only ever come from the resolved pair's skipReason.
const bootSkip=pair=>pair.skipReason?`${pair.skipReason}: live ${pair.commit} (${pair.version}) has the same seven runtime files as ${pair.current.commit} (${pair.current.version})`:false;
const realBootSkip=bootSkip(prev);
const base='http://127.0.0.1:8933/GlimmerTown/',NS=SAVE_NAMESPACE,slot=NS+'.s3';
const foreignCaches=['gv-v1','gv-v2','glimmerville-shell-v11.211'];
// Synthetic receipts use fixed versions, independent of the network and of this release.
const OLD='1.0',NEW='1.1';
// Frozen history (R6): 329f660 is what Pages served on 2026-10-07 (package afa22141/7a6d32d4 from
// source b9190da5/836d1d86); 4dd0fa4 is the approved T603 runtime. Commit ids pin all their bytes.
const T602_LIVE_COMMIT='329f660e3d5f011ac28454cb6d6a68f8525c69cc',T603_COMMIT='4dd0fa4dfd27f56680e0d1b37e57842e90a45060';
const T602_SOURCE_SHA256={'index.html':'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265','sw.js':'836d1d867d10d6c63d71c722d3337e5b7119ad36006314f74872583ec029dd3b'};
const T602_LIVE_PACKAGE_SHA256={'index.html':'afa22141eade4c222d7cee48dcfb1ea815e6e47befc4b0206b9b2f614063d2db','sw.js':'7a6d32d4607c62d42f197950a6d54ac4d0febfc5de9bde27bb2c3a4f83221cff'};

test('upgrade is explicit, local-only, and starts from the exact release the live Pages site serves',t=>{
  assert.equal(options(['--upgrade-from-main']).upgradeFromMain,true);
  for(const args of [['--upgrade-from-main','--upgrade-from-main'],['--upgrade-from-main','--url=https://lijiabao1998.github.io/GlimmerTown/'],['--url=https://lijiabao1998.github.io/GlimmerTown/','--upgrade-from-main']])assert.throws(()=>options(args));
  assert.equal(prev.current.commit,SOURCE_COMMIT);assert.deepEqual({...prev.current.sourcePins},{...PINS});assert.equal(prev.current.version,APP_VERSION);
  const found=identity.releaseAt(ROOT,prev.commit);
  assert.deepEqual({...found.sourcePins},{...prev.sourcePins});assert.deepEqual({...found.blobIds},{...prev.blobIds});assert.equal(found.version,prev.version);
  assert.deepEqual([...prev.files.keys()].sort(),Object.keys(PINS).sort());
  for(const [name,bytes] of prev.files){
    assert.equal(identity.verifyPackagedFile(name,bytes,prev.sourcePins),true);
    assert(bytes.equals(identity.packageFile(name,found.files.get(name),found.sourcePins)),'previous package is its git release packaged: '+name);
    if(prev.source==='live')assert.equal(sha256(bytes),prev.liveSHA256[name],'previous package equals the live bytes: '+name);
  }
  if(prev.source!=='live'){assert.equal(prev.source,'override-unverified');assert.equal(prev.liveSHA256,null);}
  assert.equal(plan.oldFiles,prev.files);assert.equal(plan.newFiles,pack.files);assert.equal(plan.oldVersion,prev.version);assert.equal(plan.newVersion,APP_VERSION);
  for(const [name,bytes] of pack.files)assert(bytes.equals(readFileSync(path.join(pack.site,name))),'current package untouched: '+name);
  t.diagnostic(`previous ${prev.commit} (${prev.source}, ${prev.version}) -> current ${prev.current.commit} (${APP_VERSION}); changed: ${prev.delta.changedFiles.join(',')||'none'}; ${prev.skipReason||'applicable'}`);
});

test('upgrade pairing rejects wrong current versions, runtime drift, shared namespaces, missing/added files and an unverified old side',()=>{
  const changed=(files,name,mutate)=>{const out=new Map(files),before=out.get(name).toString(),value=mutate(before);assert.notEqual(value,before,'mutation must change '+name);out.set(name,Buffer.from(value));return out;};
  const wrongVersions=[...new Set([prev.version,'0.0.1'])].filter(version=>version!==APP_VERSION);assert(wrongVersions.length>0);
  for(const files of [
    ...wrongVersions.flatMap(version=>[changed(pack.files,'index.html',value=>value.replace(/const GAME_VER='[\d.]+'/,`const GAME_VER='${version}'`)),
      changed(pack.files,'sw.js',value=>value.replace(/const APP_VER='[\d.]+';/,`const APP_VER='${version}';`))]),
    changed(pack.files,'index.html',value=>value.replace(`const SAVEKEY='${NS}';`,"const SAVEKEY='glimmerville.v1';")),
    changed(pack.files,'sw.js',value=>value.replace('const LEGACY_CACHES=new Set([]);',"const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);")),
    changed(pack.files,'index.html',value=>value+'\n'),changed(pack.files,'manifest.json',value=>value+'\n'),
    new Map([...pack.files].filter(([name])=>name!=='icon.svg')),new Map([...pack.files,['unexpected.js',Buffer.from('')]])
  ])assert.throws(()=>upgradePlan(files,prev));
  const liveSHA256=Object.fromEntries([...prev.files].map(([name,bytes])=>[name,sha256(bytes)]));
  const drifted=changed(prev.files,'index.html',value=>value+'\n');
  for(const live of [
    {...prev,files:drifted},{...prev,files:drifted,source:'live',liveSHA256:{...liveSHA256,'index.html':sha256(drifted.get('index.html'))}},
    {...prev,files:changed(prev.files,'sw.js',value=>value.replace(`const CACHE_PREFIX='${CACHE_PREFIX}';`,"const CACHE_PREFIX='glimmerville-shell-';"))},
    {...prev,files:new Map([...prev.files].filter(([name])=>name!=='manifest.json'))},
    {...prev,source:'live',liveSHA256:{...liveSHA256,'sw.js':sha256('stale live body')}},
    {...prev,source:'override-unverified',liveSHA256},
    {...prev,version:'0.0.1'},
    {...prev,skipReason:prev.skipReason?null:UPGRADE_NOT_APPLICABLE}
  ])assert.throws(()=>upgradePlan(pack.files,live));
  assert.doesNotThrow(()=>upgradePlan(pack.files,prev));
});

test('upgrade skip happens only when all seven source pins are equal (never skipped)',()=>{
  const identical=identity.RUNTIME_FILES.every(name=>prev.sourcePins[name]===prev.current.sourcePins[name]);
  assert.equal(prev.delta.runtimeChanged,!identical);assert.equal(prev.skipReason,identical?UPGRADE_NOT_APPLICABLE:null);
  assert.equal(plan.skip,prev.skipReason);assert.equal(Boolean(realBootSkip),identical,'the real-pair boot test may be skipped only when all seven pins are equal');
  const pins=Object.fromEntries(identity.RUNTIME_FILES.map((name,i)=>[name,sha256('synthetic pin '+i)]));
  const release=(version,changes={})=>({version,sourcePins:{...pins,...changes}});
  assert.equal(upgradeSkipReason(release(OLD),release(OLD)),UPGRADE_NOT_APPLICABLE);
  assert.throws(()=>upgradeSkipReason(release(OLD),release(NEW)),/Identical runtime with different versions/);
  const pair=(previous,current)=>({...previous,commit:'synthetic-old',current:{...current,commit:'synthetic-new'},skipReason:upgradeSkipReason(previous,current)});
  assert(bootSkip(pair(release(OLD),release(OLD))),'identical pins skip the real boots');
  for(const name of identity.RUNTIME_FILES){
    const one={[name]:sha256('changed '+name)},changedPair=pair(release(OLD),release(NEW,{...one,'sw.js':sha256('changed sw.js with '+name)}));
    assert.equal(changedPair.skipReason,null,'a changed '+name+' is never skipped');assert.equal(bootSkip(changedPair),false,'the real boots run when '+name+' changed');
    assert.throws(()=>upgradeSkipReason(release(OLD),release(OLD,one)),/version must increase/,'a changed '+name+' without a version rise is refused, not skipped');
  }
});

const validWorker=()=>({ok:true,before:{version:OLD,scope:base,controller:base+'sw.js',active:base+'sw.js',activeState:'activated',sameController:true,waiting:null,installing:null},
  updateCalled:true,updateReturned:true,sameRegistration:true,updateFound:1,controllerChanges:1,oldState:'redundant',activeState:'activated',replacedActive:true,replacedController:true,activeIsController:true,scope:base,active:base+'sw.js',controller:base+'sw.js',registrations:[base]});

test('worker receipt rejects same-worker reuse, no real update events, wrong version/scope and incomplete activation',()=>{
  assert.doesNotThrow(()=>assertUpgradeWorker(validWorker(),base,OLD));
  for(const mutate of [row=>row.ok=false,row=>row.before.version=NEW,row=>row.before.sameController=false,row=>row.before.waiting='installed',
    row=>row.before.installing='installing',row=>row.updateCalled=false,row=>row.updateReturned=false,row=>row.sameRegistration=false,
    row=>row.updateFound=0,row=>row.controllerChanges=0,row=>row.oldState='activated',row=>row.activeState='activating',
    row=>row.replacedActive=false,row=>row.replacedController=false,row=>row.activeIsController=false,
    row=>row.scope+='other/',row=>row.controller+='?rewrite',row=>row.registrations.push(base+'second/')]){
    const row=validWorker();mutate(row);assert.throws(()=>assertUpgradeWorker(row,base,OLD));
  }
  for(const version of [undefined,'',NEW,'v'+OLD])assert.throws(()=>assertUpgradeWorker(validWorker(),base,version));
});

test('browser update helper observes distinct worker objects and times out a stalled update without unregistering',async()=>{
  const run=async(mode='success')=>{
    const old=Object.assign(new EventTarget(),{scriptURL:base+'sw.js',state:'activated'}),replacement=Object.assign(new EventTarget(),{scriptURL:base+'sw.js',state:'installing'});
    const registration=Object.assign(new EventTarget(),{scope:base,active:old,waiting:null,installing:null});
    const serviceWorker=Object.assign(new EventTarget(),{controller:old,getRegistration:async()=>registration,getRegistrations:async()=>[registration]});
    let updates=0;
    registration.update=()=>{
      updates++;if(mode==='hang')return new Promise(()=>{});
      queueMicrotask(()=>{
        registration.installing=replacement;registration.dispatchEvent(new Event('updatefound'));
        replacement.state='activated';registration.active=replacement;registration.installing=null;replacement.dispatchEvent(new Event('statechange'));
        old.state='redundant';old.dispatchEvent(new Event('statechange'));serviceWorker.controller=replacement;serviceWorker.dispatchEvent(new Event('controllerchange'));
      });return Promise.resolve(registration);
    };
    const row=await new Function('navigator','GV','setTimeout','clearTimeout','base','oldVersion',`return (${browserUpdateWorker.toString()})(base,oldVersion);`)(
      {serviceWorker},{ver:()=>mode==='wrong-version'?NEW:OLD},(callback,ms)=>{assert.equal(ms,60000);return setTimeout(callback,30);},clearTimeout,base,mode==='no-version'?undefined:OLD);
    return {row,updates};
  };
  const good=await run();assert.equal(good.updates,1);assertUpgradeWorker(good.row,base,OLD);assert(good.row.events.some(row=>row.kind==='updatefound'));
  const hang=await run('hang');assert.equal(hang.updates,1);assert.equal(hang.row.ok,false);assert.match(hang.row.error,/activation deadline/);
  const wrong=await run('wrong-version');assert.equal(wrong.updates,0);assert.equal(wrong.row.ok,false);
  const missing=await run('no-version');assert.equal(missing.updates,0);assert.equal(missing.row.ok,false);assert.match(missing.row.error,/explicit old release version/);
});

const validCache=()=>({names:[...foreignCaches,CACHE_NAME],base,files:pack.files,oldVersion:OLD,
  cache:{name:CACHE_NAME,entries:[...pack.files].filter(([name])=>name!=='sw.js').map(([name,bytes])=>({url:base+name,method:'GET',status:200,bytes:bytes.length,sha256:sha256(bytes)}))}});

test('upgrade cache gate rejects old main cache survival, lost Lab caches, extra URLs and stale or incomplete shell bytes',()=>{
  assert.doesNotThrow(()=>assertUpgradeCaches(validCache()));
  const stale=sha256(Buffer.concat([pack.files.get('index.html'),Buffer.from('\n')]));
  for(const mutate of [row=>row.names.shift(),row=>row.cache.missing=true,
    row=>row.cache.name=CACHE_PREFIX+'v'+OLD,row=>row.cache.entries.pop(),row=>row.cache.entries.push({...row.cache.entries[0]}),
    row=>row.cache.entries[0].url+='?extra',row=>row.cache.entries[0].method='POST',row=>row.cache.entries[0].status=503,
    row=>row.cache.entries[0].bytes--,row=>row.cache.entries[0].sha256=stale,
    row=>row.oldVersion=undefined,row=>row.oldVersion=APP_VERSION]){
    const row=validCache();mutate(row);assert.throws(()=>assertUpgradeCaches(row));
  }
  const survived=validCache();survived.names.push(CACHE_PREFIX+'v'+OLD);assert.throws(()=>assertUpgradeCaches(survived),/old main-owned version cache must be gone/);
});

test('upgrade reload provenance rejects cache, generated, uncontrolled and prefetched document responses',()=>{
  const row={status:200,fromServiceWorker:true,serviceWorkerResponseSource:'network',fromDiskCache:false,fromPrefetchCache:false};
  assert.doesNotThrow(()=>assertUpgradeDocument(row));
  for(const mutation of [{status:503},{fromServiceWorker:false},{fromDiskCache:true},{fromPrefetchCache:true},
    ...['cache-storage','http-cache','fallback-code',null].map(serviceWorkerResponseSource=>({serviceWorkerResponseSource}))])assert.throws(()=>assertUpgradeDocument({...row,...mutation}));
});

function validSave(oldVersion=OLD,newVersion=NEW){
  const oldRaw=`{"v":1,"gameVer":"${oldVersion}","money":603000,"day":1,"ter":"222","bl":[]}`,newRaw=oldRaw.replace(`"gameVer":"${oldVersion}"`,`"gameVer":"${newVersion}"`);
  const oldCore={money:603000,day:1,buildings:0,roads:3,zones:0},oldModel={n:1,tiles:[[2,0,1,1,0]]};
  const beforeLoad={[NS+'.slot']:'3',[slot]:oldRaw,[slot+'_bak']:oldRaw,[NS+'.q']:'1'};
  const loaded={loaded:true,raw:oldRaw,core:oldCore,model:oldModel};
  const migrated={version:newVersion,raw:newRaw,core:oldCore,model:oldModel,main:{...beforeLoad,[slot]:newRaw}};
  const stable={...migrated,main:{...migrated.main,[slot+'_bak']:newRaw}};
  return structuredClone({oldRaw,oldCore,oldModel,beforeLoad,loaded,migrated,stable,oldVersion,newVersion});
}

test('upgrade save gate permits only exact gameVer migration and rejects prior overwrite, data loss, model/core drift and extra mutations',()=>{
  assert.deepEqual(assertUpgradeSave(validSave()).changedFields,['gameVer']);
  const raw=(value,from,to)=>{const out=value.replace(from,to);assert.notEqual(out,value);return out;};
  for(const mutate of [row=>row.oldRaw=raw(row.oldRaw,`"gameVer":"${OLD}"`,'"gameVer":"0.9"'),row=>row.beforeLoad[slot]=row.migrated.raw,
    row=>row.beforeLoad[slot+'_bak']='lost',row=>row.loaded.loaded=false,row=>row.loaded.raw=row.migrated.raw,
    row=>row.loaded.core={...row.loaded.core,money:1},row=>row.loaded.model={n:0,tiles:[]},
    row=>row.migrated.version=OLD,row=>row.migrated.raw=raw(row.migrated.raw,'603000','603001'),
    row=>row.migrated.main[slot+'_bak']=row.migrated.raw,row=>row.migrated.main[NS+'.q']='0',
    row=>row.migrated.main[NS+'.s1']=row.migrated.raw,row=>row.stable.raw+=' ',row=>row.stable.main[slot+'_bak']='lost',
    row=>row.stable.model={n:0,tiles:[]},row=>row.stable.core={...row.stable.core,roads:2},
    row=>row.oldVersion=undefined,row=>row.newVersion=undefined,row=>row.newVersion=OLD,row=>row.newVersion='0.9',row=>row.oldVersion='0.9']){
    const row=validSave();mutate(row);assert.throws(()=>assertUpgradeSave(row));
  }
  // Self-consistent receipts that only fail the version rule: an upgrade must raise the version.
  for(const version of [OLD,'0.9'])assert.throws(()=>assertUpgradeSave(validSave(OLD,version)),/upgrade must raise the version/);
  assert.deepEqual(assertUpgradeSave(validSave('11.99','11.100')).changedFields,['gameVer']);
});

/** Boot the real old game, save slot 3 with it, then load and resave that save in the real new game. */
function upgradeBoots({oldFiles,newFiles,oldVersion,newVersion}){
  // Only the DOM/BOM mock prefix of test_fixde.js runs here; it is pinned by release-identity.
  const prefix=identity.harnessDomPrefix(ROOT);
  const foreign={...foreignStorageFixture(),'another-app.preference':'UPGRADE618 FOREIGN SENTINEL'};
  function boot(files,initial={}){
    const calls=[],host={require:createRequire(import.meta.url),__dirname:ROOT,__filename:path.join(ROOT,'test_fixde.js'),
      console:{log(){},warn(){},error(...args){throw Error(args.join(' '));}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},cancelAnimationFrame(){},requestAnimationFrame(){},performance:{now:()=>1},
      btoa,atob,URL,TextEncoder,TextDecoder,DOMException,Buffer,__initial:{...foreign,[NS+'.slot']:'3',...initial},__calls:calls};host.global=host;
    const scripts=[...files.get('index.html').toString().matchAll(/<script>([\s\S]*?)<\/script>/g)].map(row=>row[1]);assert(scripts.length);
    new Function(...Object.keys(host),prefix+`
      Object.assign(store,__initial);
      localStorage.getItem=k=>{__calls.push(k);return store[k]??null;};
      localStorage.setItem=(k,v)=>{__calls.push(k);store[k]=String(v);};
      localStorage.removeItem=k=>{__calls.push(k);delete store[k];};
      localStorage.clear=()=>{throw Error('unexpected clear');};
      localStorage.key=()=>{throw Error('unexpected enumeration');};
      global.__game={store,window,localStorage};
      const AudioContext=window.AudioContext,webkitAudioContext=window.webkitAudioContext;
    `+scripts.join('\n'))(...Object.values(host));
    const game=host.__game;
    const run=(fn,...args)=>new Function('GV','localStorage','args',`return (${fn.toString()})(...args);`)(game.window.GV,game.localStorage,args);
    const main=()=>Object.fromEntries(Object.entries(game.store).filter(([key])=>key===NS||key.startsWith(NS+'.')).sort(([a],[b])=>a.localeCompare(b)));
    const isolated=()=>{assert(calls.every(key=>key===NS||key.startsWith(NS+'.')),'no foreign storage call');for(const [key,value] of Object.entries(foreign))assert.equal(game.store[key],value);};
    const savedState=()=>{game.window.GV.save();const s=game.window.GV.stats();return {version:game.window.GV.ver(),raw:game.window.GV.rawSave(),main:main(),core:Object.fromEntries(['money','day','buildings','roads','zones'].map(key=>[key,s[key]])),model:run(browserCityModel)};};
    return {...game,run,main,isolated,savedState};
  }
  const old=boot(oldFiles),prepared=old.run(browserPrepareSave,NS,oldVersion),oldState=old.savedState();old.isolated();
  assert.equal(oldState.version,oldVersion,'old package boots the old release');
  assert.equal(oldState.raw,prepared.raw);assert.equal(oldState.main[slot+'_bak'],prepared.raw);
  assert.throws(()=>old.run(browserPrepareSave,NS,newVersion),/Unexpected game version/);
  const current=boot(newFiles,old.store),beforeLoad=current.main();assert.deepEqual(beforeLoad,oldState.main);
  const loaded={...current.run(browserLoadObservation),model:current.run(browserCityModel)},migrated=current.savedState(),stable=current.savedState();
  const result=assertUpgradeSave({oldRaw:prepared.raw,oldCore:prepared.core,oldModel:oldState.model,beforeLoad,loaded,migrated,stable,oldVersion,newVersion});
  assert.deepEqual(result.changedFields,['gameVer']);assert.equal(result.newBytes-result.oldBytes,newVersion.length-oldVersion.length);current.isolated();
  const reopened=boot(newFiles,current.store),offlineLike=reopened.run(browserLoadObservation);
  assert.equal(offlineLike.loaded,true);assert.equal(offlineLike.raw,stable.raw);assert.deepEqual(offlineLike.core,prepared.core);assert.deepEqual(reopened.run(browserCityModel),oldState.model);reopened.isolated();
  return result;
}

test('real live game creates slot 3 and this release loads/resaves it with exact model/core and only gameVer changed',{skip:realBootSkip},()=>{
  assert.equal(plan.skip,null);
  upgradeBoots(plan);
});

test('frozen pair: the 2026-10-07 live 329f660 package upgrades to the T603 runtime through the same live lookup and real boots',async t=>{
  identity.ensureObjects(ROOT,[T602_LIVE_COMMIT,T603_COMMIT]);
  const served=identity.packageRelease(identity.releaseAt(ROOT,T602_LIVE_COMMIT)),candidate=identity.releaseAt(ROOT,T603_COMMIT);
  for(const [name,hash] of Object.entries(T602_LIVE_PACKAGE_SHA256))assert.equal(sha256(served.get(name)),hash,'frozen 2026-10-07 live bytes: '+name);
  const env={...process.env};delete env.PAGES_PREV_COMMIT;
  const asked=[];
  const live=await liveRelease(ROOT,{env,current:candidate,fetchLive:async name=>{asked.push(name);return Buffer.from(served.get(name));}});
  assert.deepEqual(asked,[...identity.RUNTIME_FILES]);
  assert.equal(live.commit,T602_LIVE_COMMIT,'newest first-parent main commit carrying the live blobs');assert.equal(live.source,'live');assert.equal(live.version,'11.211');
  for(const name of ['index.html','sw.js']){
    assert.equal(live.sourcePins[name],T602_SOURCE_SHA256[name]);assert.equal(live.liveSHA256[name],T602_LIVE_PACKAGE_SHA256[name]);
    assert.equal(sha256(live.files.get(name)),T602_LIVE_PACKAGE_SHA256[name]);
  }
  assert.equal(live.current.commit,T603_COMMIT);
  assert.deepEqual({...live.delta,changedFiles:[...live.delta.changedFiles]},{runtimeChanged:true,changedFiles:['index.html','sw.js'],previousVersion:'11.211',currentVersion:candidate.version});
  assert.equal(identity.compareVersions(candidate.version,live.version),1);assert.equal(live.skipReason,null);assert.equal(bootSkip(live),false,'a real runtime change is never skipped');
  const frozen=upgradePlan(identity.packageRelease(candidate),live);
  assert.equal(frozen.skip,null);assert.equal(frozen.oldVersion,'11.211');assert.equal(frozen.newVersion,candidate.version);
  const result=upgradeBoots(frozen);
  t.diagnostic(`frozen pair ${T602_LIVE_COMMIT.slice(0,7)} ${frozen.oldVersion} (package ${sha256(frozen.oldFiles.get('index.html')).slice(0,8)}/${sha256(frozen.oldFiles.get('sw.js')).slice(0,8)}, source ${live.sourcePins['index.html'].slice(0,8)}) -> ${T603_COMMIT.slice(0,7)} ${frozen.newVersion}; save ${result.oldSHA256.slice(0,8)} -> ${result.newSHA256.slice(0,8)}`);
});

test('upgrade wiring preserves raw-worker installation, strict migration and existing new-process outage gates',()=>{
  const source=readFileSync(new URL('./published-main.mjs',import.meta.url),'utf8');
  assert(!/\.unregister\s*\(|Fetch\.(enable|fulfillRequest)|Network\.emulateNetworkConditions|instrumentWorker\(/.test(source));
  assert(!/upgradeFromMain\(|sourceBaseline603|native603/.test(source),'the old side is never a reconstruction');
  const sequence=['u.oldWorkerRequests=oldRequests','u.switchedAt=Date.now();servedFiles=pack.files','u.worker=await online.ev(',
    'assertUpgradeWorker(u.worker,base,oldPack.version)','u.activatedMain=await online.ev(',"await shell(online,'new worker activation before reload')",
    'u.document=await navigate(online,base,','u.beforeLoadMain=beforeLoad','const loaded=await online.ev(',
    'const migrated=await online.ev(saveState)','u.save=assertUpgradeSave(','saved.raw=stable.raw',
    'await closeChrome(online,{requireClean:true})',"await launch('offline',proxyPort)",'report.offlineDocument=await navigate(',
    'report.reopenedSave=observation;persist();','offline live tile model must remain exact across versions','\n    assertOfflineEvidence({onlinePID'];
  let previous=-1;for(const anchor of sequence){const at=source.indexOf(anchor);assert(at>previous,'missing/out-of-order gate: '+anchor);previous=at;}
  // Not applicable is decided from the resolved pair before any browser process exists.
  previous=-1;for(const anchor of ['const live=await liveRelease(ROOT),plan=upgradePlan(pack.files,live);','if(plan.skip){','return report;',
    'oldPack={files:plan.oldFiles',"assert.equal(process.platform,'darwin'","const online=await launch('online')"]){const at=source.indexOf(anchor);assert(at>previous,'missing/out-of-order upgrade start: '+anchor);previous=at;}
  // Every upgrade gate receives the resolved old version explicitly; none has a default.
  for(const call of ['(${JSON.stringify(base)},${JSON.stringify(oldPack.version)})`,90000)','assertUpgradeWorker(u.worker,base,oldPack.version)',
    'assertUpgradeCaches({names:u.cacheNames,cache:replacementCache,files:pack.files,base,oldVersion:oldPack.version})',
    'beforeLoad,loaded,migrated,stable,oldVersion:oldPack.version,newVersion:APP_VERSION})',
    "assertUpgradeCaches({names:await offline.ev('caches.keys()'),cache:report.shell.at(-1),files:pack.files,base,oldVersion:oldPack.version})"])assert.equal(source.split(call).length,2,'explicit old-version wiring: '+call);
  assert(source.includes("report.upgrade.failedStage=report.upgrade.status"));
  assert(source.includes('deadline=started+14*60*1000'));assert(source.includes('fs.rmSync(profile,{recursive:true,force:true})'));
});
