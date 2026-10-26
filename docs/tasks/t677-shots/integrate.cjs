'use strict';
/* T677：只把已分類產品片段接入原生單檔，不套用候選儲存／PWA／計時器包裝。 */
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const HERE=__dirname,ROOT=path.resolve(HERE,'../../..'),meta=JSON.parse(fs.readFileSync(path.join(HERE,'sources.json'),'utf8')),read=p=>fs.readFileSync(path.join(HERE,p),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),changes=[];
let h=cp.execFileSync('git',['show',meta.mainBaseline+':index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
function one(a,b){if(h.split(a).length!==2)throw Error('T677 integration anchor '+a);changes.push({anchor:a,beforeSHA256:hash(a),afterSHA256:hash(b)});h=h.replace(a,b);}
one('function advance(dtReal){','function advance(dtReal){const accepted677=simAcc;');
one('  if(steps>=8)simAcc=0; // 落後太多就放棄追趕','  if(steps>=8)simAcc=0; // 落後太多就放棄追趕\n  if(window.P06)P06.advance(Math.max(0,(steps*DAYLEN+simAcc-accepted677)*1000));');
one('  objs.sort((a,b2)=>a.dep-b2.dep);',`  if(window.P06?.active()){
    P06.project=(x,y,h=0)=>{const p=P06.map(x,y);return[sxOf(p[0]-.5,p[1]-.5)+32*z,syOf(p[0]-.5,p[1]-.5)+16*z-h*z,h];};
    for(const p of P01B.parts)if(p.type!=='reserve')objs.push({dep:['slab'].includes(p.type)?-100000:P06.dep(p.x+20,p.y+20)+.001,p01b:p});
    P04.begin();for(const p of P02.objects())objs.push({dep:p.dep,p02:p});
    for(const p of P03.objects())objs.push({dep:p.dep,p03:p});
    for(const p of P04.objects())objs.push({dep:P06.dep(p.x+20,p.y+20)+.008,p04:p});
    for(const p of P05.objects())objs.push({dep:p.dep,p05:p});
  }
  objs.sort((a,b2)=>a.dep-b2.dep);`);
one('  for(const o of objs){\n    if(o.sta){',`  for(const o of objs){
    if(window.P06?.active()){
      const PP=P06.project,PL=(x,y,h=0)=>PP(x+20,y+20,h).slice(0,2);
      if(o.p05){ctx.save();P05.paint(ctx,o.p05,PP,z);ctx.restore();continue;}
      if(o.p04){ctx.save();P04.paint(ctx,o.p04,PP,z,b);ctx.restore();continue;}
      if(o.p03){ctx.save();P03.paint(ctx,o.p03,PP,z);ctx.restore();continue;}
      if(o.p02){ctx.save();if(o.p02.upper)P02.paintAssembly.call(P01B,ctx,o.p02.crane,PL,z,b,true);else P02.paint(ctx,o.p02,PL,z,b);ctx.restore();continue;}
      if(o.p01b){ctx.save();P01B.paint(ctx,o.p01b,PL,z,b);ctx.restore();continue;}
      if(o.t?.bld?.k===18&&o.x===P06.layout.port.x&&o.y===P06.layout.port.y)continue;
    }
    if(o.sta){`);
one('    objs.push({dep:viewDep(fx,fy)+.01,ship:sh,wx,wy,sd:sh.d});','    if(!window.P06?.legacyReserved(fx,fy))objs.push({dep:viewDep(fx,fy)+.01,ship:sh,wx,wy,sd:sh.d});');
one('    objs.push({dep:viewDep(fx,fy)+.012,lifeShip:sh,wx,wy,sd:sh.d});','    if(!window.P06?.legacyReserved(fx,fy))objs.push({dep:viewDep(fx,fy)+.012,lifeShip:sh,wx,wy,sd:sh.d});');
one('    if(o.t){const sz=b?',`    if(o.p01b&&!['slab','reserve'].includes(o.p01b.type)){const a=o.p01b,w=a.w||.1,d=a.d||.1,pts=[[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]].map(v=>{const q=P06.map(a.x+20+v[0],a.y+20+v[1]);return w2v(q[0]-.5,q[1]-.5).map(v=>v+.5);});foot574=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];}else if(o.t){const sz=b?`);
/* artAtlas現有emit合約，舊家族位元組保持。 */
one("    const ids=s=>[...s].sort((a,b)=>a-b);\n    try{", "    const ids=s=>[...s].sort((a,b)=>a-b);\n    try{\n      art677(emit);");
one('<div id="start">',read('product-ui.html')+'\n<div id="start">');
one('})();\n</script>\n</body>',read('product-runtime.js')+'\n'+read('product-atlas.js')+'\n'+read('product-ui.js')+'\n})();\n</script>\n</body>');
const scripts=[...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];if(scripts.length!==1)throw Error('Native single script contract');new Function(scripts[0][1]);fs.writeFileSync(path.join(ROOT,'index.html'),h);fs.writeFileSync(path.join(HERE,'integration-manifest.json'),JSON.stringify({mainBaseline:meta.mainBaseline,source:meta.sourceCommit,preBumpIndexSHA256:hash(h),singleScript:true,originalStorageAndPWA:true,changes},null,2)+'\n');console.log(JSON.stringify({bytes:Buffer.byteLength(h),anchors:changes.length,sha256:hash(h)}));
