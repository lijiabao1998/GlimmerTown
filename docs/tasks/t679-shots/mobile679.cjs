#!/usr/bin/env node
/* T679：真 Chromium UI 幾何、點擊、觸控與精確 base 對照；輸出只到倉庫外。 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const args=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(2,i),s.slice(i+1)];}));
if(!args.base||!args.out)throw Error('require --base=<git ref> --out=<new directory outside repo>');
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim(),out=path.resolve(args.out);
if(out===root||out.startsWith(root+path.sep))throw Error('evidence must stay outside repo');
fs.mkdirSync(out,{recursive:false});
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const base=git('rev-parse',args.base),head=git('rev-parse','HEAD');
const baseHtml=execFileSync('git',['show',base+':index.html'],{cwd:root,maxBuffer:16*1024*1024});
const headHtml=fs.readFileSync(path.join(root,'index.html'));
const report={base,head,dirty:git('status','--porcelain'),sourceSha256:crypto.createHash('sha256').update(headHtml).digest('hex'),browserPlugin:'absent',browserReason:'Browser plugin not available',flow:'load -> seeded town -> mobile HUD/category/toolbar actions -> state and geometry proof',checks:[],screenshots:[],errors:[],negative:args.negative||null};
let activePage,browser,server;
function check(ok,name,details){report.checks.push({pass:!!ok,name,details});if(!ok)throw Error(name+': '+JSON.stringify(details));}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function snap(page){return page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,clientWidth:el.clientWidth,clientHeight:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,scrollLeft:el.scrollLeft,scrollTop:el.scrollTop,display:s.display,font:s.font,lineHeight:s.lineHeight,gap:s.gap,paddingTop:s.paddingTop,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,paddingBottom:s.paddingBottom,background:s.backgroundColor,border:s.border,borderRadius:s.borderRadius,maxHeight:s.maxHeight,touchAction:s.touchAction};};
 const els={};for(const sel of ['#hud','#toolcats','#tools','#zoomer','#zin','#zout','#hint','#mini','#miniToggle','#info'])els[sel]=rect(document.querySelector(sel));
 const buttons=[...document.querySelectorAll('#hud button,#toolcats button,#tools button,#zoomer button,#miniToggle')].filter(el=>getComputedStyle(el).display!=='none').map(el=>({id:el.id,tid:el.dataset.tid||null,text:el.textContent,...rect(el)}));
 const dom=[...document.querySelectorAll('#hud *,#toolcats *,#tools *,#zoomer *')].map(el=>({tag:el.tagName,id:el.id,tid:el.dataset.tid||null,text:el.children.length?null:el.textContent}));
 return {title:document.title,slot:localStorage.getItem('glimmerville.v1.slot'),stats:GV.stats(),els,buttons,dom,rootClass:document.documentElement.className};
});}
async function shot(page,name){const p=path.join(out,name+'.png');await page.screenshot({path:p,fullPage:false});report.screenshots.push(p);}
async function open(name,width,height,{baseMode=false,insets=null,valve=null}={}){
 const mobile=width<900,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
 await context.addInitScript(({valve})=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');if(valve==='window')window.__noT679=true;},{valve});
 const page=await context.newPage();activePage=page;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const cdp=await context.newCDPSession(page);
 if(insets)await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets});
 const url=report.origin+'/'+(baseMode?'base/':'')+'index.html'+(valve==='query'?'?noT679=1':'');
 await page.goto(url,{waitUntil:'load'});
 await page.waitForFunction(()=>window.GV&&window.__boot426&&window.__boot426().ready&&document.querySelector('#boot426').classList.contains('hide'),{timeout:120000});
 await page.locator('#bNewGame').click();
 await page.evaluate(()=>{GV.newWorldSeeded(301);GV.setSpeed(0);GV.ai(true);for(let i=0;i<6;i++)GV.step(60);GV.ai(false);GV.setSpeed(0);});
 await delay(900);
 /* 等既有數字動畫的可見結果落定；遊戲的 tween 私有狀態在 IIFE 內，不改它。 */
 await page.waitForFunction(()=>{
  const values=['money','pop','jobs'].map(id=>document.querySelector('#'+id+' b').textContent),key=values.join('|');
  const s=window.__qa679Stable||(window.__qa679Stable={value:null,time:0});
  if(s.value!==key){s.value=key;s.time=performance.now();}
  const stats=GV.stats(),num=v=>Number(v.replace(/,/g,''));
  return num(values[1])===stats.pop&&num(values[2])===stats.jobs&&performance.now()-s.time>=450;
 },{timeout:15000});
 const state=await snap(page);check(page.url()===url&&state.title.includes('微光小鎮'),name+' page identity',{url:page.url(),title:state.title});
 check(state.slot==='3',name+' slot 3 before load',state.slot);
 check(state.buttons.length>20&&!await page.locator('#start').isVisible(),name+' meaningful game screen',state.buttons.length);
 check(errors.length===0,name+' console health',errors);
 return {page,context,cdp,state,name,width,height,insets:insets||{top:0,left:0,bottom:0,right:0},errors};
}
function mobileGeometry(run,state,expanded=false){
 const {width,height,insets,name}=run,e=state.els,h=e['#hud'],t=e['#tools'],c=e['#toolcats'],z=e['#zoomer'];
 check(parseFloat(h.paddingTop)>=insets.top&&parseFloat(h.paddingLeft)>=insets.left&&parseFloat(h.paddingRight)>=insets.right,name+' safe-area HUD',{insets,h});
 check(t.x>=Math.max(8,insets.left)&&height-t.bottom>=Math.max(8,insets.bottom)-.1&&width-z.right>=Math.max(8,insets.right)-.1,name+' safe-area dock',{insets,t,z});
 check(c.bottom<=t.y-5.9&&Math.abs(c.x-t.x)<.1&&Math.abs(c.right-t.right)<.1,name+' dock separation',{expanded,c,t});
 check(t.right<=z.x-7.9&&c.right<=z.x-7.9,name+' zoom lane',{c,t,z});
 check(h.y>=0&&h.bottom<height&&t.y>=h.bottom&&t.bottom<=height&&c.y>=h.bottom,name+' viewport bounds',{h,c,t,height});
 check(state.buttons.every(b=>b.width>=39.9&&b.height>=39.9),name+' action touch targets',state.buttons.filter(b=>b.width<39.9||b.height<39.9));
 check(state.buttons.filter(b=>b.tid).every(b=>b.width>=52&&b.height>=56),name+' tool touch targets',state.buttons.filter(b=>b.tid));
 const hint=e['#hint'],mini=e['#mini'],toggle=e['#miniToggle'];
 check(mini.y>=h.bottom+7.9&&toggle.y>=h.bottom+7.9&&hint.y>=h.bottom+7.9,name+' HUD companion clearance',{h,hint,mini,toggle});
 check(hint.right<=toggle.x-7.9,name+' hint minimap clearance',{hint,toggle});
}
async function swipe(run,selector,axis,reverse=false){
 const box=await run.page.locator(selector).boundingBox();const before=await run.page.locator(selector).evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
 const horizontal=axis==='x',start={x:horizontal?box.x+box.width-20:box.x+24,y:horizontal?box.y+box.height/2:box.y+box.height-20};
 const end={x:horizontal?box.x+20:start.x,y:horizontal?start.y:box.y+20};
 if(reverse){const x=start.x,y=start.y;start.x=end.x;start.y=end.y;end.x=x;end.y=y;}
 await run.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
 for(let i=1;i<=12;i++){await run.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12,id:1}]});await delay(16);}
 await run.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(250);
 const after=await run.page.locator(selector).evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
 check(horizontal?(reverse?after.x<before.x:after.x>before.x):(reverse?after.y<before.y:after.y>before.y),run.name+' trusted touch scroll '+selector,{before,after});
}
async function panel(run,label){
 const {page,name,width,height,insets}=run;await page.locator('#bStats').tap();
 await page.locator('#info').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
 const state=await snap(page),info=state.els['#info'];
 check(info.display==='block'&&info.y>=state.els['#hud'].bottom+11.9&&info.bottom<=height-Math.max(80,insets.bottom)+.1&&info.height>=120&&info.x>=Math.max(8,insets.left)-.1&&info.right<=width-Math.max(8,insets.right)+.1,name+' '+label+' panel bounds and readable height',info);
 await shot(page,name+'-'+label+'-panel');await page.locator('#infoX').tap();
}
async function actions(run){
 const {page,name}=run,tap=async sel=>{await page.locator(sel).tap();await delay(260);};
 await tap('#toolcats button:nth-child(2)');
 check(await page.locator('.tool[data-tid="road"]').count()===1,name+' road category rebuild');
 await tap('.tool[data-tid="road"]');
 check(await page.locator('.tool[data-tid="road"]').evaluate(el=>el.classList.contains('sel')),name+' road selection');
 await tap('#toolsExp');check(await page.locator('body').evaluate(el=>el.classList.contains('toolsExp')),name+' expand');
 mobileGeometry(run,await snap(page),true);await shot(page,name+'-expanded');
 await page.locator('#toolcats button').nth(3).tap();await delay(180);
 let state=await snap(page);mobileGeometry(run,state,true);
 if(state.els['#tools'].scrollHeight>state.els['#tools'].clientHeight+1){
  for(let i=0;i<12;i++){
   const s=await page.locator('#tools').evaluate(el=>({at:el.scrollTop,max:el.scrollHeight-el.clientHeight}));if(s.at>=s.max-1)break;
   await swipe(run,'#tools','y');
  }
  const last=await page.locator('#tools .tool').last().boundingBox(),bar=await page.locator('#tools').boundingBox();
  check(last.y>=bar.y&&last.y+last.height<=bar.y+bar.height,name+' final expanded tool reachable',{last,bar});
  for(let i=0;i<12;i++){if(await page.locator('#tools').evaluate(el=>el.scrollTop)<=1)break;await swipe(run,'#tools','y',true);}
 }
 const collapse=page.locator('#toolsExp');
 await panel(run,'expanded');
 const cb=await collapse.boundingBox(),tb=await page.locator('#tools').boundingBox();
 check(cb.y>=tb.y&&cb.y+cb.height<=tb.y+tb.height,name+' collapse visible after reverse touch scroll',{cb,tb});
 await collapse.tap({timeout:5000});await delay(180);
 check(!await page.locator('body').evaluate(el=>el.classList.contains('toolsExp')),name+' collapse after scroll');
 const cats=await page.locator('#toolcats').evaluate(el=>({width:el.clientWidth,content:el.scrollWidth}));
 if(cats.content>cats.width+1)await swipe(run,'#toolcats','x');
 else check(true,name+' categories already fit without scrolling',cats);
 await page.locator('#toolcats button').last().tap();await delay(180);
 check(await page.locator('#toolcats button.on').first().textContent()==='地形',name+' last category reachable');
 await panel(run,'collapsed');
 await tap('#bSpeed');check((await page.locator('#bSpeed').textContent()).includes('1x'),name+' speed click');
 await page.evaluate(()=>GV.setSpeed(0));
 const before=await page.evaluate(()=>{GV.save();return JSON.parse(GV.rawSave()).cam.z;});
 await tap('#zin');await delay(450);
 const after=await page.evaluate(()=>{GV.save();return JSON.parse(GV.rawSave()).cam.z;});
 check(after!==before,name+' zoom click changes camera',{before,after});
 check(run.errors.length===0,name+' interaction console health',run.errors);
}
(async()=>{
 server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),isBase=u.pathname.startsWith('/base/'),rel=u.pathname.replace(/^\/base\//,'/').slice(1)||'index.html';
  const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{const body=rel==='index.html'?(isBase?baseHtml:headHtml):fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'})[path.extname(rel)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));report.origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--disable-background-networking','--mute-audio','--no-sandbox']});
 report.browser=await browser.version();
 const specs=args.comparisons==='only'?[]:args.negative?[['mobile390-safe',390,844,{top:24,left:12,bottom:28,right:14}]]:[['mobile320',320,740,null],['mobile390',390,844,null],['mobile430',430,932,null],['landscape844',844,390,null],['mobile390-safe',390,844,{top:24,left:12,bottom:28,right:14}],['landscape844-safe',844,390,{top:12,left:30,bottom:20,right:24}]];
 report.runs=[];
 for(const [name,w,h,insets] of specs){
  const run=await open(name,w,h,{insets});report.runs.push({name,width:w,height:h,insets,state:run.state});
  if(args.negative==='safe-area')await run.page.addStyleTag({content:'html.ui679 #hud{padding-top:0!important;padding-left:0!important;padding-right:0!important}'});
  if(args.negative==='dock')await run.page.addStyleTag({content:'html.ui679 #toolcats{bottom:0!important}'});
  mobileGeometry(run,await snap(run.page));await shot(run.page,name+'-default');await actions(run);await run.context.close();
 }
 if(!args.negative)for(const [name,w,h] of [['mobile390',390,844],['desktop1440',1440,900],['desktop1024',1024,768]]){
  const before=await open('base-'+name,w,h,{baseMode:true});await shot(before.page,'base-'+name);const expected=before.state;await before.context.close();
  for(const valve of (w<900?['query','window']:[null])){
   const run=await open(name+(valve?'-'+valve:''),w,h,{valve});
   const differences=run.state.dom.flatMap((value,i)=>JSON.stringify(value)===JSON.stringify(expected.dom[i])?[]:[{index:i,expected:expected.dom[i],actual:value}]);
   report.comparisons=report.comparisons||[];report.comparisons.push({name:run.name,expected,actual:run.state});
   check(JSON.stringify(run.state.els)===JSON.stringify(expected.els),run.name+' exact base styles and geometry');
   check(JSON.stringify(run.state.dom)===JSON.stringify(expected.dom),run.name+' exact existing DOM controls and labels',differences);
   await shot(run.page,run.name);await run.context.close();
  }
 }
 report.pass=true;console.log('PASS '+report.checks.length+' checks; '+report.screenshots.length+' raw PNGs');
})().catch(async e=>{report.pass=false;report.errors.push(e.stack);console.error(e.stack);if(activePage&&!activePage.isClosed())try{await shot(activePage,'failure');}catch{}process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)server.close();});

