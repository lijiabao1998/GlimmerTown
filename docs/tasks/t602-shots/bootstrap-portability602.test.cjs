// T635：真正執行兩份台架的 bootstrap 組裝，再解析 generated game；不削弱或替換原 body 斷言。
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../..'),fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'bootstrap-portability-expected.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const cases=[{root:'C:\\fixtures\\2026-10-12\\town',path:path.win32},{root:'C:\\測試\\含\'引號"與`模板\\2026-10-12\\town',path:path.win32},{root:'/tmp/2026-10-12/測試 town',path:path.posix}];
for(const[rel,expected]of Object.entries(fixture.bodySHA256)){
  const source=fs.readFileSync(path.join(ROOT,rel),'utf8');
  test(rel+' retains original immutable assertion body',()=>{const a=source.indexOf('const body='),b=source.indexOf('\ntry{',a);assert.ok(a>=0&&b>a);assert.equal(sha(source.slice(a,b)),expected);});
  function generated(sourceText,c,timeout=10000){
    const actualRead=fs.readFileSync,root=c.root;
    const portablePath={...c.path,resolve:()=>root};
    const read=(file,...args)=>{const basename=c.path.basename(String(file));if(basename==='test_fixde.js'||basename==='index.html')return actualRead(path.join(ROOT,basename),...args);return actualRead(file,...args);};
    const localRequire=id=>id==='fs'?{...fs,readFileSync:read}:id==='path'?portablePath:id.startsWith('.')?require(path.resolve(ROOT,path.dirname(rel),id)):require(id);
    let game,called=0,exit;
    function CaptureFunction(...args){called++;const code=args.pop(),anchor='\neval(js);\n';assert.equal(code.split(anchor).length,2,'Capture only the original execution boundary');const fn=new Function(...args,code.replace(anchor,'\nreturn js;\n'));return function(...values){game=fn(...values);return game;};}
    vm.runInNewContext(sourceText,{require:localRequire,__dirname:c.path.join(root,'docs','tasks',rel.includes('test602')?'t602-shots':'t603-shots'),Function:CaptureFunction,process:{exit:n=>{exit=n;}},console:{log(){},error(){}}},{filename:rel,timeout});
    assert.equal(called,1);assert.equal(exit,0);assert.equal(typeof game,'string');return game;
  }
  // T636：每份台架第一次組裝含一次性模組載入（git 讀凍結提交、4.6MB 雜湊），保險絲 30 秒、斷言同正式案例；之後各案例仍 10 秒。
  test(rel+' first assembly warms module cache under 30s fuse '+cases[0].root,()=>{new vm.Script(generated(source,cases[0],30000),{filename:rel+'-generated.js'});});
  for(const c of cases)test(rel+' binds data path without template interpolation '+c.root,()=>{new vm.Script(generated(source,c),{filename:rel+'-generated.js'});});
  test(rel+' original Windows interpolation fails at the named syntax boundary',()=>{
    const decl=rel.includes('test602')?'const':'let';
    const old=source.replace(decl+' head=src.slice(0,cut);',decl+" head=src.slice(0,cut).split('__dirname').join(JSON.stringify(ROOT)).split('__filename').join(JSON.stringify(path.join(ROOT,'test_fixde.js')));")
      .replace("new Function('require','__dirname','__filename','function assert","new Function('require','function assert")
      .replace(")(require,ROOT,path.join(ROOT,'test_fixde.js'));process.exit(0)",' )(require);process.exit(0)');
    assert.notEqual(old,source);assert.throws(()=>new vm.Script(generated(old,cases[0])),/Octal escape sequences are not allowed in strict mode/);
  });
}
