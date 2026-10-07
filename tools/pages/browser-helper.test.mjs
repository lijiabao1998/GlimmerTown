/** Node checks for browser evidence helpers. These do not run browser acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {instrumentWorker,storageProbeSource,foreignStorageFixture,assertFirstVisitEvidence} from './browser-main.mjs';
import {packageFile,SAVE_NAMESPACE} from './build-main.mjs';

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
  const mutated=sw.replace("const APP_VER='11.211';","const APP_VER='99.0';");
  assert.notEqual(mutated,sw);assert.throws(()=>instrumentWorker(mutated),/Unexpected/);
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
