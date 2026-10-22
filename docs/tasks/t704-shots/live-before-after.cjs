// T704 前後對照：同一個有鐵路線尾的場景，夜晚實際 rAF 迴圈 800ms（錯誤數、平均亮度、截圖）與白天單幀（雜湊）。
const fs=require('fs'),http=require('http'),crypto=require('crypto');const src=fs.readFileSync(process.argv[2],'utf8');const out=process.argv[3];const tag=process.argv[4];
const scene=fs.readFileSync(__dirname+'/scene.cjs','utf8');const bsrc=scene.slice(scene.indexOf('function bridge(){'),scene.indexOf('\n(async()=>{'));
const page=src.replace('window.GV={',()=>'('+bsrc+')();window.__ev=function(s){return eval(s);};window.GV={');
(async()=>{const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(page);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;const {chromium}=require('playwright');const br=await chromium.launch({headless:true});
const ctx=await br.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});await ctx.addInitScript(()=>{localStorage.setItem('glimmerville.v1.slot','3');localStorage.setItem('glimmerville.v1.snd','0');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(origin);await p.waitForFunction(()=>window.GV&&window.__rail&&window.__boot426&&__boot426().ready,null,{timeout:120000});
await p.evaluate(()=>{__rail.init();const s=document.getElementById('start');if(s)s.classList.add('hide');});
await p.evaluate(()=>__ev("for(let y=0;y<N;y++)for(let x=0;x<N;x++){const t=T(idx(x,y));if(t.rail||t.tram)recalcRailMask(x,y);}groundDirty=true;"));
await p.evaluate(()=>__ev("for(const [x,y] of [[33,32],[34,32],[36,33],[37,34],[42,31],[43,35]])T(idx(x,y)).bld={k:1,lv:2,v:0,age:60,pw:true,wa:true,h:1,we:1,den:3};groundDirty=true;"));
const deadEnds=await p.evaluate(()=>__ev("let n=0,r=0,z=0;for(let i=0;i<tiles.length;i++){const t=tiles[i];if(t.rail&&!t.railBridge){r++;if(!t.railMask)z++;if(STOPPC582(t.railMask||0)<=1)n++;}}({rail:r,deadEnds:n,zeroMask:z})"));
const rep={tag,deadEnds};
// 白天單幀
await p.evaluate(()=>__ev('trains.length=0;GV.setZoom(2);GV.lookAt(37,33);groundDirty=true;visT=55;running=false;speed=0;ctx.globalCompositeOperation="source-over";GV.forceDraw();'));
{const u=await p.evaluate(()=>__ev('cvs.toDataURL()'));fs.writeFileSync(`${out}/${tag}-day.png`,Buffer.from(u.split(',')[1],'base64'));rep.dayHash=crypto.createHash('sha256').update(u).digest('hex').slice(0,16);}
// 夜晚實際迴圈
const n0=errs.length;
await p.evaluate(()=>__ev('trains.length=0;trains.push({x:38,y:30,d:1,p:.3,pt:0});GV.setZoom(2);GV.lookAt(37,33);groundDirty=true;visT=3;running=true;speed=1;'));
await p.waitForTimeout(800);
await p.evaluate(()=>__ev('running=false;speed=0;'));
rep.nightErrors=errs.length-n0;rep.firstError=errs[n0]||null;
rep.gcoAfter=await p.evaluate(()=>__ev('ctx.globalCompositeOperation'));
const st=await p.evaluate(()=>__ev('(function(){const d=ctx.getImageData(0,0,cvs.width,cvs.height).data;let s=0,w=0;for(let i=0;i<d.length;i+=4){const l=(d[i]+d[i+1]+d[i+2])/3;s+=l;if(l>250)w++;}return{mean:s/(d.length/4),whiteFrac:w/(d.length/4)};})()'));
Object.assign(rep,st);
{const u=await p.evaluate(()=>__ev('cvs.toDataURL()'));fs.writeFileSync(`${out}/${tag}-night.png`,Buffer.from(u.split(',')[1],'base64'));}
console.log(JSON.stringify(rep));await br.close();server.close();})().catch(e=>{console.error(e);process.exit(1);});
