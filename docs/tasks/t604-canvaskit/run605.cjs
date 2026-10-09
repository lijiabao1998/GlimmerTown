'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
if(!process.argv.includes('--direct-audit'))process.argv.push('--direct-audit');
let runner=fs.readFileSync(path.join(__dirname,'run604.cjs'),'utf8');
function replace(from,to){if(runner.split(from).length!==2)throw Error('Structural runner boundary drift: '+from);runner=runner.replace(from,to);}
replace('source=source.slice(0,start)',"experiment604+=fs.readFileSync(path.join(__dirname,'structural-experiment605.js'),'utf8');\nsource=source.slice(0,start)");
replace("\nnew Function('require','__filename','__dirname',source);","\nsource=source.replace('  window.__s603={',fs.readFileSync(path.join(__dirname,'bridge605.js'),'utf8')+'\\n  window.__s603={');\nnew Function('require','__filename','__dirname',source);");
replace('canvaskit604-direct-summary.json','structural605-summary.json');
new Function('require','__filename','__dirname',runner)(createRequire(__filename),__filename,__dirname);
