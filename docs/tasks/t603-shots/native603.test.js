// Focused tests only: source provenance, PNG decoding, and the test-only wrong-edge wrapper.
'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),zlib=require('zlib');
const {assertNativeSource603,pngRgba603,pixelDelta603,snapshotUnchanged603,NATIVE_BLOCKS,BASE_INDEX_SHA256}=require('./native603.js');
const ROOT=path.resolve(__dirname,'../../..'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
let checks=0;const ok=(value,message)=>{assert(value,message);checks++;console.log('PASS: T603 native '+message);};
const result=assertNativeSource603(html,ok);ok(result.baseSHA256===BASE_INDEX_SHA256,'clean art inverse matches immutable main hash');
for(const [name,change]of[
  ['reflection alpha',s=>s.replace(NATIVE_BLOCKS[0],NATIVE_BLOCKS[0].replace('globalAlpha=.22','globalAlpha=.23'))],
  ['shadow draw bounds',s=>s.replace(NATIVE_BLOCKS[1],NATIVE_BLOCKS[1].replace('s.w*z,shH','s.w*z-1,shH'))],
  ['added native clip',s=>s.replace(NATIVE_BLOCKS[0],NATIVE_BLOCKS[0].replace("ctx.filter='brightness(0)';","ctx.clip();ctx.filter='brightness(0)';"))],
  ['removed-helper reintroduction',s=>s+'\nfunction clipFilter603(){}'],
  ['obsolete clip escape reintroduction',s=>s+'\nwindow.__noClip603=true;'],
  ['approved art block drift',s=>s.replace('function kit603', '/* unintended artwork edit */function kit603')],
  ['unapproved code outside art inverse',s=>s+'\nwindow.extraRenderer603=true;'],
  ['missing approved depth hook',s=>s.replace('objs.push({dep:lifeDepth603(x,y,t.bld,t.bld.lot574?_iso[2]:viewDep(x,y)),dog:{hx:ph369}','objs.push({dep:0,dog:{hx:ph369}')]
]){assert.throws(()=>assertNativeSource603(change(html)));ok(true,'source contract rejects '+name);}
// Independent PNG fixtures encode all five row filters, RGB and RGBA, including Paeth edge cases.
const crc32=bytes=>{let r=0xffffffff;for(const x of bytes){r^=x;for(let k=0;k<8;k++)r=r&1?0xedb88320^(r>>>1):r>>>1;}return (r^0xffffffff)>>>0;};
const chunk=(kind,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length,0);b.write(kind,4,4,'ascii');data.copy(b,8);b.writeUInt32BE(crc32(b.subarray(4,-4)),b.length-4);return b;};
function fixture(bpp,filter){const w=3,h=4,stride=w*bpp,input=Buffer.from(Array.from({length:stride*h},(_,i)=>(i*71+(i%7)*29+11)&255)),raw=Buffer.alloc((stride+1)*h),paeth=(a,b,c)=>{const p=a+b-c,v=[a,b,c],d=v.map(x=>Math.abs(p-x));return v[d.indexOf(Math.min(...d))];};
  for(let y=0;y<h;y++){raw[y*(stride+1)]=filter;for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?input[i-bpp]:0,b=y?input[i-stride]:0,c=y&&x>=bpp?input[i-stride-bpp]:0,p=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];raw[y*(stride+1)+x+1]=(input[i]-p)&255;}}
  const header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=bpp===4?6:2;
  const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
  const rgba=Buffer.alloc(w*h*4);for(let i=0,j=0;i<input.length;i+=bpp,j+=4){input.copy(rgba,j,i,i+3);rgba[j+3]=bpp===4?input[i+3]:255;}return {bytes,w,h,rgba};
}
for(const bpp of[3,4])for(let filter=0;filter<=4;filter++){const f=fixture(bpp,filter),p=pngRgba603(f.bytes);ok(p.w===f.w&&p.h===f.h&&p.rgba.equals(f.rgba),'PNG '+bpp+' channels / row filter '+filter+' decodes exact RGBA');}
const f=fixture(4,4),a=pngRgba603(f.bytes),b={...a,rgba:Buffer.from(a.rgba)};ok(pixelDelta603(a,b)===0,'identical PNG has exactly zero changed pixels');b.rgba[0]^=1;b.rgba[3]^=1;ok(pixelDelta603(a,b)===1,'one changed pixel counts once including alpha');b.rgba[4]^=1;ok(pixelDelta603(a,b)===2,'a second changed pixel is detected without tolerance');assert.throws(()=>pixelDelta603(a,{...b,w:4}));ok(true,'dimension mismatch fails closed');assert.throws(()=>pngRgba603(Buffer.from('invalid')));ok(true,'non-PNG fails closed');assert.throws(()=>pngRgba603(f.bytes.subarray(0,40)));ok(true,'truncated screenshot fails closed');
// Execute the actual bridge wrapper with a minimal stateful context. This is not a renderer substitute.
const scene=fs.readFileSync(path.join(__dirname,'scene603.js'),'utf8'),start=scene.indexOf('  function nativeDraw603('),end=scene.indexOf('  window.__s603={',start);assert(start>=0&&end>start);
const box={Path2D:class{rect(...bounds){this.bounds=bounds;}}};vm.createContext(box);vm.runInContext(scene.slice(start,end)+';this.probe=nativeDraw603;',box);
function context(){let state={filter:'brightness(0)',globalAlpha:.22,globalCompositeOperation:'source-over',matrix:{a:1,b:0,c:0,d:-.35,e:.375,f:20}};const stack=[],events=[],g={canvas:{width:1400,height:900},events,getTransform:()=>state.matrix,save(){stack.push({...state});events.push('save');},restore(){state=stack.pop();events.push('restore');},resetTransform(){state.matrix={a:1,b:0,c:0,d:1,e:0,f:0};},setTransform(m){state.matrix=m;},clip(p){events.push(['clip',...p.bounds]);},drawImage(img,...args){events.push({img,args,alpha:state.globalAlpha,filter:state.filter,blend:state.globalCompositeOperation,matrix:{...state.matrix}});}};for(const k of['filter','globalAlpha','globalCompositeOperation'])Object.defineProperty(g,k,{get:()=>state[k],set:v=>state[k]=v});return g;}
for(const mode of['native','wrong-edge']){const g=context(),draw=g.drawImage,m=g.getTransform(),img={width:144},counts=box.probe(g,()=>g.drawImage(img,10,20,180,90),mode),event=g.events.find(x=>x&&x.img);ok(g.drawImage===draw&&g.getTransform()===m&&g.globalAlpha===.22,'wrapper restores draw identity and context '+mode);ok(event.filter==='brightness(0)'&&event.alpha===.22&&event.blend==='source-over'&&event.img===img&&JSON.stringify(event.args)==='[10,20,180,90]','real native draw arguments/filter/alpha preserved '+mode);ok(counts.calls===1&&counts.reflectionCalls===1&&counts.fractionalCalls===1&&counts.fractionalScaleCalls===1,'actual mirrored fractional draw counted '+mode);ok(counts.wrongEdges===(mode==='wrong-edge'?1:0)&&g.events.filter(x=>Array.isArray(x)&&x[0]==='clip').length===counts.wrongEdges,'only deliberate negative control clips '+mode);}
const throwing=context(),originalDraw=throwing.drawImage;assert.throws(()=>box.probe(throwing,()=>{throw Error('render failed');},'wrong-edge'));ok(throwing.drawImage===originalDraw,'render exception restores original draw function');
const failedDraw=context(),failing=function(){throw Error('native draw failed');},matrix=failedDraw.getTransform();failedDraw.drawImage=failing;assert.throws(()=>box.probe(failedDraw,()=>failedDraw.drawImage({width:144},0,0,144,208),'wrong-edge'));ok(failedDraw.drawImage===failing&&failedDraw.getTransform()===matrix&&failedDraw.events.at(-1)==='restore','native draw exception restores negative-control clip context');
// Execute the actual frame bridge: expected draw(dt) clock increments are not capture drift.
const frameStart=scene.indexOf('    compositorFrame:('),frameEnd=scene.indexOf('    nativeFrame:',frameStart);assert(frameStart>=0&&frameEnd>frameStart);
const frameExpression=scene.slice(frameStart,frameEnd).trim().replace(/^compositorFrame:/,'').replace(/,$/,'');
const frameBox={running:false,measureWork603:false,window:{},trafClock:0,waterT:0,waterF:0,visT:0,cam:{x:0,y:0,z:1},ctx:{},actorHash:'fixed',nativeDraw603:(g,render)=>{render();return{calls:1};}};
frameBox.compositorState603=()=>({running:frameBox.running,actors:frameBox.actorHash,counts:{cars:1},visT:frameBox.visT,trafClock:frameBox.trafClock,waterT:frameBox.waterT,waterF:frameBox.waterF});
frameBox.__s603={freezeVis:t=>{frameBox.visT=t;},viewport:()=>({width:1400,height:900,dpr:1}),flags:()=>({T603:true})};
frameBox.GV={forceDraw:()=>{frameBox.trafClock+=.016;frameBox.waterT+=.016;}};
vm.createContext(frameBox);vm.runInContext('this.frame='+frameExpression,frameBox);
const post=frameBox.frame(false,100),postRepeat=frameBox.frame(false,100);
ok(post.trafClock===100+.016&&post.waterT===.016,'real native draw clock advance is retained by frame bridge');
ok(snapshotUnchanged603(post,postRepeat),'reset plus native draw produces identical post-draw snapshot clocks');
ok(snapshotUnchanged603(post,frameBox.compositorState603()),'stationary post-draw presentation passes');
for(const key of['visT','trafClock','waterT','waterF'])ok(!snapshotUnchanged603(post,{...post,[key]:post[key]+.001}),'presentation-time clock drift rejected: '+key);
ok(!snapshotUnchanged603(post,{...post,actors:'moved'})&&!snapshotUnchanged603(post,{...post,running:true}),'actor changes and resumed simulation rejected during presentation');
frameBox.running=true;assert.throws(()=>frameBox.frame(false,100));frameBox.running=false;frameBox.measureWork603=true;assert.throws(()=>frameBox.frame(false,100));ok(true,'frame snapshots reject live update and performance windows');
console.log('T603_NATIVE_RESULT '+JSON.stringify({checks,baseIndexSHA256:result.baseSHA256,sourceSHA256:result.sourceSHA256}));
