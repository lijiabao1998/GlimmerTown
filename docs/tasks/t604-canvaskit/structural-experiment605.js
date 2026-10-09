    report.structuralScope605={diagnosticOnly:true,cacheImplemented:false,sourceCandidate:'e27bccb1eef9bf3cec3c21d336791bbb9e6c5304',sampledPhases:['nightLayer','objectOrder','farSelection','nightGround','nightTop'],phaseCostsExclusive:true,rootScanCostNotIsolated:true,wholeGamePerformanceSamples:0,original55Passed:false,animatedObservation:'Original advance(.05) between isolated draws; fixed 50 ms input increments, not live wall-clock FPS or natural hit-rate measurement.',sourceValidation:'Exact source pixel readback only after product upload, in separate untimed observation after timing windows. Source readback can change backing; observation pixels are not performance evidence.'};
    const median605=xs=>{xs=[...xs].sort((a,b)=>a-b);const n=xs.length;return n%2?xs[(n-1)/2]:(xs[n/2-1]+xs[n/2])/2;};
    report.structural605=[];
    for(const backend of ['gpu','native']){
      await navigate604(backend,true);await compositorBegin603();
      // grow604 has already selected the seed-22 focus. Preserve that actual view.
      await ev('__audit605.reset();true');
      const result={backend,windows:[],observations:[]};report.structural605.push(result);persist();
      await ev('__audit605.mode("off");__audit605.sample(false);true');
      const plain605=await capture604('605-'+backend+'-plain');
      await ev('__audit605.mode("timing");__audit605.sample(false);true');
      const observed605=await capture604('605-'+backend+'-instrumented');
      result.wrapperPixelProof={plain:record604(plain605),instrumented:record604(observed605),delta:delta604(plain605.pixels,observed605.pixels)};
      check(result.wrapperPixelProof.delta.pixels===0,'structural timing wrappers preserve exact same-backend full compositor '+backend);
      for(const mode of ['timing','off','off','timing']){
        await ev('__audit605.mode('+JSON.stringify(mode)+');true');const samples=[];
        for(let i=0;i<7;i++){const row=await ev('__audit605.sample(false)');check(row.rngCalls===0&&row.sceneSame&&row.actorSame,'structural wrappers leave draw model, actors and RNG unchanged '+backend+'/'+mode+'/'+i);if(i>=2)samples.push(row);}
        result.windows.push({mode,samples});persist();
      }
      const rows=mode=>result.windows.filter(w=>w.mode===mode).flatMap(w=>w.samples),control=rows('off'),instrumented=rows('timing');
      result.timing={controlFullMedianMs:median605(control.map(r=>r.fullDrawMs)),instrumentedFullMedianMs:median605(instrumented.map(r=>r.fullDrawMs)),phaseMediansMs:Object.fromEntries(report.structuralScope605.sampledPhases.map(k=>[k,median605(instrumented.map(r=>r.phases[k]||0))])),measuredPhaseSumMedianMs:median605(instrumented.map(r=>r.exclusiveMeasuredPhasesMs))};
      result.timing.instrumentationRatio=result.timing.instrumentedFullMedianMs/result.timing.controlFullMedianMs;
      result.timing.overheadWithin5Percent=result.timing.instrumentationRatio<=1.05;
      if(backend==='gpu'){result.timing.controlProducerMedianMs=median605(control.map(r=>r.renderer.producerMs));result.timing.instrumentedProducerMedianMs=median605(instrumented.map(r=>r.renderer.producerMs));}
      await ev('__audit605.mode("observe");true');
      for(let i=0;i<12;i++){const row=await ev('__audit605.sample(true)'),reuse=await ev('__audit605.inspect()');check(row.rngCalls===0&&row.sceneSame&&row.actorSame,'advancing-input draw preserves model and actor data '+backend+'/'+i);result.observations.push({input:row.input,reuse});}
      result.reuse={comparisons:11,exactHits:result.observations.slice(1).filter(r=>r.reuse.wholeListExactHit).length,prefixLengths:result.observations.slice(1).map(r=>r.reuse.unchangedPrefix),scope:'Potential exact whole-night-layer reuse only; fixed-step progressing animation, no cache implemented.'};
      await ev('__audit605.restore()');await compositorEnd603();persist();
    }
    report.structuralDecision605={releaseGatePassed:false,wholeGamePerformanceSamples:0,cacheImplemented:false,decision:'Measurement-only: do not infer FPS or adopt a cache without complete source/order/invalidation tests. Inspect actual phase costs, instrumentation overhead and animated whole-list hit counts first.'};
    console.log('STRUCTURAL605 '+JSON.stringify({source:report.structuralScope605.sourceCandidate,results:report.structural605.map(r=>({backend:r.backend,timing:r.timing,reuse:r.reuse})),decision:report.structuralDecision605}));
