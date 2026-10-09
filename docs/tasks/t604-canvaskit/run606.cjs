'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
let runner=fs.readFileSync(path.join(__dirname,'run604.cjs'),'utf8');
function replace(from,to){if(runner.split(from).length!==2)throw Error('Native runner boundary drift: '+from);runner=runner.replace(from,to);}
replace('source=source.slice(0,start)',"experiment604=fs.readFileSync(path.join(__dirname,'native606-experiment.js'),'utf8');\nsource=source.slice(0,start)");
replace("\nnew Function('require','__filename','__dirname',source);",String.raw`
const bridgeStart606=source.indexOf('function bridge603(){'),bridgeEnd606=source.indexOf('// Inverse only approved art changes',bridgeStart606);
if(bridgeStart606<0||bridgeEnd606<bridgeStart606)throw Error('Native bridge boundary drift');
source=source.slice(0,bridgeStart606)+fs.readFileSync(path.join(__dirname,'bridge606.js'),'utf8')+'\n'+source.slice(bridgeEnd606);
if(source.split("PORT+'/index.html?renderer=canvaskit'").length!==2)throw Error('Native navigation boundary drift');
source=source.replace("PORT+'/index.html?renderer=canvaskit'","PORT+'/native604.html'");
source=source.replace("path.join(OUT,'canvaskit604-summary.json')","path.join(OUT,'native606-summary.json')");
new Function('require','__filename','__dirname',source);`);
new Function('require','__filename','__dirname',runner)(createRequire(__filename),__filename,__dirname);
