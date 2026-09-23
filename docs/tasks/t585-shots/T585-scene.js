/* T585 真 Chrome 場景 A/B。只連 8126，隔離 slot 3。 */
const {chromium}=require('C:/Users/Leon1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const before=process.env.T585_BEFORE==='1';
async function main(){
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1350,height:900},deviceScaleFactor:1});
    await context.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('http://127.0.0.1:8126/index.html'+(before?'?noT585=1':''),{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.__boot426&&window.__boot426().ready&&window.GV,{timeout:120000});
    await page.locator('#bNewGame').click();
    const placed=await page.evaluate(()=>{
      const G=window.GV;G.setMapSize(72);G.newWorldSeeded(585);G.setDiff(3);G.ai(false);G.addMoney(10000000);
      const plan=[['farm',19,19],['bigFarm',26,19],['foodPlant',34,19],['plant',19,28],['bigCemetery',26,28],['water',34,28]];
      const out=[];for(const [id,tx,ty]of plan){
        let chosen=null;
        for(let radius=0;radius<=13&&!chosen;radius++)for(let dy=-radius;dy<=radius&&!chosen;dy++)for(let dx=-radius;dx<=radius&&!chosen;dx++){
          if(Math.abs(dx)+Math.abs(dy)!==radius)continue;
          const x=tx+dx,y=ty+dy;if(x<5||y<5||x>58||y>58)continue;
          if(G.canPlaceTool(id,x,y)===null&&G.place(id,x,y))chosen=[x,y];
        }
        out.push({id,target:[tx,ty],chosen,k:chosen?G.tile(...chosen)?.bld?.k:null});
      }
      G.step(10);G.setDay(1);G.setVisT(55);G.setZoom(1.5);G.setRot(0);G.lookAt(28,26);G.forceDraw();return out;
    });
    console.log('PLACED',JSON.stringify(placed),'ERRORS',JSON.stringify(errors));
    const tag=before?'before':'after';
    for(const rot of[0,1,2,3]){
      await page.evaluate(r=>{GV.setRot(r);GV.lookAt(28,26);GV.forceDraw();},rot);
      const file=path.join(__dirname,`T585-scene-${tag}-rot${rot}-day.png`);
      await page.locator('#game').screenshot({path:file});
      console.log('SHOT',file);
    }
    await page.evaluate(()=>{GV.setRot(0);GV.setVisT(100);GV.forceDraw();});
    const night=path.join(__dirname,`T585-scene-${tag}-night.png`);
    await page.locator('#game').screenshot({path:night});console.log('SHOT',night,'ERRORS',JSON.stringify(errors));
    await page.evaluate(()=>{GV.setVisT(55);GV.setZoom(1);GV.setRot(0);GV.lookAt(28,26);GV.forceDraw();});
    const far=path.join(__dirname,`T585-scene-${tag}-zoom1.png`);
    await page.locator('#game').screenshot({path:far});console.log('SHOT',far);
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{GV.setZoom(1);GV.lookAt(28,26);GV.forceDraw();});
    const narrow=path.join(__dirname,`T585-scene-${tag}-narrow.png`);
    await page.screenshot({path:narrow});console.log('SHOT',narrow,'ERRORS',JSON.stringify(errors));
    await page.setViewportSize({width:1350,height:900});
    const farm=placed.find(p=>p.id==='farm'&&p.chosen);
    if(farm){for(const day of[1,5,9,13]){
      await page.evaluate(({x,y,d})=>{GV.setDay(d);GV.setVisT(55);GV.setZoom(2);GV.setRot(0);GV.lookAt(x,y);GV.forceDraw();},
        {x:farm.chosen[0],y:farm.chosen[1],d:day});
      const file=path.join(__dirname,`T585-farm-${tag}-day${day}.png`);
      await page.screenshot({path:file,clip:{x:350,y:180,width:650,height:510}});
      console.log('SHOT',file);
    }}
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
