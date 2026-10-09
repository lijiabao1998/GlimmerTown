(async()=>{
  // Correctness-only screen. No product cache or renderer is installed.
  const maskFor=source=>{const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const g=c.getContext('2d');g.drawImage(source,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';return c;};
  const synthetic=document.createElement('canvas');synthetic.width=17;synthetic.height=19;const sg=synthetic.getContext('2d'),pixels=sg.createImageData(17,19);for(let i=0;i<17*19;i++){pixels.data[i*4]=(i*29)%256;pixels.data[i*4+1]=(i*47)%256;pixels.data[i*4+2]=(i*71)%256;pixels.data[i*4+3]=(i*13)%256;}sg.putImageData(pixels,0,0);
  const actual=__s603.captureShadows607(),sources=[{label:'synthetic-alpha-edges',source:synthetic},...actual.sources.slice(0,8).map((source,i)=>({label:'actual-shadow-source-'+i,source}))];
  const result={stage:'alpha-mask pixel feasibility only',sourceCount:sources.length,realShadowCalls:actual.calls,correctnessOnly:true,cacheImplemented:false,performanceSamples:0,cases:[],passed:false};
  for(const {label,source}of sources){const mask=maskFor(source),w=source.width,h=source.height;
    const geometries=[[2,3,w,h*.32],[2.375,3.625,w*.7,h*.7*.32],[-3.375,4.25,w*1.25,h*1.25*.32],[30.5,-2.25,w*.95,h*.95*.32],[63.25,20.5,w*2,h*2*.32],[5.25,63.25,w*.5,h*.5*.32]];
    for(let geometry=0;geometry<geometries.length;geometry++)for(const alpha of [.09,.22,.6,1])for(const smooth of [false,true])for(const background of ['transparent','#397a91']){
      const cs=[document.createElement('canvas'),document.createElement('canvas')];for(const c of cs){c.width=96;c.height=96;}
      for(let k=0;k<2;k++){const g=cs[k].getContext('2d');if(background!=='transparent'){g.fillStyle=background;g.fillRect(0,0,96,96);}g.imageSmoothingEnabled=smooth;g.globalAlpha=alpha;g.filter=k?'none':'brightness(0)';g.drawImage(k?mask:source,...geometries[geometry]);}
      const a=cs[0].getContext('2d').getImageData(0,0,96,96).data,b=cs[1].getContext('2d').getImageData(0,0,96,96).data;let changedPixels=0,maxChannelDelta=0,channelSum=0;for(let i=0;i<a.length;i+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a[i+k]-b[i+k]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);channelSum+=d;}if(changed)changedPixels++;}
      const row={label,width:w,height:h,geometry,args:geometries[geometry],alpha,smooth,background,changedPixels,maxChannelDelta,channelSum};result.cases.push(row);
      if(changedPixels){result.failure={...row,originalPNG:cs[0].toDataURL(),maskPNG:cs[1].toDataURL()};result.decision='NO-GO: pre-baked black-alpha source differs from original native brightness filter. Do not implement cache or benchmark this substitution.';return result;}
    }
  }
  result.passed=true;result.decision='Micro-pixel screen passed only. Whole-city ordered comparison and complete source-mutation invalidation are still required before cache or performance claims.';return result;
})()
