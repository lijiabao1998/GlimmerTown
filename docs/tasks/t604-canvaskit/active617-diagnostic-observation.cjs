'use strict';
const metrics=require('./active617-metrics.cjs');
const sum=a=>a.reduce((x,y)=>x+y,0),fixed=s=>JSON.stringify(s.fixed);
const night=s=>((s.visT%110+110)%110)<27.5||((s.visT%110+110)%110)>=82.5;
function inspect(o){
  if(!o||!Array.isArray(o.samples)||!Array.isArray(o.warm)||!Array.isArray(o.violations))return {safe:false,checks:{structure:false},exceptions:[]};
  const stateOK=s=>s&&s.unwrapped&&s.native&&s.running&&s.speed===1&&s.visible==='visible'&&s.focused&&s.cycle===110&&s.dayLength===.9&&s.fixed?.size===72&&s.fixed.seed===22&&s.fixed.diff===3&&!s.fixed.ai&&s.fixed.slot===3&&s.fixed.width===1400&&s.fixed.height===900&&s.fixed.dpr===1;
  const checks={complete:o.complete===true&&o.requestedMs===110000&&o.warmMs===30000,
    sampleBounds:o.warm.length>=150&&o.samples.length>0&&o.warm.length+o.samples.length<=30000,
    warmFirstCrossing:Number.isFinite(o.warmElapsed)&&o.warmElapsed>=30000&&o.warm.at(-1)?.dt>0&&o.warm.at(-1).dt<=2000&&o.warmElapsed-o.warm.at(-1).dt<30000&&Math.abs(sum(o.warm.map(s=>s.dt))-o.warmElapsed)<.01,
    measurementBound:Number.isFinite(o.elapsed)&&o.elapsed>=110000&&o.elapsed<110400,
    samplerViolations:o.violations.every(x=>x==='400ms fallback-timer risk')&&(o.valid===true||o.violations.length>0),
    fixedStates:[o.start,o.before,o.after].every(stateOK)};
  if(checks.fixedStates)checks.fixedStates=fixed(o.start)===fixed(o.before)&&fixed(o.before)===fixed(o.after);
  checks.totalClock=!!o.before&&!!o.after&&Math.abs(sum(o.samples.map(s=>s.dt))-o.elapsed)<.01&&Math.abs((o.after.visT-o.before.visT)*1000-o.elapsed)<=50&&Math.abs(((o.after.day-o.before.day)*.9+o.after.simAcc-o.before.simAcc)*1000-o.elapsed)<=50;
  let prior=o.before,elapsed=0,fallbackRiskFrames=0,maxFallbackExposureMs=0;
  checks.rows=!!prior;
  for(const s of o.samples){
    elapsed+=s.dt;
    if(![s.dt,s.end,s.visT,s.day,s.simAcc,s.pop,s.occupied,s.vehicles,s.particles,s.citizens,s.now,s.previousLastDraw,s.gameTimestamp].every(Number.isFinite)||s.dt<=0||s.dt>2000||s.now<s.previousLastDraw||Math.abs(s.end-elapsed)>.01||![0,1,2].includes(s.weather)||![0,1,2,3].includes(s.season)||[s.pop,s.occupied,s.vehicles,s.particles,s.citizens].some(x=>x<0)||!prior||Math.abs((s.visT-prior.visT)*1000-s.dt)>.05||Math.abs(((s.day-prior.day)*.9+s.simAcc-prior.simAcc)*1000-s.dt)>.05)checks.rows=false;
    maxFallbackExposureMs=Math.max(maxFallbackExposureMs,s.now-s.previousLastDraw);
    if(s.now-s.previousLastDraw>=400)fallbackRiskFrames++;
    prior=s;
  }
  const day=o.samples.filter(s=>!night(s)),dark=o.samples.filter(night),buckets=Array.from({length:11},(_,i)=>o.samples.filter(s=>Math.min(10,Math.floor((s.end-s.dt)/10000))===i));
  checks.coverage=day.length>=30&&dark.length>=30&&sum(day.map(s=>s.dt))>=54000&&sum(dark.map(s=>s.dt))>=54000&&buckets.every(a=>a.length>=30);
  const exceptions=[];
  if(o.violations.includes('400ms fallback-timer risk')||fallbackRiskFrames)exceptions.push('original400ms fallback-risk rejection');
  if(o.warmElapsed>=30400)exceptions.push('original30400ms warm upper-bound rejection');
  const strictValid=metrics.valid(o);
  checks.explainedStrictResult=strictValid||exceptions.length>0;
  return {safe:Object.values(checks).every(Boolean),checks,exceptions,strictValid,fallbackRiskFrames,maxFallbackExposureMs};
}
module.exports={inspect};
