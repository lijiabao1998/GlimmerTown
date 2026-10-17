// T658 樣張鉤：本機靜態伺服器＋headless Chrome（CDP）→ 接觸表／遊戲內實拍。
// node _shot658.mjs <out> [contact|ingame] [query]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';

const ROOT='C:/dev/town-658';
const PORT=8191, DBG=9333;
const out=process.argv[2]||'docs/tasks/t658-shots/contact-day-night-winter.png';
const mode=process.argv[3]||'contact';
const qs=process.argv[4]||'';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};

const server=http.createServer((req,res)=>{
  const u=decodeURIComponent((req.url||'/').split('?')[0]);
  let p=path.join(ROOT,u==='/'?'index.html':u);
  if(!path.normalize(p).startsWith(path.normalize(ROOT))){res.writeHead(403).end();return;}
  fs.readFile(p,(e,d)=>{if(e){res.writeHead(404).end('nf');return;}res.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(d);});
});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));

const profile=path.join(process.env.TEMP||'C:/temp','gt658-profile-'+Date.now());
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--hide-scrollbars',
  '--window-size=1440,900','--force-device-scale-factor=1',`--remote-debugging-port=${DBG}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function json(p,o){const r=await fetch(`http://127.0.0.1:${DBG}${p}`,o);if(!r.ok)throw new Error(p+' '+r.status);return r.json();}
async function waitDbg(){for(let i=0;i<80;i++){try{return await json('/json/list');}catch(e){await sleep(250);}}throw new Error('chrome debugger not up');}
const tabs=await waitDbg();
let tab=tabs.find(t=>t.type==='page');
if(!tab)tab=await json('/json/new?about:blank');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
let mid=0;const pend=new Map();
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
const send=(method,params={})=>new Promise((res,rej)=>{const id=++mid;pend.set(id,m=>m.error?rej(new Error(method+': '+JSON.stringify(m.error))):res(m.result));ws.send(JSON.stringify({id,method,params}));});
const evalJs=async(expr)=>{
  const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true,timeout:300000});
  if(r.exceptionDetails)throw new Error('eval: '+JSON.stringify(r.exceptionDetails).slice(0,700));
  return r.result&&r.result.value;
};
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

const url=`http://127.0.0.1:${PORT}/index.html${qs?('?'+qs):''}`;
await send('Page.navigate',{url});
await sleep(1500);
await evalJs(`localStorage.setItem('glimmerville.v1.slot','3');'ok'`);
await send('Page.navigate',{url});
let ready=false;
for(let i=0;i<160;i++){
  try{ready=await evalJs(`!!(window.GV&&GV.art658&&GV.artAtlas646)`);}catch(e){}
  if(ready)break;await sleep(500);
}
if(!ready)throw new Error('GV.art658 not ready');
await sleep(800);

const contactEval=`
(async()=>{
  const S=2,pad=12;
  const specs=[];for(let i=0;i<5;i++)specs.push(GV.art658(i,false));
  const cw=Math.max(...specs.map(s=>s.w))*S, chh=Math.max(...specs.map(s=>s.h))*S;
  const rows=[0,0,1];
  const sheet=document.createElement('canvas');
  sheet.width=5*cw+6*pad;sheet.height=rows.length*chh+(rows.length+1)*pad;
  const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
  g.fillStyle='#5d7b4b';g.fillRect(0,0,sheet.width,sheet.height);
  const load=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('img'));im.src=src;});
  const meta=[];
  for(let r=0;r<rows.length;r++){
    const winter=!!rows[r];
    for(let i=0;i<5;i++){
      const s=GV.art658(i,winter);
      const im=await load(s.img);
      const nm=r===1?await load(s.night):null;
      const bx=pad+i*(cw+pad),by=pad+r*(chh+pad);
      if(r===1){g.fillStyle='#1b2436';g.fillRect(bx,by,cw,chh);}
      const dx=bx+(cw-s.w*S)/2, dy=by+(chh-s.h*S);
      g.drawImage(im,dx,dy,s.w*S,s.h*S);
      if(nm){g.globalCompositeOperation='lighter';g.drawImage(nm,dx,dy,s.w*S,s.h*S);g.globalCompositeOperation='source-over';}
      if(r===0)meta.push({i,n:s.n,w:s.w,h:s.h});
    }
  }
  return {png:sheet.toDataURL('image/png'),meta};
})()
`;

const ingameEval=`
(async()=>{
  await new Promise(r=>setTimeout(r,600));
  const nb=document.getElementById('bNewGame');if(nb)nb.click();
  await new Promise(r=>setTimeout(r,1500));
  GV.newWorldSeeded(7);
  GV.addMoney(6000000);
  let N=64;for(const t of [64,96,128,160]){if(GV.tile(t,0)!==null)N=t;else break;}
  const cx=Math.floor(N/2),cy=Math.floor(N/2);
  /* 找一條連續可鋪路的橫帶，把五座排在路北側同一排。 */
  let rowY=null,rowX0=null;
  for(let y=cy+8;y>=cy-8&&rowY===null;y--){
    let run=0,best=0,bestX=null;
    for(let x=6;x<=N-6;x++){
      if(GV.canPlaceTool('road',x,y)===null){if(run===0)run=1;else run++;if(run>best){best=run;bestX=x-run+1;}}
      else run=0;
    }
    if(best>=18){rowY=y;rowX0=bestX;}
  }
  if(rowY===null){rowY=cy+5;rowX0=6;}
  for(let x=rowX0;x<rowX0+18;x++)GV.place('road',x,rowY);
  const ids=[['school',3],['library',2],['hospital',3],['post',2],['police',2]];
  const placed=[];let x=rowX0+1;
  for(const [id,sz] of ids){
    let spot=null;
    for(let dx=0;dx<6&&!spot;dx++)for(let dy=1;dy<=3&&!spot;dy++){
      const yy=rowY-sz-dy+1,xx=x+dx;
      if(GV.canPlaceTool(id,xx,yy)===null)spot=[xx,yy];
    }
    if(spot){GV.place(id,spot[0],spot[1]);placed.push({id,x:spot[0],y:spot[1]});x=spot[0]+sz+1;}
    else placed.push({id,fail:true});
  }
  GV.step(16);
  GV.setZoom(1.45);
  const mid=placed.filter(p=>!p.fail);
  return {placed,rowY,rowX0,N,focus:mid.length?[mid[Math.floor(mid.length/2)].x,rowY]:[cx,cy]};
})()
`;

const expr=mode==='ingame'?ingameEval:contactEval;
const t0=Date.now();
const res=await evalJs(expr);
if(mode==='ingame'){
  const rect=await evalJs("(()=>{const m=document.getElementById('mini');if(!m)return null;const r=m.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()");
  if(rect&&rect.w>0){
    const f=(res&&res.focus)||[32,32],NN=(res&&res.N)||64;
    const mx=rect.x+((f[0]+0.5)/NN)*rect.w,my=rect.y+((f[1]+0.5)/NN)*rect.h;
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:mx,y:my,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:mx,y:my,button:'left',clickCount:1});
  }
  await sleep(1800);
  const shot=await send('Page.captureScreenshot',{format:'png'});
  const abs=path.join(ROOT,out);fs.mkdirSync(path.dirname(abs),{recursive:true});
  fs.writeFileSync(abs,Buffer.from(shot.data,'base64'));
  console.log('wrote',abs,'in',Date.now()-t0,'ms',JSON.stringify(res));
}else{
  const abs=path.join(ROOT,out);fs.mkdirSync(path.dirname(abs),{recursive:true});
  fs.writeFileSync(abs,Buffer.from(res.png.split(',')[1],'base64'));
  console.log('wrote',abs,'in',Date.now()-t0,'ms',JSON.stringify(res.meta));
}
ws.close();child.kill();server.close();
