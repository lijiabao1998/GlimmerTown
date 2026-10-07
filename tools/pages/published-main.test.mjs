/** Offline publication-gate helper contracts. No browser launch or network calls. */
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {readFileSync} from 'node:fs';
import {options,chromeArgs,verifyAssetResponse,denyProxyRequest,proxyTargetsOrigin,assertDocumentProvenance,assertOfflineEvidence,browserContinueSavedCity} from './published-main.mjs';
import {loadVerifiedPackage} from './browser-main.mjs';
import {PINS,sha256} from './build-main.mjs';

const base='https://lijiabao1998.github.io/GlimmerTown/';
const pack=loadVerifiedPackage();after(()=>pack.cleanup());
const mime=name=>name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.svg')?'image/svg+xml':'image/png';
function response(name,{body=pack.files.get(name),status=200,type=mime(name),url=base+name,redirected=false}={}){
  const value=new Response(body,{status,headers:{'content-type':type}});
  Object.defineProperty(value,'url',{value:url});Object.defineProperty(value,'redirected',{value:redirected});return value;
}

test('publication options permit only the known HTTPS project and isolated local ports',()=>{
  assert.equal(options([]).port,8933);assert.equal(options(['--url='+base]).url,base);
  assert.equal(options(['--url=https://lijiabao1998.github.io:443/GlimmerTown/']).url,base);
  for(const url of ['http://lijiabao1998.github.io/GlimmerTown/','https://someone-else.github.io/GlimmerTown/',base+'?x=1',base+'#x','https://user@lijiabao1998.github.io/GlimmerTown/','https://lijiabao1998.github.io:8443/GlimmerTown/','https://lijiabao1998.github.io/GlimmerTown-lab/'])assert.throws(()=>options(['--url='+url]));
  for(const port of [8123,8199,8000,65000,8933.5])assert.throws(()=>options(['--port='+port]));
  assert.throws(()=>options(['--port=8933','--port=8934']),/Duplicate/);assert.throws(()=>options(['--headless']),/Unknown/);
});

test('offline launch routes every browser scheme through a rejecting proxy without loopback bypass or direct fallback',()=>{
  const online=chromeArgs({profile:'/tmp/isolated-profile',debugPort:9933});
  const offline=chromeArgs({profile:'/tmp/isolated-profile',debugPort:9933,proxyPort:10933});
  assert(online.includes('--no-proxy-server'));assert(!offline.includes('--no-proxy-server'));
  assert(offline.includes('--proxy-server=http://127.0.0.1:10933'));
  assert(offline.includes('--proxy-bypass-list=<-loopback>'));assert(offline.includes('--disable-quic'));
  assert(online.includes('--user-data-dir=/tmp/isolated-profile')&&offline.includes('--user-data-dir=/tmp/isolated-profile'));
  for(const value of offline)assert(!/direct:\/\/|ignore-certificate|disable-web-security|headless|no-sandbox/.test(value));
  assert.throws(()=>chromeArgs({profile:'relative-profile',debugPort:9933}),/isolated profile/);
});

test('GET verification consumes and hashes all seven complete decoded bodies',async()=>{
  for(const name of Object.keys(PINS)){
    const row=await verifyAssetResponse({name,url:base+name,response:response(name),expected:pack.files.get(name)});
    assert.equal(row.method,'GET');assert.equal(row.bytes,pack.files.get(name).length);assert.equal(row.sha256,sha256(pack.files.get(name)));
  }
});

test('asset verification rejects HEAD-only, HTTP failure, redirect and incorrect MIME evidence',async()=>{
  const name='icon.svg',expected=pack.files.get(name),check=value=>verifyAssetResponse({name,url:base+name,response:value,expected});
  for(const value of [response(name,{body:null}),response(name,{status:404}),response(name,{url:base+'index.html'}),response(name,{redirected:true}),response(name,{type:'text/html'})])await assert.rejects(()=>check(value));
});

test('asset verification rejects truncated, oversized and equal-length altered bodies',async()=>{
  const name='icon.svg',expected=pack.files.get(name),changed=Buffer.from(expected);changed[changed.length-1]^=1;
  for(const body of [expected.subarray(0,expected.length-1),Buffer.concat([expected,Buffer.from('x')]),changed])await assert.rejects(()=>verifyAssetResponse({name,url:base+name,response:response(name,{body}),expected}));
});

test('rejecting proxy destroys HTTP and CONNECT sockets without forwarding or returning an application response',()=>{
  for(const request of [{method:'GET',url:'http://127.0.0.1:8933/GlimmerTown/'},{method:'CONNECT',url:'lijiabao1998.github.io:443'}]){
    let destroyed=0;const rows=[];denyProxyRequest(request,{destroy(){destroyed++;}},row=>rows.push(row));
    assert.equal(destroyed,1);assert.equal(rows.length,1);assert.equal(rows[0].target,request.url);assert.equal(rows[0].method,request.method);assert(Number.isFinite(rows[0].deniedAt));
  }
});

test('proxy evidence recognizes default HTTPS CONNECT authority while excluding unrelated hosts and ports',()=>{
  const origin='https://lijiabao1998.github.io';
  assert(proxyTargetsOrigin({method:'CONNECT',target:'lijiabao1998.github.io:443'},origin));
  assert(proxyTargetsOrigin({method:'CONNECT',target:'LIJIABAO1998.GITHUB.IO:443'},origin));
  assert(proxyTargetsOrigin({method:'GET',target:base+'index.html'},origin));
  assert(proxyTargetsOrigin({method:'GET',target:'http://127.0.0.1:8933/GlimmerTown/'},'http://127.0.0.1:8933'));
  for(const target of ['lijiabao1998.github.io','lijiabao1998.github.io:80','lijiabao1998.github.io:8443','lijiabao1998.github.io.evil.test:443','elsewhere.test:443'])assert(!proxyTargetsOrigin({method:'CONNECT',target},origin));
  assert(!proxyTargetsOrigin({method:'GET',target:'https://lijiabao1998.github.io.evil.test/GlimmerTown/'},origin));
});

test('offline proof accepts persistent Cache Storage while rejecting network/HTTP-cache/fallback sources, process reuse and leaks',()=>{
  const good={onlinePID:101,offlinePID:202,onlineExit:{code:0,signal:null},probes:[{rejected:true,timedOut:false},{rejected:true,timedOut:false}],
    // Exact provenance combination recorded by Chrome 154 in CI 37617861204.
    document:{status:200,fromServiceWorker:true,serviceWorkerResponseSource:'cache-storage',fromDiskCache:true,fromPrefetchCache:false},proxyRows:[{deniedAt:123}],localOriginRequests:0};
  assert.doesNotThrow(()=>assertOfflineEvidence(good));
  assert.doesNotThrow(()=>assertOfflineEvidence({...good,document:{...good.document,fromDiskCache:false}}));
  const firstVisit={fromServiceWorker:false,serviceWorkerResponseSource:null,fromDiskCache:false,fromPrefetchCache:false};
  assert.doesNotThrow(()=>assertDocumentProvenance(firstVisit,false));
  assert.throws(()=>assertDocumentProvenance({...firstVisit,fromDiskCache:true},false));
  assert.throws(()=>assertDocumentProvenance({...firstVisit,fromServiceWorker:true,serviceWorkerResponseSource:'cache-storage'},false));
  for(const mutate of [row=>row.offlinePID=101,row=>row.onlineExit.signal='SIGKILL',row=>row.onlineExit.code=1,row=>row.probes.pop(),row=>row.probes[0].rejected=false,
    row=>row.probes[0].timedOut=true,row=>row.proxyRows=[],row=>row.document.fromServiceWorker=false,row=>row.document.fromPrefetchCache=true,
    row=>row.document.serviceWorkerResponseSource='http-cache',row=>row.document.serviceWorkerResponseSource='network',row=>row.document.serviceWorkerResponseSource='fallback-code',
    row=>row.document.serviceWorkerResponseSource=null,row=>delete row.document.serviceWorkerResponseSource,row=>row.document.status=503,row=>row.localOriginRequests=1]){
    const broken=structuredClone(good);mutate(broken);assert.throws(()=>assertOfflineEvidence(broken));
  }
});

test('offline Continue helper invokes the real button handler, pauses before/after it and rejects a hidden or nonplayable city',()=>{
  const run=alter=>{
    class Canvas{constructor(){this.width=800;this.height=513;this.style={display:'block',visibility:'visible'};}getClientRects(){return [{}];}}
    const start={style:{display:'block'}},canvas=new Canvas(),speeds=[];let clicks=0;
    const button={disabled:false,style:{display:'block',visibility:'visible'},getClientRects:()=>[{}],click(){clicks++;start.style.display='none';}};
    alter?.({start,canvas,button});
    const result=new Function('GV','document','getComputedStyle','HTMLCanvasElement',`return (${browserContinueSavedCity.toString()})();`)(
      {setSpeed:value=>speeds.push(value),rawSave:()=>'{"money":10}',stats:()=>({money:10,day:1,buildings:2,roads:3,zones:4})},
      {getElementById:id=>({bContinue:button,start,game:canvas})[id]},element=>element.style,Canvas);
    return {result,speeds,clicks};
  };
  const positive=run();assert.equal(positive.clicks,1);assert.deepEqual(positive.speeds,[0,0]);assert(positive.result.startHidden&&positive.result.paused);
  assert.equal(positive.result.raw,'{"money":10}');assert.deepEqual(positive.result.core,{money:10,day:1,buildings:2,roads:3,zones:4});
  for(const mutate of [({button})=>button.disabled=true,({button})=>button.style.display='none',({button})=>button.getClientRects=()=>[],
    ({button})=>button.click=()=>{},({canvas})=>canvas.width=0,({canvas})=>canvas.style.display='none'])assert.throws(()=>run(mutate));
});

test('source gate enforces full online shutdown before offline restart, with unchanged assets and no registration/response rewriting',()=>{
  const source=readFileSync(new URL('./published-main.mjs',import.meta.url),'utf8');
  assert(!/navigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(/.test(source));
  assert(!/Fetch\.(fulfillRequest|enable)|Network\.emulateNetworkConditions|instrumentWorker\(/.test(source));
  assert(!source.includes('ignore-certificate-errors'));
  const ordered=[
    "await navigate(online,base+'icon.svg'",
    'await online.ev(`(${seedForeignCaches.toString()})',
    'report.firstVisit=await navigate(online,base,',
    "await shell(online,'online app-owned installation')",
    'const saved=await online.ev(`(${browserPrepareSave.toString()})',
    "await online.send('Network.clearBrowserCache')",
    "await shell(online,'Cache Storage retained after HTTP cache clear')",
    'await closeChrome(online,{requireClean:true})',
    "assert.equal(oldDebuggerAlive,false",
    "await launch('offline',proxyPort)",
    'report.offlineDocument=await navigate(offline,base,',
    'const entered=await offline.ev(`(${browserContinueSavedCity.toString()})()',
    'check(enteredObservation.exactBytes&&enteredObservation.exactCore',
    'report.reopenedSave=observation;persist();',
    'check(observation.loaded&&observation.exactBytes&&observation.exactCore',
    '\n    assertOfflineEvidence({onlinePID',
    'await closeChrome(offline,{requireClean:true})'
  ];
  let previous=-1;for(const anchor of ordered){const current=source.indexOf(anchor);assert(current>previous,'missing/out-of-order gate: '+anchor);previous=current;}
  assert(source.includes('deadline=started+14*60*1000'));
  assert(source.includes('report.proxy.filter(row=>proxyTargetsOrigin(row,origin))'));
  assert(source.includes("if(phase==='offline'){await session.send('Network.clearBrowserCache')"));
  assert(source.includes("row.requestId===request?.requestId"),'each offline probe must have its own network failure evidence');
  const observationAt=source.indexOf('audit.response=response??null;'),provenanceAt=source.indexOf('assertDocumentProvenance(response,fromWorker);');
  assert(observationAt>=0&&provenanceAt>observationAt);assert(source.slice(observationAt,provenanceAt).includes('persist();'));
});
