  // Diagnostics read only existing scratch-copy bytes, never the live retained
  // canvas mid-sequence. The exact prior compositor exception stays separate.
  window.__retained616Primary={
    layerDifference:()=>{
      const a=layerPixels615.original,b=layerPixels615.candidate,c=slots615.candidate.canvas;
      if(!a||!b||!c||a.length!==b.length)return {available:false};
      const d=delta615(a,b),points=[];
      for(let i=0;i<a.length&&points.length<32;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])points.push({x:(i/4)%c.width,y:Math.floor(i/4/c.width),original:Array.from(a.subarray(i,i+4)),candidate:Array.from(b.subarray(i,i+4))});
      const r=cvs.getBoundingClientRect(),mapping={layerWidth:c.width,layerHeight:c.height,canvasWidth:cvs.width,canvasHeight:cvs.height,left:r.left,top:r.top,cssWidth:r.width,cssHeight:r.height,dpr:window.devicePixelRatio,identity:ctx.getTransform().isIdentity};return {available:true,...d,points,truncated:d.pixels>points.length,mapping,mappingExact:c.width===cvs.width&&c.height===cvs.height&&r.left===0&&r.top===0&&r.width===cvs.width&&r.height===cvs.height&&window.devicePixelRatio===1&&ctx.getTransform().isIdentity};
    }
  };
