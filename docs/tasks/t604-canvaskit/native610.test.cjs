'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/native610-experiment.js','utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const section=source.slice(source.indexOf('    report.native610.extraWarmup=[];'),source.indexOf('    report.native610.qualified='));
async function schedule({late=false,stable=true,warmFrames=200,skipCycle=false,delayed=false}={}){
 let now=30000,statusCalls=0,windows=0;
 const state=(b,remaining)=>({visT:statusCalls<3?130:statusCalls<5?160:192.7,light:{b},nightRemaining:remaining});
 const report={native610:{windows:[],warmup:{after:state(.34,5)}}};
 const ev=async expr=>{if(expr.includes('observe606')){now+=5000;windows++;return {frames:60,after:state(.34,(late?40:55)-windows*5)};}
 statusCalls++;if(delayed)now+=150001;if(skipCycle)return {...state(.34,54.8),visT:302.7};return statusCalls<3?state(.34,5):statusCalls<5?state(.5,0):state(.34,late?40:54.8);};
 const f=new AsyncFunction('report','ev','sleep','persist','metrics610','Date','start610','deadline610','totalFrames610','let qualified610=false;'+section+';return qualified610;');
 const qualified=await f(report,ev,async ms=>{now+=ms;},()=>{}, {qualify:w=>stable&&w.length===3},{now:()=>now},0,300000,warmFrames);
 return {qualified,report,windows,statusCalls,now};
}
test('natural alignment waits out current night and reaches first next night',async()=>{const r=await schedule();assert.equal(r.qualified,true);assert.equal(r.windows,3);assert.equal(r.report.native610.alignment.firstNight.nightRemaining,54.8);assert.equal(r.report.native610.alignment.maxAttempts,1);});
test('late first boundary fails without waiting for another night',async()=>{const r=await schedule({late:true});assert.equal(r.qualified,false);assert.equal(r.windows,0);assert.equal(r.statusCalls,5);});
test('unstable windows stop at six within same night',async()=>{const r=await schedule({stable:false});assert.equal(r.qualified,false);assert.equal(r.windows,6);});
test('retains original stability and trace screen implementations and one tracing start',()=>{assert.match(source,/native606-metrics\.cjs/);assert.match(source,/native609-metrics\.cjs/);assert.equal(source.split("send('Tracing.start'").length-1,1);assert.match(source,/nightRemaining>=23/);assert.match(source,/browser\.kill\(\)/);assert.match(source,/deadlineExpired=true/);assert.equal(source.split('GV.setVisT(').length-1,1);new AsyncFunction(source);});

test('night reserve reaches zero at exact sunrise',()=>{const CYCLE=110;const remaining=phase=>phase<=CYCLE*.25?CYCLE*.25-phase:CYCLE*1.25-phase;assert.equal(remaining(27.5),0);assert.equal(remaining(82.5),55);assert.match(fs.readFileSync(__dirname+'/bridge610.js','utf8'),/phase<=CYCLE\*\.25/);});

test('delayed first poll cannot move earliest-night target or exceed wait bound',async()=>{for(const opts of [{skipCycle:true},{delayed:true}]){const r=await schedule(opts);assert.equal(r.qualified,false);assert.equal(r.windows,0);assert.equal(r.report.native610.alignment.targetVisT,192.5);assert.equal(r.report.native610.alignment.missedEarliestBoundary,true);}});
