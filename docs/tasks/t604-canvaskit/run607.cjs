'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
let runner=fs.readFileSync(path.join(__dirname,'run606.cjs'),'utf8');
runner=runner.replace("'native606-experiment.js'","'shadow607-experiment.js'");
runner=runner.replace("fs.readFileSync(path.join(__dirname,'bridge606.js'),'utf8')","fs.readFileSync(path.join(__dirname,'bridge606.js'),'utf8').replace('    status606,',fs.readFileSync(path.join(__dirname,'shadow607-capture.js'),'utf8')+'\\n    status606,')");
runner=runner.replace('native606-summary.json','shadow607-summary.json');
new Function('require','__filename','__dirname',runner)(createRequire(__filename),__filename,__dirname);
