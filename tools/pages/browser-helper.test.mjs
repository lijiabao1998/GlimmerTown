/** Node checks for browser evidence helpers. These do not run browser acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {instrumentWorker,storageProbeSource,foreignStorageFixture,assertFirstVisitEvidence,saveReloadObservation,browserLoadObservation,browserPrepareSave} from './browser-main.mjs';
import {packageFile,SAVE_NAMESPACE,APP_VERSION} from './build-main.mjs';

function probe(){
  // Real browser behavior is still gated separately in browser-main.mjs. This
  // minimal substitute verifies that the observer itself detects forbidden calls.
  class Storage {
    constructor(){this.values=new Map();}
    get length(){return this.values.size;}
    getItem(key){return this.values.get(String(key))??null;}
    setItem(key,value){this.values.set(String(key),String(value));}
    removeItem(key){this.values.delete(String(key));}
    clear(){this.values.clear();}
    key(index){return [...this.values.keys()][index]??null;}
  }
  const events=[],backing=new Storage();
  const ctx={Storage,location:{origin:'http://127.0.0.1:8893',href:'http://127.0.0.1:8893/GlimmerTown/bootstrap'},performance:{timeOrigin:123},localStorage:backing,__pagesStorageEvent:raw=>events.push(JSON.parse(raw))};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(storageProbeSource(ctx.location.origin),ctx);
  return {ctx,events,backing,read:code=>vm.runInContext(code,ctx),snapshot:()=>JSON.parse(JSON.stringify(ctx.__pagesStorageProbe.snapshot()))};
}

test('Node observer helper selects main slot before boot and seeds Lab once without hiding later access',()=>{
  const p=probe(),fixture=foreignStorageFixture();
  assert.equal(p.ctx.__swMainSlotBeforeBoot,'3');
  assert.equal(p.backing.getItem(SAVE_NAMESPACE+'.slot'),'3');
  assert.equal(p.ctx.__pagesStorageProbe.seed(fixture),true);
  assert.deepEqual(p.snapshot().foreign,fixture);
  assert.throws(()=>p.ctx.__pagesStorageProbe.seed(fixture),/Seed only/);
  assert.equal(p.events.filter(e=>e.foreign).length,0,'test fixture seeding is outside observed product calls');
  p.read("localStorage.getItem('glimmerville.v1.s1')");
  p.read("localStorage.setItem('glimmerville.v1.s2','wrong')");
  p.read("localStorage.removeItem('glimmerville.v1.s3')");
  assert.deepEqual(p.events.filter(e=>e.foreign).map(e=>e.operation),['getItem','setItem','removeItem']);
  assert.equal(p.snapshot().foreign['glimmerville.v1.s2'],'wrong');
  assert.equal(p.snapshot().foreign['glimmerville.v1.s3'],undefined);
});

test('Node observer helper catches property access, enumeration and clear, including calls through Storage.prototype',()=>{
  const p=probe();p.ctx.__pagesStorageProbe.seed(foreignStorageFixture());
  p.read("localStorage['glimmerville.v1.s1']");
  p.read("localStorage['glimmerville.v1.s2']='wrong'");
  p.read("delete localStorage['glimmerville.v1.s3']");
  p.read("Object.keys(localStorage)");
  p.read("Storage.prototype.getItem.call(localStorage,'glimmerville.v1.s1')");
  p.read('localStorage.clear()');
  const operations=p.events.filter(e=>e.foreign).map(e=>e.operation);
  for(const name of ['property-read','property-write','property-remove','enumerate','getItem','clear'])assert(operations.includes(name),name+' missing from observer');
  assert.deepEqual(p.snapshot().foreign,{});
});

test('Node instrumentation helper accepts only namespace-transformed pinned SW bytes',()=>{
  const raw=readFileSync(new URL('../../sw.js',import.meta.url));
  const sw=packageFile('sw.js',raw).toString('utf8');
  const output=instrumentWorker(sw);new Function(output);
  assert(output.includes("new URL('./__swmain_stage',self.location.href)"),'logging remains inside project subpath');
  assert.throws(()=>instrumentWorker(raw.toString('utf8')),/packaged namespace/);
  const mutated=sw.replace(/const APP_VER='[\d.]+';/,"const APP_VER='99.0';");
  assert.notEqual(mutated,sw);assert.throws(()=>instrumentWorker(mutated),/Unexpected/);
});

test('save fixture helper needs an explicit well-formed version equal to the running game (no default, no allowlist)',()=>{
  const run=(args,running=APP_VERSION)=>()=>new Function('GV','localStorage','args',`return (${browserPrepareSave.toString()})(...args);`)(
    {ver:()=>running,newWorldSeeded(){throw Error('fixture creation must not start');}},{getItem:()=>null},args);
  // Passing the version gate reaches the next gate (slot 3 not selected) without touching the game.
  assert.throws(run([SAVE_NAMESPACE,APP_VERSION]),/Select main slot 3/);
  for(const args of [[SAVE_NAMESPACE],[SAVE_NAMESPACE,undefined],[SAVE_NAMESPACE,''],[SAVE_NAMESPACE,Number(APP_VERSION)],
    [SAVE_NAMESPACE,'v'+APP_VERSION],[SAVE_NAMESPACE,APP_VERSION+' '],[SAVE_NAMESPACE,'99.0']])assert.throws(run(args),/Unexpected game version/);
  assert.throws(run([SAVE_NAMESPACE,APP_VERSION+'x'],APP_VERSION+'x'),/Unexpected game version/,'a malformed version is refused even when the game reports it');
});

test('first-visit evidence rejects worker-controlled, cached, stale, partial and unproven network loads',()=>{
  const url='http://127.0.0.1:8893/GlimmerTown/';
  const valid={beforeWorker:{registrations:[],controller:null},url,expectedSHA:'exact-package-sha',
    commit:{url},response:{url,type:'Document',status:200,fromServiceWorker:false,fromDiskCache:false,fromPrefetchCache:false},
    bodySHA256:'exact-package-sha',http:[{url,status:200,finishedAt:123}]};
  assert.doesNotThrow(()=>assertFirstVisitEvidence(valid));
  for(const mutate of [
    row=>row.beforeWorker.registrations.push(url),row=>row.beforeWorker.controller=url+'sw.js',
    row=>row.commit=null,row=>row.commit.parentId='subframe',row=>row.response.type='Other',
    row=>row.response.url+='index.html',row=>row.response.status=503,
    row=>row.response.fromServiceWorker=true,row=>delete row.response.fromServiceWorker,
    row=>row.response.fromDiskCache=true,row=>row.response.fromPrefetchCache=true,
    row=>row.bodySHA256='stale-body',row=>row.http=[],row=>row.http[0].abortedAt=122,
    row=>delete row.http[0].finishedAt
  ]){
    const broken=structuredClone(valid);mutate(broken);assert.throws(()=>assertFirstVisitEvidence(broken));
  }
});

test('browser source requires uncontrolled network first visit and app-managed precache before all seven controlled cases',()=>{
  const source=readFileSync(new URL('./browser-main.mjs',import.meta.url),'utf8');
  const validate=code=>{
    assert(!/navigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(/.test(code),'probe must never register a worker');
    const anchors=[
      'const firstVisitBefore = await ev(',
      "check(firstVisitBefore.registrations.length === 0 && firstVisitBefore.controller === null",
      "await send('Page.navigate', { url: firstVisitURL })",
      'const firstDocument = await identity(firstVisitURL, firstPrevious);',
      'assertFirstVisitEvidence(firstEvidence);',
      'const firstInstalledWorker = await ev(',
      "await verifyAllShellBodies('app-managed first install complete before controlled navigation or outage')",
      "await navigate('cold-online'"
    ];
    let previous=-1;
    for(const anchor of anchors){const at=code.indexOf(anchor);assert(at>previous,'missing/out-of-order first-visit gate: '+anchor);previous=at;}
    assert.equal((code.match(/await navigate\(/g)||[]).length,7,'retain the seven existing controlled game navigation cases');
  };
  validate(source);
  assert.throws(()=>validate(source.replace('const firstVisitBefore = await ev(',"await navigator.serviceWorker.register('/GlimmerTown/sw.js'); const firstVisitBefore = await ev(")),/never register/);
  const cacheGate="await verifyAllShellBodies('app-managed first install complete before controlled navigation or outage')";
  const moved=source.replace(cacheGate,'null').replace('const firstVisitBefore = await ev(',cacheGate+'; const firstVisitBefore = await ev(');
  assert.throws(()=>validate(moved),/out-of-order/);
});

test('reload diagnostics retain strict byte/core guards and distinguish JSON order, city loss, notification changes and failed loads',()=>{
  const expectedRaw='{"v":1,"money":2,"nl":[]}',expectedCore={money:2,day:1};
  const observe=actual=>saveReloadObservation({expectedRaw,expectedCore,actual:{loaded:true,raw:expectedRaw,core:expectedCore,...actual}});
  assert(observe({}).exactBytes&&observe({}).exactCore);
  const order=observe({raw:'{"nl":[],"money":2,"v":1}',core:{day:1,money:2}});
  assert(!order.exactBytes&&!order.exactCore);assert(order.parsedEqual&&order.coreValuesEqual);assert.deepEqual(order.changedFields,[]);
  const lost=observe({raw:'{"v":1,"money":0,"nl":[]}',core:{money:0,day:1}});
  assert(!lost.exactBytes&&!lost.exactCore&&!lost.parsedEqual);assert.deepEqual(lost.changedFields,['money']);
  assert.deepEqual(lost.fieldDifferences,[{key:'money',expected:2,actual:0}]);
  const notification=observe({raw:'{"v":1,"money":2,"nl":[{"d":1,"m":"unexpected"}]}'});
  assert(!notification.exactBytes);assert.deepEqual(notification.changedFields,['nl']);
  const failed=observe({loaded:false,raw:'bad-json',core:null,loadError:'load failure',coreError:'stats failure'});
  assert(!failed.loaded&&!failed.exactBytes&&!failed.exactCore);assert(failed.parseError);
  assert.equal(failed.loadError,'load failure');assert.equal(failed.coreError,'stats failure');assert.equal(failed.actualSHA256.length,64);
  const capture=new Function('GV',`return (${browserLoadObservation.toString()})();`)({
    load(){return false;},setSpeed(){},rawSave(){return 'broken-save';},stats(){throw Error('partial city');}
  });
  assert.equal(capture.raw,'broken-save');assert.equal(capture.loaded,false);assert.match(capture.coreError,/partial city/);
  const source=readFileSync(new URL('./browser-main.mjs',import.meta.url),'utf8');
  const observedAt=source.indexOf("report.saveChecks.push({phase:'rollback-reload-observation'");
  const checkedAt=source.indexOf('check(rollbackObservation.loaded && rollbackObservation.exactBytes && rollbackObservation.exactCore');
  assert(observedAt>=0&&checkedAt>observedAt);assert(source.slice(observedAt,checkedAt).includes('persist();'));
});
