    report.candidate='T608 exact topology scratch reuse feasibility';report.releaseGatePassed=false;
    report.order608={cacheDecisions:false,rasterizationChanged:false,original55Passed:false,releaseGatePassed:false,maxNodes:2048,maxRetainedEdges:262144,retentionScope:'Numeric scratch only; slot caps are not an exact V8 heap byte claim. Returned arrays remain independently owned.',pixelProof:[],performance:[]};
    const metrics608=require('../t604-canvaskit/native606-metrics.cjs');
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved art unchanged');
    await ev('document.getElementById("bNewGame").click();__s603.grow22();true');
    const fixture608=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/manifest.json'),'utf8')).cities.find(c=>c.seed===22),roots608=await ev('__s603.roots()');check(!roots608.bad&&roots608.rows.length===fixture608.roots&&hash(JSON.stringify(roots608.rows))===fixture608.rootSHA256,'exact seed22 roots before scratch proof');
    const focus608=(await ev('__s603.census(85)'))[0];await ev('GV.setSeason(1);GV.weather(0);GV.setVisT(100);GV.lookAt('+(focus608[0]+1)+','+(focus608[1]+1)+');true');
    await ev(fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/order608.cjs'),'utf8')+';__order608.install();__order608.pause();true');
    const capture608=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:0,y:0,width:1400,height:900,scale:1}}),bytes=Buffer.from(r.data,'base64'),file='T608-'+name+'.png';fs.writeFileSync(path.join(OUT,file),bytes);report.screenshots.push(file);return {file,sha256:hash(bytes),pixels:pngRgba603(bytes)};};
    const delta608=(a,b)=>{if(a.w!==b.w||a.h!==b.h)throw Error('Scratch comparison dimensions changed');let pixels=0,maxChannelDelta=0;for(let i=0;i<a.rgba.length;i+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a.rgba[i+k]-b.rgba[i+k]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}if(changed)pixels++;}return {pixels,maxChannelDelta};};
    for(const [index,setting]of [[1,0],[.7,0],[.95,1],[1.25,2],[2,3]].entries()){
      await ev('GV.setRot('+setting[1]+');GV.setZoom('+setting[0]+');true');const before=await ev('__order608.frame("original")'),a=await capture608(index+'-original');
      const verified=await ev('__order608.frame("verify")'),b=await capture608(index+'-verified');
      const pooled=await ev('__order608.frame("pooled")'),c=await capture608(index+'-pooled');
      const restored=await ev('__order608.frame("original")'),d=await capture608(index+'-restored');
      const proof={setting,before,verified,pooled,restored,original:a.file,verifiedFile:b.file,pooledFile:c.file,restoredFile:d.file,verifyDelta:delta608(a.pixels,b.pixels),pooledDelta:delta608(a.pixels,c.pixels),restoreDelta:delta608(a.pixels,d.pixels)};report.order608.pixelProof.push(proof);persist();check(verified.verifyCalls>before.verifyCalls&&proof.verifyDelta.pixels===0&&proof.pooledDelta.pixels===0&&proof.restoreDelta.pixels===0,'exact topology and zero RGBA original/verify/pooled/restored '+index);
    }
    await ev('__order608.resume();GV.setRot(0);GV.setZoom(1);true');check((await foregroundState603(true)).valid,'foreground qualified before pooled live comparison');
    const scene608=await ev('__s603.scene()'),start608=Date.now(),deadline608=start608+240000;report.order608.warm=[];
    for(const mode of ['original','pooled']){await ev('__order608.mode('+JSON.stringify(mode)+');true');report.order608.warm.push({mode,row:await ev('__s603.observe606(20000)')});}
    await ev('__order608.mode("original");true');report.order608.qualification=[];let qualified608=false;
    while(Date.now()+5000<deadline608){const w=await ev('__s603.observe606(5000)');report.order608.qualification.push(w);persist();if(metrics608.qualify(report.order608.qualification.slice(-3))&&w.after.nightRemaining>=33){qualified608=true;break;}}
    report.order608.qualified=qualified608;
    if(qualified608){for(const [pair,order]of [['original','pooled'],['pooled','original'],['original','pooled']].entries()){const rows=[];for(const mode of order){await ev('__order608.mode('+JSON.stringify(mode)+');true');const row=await ev('__s603.observe606(5000)');rows.push({mode,...row,stats:await ev('__order608.stats()')});}report.order608.performance.push({pair,rows});persist();}
      const grouped=mode=>report.order608.performance.flatMap(p=>p.rows.filter(r=>r.mode===mode)),original=grouped('original'),pooled=grouped('pooled');
      const pairs=report.order608.performance.map(p=>{const a=p.rows.find(r=>r.mode==='original'),b=p.rows.find(r=>r.mode==='pooled');return {originalFPS:a.frames/(a.elapsed/1000),pooledFPS:b.frames/(b.elapsed/1000),fpsRatio:(b.frames/b.elapsed)/(a.frames/a.elapsed),p95Ratio:metrics608.p95(b.intervals)/metrics608.p95(a.intervals)};});
      const stable=metrics608.qualify(original)&&metrics608.qualify(pooled),ratio=metrics608.median(pairs.map(p=>p.fpsRatio)),tail=metrics608.median(pairs.map(p=>p.p95Ratio)),wins=pairs.filter(p=>p.fpsRatio>1).length;
      report.order608.result={stable,pairs,medianFPSRatio:ratio,medianP95Ratio:tail,wins,benefitScreen:stable&&wins>=2&&ratio>=1.05&&tail<=1.05,absolute55:pooled.every(r=>r.frames/(r.elapsed/1000)>=55),scope:'Actual interleaved native frame distributions; no FPS inferred from helper costs.'};
    }
    check(scene608===await ev('__s603.scene()'),'canonical model preserved across animated pooled comparison');report.order608.finalStats=await ev('__order608.stats()');await ev('__order608.dispose()');
    report.order608.decision=report.order608.result?.benefitScreen?'Bounded native benefit screen met; original55/full regression and release gates still required.':qualified608?'NO-GO for adoption: original/pooled benefit or stability screen did not pass; retain all samples and stop this candidate.':'Measurement limit: no stable complete native comparison window within4 minutes. Stop without unchanged rerun.';
    console.log('ORDER608 '+JSON.stringify({qualified:qualified608,result:report.order608.result,stats:report.order608.finalStats,decision:report.order608.decision}));report.coverage.core=true;persist();
