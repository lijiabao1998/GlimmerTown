/* T717：真 Chromium 台架；只在測試副本加唯讀／定格橋，導覽前固定槽 3。 */
'use strict';
const fs=require('fs'),http=require('http'),crypto=require('crypto'),path=require('path'),assert=require('assert/strict');
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
  await page.locator('#boot426').waitFor({state:'hidden',timeout:180000});
  // Canvas-only COMPOSITOR capture: hide UI overlays without changing layout or canvas size.
  await page.addStyleTag({content:'body > :not(#game){visibility:hidden!important}'});
  const city=await page.evaluate(()=>{GV.setSpeed(0);GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(1);GV.ai(true);for(let d=0;d<400;d++)GV.step(1);GV.ai(false);return GV.stats();});
  const stars=await page.evaluate(input=>__ev717(`(function(){running=false;speed=0;quality=2;weather=0;window.__noAnim=true;window.__noChimney=true;const st=document.getElementById('start');if(st)st.style.display='none';stopTitleAnim();${input?'stars.splice(0,stars.length,...'+JSON.stringify(input)+');':''}return stars.map(x=>x.slice());})()`),starsInput);
  const tileHash=hash(await page.evaluate(()=>__ev717('JSON.stringify(tiles)')));
  return {page,errors,city,stars,tileHash,captureReceipts:[],captureMode:'canvas-only compositor; non-game body children visibility:hidden, layout preserved',sourceHash:hash(bytes),close:async()=>{await context.close();await new Promise(r=>server.close(r));}};
  }catch(error){if(context)await context.close();await new Promise(r=>server.close(r));throw error;}
}
async function prepare717(p,c){
  return p.page.evaluate(c=>__ev717(`(function(){for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;GV.setRot(${c.rot});GV.setZoom(${c.z});GV.lookAt(N/2+3,N/2-2);visT=${c.vt};trafClock=12;waterT=0;waterF=1;shakeT=0;flashT=0;meteorTrail=null;groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';GV.forceDraw();return {width:cvs.width,height:cvs.height,daylight:daylight(),slot:curSlot()};})()`),c);
}
async function captureState717(p){
  return p.page.evaluate(()=>__ev717(`(function(){const st=document.getElementById('start'),boot=document.getElementById('boot426'),box=cvs.getBoundingClientRect();return {running,speed,titleStopped:titleRAF===null,startHidden:!!st&&getComputedStyle(st).display==='none',bootHidden:!boot||getComputedStyle(boot).visibility==='hidden'||getComputedStyle(boot).display==='none',canvasBodyChild:cvs.parentElement===document.body,canvasVisible:getComputedStyle(cvs).visibility==='visible',width:cvs.width,height:cvs.height,box:[box.x,box.y,box.width,box.height],cam:[cam.x,cam.y,cam.z],rot:viewRotEff(),visT,trafClock,waterT,waterF,flashT,meteorTrail,day,quality,weather,actors:[cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti].map(a=>a.length)};})()`));
}
async function shot717(p,c,artifact){
  // At most eight identically prepared draws, as in the original frame harness.
  // Stop only at consecutive byte-identical compositor captures, never a best frame.
  const receipt={condition:c,label:artifact&&artifact.label,mode:p.captureMode,draws:0,stable:false,attempts:[]};
  p.captureReceipts.push(receipt);let previous,lastBytes;
  try{
    for(let draw=1;draw<=8;draw++){
      const state=await prepare717(p,c);
      if(state.slot!==3)throw Error('T717 requires slot 3');
      if(c.phase==='day'&&state.daylight.b<.99||c.phase==='night'&&state.daylight.d!==0||c.phase==='dusk'&&!(state.daylight.dusk>0&&state.daylight.ph>.5))throw Error('incorrect requested daylight phase '+JSON.stringify({c,state}));
      const before=await captureState717(p);
      assert(!before.running&&before.speed===0&&before.titleStopped&&before.startHidden&&before.bootHidden,'capture must freeze simulation/title and hide start/boot overlays');
      assert(before.canvasBodyChild&&before.canvasVisible,'visible game canvas must be a direct body child');
      assert.equal(before.width,state.width,'canvas width unchanged');assert.equal(before.height,state.height,'canvas height unchanged');
      assert(before.actors.every(n=>n===0),'fixed capture must have no moving actors');
      if(receipt.attempts.length)assert.deepEqual(before,receipt.attempts[0].before,'every convergence draw must start from the same frozen state');
      // Native compositor PNG, not getImageData/toDataURL/readback substitution.
      const bytes=await p.page.locator('#game').screenshot({animations:'disabled'});lastBytes=bytes;
      const attempt={draw,sha256:hash(bytes),bytes:bytes.length,before};
      receipt.draws=draw;receipt.attempts.push(attempt);
      if(artifact){const dir=path.join(artifact.out,'attempts');fs.mkdirSync(dir,{recursive:true});attempt.file='attempts/'+artifact.id+'-'+artifact.label+'-draw'+draw+'.png';fs.writeFileSync(path.join(artifact.out,attempt.file),bytes);}
      const after=await captureState717(p);attempt.after=after;
      assert.deepEqual(after,before,'frozen canvas/clock/camera/actors changed during compositor capture');
      if(previous&&bytes.equals(previous)){receipt.stable=true;receipt.sha256=attempt.sha256;return bytes;}
      previous=bytes;
    }
    throw Error('T717 compositor did not converge within 8 identical-state draws');
  }catch(error){receipt.failure=error.message;if(lastBytes){receipt.sha256=hash(lastBytes);return lastBytes;}throw error;}
}
module.exports={launch717,open717,prepare717,shot717,hash};
