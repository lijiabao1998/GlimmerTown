/* T717：真 Chromium 台架；只在測試副本加唯讀／定格橋，導覽前固定槽 3。 */
'use strict';
const fs=require('fs'),http=require('http'),crypto=require('crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function launch717(){
  const {chromium}=require('playwright');
  return chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
}
async function open717(browser,file,off=false,starsInput=null){
  const bytes=fs.readFileSync(file),source=bytes.toString('utf8');
  if(source.split('window.GV={').length!==2)throw Error('unique bridge anchor');
  const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(source.replace('window.GV={','window.__ev717=s=>eval(s);window.GV={'));});
  await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(0,'127.0.0.1',resolve);});
  let context;try{context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.addInitScript(off=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');window.__noT717=off;},off);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+(off?'/?noT717=1':'/'));
  await page.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:180000});
  const city=await page.evaluate(()=>{GV.setSpeed(0);GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(1);GV.ai(true);for(let d=0;d<400;d++)GV.step(1);GV.ai(false);return GV.stats();});
  const stars=await page.evaluate(input=>__ev717(`(function(){running=false;speed=0;quality=2;weather=0;window.__noAnim=true;window.__noChimney=true;const st=document.getElementById('start');if(st)st.classList.add('hide');${input?'stars.splice(0,stars.length,...'+JSON.stringify(input)+');':''}return stars.map(x=>x.slice());})()`),starsInput);
  const tileHash=hash(await page.evaluate(()=>__ev717('JSON.stringify(tiles)')));
  return {page,errors,city,stars,tileHash,sourceHash:hash(bytes),close:async()=>{await context.close();await new Promise(r=>server.close(r));}};
  }catch(error){if(context)await context.close();await new Promise(r=>server.close(r));throw error;}
}
async function prepare717(p,c){
  return p.page.evaluate(c=>__ev717(`(function(){for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;GV.setRot(${c.rot});GV.setZoom(${c.z});GV.lookAt(N/2+3,N/2-2);visT=${c.vt};trafClock=12;waterT=0;waterF=1;shakeT=0;groundDirty=true;GV.forceDraw();return {width:cvs.width,height:cvs.height,daylight:daylight(),slot:curSlot()};})()`),c);
}
async function shot717(p,c){
  const state=await prepare717(p,c);
  if(state.slot!==3)throw Error('T717 requires slot 3');
  if(c.phase==='day'&&state.daylight.b<.99||c.phase==='night'&&state.daylight.d!==0||c.phase==='dusk'&&!(state.daylight.dusk>0&&state.daylight.ph>.5))throw Error('incorrect requested daylight phase '+JSON.stringify({c,state}));
  // 原生合成 PNG；不先 getImageData 改變被比較的畫布路徑。
  const selector=await p.page.evaluate(()=>__ev717('cvs.id'));
  if(!selector)throw Error('game canvas lacks id');
  return p.page.locator('#'+selector).screenshot({animations:'disabled'});
}
module.exports={launch717,open717,prepare717,shot717,hash};
