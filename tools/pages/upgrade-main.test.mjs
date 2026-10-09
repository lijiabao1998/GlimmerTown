/** Upgrade contracts and real product save round-trip in the pinned Node DOM mock.
 * These tests do not launch Chrome or establish browser/OS offline evidence.
 */
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadVerifiedPackage,browserPrepareSave,browserLoadObservation,foreignStorageFixture} from './browser-main.mjs';
import {PINS,SAVE_NAMESPACE,CACHE_PREFIX,sha256} from './build-main.mjs';
import {options,upgradeFromMain,UPGRADE_SOURCE_PINS,assertUpgradeWorker,assertUpgradeCaches,assertUpgradeSave,assertUpgradeDocument,browserUpdateWorker,browserCityModel} from './published-main.mjs';

const pack=loadVerifiedPackage(process.env.PAGES_SITE),oldPack=upgradeFromMain(pack.files);after(()=>pack.cleanup());
const base='http://127.0.0.1:8933/GlimmerTown/',NS=SAVE_NAMESPACE,slot=NS+'.s3';
const foreignCaches=['gv-v1','gv-v2','glimmerville-shell-v11.211'];

test('upgrade is explicit, local-only, and reconstructs exact immutable T602 source with namespace substitutions only',()=>{
  assert.equal(options(['--upgrade-from-main']).upgradeFromMain,true);
  for(const args of [['--upgrade-from-main','--upgrade-from-main'],['--upgrade-from-main','--url=https://lijiabao1998.github.io/GlimmerTown/'],['--url=https://lijiabao1998.github.io/GlimmerTown/','--upgrade-from-main']])assert.throws(()=>options(args));
  const rawIndex=oldPack.files.get('index.html').toString().replace(`const SAVEKEY='${NS}';`,"const SAVEKEY='glimmerville.v1';");
  const rawWorker=oldPack.files.get('sw.js').toString().replace(`const CACHE_PREFIX='${CACHE_PREFIX}';`,"const CACHE_PREFIX='glimmerville-shell-';").replace('const LEGACY_CACHES=new Set([]);',"const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);");
  assert.equal(sha256(rawIndex),UPGRADE_SOURCE_PINS['index.html']);assert.equal(sha256(rawWorker),UPGRADE_SOURCE_PINS['sw.js']);
  assert.equal(sha256(oldPack.files.get('index.html')),'afa22141eade4c222d7cee48dcfb1ea815e6e47befc4b0206b9b2f614063d2db');
  assert.equal(sha256(oldPack.files.get('sw.js')),'7a6d32d4607c62d42f197950a6d54ac4d0febfc5de9bde27bb2c3a4f83221cff');
  for(const name of Object.keys(PINS).filter(name=>!['index.html','sw.js'].includes(name)))assert(oldPack.files.get(name).equals(pack.files.get(name)),name);
  for(const [name,bytes] of pack.files)assert(bytes.equals(readFileSync(path.join(pack.site,name))),'current package untouched: '+name);
});

test('upgrade reconstruction rejects wrong source versions, runtime drift, shared namespaces, missing and added files',()=>{
  const changed=(name,mutate)=>{const files=new Map(pack.files);files.set(name,Buffer.from(mutate(files.get(name).toString())));return files;};
  for(const files of [
    changed('index.html',value=>value.replace("const GAME_VER='11.212'","const GAME_VER='11.211'")),
    changed('sw.js',value=>value.replace("const APP_VER='11.212'","const APP_VER='11.211'")),
    changed('index.html',value=>value.replace(`const SAVEKEY='${NS}';`,"const SAVEKEY='glimmerville.v1';")),
    changed('sw.js',value=>value.replace('const LEGACY_CACHES=new Set([]);',"const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);")),
    changed('index.html',value=>value+'\n'),changed('manifest.json',value=>value+'\n'),
    new Map([...pack.files].filter(([name])=>name!=='icon.svg')),new Map([...pack.files,['unexpected.js',Buffer.from('')]])
  ])assert.throws(()=>upgradeFromMain(files));
});

const validWorker=()=>({ok:true,before:{version:'11.211',scope:base,controller:base+'sw.js',active:base+'sw.js',activeState:'activated',sameController:true,waiting:null,installing:null},
  updateCalled:true,updateReturned:true,sameRegistration:true,updateFound:1,controllerChanges:1,oldState:'redundant',activeState:'activated',replacedActive:true,replacedController:true,activeIsController:true,scope:base,active:base+'sw.js',controller:base+'sw.js',registrations:[base]});

test('worker receipt rejects same-worker reuse, no real update events, wrong version/scope and incomplete activation',()=>{
  assert.doesNotThrow(()=>assertUpgradeWorker(validWorker(),base));
  for(const mutate of [row=>row.ok=false,row=>row.before.version='11.212',row=>row.before.sameController=false,row=>row.before.waiting='installed',
    row=>row.before.installing='installing',row=>row.updateCalled=false,row=>row.updateReturned=false,row=>row.sameRegistration=false,
    row=>row.updateFound=0,row=>row.controllerChanges=0,row=>row.oldState='activated',row=>row.activeState='activating',
    row=>row.replacedActive=false,row=>row.replacedController=false,row=>row.activeIsController=false,
    row=>row.scope+='other/',row=>row.controller+='?rewrite',row=>row.registrations.push(base+'second/')]){
    const row=validWorker();mutate(row);assert.throws(()=>assertUpgradeWorker(row,base));
  }
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
    const row=await new Function('navigator','GV','setTimeout','clearTimeout','base',`return (${browserUpdateWorker.toString()})(base);`)(
      {serviceWorker},{ver:()=>mode==='wrong-version'?'11.212':'11.211'},(callback,ms)=>{assert.equal(ms,60000);return setTimeout(callback,30);},clearTimeout,base);
    return {row,updates};
  };
  const good=await run();assert.equal(good.updates,1);assertUpgradeWorker(good.row,base);assert(good.row.events.some(row=>row.kind==='updatefound'));
  const hang=await run('hang');assert.equal(hang.updates,1);assert.equal(hang.row.ok,false);assert.match(hang.row.error,/activation deadline/);
  const wrong=await run('wrong-version');assert.equal(wrong.updates,0);assert.equal(wrong.row.ok,false);
});

const validCache=()=>({names:[...foreignCaches,CACHE_PREFIX+'v11.212'],base,files:pack.files,
  cache:{name:CACHE_PREFIX+'v11.212',entries:[...pack.files].filter(([name])=>name!=='sw.js').map(([name,bytes])=>({url:base+name,method:'GET',status:200,bytes:bytes.length,sha256:sha256(bytes)}))}});

test('upgrade cache gate rejects old main cache survival, lost Lab caches, extra URLs and stale or incomplete shell bytes',()=>{
  assert.doesNotThrow(()=>assertUpgradeCaches(validCache()));
  for(const mutate of [row=>row.names.push(CACHE_PREFIX+'v11.211'),row=>row.names.shift(),row=>row.cache.missing=true,
    row=>row.cache.name=CACHE_PREFIX+'v11.211',row=>row.cache.entries.pop(),row=>row.cache.entries.push({...row.cache.entries[0]}),
    row=>row.cache.entries[0].url+='?extra',row=>row.cache.entries[0].method='POST',row=>row.cache.entries[0].status=503,
    row=>row.cache.entries[0].bytes--,row=>row.cache.entries[0].sha256=sha256(oldPack.files.get('index.html'))]){
    const row=validCache();mutate(row);assert.throws(()=>assertUpgradeCaches(row));
  }
});

test('upgrade reload provenance rejects cache, generated, uncontrolled and prefetched document responses',()=>{
  const row={status:200,fromServiceWorker:true,serviceWorkerResponseSource:'network',fromDiskCache:false,fromPrefetchCache:false};
  assert.doesNotThrow(()=>assertUpgradeDocument(row));
  for(const mutation of [{status:503},{fromServiceWorker:false},{fromDiskCache:true},{fromPrefetchCache:true},
    ...['cache-storage','http-cache','fallback-code',null].map(serviceWorkerResponseSource=>({serviceWorkerResponseSource}))])assert.throws(()=>assertUpgradeDocument({...row,...mutation}));
});

function validSave(){
  const oldRaw='{"v":1,"gameVer":"11.211","money":603000,"day":1,"ter":"222","bl":[]}',newRaw=oldRaw.replace('11.211','11.212');
  const oldCore={money:603000,day:1,buildings:0,roads:3,zones:0},oldModel={n:1,tiles:[[2,0,1,1,0]]};
  const beforeLoad={[NS+'.slot']:'3',[slot]:oldRaw,[slot+'_bak']:oldRaw,[NS+'.q']:'1'};
  const loaded={loaded:true,raw:oldRaw,core:oldCore,model:oldModel};
  const migrated={version:'11.212',raw:newRaw,core:oldCore,model:oldModel,main:{...beforeLoad,[slot]:newRaw}};
  const stable={...migrated,main:{...migrated.main,[slot+'_bak']:newRaw}};
  return structuredClone({oldRaw,oldCore,oldModel,beforeLoad,loaded,migrated,stable});
}

test('upgrade save gate permits only exact gameVer migration and rejects prior overwrite, data loss, model/core drift and extra mutations',()=>{
  assert.deepEqual(assertUpgradeSave(validSave()).changedFields,['gameVer']);
  for(const mutate of [row=>row.oldRaw=row.oldRaw.replace('11.211','11.210'),row=>row.beforeLoad[slot]=row.migrated.raw,
    row=>row.beforeLoad[slot+'_bak']='lost',row=>row.loaded.loaded=false,row=>row.loaded.raw=row.migrated.raw,
    row=>row.loaded.core={...row.loaded.core,money:1},row=>row.loaded.model={n:0,tiles:[]},
    row=>row.migrated.version='11.211',row=>row.migrated.raw=row.migrated.raw.replace('603000','603001'),
    row=>row.migrated.main[slot+'_bak']=row.migrated.raw,row=>row.migrated.main[NS+'.q']='0',
    row=>row.migrated.main[NS+'.s1']=row.migrated.raw,row=>row.stable.raw+=' ',row=>row.stable.main[slot+'_bak']='lost',
    row=>row.stable.model={n:0,tiles:[]},row=>row.stable.core={...row.stable.core,roads:2}]){
    const row=validSave();mutate(row);assert.throws(()=>assertUpgradeSave(row));
  }
});

test('real old game creates slot 3 and new game loads/resaves it with exact model/core and only gameVer changed',()=>{
  const root=fileURLToPath(new URL('../../',import.meta.url)),harness=readFileSync(path.join(root,'test_fixde.js'),'utf8');
  assert.equal(sha256(harness),'9d543c10e4dc2b00a686ef52ab3b1073bf1393f9cd8e8aa14c6d6583b9a10d98');
  const cut=harness.indexOf('// ---- 載入 index.html 中的 script ----');assert(cut>0);
  const foreign={...foreignStorageFixture(),'another-app.preference':'UPGRADE618 FOREIGN SENTINEL'};
  function boot(files,initial={}){
    const calls=[],host={require:createRequire(import.meta.url),__dirname:root,__filename:path.join(root,'test_fixde.js'),
      console:{log(){},warn(){},error(...args){throw Error(args.join(' '));}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},cancelAnimationFrame(){},requestAnimationFrame(){},performance:{now:()=>1},
      btoa,atob,URL,TextEncoder,TextDecoder,DOMException,Buffer,__initial:{...foreign,[NS+'.slot']:'3',...initial},__calls:calls};host.global=host;
    const scripts=[...files.get('index.html').toString().matchAll(/<script>([\s\S]*?)<\/script>/g)].map(row=>row[1]);assert(scripts.length);
    new Function(...Object.keys(host),harness.slice(0,cut)+`
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
  const old=boot(oldPack.files),prepared=old.run(browserPrepareSave,NS,'11.211'),oldState=old.savedState();old.isolated();
  assert.equal(oldState.raw,prepared.raw);assert.equal(oldState.main[slot+'_bak'],prepared.raw);
  assert.throws(()=>old.run(browserPrepareSave,NS,'11.212'),/Unexpected game version/);
  const current=boot(pack.files,old.store),beforeLoad=current.main();assert.deepEqual(beforeLoad,oldState.main);
  const loaded={...current.run(browserLoadObservation),model:current.run(browserCityModel)},migrated=current.savedState(),stable=current.savedState();
  const result=assertUpgradeSave({oldRaw:prepared.raw,oldCore:prepared.core,oldModel:oldState.model,beforeLoad,loaded,migrated,stable});
  assert.deepEqual(result.changedFields,['gameVer']);assert.equal(result.oldBytes,result.newBytes);current.isolated();
  const reopened=boot(pack.files,current.store),offlineLike=reopened.run(browserLoadObservation);
  assert.equal(offlineLike.loaded,true);assert.equal(offlineLike.raw,stable.raw);assert.deepEqual(offlineLike.core,prepared.core);assert.deepEqual(reopened.run(browserCityModel),oldState.model);reopened.isolated();
});

test('upgrade wiring preserves raw-worker installation, strict migration and existing new-process outage gates',()=>{
  const source=readFileSync(new URL('./published-main.mjs',import.meta.url),'utf8');
  assert(!/\.unregister\s*\(|Fetch\.(enable|fulfillRequest)|Network\.emulateNetworkConditions|instrumentWorker\(/.test(source));
  const sequence=['u.oldWorkerRequests=oldRequests','u.switchedAt=Date.now();servedFiles=pack.files','u.worker=await online.ev(',
    'assertUpgradeWorker(u.worker,base)','u.activatedMain=await online.ev(',"await shell(online,'new worker activation before reload')",
    'u.document=await navigate(online,base,','u.beforeLoadMain=beforeLoad','const loaded=await online.ev(',
    'const migrated=await online.ev(saveState)','u.save=assertUpgradeSave(','saved.raw=stable.raw',
    'await closeChrome(online,{requireClean:true})',"await launch('offline',proxyPort)",'report.offlineDocument=await navigate(',
    'report.reopenedSave=observation;persist();','offline live tile model must remain exact across versions','\n    assertOfflineEvidence({onlinePID'];
  let previous=-1;for(const anchor of sequence){const at=source.indexOf(anchor);assert(at>previous,'missing/out-of-order gate: '+anchor);previous=at;}
  assert(source.includes("report.upgrade.failedStage=report.upgrade.status"));
  assert(source.includes('deadline=started+14*60*1000'));assert(source.includes('fs.rmSync(profile,{recursive:true,force:true})'));
});
