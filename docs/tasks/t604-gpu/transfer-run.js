'use strict';
const fs=require('fs'),path=require('path'),{createRequire}=require('module'),{transferBridge604}=require('./transfer.js');
let source=require('./run.js').source;
const marker='}\n// Inverse only approved art changes,';if(source.split(marker).length!==2)throw Error('Transfer bridge anchor drift');source=source.replace(marker,'('+transferBridge604.toString()+')(ctx,cvs);\n'+marker);
source=source.replace("path.join(OUT,'gpu604-summary.json')","path.join(OUT,'gpu604-transfer-summary.json')");
const start=source.indexOf("    report.experiment='T604 ordered WebGL2 image-command component prototype';"),end=source.indexOf('    report.finalFlags=await ev(',start);if(start<0||end<start)throw Error('Transfer run boundary drift');
source=source.slice(0,start)+String.raw`
    report.experiment='T604 conservative vector-batch transfer cost before full integration';report.releaseGatePassed=false;report.scope='Original renderer observed unchanged; then synthetic Canvas-to-WebGL patch update cost. No GPU-to-Canvas readback. Not a full-frame benefit measurement.';
    report.predeclared={orders:[false,true,true,false],windowMs:2000,poolLimitBytes:128*1024*1024,boundsPad:2,fullFrame55BudgetMs:1000/55};report.phases={};
    await ev('document.getElementById("bNewGame").click();__s603.grow22()');const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8')).cities.find(f=>f.seed===22),roots=await ev('__s603.roots()');check(!roots.bad&&roots.rows.length===956&&hash(JSON.stringify(roots.rows))===fixture.rootSHA256,'exact seed22 roots');
    const median=a=>{a=[...a].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
    for(const[phase,time]of[['day',55],['night',100]]){
      await ev('__gpu604.reset();true');await camera(22,14,1,0,1,time,false);await sleep(500);await compositorBegin603();
      try{
        const p=report.phases[phase]={audit:await ev('__transfer604.capture()'),transport:{}};persist();const a=p.audit;
        check(a.vectorCalls===Object.values(a.capture.excludedVectorCalls).reduce((n,v)=>n+v,0),'all original vector drawing calls accounted for '+phase);check(a.capture.reflections===46&&a.capture.shadows===(phase==='night'?230:0),'original filter workload intact '+phase);check(a.summary.blendCounts.clear===undefined,'no destination clearing operation assumed independent');
        for(const size of ['minimum','conservative']){
          if(size==='conservative'&&a.summary.totalPixels*4>report.predeclared.poolLimitBytes){p.transport[size]={blocked:true,reason:'128 MiB vector patch pool exceeded; no allocation or transfer benchmark attempted'};persist();continue;}
          const t=p.transport[size]={setup:await ev('__transfer604.prepare('+JSON.stringify(size)+')'),windows:[]};persist();
          await ev('__transfer604.measure(true,1000)');
          for(const update of report.predeclared.orders){const foreground=await foregroundState603(true);check(foreground.valid,'foreground transport '+phase+'/'+size+'/'+update);const w=await ev('__transfer604.measure('+update+',2000)');w.fps=w.intervals.length/(w.elapsed/1000);w.uploadMedian=median(w.rows.map(r=>r.uploadMs));w.uploadP95=pct(w.rows.map(r=>r.uploadMs),.95);w.drawMedian=median(w.rows.map(r=>r.drawMs));w.totalMedian=median(w.rows.map(r=>r.totalMs));w.totalP95=pct(w.rows.map(r=>r.totalMs),.95);t.windows.push(w);persist();check((await foregroundState603()).valid,'foreground retained transport '+phase+'/'+size+'/'+update);}
          const updates=t.windows.filter(w=>w.update);t.summary={uploadMedian:median(updates.map(w=>w.uploadMedian)),uploadP95Median:median(updates.map(w=>w.uploadP95)),totalMedian:median(updates.map(w=>w.totalMedian)),totalP95Median:median(updates.map(w=>w.totalP95)),fps:updates.map(w=>w.fps),staticFPS:t.windows.filter(w=>!w.update).map(w=>w.fps)};persist();
        }
      }finally{await ev('__transfer604.dispose();__gpu604.reset();true');await compositorEnd603();}
    }
    report.completeTransferEvidence=true;persist();
`+source.slice(end);
new Function('require','__filename','__dirname',source);
if(require.main===module){if(process.argv.includes('--check-overlay'))console.log('T604_TRANSFER_OVERLAY_SYNTAX_OK');else{const dir=path.resolve(__dirname,'../t603-shots');new Function('require','__filename','__dirname',source)(createRequire(path.join(dir,'scene603.js')),path.join(dir,'scene603.js'),dir);}}
module.exports={source};
