// T596 擴充版整幀指紋量尺（對抗覆核代理人寫的，原樣存檔；錄所有畫布＋岸邊倒影＋冬夏煙管線＋z .4/.6/1/2 × 四視角 × 五天候）
// review596/offpath：frame_fp 擴充版。和原版差別：
//  (1) 錄「所有」畫布（離屏夜燈層 lotNightLayer574、縮圖 mini 等）在量測幀內的呼叫，不只 game；
//  (2) 加岸邊場景（在臨水陸格擺住商工，讓 reflectSprite 真的被呼叫）；
//  (3) 加煙粒場景（冬／夏各跑 updSmoke 若干步，指紋化 smokes 陣列）；
//  (4) 加 lod 遠景（z .6）與 lodMini（z .4）幀。
//  T600 補：倒影直呼帶建築那一格的座標（reflectSprite(bd,x,y)），--on 時才會和畫面同一款；關著時結果不變。
// 用法：node frame_fp2.js <dir> [--on]
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.resolve(process.argv[2]);
const ON = process.argv.includes('--on');
let src = fs.readFileSync(path.join(DIR, 'test_fixde.js'), 'utf8');
const cut = src.indexOf('// ---- 測試輔助 ----'); if (cut < 0) throw new Error('no marker');
src = src.slice(0, cut);
if (src.split('\neval(js);').length !== 2) throw new Error('eval anchor');
const PRE = `
Math.random=(()=>{let s=4242;return ()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();
{ const e=js.lastIndexOf('})();'); js=js.slice(0,e)+"\\nwindow.__fp2={updSmoke:(dt)=>updSmoke(dt),smokes:()=>smokes,reflect:(bd,x,y)=>reflectSprite(bd,x,y)};\\n"+js.slice(e); }
{ let cid594=0;
  global.__REC={on:false,h:0x811c9dc5,n:0,byC:{},dump:null};
  const R=global.__REC, fnv=s=>{for(let i=0;i<s.length;i++){R.h^=s.charCodeAt(i);R.h=Math.imul(R.h,16777619)>>>0;}};
  const arg=a=>typeof a==='number'?String(Math.round(a*64)/64):typeof a==='string'?a:(a&&typeof a==='object'&&('__cid' in a))?('C'+a.__cid+':'+a.width+'x'+a.height):(a&&a.canvas&&('__cid' in a.canvas))?('X'+a.canvas.__cid):(a&&a.width!==undefined&&a.height!==undefined)?('I'+a.width+'x'+a.height):typeof a;
  const wrapEl=(el,tag)=>{const gc0=el.getContext; el.getContext=function(){const c=gc0.apply(this,arguments); if(!c)return c;
    return new Proxy(c,{get(t,p){if(p==='__t')return t;const f=t[p];if(typeof f!=='function')return f;
      return function(...a){if(R.on){R.n++;R.byC[tag]=(R.byC[tag]||0)+1;const line=tag+'>'+String(p)+'('+a.map(arg).join(',')+')'+t.fillStyle+'|'+t.strokeStyle+'|'+t.globalAlpha+'|'+t.globalCompositeOperation+'|'+t.lineWidth+'|'+t.font+'|'+t.filter+';';fnv(line);if(R.dump)R.dump.push(line);}return f.apply(t,a);};},
      set(t,p,v){t[p]=v;return true;}});};};
  const ce0=document.createElement; document.createElement=function(t){const el=ce0.apply(this,arguments); if(el&&String(t).toLowerCase()==='canvas'){el.__cid=++cid594;wrapEl(el,'c'+el.__cid);} return el;};
  const g=elMap.get('game'); g.__cid=0; wrapEl(g,'G');
  const mi=elMap.get('mini'); if(mi){mi.__cid=-1;wrapEl(mi,'M');}
}
`;
src = src.replace('\neval(js);', '\n' + PRE + '\neval(js);');
src += `
function assert(){}
const mb=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
Math.random=mb(1234);
const GV=window.GV;
GV.newWorldSeeded(22); GV.setDiff(1); GV.ai(true); for(let d=0;d<160;d++)GV.step(1); GV.ai(false);
const T=window.__t412Set, MK=window.__t571Mk;
let base=null;
outer: for(let y0=4;y0<60;y0++)for(let x0=4;x0<60;x0++){let ok=true;
  for(let dy=0;dy<9&&ok;dy++)for(let dx=0;dx<9&&ok;dx++){const t=GV.tile?GV.tile(x0+dx,y0+dy):null;if(!t||t.t===0||t.road||t.rail||t.tram||t.bld||t.water)ok=false;}
  if(ok){base=[x0,y0];break outer;}}
if(!base)throw new Error('no free 9x9 block');
const placed=[];
for(let dy=0;dy<9;dy++)for(let dx=0;dx<9;dx++){if((dx%3===2)||(dy%3===2))continue;const x=base[0]+dx,y=base[1]+dy,k=1+((dx+dy)%3),lv=1+((dx*2+dy)%3),v=(dx*5+dy*7)%12;
  MK(x,y,k,v);T(x,y,'lv',lv);if((dx+dy)%7===3)T(x,y,'age',2);if((dx+dy)%7===5)T(x,y,'age',6);if((dx*3+dy)%11===4)T(x,y,'pw',false);placed.push([x,y,k,lv,v]);}
// 岸邊：找臨水的空陸格擺住商工（k 輪 1/2/3，lv 輪 1..3）
const N=GV.size?GV.size():72; const shore=[];
for(let y=1;y<70&&shore.length<24;y++)for(let x=1;x<70&&shore.length<24;x++){const t=GV.tile(x,y);if(!t||t.t===0||t.road||t.rail||t.tram||t.bld||t.bridge)continue;
  const nb=[[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy])=>{const u=GV.tile(x+dx,y+dy);return u&&u.t===0&&u.wm;});if(nb)shore.push([x,y]);}
shore.forEach(([x,y],i)=>{const k=1+(i%3),lv=1+((i/3|0)%3),v=(i*7)%12;MK(x,y,k,v);T(x,y,'lv',lv);});
if(${ON ? 'true' : 'false'}){window.__t596=true;window.__noOccWin653=true;}
const out={base,placed:placed.length,shore:shore.length,frames:{}};
let tnow=100000; try{Object.defineProperty(global.performance,'now',{value:()=>tnow,configurable:true,writable:true});}catch(e){} Date.now=()=>1700000000000+tnow;
const R=global.__REC;
const shot=(key,cx,cy)=>{GV.lookAt(cx,cy);Math.random=mb(99); tnow=100000; GV.forceDraw(); GV.forceDraw();
  Math.random=mb(7); tnow=100016; R.h=0x811c9dc5; R.n=0; R.byC={}; R.dump=(process.env.DUMP===key)?[]:null; R.on=true; GV.forceDraw(); R.on=false; if(R.dump)require('fs').writeFileSync(process.env.DUMPF,R.dump.join(String.fromCharCode(10)));
  out.frames[key]={h:(R.h>>>0).toString(16),n:R.n,byC:Object.keys(R.byC).length};};
const conds=[['day',{visT:55,season:1,weather:0}],['night',{visT:100,season:1,weather:0}],['snow',{visT:55,season:3,weather:2}],['rain',{visT:62,season:0,weather:1}],['wnight',{visT:100,season:3,weather:0}]];
const cx=base[0]+4,cy=base[1]+4;
const sh=shore.length?shore[(shore.length/2)|0]:[cx,cy];
for(const [name,c] of conds)for(const z of [.4,.6,1,2])for(const rot of [0,1,2,3]){
  GV.setSeason(c.season); GV.weather(c.weather); GV.setVisT(c.visT); if(GV.setRot)GV.setRot(rot); GV.setZoom(z);
  shot(name+'_z'+z+'_r'+rot,cx,cy);
  shot('shore_'+name+'_z'+z+'_r'+rot,sh[0],sh[1]);
}
if(GV.setRot)GV.setRot(0);
// 反射直呼：所有岸格建築
{let h=0x811c9dc5;const fnv=s=>{for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}};
 for(const [x,y] of shore.concat(placed.map(p=>[p[0],p[1]]))){const t=GV.tile(x,y);const bd=t&&t.bld;const rs=bd&&window.__fp2.reflect(bd,x,y);fnv(rs?(rs.w+'x'+rs.h+'@'+rs.ax+','+rs.ay+':'+(rs.img&&rs.img.__cid)):'null');}
 out.reflect=(h>>>0).toString(16);}
// 煙：冬（住宅炊煙）與夏（工業），各 40 步
for(const sea of [3,1]){GV.setSeason(sea);GV.weather(0);const S=window.__fp2.smokes();S.length=0;Math.random=mb(31+sea);
  for(let i=0;i<40;i++)window.__fp2.updSmoke(.05);
  let h=0x811c9dc5;const fnv=s=>{for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}};
  for(const s of window.__fp2.smokes())fnv([s.wx,s.wy,s.col,Math.round(s.life*1e6),s.big,s.dep,Math.round(s.age*1e6)].join(','));
  out['smoke'+sea]={h:(h>>>0).toString(16),n:window.__fp2.smokes().length};}
out.t596=window.__t596T?window.__t596T.stat():null;
console.log('FRAMEFP2 '+JSON.stringify(out));
process.exit(0);
`;
fs.writeFileSync(path.join(DIR, '_frame_fp2_run.js'), src);
require(path.join(DIR, '_frame_fp2_run.js'));
