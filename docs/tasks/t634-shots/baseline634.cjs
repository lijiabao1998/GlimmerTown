'use strict';
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../../..'),OUT=path.resolve(process.env.OUT634||'evidence/baseline634');fs.mkdirSync(OUT,{recursive:true});
function bridge(){
  window.__britPrep={
    catalog:()=>LOT_PLAN574.map((p,k)=>({k,tool:p&&p[0],newSize:p&&p[1],oldSize:k===9?2:MSZ[k]||1,lot:!!(p&&lotSpec574(p[0]))})).filter(r=>r.k>0),
    get:(k,v=0,legacy=false,lv=1,winter=false)=>{
      const p=LOT_PLAN574[k];let s;
      if(!legacy&&p&&lotSpec574(p[0]))return lotSprite574(k,v,2,winter,false);
      if(k===4)s=t601On()?one601(k,0,0,{v},winter,season()):(winter?SPR.parkW:SPR.park)[v];
      else if(k===5)s=v&&SPR.plantVar?SPR.plantVar[v]:SPR.plant;
      else if(k===10)s=v&&SPR.waterTowerVar?SPR.waterTowerVar[v]:SPR.waterTower;
      else if(k===11)s=v&&SPR.policeVar?SPR.policeVar[v]:SPR.police;
      else if(k===12)s=v&&SPR.hospitalVar?SPR.hospitalVar[v]:SPR.hospital;
      else if(k===13)s=v&&SPR.clinicVar?SPR.clinicVar[v]:SPR.clinic;
      else if(k===52)s=(SPR.policeBoxVar590||[])[v]||SPR.policeBox;
      else if(k===81||k===97)s=one601(k,0,0,{v},winter);
      else s=SPR.bld[k+'_'+lv+'_'+v]||SPR.bld[k+'_1_'+v]||SPR.bld[k+'_1_0'];
      return winter&&s&&s.win563?s.win563:s;
    },
    sheet:(ks,legacy=false)=>{
      const c=document.createElement('canvas');c.width=1800;c.height=1260;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#e4e8e2';g.fillRect(0,0,c.width,c.height);g.fillStyle='#283d45';g.font='bold 25px sans-serif';g.fillText('TOWN / CURRENT MAIN / '+(legacy?'OLD-SAVE FOOTPRINTS':'CURRENT DEFAULTS'),30,36);
      const records=[];ks.forEach((k,i)=>{const s=__britPrep.get(k,0,legacy),x=(i%6)*300,y=60+Math.floor(i/6)*290;g.fillStyle='#f3f4ed';g.fillRect(x+8,y+8,284,270);g.fillStyle='#344b50';g.font='17px sans-serif';g.fillText('k'+k+'  '+(LOT_PLAN574[k][0]||['','RESIDENTIAL','COMMERCIAL','INDUSTRIAL'][k]||'TOWER'),x+18,y+29);if(!s){records.push({k,missing:true});return;}const q=Math.min(1.9,260/s.w,220/s.h),xx=x+150-s.ax*q,yy=y+253-s.ay*q;g.drawImage(s.img,xx,yy,s.w*q,s.h*q);records.push({k,w:s.w,h:s.h,flags:[s.__t590,s.__t601,s.__t602,s.__t603],lot:!!s.lotMeta574});});return {png:c.toDataURL(),records};
    },
    pins:()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;table[n]=c;}const crc=c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let r=0xFFFFFFFF;for(const b of a)r=table[(r^b)&255]^(r>>>8);return ((r^0xFFFFFFFF)>>>0).toString(16);};return Object.fromEntries(GV.sprAtlas356().entries.map(e=>[e.fam+'/'+e.key,[crc(e.img),...(e.night?[crc(e.night)]:[]),...(e.nightCity?[crc(e.nightCity)]:[])]]));},
    freeze:()=>{running=false;GV.setSpeed(0);GV.ai(false);for(const t of tiles)if(t.bld&&!t.bld.ref){t.bld.age=60;t.bld.pw=true;t.bld.wa=true;}},
    render:()=>{trafClock=12;visT=40;waterF=0;waterT=0;weather=0;groundDirty=true;GV.forceDraw();return cvs.toDataURL();}
  };
}
(async()=>{const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace('window.GV={','('+bridge.toString()+')();window.GV={');const server=http.createServer((req,res)=>{if(req.url.startsWith('/index.html')){res.setHeader('Content-Type','text/html');res.end(src);}else if(req.url.startsWith('/sw.js')){res.writeHead(404);res.end();}else{res.writeHead(200,{'Content-Type':'text/html'});res.end('<html></html>');}}).listen(8840,'127.0.0.1');const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1800,height:1260},serviceWorkers:'block'});let errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');});await page.goto('http://127.0.0.1:8840/index.html');await page.waitForFunction(()=>window.GV&&window.__boot426&&__boot426().ready,null,{timeout:120000});let catalog=await page.evaluate(()=>__britPrep.catalog());fs.writeFileSync(path.join(OUT,'catalog.json'),JSON.stringify(catalog,null,2));const pins=await page.evaluate(()=>__britPrep.pins());fs.writeFileSync(path.join(OUT,'pins.json'),JSON.stringify(pins,null,2));let records=[];for(const legacy of [false,true])for(let start=0;start<catalog.length;start+=24){const ks=catalog.slice(start,start+24).map(r=>r.k),r=await page.evaluate(({ks,legacy})=>__britPrep.sheet(ks,legacy),{ks,legacy});fs.writeFileSync(path.join(OUT,`${legacy?'old-save':'current'}-${String(start+1).padStart(3,'0')}-${String(start+ks.length).padStart(3,'0')}.png`),Buffer.from(r.png.split(',')[1],'base64'));records.push(...r.records.map(x=>({...x,legacy})));}fs.writeFileSync(path.join(OUT,'render-records.json'),JSON.stringify({records,errors,pinCount:Object.keys(pins).length},null,2));if(errors.length||records.some(r=>r.missing))throw Error('Baseline incomplete '+JSON.stringify({errors,missing:records.filter(r=>r.missing)}));console.log(JSON.stringify({sheets:12,pinCount:Object.keys(pins).length,missing:records.filter(r=>r.missing),errors}));await browser.close();server.close();})().catch(e=>{console.error(e);process.exit(1);});
