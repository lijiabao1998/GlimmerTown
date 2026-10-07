/* T604 experimental image-command compositor. No product hooks or global state. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.Gpu604=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const finite=(xs,n)=>Array.isArray(xs)&&xs.length===n&&xs.every(Number.isFinite);
  function normalize(c){
    const image=c.image,w=image&&image.width,h=image&&image.height;
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0)throw Error('Invalid image dimensions');
    let crop=c.crop||[0,0,w,h],dst=c.dst;const m=c.transform||[1,0,0,1,0,0],alpha=c.alpha??1,filter=c.filter||'none',blend=c.blend||'source-over';
    if(!finite(crop,4)||crop[2]<=0||crop[3]<=0)throw Error('Unsupported source crop');
    if(!finite(dst,4)||dst[2]<=0||dst[3]<=0||!finite(m,6)||!Number.isFinite(alpha)||alpha<0||alpha>1)throw Error('Unsupported image geometry/alpha');
    if(!['none','brightness(0)'].includes(filter)||!['source-over','lighter','screen'].includes(blend)||c.clip)throw Error('Unsupported filter/blend/clip');
    // Canvas clips an out-of-image source rectangle and proportionally adjusts
    // its destination. Do not let texture clamp-to-edge smear the missing area.
    const [sx,sy,sw,sh]=crop,x0=Math.max(0,sx),y0=Math.max(0,sy),x1=Math.min(w,sx+sw),y1=Math.min(h,sy+sh);
    if(x1<=x0||y1<=y0)throw Error('Empty clipped source must be omitted by capture');
    if(x0!==sx||y0!==sy||x1!==sx+sw||y1!==sy+sh){dst=[dst[0]+(x0-sx)*dst[2]/sw,dst[1]+(y0-sy)*dst[3]/sh,dst[2]*(x1-x0)/sw,dst[3]*(y1-y0)/sh];crop=[x0,y0,x1-x0,y1-y0];}
    return {image,crop,dst,transform:m,alpha,filter,blend,smoothing:c.smoothing!==false,revision:c.revision??0};
  }
  function vertices(c){
    c=normalize(c);const [x,y,w,h]=c.dst,[a,b,d,e,tx,ty]=c.transform,[sx,sy,sw,sh]=c.crop,out=[];
    // Native Canvas's axis-aligned, unfiltered nearest-image path chooses
    // coverage at the pixel center. A multisampled GL quad otherwise paints
    // outside that support and partially covers the inside edge pixels. Snap
    // only the raster rectangle to that integer support, then compensate UVs
    // so every included pixel samples the original continuous coordinates.
    // Smooth images, filtered images and rotated/sheared paths retain MSAA.
    const centerCoverage=!c.smoothing&&c.filter==='none'&&b===0&&d===0&&a!==0&&e!==0;
    for(const [u,v]of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]){const px=x+u*w,py=y+v*h,ox=a*px+d*py+tx,oy=b*px+e*py+ty,nx=centerCoverage?Math.ceil(ox-.5):ox,ny=centerCoverage?Math.ceil(oy-.5):oy,du=centerCoverage?(nx-ox)/(a*w):0,dv=centerCoverage?(ny-oy)/(e*h):0;out.push(nx,ny,(sx+(u+du)*sw)/c.image.width,(sy+(v+dv)*sh)/c.image.height,c.alpha,c.filter==='brightness(0)'?0:1);}
    return out;
  }
  function batches(commands){const out=[];for(let i=0;i<commands.length;i++){const c=normalize(commands[i]),last=out[out.length-1];if(last&&last.image===c.image&&last.revision===c.revision&&last.blend===c.blend&&last.smoothing===c.smoothing)last.count+=6;else out.push({image:c.image,revision:c.revision,blend:c.blend,smoothing:c.smoothing,first:i*6,count:6});}return out;}
  function centerSampling(c){c=normalize(c);const[a,b,d,e,tx,ty]=c.transform,[x,y,w,h]=c.dst,[sx,sy,sw,sh]=c.crop;return [a*x+tx,e*y+ty,a*(x+w)+tx,e*(y+h)+ty,sx,sy,sx+sw,sy+sh,!c.smoothing&&c.filter==='none'&&b===0&&d===0&&a!==0&&e!==0?1:0];}
  function reference(ctx,commands,background='#233445'){
    ctx.save();try{ctx.resetTransform();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.filter='none';ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.fillStyle=background;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
      for(const raw of commands){const c=normalize(raw);ctx.setTransform(...c.transform);ctx.globalAlpha=c.alpha;ctx.globalCompositeOperation=c.blend;ctx.filter=c.filter;ctx.imageSmoothingEnabled=c.smoothing;ctx.drawImage(c.image,...c.crop,...c.dst);}
    }finally{ctx.restore();}
  }
  class OrderedGpu604{
    constructor(canvas,{maxTextureBytes=256*1024*1024}={}){
      const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:true,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable');this.gl=gl;this.canvas=canvas;this.textures=new Map();this.bytes=0;this.maxTextureBytes=maxTextureBytes;this.lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
      const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const vs=shader(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;layout(location=0)in vec2 p;layout(location=1)in vec2 uv;layout(location=2)in vec2 ab;layout(location=3)in vec4 originalRect;layout(location=4)in vec4 sourceRect;layout(location=5)in float nearest;uniform vec2 size;out vec2 tex;out vec2 val;flat out vec4 rect;flat out vec4 region;flat out float center;void main(){gl_Position=vec4(p.x/size.x*2.-1.,1.-p.y/size.y*2.,0,1);tex=uv;val=ab;rect=originalRect;region=sourceRect;center=nearest;}');
      const fs=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;uniform sampler2D image;uniform vec2 size;in vec2 tex;in vec2 val;flat in vec4 rect;flat in vec4 region;flat in float center;out vec4 color;void main(){vec4 s;if(center>.5){vec2 p=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y);vec2 ratio=(p-rect.xy)/(rect.zw-rect.xy);vec2 source=region.xy+ratio*(region.zw-region.xy);ivec2 at=clamp(ivec2(floor(source)),ivec2(0),textureSize(image,0)-ivec2(1));s=texelFetch(image,at,0);}else{s=texture(image,tex);}color=vec4(s.rgb*val.y,s.a)*val.x;}');
      this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vs);gl.deleteShader(fs);
      this.buffer=gl.createBuffer();this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const[i,n,offset]of[[0,2,0],[1,2,8],[2,2,16],[3,4,24],[4,4,40],[5,1,56]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,60,offset);}gl.useProgram(this.program);gl.uniform1i(gl.getUniformLocation(this.program,'image'),0);this.size=gl.getUniformLocation(this.program,'size');gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);
    }
    upload(image,revision=0){
      if(this.lost)throw Error('WebGL context lost');const g=this.gl,old=this.textures.get(image);if(old&&old.revision===revision)return false;
      const bytes=image.width*image.height*4;if(image.width>g.getParameter(g.MAX_TEXTURE_SIZE)||image.height>g.getParameter(g.MAX_TEXTURE_SIZE)||this.bytes-(old?old.bytes:0)+bytes>this.maxTextureBytes)throw Error('Texture budget exceeded');
      const texture=old?old.texture:g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL,g.BROWSER_DEFAULT_WEBGL);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);this.bytes+=bytes-(old?old.bytes:0);this.textures.set(image,{texture,revision,bytes});return true;
    }
    render(commands,clear=[35/255,52/255,69/255,1]){
      if(this.lost)throw Error('WebGL context lost');const g=this.gl,groups=batches(commands),data=new Float32Array(commands.length*90);for(let i=0;i<commands.length;i++){const v=vertices(commands[i]),meta=centerSampling(commands[i]);for(let k=0;k<6;k++){data.set(v.slice(k*6,k*6+6),i*90+k*15);data.set(meta,i*90+k*15+6);}}
      g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(...clear);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.uniform2f(this.size,this.canvas.width,this.canvas.height);g.bindVertexArray(this.vao);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,data,g.STREAM_DRAW);g.activeTexture(g.TEXTURE0);
      for(const b of groups){const t=this.textures.get(b.image);if(!t||t.revision!==b.revision)throw Error('Texture revision not uploaded');g.bindTexture(g.TEXTURE_2D,t.texture);const sampling=b.smoothing?g.LINEAR:g.NEAREST;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,sampling);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,sampling);
        if(b.blend==='lighter')g.blendFunc(g.ONE,g.ONE);else if(b.blend==='screen')g.blendFuncSeparate(g.ONE,g.ONE_MINUS_SRC_COLOR,g.ONE,g.ONE_MINUS_SRC_ALPHA);else g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);g.drawArrays(g.TRIANGLES,b.first,b.count);
      }
      return {commands:commands.length,drawCalls:groups.length,vertices:data.length/15,textureBytes:this.bytes};
    }
    info(){const g=this.gl,ext=g.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:ext?g.getParameter(ext.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),version:g.getParameter(g.VERSION),attributes:g.getContextAttributes(),maxTextureSize:g.getParameter(g.MAX_TEXTURE_SIZE),textures:this.textures.size,textureBytes:this.bytes};}
    dispose(){const g=this.gl;for(const t of this.textures.values())g.deleteTexture(t.texture);this.textures.clear();this.bytes=0;g.deleteBuffer(this.buffer);g.deleteVertexArray(this.vao);g.deleteProgram(this.program);}
  }
  return {normalize,vertices,centerSampling,batches,reference,OrderedGpu604};
});
