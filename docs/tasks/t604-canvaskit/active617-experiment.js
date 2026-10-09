    report.candidate = 'T617 active native T603 versus exact live T602';
    report.releaseGatePassed = false;
    report.performanceNote = 'Original speed-1 gameplay in a foreground accelerated macOS cloud desktop; fixed seed/view scope only.';
    const metrics617 = require('../t604-canvaskit/active617-metrics.cjs');
    const p617 = report.active617 = { arm: process.env.T617_ARM, zoom: Number(process.env.T617_ZOOM),
      accepted: false, releaseGatePassed: false, sourceVerified: false, foregroundValid: false,
      initialFixtureVerified: false, attempt: 1, warmMs: 30000, measuredMs: 110000,
      source: report.active617Document, scope: 'Native original speed-1 gameplay, no retention or source observer. Whole natural day/night cycle; evolving model, weather, services and autosave.' };
    check(['main-t602', 'native-t603'].includes(p617.arm) && [1, .7].includes(p617.zoom), 'T617 fixed arm and view');
    report.flags = await ev('__s603.flags()');
    check(report.flags.T603 === (p617.arm === 'native-t603') && !report.flags.T596 && !report.flags.T600, 'T617 expected art and preview flags');
    const fixture617 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/manifest.json'), 'utf8')).cities.find(c => c.seed === 22);
    const raw617 = fs.readFileSync(path.join(__dirname, 'fixtures', fixture617.file), 'utf8');
    const setup617 = await ev('(()=>{document.getElementById("bNewGame").click();const city=__s603.grow22();const focus=__s603.census(85)[0];if(!focus)throw Error("Missing canonical civic focus");GV.setRot(0);GV.setZoom(' + p617.zoom + ');GV.lookAt(focus[0]+1,focus[1]+1);GV.save();return {city,roots:__s603.roots(),canonical:__s603.saved(),status:__active617.status()};})()');
    report.setupStages617.fixtureReadyMs=Date.now()-active617ChildStarted;
    p617.initial = setup617.status;
    p617.initialRootSHA256 = hash(JSON.stringify(setup617.roots.rows));
    p617.initialCanonicalSHA256 = hash(setup617.canonical);
    p617.initialFixtureVerified = !setup617.roots.bad && setup617.roots.rows.length === fixture617.roots &&
      p617.initialRootSHA256 === fixture617.rootSHA256 && setup617.canonical === await ev('__s603.sourceSaved(' + JSON.stringify(raw617) + ')') &&
      setup617.status.day === 421 && setup617.status.pop === 2397 && setup617.city.money === 3418;
    check(p617.initialFixtureVerified, 'T617 exact grown day421 seed22 fixture and canonical save');
    p617.sourceVerified = p617.initial.native && p617.initial.unwrapped && p617.initial.url === '/index.html' &&
      p617.initial.version === (p617.arm === 'main-t602' ? '11.211' : '11.212') && p617.initial.art === (p617.arm === 'native-t603') &&
      p617.source?.rawSHA256 === (p617.arm === 'main-t602' ? 'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265' : '99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d');
    check(p617.sourceVerified, 'T617 byte-pinned document and native function identity');
    p617.foregroundBefore = await foregroundState603(true);
    check(p617.foregroundBefore.valid, 'T617 initial foreground');
    p617.setupElapsedMs = Date.now() - active617ChildStarted;
    p617.preparationAdmission = require('../t604-canvaskit/active617-preparation-policy.cjs').admission(p617.setupElapsedMs, process.env.T617_DIAGNOSTIC_SETUP_ADMISSION === '1');
    if (!p617.preparationAdmission.diagnosticEnabled || p617.preparationAdmission.original.passed) check(p617.preparationAdmission.original.passed, 'T617 setup fits fixed 60-second bound');
    check(p617.preparationAdmission.admitted, 'T617 preparation fits supervised whole-child resource limit');
    persist();
    try {
      p617.observation = await ev('__active617.observe()');
      // No screenshot, trace, full-city scan, explicit save or host polling was
      // performed during the single uninterrupted browser observation.
      p617.summary = metrics617.summarize(p617.observation);
      p617.foregroundAfter = await foregroundState603();
      p617.foregroundValid = p617.foregroundBefore.valid && p617.foregroundAfter.valid;
      const endpointStart617 = Date.now();
      if (p617.observation.complete) {
        p617.endpoint = await ev('__active617.endpoint()');
        p617.endpoint.rootSHA256 = hash(JSON.stringify(p617.endpoint.roots)); delete p617.endpoint.roots;
        p617.endpoint.canonicalSHA256 = hash(p617.endpoint.canonical); delete p617.endpoint.canonical;
      }
      p617.endpointElapsedMs = Date.now() - endpointStart617;
      p617.accepted = p617.preparationAdmission.original.passed && p617.summary.valid && p617.foregroundValid && !!p617.endpoint?.passed && p617.endpointElapsedMs <= 20000;
      p617.decision = p617.accepted ? 'Valid fresh active arm; requires both bracketing main arms and the separate correctness/release gates.' : 'Invalid or incomplete active measurement; no nonregression inference.';
    } catch (error) {
      p617.error = String(error); p617.accepted = false;
      p617.decision = 'Active measurement or evolved endpoint failed; no release inference.';
      try { p617.observation ||= await ev('__active617.abort("host observation/endpoint failure");__active617.snapshot()'); } catch (partialError) { p617.partialEvidenceError = String(partialError); }
    }
    p617.finalFlags = await ev('__s603.flags()');
    check(p617.finalFlags.T603 === (p617.arm === 'native-t603') && !p617.finalFlags.T596 && !p617.finalFlags.T600, 'T617 final selected art and preview flags');
    p617.appErrors = await ev('(window.__errLog||[]).slice(-20)');
    check(!p617.appErrors.length, 'T617 zero application errors after active observation');
    p617.elapsedMs = Date.now() - active617ChildStarted;
    report.coverage.core = true; persist();
    console.log('T617_CHILD ' + JSON.stringify({ arm: p617.arm, zoom: p617.zoom, accepted: p617.accepted, decision: p617.decision, summary: p617.summary }));
    check(p617.accepted, p617.decision);
