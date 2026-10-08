/* Isolated T604 candidate: record the game's drawing once, then replay one backend. */
(function(root){
  'use strict';
  const PROPS=['fillStyle','strokeStyle','globalAlpha','globalCompositeOperation','filter','imageSmoothingEnabled','imageSmoothingQuality','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','font','textAlign','textBaseline','direction'];
  const PATH=new Set(['beginPath','closePath','moveTo','lineTo','rect','roundRect','arc','ellipse','quadraticCurveTo','bezierCurveTo','arcTo']);
  const DRAW=new Set(['fillRect','strokeRect','clearRect','fill','stroke','fillText','strokeText']);
  const WRITE=new Set(['fillRect','strokeRect','clearRect','fill','stroke','fillText','strokeText','drawImage','putImageData','reset']);
  const matrix=g=>{const m=g.getTransform();return[m.a,m.b,m.c,m.d,m.e,m.f];};
  class Recorder {
    constructor(canvas,native){
      this.canvas=canvas;this.native=native;this.shadowCanvas=document.createElement('canvas');this.shadow=this.shadowCanvas.getContext('2d');
      const colorCanvas=document.createElement('canvas');colorCanvas.width=colorCanvas.height=1;this.colorParser=colorCanvas.getContext('2d');
      this.gradients=new WeakMap();this.sources=new WeakMap();this.nextImage=1;this.nextGradient=1;this.commands=[];this.path=[];this.pathHeld=false;
      this.clips=[];this.stack=[];this.transforms=[1,0,0,1,0,0];this.snapshot=null;this.frameRefs=new Map();this.inFrame=false;this.faults=[];
      this.lastSize='';this.ensureSize();
      const methods=new Map(),overrides=new Map();
      this.context=new Proxy({}, {
        get:(_target,name)=>{
          if(overrides.has(name))return overrides.get(name);
          if(name==='canvas')return this.canvas;
          if(name==='getImageData')return(...args)=>this.readPixels?this.readPixels(...args):this.native.getImageData(...args);
          if(PROPS.includes(name))return this.shadow[name];
          if(typeof this.shadow[name]!=='function')return this.shadow[name];
          if(!methods.has(name))methods.set(name,(...args)=>this.call(name,args));
          return methods.get(name);
        },
        set:(_target,name,value)=>{
          this.ensureSize();
          if(PROPS.includes(name)){this.shadow[name]=value;this.snapshot=null;return true;}
          // Test observers may wrap methods on the facade, just as on Canvas2D.
          overrides.set(name,value);return true;
        },
        defineProperty:(_target,name,descriptor)=>{if('value'in descriptor){overrides.set(name,descriptor.value);return true;}return false;},
        deleteProperty:(_target,name)=>overrides.delete(name)
      });
      for(const name of ['width','height']){
        let proto=Object.getPrototypeOf(canvas),descriptor;
        while(proto&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(proto,name);proto=Object.getPrototypeOf(proto);}
        if(descriptor?.get&&descriptor?.set)Object.defineProperty(canvas,name,{configurable:true,get:()=>descriptor.get.call(canvas),set:value=>{
          descriptor.set.call(canvas,value);if(this.internalReset)return;this.lastSize='';this.ensureSize();if(this.inFrame)this.commands=[];
        }});
      }
    }
    ensureSize(){
      const key=this.canvas.width+'x'+this.canvas.height;
      if(key===this.lastSize)return;
      this.lastSize=key;this.shadowCanvas.width=this.canvas.width;this.shadowCanvas.height=this.canvas.height;
      this.transforms=[1,0,0,1,0,0];this.path=[];this.pathHeld=false;this.clips=[];this.stack=[];this.snapshot=null;
    }
    begin(){
      if(this.inFrame)throw Error('T604 drawing must not run recursively');
      this.ensureSize();this.inFrame=true;this.commands=[];this.frameRefs=new Map();this.faults=[];this.started=performance.now();
      this.imageSnapshots=0;this.imageSnapshotBytes=0;
    }
    style(value){
      const gradient=value&&typeof value==='object'?this.gradients.get(value):null;
      return gradient?{id:gradient.id,version:gradient.version,type:gradient.type,args:gradient.args.slice(),stops:gradient.stops.map(s=>({...s}))}:value;
    }
    state(){
      if(!this.snapshot){
        const state={};for(const p of PROPS)state[p]=this.style(this.shadow[p]);
        state.transform=this.transforms.slice();state.dash=this.shadow.getLineDash();state.clips=this.clips.slice();this.snapshot=state;
      }
      return this.snapshot;
    }
    heldPath(){this.pathHeld=true;return this.path;}
    mutatePath(){if(this.pathHeld){this.path=this.path.slice();this.pathHeld=false;}}
    call(name,args){
      this.ensureSize();
      if(name==='createLinearGradient'||name==='createRadialGradient'){
        const gradient=this.shadow[name](...args),add=gradient.addColorStop;
        const data={id:this.nextGradient++,version:0,type:name==='createLinearGradient'?'linear':'radial',args:args.slice(),stops:[]};
        this.gradients.set(gradient,data);
        gradient.addColorStop=(offset,color)=>{add.call(gradient,offset,color);this.colorParser.fillStyle=color;data.stops.push({offset,color:this.colorParser.fillStyle});data.version++;this.snapshot=null;};return gradient;
      }
      if(PATH.has(name)){
        const result=this.shadow[name](...args);
        if(name==='beginPath'){this.path=[];this.pathHeld=false;}else this.mutatePath();
        this.path.push({name,args:args.slice(),transform:this.transforms.slice()});return result;
      }
      if(name==='save'){this.shadow.save();this.stack.push({clips:this.clips,transform:this.transforms});return;}
      if(name==='restore'){
        this.shadow.restore();const old=this.stack.pop();if(old){this.clips=old.clips;this.transforms=old.transform;}
        this.snapshot=null;return;
      }
      if(['translate','rotate','scale','transform','setTransform','resetTransform','setLineDash'].includes(name)){
        const result=this.shadow[name](...args);this.transforms=matrix(this.shadow);this.snapshot=null;return result;
      }
      if(name==='clip'){
        this.shadow.clip(...args);
        const external=args[0]&&typeof args[0]==='object';
        const clip={path:this.heldPath(),rule:(external?args[1]:args[0])||'nonzero'};
        if(external){clip.nativePath=new Path2D(args[0]);this.faults.push('external Path2D clip');}
        this.clips=[...this.clips,clip];this.snapshot=null;return;
      }
      if(DRAW.has(name)){
        if(!this.inFrame){this.faults.push('paint outside draw');return this.native[name](...args);}
        const command={kind:name,args:args.slice(),state:this.state()};
        if(name==='fill'||name==='stroke'){
          command.path=this.heldPath();
          if(args[0]&&typeof args[0]==='object'){command.nativePath=new Path2D(args[0]);command.args=args.slice(1);this.faults.push('external Path2D paint');}
        }
        this.commands.push(command);return;
      }
      if(name==='drawImage'){
        if(!this.inFrame)return this.native.drawImage(...args);
        let [source,...geometry]=args;
        if(source===this.canvas){
          // Self-copy depends on earlier paints in this frame. Materialize that
          // ordered prefix once and retain its pixels; never read a stale frame.
          this.faults.push('main canvas self-image requires native fallback');
          this.replayNative({commands:this.commands});
          const copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;copy.getContext('2d').drawImage(source,0,0);
          this.imageSnapshots++;this.imageSnapshotBytes+=copy.width*copy.height*4;source=copy;
        }
        this.commands.push({kind:'image',image:this.image(source),args:geometry,state:this.state()});return;
      }
      if(name==='measureText'||name==='getTransform'||name==='getLineDash'||name==='isPointInPath'||name==='isPointInStroke'||name==='getContextAttributes')return this.shadow[name](...args);
      if(name==='createPattern'){const pattern=this.shadow.createPattern(...args);return pattern;}
      // Preserve unsupported commands for whole-frame native replay.
      if(this.inFrame){this.faults.push('unsupported Canvas2D method '+String(name));this.commands.push({kind:'native',name,args:args.slice(),state:this.state()});return;}
      return this.shadow[name](...args);
    }
    image(source){
      if(!source||!Number.isFinite(source.width)||!Number.isFinite(source.height))throw Error('Invalid Canvas image source');
      let entry=this.sources.get(source);
      if(!entry){entry={id:this.nextImage++,revision:0,source,width:source.width,height:source.height};this.sources.set(source,entry);this.watchSource(source,entry);}
      if(entry.width!==source.width||entry.height!==source.height){entry.width=source.width;entry.height=source.height;entry.revision++;}
      const key=entry.id+':'+entry.revision;
      let handle=this.frameRefs.get(key);
      if(!handle){handle={id:entry.id,revision:entry.revision,width:source.width,height:source.height,source};this.frameRefs.set(key,handle);}
      return handle;
    }
    beforeSourceChange(source,entry){
      const handle=this.frameRefs.get(entry.id+':'+entry.revision);
      if(this.inFrame&&handle&&handle.source===source){
        const copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;copy.getContext('2d').drawImage(source,0,0);
        handle.source=copy;this.imageSnapshots++;this.imageSnapshotBytes+=copy.width*copy.height*4;
      }
      entry.revision++;
    }
    watchSource(source,entry){
      if(typeof source.getContext!=='function'||source===this.canvas)return;
      let context;try{context=source.getContext('2d');}catch{return;}if(!context)return;
      const before=()=>this.beforeSourceChange(source,entry);
      for(const name of WRITE){const old=context[name];if(typeof old==='function')context[name]=function(...args){before();return old.apply(this,args);};}
      for(const name of ['width','height']){
        let proto=Object.getPrototypeOf(source),descriptor;
        while(proto&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(proto,name);proto=Object.getPrototypeOf(proto);}
        if(descriptor?.get&&descriptor?.set)try{Object.defineProperty(source,name,{configurable:true,get:()=>descriptor.get.call(source),set:value=>{before();descriptor.set.call(source,value);}});}catch{/* dimension changes are also detected on next image use */}
      }
    }
    end(){
      if(!this.inFrame)throw Error('T604 draw was not begun');this.inFrame=false;
      return {width:this.canvas.width,height:this.canvas.height,commands:this.commands,faults:[...new Set(this.faults)],
        producerMs:performance.now()-this.started,imageSnapshots:this.imageSnapshots,imageSnapshotBytes:this.imageSnapshotBytes};
    }
    gradient(g,style){
      if(!style||typeof style!=='object'||!['linear','radial'].includes(style.type))return style;
      const native=g[style.type==='linear'?'createLinearGradient':'createRadialGradient'](...style.args);
      for(const stop of style.stops)native.addColorStop(stop.offset,stop.color);return native;
    }
    nativePath(g,path){
      g.beginPath();for(const op of path||[]){g.setTransform(...op.transform);g[op.name](...op.args);}
    }
    replayNative(packet){
      const g=this.native,start=performance.now();
      if(typeof g.reset==='function')g.reset();else{const w=this.canvas.width;this.internalReset=true;try{this.canvas.width=w;}finally{this.internalReset=false;}}
      for(const command of packet.commands){
        const s=command.state;g.save();
        try{
          for(const clip of s.clips){g.resetTransform();if(clip.nativePath)g.clip(clip.nativePath,clip.rule);else{this.nativePath(g,clip.path);g.resetTransform();g.clip(clip.rule);}}
          for(const p of PROPS)g[p]=(p==='fillStyle'||p==='strokeStyle')?this.gradient(g,s[p]):s[p];
          g.setLineDash(s.dash);g.setTransform(...s.transform);
          if(command.kind==='image')g.drawImage(command.image.source,...command.args);
          else if(command.kind==='fill'||command.kind==='stroke'){
            if(command.nativePath)g[command.kind](command.nativePath,...command.args);
            else{this.nativePath(g,command.path);g.setTransform(...s.transform);g[command.kind](...command.args);}
          }else if(command.kind==='native')g[command.name](...command.args);
          else g[command.kind](...command.args);
        }finally{g.restore();}
      }
      return {nativeMs:performance.now()-start,commands:packet.commands.length};
    }
  }
  root.TownRecorder604={Recorder};
  if(typeof module==='object')module.exports={Recorder};
})(typeof globalThis==='object'?globalThis:this);
