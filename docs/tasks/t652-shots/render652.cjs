/* T652 真 Chromium 獨立樣張驗證；不是遊戲實拍，不接受忽略失敗。 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{chromium}=require('playwright');
const OUT=path.resolve(process.argv[2]||'evidence/t652-preview');
async function main(){
  fs.mkdirSync(OUT,{recursive:true});const assets=new Map(['preview.html','designs652.js'].map(f=>['/'+f,fs.readFileSync(path.join(__dirname,f))]));
  const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local'),body=assets.get(url.pathname);res.statusCode=body?200:404;res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'text/html');res.end(body||'not found');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;const report={scope:'standalone preview, not game integration or owner approval',sourceSha256:crypto.createHash('sha256').update(assets.get('/designs652.js')).digest('hex'),frames:[],errors:[],passed:false};
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});report.browser=browser.version();
    const context=await browser.newContext({viewport:{width:1500,height:1120},deviceScaleFactor:1,serviceWorkers:'block'});await context.addInitScript(()=>localStorage.setItem('glimmerville.v1.slot','3'));
    const origin='http://127.0.0.1:'+server.address().port;await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(origin+'/preview.html');await page.waitForFunction(()=>window.previewReady652===true);
    for(let rot=0;rot<4;rot++)for(const season of['spring','summer','autumn','winter'])for(const snow of season==='winter'?[false,true]:[false])for(const night of[false,true]){
      const state={rot,season,snow,night},id=`r${rot}-${season}-${snow?'snow':'clear'}-${night?'night':'day'}`;
      const result=await page.evaluate(state=>{
        document.getElementById('rot').value=String(state.rot);document.getElementById('season').value=state.season;document.getElementById('snow').checked=state.snow;document.getElementById('night').checked=state.night;draw();
        return [...document.querySelectorAll('article canvas')].map((c,i)=>{
          const d=Wave652.designs[i],p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0,edge=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]){ink++;if(x===0||y===0||x===c.width-1||y===c.height-1)edge++;}
          const other=document.createElement('canvas');Wave652.render(other,d,state);const q=other.getContext('2d').getImageData(0,0,c.width,c.height).data;let drift=0;for(let j=0;j<p.length;j++)if(p[j]!==q[j])drift++;
          const day=document.createElement('canvas');Wave652.render(day,d,{...state,night:false});const dayPx=day.getContext('2d').getImageData(0,0,c.width,c.height).data;let nightOutsideBody=0;if(state.night)for(let j=3;j<p.length;j+=4)if(p[j]&&!dayPx[j])nightOutsideBody++;
          return {id:d.id,ink,edge,drift,nightOutsideBody};
        });
      },state);
      const bad=result.filter(r=>r.ink<100||r.edge||r.drift||r.nightOutsideBody);const file=id+'.png';await page.screenshot({path:path.join(OUT,file),fullPage:true});report.frames.push({id,state,file,results:result});if(bad.length)throw Error(id+' pixel validation failed: '+JSON.stringify(bad));
    }
    await page.check('#far');await page.screenshot({path:path.join(OUT,'far.png'),fullPage:true});await page.click('#reset');if(await page.isChecked('#far'))throw Error('reset left far mode checked');
    if(report.errors.length)throw Error('browser errors');report.passed=true;console.log(JSON.stringify({passed:true,frames:report.frames.length,designStates:report.frames.length*10,browser:report.browser}));
  }catch(e){report.errors.push(String(e.stack||e));throw e;}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
