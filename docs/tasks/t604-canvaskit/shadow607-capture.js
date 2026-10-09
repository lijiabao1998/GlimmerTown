    captureShadows607:()=>{const sourceList=[],seen=new Set(),oldDrawImage=ctx.drawImage,oldR=R,wasRunning=running,clock={visT,trafClock,waterT,waterF,rainbowT},scene=JSON.stringify({day,money,pop,tiles});let calls=0,rngCalls=0;running=false;
      R=()=>{rngCalls++;return oldR();};ctx.drawImage=function(source,...args){const m=this.getTransform();if(this===ctx&&this.filter==='brightness(0)'&&m.a===1&&m.b===0&&m.c===0&&m.d===1){calls++;if(!seen.has(source)){seen.add(source);sourceList.push(source);}}return oldDrawImage.call(this,source,...args);};
      try{GV.forceDraw();if(rngCalls||scene!==JSON.stringify({day,money,pop,tiles}))throw Error('Shadow capture changed model/RNG');return {sources:sourceList,calls};}
      finally{ctx.drawImage=oldDrawImage;R=oldR;({visT,trafClock,waterT,waterF,rainbowT}=clock);running=wasRunning;}
    },
