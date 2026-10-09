'use strict';
const fs=require('node:fs'),path=require('node:path');
const {launch}=require('./active617-net.cjs'),metrics=require('./active617-metrics.cjs');
function continuation(result, summary, elapsedMs, expected) {
  const m=summary?.active617,o=m?.observation;
  const observation=require('./active617-diagnostic-observation.cjs').inspect(o);
  const checks={
    observationIntegrity:observation.safe,
    requestedIdentity:!!expected&&m?.arm===expected.arm&&m?.zoom===expected.zoom,
    measurementErrors:!m?.error&&!m?.partialEvidenceError,
    finalSelectedMode:!!expected&&m?.endpoint?.status?.art===(expected.arm==='native-t603')&&m.endpoint.status.version===(expected.arm==='native-t603'?'11.212':'11.211')&&m?.finalFlags?.T603===(expected.arm==='native-t603')&&m.finalFlags.T596===false&&m.finalFlags.T600===false,
    childProcess:[0,2].includes(result.code)&&!result.timedOut&&!result.signal&&!result.spawnError&&elapsedMs<=240000,
    source:m?.sourceVerified===true&&m?.initialFixtureVerified===true,
    setup:Number.isFinite(m?.setupElapsedMs)&&m.setupElapsedMs<=60000,
    foreground:m?.foregroundValid===true&&m.foregroundBefore?.valid===true&&m.foregroundAfter?.valid===true,
    complete:o?.complete===true&&o.warmMs===30000&&o.requestedMs===110000&&o.warmElapsed>=30000&&o.elapsed>=110000,
    samples:Array.isArray(o?.warm)&&Array.isArray(o?.samples)&&o.warm.length>=150&&o.samples.length>0&&o.warm.length+o.samples.length<=30000,
    knownViolations:Array.isArray(o?.violations)&&o.violations.every(x=>x==='400ms fallback-timer risk'),
    endpoint:m?.endpoint?.passed===true&&m.endpoint.renderGuard?.modelExact===true&&m.endpoint.renderGuard?.actorsExact===true&&m.endpoint.renderGuard?.rngCalls===0&&m.endpoint.renderGuard?.rngRestored===true&&m.endpoint.canonicalExact===true&&m.endpoint.roundtripExact===true&&Number.isFinite(m.endpointElapsedMs)&&m.endpointElapsedMs<=20000,
    errors:Array.isArray(summary?.exceptions)&&summary.exceptions.length===0&&Array.isArray(summary?.consoleErrors)&&summary.consoleErrors.length===0&&Array.isArray(m?.appErrors)&&m.appErrors.length===0,
    restoration:summary?.displayRestore603?.ok===true&&summary.displayRestore603.exitCode===0&&!summary.displayRestoreError603,
    expectedVerdict:summary?.status==='passed'||(summary?.status==='failed'&&summary.error?.startsWith('Error: Invalid or incomplete active measurement; no nonregression inference.'))
  };
  return {safe:Object.values(checks).every(Boolean),checks,observationIntegrity:observation,originalAccepted:m?.accepted===true,originalViolations:o?.violations||null,originalStrictValid:o?metrics.valid(o):false};
}
const environmentValid=c=>!!(c.environment?.browserVersion?.product&&c.environment.browserVersion.jsVersion&&Array.isArray(c.environment.gpuInfo?.devices)&&c.environment.gpuInfo.devices.length&&Object.keys(c.environment.gpuInfo.featureStatus||{}).length&&c.environment.foreground?.platform==='darwin'&&c.environment.foreground.arch&&/^[a-f0-9]{64}$/.test(c.environment.harness?.generatedSHA256||''));
const environmentKey=c=>JSON.stringify([c.environment.browserVersion?.product,c.environment.browserVersion?.jsVersion,c.environment.gpuInfo?.devices,c.environment.gpuInfo?.featureStatus,c.environment.foreground?.platform,c.environment.foreground?.arch,c.environment.harness?.generatedSHA256]);
function rawRatios(children){
  const rows=children.map(c=>c.measurement.summary?.distributions),out={qualification:'Unqualified descriptive ratios; strict acceptance and workload gates remain separate',groups:{}};
  for(const group of ['all','day','night']){out.groups[group]={};for(const control of [0,2]){const a=rows[control]?.[group],b=rows[1]?.[group];out.groups[group]['native_over_main_'+control]=a&&b?Object.fromEntries(['fps','mean','median','p95','p99'].map(k=>[k,a[k]>0?b[k]/a[k]:null])):null;}}
  return out;
}
async function main(){
  const out=path.resolve(process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'evidence/diagnostic617');fs.mkdirSync(out,{recursive:true});
  const started=Date.now(),deadline=started+1800000;
  const report={protocol:'T617 diagnostic-only complete collection',completed:false,accepted:false,releaseGatePassed:false,absolute55:false,overallBoundMs:1800000,childBoundMs:240000,attemptsPerChild:1,views:[],purpose:'Record whether the same failure occurs in original T602 and T603, with no causal or acceptance inference'};
  const persist=()=>fs.writeFileSync(path.join(out,'active617-diagnostic-summary.json'),JSON.stringify(report,null,2));persist();
  let firstEnvironment=null;
  try{
    const display=require('./active617-display.cjs');report.displayPreparation=await display.prepare(path.join(out,'prepared-display'),display.sourceFromHarness(require('./active617-build.cjs').build().source));persist();
    for(const zoom of [1,.7]){
      const view={zoom,children:[]};report.views.push(view);
      for(const [index,arm] of ['main-t602','native-t603','main-t602'].entries()){
        if(deadline-Date.now()<242000)throw Error('Overall bound lacks complete child and termination reserve');
        const dir=path.join(out,'z'+zoom+'-'+index+'-'+arm);if(fs.existsSync(dir))throw Error('Refusing to overwrite existing child');fs.mkdirSync(dir);
        const start=Date.now(),result=await launch([path.join(__dirname,'active617-run.cjs'),'--supervised-child','--port=8787','--out='+dir],{...process.env,T617_ARM:arm,T617_ZOOM:String(zoom),T617_DISPLAY_MANIFEST:report.displayPreparation.manifest},path.join(dir,'child.log'),240000);
        const file=path.join(dir,'active617-summary.json'),summary=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,elapsedMs=Date.now()-start;
        const child={index,arm,zoom,...result,elapsedMs,continuation:continuation(result,summary,elapsedMs,{arm,zoom}),measurement:summary?.active617||null,environment:summary?{browserVersion:summary.browserVersion,gpuInfo:summary.gpuInfo,foreground:summary.foregroundEnvironment,harness:summary.active617Harness,document:summary.active617Document}:null};view.children.push(child);persist();
        console.log('T617_DIAGNOSTIC_CHILD '+JSON.stringify({zoom,index,arm,elapsedMs,continuation:child.continuation}));
        if(!child.continuation.safe)throw Error('Diagnostic collection stopped on integrity, resource, restoration or unexpected observation failure');
        if(!environmentValid(child))throw Error('Diagnostic environment/harness identity missing');
        const key=environmentKey(child);if(firstEnvironment===null)firstEnvironment=key;
        if(key!==firstEnvironment)throw Error('Diagnostic environment/harness identity changed across six children');
      }
      view.strictScreen=metrics.screen(...view.children.map(c=>c.measurement));view.rawUnqualifiedRatios=rawRatios(view.children);persist();
    }
    report.completed=true;report.originalStrictAcceptance=report.views.every(v=>v.strictScreen.accepted&&v.strictScreen.nonRegression);
    report.verdict='Diagnostic collection complete; independent evidence assessment required; no release acceptance granted';
  }catch(error){report.error=String(error);report.verdict='Incomplete diagnostic collection; no comparative conclusion';}
  finally{report.elapsedMs=Date.now()-started;persist();console.log('T617_DIAGNOSTIC '+JSON.stringify({completed:report.completed,accepted:false,verdict:report.verdict,error:report.error}));}
  process.exitCode=report.completed?0:2;return report;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=2;});
module.exports={main,continuation,rawRatios,environmentValid,environmentKey};
