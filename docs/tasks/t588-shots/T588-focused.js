/* T588 isolated guard replay. Executes the literal T588 block from test_fixde.js. */
'use strict';
const fs=require('fs'),path=require('path'),Module=require('module');
const root=path.resolve(__dirname,'..','..','..'),testFile=path.join(root,'test_fixde.js');
const {bootstrap576}=require(path.join(root,'tools','health_panel.js'));
const source=fs.readFileSync(testFile,'utf8');
const begin='/* ===== T588 電源替代接路／按施工單補足紓困，不得只是多發錢 ===== */';
const end='/* ===== T588 電源接路 END ===== */';
const a=source.indexOf(begin),b=source.indexOf(end);
if(a<0||b<=a||source.indexOf(begin,a+begin.length)>=0||source.indexOf(end,b+end.length)>=0)
  throw Error('T588 guard slice anchor drift');
const saved=console.log;console.log=(...v)=>{if(!String(v[0]).startsWith('PASS:'))saved(...v);};
const m=new Module(testFile,module);m.filename=testFile;m.paths=Module._nodeModulePaths(root);
try{m._compile(bootstrap576(source)+'\n'+source.slice(a,b+end.length)+'\nconsole.log("FOCUSED588 DONE");',testFile);}
finally{console.log=saved;}
process.exit(0);
