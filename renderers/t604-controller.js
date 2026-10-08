/* Preview-only GPU backend. Gameplay owns the single advance/draw invocation. */
(function(root){
  'use strict';
  class Controller {
    constructor(canvas,native){
      this.canvas=canvas;this.native=native;this.recorder=new root.TownRecorder604.Recorder(canvas,native);this.context=this.recorder.context;
      this.started=performance.now();this.originalOpacity=canvas.style.opacity;this.status='loading';this.requested='gpu';this.backend='native';
      this.frames=0;this.gpuFrames=0;this.fallbackFrames=0;this.fallbackReasons={};this.rows=[];this.keepRows=false;this.failures=[];
      this.gpuCanvas=document.createElement('canvas');this.gpuCanvas.id='town-skia604';this.gpuCanvas.style='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
      this.gpuCanvas.style.setProperty('visibility','visible','important');
      canvas.insertAdjacentElement('afterend',this.gpuCanvas);
      this.gpuCanvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.status='context-lost';this.show('native');});
      this.gpuCanvas.addEventListener('webglcontextrestored',()=>{this.surfaceSize='';this.status='ready';});
      this.recorder.readPixels=(...args)=>this.getImageData(...args);
      const originalDataURL=canvas.toDataURL.bind(canvas);this.originalDataURL=originalDataURL;
      canvas.toDataURL=(...args)=>{
        if(this.backend!=='gpu')return originalDataURL(...args);
        const pixels=this.getImageData(0,0,canvas.width,canvas.height),c=document.createElement('canvas');c.width=pixels.width;c.height=pixels.height;
        c.getContext('2d').putImageData(pixels,0,0);return c.toDataURL(...args);
      };
      const base=new URL('../vendor/canvaskit-0.42.0/',document.currentScript?.src||new URL('renderers/t604-controller.js',location.href)).href;
      this.ready=root.CanvasKitInit({locateFile:name=>new URL(name,base).href}).then(CK=>{
        this.CK=CK;this.wasmReadyMs=performance.now()-this.started;this.status='ready';return this.info();
      }).catch(error=>{this.status='load-failed';this.failures.push(String(error));return this.info();});
    }
    prepareSurface(width,height){
      const key=width+'x'+height;if(this.surface&&this.surfaceSize===key)return;
      if(this.player){try{this.player.dispose();}catch(error){this.failures.push('dispose: '+error);}this.player=null;}
      if(this.surface){try{this.surface.delete();}catch(error){this.failures.push('surface dispose: '+error);}this.surface=null;}
      this.gpuCanvas.width=width;this.gpuCanvas.height=height;
      this.surface=this.CK.MakeWebGLCanvasSurface(this.gpuCanvas,this.CK.ColorSpace.SRGB,{alpha:true,premultipliedAlpha:true,antialias:true,depth:false,stencil:true,preserveDrawingBuffer:false});
      if(!this.surface||!this.surface.reportBackendTypeIsGPU())throw Error('CanvasKit did not create a GPU surface');
      this.player=new root.TownSkiaPlayer604(this.CK,this.surface,{maxTextureBytes:64*1024*1024,maxTextureCount:512});
      this.surfaceSize=key;
    }
    begin(){this.recorder.begin();}
    end(){
      const packet=this.recorder.end(),start=performance.now();this.lastPacket=packet;this.frames++;
      let reasons=packet.faults.slice(),result=null;
      if(this.requested!=='gpu')reasons.push('explicit native replay');
      if(this.status!=='ready')reasons.push(this.status);
      if(!reasons.length){
        try{
          this.prepareSurface(packet.width,packet.height);
          // render() performs fail-closed preflight/resource preparation before
          // touching the surface. Do not duplicate that work on every frame.
          result=this.player.render(packet);
        }catch(error){reasons.push(error.code==='T604_UNSUPPORTED'?(error.reasons||[String(error)]).join('; '):'GPU render failure: '+error);}
      }
      if(result){this.backend='gpu';this.gpuFrames++;this.show('gpu');}
      else{
        this.backend='native';this.fallbackFrames++;for(const reason of reasons)this.fallbackReasons[reason]=(this.fallbackReasons[reason]||0)+1;
        result=this.recorder.replayNative(packet);this.show('native');
      }
      const row={backend:this.backend,commands:packet.commands.length,producerMs:packet.producerMs,replayMs:performance.now()-start,
        totalDrawMs:packet.producerMs+performance.now()-start,imageSnapshots:packet.imageSnapshots,imageSnapshotBytes:packet.imageSnapshotBytes,reasons,...result};
      this.lastFrame=row;if(this.keepRows)this.rows.push(row);
      return row;
    }
    show(which){this.canvas.style.opacity=which==='gpu'?'0':this.originalOpacity;this.gpuCanvas.style.display=which==='gpu'?'block':'none';}
    info(){return {status:this.status,requested:this.requested,backend:this.backend,frames:this.frames,gpuFrames:this.gpuFrames,fallbackFrames:this.fallbackFrames,
      fallbackReasons:{...this.fallbackReasons},wasmReadyMs:this.wasmReadyMs??null,heapBytes:this.CK?.HEAPU8?.buffer.byteLength??0,
      width:this.canvas.width,height:this.canvas.height,surfaceIsGPU:this.surface?this.surface.reportBackendTypeIsGPU():false,lastFrame:this.lastFrame||null,failures:this.failures.slice(),vendor:'canvaskit-wasm@0.42.0'};}
    setMode(which){if(!['gpu','native'].includes(which))throw Error('Unknown renderer mode');this.requested=which;return this.info();}
    measureStart(){this.rows=[];this.keepRows=true;return {frames:this.frames,gpuFrames:this.gpuFrames,fallbackFrames:this.fallbackFrames};}
    measureEnd(){this.keepRows=false;const rows=this.rows;this.rows=[];return {rows,info:this.info()};}
    getImageData(x,y,w,h,settings){
      if(this.recorder.inFrame){
        this.recorder.faults.push('synchronous main-canvas read during drawing');
        this.recorder.replayNative({width:this.canvas.width,height:this.canvas.height,commands:this.recorder.commands});
        return this.native.getImageData(x,y,w,h,settings);
      }
      if(this.backend!=='gpu'||!this.lastPacket)return this.native.getImageData(x,y,w,h,settings);
      if(settings&&settings.colorSpace&&settings.colorSpace!=='srgb')throw Error('T604 diagnostic readback requires sRGB');
      // Repaint the exact retained command packet, not the model. This supplies
      // actual GPU pixels even when WebGL's presentation buffer was discarded.
      this.player.render(this.lastPacket);
      const pixels=this.surface.getCanvas().readPixels(x,y,{width:w,height:h,colorType:this.CK.ColorType.RGBA_8888,alphaType:this.CK.AlphaType.Unpremul,colorSpace:this.CK.ColorSpace.SRGB});
      if(!pixels)throw Error('Actual GPU readback failed');return new ImageData(new Uint8ClampedArray(pixels),w,h);
    }
  }
  root.TownRenderer604={attach(canvas,native){
    if(new URLSearchParams(location.search).get('renderer')!=='canvaskit')return null;
    const controller=new Controller(canvas,native);root.__townRenderer604=controller;return controller;
  }};
})(typeof globalThis==='object'?globalThis:this);
