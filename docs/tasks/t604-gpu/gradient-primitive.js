'use strict';

// Experimental direct paint semantics only. The 8x8 dither construction and
// half-precision stages follow Skia 0873ec164a06966b90ae0d43ef783cfb180084ae.
// Copyright 2023 Google LLC. See SKIA-LICENSE.txt for the BSD license.
function gradientPrimitive604(ctx, cvs) {
  let definitions = new Map(), paints = [], selected = [], layer, native, output, gl, program, vao, uniforms;
  let lastRows, lastMode = 2, lastShape = false;
  const modes = ['float-no-dither', 'float-dither', 'half-dither'];
  const identity = m => JSON.stringify(m) === '[1,0,0,1,0,0]';
  const rgba = value => {
    const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(value);
    if (!m) throw Error('Unsupported proof stop color: ' + value);
    return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255, m[4] === undefined ? 1 : Number(m[4])];
  };
  function capture() {
    definitions = new Map(); paints = []; selected = [];
    const old = {}, gradients = [];
    for (const method of ['createLinearGradient', 'createRadialGradient']) {
      old[method] = ctx[method];
      ctx[method] = function(...args) {
        const gradient = old[method].apply(this, args);
        const record = { kind: method, args: args.map(Math.fround), stops: [] };
        const add = gradient.addColorStop;
        gradient.addColorStop = function(offset, color) {
          const result = add.call(this, offset, color);
          record.stops.push({ offset: Math.fround(offset), css: color });
          return result;
        };
        gradients.push({ gradient, add }); definitions.set(gradient, record);
        return gradient;
      };
    }
    let captured;
    try { captured = __atlas604.capture(); }
    finally {
      for (const [k, fn] of Object.entries(old)) ctx[k] = fn;
      for (const { gradient, add } of gradients) gradient.addColorStop = add;
    }
    const reject = {}, trace = __atlas604.nativePrefixParts().trace;
    const rejected = reason => { reject[reason] = (reject[reason] || 0) + 1; };
    for (let index = 0; index < trace.length; index++) {
      const op = trace[index];
      if (!op.state || !definitions.has(op.state.fillStyle)) continue;
      const def = definitions.get(op.state.fillStyle), a = def.args;
      if (op.name !== 'fill' && op.name !== 'fillRect') { rejected('not-fill'); continue; }
      if (def.kind !== 'createRadialGradient') { rejected('not-radial'); continue; }
      if (!identity(op.transform) || op.state.filter !== 'none' || op.state.shadowBlur || op.state.shadowOffsetX || op.state.shadowOffsetY) { rejected('transform-or-shadow'); continue; }
      if (a[0] !== a[3] || a[1] !== a[4] || a[2] !== 0 || a[5] <= 0) { rejected('nonconcentric'); continue; }
      if (def.stops.length < 2 || def.stops.length > 4 || def.stops[0].offset !== 0 || def.stops.at(-1).offset !== 1) { rejected('stop-layout'); continue; }
      if (a[0] + a[5] <= 0 || a[1] + a[5] <= 0 || a[0] - a[5] >= cvs.width || a[1] - a[5] >= cvs.height) { rejected('offscreen'); continue; }
      let colors;
      try { colors = def.stops.map(s => rgba(s.css)); } catch { rejected('non-rgb-color'); continue; }
      if (op.state.globalAlpha === 0 || colors.every(c => c[3] === 0)) { rejected('transparent'); continue; }
      const path = op.path || [], arc = path.find(p => p.name === 'arc');
      const fullCircle = path.length === 2 && path[0].name === 'beginPath' && arc && identity(arc.transform) &&
        Math.fround(arc.args[0]) === a[0] && Math.fround(arc.args[1]) === a[1] && Math.fround(arc.args[2]) === a[5] &&
        arc.args[3] === 0 && arc.args[4] >= Math.PI * 2 && !arc.args[5] && colors.at(-1)[3] === 0;
      paints.push({ sourceIndex: index, op, gradient: op.state.fillStyle, definition: def,
        circle: !!fullCircle, cx: a[0], cy: a[1], radius: a[5], colors,
        offsets: def.stops.map(s => s.offset), alpha: op.state.globalAlpha, blend: op.state.globalCompositeOperation });
    }
    // Deterministic coverage: largest distinct fields, then exact native circles.
    const keys = new Set(), add = p => {
      const k = JSON.stringify([p.cx, p.cy, p.radius, p.definition.stops, p.alpha, p.blend]);
      if (!keys.has(k)) { keys.add(k); selected.push(p); }
    };
    paints.slice().sort((a, b) => b.radius - a.radius || a.sourceIndex - b.sourceIndex).slice(0, 6).forEach(add);
    paints.filter(p => p.circle).slice(0, 6).forEach(add);
    selected.sort((a, b) => a.sourceIndex - b.sourceIndex);
    if (!selected.length) throw Error('No captured radial gradient fields for this bounded proof');
    return { captured, radialDefinitions: [...definitions.values()].filter(d => d.kind === 'createRadialGradient').length,
      eligiblePaints: paints.length, exactCirclePaints: paints.filter(p => p.circle).length, rejected: reject,
      selected: selected.map(({ op, gradient, ...p }) => p), note: 'Fields preserve captured gradient parameters, original device coordinates and paint alpha/blend. Field cases deliberately isolate gradient color from path coverage; exact full-circle cases additionally test original shape coverage.' };
  }
  function setup() {
    layer = document.createElement('div'); layer.style = 'position:fixed;inset:0;z-index:2147483647;background:#233445';
    layer.style.setProperty('visibility', 'visible', 'important');
    const make = id => { const c = document.createElement('canvas'); c.id = id; c.width = cvs.width; c.height = cvs.height;
      c.style = 'position:absolute;inset:0;width:100%;height:100%'; c.style.setProperty('visibility', 'visible', 'important'); layer.append(c); return c; };
    native = make('gradient-native604').getContext('2d'); output = make('gradient-gpu604'); document.body.append(layer);
    gl = output.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) throw Error('WebGL2 unavailable');
    const vertex = `#version 300 es
      precision highp float;
      const vec2 V[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
      void main(){gl_Position=vec4(V[gl_VertexID],0,1);}`;
    const fragment = `#version 300 es
      precision highp float;
      precision highp int;
      uniform vec2 size;
      uniform vec4 norm;
      uniform vec4 colors[4];
      uniform vec4 offsets;
      uniform int stops;
      uniform int variant;
      uniform int shape;
      uniform vec3 circle;
      uniform float paintAlpha;
      out vec4 outColor;
      vec2 h2(vec2 v){return unpackHalf2x16(packHalf2x16(v));}
      vec4 h4(vec4 v){return variant==2?vec4(h2(v.xy),h2(v.zw)):v;}
      float h1(float v){return variant==2?h2(vec2(v,0)).x:v;}
      float dither(ivec2 p){
        int x=p.x&7,y=p.y&7;
        int n=((y&1)<<5)|((x&1)<<4)|((y&2)<<2)|((x&2)<<1)|((y&4)>>1)|((x&4)>>2);
        float byteValue=floor((float(n)+.5)*255./64.+.5);
        return h1(h1(byteValue/255.)-.5);
      }
      void main(){
        vec2 p=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y);
        float t=clamp(length(p*norm.xy+norm.zw),0.,1.);
        vec4 color=colors[stops-1];
        for(int i=1;i<4;i++){if(i>=stops)break;if(t<offsets[i]){color=mix(colors[i-1],colors[i],(t-offsets[i-1])/(offsets[i]-offsets[i-1]));break;}}
        color=h4(color);
        color=h4(vec4(color.rgb*color.a,color.a));
        color=h4(color*h1(paintAlpha));
        if(variant!=0){float noise=h1(dither(ivec2(floor(p)))*h1(1./255.));color.rgb=clamp(h4(vec4(color.rgb+noise,color.a)).rgb,vec3(0),vec3(color.a));}
        if(shape==1){float d=length(p-circle.xy);float coverage=d==0.?1.:clamp(.5+(circle.z*circle.z-d*d)/(2.*d),0.,1.);color*=coverage;}
        outColor=color;
      }`;
    const shader = (kind, text) => { const s = gl.createShader(kind); gl.shaderSource(s, text); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
    const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vs); gl.deleteShader(fs); vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    uniforms = Object.fromEntries(['size', 'norm', 'colors', 'offsets', 'stops', 'variant', 'shape', 'circle', 'paintAlpha'].map(k => [k, gl.getUniformLocation(program, k)]));
    gl.useProgram(program); gl.uniform2f(uniforms.size, cvs.width, cvs.height); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DITHER); gl.enable(gl.BLEND);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { viewport: [cvs.width, cvs.height], renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), attributes: gl.getContextAttributes(), shaderVariantCount: modes.length, sourceTextures: 0, hardwareDither: gl.isEnabled(gl.DITHER), nativeReadbackPolicy: 'fresh native canvas for each reference and repeat; one read per context' };
  }
  function nativePaint(rows, circleMode = false) {
    // Repeated reads can change a Canvas backend. Use one fresh native source
    // per reference, repeat or negative, with only one read from that source.
    if (native) native.canvas.remove();
    const c = document.createElement('canvas'); c.width = cvs.width; c.height = cvs.height;
    c.style = 'position:absolute;inset:0;width:100%;height:100%'; c.style.setProperty('visibility', 'visible', 'important');
    layer.insertBefore(c, output); native = c.getContext('2d');
    native.resetTransform(); native.globalAlpha = 1; native.globalCompositeOperation = 'source-over'; native.filter = 'none';
    native.fillStyle = '#233445'; native.fillRect(0, 0, cvs.width, cvs.height);
    for (const p of rows) {
      native.globalAlpha = p.alpha; native.globalCompositeOperation = p.blend;
      if (p.sentinel) { native.fillStyle = '#905831'; native.fillRect(0, 0, cvs.width, cvs.height); continue; }
      native.fillStyle = p.gradient;
      if (circleMode) { for (const op of p.op.path) native[op.name](...op.args); native.fill(...p.op.args); }
      else native.fillRect(0, 0, cvs.width, cvs.height);
    }
  }
  function gpuPaint(rows, mode, circleMode = false) {
    gl.viewport(0, 0, cvs.width, cvs.height); gl.clearColor(35/255,52/255,69/255,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program); gl.bindVertexArray(vao); gl.uniform1i(uniforms.variant, mode); gl.uniform1i(uniforms.shape, circleMode ? 1 : 0);
    for (const p of rows) {
      if (p.sentinel) { gl.clearColor(144/255,88/255,49/255,1); gl.clear(gl.COLOR_BUFFER_BIT); continue; }
      const inv = Math.fround(1 / p.radius);
      gl.uniform4f(uniforms.norm, inv, inv, Math.fround(-p.cx*inv), Math.fround(-p.cy*inv));
      const colors = p.colors.map(c => c.slice()), offsets = p.offsets.slice();
      while (colors.length < 4) { colors.push(colors.at(-1).slice()); offsets.push(1); }
      gl.uniform4fv(uniforms.colors, new Float32Array(colors.flat())); gl.uniform4fv(uniforms.offsets, new Float32Array(offsets));
      gl.uniform1i(uniforms.stops, p.colors.length); gl.uniform1f(uniforms.paintAlpha, p.alpha); gl.uniform3f(uniforms.circle, p.cx, p.cy, p.radius);
      if (p.blend === 'lighter') gl.blendFunc(gl.ONE, gl.ONE);
      else if (p.blend === 'screen') gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else if (p.blend === 'multiply') gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else if (p.blend === 'source-over') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else throw Error('Unsupported direct gradient blend');
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    lastRows = rows; lastMode = mode; lastShape = circleMode;
  }
  function readGPU() {
    const raw = new Uint8Array(cvs.width*cvs.height*4), out = new Uint8Array(raw.length), stride = cvs.width*4;
    gl.readPixels(0,0,cvs.width,cvs.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);
    for(let y=0;y<cvs.height;y++)out.set(raw.subarray((cvs.height-1-y)*stride,(cvs.height-y)*stride),y*stride);
    return out;
  }
  const difference = (a,b) => {let changedPixels=0,maxChannelDelta=0,over1=0,over5=0,alphaChanged=0;
    for(let i=0;i<a.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(a[i+k]-b[i+k]));if(d)changedPixels++;if(d>1)over1++;if(d>5)over5++;if(a[i+3]!==b[i+3])alphaChanged++;maxChannelDelta=Math.max(maxChannelDelta,d);}
    return {changedPixels,maxChannelDelta,over1,over5,alphaChanged};};
  const hash = async a => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  async function compare(rows, circleMode = false, includeImages = false) {
    nativePaint(rows,circleMode); const expected=native.getImageData(0,0,cvs.width,cvs.height).data;
    nativePaint(rows,circleMode); const nativeRepeat=difference(expected,native.getImageData(0,0,cvs.width,cvs.height).data),results=[];let lastActual;
    for(let mode=0;mode<modes.length;mode++){
      gpuPaint(rows,mode,circleMode);const actual=readGPU();lastActual=actual;gpuPaint(rows,mode,circleMode);const repeat=difference(actual,readGPU());
      results.push({mode:modes[mode],difference:difference(expected,actual),repeat,rgbaSHA256:await hash(actual)});
    }
    const result={nativeRepeat,nativeRGBA:await hash(expected),variants:results,shape:circleMode?'original-full-circle':'gradient-field'};
    if(includeImages){const c=document.createElement('canvas');c.width=cvs.width;c.height=cvs.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(lastActual),cvs.width,cvs.height),0,0);result.images={native:native.canvas.toDataURL('image/png'),gpu:c.toDataURL('image/png')};}
    return result;
  }
  async function prove() {
    const cases=[];
    for(const p of selected){cases.push({sourceIndex:p.sourceIndex,field:await compare([p])});if(p.circle)cases.at(-1).circle=await compare([p],true);}
    const sequence=await compare(selected,false,true),sentinel={sentinel:true,alpha:1,blend:'source-over'},mid=Math.max(1,Math.floor(selected.length/2));
    const ordered=[...selected.slice(0,mid),sentinel,...selected.slice(mid)],wrong=[...selected,sentinel];
    nativePaint(ordered);const goodNative=native.getImageData(0,0,cvs.width,cvs.height).data;
    nativePaint(wrong);const wrongNative=native.getImageData(0,0,cvs.width,cvs.height).data;
    gpuPaint(ordered,2);const goodGL=readGPU();gpuPaint(wrong,2);const wrongGL=readGPU();gpuPaint(ordered,2);const restored=readGPU();
    const radiusWrong=selected.map(p=>({...p,radius:p.radius*1.25}));gpuPaint(selected,2);const correct=readGPU();gpuPaint(radiusWrong,2);const wrongRadius=readGPU();gpuPaint(selected,2);
    nativePaint(selected);
    const negative={wrongOrderNative:difference(goodNative,wrongNative),wrongOrderGL:difference(goodGL,wrongGL),restored:difference(goodGL,restored),wrongRadius:difference(correct,wrongRadius)};
    return {cases,sequence,negative,glError:gl.getError(),performanceSamples:0,
      exactGo:cases.every(c=>c.field.variants[2].difference.changedPixels===0&&(!c.circle||c.circle.variants[2].difference.changedPixels===0))&&sequence.variants[2].difference.changedPixels===0,
      note:'Direct ordered GPU radial fields and eligible original circle paints only. No atlas relocation, intermediate paint grouping, original image commands, HUD or simulation. All differences are retained; no tolerance change.'};
  }
  function show(which){native.canvas.style.display=which==='native'?'block':'none';output.style.display=which==='gpu'?'block':'none';if(which==='gpu')gpuPaint(lastRows,lastMode,lastShape);}
  function dispose(){if(gl){gl.deleteProgram(program);gl.deleteVertexArray(vao);}if(layer)layer.remove();layer=native=output=gl=program=vao=null;}
  window.__gradient604={capture,setup,prove,show,dispose};
}
module.exports={gradientPrimitive604};
