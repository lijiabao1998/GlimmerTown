/* T585 真 Chrome 診斷。只用 8126 與槽 3；從車位執行 node docs/tasks/t585-shots/T585-browser.js。 */
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
async function run(){
  const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--disable-gpu']});
  try{
  const context=await browser.newContext({viewport:{width:1280,height:850},deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const noArt=process.env.T585_BEFORE==='1';
  await page.goto('http://127.0.0.1:8126/index.html'+(noArt?'?noT585=1':''),{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__boot426&&window.__boot426().ready&&window.GV,{timeout:120000});
  const availability=await page.evaluate(()=>({atlas:typeof window.GV.sprAtlas356,ver:window.GV.ver(),t585:window.__t585Material}));
  console.log('BOOT',JSON.stringify(availability),'errors',JSON.stringify(errors));
  if(availability.atlas!=='function')throw Error('T585 atlas access unavailable');
  /* evaluate 裡按清單取值：不能把頁面函式跨進 Node。 */
  const status=await page.evaluate(()=>{
    const names=['bld/22_1_0','bld/53_1_0','bld/16_1_0','bld/54_1_0','bld/57_1_0',
      'lot574/5_1_1','waterTower/','waterTowerVar/1','waterTowerVar/2','waterTowerVar/3','waterTowerVar/4',
      'bld/1_1_0','bld/1_1_1','bld/1_1_2','bld/1_1_3'];
    const entries=window.GV.sprAtlas356().entries;
    const byKey=new Map(entries.map(e=>[e.fam+'/'+e.key,e]));
    const water=entries.filter(e=>/water/i.test(e.fam+'/'+e.key)).map(e=>e.fam+'/'+e.key);
    const cvs=document.createElement('canvas');cvs.width=1500;cvs.height=1500;const g=cvs.getContext('2d');
    g.fillStyle='#1e2630';g.fillRect(0,0,cvs.width,cvs.height);
    const meta=[];
    names.forEach((id,i)=>{
      const s=byKey.get(id);
      if(!s)throw Error('missing sprite '+id);
      const x=(i%4)*370+10,y=Math.floor(i/4)*370+10;
      g.fillStyle='#dce9f0';g.font='18px monospace';g.fillText(id,x+5,y+22);
      g.imageSmoothingEnabled=false;g.drawImage(s.img,x+5,y+30,s.w*1.35,s.h*1.35);
      meta.push({id,w:s.w,h:s.h,ax:s.ax,ay:s.ay});
    });
    cvs.id='t585-atlas';cvs.style.cssText='position:fixed;left:0;top:0;z-index:99999;width:1500px;height:1500px';
    document.body.appendChild(cvs);return {meta,water};
  });
  const file=path.join(__dirname,noArt?'T585-atlas-before.png':'T585-atlas-after.png');
  await page.locator('#t585-atlas').screenshot({path:file});
  console.log('ATLAS',JSON.stringify(status),'file',file,'errors',JSON.stringify(errors));
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
