/* T585 四作期＋冬相實畫：只連 8126、槽 3，不碰玩家資料。 */
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const crypto=require('crypto');
const path=require('path');
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    let reference=null;
    for(const before of[true,false]){
      const context=await browser.newContext({viewport:{width:1250,height:450},deviceScaleFactor:1});
      await context.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
      /* 僅在這個拋棄式測試頁暴露 closure 內的原函式，產品位元不改。 */
      await context.route('**/index.html*',async route=>{
        const response=await route.fetch(),body=(await response.body()).toString('utf8');
        const from='function lotSprite574(k,v=0,stage=2,winter=false,far=false){';
        const next=body.replace(from,'window.__t585Phase=(...a)=>lotSprite574(...a);'+from);
        if(next===body)throw Error('lotSprite574 probe anchor missing');
        await route.fulfill({response,body:next});
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:8126/index.html'+(before?'?noT585=1':''),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__boot426&&window.__boot426().ready,{timeout:120000});
      const result=await page.evaluate(()=>{
        const board=document.createElement('canvas');board.id='t585Board';board.width=1200;board.height=430;
        board.style.cssText='position:fixed;left:0;top:0;z-index:999999;background:#202834';
        document.body.appendChild(board);const g=board.getContext('2d');
        g.font='16px monospace';g.fillStyle='#f1e7c8';g.fillText('T585 | farm stages: seed / growing / mature / harvested / winter',12,24);
        const meta=[],data=[];
        for(let i=0;i<5;i++){
          const s=window.__t585Phase(22,10,i===4?2:i,i===4,false);
          const x=10+i*238,y=83;
          g.drawImage(s.img,x,y);g.fillStyle='#e9f0ed';g.fillText(['seed','growing','mature','harvested','winter'][i],x,y-16);
          meta.push({stage:i,w:s.w,h:s.h,ax:s.ax,ay:s.ay});
          data.push(s.img.toDataURL());
        }
        return {meta,data};
      });
      const hashes=result.data.map(d=>crypto.createHash('sha256').update(d).digest('hex').slice(0,16));
      const file=path.join(__dirname,`T585-stages-${before?'before':'after'}.png`);
      await page.locator('#t585Board').screenshot({path:file});
      console.log(JSON.stringify({before,meta:result.meta,hashes,unique:new Set(hashes).size,errors,file}));
      if(errors.length||new Set(hashes).size!==5)process.exitCode=1;
      const power=await page.evaluate(()=>{
        const board=document.createElement('canvas');board.id='t585Power';board.width=740;board.height=290;
        board.style.cssText='position:fixed;left:0;top:0;z-index:999999;background:#202834';
        document.body.appendChild(board);const g=board.getContext('2d');
        g.font='16px monospace';g.fillStyle='#f1e7c8';g.fillText('T585 | 3x3 power plant / three real variants',12,24);
        const meta=[],data=[];for(let v=0;v<3;v++){
          const s=window.__t585Phase(5,v,2,false,false);g.drawImage(s.img,10+v*240,55);
          g.fillStyle='#e9f0ed';g.fillText('variant '+v,12+v*240,47);
          meta.push({v,w:s.w,h:s.h,ax:s.ax,ay:s.ay});data.push(s.img.toDataURL());
        }return {meta,data};
      });
      const phashes=power.data.map(d=>crypto.createHash('sha256').update(d).digest('hex').slice(0,16));
      const pfile=path.join(__dirname,`T585-power-${before?'before':'after'}.png`);
      await page.locator('#t585Power').screenshot({path:pfile});
      console.log(JSON.stringify({before,power:power.meta,hashes:phashes,file:pfile}));
      if(before)reference={meta:result.meta,hashes,power:power.meta,phashes};
      else if(JSON.stringify(result.meta)!==JSON.stringify(reference.meta)||JSON.stringify(power.meta)!==JSON.stringify(reference.power)||
        hashes.some((h,i)=>h===reference.hashes[i])||phashes.some((h,i)=>h===reference.phashes[i])){
        throw Error('T585 A/B metadata drift or one stage/plant variant had no pixel delta');
      }
      await context.close();
    }
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
