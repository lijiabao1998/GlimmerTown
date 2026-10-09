'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),metrics=require('./retained616-performance-metrics.cjs');
const out=path.resolve(process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'evidence/net616');fs.mkdirSync(out,{recursive:true});
const start=Date.now(),deadline=start+50*60*1000,report={source:'Exact live T602 original / approved T603 plus retained614 / exact live T602 original',productBaseline:'329f660e3d5f011ac28454cb6d6a68f8525c69cc',baselineGitBlob:'3c065a4952706a51147c3f64080ba2489977fb16',views:[],accepted:false,performanceRun:true,releaseGatePassed:false,fullRegressionRequired:true};
const persist=()=>fs.writeFileSync(path.join(out,'net616-summary.json'),JSON.stringify(report,null,2));
try{for(const zoom of [1,.7]){
 const view={zoom,children:[]};report.views.push(view);
 for(const [i,arm]of ['observer-free','native-t603','candidate-only','native-t603','observer-free'].entries()){
  const remaining=deadline-Date.now();if(remaining<300000)throw Error('Absolute net measurement bound lacks one complete child reserve');
  const dir=path.join(out,'z'+zoom+'-'+i+'-'+arm),childStart=Date.now();fs.mkdirSync(dir,{recursive:true});
  const run=spawnSync(process.execPath,[path.join(__dirname,'run616-performance.cjs'),'--port=8786','--out='+dir],{env:{...process.env,T616_PERF_ARM:arm,T616_PERF_ZOOM:String(zoom)},encoding:'utf8',timeout:Math.min(300000,remaining),maxBuffer:32*1024*1024});
  fs.writeFileSync(path.join(dir,'child.log'),String(run.stdout||'')+String(run.stderr||''));
  const file=path.join(dir,'retained616-performance-summary.json'),summary=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,p=summary?.retained616Performance;
  const row={index:i,arm,exit:run.status,signal:run.signal,error:run.error?String(run.error):null,totalChildElapsedMs:Date.now()-childStart,accepted:!!p?.accepted,decision:p?.decision,measurement:p||null};view.children.push(row);persist();
  console.log('T616_NET_CHILD '+JSON.stringify({zoom,index:i,arm,exit:row.exit,accepted:row.accepted,decision:row.decision,elapsed:row.totalChildElapsedMs}));
  if(run.status!==0||!p?.accepted){report.decision='Measurement limit or invariant failure in a bounded fresh-page arm; net result unavailable. No unchanged rerun or product regression inference.';throw Error(report.decision);}
 }
 view.result=metrics.screenNet(view.children[0].measurement.rows,view.children[2].measurement.rows,view.children[4].measurement.rows);view.nativeT603Comparison=metrics.screenNet(view.children[1].measurement.rows,view.children[2].measurement.rows,view.children[3].measurement.rows);persist();console.log('T616_NET_VIEW '+JSON.stringify({zoom,...view.result}));
 if(!view.result.accepted||!view.nativeT603Comparison.accepted){report.decision='Measurement qualification or baseline drift failed; no net performance inference.';break;}
 if(!view.result.nonRegression||!view.nativeT603Comparison.nonRegression){report.decision='Qualified actual full-frame comparison fails declared nonregression against live main; do not adopt retention.';break;}
}
 report.accepted=report.views.length===2&&report.views.every(v=>v.result?.accepted&&v.result.nonRegression&&v.nativeT603Comparison?.accepted&&v.nativeT603Comparison.nonRegression);
 report.absolute55=report.accepted&&report.views.every(v=>v.result.absolute55);
 report.decision||=report.accepted?'Net live-main nonregression passed for both views; inspect measured FPS and all separate quality/regression/lifecycle gates before integration.':'Net performance not accepted.';
}catch(error){report.error=String(error);report.accepted=false;}finally{report.elapsedMs=Date.now()-start;persist();console.log('T616_NET '+JSON.stringify({accepted:report.accepted,absolute55:report.absolute55,decision:report.decision,error:report.error,elapsedMs:report.elapsedMs}));}
