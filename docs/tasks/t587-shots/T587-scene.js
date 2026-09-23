/* T587 disposable real-Chrome roadside A/B. Only bay 8126 and slot 3. */
'use strict';
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');

const keys=['70_1_0','7_1_1','6_1_1','16_1_0'];
const bridge=`window.__t587MakeScene=G=>{
  G.setMapSize(72);G.newWorldSeeded(587);G.setDiff(3);G.ai(false);G.setSpeed(0);
  for(let y=20;y<=42;y++)for(let x=18;x<=46;x++){
    const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;
    t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;
  }
  for(const y of[26,30,35])for(let x=21;x<=43;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}
  for(const x of[24,36,43])for(let y=25;y<=36;y++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}
  const plan=[['70_1_0',27,29],['7_1_1',33,29],['6_1_1',27,34],['16_1_0',33,34]];
  for(const[key,x,y]of plan){const t=T(idx(x,y));t.road=0;t.rc=0;
    t.bld={k:+key.split('_')[0],lv:1,v:+key.split('_')[2],age:20,pw:true,h:.6};}
  G.setDay(10);G.setVisT(55);G.setZoom(2.25);G.setRot(0);G.lookAt(30,30);G.forceDraw();
  return plan.map(([key,x,y])=>({key,x,y}));
};
window.__t587Measure=()=>{
  const out={};for(const key of ['70_1_0','7_1_1','6_1_1','16_1_0']){
    const s=SPR.bld[key],d=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data;
    let n=0;for(let y=Math.max(0,s.ay-32);y<s.h;y++)for(let x=0;x<s.w;x++){
      if(y<s.ay&&Math.abs(x-s.ax)<=2*(s.ay-y))continue;
      if(d[(y*s.w+x)*4+3])n++;
    }out[key]=n;
  }return out;
};
window.__t587Preview=()=>{
  for(const key of ['70_1_0','7_1_1','7_1_2','7_1_3','7_1_4','6_1_1','6_1_2','6_1_3','6_1_4','16_1_0']){
    const s=SPR.bld[key];if(!s)continue;clipFoot586(s.img,s);clipFoot586(s.night,s);
  }
};`;

async function one(browser,label,query,extended,preview=false){
  const context=await browser.newContext({viewport:{width:1350,height:900},deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/index.html*',async route=>{const response=await route.fetch(),html=await response.text();
    if(html.split('window.GV={').length!==2)throw Error('GV anchor drift');
    await route.fulfill({response,body:html.replace('window.GV={',bridge+'window.GV={')});
  });
  await page.goto('http://127.0.0.1:8126/index.html'+query,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__boot426?.().ready&&window.GV,{timeout:120000});
  await page.locator('#bNewGame').click();
  const plan=await page.evaluate(()=>window.__t587MakeScene(window.GV));
  if(preview)await page.evaluate(()=>{window.__t587Preview();GV.forceDraw();});
  const measured=await page.evaluate(()=>window.__t587Measure());
  const stats=await page.evaluate(()=>JSON.stringify(GV.stats()));
  const shot=name=>path.join(__dirname,`T587-${label}-${name}.png`);
  await page.locator('#game').screenshot({path:shot('day-rot0')});
  if(extended){
    for(const rot of[1,2,3]){await page.evaluate(r=>{GV.setRot(r);GV.lookAt(30,30);GV.forceDraw();},rot);
      await page.locator('#game').screenshot({path:shot(`day-rot${rot}`)});}
    await page.evaluate(()=>{GV.setRot(0);GV.setVisT(100);GV.forceDraw();});
    await page.locator('#game').screenshot({path:shot('night-rot0')});
    await page.evaluate(()=>{GV.setVisT(55);GV.setZoom(1);GV.forceDraw();});
    await page.locator('#game').screenshot({path:shot('day-zoom1')});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{GV.setZoom(1);GV.lookAt(30,30);GV.forceDraw();});
    await page.screenshot({path:shot('day-narrow')});
  }
  const statsAfter=await page.evaluate(()=>JSON.stringify(GV.stats()));
  console.log(JSON.stringify({label,plan,measured,statsUnchanged:stats===statsAfter,errors}));
  await context.close();
  if(errors.length||stats!==statsAfter)throw Error(`${label} browser invariant failed`);
  return measured;
}

(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const before=await one(browser,'before','?noT587=1',false);
    if(process.argv.includes('--preview')){
      const preview=await one(browser,'preview','?noT587=1',true,true);
      for(const key of keys)if(preview[key]>=before[key])throw Error(key+' preview did not improve');
    }else if(!process.argv.includes('--baseline')){
      const after=await one(browser,'after','',true);
      for(const key of keys)if(after[key]>=before[key])throw Error(key+' lower-edge pixels did not improve');
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
