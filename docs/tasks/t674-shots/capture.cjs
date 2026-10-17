'use strict';
// Supplemental real-game capture only. Candidate files and existing guards are never changed.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function plan(){const a=[];for(let rot=0;rot<4;rot++)for(const [season,snow] of [[0,false],[1,false],[2,false],[3,false],[3,true]])for(const night of [false,true])a.push({id:`r${rot}-s${season}-${snow?'snow':'clear'}-${night?'night':'day'}`,rot,season,snow,night,zoom:2,layer:'normal'});for(const layer of ['far','construction4','construction6','construction8','hover','pedestrian','smoke'])a.push({id:layer,rot:0,season:layer==='smoke'?3:1,snow:false,night:false,zoom:layer==='far'?.65:2,layer});return a;}
function validate(r,expected){assert.equal(r.commit,expected,'candidate SHA mismatch');assert.equal(r.models.length,10,'missing model');for(let i=0;i<10;i++){const m=r.models[i];assert.equal(m.variant,i,'wrong variant');assert.deepEqual(m.frames.map(f=>f.id).sort(),plan().map(f=>f.id).sort(),'missing state');for(const f of m.frames){assert(f.png&&f.sha256,'missing PNG');assert(f.bodyDrawn||f.layer==='far','model not drawn');assert.equal(f.slot,'3','wrong save slot');if(f.layer==='hover')assert(f.hoverApplied,'hover not applied');if(f.layer.startsWith('construction'))assert(f.overlayChanged,'scaffold not visible');if(f.layer==='pedestrian')assert(f.overlayChanged,'pedestrian not visible');if(f.layer==='smoke'&&f.chimneys)assert(f.smokeCount>0&&f.overlayChanged,'smoke not visible');if(f.layer==='normal')assert(f.reflected,'reflection missing');}}return true;}
function bridge(){
  const family=FAMILY_NUMBER, choose=family===670?variant670:variant671, sprite=family===670?spr670:spr671;
  let position,building,currentSprite,draws=[],nightDraws=0;
  const original=ctx.drawImage.bind(ctx);
  ctx.drawImage=function(im,...args){if(currentSprite&&im===currentSprite.img){const tr=ctx.getTransform();draws.push({alpha:ctx.globalAlpha,reflection:tr.d<0,argc:args.length});}if(currentSprite&&im===currentSprite.night)nightDraws++;return original(im,...args);};
  function quiet(){running=false;speed=0;for(const a of [cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;selTile=null;hover.x=hover.y=-1;tool='pan';quality=2;weather=0;window.__noAnim=false;window.__noChimney=false;window.__noVeh=false;window.__noScaffold=false;const st=document.getElementById('start');if(st)st.classList.add('hide');}
  function raw(){visT=window.__captureNight?5:55;trafClock=12;waterT=waterF=0;shakeT=0;groundDirty=true;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';draws=[];nightDraws=0;GV.forceDraw();return cvs.toDataURL('image/png');}
  window.__capture674={
    setup(vi){GV.setMapSize(72);GV.newWorldSeeded(674);GV.setDiff(3);GV.ai(false);GV.setSpeed(0);quiet();money=1e9;
      for(const t of tiles)Object.assign(t,{t:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0});
      building={k:family===670?2:1,lv:1,v:0,age:60,pw:true,wa:true,h:1,we:1,den:3};position=null;
      for(let y=18;y<48&&!position;y++)for(let x=18;x<48;x++)if(choose(building,x,y)===vi){position=[x,y];break;}
      if(!position)throw Error('no genuine selector position for '+vi);const[x,y]=position;T(idx(x,y)).bld=building;
      for(let xx=x-3;xx<=x+3;xx++){Object.assign(T(idx(xx,y-1)),{road:1,rc:2});for(let yy=y+1;yy<=y+3;yy++)T(idx(xx,yy)).t=0;}
      recalcAllMasks();computeFoam();computePower();computeWater();rebuildCov();building.pw=building.wa=true;GV.setZoom(2);GV.lookAt(x,y);groundDirty=true;
      return{variant:choose(building,x,y),position};
    },
    frame(st){quiet();const[x,y]=position;building.age=60;building.pw=building.wa=true;GV.setRot(st.rot);GV.setSeason(st.season);rainDays=st.snow?SNOW_ACC_DAYS+3:0;GV.setZoom(st.zoom);GV.lookAt(x,y);window.__captureNight=st.night;currentSprite=sprite(building,x,y,st.snow);if(!currentSprite)throw Error('selected family missing');
      // Warm original deferred caches, then preserve a single synchronous game frame.
      for(let i=0;i<8;i++)raw();
      let overlayChanged=false,hoverApplied=false,smokeCount=0;
      if(st.layer.startsWith('construction')){building.age=Number(st.layer.slice(12));window.__noScaffold=true;const without=raw();window.__noScaffold=false;overlayChanged=raw()!==without;}
      if(st.layer==='hover'){
        // Search a real tool-hover tile behind the target, never force its alpha.
        tool='road';for(let dy=-4;dy<=4&&!hoverApplied;dy++)for(let dx=-4;dx<=4;dx++){hover.x=x+dx;hover.y=y+dy;raw();if(draws.some(d=>!d.reflection&&d.alpha<.5)){hoverApplied=true;break;}}
      }
      if(st.layer==='pedestrian'){const without=raw();citizens.push({name:'capture fixture',fx:x+.4,fy:y-1,at:2,ptype:'adult',age:30,home:idx(x,y),hx:x,hy:y,work:-1,wx:-1,wy:-1,path:null,pi:0,p:0});overlayChanged=raw()!==without;}
      if(st.layer==='smoke'){
        const without=raw();for(let n=0;n<40&&!smokes.some(s=>s['__t'+family]);n++)updSmoke(.46);
        smokeCount=smokes.filter(s=>s['__t'+family]).length;overlayChanged=raw()!==without;
      }
      const png=raw();return{png,layer:st.layer,slot:localStorage.getItem('glimmerville.v1.slot'),bodyDrawn:draws.some(d=>!d.reflection),reflected:draws.some(d=>d.reflection),draws,nightDraws,hoverApplied,overlayChanged,smokeCount,chimneys:currentSprite.smoke.length,variant:choose(building,x,y)};
    }
  };
}
async function main(){const arg=n=>{const i=process.argv.indexOf('--'+n);return i<0?null:process.argv[i+1];};const root=path.resolve(arg('repo')),out=path.resolve(arg('out')),expected=arg('sha'),family=Number(arg('family'));assert([670,671].includes(family));const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64e6}).toString();const commit=git('rev-parse','HEAD').trim();assert.equal(commit,expected);const source=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(source,git('show','HEAD:index.html'));assert.equal(source.split('window.GV={').length,2);const pageSource=source.replace('window.GV={',()=> '('+bridge.toString().replace('FAMILY_NUMBER',String(family))+')();window.GV={');fs.mkdirSync(out,{recursive:true});const report={commit,family,runtimeSHA256:digest(source),swSHA256:digest(fs.readFileSync(path.join(root,'sw.js'))),instrumentation:'In-memory scene bridge plus passive canvas draw observation. Original production draw, selector, overlays and particle update are executed. Synthetic isolated scene; not gameplay or performance acceptance.',models:[],errors:[]};const persist=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));persist();const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(pageSource);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
  try{const {chromium}=require('playwright');browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});report.browser=browser.version();const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,serviceWorkers:'block'});await context.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.GV&&window.__capture674&&window.__boot426&&__boot426().ready,null,{timeout:120000});
  for(let vi=0;vi<10;vi++){const m=await page.evaluate(vi=>__capture674.setup(vi),vi);m.frames=[];report.models.push(m);for(const st of plan()){const f=await page.evaluate(st=>__capture674.frame(st),st);const bytes=Buffer.from(f.png.split(',')[1],'base64'),file=`model-${String(vi).padStart(2,'0')}-${st.id}.png`;fs.writeFileSync(path.join(out,file),bytes);m.frames.push({...f,id:st.id,png:file,sha256:digest(bytes)});persist();}console.log('captured',family,vi,m.frames.length);}
  assert.deepEqual(report.errors,[],'game page errors');validate(report,expected);report.passed=true;persist();await context.close();
  }catch(e){report.error=e.stack;persist();throw e;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}}
module.exports={plan,validate,bridge};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
