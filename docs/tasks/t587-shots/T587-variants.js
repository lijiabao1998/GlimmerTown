/* T587: inspect every changed sprite, not only the four in-world representatives. */
'use strict';
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const keys=['70_1_0','7_1_1','7_1_2','7_1_3','7_1_4','6_1_1','6_1_2','6_1_3','6_1_4','16_1_0'];
const bridge=`window.__t587Variants=(keys)=>{
  const host=document.createElement('div');host.id='t587variants';
  host.style.cssText='position:absolute;left:0;top:0;z-index:99999;background:#253249;padding:16px;display:grid;grid-template-columns:repeat(5,170px);gap:12px;font:14px monospace;color:white';
  const counts={};
  for(const key of keys){const s=SPR.bld[key],card=document.createElement('div');
    card.style.cssText='width:156px;background:#51714d;text-align:center;padding:5px';
    const c=document.createElement('canvas');c.width=72;c.height=112;c.style.cssText='width:144px;height:224px;image-rendering:pixelated';
    const g=c.getContext('2d');g.fillStyle='#84b078';g.fillRect(0,0,72,112);g.drawImage(s.img,0,0);
    const d=s.img.getContext('2d').getImageData(0,0,72,112).data;let n=0;
    for(let y=78;y<112;y++)for(let x=0;x<72;x++){
      if(y<110&&Math.abs(x-36)<=2*(110-y))continue;
      if(d[(y*72+x)*4+3])n++;
    }
    counts[key]=n;const label=document.createElement('div');label.textContent=key+' / '+n;
    card.append(label,c);host.appendChild(card);
  }
  document.body.appendChild(host);return counts;
};`;

async function one(browser,label,query){
  const page=await browser.newPage({viewport:{width:980,height:570}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
  await page.route('**/index.html*',async route=>{const response=await route.fetch(),html=await response.text();
    if(html.split('window.GV={').length!==2)throw Error('GV anchor drift');
    await route.fulfill({response,body:html.replace('window.GV={',bridge+'window.GV={')});
  });
  await page.goto('http://127.0.0.1:8126/index.html'+query,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__boot426?.().ready&&window.__t587Variants,{timeout:120000});
  const counts=await page.evaluate(k=>window.__t587Variants(k),keys);
  await page.locator('#t587variants').screenshot({path:path.join(__dirname,`T587-${label}-all10.png`)});
  console.log(JSON.stringify({label,counts,errors}));await page.close();
  if(errors.length)throw Error(label+' page errors');return counts;
}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{const before=await one(browser,'before','?noT587=1'),after=await one(browser,'after','');
    for(const key of keys)if(before[key]<=0||after[key]!==0)throw Error(key+' unresolved lower-edge pixel count');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
