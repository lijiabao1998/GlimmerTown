    report.candidate='T613 native clip/paint causal matrix';report.releaseGatePassed=false;
    report.clip613={qualified:false,performanceRun:false,releaseGatePassed:false};
    report.flags=await ev('__s603.flags()');check(report.flags.T603&&!report.flags.T596&&!report.flags.T600,'approved art unchanged');
    const observer613=await ev('__source612.stats()');check(observer613.installed,'preboot source observer installed: '+observer613.reason);
    try{report.clip613=await ev('__retained613.causal()');report.clip613.performanceRun=false;report.clip613.releaseGatePassed=false;}
    finally{report.sourceObserverDisposal613=await ev('__source612.dispose();__source612.stats()');}
    if(report.clip613.pngs){for(const [name,data] of Object.entries(report.clip613.pngs)){if(!/^[a-z0-9-]+$/.test(name)||!data.startsWith('data:image/png;base64,'))throw Error('Invalid causal evidence image');const file='T613-'+name+'.png';fs.writeFileSync(path.join(OUT,file),Buffer.from(data.slice(data.indexOf(',')+1),'base64'));report.screenshots.push(file);}delete report.clip613.pngs;}
    persist();console.log('CLIP613 '+JSON.stringify(report.clip613));
    check(report.sourceObserverDisposal613.disposed&&report.sourceObserverDisposal613.weakEntries===0,'source observer hooks and registry disposed');
    check(report.clip613.qualified,'causal reproduction and controls qualify: '+report.clip613.decision);
    report.coverage.core=true;persist();
