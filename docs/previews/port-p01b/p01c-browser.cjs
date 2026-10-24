// P01-C extends the existing real-browser run; no physics or rendering quality changes.
module.exports=async({page,context,summary,out,fs,save})=>{
 const assert=(name,result)=>{summary.checks.push({name,result});save();if(!result)throw Error(name);};
 const stat=a=>{a=[...a].sort((x,y)=>x-y);return {n:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.min(a.length-1,Math.floor(a.length*.95))],min:a[0],max:a.at(-1)};};
 summary.p01c={touch:[],performance:[],longRun:null};
 summary.p01c.clearanceViews=[];
 for(let rot=0;rot<4;rot++){let pair=[];for(const legacy of[true,false]){const data=await page.evaluate(({rot,legacy})=>{window.__p01cLegacyClearance=legacy;P01B.build();GV.setRot(rot);GV.setZoom(1.8);GV.lookAt(29,33);P01B.view(55,0);return document.querySelector('#game').toDataURL('image/png');},{rot,legacy});pair.push(data);fs.writeFileSync(`${out}/clearance-${legacy?'before':'fixed'}-r${rot}.png`,Buffer.from(data.split(',')[1],'base64'));}assert(`Crane foot clearance repair changes visible pixels r${rot}`,pair[0]!==pair[1]);summary.p01c.clearanceViews.push({rot,before:`clearance-before-r${rot}.png`,fixed:`clearance-fixed-r${rot}.png`});}

 // Independent fresh context, same original source, but candidate valve disabled before boot.
 const coldContext=await context.browser().newContext({viewport:{width:1440,height:1000}});const coldPage=await coldContext.newPage();await coldPage.goto('http://127.0.0.1:8126/?baseline=1');await coldPage.waitForFunction(()=>window.P01B?.parts.length>0,null,{timeout:120000});summary.coldBaseline=await coldPage.evaluate(()=>({readyMs:performance.now()-window.__p01cStart,...P01B.diag()}));await coldContext.close();
 for(const [name,x,y,phase,sea] of [['shore-west',23,35,55,0],['shore-east',35,35,55,0],['crane-feet-height',30,34,55,0],['lamp-closeup',29,32,0,0],['winter-feet',30,33,55,3]]){await page.evaluate(({x,y,phase,sea})=>{GV.setRot(0);GV.setZoom(2);GV.lookAt(x,y);P01B.view(phase,sea);},{x,y,phase,sea});await page.screenshot({path:`${out}/detail-${name}.png`});}

 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2,force:1}))});
 for(const width of[320,360,390,412]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>{window.__noHarborP01B=false;GV.setZoom(.65);GV.setRot(0);GV.lookAt(32.5,31.5);P01B.view(55,0);});
  const before=await page.evaluate(()=>P01B.diag().cam);
  await touch('touchStart',[[width/2,400,1]]);for(let n=1;n<=8;n++)await touch('touchMove',[[width/2+6*n,400+4*n,1]]);await touch('touchEnd',[]);await page.waitForTimeout(200);
  const pan=await page.evaluate(()=>P01B.diag().cam);assert(`${width}px real touch pans native camera`,Math.hypot(pan.x-before.x,pan.y-before.y)>10);
  await touch('touchStart',[[width/2-25,430,1],[width/2+25,430,2]]);for(let n=1;n<=8;n++)await touch('touchMove',[[width/2-25-5*n,430,1],[width/2+25+5*n,430,2]]);await touch('touchEnd',[]);await page.waitForTimeout(400);
  const pinch=await page.evaluate(()=>P01B.diag().cam);assert(`${width}px real pinch changes native zoom`,pinch.z>pan.z+.1);
  const b=await page.locator('#zout').boundingBox();await touch('touchStart',[[b.x+b.width/2,b.y+b.height/2,1]]);await touch('touchEnd',[]);await page.waitForTimeout(400);const button=await page.evaluate(()=>P01B.diag().cam);assert(`${width}px native zoom UI remains touch-operable`,button.z<pinch.z);
  for(const label of ['道路','基本']){const button=page.locator('#toolcats button').filter({hasText:label});const q=await button.boundingBox();await touch('touchStart',[[q.x+q.width/2,q.y+q.height/2,1]]);await touch('touchEnd',[]);await page.waitForTimeout(120);assert(`${width}px native category ${label} touch works`,await button.evaluate(el=>el.classList.contains('on')));}
  const panelClear=await page.evaluate(()=>{const a=document.querySelector('#p01cPanel').getBoundingClientRect();return ['#hud','#toolcats','#zoomer'].every(sel=>{const b=document.querySelector(sel).getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;});});assert(`${width}px preview label does not obstruct native UI`,panelClear);
  const overlay=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,plus:getComputedStyle(document.querySelector('#zin')).display,canvas:getComputedStyle(document.querySelector('#game')).touchAction}));
  summary.p01c.touch.push({width,source:'Chrome DevTools genuine touch dispatch, not physical hardware',before,pan,pinch,button,overlay});await page.screenshot({path:`${out}/${width}-touch-after.png`});
 }
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 // Native warm draws, fixed paused simulation; actual rAF intervals measured separately.
 for(const width of[1440,320,360,390,412])for(const zoom of[.4,1.05,1.8]){
  await page.setViewportSize({width,height:width===1440?1000:900});
  for(const enabled of[false,true]){
   const data=await page.evaluate(async({zoom,enabled})=>{GV.setRot(0);GV.setZoom(zoom);GV.lookAt(32.5,31.5);P01B.view(55,0);window.__noHarborP01B=!enabled;for(let i=0;i<5;i++)P01B.redraw();const before=P01B.diag(),draw=[];for(let i=0;i<60;i++){const t=performance.now();P01B.redraw();draw.push(performance.now()-t);}const intervals=[];let last;await new Promise(resolve=>{const frame=t=>{if(last!==undefined)intervals.push(t-last);last=t;if(intervals.length>=90)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});return {draw,intervals,before,after:P01B.diag()};},{zoom,enabled});
   summary.p01c.performance.push({width,zoom,enabled,drawMs:stat(data.draw),displayFrameMs:stat(data.intervals),displayFPS:stat(data.intervals.map(t=>1000/t)),before:data.before,after:data.after});save();
  }
 }
 // Sustained five-minute observation at fixed conditions, samples not an invented FPS promise.
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{window.__noHarborP01B=false;GV.setRot(0);GV.setZoom(1.05);GV.lookAt(32.5,31.5);P01B.view(55,0);});
 const long=await page.evaluate(async()=>{const before=P01B.diag(),intervals=[],samples=[],start=performance.now();let last;await new Promise(resolve=>{const frame=t=>{if(last!==undefined)intervals.push(t-last);last=t;if(intervals.length%600===0)samples.push({elapsedMs:performance.now()-start,...P01B.diag()});if(performance.now()-start>=300000)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});return {elapsedMs:performance.now()-start,before,after:P01B.diag(),intervals,samples};});
 summary.p01c.longRun={...long,intervals:undefined,displayFrameMs:stat(long.intervals),displayFPS:stat(long.intervals.map(t=>1000/t))};assert('Five minute steady scene does not repeatedly rebake',long.after.bake.count===long.before.bake.count);assert('Five minute cache pixels do not grow',long.after.cache.pixels===long.before.cache.pixels);save();
};
