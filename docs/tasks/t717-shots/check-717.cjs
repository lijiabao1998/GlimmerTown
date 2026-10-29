/* T717：獨立幾何／原文守衛；真 Chromium 像素與性能另驗，不以 mock 宣稱畫面相同。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {NATIVE_BLOCKS}=require('../t603-shots/native603.js');
const ROOT=path.resolve(__dirname,'../../..'),HEAD=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function check(ok,group,message){if(!ok)throw Error(group+' '+message);}
function fn(src,name){
  const start=src.indexOf('\nfunction '+name+'(');check(start>=0,'SOURCE',name+' exists');
  let depth=0,quote='',escape=false;
  for(let i=src.indexOf('{',start);i<src.length;i++){
    const c=src[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(start+1,i+1);
  }
  throw Error('SOURCE unclosed '+name);
}
function stripComments(src){
  let out='',quote='',escape=false;
  for(let i=0;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(quote){out+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;out+=c;continue;}
    if(c==='/'&&n==='/'){while(i<src.length&&src[i]!=='\n')i++;out+='\n';continue;}
    if(c==='/'&&n==='*'){i+=2;while(i<src.length&&!(src[i]==='*'&&src[i+1]==='/'))i++;i++;out+=' ';continue;}
    out+=c;
  }
  return out;
}
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function matrix(R,i){
  const theta=i%4===0?(i%16)*Math.PI/8:(R()*2-1)*Math.PI,co=Math.cos(theta),si=Math.sin(theta);
  const sx=1+2*R(),sy=(1+2*R())*(i%2?-1:1)*(i%3===0?.35:1),shear=(R()-.5)*1.4;
  return {a:co*sx,b:si*sx,c:(co*shear-si)*sy,d:(si*shear+co)*sy,e:(R()-.5)*2500,f:(R()-.5)*1700};
}
function point(m,x,y){return [m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];}
/* 以區間中心＋半徑求外框，獨立於產品的四角 min/max 演算法。 */
function expected(m,rect){
  const [x,y,w,h]=rect,cx=x+w/2,cy=y+h/2;
  const xmid=m.a*cx+m.c*cy+m.e,ymid=m.b*cx+m.d*cy+m.f;
  const xr=Math.abs(m.a*w/2)+Math.abs(m.c*h/2),yr=Math.abs(m.b*w/2)+Math.abs(m.d*h/2);
  return [Math.floor(xmid-xr)-2,Math.floor(ymid-yr)-2,Math.ceil(xmid+xr)+2,Math.ceil(ymid+yr)+2];
}
function harness(src){
  class Path717{constructor(){this.rectangles=[];}rect(...r){this.rectangles.push(r);}}
  const C={Path2D:Path717,Math};vm.createContext(C);vm.runInContext(fn(src,'clip717'),C);
  function run(m,rect,group){
    const original={...m};let current={...m},box=null,clips=0,changes=0;
    const g={getTransform:()=>({...current}),setTransform(...args){changes++;current=args.length===1?{...args[0]}:Object.fromEntries(['a','b','c','d','e','f'].map((k,i)=>[k,args[i]]));},
      clip(p){clips++;check(p instanceof Path717&&p.rectangles.length===1,group,'independent Path2D rectangle');check(same(current,{a:1,b:0,c:0,d:1,e:0,f:0}),group,'device-space clip uses identity transform');const [x,y,w,h]=p.rectangles[0];box=[x,y,x+w,y+h];},
      beginPath(){throw Error(group+' current path must remain untouched');},rect(){throw Error(group+' current path must remain untouched');}};
    C.clip717(g,...rect);check(clips===1&&changes===2,group,'one clip and transform restore');check(same(current,original),group,'original transform restored');
    check(box.every(Number.isInteger)&&box[2]>=box[0]&&box[3]>=box[1],group,'finite integer outer bounds');return box;
  }
  return {run,C};
}
function equalBox(actual,want,group,detail){check(same(actual,want),group,detail+' actual='+JSON.stringify(actual)+' expected='+JSON.stringify(want));}
function geometry(src,trials){
  const H=harness(src),R=random(717);let corners=0;
  for(let i=0;i<trials;i++){
    const m=matrix(R,i),rect=[(R()-.5)*500,(R()-.5)*400,(i%2?-1:1)*(1+R()*400),(i%4<2?-1:1)*(1+R()*600)];
    const box=H.run(m,rect,'G2');equalBox(box,expected(m,rect),'G2','trial '+i+' exact outward 2px padding');
    for(const x of [rect[0],rect[0]+rect[2]])for(const y of [rect[1],rect[1]+rect[3]]){const p=point(m,x,y);check(p[0]>=box[0]+2-1e-8&&p[0]<=box[2]-2+1e-8&&p[1]>=box[1]+2-1e-8&&p[1]<=box[3]-2+1e-8,'G2','all four corners with 2px margin');corners++;}
  }
  let calls=0;H.C.clip717({clip(){calls++;}},0,0,1,1);check(calls===0,'G2','missing getTransform is a no-op');
  H.C.Path2D=undefined;H.C.clip717({getTransform(){calls++;},clip(){calls++;}},0,0,1,1);check(calls===0,'G2','missing Path2D is a no-op');
  return {trials,corners,negativeDimensions:true,rotationShearAndCompression:true,integerPadding:2,transformRestored:true,missingAPIsNoop:true};
}
function calls(src){
  const found=[...src.matchAll(/if\(c717\)\{ctx\.save\(\);clip717\(ctx,([^\n]+)\);\}/g)];check(found.length===2,'G3','two actual clip call expressions');
  const sh=src.match(/const c717=t717On\(\),sh717=([^;\n]+);/);check(sh,'G3','actual shadow-height initializer');
  const names=['ax2','ay2','rs','z','bx','by','s','SHOX','SHOY'];
  return {found,evals:found.map((m,i)=>new Function(...names,(i?'const sh717='+sh[1]+';':'')+'return ['+m[1]+'];')),height:sh[1]};
}
function callGeometry(src,trials){
  const H=harness(src),call=calls(src),R=random(71703);let corners=0;
  for(let i=0;i<trials;i++){
    const m=matrix(R,i),ax=(R()-.5)*800,ay=(R()-.5)*600,z=.3+R()*3.7;
    const rs={ax:R()*100,ay:R()*250,w:10+R()*300,h:10+R()*500},s={w:10+R()*400,h:i%50===0?1:10+R()*600};
    const bx=(R()-.5)*700,by=(R()-.5)*500,SHOX=(R()-.5)*30,SHOY=(R()-.5)*30,args=[ax,ay,rs,z,bx,by,s,SHOX,SHOY];
    const nativeHeight=Math.max(2,s.h*z*.32);
    /* 原生倒影先 translate(ax,ay)，再 scale(1,-.35)；組矩陣，不複製呼叫點換算式。 */
    const reflection={a:m.a,b:m.b,c:m.c*(-.35),d:m.d*(-.35),e:m.a*ax+m.c*ay+m.e,f:m.b*ax+m.d*ay+m.f};
    const native=[{m:reflection,r:[-rs.ax*z,-rs.ay*z,rs.w*z,rs.h*z]},{m,r:[bx+SHOX*z,by+s.h*z-nativeHeight+SHOY*z,s.w*z,nativeHeight]}];
    for(let k=0;k<2;k++){
      const box=H.run(m,call.evals[k](...args),'G3'),truth=native[k];
      /* 等於原生矩形的最小 2px 外框，也擋「錯高度只把框放大」的假陰性。 */
      equalBox(box,expected(truth.m,truth.r),'G3',(k?'shadow':'reflection')+' native destination trial '+i);
      for(const x of [truth.r[0],truth.r[0]+truth.r[2]])for(const y of [truth.r[1],truth.r[1]+truth.r[3]]){const p=point(truth.m,x,y);check(p[0]>=box[0]&&p[0]<=box[2]&&p[1]>=box[1]&&p[1]<=box[3],'G3','native destination corner contained');corners++;}
    }
  }
  return {trials,calls:2,nativeCorners:corners,actualArguments:call.found.map(m=>m[1]),actualShadowHeight:call.height};
}
function valve(src){
  const cases=[['',true],['?noT717=1',false],['?noT717=0',true],['?noT717',false],['?a=2&noT717=1&b=3',false],['?xnoT717=1',true]];
  for(const [search,on]of cases){const C={window:{},location:{search}};vm.createContext(C);vm.runInContext(fn(src,'t717On'),C);check(C.t717On()===on,'G4',search+' query');C.window.__noT717=true;check(C.t717On()===false,'G4','live window flag disables');C.window.__noT717=false;check(C.t717On()===on,'G4','live window flag restores query behavior');}
  return {queryCases:cases.length,windowFlagToggle:true};
}
function structure(src){
  const sites=calls(src).found;
  for(const [i,block]of NATIVE_BLOCKS.entries()){
    check(src.split(block).length===2,'G1','T603 native block '+i+' byte-identical exactly once');
    const start=src.indexOf(block),before=src.slice(0,start),after=src.slice(start+block.length);
    check(before.endsWith(sites[i][0]+'\n'),'G1','wrapper immediately before block '+i);
    check(/^\n[ \t]*if\(c717\)ctx\.restore\(\);/.test(after),'G1','wrapper restore immediately after block '+i);
  }
  const script=src.slice(src.indexOf('<script>')+8,src.lastIndexOf('</script>')),clean=stripComments(script);
  check((clean.match(/brightness\(0\)/g)||[]).length===2,'G1','exactly two brightness(0) after comment removal');
  return {nativeBlocks:2,byteIdentical:true,adjacentWrappers:true,filterSites:2};
}
function run(src,trials=2000){const result={};result.G2=geometry(src,trials);result.G3=callGeometry(src,trials);result.G4=valve(src);result.G1=structure(src);return result;}
function report(src){
  const result=run(src),negativeControls=[];
  const mutations=[
    ['reflection-compression-omitted',t=>t.replace('rs.w*z,-.35*rs.h*z);}','rs.w*z,rs.h*z);}'),'G3'],
    ['shadow-height-uncompressed',t=>t.replace('sh717=Math.max(2,s.h*z*.32);','sh717=s.h*z;'),'G3'],
    ['transform-ignored',t=>t.replace('const m=g.getTransform(),xs=[],ys=[];','const m={a:1,b:0,c:0,d:1,e:0,f:0},xs=[],ys=[];'),'G2'],
    ['first-corner-is-minimum',t=>t.replace('Math.min(...xs)','xs[0]').replace('Math.min(...ys)','ys[0]'),'G2'],
    ['padding-removed',t=>t.replace('Math.floor(Math.min(...xs))-2','Math.floor(Math.min(...xs))').replace('Math.floor(Math.min(...ys))-2','Math.floor(Math.min(...ys))').replace('Math.ceil(Math.max(...xs))+2','Math.ceil(Math.max(...xs))').replace('Math.ceil(Math.max(...ys))+2','Math.ceil(Math.max(...ys))'),'G2']
  ];
  for(const [id,mutate,first]of mutations){const broken=mutate(src);assert.notEqual(broken,src,id+' mutation applied');let reason='';try{run(broken);}catch(e){reason=e.message;}check(reason.startsWith(first+' '),'NEGATIVE',id+' must first fail '+first+', got '+reason);negativeControls.push({mutation:id,firstRed:first,reason:reason.slice(0,240)});}
  return {passed:true,limit:'Pure-function/source checks only. Real Chromium full-frame pixels and performance are separate evidence.',result,negativeControls};
}
if(require.main===module){try{console.log(JSON.stringify(report(HEAD),null,2));}catch(e){console.error(e.stack);process.exitCode=1;}}
module.exports={run,report};
