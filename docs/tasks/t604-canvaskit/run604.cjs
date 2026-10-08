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
source=source.slice(0,start).replaceAll('glimmerville.v1','glimmerville.main.v1')+fs.readFileSync(path.join(__dirname,'experiment604.js'),'utf8')+source.slice(end).replaceAll('glimmerville.v1','glimmerville.main.v1');
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
replace("path.join(OUT,'scene603-summary.json')","path.join(OUT,'canvaskit604-summary.json')");
replace("    await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'});await ready();","    await send('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html?renderer=canvaskit'});await ready();");
replace('  window.__s603={',String.raw`
  window.__audit604={
    replay:()=>{const c=window.__townRenderer604;if(!c||!c.lastPacket)throw Error('No retained packet');const old=R,before=__s603.scene(),clock=__s603.compositorState();let calls=0;R=()=>{calls++;return old();};try{c.player.render(c.lastPacket);c.recorder.replayNative(c.lastPacket);return {rngCalls:calls,sceneSame:before===__s603.scene(),clockSame:JSON.stringify(clock)===JSON.stringify(__s603.compositorState())};}finally{R=old;}},
    fallback:()=>{const c=window.__townRenderer604,end=c.recorder.end,oldDraw=draw;let draws=0;draw=function(...a){draws++;return oldDraw(...a);};c.recorder.end=function(){const p=end.call(this);p.commands.push({kind:'fillText',args:['T604 fallback',20,40],state:p.commands[0].state});return p;};try{GV.forceDraw();return {draws,info:c.info()};}finally{draw=oldDraw;c.recorder.end=end;}}
  };
  window.__s603={`);
new Function('require','__filename','__dirname',source);
if(process.argv.includes('--check-overlay'))console.log('T604_CANVASKIT_HARNESS_OK '+crypto.createHash('sha256').update(source).digest('hex'));
else new Function('require','__filename','__dirname',source)(createRequire(foreground),path.join(sceneDir,'scene603.js'),sceneDir);
