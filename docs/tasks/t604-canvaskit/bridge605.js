  window.__audit605=(()=>{
    const original={nightLayer:lotNightLayer574,objectOrder:lotObjectOrder574,farSelection:lotFarFrame574,nightGround:drawNightCity413,nightTop:drawNightCityTop413};
    let mode='off',row=null,descriptors=null,previous=null,rainbowBase=rainbowT;
    const ids=new WeakMap();let nextId=1;
    const id=s=>{if(!ids.has(s))ids.set(s,nextId++);return ids.get(s);};
    const call=(name,fn,self,args)=>{const start=performance.now();try{return fn.apply(self,args);}finally{if(row)row.phases[name]=(row.phases[name]||0)+performance.now()-start;}};
    const functions={
      nightLayer:function(...args){const result=call('nightLayer',original.nightLayer,this,args);if(mode==='observe')descriptors={lights:args[0].map(n=>({...n,rect:n.rect?.slice()})),alpha:args[1],width:args[2],height:args[3]};return result;},
      objectOrder:function(...args){if(row)row.objectCount=args[0].length;return call('objectOrder',original.objectOrder,this,args);},
      farSelection:function(...args){return call('farSelection',original.farSelection,this,args);},
      nightGround:function(...args){return call('nightGround',original.nightGround,this,args);},
      nightTop:function(...args){return call('nightTop',original.nightTop,this,args);}
    };
    const setMode=value=>{if(!['off','timing','observe'].includes(value))throw Error('Unknown structural audit mode');mode=value;const f=value==='off'?original:functions;lotNightLayer574=f.nightLayer;lotObjectOrder574=f.objectOrder;lotFarFrame574=f.farSelection;drawNightCity413=f.nightGround;drawNightCityTop413=f.nightTop;};
    const floatBuffer=new DataView(new ArrayBuffer(8));
    const encode=n=>{if(n===null)return ['null'];if(n===undefined)return ['undefined'];if(typeof n==='string'||typeof n==='boolean')return [typeof n,n];if(typeof n!=='number')throw Error('Opaque night descriptor field');floatBuffer.setFloat64(0,n,false);return ['f64',floatBuffer.getUint32(0,false),floatBuffer.getUint32(4,false)];};
    const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    return {
      mode:setMode,
      reset:()=>{previous=null;rainbowBase=rainbowT;return true;},
      sample:(advanceInput=false)=>{
        if(running||measureWork603)throw Error('Structural sample requires isolated stopped RAF');
        if(advanceInput){__s603.freezeVis(null);advance(.05);}else{trafClock=100;waterT=0;waterF=0;rainbowT=rainbowBase;__s603.freezeVis(100);}
        descriptors=null;const scene=__s603.scene(),actors=JSON.stringify(__audit604.actors()),rng=R;let rngCalls=0;R=()=>{rngCalls++;return rng();};
        row={mode,phases:{},animatedInput:advanceInput,input:{visT,trafClock,waterF,waterT,rot:viewRotEff(),camera:{...cam},weather,season:season(),width:W,height:H}};
        try{const start=performance.now();GV.forceDraw();row.fullDrawMs=performance.now()-start;}
        finally{R=rng;}
        row.rngCalls=rngCalls;row.sceneSame=scene===__s603.scene();row.actorSame=actors===JSON.stringify(__audit604.actors());
        const c=window.__townRenderer604;row.renderer=c?{backend:c.backend,...c.lastFrame}:null;
        row.exclusiveMeasuredPhasesMs=Object.values(row.phases).reduce((a,b)=>a+b,0);const result=row;row=null;return result;
      },
      inspect:async()=>{
        if(!descriptors)return {available:false};
        const start=performance.now(),sources=new Map(),raw=descriptors;
        for(const n of raw.lights){const s=n.img||n.occlude574;if(!s||sources.has(s))continue;if(typeof s.getContext!=='function')throw Error('Untracked noncanvas night source');const pixels=s.getContext('2d').getImageData(0,0,s.width,s.height).data;sources.set(s,{id:id(s),width:s.width,height:s.height,sha256:await digest(pixels)});}
        const entries=raw.lights.map(n=>Object.keys(n).sort().map(key=>[key,key==='img'||key==='occlude574'?sources.get(n[key]):Array.isArray(n[key])?n[key].map(encode):encode(n[key])]));
        const header=JSON.stringify({alpha:encode(raw.alpha),width:raw.width,height:raw.height}),serialized=entries.map(e=>JSON.stringify(e));
        let prefix=0;if(previous&&previous.header===header)while(prefix<Math.min(previous.entries.length,serialized.length)&&previous.entries[prefix]===serialized[prefix])prefix++;
        const whole=!!previous&&previous.header===header&&previous.entries.length===serialized.length&&prefix===serialized.length;
        const result={available:true,entries:entries.length,sources:sources.size,occluders:raw.lights.filter(n=>n.occlude574).length,wholeListExactHit:whole,unchangedPrefix:prefix,signature:await digest(new TextEncoder().encode(header+JSON.stringify(serialized))),validationMs:performance.now()-start,sourceReadbackAfterProductUpload:true};
        previous={header,entries:serialized};return result;
      },
      restore:()=>{setMode('off');row=null;descriptors=null;previous=null;__s603.freezeVis(null);return true;}
    };
  })();
