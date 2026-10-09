'use strict';
function admission(elapsedMs, diagnosticEnabled){
  const original={name:'T617 setup fits fixed 60-second bound',boundMs:60000,elapsedMs,passed:Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<=60000};
  const diagnostic=diagnosticEnabled===true;
  return {original,diagnosticEnabled:diagnostic,wholeChildBoundMs:240000,minimumObservationMs:140000,endpointReserveMs:20000,terminationReserveMs:2000,requiredKnownMs:162000,remainingChildMs:240000-elapsedMs,
    admitted:original.passed||(diagnostic&&Number.isFinite(elapsedMs)&&elapsedMs>=0&&240000-elapsedMs>162000),
    note:'Preparation admission only; failed original setup remains a rejection. Admission requires time for the minimum140s observation plus20s endpoint and2s termination allowance. Extra sampler overhead and cleanup margin are best effort, not guaranteed; preparation reduces them. The inherited restore helper can take60s, which does not fit the worst-case original budget either. All sampling and exact restoration must complete within the unchanged supervised240s whole-child deadline or collection fails.'};
}
module.exports={admission};
