'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function compileDocument617(html) {
  // A literal opening tag inside the game's JavaScript comment is ordinary
  // script text. Splitting on every opening tag truncates that valid program.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw Error('T617 requires one complete native inline game script');
  new Function(scripts[0][1]);
  return true;
}
function build() {
  const scenes = path.resolve(__dirname, '../t603-shots'), foreground = path.join(scenes, 'foreground603.js');
  const text = fs.readFileSync(foreground, 'utf8'), tail = "const compile=new Function('require','__filename','__dirname',source);";
  if (text.split(tail).length !== 2) throw Error('T617 foreground generator boundary drift');
  let source = new Function('require', '__filename', '__dirname', text.slice(0, text.indexOf(tail)) + '\nreturn source;')(createRequire(foreground), foreground, scenes);
  const replace = (from, to) => { if (source.split(from).length !== 2) throw Error('T617 exact harness boundary drift: ' + from.slice(0, 100)); source = source.replace(from, to); };
  const start = source.indexOf("    report.flags=await ev('__s603.flags()');"), end = source.indexOf("    report.finalFlags=await ev('__s603.flags()');", start);
  if (start < 0 || end <= start) throw Error('T617 experiment boundary drift');
  source = source.slice(0, start) + fs.readFileSync(path.join(__dirname, 'active617-experiment.js'), 'utf8') + source.slice(end);
  const bridgeStart = source.indexOf('function bridge603(){'), bridgeEnd = source.indexOf('// Inverse only approved art changes', bridgeStart);
  if (bridgeStart < 0 || bridgeEnd <= bridgeStart) throw Error('T617 bridge boundary drift');
  let bridge = fs.readFileSync(path.join(__dirname, 'bridge610.js'), 'utf8');
  if (bridge.split('  window.__s603={').length !== 2) throw Error('T617 native bridge insertion drift');
  bridge = bridge.replace('T603:t603On()', 'T603:typeof t603On==="function"?t603On():false').replace('  window.__s603={', fs.readFileSync(path.join(__dirname, 'active617-bridge.js'), 'utf8') + '\n  window.__s603={');
  source = (source.slice(0, bridgeStart) + bridge + '\n' + source.slice(bridgeEnd)).replaceAll('glimmerville.v1', 'glimmerville.main.v1');
  replace("const nativeSource603=assertNativeSource603(html,check),exactBase603=nativeSource603.base;", String.raw`
const contract617=require('../t604-canvaskit/source-contract.cjs');
report.active617SourceContract=contract617.verify(ROOT);
const native617=contract617.invertIndex(html),nativeSource603=assertNativeSource603(native617,check);
const namespace617=s=>s.replace("const SAVEKEY='glimmerville.v1';","const SAVEKEY='glimmerville.main.v1';");
const exactBase603=namespace617(nativeSource603.base),selected617=process.env.T617_ARM==='main-t602'?nativeSource603.base:native617;
html=namespace617(selected617);
report.active617Harness=metadata617;
report.active617Document={arm:process.env.T617_ARM,rawSHA256:hash(selected617),namespaceSHA256:hash(html),
  baseCommit:'329f660e3d5f011ac28454cb6d6a68f8525c69cc',baseGitBlob:'3c065a4952706a51147c3f64080ba2489977fb16',
  nativeCommit:'23564a810546e585758236553d1432c3aacb760b',observerInstalled:false,retentionInstalled:false};
const nativeSW617=contract617.invertSW(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'))
  .replace("const CACHE_PREFIX='glimmerville-shell-';","const CACHE_PREFIX='glimmerville-main-shell-';")
  .replace("const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);","const LEGACY_CACHES=new Set([]);");
fs.writeFileSync(path.join(DIR,'sw.js'),nativeSW617);
report.active617Document.serviceWorkerSHA256=hash(nativeSW617);
`);
  const write = "fs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));";
  replace(write, write + "\nreport.active617Document.servedSHA256=hash(fs.readFileSync(path.join(DIR,'index.html')));\n(" + compileDocument617.toString() + ")(fs.readFileSync(path.join(DIR,'index.html'),'utf8'));");
  replace("check(report.finalFlags.T603&&!report.finalFlags.T596&&!report.finalFlags.T600,'final preview flags preserved')", "check(report.finalFlags.T603===(process.env.T617_ARM==='native-t603')&&!report.finalFlags.T596&&!report.finalFlags.T600,'final T617 selected flags preserved')");
  replace("path.join(OUT,'scene603-summary.json')", "path.join(OUT,'active617-summary.json')");
  replace("const report={status:'running',", "const active617ChildStarted=Date.now();\nconst report={status:'running',");
  // The one continuous 140s observation has its own 155s browser watchdog.
  replace("reject(Error('CDP timeout: '+method));},150000)", "reject(Error('CDP timeout: '+method));},180000)");
  new Function('require', '__filename', '__dirname', 'metadata617', source);
  const files = ['active617-build.cjs', 'active617-bridge.js', 'active617-experiment.js', 'active617-metrics.cjs', 'bridge610.js'];
  const metadata = { generatedSHA256: hash(source), sourceFiles: Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(__dirname, f)))])) };
  return { source, metadata, scenes, bridge };
}
module.exports = { build, hash, compileDocument617 };
