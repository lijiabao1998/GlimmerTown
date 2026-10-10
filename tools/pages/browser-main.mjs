/** Main Pages package acceptance, native macOS foreground CDP / Node 22+.
 * node tools/pages/browser-main.mjs --site=dist/main-pages --out=evidence/pages --port=8893
 * --check verifies package/source and instrumentation syntax without a browser.
 * Test-only storage observation and SW delay/failure controls are in memory.
 * Local same-origin /GlimmerTown/ simulation; no published HTTPS, art or FPS claim.
 * Browser worker-version update/replacement is not exercised by this harness.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildMain, verifyPackagedFile, PINS, SAVE_NAMESPACE, SOURCE_COMMIT, APP_VERSION, CACHE_NAME } from './build-main.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const arg = (name, fallback) => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const PROJECT = '/GlimmerTown/';
const CACHE = CACHE_NAME;
const FOREIGN_NAMESPACE = 'glimmerville.v1';
// Lab (shared-origin) sentinels: the historical Lab shell plus the Lab shell of this release's version.
const FOREIGN_CACHES = [...new Set(['gv-v1', 'gv-v2', 'glimmerville-shell-v11.211', 'glimmerville-shell-v' + APP_VERSION])];
const SHELL_FILES = Object.keys(PINS).filter(name => name !== 'sw.js');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function loadVerifiedPackage(selectedSite) {
  let temporary;
  try {
    const site = selectedSite ? path.resolve(selectedSite) : path.join(temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'town-pages-package-')), 'site');
    if (!selectedSite) buildMain({ root: ROOT, out: site });
    assert(fs.lstatSync(site).isDirectory() && !fs.lstatSync(site).isSymbolicLink(), 'site is a regular package directory');
    assert.deepEqual(fs.readdirSync(site).sort(), Object.keys(PINS).sort(), 'package contains exactly the seven runtime files');
    const files = new Map();
    for (const name of Object.keys(PINS)) {
      const file = path.join(site, name), stat = fs.lstatSync(file);
      assert(stat.isFile() && !stat.isSymbolicLink(), 'regular packaged runtime file: ' + name);
      const bytes = fs.readFileSync(file); verifyPackagedFile(name, bytes); files.set(name, bytes);
    }
    return { site, files, cleanup: () => { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); } };
  } catch (error) {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

export function foreignStorageFixture() {
  // Synthetic Lab data only. Include the old unslotted migration source and
  // all three slots/backups; main must not even read the old namespace.
  const suffixes = ['', '.slot', '.s1', '.s1_bak', '.s2', '.s2_bak', '.s3', '.s3_bak',
    '.snd', '.mute', '.ds', '.rinf', '.q', '.badge', '.nightcity', '.msz', '.viewRot',
    '.scDone', '.no', '.noSelfOutline434', '.wall439', '.noWallFlip441', '.noWallDepth448', '.noRoofStyle449'];
  return Object.fromEntries(suffixes.map(suffix => [FOREIGN_NAMESPACE + suffix,
    suffix === '.slot' ? '2' : JSON.stringify({ fixture: 'FAKE LAB DATA', key: suffix || 'legacy-save', sentinel: 603 })]).sort(([a], [b]) => a.localeCompare(b)));
}

function browserStorageProbe(origin, namespace, foreignNamespace) {
  if (location.origin !== origin) return;
  const target = window.localStorage, proto = Storage.prototype, events = [], methods = {};
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) methods[method] = proto[method];
  const foreign = key => key === foreignNamespace || key.startsWith(foreignNamespace + '.');
  const own = key => key === namespace || key.startsWith(namespace + '.');
  const snapshotEntries = filter => {
    const rows = [];
    for (let i = 0; i < target.length; i++) {
      const key = methods.key.call(target, i);
      if (filter(key)) rows.push([key, methods.getItem.call(target, key)]);
    }
    return Object.fromEntries(rows.sort(([a], [b]) => a.localeCompare(b)));
  };
  let proxy, sequence = 0, seeded = false;
  const record = (operation, key, detail = {}) => {
    const row = { id: performance.timeOrigin + ':' + (++sequence), operation, key,
      foreign: operation === 'clear' || operation === 'enumerate' || (typeof key === 'string' && foreign(key)),
      url: location.href, time: Date.now(), ...detail };
    events.push(row);
    if (typeof window.__pagesStorageEvent !== 'function') throw Error('Storage CDP binding is missing');
    window.__pagesStorageEvent(JSON.stringify(row));
  };
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
    Object.defineProperty(proto, method, { configurable: true, writable: true, value: function (...args) {
      const ours = this === target || this === proxy, receiver = ours ? target : this;
      if (ours && method !== 'key') record(method, method === 'clear' ? null : String(args[0]), method === 'setItem' ? { valueLength: String(args[1]).length } : {});
      const result = Reflect.apply(methods[method], receiver, args);
      if (ours && method === 'key') record('key', result);
      return result;
    } });
  }
  const bound = new Map();
  proxy = new Proxy(target, {
    get(object, key) {
      if (typeof key === 'string' && foreign(key)) record('property-read', key);
      const value = Reflect.get(object, key, object);
      if (typeof value !== 'function') return value;
      if (!bound.has(key) || bound.get(key).source !== value) bound.set(key, { source: value, value: value.bind(object) });
      return bound.get(key).value;
    },
    set(object, key, value) {
      if (typeof key === 'string') record('property-write', key, { valueLength: String(value).length });
      return Reflect.set(object, key, value, object);
    },
    deleteProperty(object, key) {
      if (typeof key === 'string') record('property-remove', key);
      return Reflect.deleteProperty(object, key);
    },
    defineProperty(object, key, descriptor) {
      if (typeof key === 'string') record('property-define', key);
      return Reflect.defineProperty(object, key, descriptor);
    },
    getOwnPropertyDescriptor(object, key) {
      if (typeof key === 'string' && foreign(key)) record('property-descriptor', key);
      return Reflect.getOwnPropertyDescriptor(object, key);
    },
    has(object, key) {
      if (typeof key === 'string' && foreign(key)) record('property-has', key);
      return Reflect.has(object, key);
    },
    ownKeys(object) { record('enumerate', null); return Reflect.ownKeys(object); }
  });
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => proxy });
  Object.defineProperty(window, '__pagesStorageProbe', { value: Object.freeze({
    snapshot: () => ({ foreign: snapshotEntries(foreign), main: snapshotEntries(own), events: events.slice() }),
    seed(values) {
      if (seeded || window.GV || Object.keys(snapshotEntries(foreign)).length) throw Error('Seed only an empty synthetic Lab namespace before game boot');
      for (const [key, value] of Object.entries(values)) {
        if (!foreign(key) || typeof value !== 'string') throw Error('Invalid synthetic Lab key');
        methods.setItem.call(target, key, value);
      }
      seeded = true; return true;
    }
  }) });
  // Select only this package's slot before any original product script runs.
  localStorage.setItem(namespace + '.slot', '3');
  window.__swMainSlotBeforeBoot = localStorage.getItem(namespace + '.slot');
}

export function storageProbeSource(origin) {
  return `(${browserStorageProbe.toString()})(${JSON.stringify(origin)},${JSON.stringify(SAVE_NAMESPACE)},${JSON.stringify(FOREIGN_NAMESPACE)});`;
}

async function browserForeignCacheSnapshot(names) {
  const existing = await caches.keys(), result = [];
  for (const name of [...names].sort()) {
    if (!existing.includes(name)) { result.push({ name, missing: true }); continue; }
    const cache = await caches.open(name), entries = [];
    for (const request of await cache.keys()) {
      const response = await cache.match(request), bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      entries.push({ url: request.url, method: request.method, requestHeaders: [...request.headers], status: response.status,
        statusText: response.statusText, headers: [...response.headers], bytes: bytes.byteLength,
        sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') });
    }
    result.push({ name, entries: entries.sort((a, b) => a.url.localeCompare(b.url)) });
  }
  return result;
}

export function browserPrepareSave(namespace, expectedVersion) {
  if (typeof expectedVersion !== 'string' || !/^\d+(?:\.\d+){1,2}$/.test(expectedVersion) || GV.ver() !== expectedVersion) throw Error('Unexpected game version before fixture creation');
  if (localStorage.getItem(namespace + '.slot') !== '3') throw Error('Select main slot 3 before creating a fixture');
  GV.newWorldSeeded(301); GV.setSpeed(0); GV.addMoney(603000);
  let placed = 0;
  for (let y = 4; y < GV.N() - 4 && placed < 3; y++) {
    for (let x = 4; x < GV.N() - 4 && placed < 3; x++) {
      const tile = GV.tile(x, y);
      if (tile.t === 2 && !tile.bld && !tile.road && GV.place('road', x, y)) placed++;
    }
  }
  if (placed !== 3) throw Error('Could not create the three-road synthetic city');
  GV.save();
  const raw = GV.rawSave(), data = GV.inflateSave(raw), stats = GV.stats();
  if (raw !== localStorage.getItem(namespace + '.s3') || data.v !== 1 || data.gameVer !== expectedVersion || data.ter.length !== data.n * data.n) throw Error('Real game did not save a valid main slot 3 city');
  return { raw, placed, seed: data.seed, size: data.n, core: Object.fromEntries(['money', 'day', 'buildings', 'roads', 'zones'].map(key => [key, stats[key]])) };
}

export async function browserSaveRoundTrip(namespace) {
  const checks = [], ensure = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  const key = namespace + '.s3', main = () => window.__pagesStorageProbe.snapshot().main;
  const encode = raw => btoa(unescape(encodeURIComponent(raw)));
  const core = () => { const stats = GV.stats(); return Object.fromEntries(['money', 'day', 'buildings', 'roads', 'zones'].map(name => [name, stats[name]])); };
  GV.setSpeed(0); GV.save();
  let before = main(), beforeCore = core();
  for (const [label, code] of [['malformed encoding', '%not-valid-base64%'], ['invalid shape', encode(JSON.stringify({ v: 1, n: 72, ter: '0' }))]]) {
    ensure(GV.importCode(code) === false, 'invalid import rejected: ' + label);
    ensure(JSON.stringify(main()) === JSON.stringify(before), 'invalid import leaves all main storage unchanged: ' + label);
    ensure(JSON.stringify(core()) === JSON.stringify(beforeCore), 'invalid import leaves live city unchanged: ' + label);
  }
  // This passes the shape gate, writes the candidate, then fails inside the
  // actual load() path. Test the product's primary-slot rollback, then reload
  // the restored primary immediately, before another browser frame can run.
  const broken = JSON.parse(GV.rawSave()); delete broken.tre;
  ensure(GV.importCode(encode(JSON.stringify(broken))) === false, 'shape-valid but unloadable import is rejected by actual load');
  ensure(GV.rawSave() === before[key] && localStorage.getItem(key + '_bak') === before[key], 'failed load rolls primary back and backs up the prior city');
  ensure(GV.load() === true, 'live city can reload the primary restored after import failure'); GV.setSpeed(0);
  ensure(JSON.stringify(core()) === JSON.stringify(beforeCore), 'restored live city matches the pre-import save');

  // Exercise the real ordinary export button; capture its clipboard/prompt
  // destination in this isolated test page without touching the OS clipboard.
  GV.save();
  const rawA = GV.rawSave(), coreA = core();
  let code, captureKind;
  const oldPrompt = window.prompt, clipboard = navigator.clipboard;
  const clipboardDescriptor = clipboard && Object.getOwnPropertyDescriptor(clipboard, 'writeText');
  let clipboardPatched = false;
  try {
    window.prompt = (message, value) => { ensure(message === '複製此分享碼', 'ordinary export prompt is the expected capture target'); code = value; captureKind = 'prompt'; return null; };
    if (clipboard) {
      Object.defineProperty(clipboard, 'writeText', { configurable: true, value: async value => { code = value; captureKind = 'clipboard-writeText'; } });
      clipboardPatched = true;
    }
    document.getElementById('bSave').click();
    const button = [...document.querySelectorAll('#infoBody button')].find(element => element.textContent === '匯出分享碼');
    ensure(!!button, 'actual ordinary export button exists in the slot panel'); button.click();
    await Promise.resolve();
  } finally {
    window.prompt = oldPrompt;
    if (clipboardPatched) {
      if (clipboardDescriptor) Object.defineProperty(clipboard, 'writeText', clipboardDescriptor);
      else delete clipboard.writeText;
    }
  }
  ensure(typeof code === 'string' && code.length > 0 && decodeURIComponent(escape(atob(code))) === rawA, 'actual game export contains byte-exact current main save');
  GV.addMoney(777); GV.save();
  const rawB = GV.rawSave(), coreB = core(), beforeValid = main();
  ensure(rawB !== rawA && coreB.money === coreA.money + 777, 'pre-import city differs from exported city');
  ensure(GV.importCode(code) === true, 'actual exported share code imports through GV.importCode'); GV.setSpeed(0);
  ensure(GV.rawSave() === rawA && localStorage.getItem(key + '_bak') === rawB, 'valid import preserves exact exported bytes and backs up the replaced main city');
  ensure(JSON.stringify(core()) === JSON.stringify(coreA), 'valid import restores exported city values');
  ensure(GV.importCode(encode(rawB)) === true, 'rollback imports the pre-import main city through GV.importCode'); GV.setSpeed(0);
  ensure(JSON.stringify(main()) === JSON.stringify(beforeValid), 'rollback restores all main keys and backup bytes exactly');
  ensure(JSON.stringify(core()) === JSON.stringify(coreB), 'rollback restores the pre-import live city values');
  // importShareCode() restores exact input bytes, then adds its normal success
  // notification to the live log. A real visibility/25-second save persists that
  // one entry. Save it explicitly so a later lifecycle save cannot move the
  // reload byte baseline; reject every other save-field change.
  const expectedReload = JSON.parse(rawB);
  ensure(Array.isArray(expectedReload.nl) && expectedReload.nl.length < 100, 'synthetic rollback log has room for exactly one import notification');
  expectedReload.nl.push({ d: expectedReload.day, m: '📥 匯入成功' });
  GV.save();
  const reloadRaw = GV.rawSave(), reloadCore = core();
  ensure(reloadRaw === JSON.stringify(expectedReload), 'explicit rollback save changes only the exact expected import-success notification');
  ensure(localStorage.getItem(key + '_bak') === rawB, 'explicit rollback save keeps the exact imported city as backup');
  ensure(JSON.stringify(reloadCore) === JSON.stringify(coreB), 'explicit rollback save preserves every checked live city value');
  return { checks, rawA, rawB, coreA, coreB, reloadRaw, reloadCore, captureKind, exportCode: code };
}

export function saveReloadObservation({expectedRaw,expectedCore,actual}) {
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  const equal = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
  const row = {
    loaded: actual.loaded, loadError: actual.loadError??null, coreError: actual.coreError??null,
    expectedSHA256: sha(expectedRaw), actualSHA256: sha(actual.raw),
    expectedBytes: Buffer.byteLength(expectedRaw), actualBytes: Buffer.byteLength(actual.raw),
    exactBytes: actual.raw === expectedRaw, expectedCore, actualCore: actual.core,
    exactCore: JSON.stringify(actual.core) === JSON.stringify(expectedCore), coreValuesEqual: equal(actual.core, expectedCore)
  };
  try {
    const before = JSON.parse(expectedRaw), after = JSON.parse(actual.raw);
    row.parsedEqual = equal(before, after);
    row.changedFields = Object.keys({...before, ...after}).filter(key => !equal(before[key], after[key]));
    row.fieldDifferences = row.changedFields.map(key => ({key, expected:before[key], actual:after[key]}));
  } catch (error) { row.parseError = String(error); }
  return row;
}

export function browserLoadObservation() {
  let loaded=false, loadError=null, core=null, coreError=null;
  try { loaded=GV.load(); GV.setSpeed(0); } catch (error) { loadError=String(error); }
  const raw=GV.rawSave();
  try { const stats=GV.stats(); core=Object.fromEntries(['money','day','buildings','roads','zones'].map(key=>[key,stats[key]])); }
  catch (error) { coreError=String(error); }
  return {loaded,raw,core,loadError,coreError};
}

export function assertFirstVisitEvidence({beforeWorker,url,expectedSHA,commit,response,bodySHA256,http}) {
  assert.deepEqual(beforeWorker.registrations, [], 'first visit must start without registered workers');
  assert.equal(beforeWorker.controller, null, 'first visit must start uncontrolled');
  assert(commit && commit.url === url && !commit.parentId, 'first top-level game document must commit');
  assert(response && response.type === 'Document' && response.url === url, 'first response belongs to the exact game document');
  assert.equal(response.status, 200, 'first document must receive HTTP 200');
  assert.equal(response.fromServiceWorker, false, 'first document must come from the network, not a worker');
  assert.equal(response.fromDiskCache, false, 'first document must not come from HTTP disk cache');
  assert.equal(response.fromPrefetchCache, false, 'first document must not come from prefetch cache');
  assert.equal(bodySHA256, expectedSHA, 'first network document must contain exact packaged bytes');
  assert(http.some(row => row.url === url && row.status === 200 && row.finishedAt && !row.abortedAt), 'origin server must finish the first game response successfully');
}

export function instrumentWorker(original) {
  verifyPackagedFile('sw.js', Buffer.from(original));
  const start = "  if(req.mode==='navigate'){";
  const end = "\n  if(url.pathname===new URL(MANIFEST_URL).pathname){";
  let lo = original.indexOf(start), hi = original.indexOf(end, lo);
  assert.equal(original.split(start).length, 2);
  assert.equal(original.split(end).length, 2);
  let block = original.slice(lo, hi);
  const change = (before, after) => {
    assert.equal(block.split(before).length, 2, `unique instrumentation anchor ${before}`);
    block = block.replace(before, after);
  };
  change(start, start + "\n    const probe={id:++__mainNav,url:url.href};__mainLog(probe,'navigate-enter');");
  change('        const fresh=await fetch(req);', "        __mainLog(probe,'fetch-begin');const fresh=await fetch(req);__mainLog(probe,'fetch-end',{status:fresh.status});");
  change('            const copy=fresh.clone();', "            const copy=fresh.clone();__mainLog(probe,'clone-end');");
  change('              .then(cache=>cache.put(INDEX_URL,copy))', `              .then(async cache=>{
                __mainLog(probe,'cache-open-end');__mainLog(probe,'cache-put-begin');
                const mode=url.searchParams.get('__swmain');
                if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,8000));
                if(mode==='fail')throw new DOMException('Controlled main cache.put rejection','QuotaExceededError');
                await cache.put(INDEX_URL,copy);__mainLog(probe,'cache-put-end');
              })`);
  change('              .catch(()=>{/* 快取額度／寫入失敗不應吞掉已成功的網路導航 */});', "              .catch(error=>{__mainLog(probe,'cache-error',{errorName:error.name});/* 快取額度／寫入失敗不應吞掉已成功的網路導航 */});");
  change('        return fresh;', "        __mainLog(probe,'reply-fresh');return fresh;");
  change('      }catch(err){', "      }catch(err){__mainLog(probe,'fetch-error',{errorName:err.name});");
  change('          const cache=await caches.open(CACHE);\n          const offline=await cache.match(INDEX_URL);\n          if(offline)return offline;', "          const cache=await caches.open(CACHE);__mainLog(probe,'offline-open-end');\n          const offline=await cache.match(INDEX_URL);__mainLog(probe,'offline-match-end',{hit:!!offline});\n          if(offline){__mainLog(probe,'reply-offline');return offline;}");
  change('    e.respondWith(response);', "    e.respondWith(response);__mainLog(probe,'respondWith-registered');");
  change('      e.waitUntil(response.then(()=>cacheWrite).catch(()=>{}));', "      e.waitUntil(response.then(()=>cacheWrite).catch(()=>{}));__mainLog(probe,'waitUntil-registered');");
  const header = `// Test-only observation: no awaited logging and no worker debugger attachment.
const __mainBoot=Date.now();let __mainSequence=0,__mainNav=0;
function __mainLog(nav,stage,detail={}){try{void fetch(new URL('./__swmain_stage',self.location.href),{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({boot:__mainBoot,sequence:++__mainSequence,navigation:nav.id,url:nav.url,time:Date.now(),stage,...detail})}).catch(()=>{});}catch(_){}}
`;
  const instrumented = header + original.slice(0, lo) + block + original.slice(hi);
  new Function(instrumented);
  return instrumented;
}

export async function run() {
  const PORT = Number(arg('port', 8893)), DEV = PORT + 1000;
  assert([PORT, DEV].every(p => Number.isInteger(p) && p >= 8129 && p <= 65535 && p !== 8199), 'isolated non-player ports required');
  const ORIGIN = `http://127.0.0.1:${PORT}`;
  const selectedOut = arg('out', undefined);
  const OUT = path.resolve(selectedOut || fs.mkdtempSync(path.join(os.tmpdir(), 'town-pages-evidence-')));
  const pack = loadVerifiedPackage(arg('site', undefined));
  const SITE = pack.site, html = pack.files.get('index.html'), sw = pack.files.get('sw.js').toString('utf8');
  if (OUT === SITE || OUT.startsWith(SITE + path.sep)) { pack.cleanup(); throw Error('Evidence output must be outside the runtime package'); }
  const packageIndexSHA = sha(html), packageSwSHA = sha(sw);
  fs.mkdirSync(OUT, { recursive: true });
  const instrumented = instrumentWorker(sw);
  fs.writeFileSync(path.join(OUT, 'sw-main-instrumented.txt'), instrumented);
  const report = {
    status: 'running', scope: 'Local same-origin /GlimmerTown/ Pages package simulation; no real published HTTPS verification, renderer or art changes',
    browserWorkerVersionUpdate: 'not-run; cache-version activation behavior is covered only by separate Node contracts',
    sourceCommit: SOURCE_COMMIT, node: process.version, site: SITE, origin: ORIGIN, projectPath: PROJECT, saveNamespace: SAVE_NAMESPACE, cacheName: CACHE,
    appVersion: APP_VERSION, sourceIndexSHA256: PINS['index.html'], sourceSwSHA256: PINS['sw.js'], packageFiles: Object.fromEntries([...pack.files].map(([name, bytes]) => [name, { bytes: bytes.length, sha256: sha(bytes) }])),
    indexSHA256: packageIndexSHA, productSwSHA256: packageSwSHA, instrumentedSwSHA256: sha(instrumented),
    instrumentation: 'Verified package served unchanged except an in-memory SW observation copy. Before-boot localStorage observation, non-awaited SW stage logging, controlled delayed/rejected cache write and origin-entry transport outage. No physical-device FPS claim.',
    checks: [], stages: [], http: [], transport: [], cases: [], exceptions: [], consoleErrors: [], foreground: [], identityObservations: [], storageEvents: [], isolation: [], saveChecks: []
  };
  const persist = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(report, null, 2));
  const check = (value, message) => { assert(value, message); report.checks.push(message); persist(); };
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'town-main-pages-profile-'));
  const storageEventIDs = new Set();
  const recordStorage = row => {
    assert(row && typeof row.id === 'string' && typeof row.operation === 'string');
    if (!storageEventIDs.has(row.id)) { storageEventIDs.add(row.id); report.storageEvents.push(row); }
  };
  let blockEntry = false, server, browser, ws, chromeLog = '', browserClosed;
  const sockets = new Set(), pending = new Map();
  const assets = new Map([
    ...[...pack.files].map(([name, bytes]) => [PROJECT + name, bytes]),
    [PROJECT + 'sw.js', Buffer.from(instrumented)],
    [PROJECT + '__swmain_bootstrap.html', Buffer.from('<!doctype html><title>Isolated main Pages setup</title>')]
  ]);
  try {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, ORIGIN), route = url.pathname;
      if (route === PROJECT + '__swmain_stage' && req.method === 'POST') {
        let body = '';
        req.on('data', bytes => { body += bytes; if (body.length > 4096) req.destroy(); });
        req.on('end', () => {
          try {
            const row = JSON.parse(body);
            assert(Number.isInteger(row.sequence) && Number.isInteger(row.navigation) && Number.isFinite(row.time));
            assert(typeof row.url === 'string' && row.url.startsWith(ORIGIN + '/'));
            report.stages.push({ ...row, receivedAt: Date.now() }); persist(); res.writeHead(204).end();
          } catch { res.writeHead(400).end(); }
        }); return;
      }
      const entry = route === PROJECT || route === PROJECT + 'index.html';
      const row = { url: url.href, startedAt: Date.now() }; report.http.push(row);
      if (entry && blockEntry) {
        row.abortedAt = Date.now(); row.reason = 'Controlled origin entry transport cutoff before response';
        persist(); req.socket.destroy(); return;
      }
      const data = assets.get(entry ? PROJECT + 'index.html' : route);
      if (!data) { row.status = 404; res.writeHead(404).end(); return; }
      const marker = entry ? (url.searchParams.get('__swmain') || 'clean-online') : undefined;
      const type = route.endsWith('.js') ? 'application/javascript' : route.endsWith('.json') ? 'application/json' : route.endsWith('.svg') ? 'image/svg+xml' : route.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8';
      res.once('finish', () => { row.finishedAt = Date.now(); row.status = res.statusCode; if (marker) row.marker = marker; persist(); });
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', ...(marker ? { 'x-sw-main-probe': marker } : {}) });
      res.end(data);
    });
    server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', resolve); });
    const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
    check(chrome, 'installed Chrome/Chromium exists'); report.chromePath = chrome;
    check(process.platform === 'darwin', 'native foreground PWA probe requires the standard macOS desktop runner');
    report.presentation = { platform: process.platform, headless: false, graphics: 'default', purpose: 'Functional rAF-driven startup only; no physical-device FPS claim or display-mode change' };
    browser = spawn(chrome, [ '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--mute-audio', '--window-size=800,600', '--disk-cache-size=1048576', `--user-data-dir=${profile}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    browserClosed = new Promise(resolve => browser.once('close', resolve));
    browser.stderr.on('data', bytes => { chromeLog = (chromeLog + bytes).slice(-12000); });
    browser.on('error', error => { chromeLog += String(error); });
    let debuggerURL;
    for (let i = 0; i < 120 && !debuggerURL; i++) {
      if (browser.exitCode !== null || browser.signalCode !== null) throw Error('Browser exited: ' + chromeLog);
      try { debuggerURL = (await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json())).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
      if (!debuggerURL) await sleep(250);
    }
    check(debuggerURL, 'isolated native CDP target available');
    ws = new WebSocket(debuggerURL); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextID = 0;
    ws.onmessage = event => {
      const message = JSON.parse(event.data), p = message.params || {};
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id); clearTimeout(task.timer); pending.delete(message.id);
        message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result);
      } else if (message.method === 'Runtime.bindingCalled' && p.name === '__pagesStorageEvent') {
        try { recordStorage(JSON.parse(p.payload)); persist(); }
        catch (error) { report.exceptions.push('Storage observer event: ' + String(error)); }
      } else if (message.method === 'Runtime.exceptionThrown') {
        report.exceptions.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text);
      } else if (message.method === 'Runtime.consoleAPICalled' && p.type === 'error') {
        report.consoleErrors.push(p.args.map(a => a.value ?? a.description).join(' '));
      } else if (['Page.frameNavigated', 'Network.responseReceived', 'Network.loadingFailed'].includes(message.method)) {
        const url = p.frame?.url || p.response?.url;
        report.transport.push({ method: message.method, time: Date.now(), url, requestId: p.requestId, frameId: p.frame?.id || p.frameId, parentId: p.frame?.parentId, type: p.type, status: p.response?.status, fromServiceWorker: p.response ? (p.response.fromServiceWorker ?? false) : undefined, fromDiskCache: p.response ? (p.response.fromDiskCache ?? false) : undefined, fromPrefetchCache: p.response ? (p.response.fromPrefetchCache ?? false) : undefined, marker: p.response?.headers?.['x-sw-main-probe'], errorText: p.errorText });
        persist();
      }
    };
    const send = (method, params = {}, timeoutMs = 150000) => new Promise((resolve, reject) => {
      const id = ++nextID;
      const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, timeoutMs);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    const ev = async (expression, timeoutMs = 150000) => {
      const value = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeoutMs);
      if (value.exceptionDetails) throw Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
      return value.result.value;
    };
    const budget = (deadline, cap = 5000) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw Error('Foreground/boot observation deadline reached');
      return Math.min(cap, remaining);
    };
    const readDocument = (timeoutMs = 150000) => ev(`(()=>{const bootState=window.__boot426?.()??null;return {url:location.href,timeOrigin:performance.timeOrigin,readyState:document.readyState,complete:document.readyState==='complete',version:window.GV?.ver?.()??null,boot:bootState?.ready??false,bootState,visibility:document.visibilityState,hidden:document.hidden,focused:document.hasFocus(),viewport:{innerWidth,innerHeight,outerWidth,outerHeight,screenX,screenY,availLeft:screen.availLeft,availTop:screen.availTop,availWidth:screen.availWidth,availHeight:screen.availHeight,dpr:devicePixelRatio},slot:localStorage.getItem('${SAVE_NAMESPACE}.slot'),slotBeforeBoot:window.__swMainSlotBeforeBoot??null,otherSlots:[localStorage.getItem('${SAVE_NAMESPACE}.s1'),localStorage.getItem('${SAVE_NAMESPACE}.s2')],controller:navigator.serviceWorker.controller?.scriptURL??null,online:navigator.onLine};})()`, timeoutMs);
    const nativeForeground = deadline => {
      const front = spawnSync('/usr/bin/lsappinfo', ['front'], { encoding: 'utf8', timeout: budget(deadline) });
      const app = front.status === 0 ? spawnSync('/usr/bin/lsappinfo', ['info', '-only', 'bundleid,name', front.stdout.trim()], { encoding: 'utf8', timeout: budget(deadline) }) : { status: null, stdout: '', stderr: '' };
      return { observedAt: Date.now(), frontExit: front.status, front: (front.stdout || '').slice(0, 2048), frontError: String(front.error || front.stderr || '').slice(0, 2048), appExit: app.status, app: (app.stdout || '').slice(0, 4096), appError: String(app.error || app.stderr || '').slice(0, 2048), valid: front.status === 0 && app.status === 0 && /com\.google\.Chrome(?="|\s|$)/.test(app.stdout) };
    };
    const viewportFits = state => {
      const v = state.viewport;
      return v.innerWidth > 0 && v.innerHeight > 0 && v.outerWidth <= v.availWidth && v.outerHeight <= v.availHeight && v.screenX >= v.availLeft && v.screenY >= v.availTop && v.screenX + v.outerWidth <= v.availLeft + v.availWidth && v.screenY + v.outerHeight <= v.availTop + v.availHeight;
    };
    const qualifyForeground = async (label, deadline = Date.now() + 10000) => {
      const audit = { label, startedAt: Date.now(), deadline, observations: [], readErrors: [] };
      report.foreground.push(audit); persist();
      const opened = spawnSync('/usr/bin/open', ['-a', 'Google Chrome'], { encoding: 'utf8', timeout: budget(deadline) });
      audit.open = { exit: opened.status, error: String(opened.error || opened.stderr || '').slice(0, 2048) }; persist();
      assert.equal(opened.status, 0, 'Native Google Chrome activation must succeed');
      await send('Page.bringToFront', {}, budget(deadline));
      // Real OS activation + actual target focus only; no synthetic visibility/rAF.
      for (let i = 0; i < 20 && Date.now() < deadline; i++) {
        try {
          const state = await readDocument(budget(deadline)), native = nativeForeground(deadline);
          audit.observations.push({ observedAt: Date.now(), state, native, viewportFits: viewportFits(state) }); persist();
          if (native.valid && state.visibility === 'visible' && !state.hidden && state.focused && viewportFits(state)) {
            audit.qualifiedAt = Date.now(); persist(); return;
          }
        } catch (error) { audit.readErrors.push({ observedAt: Date.now(), error: String(error).slice(0, 4096) }); persist(); }
        await sleep(Math.max(0, Math.min(50, deadline - Date.now())));
      }
      throw Error('Native and page foreground/viewport qualification failed: ' + label);
    };
    await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
    report.browserVersion = await send('Browser.getVersion');
    check(!/HeadlessChrome/.test(report.browserVersion.userAgent), 'PWA probe uses native headed Chrome');
    const display = await ev('({availLeft:screen.availLeft,availTop:screen.availTop,availWidth:screen.availWidth,availHeight:screen.availHeight})');
    check(display.availWidth >= 672 && display.availHeight >= 512, 'existing desktop fits a small functional probe window');
    const window = await send('Browser.getWindowForTarget');
    const bounds = { left: display.availLeft + 16, top: display.availTop + 16, width: Math.min(800, display.availWidth - 32), height: Math.min(600, display.availHeight - 32) };
    await send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'normal' } });
    await send('Browser.setWindowBounds', { windowId: window.windowId, bounds });
    report.presentation.display = display; report.presentation.requestedWindow = bounds;
    report.presentation.actualWindow = await send('Browser.getWindowForTarget'); persist();
    await send('Runtime.addBinding', { name: '__pagesStorageEvent' });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: storageProbeSource(ORIGIN) });
    const bootstrapURL = ORIGIN + PROJECT + '__swmain_bootstrap.html';
    await send('Page.navigate', { url: bootstrapURL });
    const bootstrapReady = async () => {
      for (let i = 0; i < 100; i++) {
        try {
          if (await ev(`location.href===${JSON.stringify(bootstrapURL)}&&document.readyState==='complete'&&window.__swMainSlotBeforeBoot==='3'&&!!window.__pagesStorageProbe`)) return true;
        } catch { /* The execution context can change while navigation commits. */ }
        await sleep(100);
      }
      return false;
    };
    check(await bootstrapReady(), 'exact bootstrap committed with main slot 3 and storage observation before game boot');
    await qualifyForeground('bootstrap before first game navigation');
    check(await ev(`localStorage.getItem('${SAVE_NAMESPACE}.slot')==='3'&&!window.GV&&!localStorage.getItem('${SAVE_NAMESPACE}.s1')&&!localStorage.getItem('${SAVE_NAMESPACE}.s2')`), 'main slot 3 selected before first game boot in fresh isolated profile');
    const fakeLab = foreignStorageFixture();
    check(await ev(`window.__pagesStorageProbe.seed(${JSON.stringify(fakeLab)})`), 'deterministic fake Lab keys seeded in the isolated shared origin');
    const seededCaches = await ev(`(async()=>{
      if((await caches.keys()).length)throw Error('Expected a fresh Cache Storage');
      for(const name of ${JSON.stringify(FOREIGN_CACHES)}){
        const cache=await caches.open(name);
        for(const pathname of ['/GlimmerTown-lab/index.html','/GlimmerTown/index.html']){
          await cache.put(location.origin+pathname,new Response('FAKE LAB SENTINEL '+name+' '+pathname,{status:200,headers:{'content-type':'text/plain','x-fake-lab-sentinel':name}}));
        }
      }
      return (await caches.keys()).sort();
    })()`);
    check(JSON.stringify(seededCaches) === JSON.stringify([...FOREIGN_CACHES].sort()), 'only deterministic foreign caches exist before cold main install');
    const foreignCacheSnapshot = () => ev(`(${browserForeignCacheSnapshot.toString()})(${JSON.stringify(FOREIGN_CACHES)})`);
    const foreignCacheBaseline = await foreignCacheSnapshot();
    const assertIsolation = async label => {
      const storage = await ev('window.__pagesStorageProbe.snapshot()');
      for (const event of storage.events) recordStorage(event);
      const foreignCaches = await foreignCacheSnapshot();
      const row = { label, observedAt: Date.now(), foreignStorage: storage.foreign, foreignCaches, storageEventCount: report.storageEvents.length, mainKeys: Object.keys(storage.main).sort() };
      report.isolation.push(row); persist();
      check(JSON.stringify(storage.foreign) === JSON.stringify(fakeLab), 'all fake Lab storage keys and values unchanged: ' + label);
      check(!report.storageEvents.some(event => event.foreign), 'zero foreign localStorage reads/writes/removes/clears/enumerations: ' + label);
      check(JSON.stringify(foreignCaches) === JSON.stringify(foreignCacheBaseline), 'all foreign cache names, entries, metadata and body hashes unchanged: ' + label);
      check(storage.main[SAVE_NAMESPACE + '.slot'] === '3' && !((SAVE_NAMESPACE + '.s1') in storage.main) && !((SAVE_NAMESPACE + '.s2') in storage.main), 'main slot 3 isolated; slots 1 and 2 absent: ' + label);
      return row;
    };
    const shellDigests = () => ev(`(async()=>{
      const names=await caches.keys();if(!names.includes(${JSON.stringify(CACHE)}))throw Error('Main cache missing');
      const cache=await caches.open(${JSON.stringify(CACHE)}),entries=await cache.keys(),rows=[];
      for(const request of entries){
        const response=await cache.match(request),bytes=await response.arrayBuffer();
        const digest=await crypto.subtle.digest('SHA-256',bytes);
        rows.push({url:request.url,status:response.status,bytes:bytes.byteLength,marker:response.headers.get('x-sw-main-probe'),sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')});
      }
      return rows.sort((a,b)=>a.url.localeCompare(b.url));
    })()`);
    const verifyAllShellBodies = async label => {
      const rows = await shellDigests();
      check(rows.length === SHELL_FILES.length && rows.length === 6, 'all six shell responses cached: ' + label);
      for (const name of SHELL_FILES) {
        const row = rows.find(entry => entry.url === ORIGIN + PROJECT + name), bytes = pack.files.get(name);
        check(row?.status === 200 && row.bytes === bytes.length && row.sha256 === sha(bytes), 'cached full response body matches packaged SHA-256: ' + name + ' (' + label + ')');
      }
      report.shellVerifications ??= []; report.shellVerifications.push({ label, verifiedAt: Date.now(), rows }); persist(); return rows;
    };
    const cacheDigest = async () => (await shellDigests()).find(row => row.url === ORIGIN + PROJECT + 'index.html');
    const rowsFor = (url, since) => {
      const enter = report.stages.filter(r => r.url === url && r.stage === 'navigate-enter' && r.time >= since).at(-1);
      return enter ? report.stages.filter(r => r.boot === enter.boot && r.navigation === enter.navigation).sort((a, b) => a.sequence - b.sequence) : [];
    };
    const waitStages = async (url, since, required) => {
      for (let i = 0; i < 300; i++) {
        const rows = rowsFor(url, since);
        // HTTP arrival can reorder logs: wait for the entire set, then sequence-sort.
        if (required.every(stage => rows.some(r => r.stage === stage))) return rows;
        await sleep(100);
      }
      throw Error('Incomplete stage set for ' + url + ': ' + required.join(','));
    };
    const identity = async (url, previous) => {
      const audit = { expectedURL: url, previousTimeOrigin: previous, startedAt: Date.now(), pollCount: 0, changes: [], droppedChanges: 0, readErrorCount: 0, readErrors: [], reactivations: [] };
      audit.deadline = audit.startedAt + 240 * 500;
      report.identityObservations.push(audit); persist();
      let lastSignature;
      for (let i = 0; i < 240 && Date.now() < audit.deadline; i++) {
        audit.pollCount = i + 1;
        try {
          const state = await readDocument(budget(audit.deadline, 150000)), native = nativeForeground(audit.deadline);
          const predicates = { exactURL: state.url === url, newTimeOrigin: state.timeOrigin !== previous, complete: state.complete, bootReady: state.boot, mainVersion: state.version === APP_VERSION, visible: state.visibility === 'visible' && !state.hidden, focused: state.focused, nativeForeground: native.valid, viewportFits: viewportFits(state) };
          const rejectedPredicates = Object.keys(predicates).filter(key => !predicates[key]);
          const observation = { observedAt: Date.now(), poll: i + 1, state, native, predicates, rejectedPredicates };
          const signature = JSON.stringify({ state, predicates, nativeApp: native.app });
          audit.last = observation;
          if (signature !== lastSignature) {
            audit.changes.push(observation); lastSignature = signature;
            if (audit.changes.length > 32) { audit.changes.shift(); audit.droppedChanges++; }
          }
          persist();
          if (rejectedPredicates.length === 0) {
            check(state.slot === '3' && state.slotBeforeBoot === '3' && state.otherSlots.every(v => v === null), 'actual main boot preserves slot 3 and leaves slots 1/2 untouched');
            audit.completedAt = Date.now(); persist(); return state;
          }
          if ((!predicates.visible || !predicates.focused || !predicates.nativeForeground) && audit.reactivations.length < 2 && Date.now() < audit.deadline) {
            const recovery = { poll: i + 1, startedAt: Date.now(), before: observation };
            audit.reactivations.push(recovery); persist();
            try {
              await qualifyForeground('boot reactivation ' + audit.reactivations.length + ': ' + url, audit.deadline);
              recovery.qualifiedAt = Date.now();
            } catch (error) { recovery.error = String(error).slice(0, 4096); }
            persist();
          }
        } catch (error) {
          if (/actual main boot/.test(error.message)) throw error;
          audit.readErrorCount++;
          audit.readErrors.push({ observedAt: Date.now(), poll: i + 1, error: String(error).slice(0, 4096) });
          if (audit.readErrors.length > 12) audit.readErrors.shift();
          persist();
        }
        await sleep(Math.max(0, Math.min(500, audit.deadline - Date.now())));
      }
      audit.failedAt = Date.now(); audit.failure = 'Actual main boot predicate did not pass; cause unproven. See exact observations and rejected predicates.'; persist();
      throw Error('Byte-exact main product did not finish boot: ' + url);
    };
    async function navigate(mode, required, { reload = false, root = false } = {}) {
      const url = ORIGIN + PROJECT + (root ? '' : 'index.html') + (mode ? '?__swmain=' + mode : '');
      await assertIsolation('before ' + (reload ? 'reload ' : '') + (mode || 'restored'));
      if (reload) assert.equal(await ev('location.href'), url, 'reload uses current exact entry URL');
      await qualifyForeground('before ' + (mode || 'restored'));
      const previous = await ev('performance.timeOrigin'), since = Date.now();
      const result = reload ? await send('Page.reload') : await send('Page.navigate', { url }); assert(!result.errorText, result.errorText);
      await qualifyForeground('committed ' + (mode || 'restored'));
      const document = await identity(url, previous);
      const rows = await waitStages(url, since, ['respondWith-registered', 'waitUntil-registered', ...required]);
      const commit = report.transport.find(r => r.method === 'Page.frameNavigated' && r.url === url && !r.parentId && r.time >= since);
      const response = report.transport.find(r => r.method === 'Network.responseReceived' && r.type === 'Document' && r.url === url && r.time >= since);
      check(commit && response?.status === 200 && response.fromServiceWorker === true, 'committed main document is a successful SW response: ' + (mode || 'restored'));
      const received = await send('Network.getResponseBody', { requestId: response.requestId });
      const bodySHA256 = sha(Buffer.from(received.body, received.base64Encoded ? 'base64' : 'utf8'));
      check(bodySHA256 === packageIndexSHA, 'delivered main document bytes match verified package: ' + (mode || 'restored'));
      const record = { mode: mode || 'restored', since, document, rows, commit, response, bodySHA256, cache: await cacheDigest(), http: report.http.filter(r => r.url === url && r.startedAt >= since) };
      record.reload = reload; report.cases.push(record); persist();
      await assertIsolation('after ' + (reload ? 'reload ' : '') + (mode || 'restored'));
      return record;
    }
    // The bootstrap only seeds fake same-origin Lab data. The genuine first game
    // document must reach the network before the unchanged app registers its SW.
    await assertIsolation('before genuine uncontrolled first game visit');
    const firstVisitBefore = await ev(`(async()=>({
      registrations:(await navigator.serviceWorker.getRegistrations()).map(registration=>registration.scope),
      controller:navigator.serviceWorker.controller?.scriptURL??null
    }))()`);
    check(firstVisitBefore.registrations.length === 0 && firstVisitBefore.controller === null, 'zero registered workers and no controller before genuine first game visit');
    const firstVisitURL = ORIGIN + PROJECT;
    await qualifyForeground('before genuine first game visit');
    const firstPrevious = await ev('performance.timeOrigin'), firstSince = Date.now();
    const firstNavigation = await send('Page.navigate', { url: firstVisitURL });
    assert(!firstNavigation.errorText, firstNavigation.errorText);
    await qualifyForeground('committed genuine first game visit');
    const firstDocument = await identity(firstVisitURL, firstPrevious);
    const firstCommit = report.transport.find(row => row.method === 'Page.frameNavigated' && row.url === firstVisitURL && !row.parentId && row.time >= firstSince);
    const firstResponse = report.transport.find(row => row.method === 'Network.responseReceived' && row.type === 'Document' && row.url === firstVisitURL && row.time >= firstSince);
    assert(firstResponse?.requestId, 'genuine first Document has network response evidence');
    const firstBody = await send('Network.getResponseBody', { requestId: firstResponse.requestId });
    const firstEvidence = {
      beforeWorker:firstVisitBefore, url:firstVisitURL, expectedSHA:packageIndexSHA,
      commit:firstCommit, response:firstResponse,
      bodySHA256:sha(Buffer.from(firstBody.body, firstBody.base64Encoded ? 'base64' : 'utf8')),
      http:report.http.filter(row => row.url === firstVisitURL && row.startedAt >= firstSince)
    };
    assertFirstVisitEvidence(firstEvidence);
    check(true, 'genuine first game document commits network HTTP 200 with exact package bytes and no service-worker/cache response');
    report.firstVisit = { mode:'first-network', since:firstSince, document:firstDocument, ...firstEvidence };
    persist();
    // Observation only: registration belongs to the byte-unchanged app script.
    const firstInstalledWorker = await ev(`(async()=>{
      const registration=await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
      return {
        scope:registration.scope, active:registration.active?.scriptURL??null, state:registration.active?.state??null,
        controller:navigator.serviceWorker.controller?.scriptURL??null,
        registrations:(await navigator.serviceWorker.getRegistrations()).map(row=>row.scope)
      };
    })()`, 120000);
    check(firstInstalledWorker.scope === ORIGIN + PROJECT && firstInstalledWorker.active === ORIGIN + PROJECT + 'sw.js' && firstInstalledWorker.state === 'activated' && firstInstalledWorker.controller === ORIGIN + PROJECT + 'sw.js' && firstInstalledWorker.registrations.length === 1 && firstInstalledWorker.registrations[0] === ORIGIN + PROJECT, 'unchanged app registers and activates its correctly scoped worker after the network first visit');
    report.firstVisit.installedWorker = firstInstalledWorker;
    report.initialCache = await verifyAllShellBodies('app-managed first install complete before controlled navigation or outage');
    await assertIsolation('after genuine first visit and app-managed installation');
    persist();
    await navigate('cold-online', ['fetch-end', 'cache-put-end', 'reply-fresh'], { root: true });
    const saved = await ev(`(${browserPrepareSave.toString()})(${JSON.stringify(SAVE_NAMESPACE)},${JSON.stringify(APP_VERSION)})`);
    check(saved.raw.length > 0 && saved.placed === 3, 'actual game creates and saves a synthetic main slot 3 city');
    report.saveChecks.push({ phase: 'save', bytes: Buffer.byteLength(saved.raw), sha256: sha(saved.raw), core: saved.core, seed: saved.seed, mapSize: saved.size }); persist();
    await assertIsolation('after actual main save');
    await navigate('cold-online', ['fetch-end', 'cache-put-end', 'reply-fresh'], { reload: true, root: true });
    const loaded = await ev(`(${browserLoadObservation.toString()})()`);
    const loadedObservation = saveReloadObservation({expectedRaw:saved.raw, expectedCore:saved.core, actual:loaded});
    report.saveChecks.push({phase:'first-reload-observation', ...loadedObservation}); persist();
    check(loadedObservation.loaded && loadedObservation.exactBytes && loadedObservation.exactCore, 'real page reload plus GV.load preserves main saved bytes and city values');
    await assertIsolation('after actual main save/reload');
    const imported = await ev(`(${browserSaveRoundTrip.toString()})(${JSON.stringify(SAVE_NAMESPACE)})`);
    for (const label of imported.checks) check(true, label);
    report.saveChecks.push({ phase: 'export-import-rollback', checks: imported.checks, exportCapture: imported.captureKind,
      exportBytes: Buffer.byteLength(imported.exportCode), exportSHA256: sha(imported.exportCode), exportedSaveSHA256: sha(imported.rawA),
      restoredSaveSHA256: sha(imported.rawB), reloadExpectedSHA256: sha(imported.reloadRaw),
      exportedCore: imported.coreA, restoredCore: imported.coreB, reloadExpectedCore: imported.reloadCore }); persist();
    await assertIsolation('after invalid import, valid export/import and rollback');
    await navigate('cold-online', ['fetch-end', 'cache-put-end', 'reply-fresh'], { reload: true, root: true });
    const rollbackLoaded = await ev(`(${browserLoadObservation.toString()})()`);
    const rollbackObservation = saveReloadObservation({expectedRaw:imported.reloadRaw, expectedCore:imported.reloadCore, actual:rollbackLoaded});
    report.saveChecks.push({phase:'rollback-reload-observation', ...rollbackObservation}); persist();
    await assertIsolation('after rollback reload before byte/city comparison');
    check(rollbackObservation.loaded && rollbackObservation.exactBytes && rollbackObservation.exactCore, 'second real reload preserves rolled-back main save and live city values');
    const delayed = await navigate('delay', ['fetch-end', 'clone-end', 'cache-open-end', 'cache-put-begin', 'cache-put-end', 'reply-fresh']);
    const stage = (row, name) => row.rows.find(r => r.stage === name);
    check(stage(delayed, 'cache-put-end').time - stage(delayed, 'cache-put-begin').time >= 7500, 'cache write is deliberately delayed at least 7.5 seconds');
    check(stage(delayed, 'clone-end').sequence < stage(delayed, 'reply-fresh').sequence && stage(delayed, 'reply-fresh').time < stage(delayed, 'cache-put-end').time && delayed.commit.time < stage(delayed, 'cache-put-end').time, 'fresh response and real document commit precede delayed cache completion');
    check(delayed.cache.sha256 === packageIndexSHA && delayed.cache.marker === 'delay', 'delayed cache write eventually completes with exact main bytes');
    const failed = await navigate('fail', ['fetch-end', 'clone-end', 'cache-put-begin', 'cache-error', 'reply-fresh']);
    check(stage(failed, 'cache-error').errorName === 'QuotaExceededError' && !stage(failed, 'cache-put-end') && failed.response.marker === 'fail', 'controlled cache write rejection preserves fresh network response');
    check(JSON.stringify(failed.cache) === JSON.stringify(delayed.cache), 'failed write preserves prior complete cached response and metadata');
    await verifyAllShellBodies('immediately before origin-entry outage');
    blockEntry = true;
    let offline;
    try { offline = await navigate('offline', ['fetch-error', 'offline-open-end', 'offline-match-end', 'reply-offline']); }
    finally { blockEntry = false; }
    check(stage(offline, 'fetch-error').sequence < stage(offline, 'offline-match-end').sequence && stage(offline, 'offline-match-end').hit === true && stage(offline, 'offline-match-end').sequence < stage(offline, 'reply-offline').sequence, 'positive origin-outage evidence: fetch-error then cache hit then reply-offline');
    check(offline.http.length > 0 && offline.http.every(r => r.abortedAt && !r.status) && offline.response.marker === 'delay', 'origin document requests were aborted before response and prior cache served');
    check(JSON.stringify(offline.cache) === JSON.stringify(delayed.cache), 'outage retains prior complete exact main cache');
    const restored = await navigate('', ['fetch-end', 'cache-put-end', 'reply-fresh']);
    check(restored.document.online && restored.document.url === ORIGIN + PROJECT + 'index.html' && restored.response.marker === 'clean-online' && restored.cache.marker === 'clean-online', 'clean online main navigation and canonical cache restored');
    check(report.exceptions.length === 0 && report.consoleErrors.length === 0, 'no page JavaScript exceptions or console errors');
    await verifyAllShellBodies('after online restoration');
    await assertIsolation('final');
    for (const [name, bytes] of pack.files) {
      const current = fs.readFileSync(path.join(SITE, name)); verifyPackagedFile(name, current);
      check(sha(current) === sha(bytes), 'packaged runtime file remains byte-identical after probe: ' + name);
    }
    check(sha(fs.readFileSync(path.join(ROOT, 'index.html'))) === PINS['index.html'] && sha(fs.readFileSync(path.join(ROOT, 'sw.js'))) === PINS['sw.js'], 'raw source index and SW remain byte-identical after probe');
    report.status = 'passed'; persist(); console.log('MAIN_PAGES_BROWSER_PASS ' + JSON.stringify({ checks: report.checks.length, out: OUT, cases: report.cases.map(r => r.mode) }));
  } catch (error) {
    report.status = 'failed'; report.error = error.stack || String(error); report.chromeLog = chromeLog; persist(); throw error;
  } finally {
    blockEntry = false;
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(Error('Probe closed')); } pending.clear();
    if (ws) ws.close();
    if (browser && browser.exitCode === null && browser.signalCode === null) browser.kill('SIGTERM');
    if (browserClosed) await Promise.race([browserClosed, sleep(5000)]);
    if (browser && browser.exitCode === null && browser.signalCode === null) { browser.kill('SIGKILL'); await browserClosed; }
    for (const socket of sockets) socket.destroy();
    if (server) await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
    pack.cleanup();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const pack = loadVerifiedPackage(arg('site', undefined));
    try {
      instrumentWorker(pack.files.get('sw.js').toString('utf8'));
      new Function(storageProbeSource('http://127.0.0.1:8893'));
      new Function('return (' + browserForeignCacheSnapshot.toString() + ')');
      new Function('return (' + browserPrepareSave.toString() + ')');
      new Function('return (' + browserSaveRoundTrip.toString() + ')');
      assert.equal(sha(fs.readFileSync(path.join(ROOT, 'index.html'))), PINS['index.html']);
      assert.equal(sha(fs.readFileSync(path.join(ROOT, 'sw.js'))), PINS['sw.js']);
      console.log('MAIN_PAGES_BROWSER_SOURCE_OK (source/package and helper syntax only; browser acceptance not run)');
    } finally { pack.cleanup(); }
  } else { await run(); }
}
