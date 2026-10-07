'use strict';
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
let source=require('./run.js').source;
source=source.replace("path.join(OUT,'gpu604-summary.json')","path.join(OUT,'gpu604-pixel-audit.json')");
const begin=source.indexOf("    report.experiment='T604 ordered WebGL2 image-command component prototype';"),end=source.indexOf('    report.finalFlags=await ev(',begin);if(begin<0||end<begin)throw Error('Pixel audit boundaries drift');
const body=String.raw`
    report.experiment='T604 point attribution of retained first-prototype pixel differences';report.releaseGatePassed=false;report.performanceSamples=0;
    report.originalEvidence={head:'1900bfb25010570745d8a034a9aa60b5e823a75d',run:37690010184};report.cases={};
    await ev('document.getElementById("bNewGame").click();__s603.grow22()');
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22),roots=await ev('__s603.roots()');check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'exact seed22 source roots');
    for(const[phase,time]of[['day',55],['night',100]]){
      await ev('__gpu604.reset();true');await camera(22,14,1,0,1,time,false);await sleep(500);await compositorBegin603();
      try{
        const c=report.cases[phase]={capture:await ev('__gpu604.capture()'),setup:await ev('__gpu604.prepare("all-images")')};persist();
        for(const mode of ['native','gpu']){
          await ev('new Promise(r=>requestAnimationFrame(()=>{__gpu604.render('+JSON.stringify(mode)+',0);r(true)}))');
          const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),bytes=Buffer.from(s.data,'base64'),file='T604-audit-'+phase+'-'+mode+'.png';fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);c[mode]={file,pixels:pngRgba603(bytes)};
        }
        const a=c.native.pixels.rgba,b=c.gpu.pixels.rgba,points=[];let changed=0,one=0;for(let i=0;i<a.length;i+=4){const d=Math.max(...[0,1,2,3].map(k=>Math.abs(a[i+k]-b[i+k])));if(d){changed++;if(d===1)one++;}if(d>5)points.push({x:i/4%1400,y:Math.floor(i/4/1400),delta:d});}
        points.sort((a,b)=>b.delta-a.delta);const selected=[];for(const p of points){if(selected.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>12))selected.push(p);if(selected.length===12)break;}
        c.delta={changedPixels:changed,oneLevel:one,over5:points.length,max:points[0]?.delta||0};delete c.native.pixels;delete c.gpu.pixels;persist();
        const audit=await ev('__gpu604.auditPoints('+JSON.stringify(selected.map(p=>[p.x,p.y]))+')');const assets=audit.assets;delete audit.assets;
        for(const[id,uri]of Object.entries(assets)){const file='T604-audit-'+phase+'-source-'+id+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(uri.split(',')[1],'base64'));}
        const file='T604-audit-'+phase+'-points.json';fs.writeFileSync(path.join(OUT,file),JSON.stringify(audit,null,2));c.attribution={file,selectedPoints:selected,sourceFiles:Object.keys(assets).length,glError:audit.glError};persist();
        check(audit.glError===0,'no WebGL API error '+phase);check(audit.points.every(p=>JSON.stringify(p.full)===JSON.stringify(p.selectedFinal)),'bounding candidates reproduce exact full-stream sampled pixels '+phase);
      }finally{await ev('__gpu604.reset()');await compositorEnd603();}
    }
    report.completePixelAttribution=true;persist();
`;
source=source.slice(0,begin)+body+source.slice(end);new Function('require','__filename','__dirname',source);
if(require.main===module){if(process.argv.includes('--check-overlay'))console.log('T604_PIXEL_AUDIT_SYNTAX_OK');else{const dir=path.resolve(__dirname,'../t603-shots');new Function('require','__filename','__dirname',source)(createRequire(path.join(dir,'scene603.js')),path.join(dir,'scene603.js'),dir);}}
module.exports={source};
