/* T588 disposable Chrome witness: bay 8126, isolated context, slot 3 only. */
'use strict';
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const days=process.argv.includes('--days=900')?900:400;
const bridge=`window.__t588Lot=()=>({entries:lotCache574.size,pixels:lotCachePixels574,bakes:lotBakeN574,
  maxEntries:LOT_CACHE_ENTRIES574,maxPixels:LOT_CACHE_PIXELS574});
window.__t588LotReset=()=>{lotCache574.clear();lotCachePixels574=0;lotBakeN574=0;};
window.__t588Hud=()=>updHud();window.__t588HudState=()=>({live:{...tweenHud},target:{...tweenHudTarget}});`;
async function one(browser,seed){
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/index.html*',async route=>{
    const response=await route.fetch(),html=await response.text();
    if(html.split('window.GV={').length!==2)throw Error('T588 browser bridge drift');
    await route.fulfill({response,body:html.replace('window.GV={',bridge+'window.GV={')});
  });
  await page.goto('http://127.0.0.1:8126/index.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__boot426?.().ready&&window.GV,{timeout:120000});
  await page.locator('#bNewGame').click();
  const measured=await page.evaluate(({seed,days})=>{
    const G=window.GV;G.setSpeed(0);G.setMapSize(72);G.newWorldSeeded(seed);G.setDiff(1);G.ai(true);
    for(let d=0;d<days;d++)G.step(1);
    G.ai(false);window.__t588Hud();G.setVisT(55);G.setZoom(2);G.setRot(0);G.lookAt(36,36);
    const statsBefore=JSON.stringify(G.stats());
    window.__t588LotReset();const cold0=window.__t588Lot();
    const t0=performance.now();G.forceDraw();const coldMs=performance.now()-t0,cold1=window.__t588Lot();
    const t1=performance.now();G.forceDraw();const warmMs=performance.now()-t1,warm=window.__t588Lot(),census=G.drawCensus523();
    G.setVisT(100);G.forceDraw();const night=window.__t588Lot();
    G.setRot(1);G.forceDraw();const rotated=window.__t588Lot();
    G.setZoom(1);G.forceDraw();const zoomed=window.__t588Lot();
    G.setRot(0);G.setZoom(2);G.setVisT(55);G.forceDraw();
    const statsAfter=JSON.stringify(G.stats());
    return {seed,days,pop:G.stats().pop,money:G.stats().money,cold0,cold1,warm,night,rotated,zoomed,
      coldMs:+coldMs.toFixed(2),warmMs:+warmMs.toFixed(2),
      census:{total:census.total,restored:census.restored},statsUnchanged:statsBefore===statsAfter};
  },{seed,days});
  // T423 HUD tweens toward the new city; a fixed sleep can capture the previous city's negative values.
  await page.waitForFunction(()=>{
    const s=GV.stats(),money=Number(document.querySelector('#money b')?.textContent.replaceAll(',','')),
      pop=Number(document.querySelector('#pop b')?.textContent.replaceAll(',',''));
    return Math.abs(money-s.money)<=1&&pop===s.pop;
  },null,{timeout:15000});
  measured.hud=await page.evaluate(()=>({money:document.querySelector('#money b')?.textContent,
    pop:document.querySelector('#pop b')?.textContent,day:GV.stats().day,state:window.__t588HudState()}));
  const shot=name=>path.join(__dirname,`T588-seed${seed}${days===400?'':`-d${days}`}-${name}.png`);
  await page.locator('#game').screenshot({path:shot('day')});
  await page.evaluate(()=>{GV.setVisT(100);GV.forceDraw();});
  await page.locator('#game').screenshot({path:shot('night')});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{GV.setVisT(55);GV.setZoom(1);GV.forceDraw();});
  await page.screenshot({path:shot('narrow')});
  measured.errors=errors;
  console.log('BROWSER588 '+JSON.stringify(measured));
  if(errors.length||!measured.statsUnchanged||!measured.census.restored
    ||Math.abs(Number(measured.hud.money.replaceAll(',',''))-measured.money)>1
    ||Number(measured.hud.pop.replaceAll(',',''))!==measured.pop)throw Error('T588 browser invariant failed');
  for(const stage of ['cold1','warm','night','rotated','zoomed']){
    const c=measured[stage];if(c.entries>c.maxEntries||c.pixels>c.maxPixels)throw Error('T588 lot cache cap '+stage);
  }
  await context.close();
}
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{await one(browser,22);if(days===400)await one(browser,301);}finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
