/** Actual packaged game storage contracts with the original DOM/BOM mock prefix.
 * No full regression suite, user data, browser profile, runtime-file writes or pixels.
 * Run: node --test tools/pages/storage.test.mjs
 * Optional built artifact: PAGES_SITE=/absolute/package node --test ...
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {packageFile,verifyPackagedFile,SAVE_NAMESPACE,sha256} from './build-main.mjs';
import {browserPrepareSave,browserSaveRoundTrip} from './browser-main.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const NS=SAVE_NAMESPACE, SLOT=NS+'.s3', LAB='glimmerville.v1';
const rawHarness=readFileSync(path.join(ROOT,'test_fixde.js'),'utf8');
assert.equal(sha256(rawHarness),'1902144f494d16e143badcc943b6d738f53c889c1146768e6134b2df68e2cd30','approved original DOM harness');
const prefixEnd=rawHarness.indexOf('// ---- 載入 index.html 中的 script ----');
assert(prefixEnd>0);
const domPrefix=rawHarness.slice(0,prefixEnd);
const sourceHTML=readFileSync(path.join(ROOT,'index.html'));
const htmlBytes=process.env.PAGES_SITE?readFileSync(path.join(process.env.PAGES_SITE,'index.html')):packageFile('index.html',sourceHTML);
verifyPackagedFile('index.html',htmlBytes);
const html=htmlBytes.toString('utf8');
const fixtureDir=path.join(ROOT,'docs/tasks/t602-shots/fixtures');
const fixtureManifest=JSON.parse(readFileSync(path.join(fixtureDir,'manifest.json'),'utf8'));
const fixture=fixtureManifest.cities[0];
const fixtureRaw=readFileSync(path.join(fixtureDir,fixture.file),'utf8');
assert.equal(sha256(fixtureRaw),fixture.saveSHA256,'synthetic T602 fixture remains pinned');

function labSeeds(){
  return {
    [LAB]:fixtureRaw,
    [LAB+'.slot']:'3',
    [LAB+'.s1']:fixtureRaw,[LAB+'.s2']:fixtureRaw,[LAB+'.s3']:fixtureRaw,
    [LAB+'.s1_bak']:'lab-backup-1',[LAB+'.s2_bak']:'lab-backup-2',[LAB+'.s3_bak']:'lab-backup-3',
    [LAB+'.badge']:'0',[LAB+'.snd']:'2',[LAB+'.mute']:'1',[LAB+'.q']:'0',
    [LAB+'.msz']:'216',[LAB+'.nightcity']:'0',[LAB+'.ds']:'0',
    [LAB+'.viewRot']:'1',[LAB+'.scDone']:'["lab-only-synthetic"]',
    [LAB+'.no']:'sentinel',[LAB+'.rinf']:'1','another-app.preference':'preserve'
  };
}
const normalize=value=>JSON.parse(JSON.stringify(value));
const stats=G=>{
  const s=G.stats();return {money:s.money,day:s.day,pop:s.pop,buildings:s.buildings,roads:s.roads,zones:s.zones};
};
const codeFor=raw=>Buffer.from(raw,'utf8').toString('base64');

function boot({seed={},productHTML=html}={}){
  const initial={...labSeeds(),[NS+'.slot']:'3',[NS+'.badge']:'1',...seed};
  const logs=[],warnings=[],errors=[],timers=new Map();let timerID=0;
  const context={
    require:createRequire(import.meta.url),__dirname:ROOT,__filename:path.join(ROOT,'test_fixde.js'),
    console:{log(){},warn:(...args)=>warnings.push(args.map(String).join(' ')),error:(...args)=>errors.push(args.map(String).join(' '))},
    setTimeout:(fn,ms)=>{const id=++timerID;timers.set(id,{fn,ms});return id;},
    clearTimeout:id=>timers.delete(id),setInterval:()=>++timerID,clearInterval(){},cancelAnimationFrame(){},
    btoa,atob,URL,TextEncoder,TextDecoder,DOMException,Buffer,
    __initial:initial,__logs:logs
  };
  // A function scope keeps the original mock's global assignments off Node's global.
  // Native intrinsics avoid VM cross-context costs in the unchanged sprite boot.
  // Timers/rAF are inert; every storage call still executes real game code.
  context.global=context;
  const scripts=Array.from(productHTML.matchAll(/<script>([\s\S]*?)<\/script>/g),m=>m[1]);
  assert(scripts.length>0);
  const host={...context,requestAnimationFrame(){},performance:{now:()=>Date.now()},prompt:(...args)=>context.prompt?.(...args)};
  new Function(...Object.keys(host),domPrefix+`
    Object.assign(store,__initial);
    const trace=(op,key)=>__logs.push({op,key:String(key)});
    localStorage.getItem=k=>{trace('get',k);return store[k]===undefined?null:store[k];};
    localStorage.setItem=(k,v)=>{trace('set',k);store[k]=String(v);};
    localStorage.removeItem=k=>{trace('remove',k);delete store[k];};
    localStorage.clear=()=>{trace('clear','*');for(const k of Object.keys(store))delete store[k];};
    localStorage.key=i=>{trace('enumerate','*');return Object.keys(store)[i]??null;};
    Object.defineProperty(localStorage,'length',{get(){trace('enumerate','*');return Object.keys(store).length;}});
    global.__harness={store,elMap,window,localStorage};
    const AudioContext=window.AudioContext,webkitAudioContext=window.webkitAudioContext;
  `+scripts.join('\n'))(...Object.values(host));
  const H=context.__harness;
  assert.equal(typeof H.window.GV?.save,'function','actual game API boots');
  assert.equal(errors.length,0,'no game boot exception');
  const unchanged=()=>{
    for(const [key,value] of Object.entries(initial))if(key!==NS&&!key.startsWith(NS+'.'))assert.equal(H.store[key],value,'foreign value changed: '+key);
  };
  const isolated=()=>{
    assert.deepEqual(logs.filter(r=>r.key!==NS&&!r.key.startsWith(NS+'.')),[],'game accessed foreign storage');
    unchanged();
  };
  return {...H,G:H.window.GV,context,logs,warnings,errors,timers,initial,isolated,unchanged,
    snapshot:()=>normalize(H.store),
    exportCode(){
      let exported;context.prompt=(_message,value)=>{exported=value;return null;};
      H.elMap.get('bSave').onclick();
      const rows=H.elMap.get('infoBody').children,button=rows.at(-1).children[0];
      assert.equal(button.textContent,'匯出分享碼');button.click();
      assert.equal(typeof exported,'string');return exported;
    }
  };
}

test('cold game boot neither reads, migrates, writes nor deletes pre-existing Lab storage',()=>{
  const h=boot();h.isolated();
  assert.equal(h.store[NS],undefined);
  assert.equal(h.store[NS+'.slot'],'3');
  assert.equal(h.store[NS+'.s1'],undefined);assert.equal(h.store[NS+'.s2'],undefined);
  assert.equal(h.store[SLOT],undefined,'Lab valid slot must not silently become main save');
  assert(h.logs.some(r=>r.op==='get'&&r.key===NS),'own legacy lookup is still exercised');
});

test('main save/load and backup recovery affect only slot 3; slots 1/2 and preferences persist on fresh boot',()=>{
  const own={[NS+'.s1']:fixtureRaw,[NS+'.s2']:fixtureRaw,[NS+'.s1_bak']:'main-bak1',[NS+'.s2_bak']:'main-bak2',[NS+'.snd']:'0',[NS+'.viewRot']:'2',[NS+'.ds']:'0'};
  const h=boot({seed:own});h.G.newWorldSeeded(604);h.G.setSpeed(0);h.G.save();
  const first=h.store[SLOT],firstStats=stats(h.G);assert.equal(JSON.parse(first).seed,604);
  h.G.addMoney(777);h.G.save();assert.notEqual(h.store[SLOT],first);assert.equal(h.store[SLOT+'_bak'],first);
  h.store[SLOT]='garbage{{';assert.equal(h.G.load(),true);assert.deepEqual(stats(h.G),firstStats);
  h.G.save();const persisted=h.snapshot();h.isolated();
  for(const [key,value] of Object.entries(own))assert.equal(persisted[key],value);
  const reloaded=boot({seed:persisted});assert.equal(reloaded.G.load(),true);
  assert.deepEqual(stats(reloaded.G),firstStats);assert.equal(reloaded.G.rot(),2);
  assert.equal(reloaded.G.disasters().on,false);assert.equal(reloaded.elMap.get('bSound').textContent,'🔇');
  assert.equal(reloaded.store[NS+'.slot'],'3');reloaded.isolated();
});

test('old single-key migration is confined to its own main namespace and preserves selected slot',()=>{
  const h=boot({seed:{[NS]:fixtureRaw}});
  assert.equal(h.store[NS],undefined);assert.equal(h.store[NS+'.s1'],fixtureRaw);
  assert.equal(h.store[NS+'.slot'],'3');assert.equal(h.store[SLOT],undefined);
  assert(h.logs.some(r=>r.op==='remove'&&r.key===NS));h.isolated();
});

test('own legacy key never replaces an occupied main slot 1',()=>{
  const h=boot({seed:{[NS]:fixtureRaw,[NS+'.s1']:'existing-main-slot1'}});
  assert.equal(h.store[NS],fixtureRaw);assert.equal(h.store[NS+'.s1'],'existing-main-slot1');h.isolated();
});

test('invalid share codes leave main slot, backup and live city unchanged',()=>{
  const h=boot({seed:{[SLOT]:fixtureRaw}});assert.equal(h.G.load(),true);h.G.save();
  const before=h.snapshot(),state=stats(h.G);
  for(const code of ['', '%%%not-base64%%%',codeFor('{"v":2,"ter":"x"}'),codeFor('{"v":1,"n":72,"ter":"x"}'),'x'.repeat(2000001)]){
    assert.equal(h.G.importCode(code),false);assert.deepEqual(h.snapshot(),before);assert.deepEqual(stats(h.G),state);
  }
  h.isolated();
});

test('actual export-save-first flow and valid manual import restore city and keep overwritten slot as own backup',()=>{
  const h=boot({seed:{[SLOT]:fixtureRaw}});assert.equal(h.G.load(),true);h.G.save();
  const saved=h.store[SLOT],state=stats(h.G),code=h.exportCode();
  assert.equal(Buffer.from(code,'base64').toString('utf8'),saved,'real export button emits exact saved bytes');
  h.G.addMoney(500);h.G.save();const previous=h.store[SLOT];
  assert.equal(h.G.importCode(code),true);assert.equal(h.store[SLOT],saved);
  assert.equal(h.store[SLOT+'_bak'],previous);assert.deepEqual(stats(h.G),state);
  h.G.save();assert.equal(h.G.load(),true);assert.deepEqual(stats(h.G),state);h.isolated();
});

test('shape-valid but unreadable import rolls persisted main slot back; restored save remains loadable',()=>{
  const h=boot({seed:{[SLOT]:fixtureRaw}});assert.equal(h.G.load(),true);h.G.save();
  const previous=h.store[SLOT],state=stats(h.G),bad=JSON.parse(previous);delete bad.tre;
  assert.equal(h.G.importCode(codeFor(JSON.stringify(bad))),false);
  assert.equal(h.store[SLOT],previous);assert.equal(h.store[SLOT+'_bak'],previous);
  assert.equal(h.G.load(),true);assert.deepEqual(stats(h.G),state);h.isolated();
});

test('actual preference and scenario writes stay inside main namespace',()=>{
  const h=boot({seed:{[NS+'.snd']:'0',[NS+'.scDone']:'["synthetic-main"]'}});
  h.elMap.get('bSound').onclick();assert.equal(h.store[NS+'.snd'],'1');
  h.G.setRot(3);assert.equal(h.store[NS+'.viewRot'],'3');
  assert.equal(h.G.scDone()['synthetic-main'],1);h.G.clearScDone();assert.equal(h.store[NS+'.scDone'],undefined);
  h.isolated();
});

test('browser save/export/import helper logic also passes against actual game code under the Node DOM mock',async()=>{
  const h=boot(),doc=h.window.document;
  doc.getElementById=id=>h.elMap.get(id)??null;
  const originalQuery=doc.querySelectorAll;
  const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);
  doc.querySelectorAll=selector=>selector==='#infoBody button'?descendants(h.elMap.get('infoBody')).filter(e=>e.tagName==='button'):originalQuery(selector);
  h.window.__pagesStorageProbe={snapshot:()=>({main:Object.fromEntries(Object.entries(h.store).filter(([k])=>k===NS||k.startsWith(NS+'.')).sort(([a],[b])=>a.localeCompare(b)))})};
  h.context.prompt=(...args)=>h.window.prompt(...args);
  const invoke=fn=>new Function('GV','localStorage','document','navigator','window','namespace',`return (${fn.toString()})(namespace);`)(h.G,h.localStorage,doc,h.window.navigator,h.window,NS);
  const prepared=invoke(browserPrepareSave);assert.equal(prepared.placed,3);assert.equal(prepared.raw,h.store[SLOT]);
  const report=await invoke(browserSaveRoundTrip);
  assert.equal(report.captureKind,'prompt');assert.equal(h.store[SLOT],report.rawB);
  assert.equal(h.G.load(),true);assert.deepEqual(stats(h.G),{...report.coreB,pop:h.G.stats().pop});
  assert(report.checks.length>=15,'all browser save helper assertions execute');h.isolated();
});

test('negative control: shared-namespace regression is caught by real game read/write sentinels',()=>{
  const broken=html.replace(`const SAVEKEY='${NS}';`,`const SAVEKEY='${LAB}';`);
  assert.notEqual(broken,html);const h=boot({productHTML:broken});h.G.newWorldSeeded(999);h.G.save();
  assert(h.logs.some(r=>r.op==='get'&&r.key===LAB+'.slot'));
  assert(h.logs.some(r=>r.op==='set'&&r.key===LAB+'.s3'));
  assert.throws(h.isolated,/foreign storage/);assert.throws(h.unchanged,/foreign value changed/);
});

test('negative controls catch read-only cross-namespace access and deletion without requiring changed bytes',()=>{
  const h=boot();h.localStorage.getItem(LAB+'.s1');assert.throws(h.isolated,/foreign storage/);
  h.logs.length=0;h.localStorage.removeItem(LAB+'.s2');assert.throws(h.isolated,/foreign storage/);
});
