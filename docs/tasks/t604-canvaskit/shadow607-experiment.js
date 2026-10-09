    report.candidate='T607 exact alpha-mask feasibility before any cache';report.releaseGatePassed=false;
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved art flags unchanged');
    await ev('document.getElementById("bNewGame").click();__s603.grow22();true');
    const focus607=(await ev('__s603.census(85)'))[0];await ev('GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(1);GV.lookAt('+(focus607[0]+1)+','+(focus607[1]+1)+');GV.setVisT(100);true');
    check((await foregroundState603(true)).valid,'qualified foreground for native pixel screen');
    report.shadow607=await ev(fs.readFileSync(path.join(ROOT,'docs/tasks/t604-canvaskit/shadow607-browser.js'),'utf8'));
    if(report.shadow607.failure){for(const [key,file]of [['originalPNG','T607-original.png'],['maskPNG','T607-mask.png']]){fs.writeFileSync(path.join(OUT,file),Buffer.from(report.shadow607.failure[key].split(',')[1],'base64'));report.shadow607.failure[key]=file;report.screenshots.push(file);}}
    persist();console.log('SHADOW607 '+JSON.stringify(report.shadow607));
    // A negative feasibility result is successfully collected evidence, never a
    // product pass. No integration or timing starts after a mismatch.
    report.coverage.core=true;
