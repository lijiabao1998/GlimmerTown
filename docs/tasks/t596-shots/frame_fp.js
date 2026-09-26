// T596 整幀畫布呼叫指紋量尺（施工 session 的暫存工具原樣存檔；用法見檔頭；pre＝274d0f0＋卡面、post＝改動後）
// T596 整幀畫布呼叫指紋：切 test_fixde.js 開機段（mock DOM＋測試橋），固定種子城＋人工擺一塊住商工測試街區，
// 在 晝／夜／冬雪／雨 × 縮放 1、2 × 視角 0、1 下 forceDraw，錄 game 畫布的每一筆呼叫（方法＋參數＋當下狀態），FNV-1a。
// 用法：node frame_fp.js <dir>   （dir 內要有 index.html 與 test_fixde.js；輸出 JSON 到 stdout 最後一行）
// 選項：--on 在量測前打開 window.__t596（改動後才有意義）
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.resolve(process.argv[2]);
const ON = process.argv.includes('--on');
let src = fs.readFileSync(path.join(DIR, 'test_fixde.js'), 'utf8');
const cut = src.indexOf('// ---- 測試輔助 ----'); if (cut < 0) throw new Error('no marker');
src = src.slice(0, cut);
if (src.split('\neval(js);').length !== 2) throw new Error('eval anchor');
const PRE = `
// ---- frame_fp 注入：畫布編號＋game 畫布錄影 ----
Math.random=(()=>{let s=4242;return ()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})(); // 開機時的夜空星點等也要決定性
{ let cid594=0; const ce0=document.createElement; document.createElement=function(t){const el=ce0.apply(this,arguments); if(el&&String(t).toLowerCase()==='canvas')el.__cid=++cid594; return el;};
  const g=elMap.get('game'); g.__cid=0; const gc0=g.getContext; let px=null;
  global.__REC={on:false,h:0x811c9dc5,n:0,byOp:{},dump:null};
  const R=global.__REC, fnv=s=>{for(let i=0;i<s.length;i++){R.h^=s.charCodeAt(i);R.h=Math.imul(R.h,16777619)>>>0;}};
  const arg=a=>typeof a==='number'?String(Math.round(a*64)/64):typeof a==='string'?a:(a&&typeof a==='object'&&('__cid' in a))?('C'+a.__cid+':'+a.width+'x'+a.height):(a&&a.canvas&&('__cid' in a.canvas))?('X'+a.canvas.__cid):(a&&a.width!==undefined&&a.height!==undefined)?('I'+a.width+'x'+a.height):typeof a;
  g.getContext=function(){const c=gc0.apply(this,arguments); if(!c)return c; if(px&&px.__t===c)return px; px=new Proxy(c,{get(t,p){if(p==='__t')return t;const f=t[p];if(typeof f!=='function')return f;
      return function(...a){if(R.on){R.n++;R.byOp[p]=(R.byOp[p]||0)+1;{const line=String(p)+'('+a.map(arg).join(',')+')'+t.fillStyle+'|'+t.strokeStyle+'|'+t.globalAlpha+'|'+t.globalCompositeOperation+'|'+t.lineWidth+'|'+t.font+';';fnv(line);if(R.dump)R.dump.push(line);}}return f.apply(t,a);};},
    set(t,p,v){t[p]=v;return true;}}); return px;};
}
`;
src = src.replace('\neval(js);', '\n' + PRE + '\neval(js);');
src += `
function assert(){}
const mb=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
Math.random=mb(1234);
const GV=window.GV;
GV.newWorldSeeded(22); GV.setDiff(1); GV.ai(true); for(let d=0;d<160;d++)GV.step(1); GV.ai(false);
// 找一塊 10×10 空地（不含道路），擺測試街區：k1–3 × lv1–3，v 依格輪，另有施工中（age 2、6）與不供電
const T=window.__t412Set, MK=window.__t571Mk, OCC=window.__t416Occ;
let base=null;
outer: for(let y0=4;y0<60;y0++)for(let x0=4;x0<60;x0++){let ok=true;
  for(let dy=0;dy<9&&ok;dy++)for(let dx=0;dx<9&&ok;dx++){const t=GV.tile?GV.tile(x0+dx,y0+dy):null;if(!t||t.t===0||t.road||t.rail||t.tram||t.bld||t.water)ok=false;}
  if(ok){base=[x0,y0];break outer;}}
if(!base)throw new Error('no free 9x9 block');
const placed=[];
for(let dy=0;dy<9;dy++)for(let dx=0;dx<9;dx++){if((dx%3===2)||(dy%3===2))continue;const x=base[0]+dx,y=base[1]+dy,k=1+((dx+dy)%3),lv=1+((dx*2+dy)%3),v=(dx*5+dy*7)%12;
  MK(x,y,k,v);T(x,y,'lv',lv);if((dx+dy)%7===3)T(x,y,'age',2);if((dx+dy)%7===5)T(x,y,'age',6);if((dx*3+dy)%11===4)T(x,y,'pw',false);placed.push([x,y,k,lv,v]);}
if(${ON ? 'true' : 'false'}){window.__t596=true;window.__noOccWin653=true;}
const cx=base[0]+4,cy=base[1]+4;
const out={base,placed:placed.length,frames:{}};
let tnow=100000; try{Object.defineProperty(global.performance,'now',{value:()=>tnow,configurable:true,writable:true});}catch(e){} Date.now=()=>1700000000000+tnow;
const conds=[['day',{visT:55,season:1,weather:0}],['night',{visT:100,season:1,weather:0}],['snow',{visT:55,season:3,weather:2}],['rain',{visT:62,season:0,weather:1}]];
for(const [name,c] of conds)for(const z of [1,2])for(const rot of [0,1]){
  GV.setSeason(c.season); GV.weather(c.weather); GV.setVisT(c.visT); if(GV.setRot)GV.setRot(rot); GV.setZoom(z); GV.lookAt(cx,cy);
  Math.random=mb(99); tnow=100000; GV.forceDraw(); GV.forceDraw();
  Math.random=mb(7); tnow=100016; const R=global.__REC; R.h=0x811c9dc5; R.n=0; R.byOp={}; R.dump=(process.env.DUMP===name+'_z'+z+'_r'+rot)?[]:null; R.on=true; GV.forceDraw(); R.on=false; if(R.dump)require('fs').writeFileSync(process.env.DUMPF,R.dump.join(String.fromCharCode(10)));
  out.frames[name+'_z'+z+'_r'+rot]={h:(R.h>>>0).toString(16),n:R.n};
}
if(GV.setRot)GV.setRot(0);
out.t596=window.__t596T?window.__t596T.stat():null;
console.log('FRAMEFP '+JSON.stringify(out));
process.exit(0);
`;
fs.writeFileSync(path.join(DIR, '_frame_fp_run.js'), src);
require(path.join(DIR, '_frame_fp_run.js'));
