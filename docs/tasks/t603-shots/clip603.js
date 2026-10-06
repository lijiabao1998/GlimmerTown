// T603 原生X裁切幾何／回退守衛；真實整幀像素另由scene603 Chrome驗證。
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
const start=html.indexOf('function clipFilter603('),end=html.indexOf('\nfunction kit603',start);
assert(start>0&&end>start,'unique T603 clip helper anchor');
const source=html.slice(start,end);
const box={window:{},enabled:true,Path2D:class{rect(...a){this.bounds=a;}},t603On:()=>box.enabled};
vm.createContext(box);vm.runInContext(source+';this.clip=clipFilter603;',box);
let checks=0;
const ok=(v,m)=>{assert(v,m);checks++;console.log('PASS: T603 clip '+m);};
const make=(matrix={a:1,b:0,c:0,d:1,e:0,f:0})=>{const events=[];return {canvas:{width:1400,height:900},shadowBlur:0,globalCompositeOperation:'source-over',filter:'brightness(0)',globalAlpha:.22,events,getTransform:()=>matrix,resetTransform(){events.push(['reset']);},clip(p){events.push(['clip',...p.bounds]);},setTransform(m){events.push(['restore',m]);}};};
for(const m of[{a:1,b:0,c:0,d:1,e:0,f:0},{a:2,b:0,c:0,d:-.45,e:100,f:300},{a:-1.25,b:0,c:0,d:2,e:-.75,f:55}]){
  const g=make(m),x=13,w=144;
  ok(box.clip(g,{},x,-110.5,w,77),'supported scale and mirror accepted');
  const left=Math.floor(Math.min(m.a*x+m.e,m.a*(x+w)+m.e))-2,right=Math.ceil(Math.max(m.a*x+m.e,m.a*(x+w)+m.e))+2;
  ok(JSON.stringify(g.events[1])===JSON.stringify(['clip',left,0,right-left,900]),'full device Y retained and transformed X padded');
  ok(g.events.length===3&&g.events[0][0]==='reset'&&g.events[2][1]===m&&g.globalAlpha===.22&&g.filter==='brightness(0)'&&g.globalCompositeOperation==='source-over','transform restored, native filter/alpha/blend untouched');
}
for(const [name,change]of[
  ['art escape',g=>{box.enabled=false;}],['clip escape',g=>{box.window.__noClip603=true;}],
  ['missing Path2D',g=>{box.Path2D=undefined;}],['missing transform API',g=>{g.getTransform=undefined;}],
  ['missing canvas',g=>{g.canvas=null;}],['empty canvas',g=>{g.canvas.height=0;}],
  ['blurred shadow',g=>{g.shadowBlur=1;}],['different blend',g=>{g.globalCompositeOperation='multiply';}],
  ['rotation',g=>{g.getTransform=()=>({a:1,b:.1,c:0,d:1,e:0,f:0});}],['skew',g=>{g.getTransform=()=>({a:1,b:0,c:.2,d:1,e:0,f:0});}],
  ['nonfinite transform',g=>{g.getTransform=()=>({a:Infinity,b:0,c:0,d:1,e:0,f:0});}]
]){box.enabled=true;box.window={};box.Path2D=class{rect(...a){this.bounds=a;}};const g=make();change(g);ok(box.clip(g,{},0,0,144,208)===false&&g.events.length===0,name+' falls back without touching context');}
box.enabled=true;box.window={};box.Path2D=class{rect(...a){this.bounds=a;}};
for(const [x,w]of[[.375,144],[0,144*.65],[-.625,144],[13.125,90],[.375,143.625]]){const g=make();ok(box.clip(g,{},x,0,w,208)===false&&g.events.length===0,'fractional device X endpoints preserve exact original filter path');}
for(const [w,h]of[[0,208],[144,0],[-1,208],[NaN,208]]){const g=make();ok(box.clip(g,{},0,0,w,h)===false&&g.events.length===0,'invalid extent falls back without clipping');}
ok((html.match(/clipFilter603\(ctx,/g)||[]).length===2,'only two approved runtime call sites');
ok(html.includes("clipFilter603(ctx,rs.img,-rs.ax*z,-rs.ay*z,rs.w*z,rs.h*z);")&&html.includes("ctx.filter='brightness(0)';\n        ctx.globalAlpha=.22;\n        ctx.drawImage(rs.img,-rs.ax*z,-rs.ay*z,rs.w*z,rs.h*z);"),'reflection retains exact native draw/filter/alpha');
ok(html.includes("clipFilter603(ctx,s.img,bx+SHOX*z,by+s.h*z-shH+SHOY*z,s.w*z,shH);")&&html.includes("ctx.filter='brightness(0)';\n      ctx.globalAlpha=shadowA;\n      ctx.drawImage(s.img,bx+SHOX*z,by+s.h*z-shH+SHOY*z,s.w*z,shH);"),'shadow retains exact native draw/filter/alpha');
console.log('T603_CLIP_RESULT '+JSON.stringify({checks}));
