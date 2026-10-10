/** Published main Pages / full browser-network outage acceptance, Node 22+.
 * Local raw-package CI: --site=PATH --out=EVIDENCE [--port=8933]
 * Published HTTPS:      --site=PATH --url=https://HOST/GlimmerTown/ --out=EVIDENCE
 * Local upgrade:        --site=PATH --upgrade-from-main --out=EVIDENCE
 *   (T627: "from main" now means from the release the live Pages site serves, found in git;
 *   with no runtime change it records not-applicable-no-runtime-change and exits 0 before Chrome.)
 * --check performs only local package, option and helper-source validation (with the upgrade
 * flag it also resolves the live previous release by read-only GETs and git).
 * Requires existing native macOS Chrome in an assistant-owned cloud runner.
 * No product/SW rewriting, synthetic visibility/rAF, TLS bypass, user profile or FPS claim.
 * Offline means denied browser HTTP(S)/WS(S), including worker requests, not OS radio state.
 * Chromium proxy semantics: https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {PINS,SAVE_NAMESPACE,CACHE_PREFIX,APP_VERSION,CACHE_NAME,SOURCE_COMMIT,sha256,verifyPackagedFile} from './build-main.mjs';
import {loadVerifiedPackage,storageProbeSource,foreignStorageFixture,browserPrepareSave,browserLoadObservation,saveReloadObservation} from './browser-main.mjs';
import identity from './release-identity.cjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROJECT='/GlimmerTown/',CACHE=CACHE_NAME;
const FOREIGN_CACHES=['gv-v1','gv-v2','glimmerville-shell-v11.211'];
const SHELL=Object.keys(PINS).filter(name=>name!=='sw.js');
export const UPGRADE_NOT_APPLICABLE='not-applicable-no-runtime-change';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const releaseVersion=(value,label)=>{assert(typeof value==='string'&&/^\d+(?:\.\d+){1,2}$/.test(value),'explicit '+label+' release version required');return value;};
const upgradeScope=oldVersion=>`Exact ${oldVersion} to ${APP_VERSION} raw main package upgrade, same profile and registration, then new-process saved-city offline reopen`;

export function options(args){
  const out={port:8933,check:false},seen=new Set();
  for(const arg of args){
    if(arg==='--check'){out.check=true;continue;}
    if(arg==='--upgrade-from-main'){assert(!out.upgradeFromMain,'Duplicate upgrade mode');out.upgradeFromMain=true;continue;}
    const match=arg.match(/^--(site|url|out|port)=(.+)$/);assert(match,'Unknown or empty option: '+arg);
    assert(!seen.has(match[1]),'Duplicate option: '+match[1]);seen.add(match[1]);
    out[match[1]]=match[1]==='port'?Number(match[2]):match[2];
  }
  for(const port of [out.port,out.port+1000,out.port+2000])assert(Number.isInteger(port)&&port>=8129&&port<=65535&&port!==8199,'isolated ports required');
  if(out.url){
    assert(!out.upgradeFromMain,'upgrade mode requires the local raw-package server');
    const url=new URL(out.url);
    assert(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash,'published URL must be ordinary HTTPS without credentials/query/fragment');
    assert.equal(url.origin,'https://lijiabao1998.github.io','published origin must be the verified GlimmerTown GitHub Pages account');
    assert(url.pathname===PROJECT,'published URL must end in /GlimmerTown/');out.url=url.href;
  }
  return out;
}

/** R4: the real upgrade is skipped only when all seven source pins are equal. Any runtime
 * change must already satisfy releaseDelta (sw.js changed, version raised), otherwise it throws. */
export function upgradeSkipReason(previous,current){
  const delta=identity.releaseDelta(previous,current);
  const identical=identity.RUNTIME_FILES.every(name=>previous.sourcePins[name]===current.sourcePins[name]);
  assert.equal(delta.runtimeChanged,!identical,'a runtime change must be exactly a differing source pin');
  return identical?UPGRADE_NOT_APPLICABLE:null;
}

/** T627 (R3/R4): the upgrade starts from the release the live Pages site serves, found in git
 * by release-identity (fail closed at every step). `fetchLive` and `current` are injectable so a
 * frozen historical pair can exercise the same path; by default current is the checked-out HEAD.
 * An injected current is also the commit the previous release must be an ancestor of. */
export async function liveRelease(root=ROOT,{fetchLive,env=process.env,current}={}){
  const previous=await identity.previousRelease(root,{env,...(fetchLive?{fetchLive}:{}),...(current===undefined?{}:{head:current.commit})});
  if(current===undefined){
    current=identity.currentRelease(root,{env});
    assert.equal(current.commit,SOURCE_COMMIT,'upgrade target must be the packaged commit');
    assert.deepEqual({...current.sourcePins},{...PINS},'upgrade target pins must be the packaged pins');
    assert.equal(current.version,APP_VERSION,'upgrade target version must be the packaged version');
  }
  const delta=identity.releaseDelta(previous,current),files=previous.packagedFiles;
  return Object.freeze({commit:previous.commit,source:previous.source,version:previous.version,sourcePins:previous.sourcePins,
    blobIds:previous.blobIds,liveSHA256:previous.liveSHA256,files,sourceFiles:previous.files,
    bodies:Object.fromEntries([...files].map(([name,bytes])=>[name,{bytes:bytes.length,sha256:sha256(bytes)}])),
    current:Object.freeze({commit:current.commit,version:current.version,sourcePins:current.sourcePins}),
    delta,skipReason:upgradeSkipReason(previous,current)});
}

/** Pair the exact current package with the resolved previous release. Both sides are verified
 * against their own source pins; the old side must also equal the live bytes it was found from. */
export function upgradePlan(files,live){
  const current=live.current,runtime=[...identity.RUNTIME_FILES].sort();
  assert.deepEqual([...files.keys()].sort(),runtime,'upgrade requires exactly seven current package files');
  for(const [name,bytes] of files)verifyPackagedFile(name,bytes,current.sourcePins);
  assert.equal(identity.parseVersion(files.get('index.html'),files.get('sw.js')),releaseVersion(current.version,'current'),'current package version');
  assert.deepEqual([...live.files.keys()].sort(),runtime,'previous release must be exactly seven package files');
  if(live.source==='live')for(const name of runtime)assert.equal(sha256(live.files.get(name)),live.liveSHA256[name],'previous package must equal the live bytes: '+name);
  else assert(live.source==='override-unverified'&&live.liveSHA256===null,'a previous release not read from the live site must be marked unverified');
  for(const [name,bytes] of live.files)verifyPackagedFile(name,bytes,live.sourcePins);
  assert.equal(identity.parseVersion(live.files.get('index.html'),live.files.get('sw.js')),releaseVersion(live.version,'previous'),'previous package version');
  const skip=upgradeSkipReason(live,current);
  assert.equal(skip,live.skipReason,'skip decision must match the resolved release pair');
  return {skip,oldFiles:live.files,newFiles:files,oldVersion:live.version,newVersion:current.version};
}

export function assertUpgradeWorker(row,base,oldVersion){
  assert.equal(row.ok,true,row.error||'real worker upgrade failed');
  assert.equal(row.before.version,releaseVersion(oldVersion,'old'));assert.equal(row.before.scope,base);
  assert.equal(row.before.controller,base+'sw.js');assert.equal(row.before.active,base+'sw.js');
  assert.equal(row.before.activeState,'activated');assert.equal(row.before.sameController,true);
  assert.equal(row.before.waiting,null);assert.equal(row.before.installing,null);
  assert(row.updateCalled&&row.updateReturned&&row.sameRegistration,'same registration must complete its real update()');
  assert(row.updateFound>=1&&row.controllerChanges>=1,'updatefound and controllerchange must be observed');
  assert.equal(row.oldState,'redundant');assert.equal(row.activeState,'activated');
  assert(row.replacedActive&&row.replacedController&&row.activeIsController,'new active worker must replace the old controller');
  assert.equal(row.scope,base);assert.equal(row.active,base+'sw.js');assert.equal(row.controller,base+'sw.js');
  assert.deepEqual(row.registrations,[base]);
}

export function assertUpgradeCaches({names,cache,files,base,oldVersion}){
  const oldCache=CACHE_PREFIX+'v'+releaseVersion(oldVersion,'old');assert.notEqual(oldCache,CACHE,'upgrade must change the main cache version');
  assert(!names.includes(oldCache),'old main-owned version cache must be gone: '+oldCache);
  assert.deepEqual([...names].sort(),[...FOREIGN_CACHES,CACHE].sort(),'only old main-owned version cache must be removed');
  assert.equal(cache.name,CACHE);assert(!cache.missing);assert.equal(cache.entries.length,SHELL.length);
  assert.deepEqual(cache.entries.map(row=>row.url).sort(),SHELL.map(name=>base+name).sort(),'new cache must contain the exact six shell URLs');
  for(const name of SHELL){const row=cache.entries.find(value=>value.url===base+name);assert.equal(row.method,'GET');assert.equal(row.status,200);assert.equal(row.bytes,files.get(name).length);assert.equal(row.sha256,sha256(files.get(name)),'new cached full body: '+name);}
}

export function assertUpgradeSave({oldRaw,oldCore,oldModel,beforeLoad,loaded,migrated,stable,oldVersion,newVersion,namespace=SAVE_NAMESPACE}){
  releaseVersion(oldVersion,'old');releaseVersion(newVersion,'new');
  assert(identity.compareVersions(newVersion,oldVersion)>0,'upgrade must raise the version: '+oldVersion+' -> '+newVersion);
  const old=JSON.parse(oldRaw);assert.equal(old.gameVer,oldVersion,'fixture must be a real old-version save');assert.equal(old.v,1);
  assert.equal(beforeLoad[namespace+'.slot'],'3');assert.equal(beforeLoad[namespace+'.s3'],oldRaw,'old save must survive activation and reload before load');
  assert.equal(beforeLoad[namespace+'.s3_bak'],oldRaw,'old backup must survive activation and reload');
  assert.equal(loaded.loaded,true);assert.equal(loaded.raw,oldRaw,'load must not silently rewrite old persisted bytes');
  assert.deepEqual(loaded.core,oldCore,'loaded city values');assert.deepEqual(loaded.model,oldModel,'loaded live tile model');
  const expected={...old,gameVer:newVersion},expectedRaw=JSON.stringify(expected);
  assert.equal(migrated.version,newVersion);assert.equal(migrated.raw,expectedRaw,'only gameVer may change in the real new-version save');
  assert.equal(migrated.main[namespace+'.s3_bak'],oldRaw,'first new-version save must back up the old bytes');
  assert.deepEqual(migrated.main,{...beforeLoad,[namespace+'.s3']:expectedRaw},'migration must preserve every other main key');
  assert.deepEqual(migrated.core,oldCore);assert.deepEqual(migrated.model,oldModel);
  assert.equal(stable.raw,expectedRaw,'repeat real save must be byte-stable');
  assert.deepEqual(stable.main,{...migrated.main,[namespace+'.s3_bak']:expectedRaw},'repeat save may only advance the backup to the identical new save');
  assert.deepEqual(stable.core,oldCore);assert.deepEqual(stable.model,oldModel);
  return {oldSHA256:sha256(oldRaw),newSHA256:sha256(expectedRaw),oldBytes:Buffer.byteLength(oldRaw),newBytes:Buffer.byteLength(expectedRaw),changedFields:['gameVer'],modelSHA256:sha256(JSON.stringify(oldModel)),exactCore:true,oldSavePreservedBeforeLoad:true,oldBackupPreservedOnFirstSave:true};
}

export async function browserUpdateWorker(base,oldVersion){
  // Evaluated in the page: the old release version arrives as an argument, never a literal.
  if(typeof oldVersion!=='string'||!/^\d+(?:\.\d+){1,2}$/.test(oldVersion))return {ok:false,updateCalled:false,updateReturned:false,updateFound:0,controllerChanges:0,events:[],error:'explicit old release version required'};
  const registration=await navigator.serviceWorker.getRegistration(base),old=navigator.serviceWorker.controller;
  const row={ok:false,updateCalled:false,updateReturned:false,updateFound:0,controllerChanges:0,events:[]};
  const state=()=>({scope:registration?.scope,active:registration?.active?.scriptURL??null,activeState:registration?.active?.state??null,
    controller:navigator.serviceWorker.controller?.scriptURL??null,oldState:old?.state??null,
    replacedActive:!!registration?.active&&registration.active!==old,replacedController:!!navigator.serviceWorker.controller&&navigator.serviceWorker.controller!==old,
    activeIsController:!!registration?.active&&registration.active===navigator.serviceWorker.controller});
  row.before={...state(),version:GV.ver(),sameController:!!old&&registration?.active===old,waiting:registration?.waiting?.state??null,installing:registration?.installing?.state??null};
  if(!registration||!old||row.before.version!==oldVersion||!row.before.sameController||row.before.waiting||row.before.installing){row.error='old active registration not stable';return row;}
  let timer,wake,stopped=false;const workers=new Set();
  const record=(kind,worker)=>{row.events.push({kind,state:worker?.state??null,at:Date.now()});wake?.();};
  const changed=event=>record('statechange',event.target);
  const observe=worker=>{if(worker&&!workers.has(worker)){workers.add(worker);worker.addEventListener('statechange',changed);record('observed',worker);}};
  const found=()=>{row.updateFound++;observe(registration.installing);record('updatefound',registration.installing);};
  const controlled=()=>{row.controllerChanges++;observe(navigator.serviceWorker.controller);record('controllerchange',navigator.serviceWorker.controller);};
  registration.addEventListener('updatefound',found);navigator.serviceWorker.addEventListener('controllerchange',controlled);observe(old);
  try{
    const finished=new Promise((resolve,reject)=>{
      timer=setTimeout(()=>{stopped=true;reject(Error('worker activation deadline (60 seconds)'));},60000);
      wake=()=>{const now=state();if(!stopped&&row.updateReturned&&row.updateFound&&row.controllerChanges&&now.replacedActive&&now.replacedController&&now.activeIsController&&now.activeState==='activated'&&now.oldState==='redundant')resolve();};
    });
    // Start the real update synchronously after listeners exist; the deadline also
    // covers a hanging update() request rather than only its subsequent activation.
    row.updateCalled=true;
    const updated=registration.update().then(value=>{row.sameRegistration=value===registration;row.updateReturned=true;wake();});
    await Promise.all([updated,finished]);
    row.registrations=(await navigator.serviceWorker.getRegistrations()).map(value=>value.scope);row.ok=true;
  }catch(error){row.error=String(error);}
  finally{stopped=true;clearTimeout(timer);registration.removeEventListener('updatefound',found);navigator.serviceWorker.removeEventListener('controllerchange',controlled);for(const worker of workers)worker.removeEventListener('statechange',changed);}
  return {...row,...state()};
}

export function browserCityModel(){
  const n=GV.N(),tiles=[];
  // Persistent terrain/road/zone data and full building identity/footprint are
  // observed from the live world, independently of rawSave(). Transient masks,
  // service coverage and actors are rebuilt by load and are not save fields.
  const fields=['t','tree','gv','road','bridge','hw','zone','deco','ruin','rdec','rc','wp','el','bus','rail','railBridge','dock','oneway','light','parkMeter','busLane','tram','office','flood','levee','crater'];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const tile=GV.tile(x,y),b=tile.bld;
    tiles.push([...fields.map(key=>Number(tile[key]||0)),b?[b.k,b.lv??null,b.v??null,b.age??null,b.sz??1,b.ref??null,!!b.lot574]:null]);
  }
  return {n,tiles};
}

export function chromeArgs({profile,debugPort,proxyPort}){
  assert(path.isAbsolute(profile),'explicit isolated profile required');
  const args=['--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--mute-audio',
    '--window-size=800,600','--disable-quic',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`];
  if(proxyPort){
    // One proxy for every scheme, no DIRECT fallback, and no implicit localhost bypass.
    args.push(`--proxy-server=http://127.0.0.1:${proxyPort}`,'--proxy-bypass-list=<-loopback>');
  }else args.push('--no-proxy-server');
  return [...args,'about:blank'];
}

export async function verifyAssetResponse({name,url,response,expected}){
  assert(name in PINS,'only pinned package assets may be verified');
  assert.equal(response.status,200,'GET status for '+name);
  assert.equal(response.url,url,'redirected asset: '+name);assert.equal(response.redirected,false,'redirected asset: '+name);
  const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const type=name.endsWith('.html')?/^text\/html$/:name.endsWith('.js')?/^(text|application)\/(javascript|ecmascript)$/:name.endsWith('.json')?/^application\/(json|manifest\+json)$/:name.endsWith('.svg')?/^image\/svg\+xml$/:/^image\/png$/;
  assert(type.test(mime),'incorrect content type for '+name+': '+mime);
  assert(response.body,'GET body missing: '+name);
  const chunks=[];let length=0;
  try{
    for await(const chunk of response.body){length+=chunk.byteLength;assert(length<=expected.length,'oversized GET body: '+name);chunks.push(Buffer.from(chunk));}
  }catch(error){throw new Error('Reading '+name+': '+error.message,{cause:error});}
  const bytes=Buffer.concat(chunks);
  assert.equal(bytes.length,expected.length,'incomplete GET body: '+name);assert.equal(sha256(bytes),sha256(expected),'GET body differs from package: '+name);
  return {name,url,method:'GET',status:response.status,mime,bytes:bytes.length,sha256:sha256(bytes),representation:'decoded full response body'};
}

export function denyProxyRequest(request,socket,record){
  // No connection to an upstream host is ever created. Closing without a reply
  // produces a network failure, rather than a successful proxy-generated page.
  record({method:request.method,target:request.url,deniedAt:Date.now()});socket.destroy();
}

export function proxyTargetsOrigin(row,origin){
  const target=new URL(origin);
  if(row.method==='CONNECT')return row.target.toLowerCase()===`${target.hostname}:${target.port||(target.protocol==='https:'?'443':'80')}`.toLowerCase();
  try{return new URL(row.target).origin===target.origin;}catch{return false;}
}

export function assertDocumentProvenance(response,fromWorker){
  assert.equal(response.fromServiceWorker,fromWorker);
  assert.equal(response.fromPrefetchCache,false);
  if(fromWorker){
    // Chromium BuildResponse computes fromDiskCache from response age, so it
    // can also be true for persistent Cache Storage. The explicit worker source
    // distinguishes Cache Storage from HTTP cache, network and generated replies.
    // https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/network_handler.cc
    assert.equal(response.serviceWorkerResponseSource,'cache-storage','offline worker must return a Cache Storage response');
  }else{
    assert.equal(response.fromDiskCache,false,'first visit must come from the network');
    assert(response.serviceWorkerResponseSource==null,'first visit must not carry worker response provenance');
  }
}

export function assertUpgradeDocument(response){
  assert.equal(response.status,200);assert.equal(response.fromServiceWorker,true,'upgrade reload must use the replacement controller');
  assert.equal(response.serviceWorkerResponseSource,'network','online upgraded worker must forward the raw origin document');
  assert.equal(response.fromDiskCache,false);assert.equal(response.fromPrefetchCache,false);
}

export function assertOfflineEvidence({onlinePID,offlinePID,onlineExit,probes,document,proxyRows,localOriginRequests}){
  assert(onlinePID&&offlinePID&&onlinePID!==offlinePID,'offline must run in a second Chrome process');
  assert.equal(onlineExit.code,0,'online Chrome must exit cleanly before profile reuse');assert.equal(onlineExit.signal,null);
  assert(probes.length===2&&probes.every(p=>p.rejected&&!p.timedOut),'both uncached network probes must fail through the network stack');
  assert(proxyRows.length>0&&proxyRows.every(r=>r.deniedAt),'rejecting proxy must observe and deny browser traffic');
  assert.equal(document.status,200);assertDocumentProvenance(document,true);
  if(localOriginRequests!==undefined)assert.equal(localOriginRequests,0,'local origin must receive no request from offline Chrome, including its worker');
}

function readState(){
  return {url:location.href,timeOrigin:performance.timeOrigin,complete:document.readyState==='complete',version:window.GV?.ver?.()??null,
    boot:window.__boot426?.()??null,visibility:document.visibilityState,hidden:document.hidden,focused:document.hasFocus(),
    viewport:{innerWidth,innerHeight,outerWidth,outerHeight,screenX,screenY,availLeft:screen.availLeft,availTop:screen.availTop,availWidth:screen.availWidth,availHeight:screen.availHeight},
    slot:localStorage.getItem('glimmerville.main.v1.slot'),prebootSlot:window.__swMainSlotBeforeBoot??null,
    controller:navigator.serviceWorker.controller?.scriptURL??null,online:navigator.onLine};
}

async function cacheSnapshot(names){
  const existing=await caches.keys(),out=[];
  for(const name of [...names].sort()){
    if(!existing.includes(name)){out.push({name,missing:true});continue;}
    const cache=await caches.open(name),entries=[];
    for(const req of await cache.keys()){
      const response=await cache.match(req),bytes=await response.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',bytes);
      entries.push({url:req.url,method:req.method,requestHeaders:[...req.headers],status:response.status,statusText:response.statusText,
        headers:[...response.headers],bytes:bytes.byteLength,sha256:Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')});
    }
    out.push({name,entries:entries.sort((a,b)=>a.url.localeCompare(b.url))});
  }
  return out;
}

async function seedForeignCaches(names){
  if((await caches.keys()).length)throw Error('Fresh profile must have no caches before fixture seeding');
  for(const name of names){
    const cache=await caches.open(name);
    for(const pathname of ['/GlimmerTown-lab/index.html','/GlimmerTown/index.html']){
      await cache.put(location.origin+pathname,new Response('FAKE LAB SENTINEL '+name+' '+pathname,{headers:{'content-type':'text/plain','x-fake-lab-sentinel':name}}));
    }
  }
  return true;
}

async function uncachedProbe(url){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(url,{cache:'no-store',redirect:'error',signal:controller.signal});return {url,rejected:false,status:response.status};}
  catch(error){return {url,rejected:true,errorName:error.name,error:String(error),timedOut:controller.signal.aborted};}
  finally{clearTimeout(timer);}
}

export function browserContinueSavedCity(){
  const button=document.getElementById('bContinue'),start=document.getElementById('start'),canvas=document.getElementById('game');
  const shown=element=>!!element&&getComputedStyle(element).display!=='none'&&getComputedStyle(element).visibility!=='hidden'&&element.getClientRects().length>0;
  if(!shown(button)||button.disabled)throw Error('Offline Continue button must be visible and enabled');
  // The real begin(false) handler enters the saved city. Pause synchronously on
  // both sides so another animation frame cannot advance the byte/core fixture.
  GV.setSpeed(0);button.click();GV.setSpeed(0);
  const startHidden=!!start&&getComputedStyle(start).display==='none';
  const canvasReady=canvas instanceof HTMLCanvasElement&&canvas.width>0&&canvas.height>0&&shown(canvas);
  if(!startHidden||!canvasReady)throw Error('Offline Continue did not expose the playable city canvas');
  const stats=GV.stats(),core=Object.fromEntries(['money','day','buildings','roads','zones'].map(key=>[key,stats[key]]));
  return {continueVisible:true,continueEnabled:true,startHidden,canvas:{width:canvas.width,height:canvas.height},paused:true,raw:GV.rawSave(),core};
}

export async function run(config){
  const started=Date.now(),deadline=started+14*60*1000; // Cleanup reserve keeps total below 15 minutes.
  const remaining=(cap=30000)=>{const ms=deadline-Date.now();assert(ms>0,'14-minute observation deadline reached');return Math.min(ms,cap);};
  const pack=loadVerifiedPackage(config.site);
  const out=path.resolve(config.out||fs.mkdtempSync(path.join(os.tmpdir(),'town-published-evidence-')));
  let profile;
  try{assert(out!==pack.site&&!out.startsWith(pack.site+path.sep),'evidence must stay outside runtime package');fs.mkdirSync(out,{recursive:true});profile=fs.mkdtempSync(path.join(os.tmpdir(),'town-published-profile-'));}
  catch(error){pack.cleanup();throw error;}
  const base=config.url||`http://127.0.0.1:${config.port}${PROJECT}`,origin=new URL(base).origin;
  let oldPack,servedFiles=pack.files,servedVersion=APP_VERSION;
  const report={status:'running',startedAt:started,deadline,mode:config.upgradeFromMain?'local-raw-package-upgrade':config.url?'published-https':'local-raw-package',url:base,
    scope:config.upgradeFromMain?upgradeScope('previous release (not yet resolved)'):config.url?'Actual published HTTPS bytes and isolated saved-city offline reopen':'Raw package on localhost; does not verify published HTTPS',
    limitation:'Fail-closed proxy blocks browser HTTP(S)/WS(S), including workers; navigator.onLine may remain true. '+(config.upgradeFromMain?'Local upgrade only; no published HTTPS, installed-PWA OS launch or FPS claim.':'No worker-version upgrade, installed-PWA OS launch or FPS claim.'),
    mechanism:{online:'fresh isolated profile, no proxy',offline:'new Chrome process, same isolated profile, one rejecting HTTP proxy, no direct fallback, implicit loopback bypass removed, QUIC disabled; HTTP cache cleared before shutdown and before reopen while Cache Storage is retained',
      source:'https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md'},
    checks:[],assets:[],transport:[],storageEvents:[],proxy:[],originRequests:[],foreground:[],boot:[],isolation:[],exceptions:[],consoleErrors:[],processes:[]};
  const persist=()=>fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2));
  const check=(condition,label)=>{assert(condition,label);report.checks.push(label);persist();};
  let server,proxy,current,interrupted;
  const sockets=new Set();
  const signalHandler=signal=>{interrupted=Error('Interrupted by '+signal);if(current)current.abort(interrupted);};
  const sigint=()=>signalHandler('SIGINT'),sigterm=()=>signalHandler('SIGTERM');
  process.on('SIGINT',sigint);process.on('SIGTERM',sigterm);
  const guard=()=>{if(interrupted)throw interrupted;remaining();};
  const ownServer=async handle=>{
    const value=http.createServer(handle);value.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});return value;
  };
  async function closeChrome(session,{requireClean=false}={}){
    if(!session)return null;
    session.closing=true;
    try{await session.send('Browser.close',{},5000);}catch{/* A clean Browser.close may close CDP before replying. */}
    let result=await Promise.race([session.exited,sleep(7000).then(()=>null)]);
    if(!result){session.child.kill('SIGTERM');result=await Promise.race([session.exited,sleep(3000).then(()=>null)]);}
    if(!result){session.child.kill('SIGKILL');result=await session.exited;}
    session.abort(Error('Chrome closed'));session.ws?.close();
    session.row.exit=result;session.row.closedAt=Date.now();persist();
    if(requireClean){assert.equal(result.code,0,'online browser must close cleanly');assert.equal(result.signal,null);}
    return result;
  }
  async function launch(phase,proxyPort){
    guard();const row={phase,startedAt:Date.now(),args:chromeArgs({profile,debugPort:config.port+1000,proxyPort})};report.processes.push(row);persist();
    const child=spawn(report.chromePath,row.args,{stdio:['ignore','ignore','pipe']});row.pid=child.pid;
    const session={child,row,pending:new Map(),closing:false,ws:null};current=session;
    session.exited=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));let chromeLog='';
    child.stderr.on('data',bytes=>{chromeLog=(chromeLog+bytes).slice(-12000);row.stderr=chromeLog;});child.on('error',error=>{row.spawnError=String(error);});
    session.abort=error=>{for(const task of session.pending.values()){clearTimeout(task.timer);task.reject(error);}session.pending.clear();};
    let target;
    for(let i=0;i<120&&!target;i++){
      guard();if(child.exitCode!==null||child.signalCode!==null)throw Error('Chrome exited before CDP: '+chromeLog);
      try{const response=await fetch(`http://127.0.0.1:${config.port+1000}/json/list`,{signal:AbortSignal.timeout(remaining(1500))});target=(await response.json()).find(t=>t.type==='page'&&t.url==='about:blank');}catch{}
      if(!target)await sleep(250);
    }
    assert(target?.webSocketDebuggerUrl,'isolated about:blank CDP target missing');
    const ws=new WebSocket(target.webSocketDebuggerUrl);session.ws=ws;
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CDP connection deadline')),remaining(10000));ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=e=>{clearTimeout(timer);reject(Error('CDP connection failed'));};});
    let id=0;
    session.send=(method,params={},cap=30000)=>new Promise((resolve,reject)=>{
      const key=++id,timer=setTimeout(()=>{session.pending.delete(key);reject(Error('CDP timeout: '+method));},remaining(cap));
      session.pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));
    });
    ws.onmessage=event=>{
      const message=JSON.parse(event.data),p=message.params||{};
      if(message.id&&session.pending.has(message.id)){const task=session.pending.get(message.id);clearTimeout(task.timer);session.pending.delete(message.id);message.error?task.reject(Error(JSON.stringify(message.error))):task.resolve(message.result);return;}
      if(message.method==='Runtime.bindingCalled'&&p.name==='__pagesStorageEvent'){
        try{const value=JSON.parse(p.payload);assert(value&&typeof value.operation==='string');report.storageEvents.push({phase,...value});}catch(error){report.exceptions.push('storage observer: '+error.message);}
      }else if(message.method==='Runtime.exceptionThrown')report.exceptions.push({phase,error:p.exceptionDetails.exception?.description||p.exceptionDetails.text});
      else if(message.method==='Runtime.consoleAPICalled'&&p.type==='error')report.consoleErrors.push({phase,error:p.args.map(a=>a.value??a.description).join(' ')});
      else if(['Page.frameNavigated','Network.responseReceived','Network.loadingFailed','Network.requestWillBeSent'].includes(message.method)){
        const r=p.response||{};report.transport.push({phase,event:message.method,time:Date.now(),url:p.frame?.url||r.url||p.request?.url,
          requestId:p.requestId,frameId:p.frame?.id||p.frameId,parentId:p.frame?.parentId,type:p.type,status:r.status,mime:r.mimeType,
          fromServiceWorker:r.fromServiceWorker??false,serviceWorkerResponseSource:r.serviceWorkerResponseSource??null,cacheStorageCacheName:r.cacheStorageCacheName??null,fromDiskCache:r.fromDiskCache??false,fromPrefetchCache:r.fromPrefetchCache??false,errorText:p.errorText});
        if(message.method==='Network.responseReceived')persist();
      }
    };
    ws.onclose=()=>{if(!session.closing)session.abort(Error('CDP closed unexpectedly'));};
    session.ev=async(expression,cap=30000)=>{const value=await session.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},cap);if(value.exceptionDetails)throw Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value;};
    await session.send('Page.enable');await session.send('Network.enable');await session.send('Runtime.enable');
    if(phase==='offline'){await session.send('Network.clearBrowserCache');row.httpCacheClearedAt=Date.now();}
    row.version=await session.send('Browser.getVersion');check(!/HeadlessChrome/.test(row.version.userAgent),'native headed Chrome: '+phase);
    await session.send('Runtime.addBinding',{name:'__pagesStorageEvent'});await session.send('Page.addScriptToEvaluateOnNewDocument',{source:storageProbeSource(origin)});
    const display=await session.ev('({left:screen.availLeft,top:screen.availTop,width:screen.availWidth,height:screen.availHeight})');
    check(display.width>=672&&display.height>=512,'native desktop fits probe window: '+phase);
    const window=await session.send('Browser.getWindowForTarget');await session.send('Browser.setWindowBounds',{windowId:window.windowId,bounds:{windowState:'normal'}});
    await session.send('Browser.setWindowBounds',{windowId:window.windowId,bounds:{left:display.left+16,top:display.top+16,width:Math.min(800,display.width-32),height:Math.min(600,display.height-32)}});
    row.readyAt=Date.now();persist();return session;
  }
  const fits=s=>{const v=s.viewport;return v.innerWidth>0&&v.innerHeight>0&&v.outerWidth<=v.availWidth&&v.outerHeight<=v.availHeight&&v.screenX>=v.availLeft&&v.screenY>=v.availTop&&v.screenX+v.outerWidth<=v.availLeft+v.availWidth&&v.screenY+v.outerHeight<=v.availTop+v.availHeight;};
  const native=()=>{
    const front=spawnSync('/usr/bin/lsappinfo',['front'],{encoding:'utf8',timeout:remaining(5000)});
    const app=front.status===0?spawnSync('/usr/bin/lsappinfo',['info','-only','bundleid,name',front.stdout.trim()],{encoding:'utf8',timeout:remaining(5000)}):{status:null,stdout:''};
    return {front:front.stdout,status:app.status,app:app.stdout,valid:front.status===0&&app.status===0&&/com\.google\.Chrome(?="|\s|$)/.test(app.stdout)};
  };
  async function foreground(session,label){
    guard();const audit={label,phase:session.row.phase,startedAt:Date.now()};report.foreground.push(audit);
    const opened=spawnSync('/usr/bin/open',['-a','Google Chrome'],{encoding:'utf8',timeout:remaining(5000)});assert.equal(opened.status,0,'native Chrome activation failed');
    await session.send('Page.bringToFront');const until=Math.min(deadline,Date.now()+10000);
    while(Date.now()<until){guard();try{const state=await session.ev(`(${readState.toString()})()`,5000),app=native();audit.last={state,app};if(app.valid&&state.visibility==='visible'&&!state.hidden&&state.focused&&fits(state)){audit.qualifiedAt=Date.now();persist();return;}}catch(error){audit.error=String(error);}await sleep(100);}
    persist();throw Error('Native/page foreground qualification failed: '+label);
  }
  async function navigate(session,url,{game,fromWorker,workerNetwork=false}){
    guard();const since=Date.now(),previous=await session.ev('performance.timeOrigin');
    const nav=await session.send('Page.navigate',{url});assert(!nav.errorText,nav.errorText);
    await foreground(session,'navigation '+url);
    const until=Math.min(deadline,Date.now()+120000),audit={phase:session.row.phase,url,since,previous};report.boot.push(audit);
    let state,ready=false;
    while(Date.now()<until){
      guard();try{state=await session.ev(`(${readState.toString()})()`,5000);audit.last=state;const app=native();audit.native=app;
        ready=state.url===url&&state.timeOrigin!==previous&&state.complete&&state.visibility==='visible'&&!state.hidden&&state.focused&&fits(state)&&app.valid&&(!game||(state.version===servedVersion&&state.boot?.ready));
        if(ready)break;
      }catch(error){audit.error=String(error);}await sleep(250);
    }
    persist();assert(ready,'natural document/boot deadline failed: '+url);
    check(state.slot==='3'&&state.prebootSlot==='3','main slot 3 selected before scripts: '+session.row.phase);
    const response=report.transport.find(r=>r.phase===session.row.phase&&r.event==='Network.responseReceived'&&r.type==='Document'&&r.url===url&&r.time>=since);
    const commit=report.transport.find(r=>r.phase===session.row.phase&&r.event==='Page.frameNavigated'&&r.url===url&&!r.parentId&&r.time>=since);
    audit.response=response??null;audit.commit=commit??null;audit.expectedFromWorker=fromWorker;persist();
    assert(commit&&response?.status===200,'successful committed document response required');
    if(workerNetwork){assert(fromWorker,'worker network response requires a controller');assertUpgradeDocument(response);}
    else assertDocumentProvenance(response,fromWorker);
    const received=await session.send('Network.getResponseBody',{requestId:response.requestId});const body=Buffer.from(received.body,received.base64Encoded?'base64':'utf8');
    const name=game?'index.html':'icon.svg';audit.bodySHA256=sha256(body);audit.expectedBodySHA256=sha256(servedFiles.get(name));audit.expectedVersion=servedVersion;persist();
    assert.equal(audit.bodySHA256,audit.expectedBodySHA256,'actual document bytes differ: '+name);
    audit.completedAt=Date.now();persist();return {...response,state,bodySHA256:audit.bodySHA256};
  }
  const fakeLab=foreignStorageFixture();let foreignBaseline;
  async function isolation(session,label){
    const storage=await session.ev('window.__pagesStorageProbe.snapshot()');
    check(!storage.events.some(row=>row.foreign)&&!report.storageEvents.some(row=>row.foreign),'zero Lab storage read/write/delete/clear/enumeration: '+label);
    assert.deepEqual(storage.foreign,fakeLab,'Lab values changed: '+label);
    const caches=await session.ev(`(${cacheSnapshot.toString()})(${JSON.stringify(FOREIGN_CACHES)})`);assert.deepEqual(caches,foreignBaseline,'Lab cache names/entries/metadata/bodies changed: '+label);
    assert.equal(storage.main[SAVE_NAMESPACE+'.slot'],'3');assert(!(SAVE_NAMESPACE+'.s1' in storage.main)&&!(SAVE_NAMESPACE+'.s2' in storage.main));
    report.isolation.push({label,phase:session.row.phase,storageKeys:Object.keys(storage.foreign),foreignCaches:caches,at:Date.now()});persist();
  }
  async function shell(session,label){
    const [cache]=await session.ev(`(${cacheSnapshot.toString()})(${JSON.stringify([CACHE_PREFIX+'v'+servedVersion])})`);assert(!cache.missing);assert.equal(cache.entries.length,6);
    for(const name of SHELL){const row=cache.entries.find(r=>r.url===base+name);assert(row&&row.status===200&&row.bytes===servedFiles.get(name).length&&row.sha256===sha256(servedFiles.get(name)),'cached full body mismatch: '+name);}
    report.shell??=[];report.shell.push({label,...cache});check(true,'six complete cached package bodies: '+label);return cache;
  }
  try{
    persist();
    if(config.upgradeFromMain){
      assert(!config.url,'upgrade mode requires the local raw-package server');
      // T627: the old side is what the live Pages site serves, resolved in git and re-packaged
      // byte-for-byte; never a reconstruction. Every step of the lookup fails closed.
      const live=await liveRelease(ROOT),plan=upgradePlan(pack.files,live);
      const pair={previousCommit:live.commit,previousSource:live.source,previousLiveSHA256:live.liveSHA256,currentCommit:live.current.commit,
        oldVersion:plan.oldVersion,newVersion:plan.newVersion,changedFiles:live.delta.changedFiles};
      if(plan.skip){
        // R4: all seven source pins equal the live release, so there is no upgrade to exercise.
        report.upgrade={status:plan.skip,...pair};report.status=plan.skip;report.scope='No runtime change from the live release; real-browser upgrade not applicable';
        report.completedAt=Date.now();persist();console.log('MAIN_PAGES_UPGRADE_NOT_APPLICABLE '+JSON.stringify({previousCommit:live.commit,currentCommit:live.current.commit,version:plan.newVersion,out}));
        return report;
      }
      oldPack={files:plan.oldFiles,version:plan.oldVersion,sourcePins:live.sourcePins,bodies:live.bodies};
      servedFiles=oldPack.files;servedVersion=oldPack.version;report.scope=upgradeScope(oldPack.version);
      report.upgrade={status:'preparing',...pair,oldSourcePins:oldPack.sourcePins,newSourcePins:PINS,oldBodies:oldPack.bodies,assets:[]};persist();
    }
    assert.equal(process.platform,'darwin','native macOS cloud runner required');
    report.chromePath=[process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(file=>fs.existsSync(file));assert(report.chromePath,'installed Chrome required');
    if(!config.url){
      server=await ownServer((req,res)=>{
        const url=new URL(req.url,origin),name=url.pathname===PROJECT?'index.html':url.pathname.startsWith(PROJECT)?url.pathname.slice(PROJECT.length):'';
        const row={url:url.href,method:req.method,at:Date.now(),phase:current?.row.phase??'asset-verification',packageVersion:servedVersion,serviceWorker:req.headers['service-worker']??null};report.originRequests.push(row);
        res.once('finish',()=>{row.finishedAt=Date.now();});
        if(!['GET','HEAD'].includes(req.method)){row.status=405;res.writeHead(405).end();return;}const data=servedFiles.get(name);
        if(!data){row.status=404;res.writeHead(404,{'cache-control':'no-store'}).end();return;}
        row.status=200;row.bytes=data.length;row.sha256=sha256(data);
        const mime=name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.svg')?'image/svg+xml':'image/png';
        res.writeHead(200,{'content-type':mime,'content-length':data.length,'cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
      });await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.port,'127.0.0.1',resolve);});
    }
    for(const [name,expected] of servedFiles){guard();const url=base+name;const response=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(remaining(30000))});report.assets.push(await verifyAssetResponse({name,url,response,expected}));persist();}
    check(report.assets.length===7,'all seven actual GET response bodies match pinned package');
    const online=await launch('online');
    // A verified script-free SVG at the same origin avoids publication test assets
    // or response substitution. Finish all synthetic seeding before the first game visit.
    await navigate(online,base+'icon.svg',{game:false,fromWorker:false});
    const before=await online.ev('(async()=>({registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope),controller:navigator.serviceWorker.controller?.scriptURL??null,game:!!window.GV}))()');
    assert.deepEqual(before.registrations,[]);assert.equal(before.controller,null);assert.equal(before.game,false);
    check(await online.ev(`window.__pagesStorageProbe.seed(${JSON.stringify(fakeLab)})`),'fake Lab keys seeded only in fresh profile');
    check(await online.ev(`(${seedForeignCaches.toString()})(${JSON.stringify(FOREIGN_CACHES)})`),'fake Lab caches fully seeded before app installation');
    foreignBaseline=await online.ev(`(${cacheSnapshot.toString()})(${JSON.stringify(FOREIGN_CACHES)})`);await isolation(online,'before first game visit');
    report.firstVisit=await navigate(online,base,{game:true,fromWorker:false});
    const installed=await online.ev(`(async()=>{const r=await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));return {scope:r.scope,active:r.active?.scriptURL,state:r.active?.state,controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(v=>v.scope)};})()`,120000);
    assert.deepEqual(installed,{scope:base,active:base+'sw.js',state:'activated',controller:base+'sw.js',registrations:[base]});report.installed=installed;
    await shell(online,'online app-owned installation');await isolation(online,'after installation');
    const saved=await online.ev(`(${browserPrepareSave.toString()})(${JSON.stringify(SAVE_NAMESPACE)},${JSON.stringify(servedVersion)})`);assert.equal(saved.placed,3);
    report.saved={sha256:sha256(saved.raw),bytes:Buffer.byteLength(saved.raw),core:saved.core,seed:saved.seed,size:saved.size};await isolation(online,'after synthetic main save');
    if(config.upgradeFromMain){
      const u=report.upgrade;u.status='old-installed';
      // A second actual save stabilizes the backup before lifecycle callbacks.
      // Neither the old nor new fixture is ever written directly to storage.
      const oldState=await online.ev(`(()=>{GV.setSpeed(0);GV.save();return {raw:GV.rawSave(),main:window.__pagesStorageProbe.snapshot().main,model:(${browserCityModel.toString()})()};})()`);
      assert.equal(oldState.raw,saved.raw);assert.equal(oldState.main[SAVE_NAMESPACE+'.s3_bak'],saved.raw);
      u.oldSave={...report.saved,modelSHA256:sha256(JSON.stringify(oldState.model))};u.beforeMain=oldState.main;persist();
      const oldRequests=report.originRequests.filter(row=>row.url===base+'sw.js'&&row.phase==='online'&&row.serviceWorker==='script'&&row.status===200&&row.finishedAt&&row.sha256===sha256(oldPack.files.get('sw.js')));
      u.oldWorkerRequests=oldRequests;check(oldRequests.length>0,'browser installed exact old raw worker from the local origin');
      // Only the server's immutable seven-file map changes. No response interception,
      // worker rewriting, unregister, cache deletion or profile reset is used.
      u.switchedAt=Date.now();servedFiles=pack.files;servedVersion=APP_VERSION;u.status='new-package-served';persist();
      for(const [name,expected] of servedFiles){guard();const url=base+name;const response=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(remaining(30000))});u.assets.push(await verifyAssetResponse({name,url,response,expected}));persist();}
      check(u.assets.length===7,'all seven switched GET bodies match the exact new package');
      u.status='updating-worker';persist();
      u.worker=await online.ev(`(${browserUpdateWorker.toString()})(${JSON.stringify(base)},${JSON.stringify(oldPack.version)})`,90000);persist();assertUpgradeWorker(u.worker,base,oldPack.version);
      const newRequests=report.originRequests.filter(row=>row.url===base+'sw.js'&&row.phase==='online'&&row.serviceWorker==='script'&&row.at>=u.switchedAt&&row.status===200&&row.finishedAt&&row.sha256===sha256(pack.files.get('sw.js')));
      u.newWorkerRequests=newRequests;check(newRequests.length>0,'real update fetched exact new raw worker bytes');
      u.activatedMain=await online.ev('window.__pagesStorageProbe.snapshot().main');persist();assert.deepEqual(u.activatedMain,oldState.main,'activation must preserve all main storage before reload');
      const replacementCache=await shell(online,'new worker activation before reload');
      u.cacheNames=await online.ev('caches.keys()');persist();assertUpgradeCaches({names:u.cacheNames,cache:replacementCache,files:pack.files,base,oldVersion:oldPack.version});
      await isolation(online,'after real worker replacement');
      u.status='reloading-new-version';persist();
      u.document=await navigate(online,base,{game:true,fromWorker:true,workerNetwork:true});
      const beforeLoad=await online.ev('window.__pagesStorageProbe.snapshot().main');u.beforeLoadMain=beforeLoad;persist();
      assert.deepEqual(beforeLoad,oldState.main,'new-version boot must preserve every old main key before load');
      u.status='loading-old-save';persist();
      const loaded=await online.ev(`(()=>{const row=(${browserLoadObservation.toString()})();return {...row,model:(${browserCityModel.toString()})()};})()`);
      u.load=saveReloadObservation({expectedRaw:saved.raw,expectedCore:saved.core,actual:loaded});u.load.modelSHA256=sha256(JSON.stringify(loaded.model));persist();
      const saveState=`(()=>{GV.setSpeed(0);GV.save();const stats=GV.stats();return {version:GV.ver(),raw:GV.rawSave(),main:window.__pagesStorageProbe.snapshot().main,core:Object.fromEntries(['money','day','buildings','roads','zones'].map(key=>[key,stats[key]])),model:(${browserCityModel.toString()})()};})()`;
      u.status='saving-new-version';persist();
      const migrated=await online.ev(saveState);u.migration=saveReloadObservation({expectedRaw:saved.raw,expectedCore:saved.core,actual:{...migrated,loaded:loaded.loaded}});persist();
      const stable=await online.ev(saveState);
      u.migratedMain=migrated.main;u.stableMain=stable.main;u.stable={sha256:sha256(stable.raw),bytes:Buffer.byteLength(stable.raw),modelSHA256:sha256(JSON.stringify(stable.model)),core:stable.core};persist();
      u.save=assertUpgradeSave({oldRaw:saved.raw,oldCore:saved.core,oldModel:oldState.model,beforeLoad,loaded,migrated,stable,oldVersion:oldPack.version,newVersion:APP_VERSION});
      saved.raw=stable.raw;u.status='upgraded';report.offlineSaveBaseline={sha256:sha256(saved.raw),bytes:Buffer.byteLength(saved.raw),core:saved.core};persist();
      check(true,`same-profile ${oldPack.version} save survives real ${APP_VERSION} worker activation and load with only the exact release version changed`);
      await isolation(online,'after new-version save');await shell(online,'after upgrade save');
    }
    await online.send('Network.clearBrowserCache');report.httpCacheClearedAt=Date.now();
    await shell(online,'Cache Storage retained after HTTP cache clear');await isolation(online,'after HTTP cache clear');
    const onlinePID=online.child.pid,onlineExit=await closeChrome(online,{requireClean:true});current=null;
    let oldDebuggerAlive=false;
    try{oldDebuggerAlive=(await fetch(`http://127.0.0.1:${config.port+1000}/json/version`,{signal:AbortSignal.timeout(1500)})).ok;}catch{}
    assert.equal(oldDebuggerAlive,false,'old Chrome debugging endpoint must be gone before restart');
    // The second process has no surviving online connections or page contexts.
    const proxyPort=config.port+2000;
    proxy=await ownServer((req,res)=>denyProxyRequest(req,req.socket,row=>report.proxy.push(row)));
    proxy.on('connect',(req,socket)=>denyProxyRequest(req,socket,row=>report.proxy.push(row)));
    proxy.on('upgrade',(req,socket)=>denyProxyRequest(req,socket,row=>report.proxy.push(row)));
    await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(proxyPort,'127.0.0.1',resolve);});
    const originBefore=report.originRequests.length,offline=await launch('offline',proxyPort);
    report.offlineDocument=await navigate(offline,base,{game:true,fromWorker:true});
    const probes=[];
    for(const route of [base+'__uncached_probe_',origin+'/__uncached_probe_'])probes.push(await offline.ev(`(${uncachedProbe.toString()})(${JSON.stringify(route+randomUUID())})`,20000));
    report.offlineProbes=probes;persist();
    const entered=await offline.ev(`(${browserContinueSavedCity.toString()})()`);
    const enteredObservation=saveReloadObservation({expectedRaw:saved.raw,expectedCore:saved.core,actual:entered});
    const {raw:enteredRaw,core:enteredCore,...enteredUI}=entered;
    report.offlineContinue={...enteredUI,saveObservation:enteredObservation};persist();
    check(enteredObservation.exactBytes&&enteredObservation.exactCore,'actual offline Continue enters exact saved bytes and city values before a separate load');
    const actual=await offline.ev(`(${browserLoadObservation.toString()})()`),observation=saveReloadObservation({expectedRaw:saved.raw,expectedCore:saved.core,actual});
    report.reopenedSave=observation;persist();await isolation(offline,'offline city load');
    check(observation.loaded&&observation.exactBytes&&observation.exactCore,'offline new process reopens exact saved bytes and city values');
    await shell(offline,'offline process reopen');
    if(config.upgradeFromMain){
      const model=await offline.ev(`(${browserCityModel.toString()})()`);report.upgrade.offlineModelSHA256=sha256(JSON.stringify(model));persist();
      assert.equal(report.upgrade.offlineModelSHA256,report.upgrade.oldSave.modelSHA256,'offline live tile model must remain exact across versions');
      assertUpgradeCaches({names:await offline.ev('caches.keys()'),cache:report.shell.at(-1),files:pack.files,base,oldVersion:oldPack.version});
      report.upgrade.status='offline-reopened';persist();
    }
    const relevantProxy=report.proxy.filter(row=>proxyTargetsOrigin(row,origin));
    assertOfflineEvidence({onlinePID,offlinePID:offline.child.pid,onlineExit,probes,document:report.offlineDocument,proxyRows:relevantProxy,
      localOriginRequests:config.url?undefined:report.originRequests.length-originBefore});
    check(true,'process-wide network denial observed, both uncached probes rejected, worker-served document and exact save restored');
    const findProbeFailures=()=>probes.map(probe=>{
      const request=report.transport.find(row=>row.phase==='offline'&&row.event==='Network.requestWillBeSent'&&row.url===probe.url);
      return report.transport.find(row=>row.phase==='offline'&&row.event==='Network.loadingFailed'&&row.requestId===request?.requestId);
    });
    let probeFailures=findProbeFailures();
    for(let i=0;i<20&&probeFailures.some(row=>!row);i++){guard();await sleep(100);probeFailures=findProbeFailures();}
    report.offlineProbeFailures=probeFailures;
    check(probeFailures.every(row=>row&&/ERR_(PROXY_CONNECTION_FAILED|TUNNEL_CONNECTION_FAILED|EMPTY_RESPONSE|CONNECTION_CLOSED|CONNECTION_RESET|FAILED)/.test(row.errorText)),'each uncached probe has its own browser network-stack failure');
    check(report.exceptions.length===0&&report.consoleErrors.length===0,'no page JavaScript exception or application console error');
    for(const [name,bytes] of pack.files)assert.equal(sha256(fs.readFileSync(path.join(pack.site,name))),sha256(bytes),'package modified: '+name);
    await closeChrome(offline,{requireClean:true});current=null;
    report.status='passed';if(report.upgrade)report.upgrade.status='passed';report.completedAt=Date.now();persist();console.log('MAIN_PAGES_REOPEN_PASS '+JSON.stringify({mode:report.mode,url:base,checks:report.checks.length,out}));
  }catch(error){report.status='failed';report.error=error.stack||String(error);if(report.upgrade){report.upgrade.failedStage=report.upgrade.status;report.upgrade.status='failed';}persist();throw error;}
  finally{
    try{await closeChrome(current);}catch(error){report.cleanupError=String(error);persist();}
    for(const socket of sockets)socket.destroy();for(const value of [server,proxy])if(value)await new Promise(resolve=>value.close(resolve));
    process.off('SIGINT',sigint);process.off('SIGTERM',sigterm);
    fs.rmSync(profile,{recursive:true,force:true});pack.cleanup();
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=options(process.argv.slice(2));
  if(config.check){
    const pack=loadVerifiedPackage(config.site);
    try{if(config.upgradeFromMain){const live=await liveRelease(ROOT),plan=upgradePlan(pack.files,live);console.log('MAIN_PAGES_UPGRADE_PAIR '+JSON.stringify({previousCommit:live.commit,previousSource:live.source,oldVersion:plan.oldVersion,currentCommit:live.current.commit,newVersion:plan.newVersion,changedFiles:live.delta.changedFiles,status:plan.skip||'applicable'})+(live.source==='live'?' (read-only live GETs and git)':' (local override; live bytes not verified)'));}
      for(const fn of [readState,cacheSnapshot,seedForeignCaches,uncachedProbe,browserContinueSavedCity,browserPrepareSave,browserLoadObservation,browserUpdateWorker,browserCityModel])new Function('return ('+fn.toString()+')');new Function(storageProbeSource('http://127.0.0.1:8933'));console.log('MAIN_PAGES_REOPEN_SOURCE_OK (local package/helper checks only; no browser or published request)');}
    finally{pack.cleanup();}
  }else await run(config);
}
