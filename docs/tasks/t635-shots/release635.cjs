// T635 mandatory release acceptance: immutable owner art, ordinary URL, real Canvas/gameplay, retained gates.
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),vm=require('vm'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const {visualBridge635,behaviorBridge635}=require('./native635.cjs');
const ROOT=path.resolve(__dirname,'../../..'),OUT=path.resolve(process.env.OUT635||'evidence/t635-release');
const {loadApproved}=require('../../../tools/approved_art.cjs'); // T647：批准提交、批准前的 main、index.html 雜湊原本寫死在這一行，改讀 docs/APPROVED_ART.json
let APPROVED,BASE,APPROVED_HASH,ART;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:ROOT,maxBuffer:20e6});
const need=(v,m)=>{if(!v)throw Error(m);};
const line=s=>{const a=s.split('\n').filter(x=>x.startsWith('function t635On(){'));need(a.length===1,'one T635 activation function');return a[0];};
function probeBridge635(){
 const flags=()=>({on:typeof t635On==='function'?t635On():false,slot:curSlot(),query:location.search,activationExplicit:Object.prototype.hasOwnProperty.call(window,'__t635'),escapeExplicit:Object.prototype.hasOwnProperty.call(window,'__noT635'),isolatedT638:window.__noT638===true});
 window.__fireQA635.flags=flags;
 window.__fireQA635.drawChecked=(...args)=>{const old=ctx.drawImage,hits={6:0,30:0,61:0},before=JSON.stringify(tiles);ctx.drawImage=function(img,...a){if(typeof spr635==='function'&&spr635.cache)for(const s of spr635.cache.values())if(img===s.img)hits[s.lotMeta574.kind]++;return old.call(this,img,...a);};try{return{png:window.__fireQA635.draw(...args),hits,flags:flags(),modelUnchanged:before===JSON.stringify(tiles)};}finally{ctx.drawImage=old;}};
 window.__fireQA635.saveFixture=()=>{GV.save();return localStorage.getItem(slotKey(3));};
}
const inject=s=>s.replace('window.GV={',()=> '('+visualBridge635.toString()+')();('+behaviorBridge635.toString()+')();('+probeBridge635.toString()+')();window.GV={');
const CASES=[['day',false,0,false,0,1.4],['night',true,1,false,0,1.4],['snow',false,3,true,0,1.4],['rot1',false,0,false,1,1.4],['rot2',false,0,false,2,1.4],['rot3',false,0,false,3,1.4],['far',false,2,false,0,.65],...Array.from({length:3},(_,i)=>[['rot'+(i+1)+'-night',true,1,false,i+1,1.4],['rot'+(i+1)+'-snow',false,3,true,i+1,1.4]]).flat()];
function firstBehaviorFailure635(r){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),{setup,fire,legacy}=r;
 // Original canPlace returns null when no rejection reason exists; GV.place already must succeed.
 if(!setup||!same(setup.placed.map(p=>[p.k,p.cost,p.spent,p.refs,p.legal]),[[6,400,400,3,null],[30,800,800,8,null],[61,1600,1600,15,null]]))return 'real-placement';
 if(!same(setup.stages.map(s=>s.ages),[0,4,8,9,12].map(d=>[d+(legacy?60:0),d+(legacy?60:0),d+(legacy?60:0)])))return 'real-construction';
 if(!same(setup.upgrades.map(p=>[p.k,p.level,p.cost,p.spent]),[6,30,61].map((k,i)=>[k,legacy?3:2,(legacy?[661,661,1416]:[280,280,600])[i],(legacy?[661,661,1416]:[280,280,600])[i]])))return 'real-upgrade';
 if(setup.saveFacts.exactSemanticRoundtrip!==true)return 'semantic-save-roundtrip';
 if(!fire||!same(fire.ignition.map(p=>[p.x,p.ok]),[[26,true],[35,true],[44,true]]))return 'real-ignition';
 if(!Array.isArray(fire.samples.fire)||fire.samples.fire.length!==3||!fire.samples.fire.every(n=>Number.isFinite(n)&&n>0))return 'real-fire-arrival';
 return null;
}
async function main(){
 ART=loadApproved(ROOT,'T635');APPROVED=ART.approved.commit;BASE=ART.base.commit;APPROVED_HASH=ART.approved.sha256; // 標籤、雜湊、祖先、後批閥都在這裡先驗
 const approved=git('show',APPROVED+':index.html').toString('utf8'),base=git('show',BASE+':index.html').toString('utf8'),source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),head=git('rev-parse','HEAD').toString().trim();
 need(sha(approved)===APPROVED_HASH,'immutable user-approved art source hash');
 const version=s=>{const m=s.match(/const GAME_VER='[\d.]+'/g);need(m&&m.length===1,'one version anchor');return m[0];};
 // T638：原本兩條「整份 index.html 逐位元組等於批准提交／7ad6931」的斷言，會讓之後任何改到本體的卡都發不出去（業主 2026-10-14 補變體時發現）。
 // 改成只驗 T635 自己的部分：T635 區塊除啟用行外逐字等於批准提交、T635 繪製呼叫原樣只有一行；其他程式碼交給 verify.py 全套、六哨兵與各道瀏覽器驗收。卡面 T638 寫明放寬了什麼。
 const block635=s=>{const m=s.match(/\/\* ===== T635 FIRE CANDIDATE BEGIN =====[\s\S]*?\/\* ===== T635 FIRE CANDIDATE END ===== \*\//g);need(m&&m.length===1,'exactly one T635 block');return m[0];};
 const call635=s=>{const a=s.split('\n').filter(x=>x.includes('if(t635On()){const p635=spr635(bd,win&&snowLvl>0);if(p635)s=p635;}'));need(a.length===1,'exactly one T635 draw call');return a[0];};
 need(block635(source).replace(line(source),line(approved))===block635(approved),'approved T635 art block unchanged except default activation');
 need(call635(source)===call635(approved),'approved T635 draw call unchanged');
 const flag=line(source),test=q=>vm.runInNewContext(flag+';t635On()',{window:{},location:{search:q}});
 need(test('')&&test('?T635=1')&&!test('?noT635=1'),'approved fire default and URL escape semantics');
 const reds={off:source.replace(line(source),line(source).replace('window.__t635!==false','window.__t635===true')),url:source.replace('!t635On.off&&','true&&'),runtime:source.replace('!window.__noT635&&','true&&'),occlusion:source.replace("const occlude635=paint=>{ng.save();ng.globalCompositeOperation='destination-out';paint(ng);ng.restore();};",'const occlude635=paint=>{};')};
 for(const[k,s]of Object.entries(reds))need(s!==source,'targeted negative source '+k);
 const sources={approved,base,release:source,...reds};for(const s of Object.values(sources))for(const m of inject(s).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new Function(m[1]);
 if(process.argv.includes('--check')){console.log(JSON.stringify({kind:'source-and-syntax-only',head,approved:APPROVED,approvedSourceUnchanged:true,browserStarted:false}));return;}
 need(git('show','HEAD:index.html').toString('utf8')===source,'runtime equals committed exact HEAD');
 for(const p of['docs/tasks/t635-shots/release635.cjs','docs/tasks/t635-shots/native635.cjs'])need(fs.readFileSync(path.join(ROOT,p),'utf8')===git('show','HEAD:'+p).toString('utf8'),'release acceptance tool equals exact HEAD '+p);
 git('merge-base','--is-ancestor',APPROVED,head);git('merge-base','--is-ancestor',BASE,head);
 fs.mkdirSync(OUT,{recursive:true});const report={status:'running',head,approved:APPROVED,baseline:BASE,isolated:Object.fromEntries(ART.later.map(x=>[x.id,'window.'+x.valve+'=true'])),sourceScope:'T635 block and draw call only (T638)',sourceSHA256:sha(source),approvedSourceSHA256:sha(approved),errors:[],frames:[],sheets:[],negativeControls:[],behavior:[],sourcePreserved:true};
 const save=(name,png)=>{const b=Buffer.from(png.split(',')[1],'base64');fs.writeFileSync(path.join(OUT,name+'.png'),b);return sha(b);};
 const server=http.createServer((req,res)=>{const k=new URL(req.url,'http://127.0.0.1').pathname.slice(1);res.setHeader('Content-Type','text/html;charset=utf-8');res.end(sources[k]?inject(sources[k]):'<!doctype html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,{chromium}=require('playwright');let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking','--mute-audio']});report.browser=await browser.version();
  const page=await browser.newPage({viewport:{width:1560,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>report.errors.push(e.stack||e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.addInitScript(valves=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');for(const v of valves)window[v]=true;},ART.valves); // T638／T647：本檢查驗的是 T635 批准款；比它晚的批次（T638…）一律用登記冊的逃生閥關掉
  const boot=async(k,q='')=>{await page.goto(origin+'/'+k+q);await page.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:90000});await page.locator('#boot426').waitFor({state:'hidden',timeout:15000});console.log('T635 boot '+k+q);return page.evaluate(()=>__fireQA635.flags());};
  const captures=new Map(),pins={};
  for(const [label,q]of[['base',''],['approved','?T635=1'],['release','']]){
   const flags=await boot(label,q);if(label==='release')need(flags.on&&flags.slot===3&&flags.query===''&&!flags.activationExplicit&&!flags.escapeExplicit&&flags.isolatedT638===true,'normal URL genuinely defaults T635 on without hidden T635 override (T638 isolated by window.__noT638 for this whole script)');
   pins[label]=await page.evaluate(()=>__fireQA635.pins());
   for(const legacy of[false,true]){await page.evaluate(v=>__fireQA635.scene(v),legacy);for(const[name,...args]of CASES){const r=await page.evaluate(a=>__fireQA635.drawChecked(...a),args),id=(legacy?'legacy-':'')+name,digest=save(label+'-'+id,r.png);need(r.modelUnchanged,'drawing does not alter tile model');if(label!=='base')need(Object.values(r.hits).every(n=>n>0),'all three real candidate canvases actually drawn '+id);if(label==='release')need(digest===captures.get('approved/'+id),'normal URL exact immutable approved full frame '+id);captures.set(label+'/'+id,digest);report.frames.push({label,id,sha256:digest,hits:r.hits,flags:r.flags});}}
  }
  assert.deepEqual(pins.release,pins.base,'all 1586 inherited atlas pixels');assert.deepEqual(pins.approved,pins.base);need(Object.keys(pins.base).length===1586,'exact inherited atlas key count');report.atlasCount=1586;
  for(const[suffix,query,runtime]of[['url','?noT635=1',false],['precedence','?T635=1&noT635=1',false],['runtime','',true]]){await boot('release',query);if(runtime){await page.evaluate(()=>__fireQA635.scene());await page.evaluate(()=>__fireQA635.drawChecked());await page.evaluate(()=>window.__noT635=true);}for(const legacy of[false,true]){await page.evaluate(v=>__fireQA635.scene(v),legacy);for(const[name,...args]of CASES){const r=await page.evaluate(a=>__fireQA635.drawChecked(...a),args),id=(legacy?'legacy-':'')+name,digest=save('escape-'+suffix+'-'+id,r.png);need(!r.flags.on&&Object.values(r.hits).every(n=>n===0),'escape selects no new canvases');need(digest===captures.get('base/'+id),'escape exact inherited main full frame '+suffix+'/'+id);report.frames.push({label:'escape-'+suffix,id,sha256:digest,flags:r.flags});}}}
  const sheets={};for(const[label,q]of[['approved','?T635=1'],['release','']]){await boot(label,q);for(const[name,snow,night]of[['day',false,false],['night',false,true],['snow',true,false],['snow-night',true,true]]){const r=await page.evaluate(a=>__fireQA635.sheet(...a),[snow,night]),digest=save(label+'-single-'+name,r.png);need(r.records.every(v=>v.light>0&&!v.orphan&&!v.clipped&&!v.opaqueWarm),'complete approved visible layers, no confirmed opaque light');if(label==='release')need(digest===sheets[name],'all six immutable approved sprite-layer panels '+name);else sheets[name]=digest;report.sheets.push({label,name,sha256:digest,records:r.records});}}
  await boot('release');await page.evaluate(()=>__fireQA635.scene());await page.evaluate(()=>__fireQA635.draw());await page.screenshot({path:path.join(OUT,'normal-full-game.png')});
  const gameplay={};for(const label of['base','release']){await boot(label);gameplay[label]=[];for(const legacy of[false,true]){const setup=await page.evaluate(v=>__behavior635.setup(v),legacy),fire=await page.evaluate(()=>__behavior635.fire());gameplay[label].push({legacy,setup,fire});if(label==='release'){fs.writeFileSync(path.join(OUT,(legacy?'legacy':'new')+'-saved-city.json'),await page.evaluate(()=>__fireQA635.saveFixture()));if(!legacy)for(const[tag,args]of[['construction0',[0,false,false]],['construction4',[4,false,false]],['construction8',[8,false,false]],['hover-night',[60,true,false]],['wet-day',[60,false,true]]])save(tag,await page.evaluate(a=>__behavior635.visual(...a),args));}}}
  for(const [label,rows]of Object.entries(gameplay))for(const r of rows)need(firstBehaviorFailure635(r)===null,'positive behavior facts '+label+'/'+(r.legacy?'legacy':'new')+': '+firstBehaviorFailure635(r));
  assert.deepEqual(gameplay.release,gameplay.base,'real placement, construction, upgrades, old/new save/load and fire dispatch retain all inherited state');report.behavior=gameplay.release.map(r=>({legacy:r.legacy,parity:true,saveRoundtrip:r.setup.saveFacts.exactSemanticRoundtrip,arrivals:r.fire.samples.fire}));fs.writeFileSync(path.join(OUT,'full-behavior.json'),JSON.stringify(gameplay));
  for(const [k,mutate]of[['semantic-save-roundtrip',r=>r.setup.saveFacts.exactSemanticRoundtrip=false],['real-ignition',r=>r.fire.ignition[0].ok=false],['real-fire-arrival',r=>r.fire.samples.fire=[]]]){const both={base:structuredClone(gameplay.base[0]),release:structuredClone(gameplay.release[0])};mutate(both.base);mutate(both.release);assert.deepEqual(both.base,both.release,'shared degenerate fixture would still pass parity');need(firstBehaviorFailure635(both.release)===k,'shared fixture negative must fail '+k);report.negativeControls.push({k:'shared-fixture-'+k,firstFailure:k});}
  report.random=await page.evaluate(()=>__behavior635.random());need(report.random.browser===0&&Object.values(report.random.world).every(n=>n===0),'no shared random consumed');
  for(const[k,q,runtime,expected]of[['off','',false,'default-activation'],['url','?noT635=1',false,'url-escape'],['runtime','',true,'runtime-escape']]){const f=await boot(k,q);await page.evaluate(()=>__fireQA635.scene());if(runtime){await page.evaluate(()=>__fireQA635.draw());await page.evaluate(()=>window.__noT635=true);}const r=await page.evaluate(()=>__fireQA635.drawChecked()),h=save('negative-'+k,r.png),failure=k==='off'?!f.on?'default-activation':null:r.flags.on?expected:null;need(failure===expected,'targeted first failure '+k);need(k==='off'?h===captures.get('base/day'):h!==captures.get('base/day'),'negative pixel result is meaningful '+k);report.negativeControls.push({k,firstFailure:failure});}
  await boot('occlusion');const red=await page.evaluate(()=>__fireQA635.sheet(false,true));save('negative-occlusion',red.png);need(red.records.filter(r=>r.opaqueWarm>0).length===3,'original three opaque light defects recur');report.negativeControls.push({k:'occlusion',firstFailure:'opaque-night-occlusion',records:red.records});
  need(report.errors.length===0,'zero genuine browser errors');need(git('rev-parse','HEAD').toString().trim()===head&&fs.readFileSync(path.join(ROOT,'index.html'),'utf8')===source,'exact source and HEAD stable throughout capture');report.status='passed';
 }catch(e){report.status='failed';report.errors.push(e.stack||String(e));throw e;}finally{fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
 console.log('T635_RELEASE_RESULT '+JSON.stringify({status:report.status,head,frames:report.frames.length,atlas:report.atlasCount,behavior:report.behavior,negativeControls:report.negativeControls}));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
