'use strict';
/* T677 product boundary contracts. Existing regression assertions are not replaced. */
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert');
const here=__dirname,root=path.resolve(here,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),meta=JSON.parse(read('docs/tasks/t677-shots/sources.json')),html=read('index.html'),checks=[],landingSnapshot=process.argv.includes('--landing-snapshot');
function check(ok,name){assert(ok,name);checks.push(name);}
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];check(scripts.length===1,'one original inline product script');new Function(scripts[0][1]);checks.push('product JavaScript parses');
const runtime=read('docs/tasks/t677-shots/product-runtime.js'),ui=read('docs/tasks/t677-shots/product-ui.js'),atlas=read('docs/tasks/t677-shots/product-atlas.js'),markup=read('docs/tasks/t677-shots/product-ui.html'),manifest=JSON.parse(read('docs/tasks/t677-shots/promotion-manifest.json'));
for(const [name,s]of Object.entries({runtime,ui,atlas,markup}))check(html.split(s).length===2,'exact independent source included once: '+name);
check(hash(runtime)===manifest.runtimeSHA256,'selected runtime provenance hash');
for(const token of ['P06Test','NativeHarborFixtures','P06Performance','P06VectorCache','__p06BaselinePerf','p06-fixture','p06-replay','p06-status','p06-diagnostics','localStorage','serviceWorker','setInterval(tick','function clock()'])check(!(runtime+ui+markup).includes(token),'no candidate QA or storage override: '+token);
check(!/^\s*(?:replay|live|setup|seek)\s*\(/m.test(runtime),'no fixed-scenario/replay controls in runtime');
check(runtime.includes("mode:'live'")&&runtime.includes('enabled:false'),'fresh page starts explicitly live-clock OFF');
const valve=runtime.match(/^function t677On\(\)\{[^\n]+/m)?.[0];const valveProbe=(search,disabled)=>vm.runInNewContext(valve+';t677On()',{window:{__noT677:disabled},location:{search}});check(valve&&valveProbe('',false)===true&&valveProbe('',true)===false&&valveProbe('?noT677=1',false)===false&&valveProbe('?noT677',false)===false&&vm.runInNewContext(valve+';t677On();window.__noT677=true;!t677On()',{window:{},location:{search:''}})===true,'query and dynamic escape valves');
check(ui.includes('DOMContentLoaded')&&ui.includes('ResizeObserver'),'native-safe delayed UI mount and capability-based layout');
check(markup.includes('不隨城市存檔保存'),'explicit memory-only batch disclosure');
const registry=JSON.parse(read('docs/APPROVED_ART.json'));check(registry.valves.T677==='__noT677','approved-art valve registration');
if(landingSnapshot){
const origRegistry=JSON.parse(cp.execFileSync('git',['show',meta.mainBaseline+':docs/APPROVED_ART.json'],{cwd:root,encoding:'utf8'})),currentRegistry=JSON.parse(JSON.stringify(registry));delete currentRegistry.valves.T677;check(JSON.stringify(currentRegistry)===JSON.stringify(origRegistry),'registry changes only own valve');
// Reproduce the entire index from unchanged native bytes and the finite reviewed hook list.
// This catches unrelated production/storage/economy changes without assuming function boundaries.
const written=new Map(),shim=Object.assign({},fs,{writeFileSync:(p,s)=>written.set(path.resolve(p),String(s))});
vm.runInNewContext(read('docs/tasks/t677-shots/integrate.cjs'),{require:n=>n==='fs'?shim:require(n),__dirname:here,console:{log(){}},Buffer},{timeout:10000});
const built=written.get(path.join(root,'index.html')),ver=html.match(/const GAME_VER='([^']+)'/)?.[1];check(!!built&&!!ver,'reproducible native integration and version');
const expected=built.replace(/const GAME_VER='[^']+'/,'const GAME_VER='+JSON.stringify(ver).replaceAll('"',"'"));check(expected===html,'only documented native hooks, own additions and normal version bump');
}
const gameVersion=html.match(/const GAME_VER='([^']+)'/)?.[1],workerVersion=read('sw.js').match(/const APP_VER='([^']+)'/)?.[1];check(!!gameVersion&&gameVersion===workerVersion,'native APP_VER and GAME_VER synchronized without pinning future releases');
check(atlas.includes('viewRot=saved.viewRot')&&!/saved\.rot\b|\brot=r/.test(atlas),'atlas restores real native view rotation');
console.log(JSON.stringify({passed:true,checks:checks.length,names:checks,indexSHA256:hash(html),runtimeSHA256:hash(runtime),browserAcceptance:false,landingSnapshot}));
