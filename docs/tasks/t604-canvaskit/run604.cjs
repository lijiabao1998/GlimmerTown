'use strict';
// One qualified native Mac experiment. Builds only disposable isolated copies.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const sceneDir=path.resolve(__dirname,'../t603-shots'),foreground=path.join(sceneDir,'foreground603.js'),text=fs.readFileSync(foreground,'utf8');
const tail="const compile=new Function('require','__filename','__dirname',source);";
if(text.split(tail).length!==2)throw Error('Qualified foreground source boundary drift');
let source=new Function('require','__filename','__dirname',text.slice(0,text.indexOf(tail))+'\nreturn source;')(createRequire(foreground),foreground,sceneDir);
const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('T604 harness anchor drift: '+from.slice(0,120));source=source.replace(from,to);};
const start=source.indexOf("    report.flags=await ev('__s603.flags()');"),end=source.indexOf("    report.finalFlags=await ev('__s603.flags()');",start);
if(start<0||end<=start)throw Error('Experiment boundary missing');
// Test-only selectors follow the independently verified main package namespace.
let experiment604=fs.readFileSync(path.join(__dirname,'experiment604.js'),'utf8');
const costAudit604=process.argv.includes('--cost-audit');
const bufferAudit604=process.argv.includes('--buffer-audit');
if(costAudit604&&bufferAudit604)throw Error('Choose one diagnostic mode');
if(costAudit604||bufferAudit604){
  const boundary="    check(hash(JSON.stringify(await ev('__audit604.restoreActors()')))";
  if(experiment604.split(boundary).length!==2)throw Error('Cost-only experiment boundary drift');
  experiment604=experiment604.slice(0,experiment604.indexOf(boundary))+fs.readFileSync(path.join(__dirname,bufferAudit604?'buffer-experiment604.js':'cost-experiment604.js'),'utf8');
}
source=source.slice(0,start).replaceAll('glimmerville.v1','glimmerville.main.v1')+experiment604+source.slice(end).replaceAll('glimmerville.v1','glimmerville.main.v1');
replace("const nativeSource603=assertNativeSource603(html,check),exactBase603=nativeSource603.base;",String.raw`
const contract604=require('../t604-canvaskit/source-contract.cjs');
report.sourceContract604=contract604.verify(ROOT);
const native604=contract604.invertIndex(html),nativeSource603=assertNativeSource603(native604,check),exactBase603=nativeSource603.base;
const namespace604=s=>s.replace("const SAVEKEY='glimmerville.v1';","const SAVEKEY='glimmerville.main.v1';");
html=namespace604(html);
fs.writeFileSync(path.join(DIR,'native604.html'),namespace604(native604).replace('window.GV={','('+bridge603.toString()+')();window.GV={'));
for(const name of ['renderers','vendor/canvaskit-0.42.0'])fs.cpSync(path.join(ROOT,name),path.join(DIR,name),{recursive:true});
let sw604=fs.readFileSync(path.join(DIR,'sw.js'),'utf8');
sw604=sw604.replace("const CACHE_PREFIX='glimmerville-shell-';","const CACHE_PREFIX='glimmerville-main-shell-';").replace("const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);","const LEGACY_CACHES=new Set([]);");
fs.writeFileSync(path.join(DIR,'sw.js'),sw604);
report.packageBytes604={};for(const name of ['index.html','sw.js','manifest.json','icon.svg','icon-v1-192.png','icon-v1-512.png','icon-v1-maskable-512.png',...contract604.extraFiles.map(s=>s.slice(2))])report.packageBytes604[name]=fs.statSync(path.join(DIR,name)).size;
`);
replace("res.writeHead(200,{'content-type':","(report.assetHTTP604||(report.assetHTTP604=[])).push({path:new URL(req.url,'http://127.0.0.1').pathname,bytes:data.length,time:Date.now()});res.writeHead(200,{'content-type':");
replace("target.endsWith('.json')?'application/json':'application/octet-stream'","target.endsWith('.json')?'application/json':target.endsWith('.wasm')?'application/wasm':'application/octet-stream'");
replace("const report={status:'running',", "const report={candidate:'T604 CanvasKit 0.42 whole-night prototype',releaseGatePassed:false,fullRegressionRun:false,thresholdFPS:55,status:'running',");
replace("path.join(OUT,'scene603-summary.json')",bufferAudit604?"path.join(OUT,'canvaskit604-buffer-summary.json')":costAudit604?"path.join(OUT,'canvaskit604-cost-summary.json')":"path.join(OUT,'canvaskit604-summary.json')");
replace("    await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready();","    await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html?renderer=canvaskit'});await ready();");
replace('  window.__s603={',String.raw`
  const actorLists604=()=>({cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,confetti});
  let originalActors604=null,costInputs604=null;
  const cloneActors604=value=>{
    const clone=v=>{if(v===null||typeof v==='string'||typeof v==='boolean')return v;if(typeof v==='number'&&Number.isFinite(v))return v;if(Array.isArray(v))return v.map(clone);if(v&&Object.getPrototypeOf(v)===Object.prototype)return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));throw Error('Non-data actor field in snapshot');};
    const lists=actorLists604();if(!value||Object.keys(value).sort().join()!==Object.keys(lists).sort().join())throw Error('Incomplete actor snapshot');
    for(const[k,rows]of Object.entries(value))if(!Array.isArray(rows)||rows.length!==lists[k].length)throw Error('Actor count mismatch '+k);
    return clone(value);
  };
  window.__audit604={
    bufferReplay:which=>{if(running)throw Error('Buffer proof requires frozen diagnostic input');const c=__townRenderer604,packet=which==='decoded'?window.__bufferDecoded604:window.__bufferOriginal604,old=R,before=__s603.scene(),clocks=__s603.compositorState();let rngCalls=0;R=()=>{rngCalls++;return old();};try{const result=c.player.render(packet);c.show('gpu');return {rngCalls,sceneSame:before===__s603.scene(),clocksSame:JSON.stringify(clocks)===JSON.stringify(__s603.compositorState()),actualGPU:c.surface.reportBackendTypeIsGPU(),result};}finally{R=old;}},
    startCostInputs:()=>{if(running||costInputs604)throw Error('Cost input capture requires a new frozen diagnostic');costInputs604={rainbowT,trafClock,waterT,waterF,visT};return {captured:{...costInputs604},fixed:{rainbowT,trafClock:100,waterT:0,waterF:0,visT:100}};},
    restoreCostInputs:()=>{if(running||!costInputs604)throw Error('Cost input restore requires a frozen diagnostic');({rainbowT,trafClock,waterT,waterF,visT}=costInputs604);costInputs604=null;return {rainbowT,trafClock,waterT,waterF,visT};},
    costFrame:()=>{if(running||measureWork603||!costInputs604)throw Error('Cost frame requires stopped diagnostic updates and captured inputs');rainbowT=costInputs604.rainbowT;trafClock=100;waterT=0;waterF=0;__s603.freezeVis(100);const c=__townRenderer604,before=__s603.scene(),old=R;let rngCalls=0;R=()=>{rngCalls++;return old();};try{GV.forceDraw();return {frame:c.lastFrame,rngCalls,sceneSame:before===__s603.scene(),actualGPU:c.surface.reportBackendTypeIsGPU()};}finally{R=old;}},
    actors:value=>{
      if(value===undefined)return cloneActors604(actorLists604());
      if(running||measureWork603||compositorRunning603===null)throw Error('Actor input sharing requires a frozen snapshot');
      const next=cloneActors604(value),lists=actorLists604();
      if(originalActors604===null)originalActors604=Object.fromEntries(Object.entries(lists).map(([k,rows])=>[k,rows.slice()]));
      for(const[k,rows]of Object.entries(lists))rows.splice(0,rows.length,...next[k]);
      return cloneActors604(lists);
    },
    restoreActors:()=>{if(running)throw Error('Actor restoration requires a frozen snapshot');if(originalActors604){for(const[k,rows]of Object.entries(actorLists604()))rows.splice(0,rows.length,...originalActors604[k]);originalActors604=null;}return cloneActors604(actorLists604());},
    replay:()=>{const c=window.__townRenderer604;if(!c||!c.lastPacket)throw Error('No retained packet');const old=R,before=__s603.scene(),clock=__s603.compositorState();let calls=0;R=()=>{calls++;return old();};try{c.player.render(c.lastPacket);c.recorder.replayNative(c.lastPacket);return {rngCalls:calls,sceneSame:before===__s603.scene(),clockSame:JSON.stringify(clock)===JSON.stringify(__s603.compositorState())};}finally{R=old;}},
    fallback:()=>{const c=window.__townRenderer604,end=c.recorder.end,oldDraw=draw;let draws=0;draw=function(...a){draws++;return oldDraw(...a);};c.recorder.end=function(){const p=end.call(this);p.commands.push({kind:'fillText',args:['T604 fallback',20,40],state:p.commands[0].state});return p;};try{GV.forceDraw();return {draws,info:c.info()};}finally{draw=oldDraw;c.recorder.end=end;}}
  };
  window.__s603={`);
new Function('require','__filename','__dirname',source);
if(process.argv.includes('--check-overlay'))console.log('T604_CANVASKIT_HARNESS_OK '+crypto.createHash('sha256').update(source).digest('hex'));
else new Function('require','__filename','__dirname',source)(createRequire(foreground),path.join(sceneDir,'scene603.js'),sceneDir);
