/* T587 read-only Chrome sprite audit. 127.0.0.1:8126, slot 3; no save writes. */
'use strict';
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');

const bridge=`window.__t587Scan=()=>{
  const out=[];
  for(const [key,s] of Object.entries(SPR.bld)){
    if(!/^\\d+_1_\\d+$/.test(key)||s?.w!==72||s?.h!==112||s?.ax!==36||s?.ay!==110||!s.img)continue;
    const d=s.img.getContext('2d').getImageData(0,0,72,112).data;
    let outside=0,low=0,max=0;
    for(let y=78;y<112;y++)for(let x=0;x<72;x++){
      if(y<110&&Math.abs(x-36)<=2*(110-y))continue;
      if(d[(y*72+x)*4+3]){outside++;if(y>=100)low++;max=Math.max(max,y);}
    }
    if(outside)out.push({key,outside,low,max});
  }
  out.sort((a,b)=>b.outside-a.outside||a.key.localeCompare(b.key));return out;
};
window.__t587Atlas=(list)=>{
  const host=document.createElement('div');host.id='t587atlas';
  host.style.cssText='position:absolute;left:0;top:0;z-index:99999;background:#28354b;padding:12px;display:grid;grid-template-columns:repeat(6,160px);gap:8px;font:13px monospace;color:white';
  for(const item of list){const s=SPR.bld[item.key],card=document.createElement('div');
    card.style.cssText='width:148px;background:#536b50;text-align:center;padding:4px';
    const label=document.createElement('div');label.textContent=item.key+' / '+item.outside;card.appendChild(label);
    const c=document.createElement('canvas');c.width=72;c.height=112;c.style.cssText='width:144px;height:224px;image-rendering:pixelated';
    const g=c.getContext('2d');g.fillStyle='#84b078';g.fillRect(0,0,72,112);g.drawImage(s.img,0,0);
    card.appendChild(c);host.appendChild(card);
  }
  document.body.appendChild(host);return host.id;
};`;

(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1100,height:1200}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
    await page.route('**/index.html*',async route=>{const response=await route.fetch(),html=await response.text();
      if(html.split('window.GV={').length!==2)throw Error('GV anchor drift');
      await route.fulfill({response,body:html.replace('window.GV={',bridge+'window.GV={')});
    });
    await page.goto('http://127.0.0.1:8126/index.html',{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.__boot426?.().ready&&window.__t587Scan,{timeout:120000});
    const rows=await page.evaluate(()=>window.__t587Scan());
    console.log('T587_SCAN '+JSON.stringify({title:await page.title(),count:rows.length,rows,errors}));
    await page.evaluate(list=>window.__t587Atlas(list),rows.slice(0,18));
    await page.locator('#t587atlas').screenshot({path:path.join(__dirname,'T587-audit-atlas.png')});
    if(errors.length)throw Error('browser console/page errors');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
