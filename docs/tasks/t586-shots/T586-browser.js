/* T586 disposable Chrome QA. Only 127.0.0.1:8126 and localStorage slot 3. */
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');

const bridge=`window.__t586MakeScene=G=>{
  G.setMapSize(72);G.newWorldSeeded(586);G.setDiff(3);G.ai(false);G.setSpeed(0);
  for(let y=20;y<=42;y++)for(let x=18;x<=46;x++){
    const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;
    t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;
  }
  for(const y of[26,30,35])for(let x=21;x<=43;x++){
    const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;
  }
  for(const x of[24,36,43])for(let y=25;y<=36;y++){
    const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;
  }
  const plan=[['29_1_0',27,28],['30_1_0',33,28],['67_1_0',27,33],['69_1_0',33,33]];
  for(const[key,x,y]of plan){const t=T(idx(x,y));t.road=0;t.rc=0;
    t.bld={k:+key.split('_')[0],lv:1,v:0,age:20,pw:true,h:.6};}
  G.setDay(10);G.setVisT(55);G.setZoom(2.25);G.setRot(0);G.lookAt(30,30);G.forceDraw();
  return plan.map(([key,x,y])=>({key,x,y,real:T(idx(x,y)).bld}));
};
window.__t586Measure=()=>{
  const out={};for(const key of['29_1_0','30_1_0','67_1_0','69_1_0']){
    const s=SPR.bld[key],d=s.img.getContext('2d').getImageData(0,0,s.w,s.h).data;
    let day=0,night=0;const n=s.night&&s.night.getContext('2d').getImageData(0,0,s.w,s.h).data;
    for(let y=Math.max(0,s.ay-32);y<s.h;y++)for(let x=0;x<s.w;x++){
      if(y<s.ay&&Math.abs(x-s.ax)<=2*(s.ay-y))continue;
      const q=(y*s.w+x)*4;if(d[q+3])day++;if(n&&n[q+3])night++;
    }
    out[key]={day,night,w:s.w,h:s.h,ax:s.ax,ay:s.ay};
  }return out;
};`;

async function one(browser,label,{before=false,badge=false,extended=false}={}){
  const context=await browser.newContext({viewport:{width:1350,height:900},deviceScaleFactor:1});
  await context.addInitScript(({badge})=>{
    localStorage.setItem('glimmerville.v1.slot','3');
    if(badge)localStorage.setItem('glimmerville.v1.badge','1');
  },{badge});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/index.html*',async route=>{
    const response=await route.fetch();const original=await response.text();
    if(!original.includes('window.GV={'))throw Error('GV insertion anchor missing');
    await route.fulfill({response,body:original.replace('window.GV={',bridge+'window.GV={')});
  });
  await page.goto('http://127.0.0.1:8126/index.html'+(before?'?noT586=1':''),
    {waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__boot426&&window.__boot426().ready&&window.GV,null,{timeout:120000});
  await page.locator('#bNewGame').click();
  const plan=await page.evaluate(()=>window.__t586MakeScene(window.GV));
  const pixels=await page.evaluate(()=>window.__t586Measure());
  const statsBefore=await page.evaluate(()=>JSON.stringify(GV.stats()));
  const file=name=>path.join(__dirname,`T586-${label}-${name}.png`);
  await page.locator('#game').screenshot({path:file('day-rot0')});
  if(extended){
    for(const rot of[1,2,3]){
      await page.evaluate(r=>{GV.setRot(r);GV.lookAt(30,30);GV.forceDraw();},rot);
      await page.locator('#game').screenshot({path:file(`day-rot${rot}`)});
    }
    await page.evaluate(()=>{GV.setRot(0);GV.setVisT(100);GV.forceDraw();});
    await page.locator('#game').screenshot({path:file('night-rot0')});
    await page.evaluate(()=>{GV.setVisT(55);GV.setZoom(1);GV.forceDraw();});
    await page.locator('#game').screenshot({path:file('day-zoom1')});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{GV.setZoom(1);GV.lookAt(30,30);GV.forceDraw();});
    await page.screenshot({path:file('day-narrow')});
  }
  const statsAfter=await page.evaluate(()=>JSON.stringify(GV.stats()));
  const report=await page.evaluate(()=>window.__t586Foot||null);
  const statsDiff=statsBefore===statsAfter?[]:Object.keys(JSON.parse(statsBefore))
    .filter(k=>JSON.stringify(JSON.parse(statsBefore)[k])!==JSON.stringify(JSON.parse(statsAfter)[k]));
  console.log(JSON.stringify({label,plan,pixels,report,statsUnchanged:statsBefore===statsAfter,statsDiff,errors}));
  await context.close();
  if(errors.length)throw Error(`${label} console errors`);
  if(statsBefore!==statsAfter)throw Error(`${label} render changed simulation stats`);
  return pixels;
}

(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const off=await one(browser,'before-badge-off',{before:true});
    const after=await one(browser,'after-badge-off',{extended:true});
    const on=await one(browser,'after-badge-on',{badge:true});
    for(const key of Object.keys(after)){
      if(off[key].day<=0)throw Error(`${key} control had no ground overflow`);
      if(after[key].day!==0||after[key].night!==0||on[key].day!==0)
        throw Error(`${key} still outside one-cell lower edge`);
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
