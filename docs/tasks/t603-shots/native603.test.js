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
frameBox.compositorState603=()=>({running:frameBox.running,actors:frameBox.actorHash,sky:'fixed-sky',counts:{cars:1},visT:frameBox.visT,trafClock:frameBox.trafClock,waterT:frameBox.waterT,waterF:frameBox.waterF});
frameBox.__s603={freezeVis:t=>{frameBox.visT=t;},viewport:()=>({width:1400,height:900,dpr:1}),flags:()=>({T603:true})};
frameBox.GV={forceDraw:()=>{frameBox.trafClock+=.016;frameBox.waterT+=.016;}};
vm.createContext(frameBox);vm.runInContext('this.frame='+frameExpression,frameBox);
const post=frameBox.frame(false,100),postRepeat=frameBox.frame(false,100);
ok(post.trafClock===100+.016&&post.waterT===.016,'real native draw clock advance is retained by frame bridge');
ok(snapshotUnchanged603(post,postRepeat),'reset plus native draw produces identical post-draw snapshot clocks');
ok(snapshotUnchanged603(post,frameBox.compositorState603()),'stationary post-draw presentation passes');
for(const key of['visT','trafClock','waterT','waterF'])ok(!snapshotUnchanged603(post,{...post,[key]:post[key]+.001}),'presentation-time clock drift rejected: '+key);
ok(!snapshotUnchanged603(post,{...post,actors:'moved'})&&!snapshotUnchanged603(post,{...post,running:true}),'actor changes and resumed simulation rejected during presentation');
ok(!snapshotUnchanged603(post,{...post,sky:'different'})&&!snapshotUnchanged603({...post,sky:undefined},{...post,sky:undefined}),'changed or missing sky input rejected during presentation');
frameBox.running=true;assert.throws(()=>frameBox.frame(false,100));frameBox.running=false;frameBox.measureWork603=true;assert.throws(()=>frameBox.frame(false,100));ok(true,'frame snapshots reject live update and performance windows');
// Exercise the actual snapshot input setter and thaw path. Only the disposable
// test context has deterministic random streams; production Math.random is untouched.
const skyStart=scene.indexOf('  function snapshotStars603('),skyEnd=scene.indexOf('  function nativeDraw603(',skyStart),freezeStart=scene.indexOf('    compositorFreeze:'),freezeEnd=scene.indexOf('    compositorFrame:',freezeStart);
assert(skyStart>=0&&skyEnd>skyStart&&freezeStart>=0&&freezeEnd>freezeStart);
const freezeExpression=scene.slice(freezeStart,freezeEnd).trim().replace(/^compositorFreeze:/,'').replace(/,$/,'');
const starInit=html.slice(html.indexOf('const stars=[];'),html.indexOf('let waterF=0,waterT=0;'));
const starDrawStart=html.indexOf('  if(b<.62){',html.indexOf('function draw(dt)')),starDraw=html.slice(starDrawStart,html.indexOf('  if(!window.__noSky)',starDrawStart));
function skyContext(seed){
  let state=seed;const math=Object.create(Math);math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const calls=[],g={fillRect(...rect){calls.push({rect,alpha:this.globalAlpha});}},box={Math:math,ctx:g,b:.34,visT:100,W:1400,H:900,running:true,measureWork603:false,compositorRunning603:null,compositorStars603:null,compositorFx603:null};
  vm.createContext(box);vm.runInContext(starInit+scene.slice(skyStart,skyEnd)+';this.sky=snapshotStars603;this.freeze='+freezeExpression+';this.compositorState603=()=>({running,sky:JSON.stringify(stars)});this.starArray=stars;',box);
  return {box,draw:()=>{calls.length=0;vm.runInContext(starDraw,box);return JSON.stringify(calls);}};
}
const mainSky=skyContext(603),candidateSky=skyContext(604),originalCandidate=JSON.stringify(candidateSky.box.sky()),originalArray=candidateSky.box.starArray,mainInput=mainSky.box.sky();
ok(mainSky.draw()===mainSky.draw()&&mainSky.draw()!==candidateSky.draw(),'unchanged native star renderer is stable within a boot but differs across boot inputs');
assert.throws(()=>candidateSky.box.sky(mainInput));ok(JSON.stringify(candidateSky.box.sky())===originalCandidate,'shared sky setter rejects live rendering without changing stars');
candidateSky.box.running=false;assert.throws(()=>candidateSky.box.sky(mainInput));candidateSky.box.running=true;ok(true,'shared sky setter requires explicit compositor freeze');
candidateSky.box.freeze(true);candidateSky.box.measureWork603=true;assert.throws(()=>candidateSky.box.sky(mainInput));candidateSky.box.measureWork603=false;ok(true,'shared sky setter rejects live performance sampling');
for(const invalid of[[],mainInput.slice(1),mainInput.map((s,i)=>i?s:[NaN,0,0]),mainInput.map((s,i)=>i?s:[1,0,0]),mainInput.map((s,i)=>i?s:[0,.8,0]),mainInput.map((s,i)=>i?s:[0,0,6.28]),mainInput.map((s,i)=>i?s:[0,0])]){
  assert.throws(()=>candidateSky.box.sky(invalid));assert.equal(JSON.stringify(candidateSky.box.sky()),originalCandidate);
}
ok(candidateSky.box.compositorStars603===null,'malformed complete sky input fails atomically before saving or changing state');
const shared=candidateSky.box.sky(mainInput);ok(mainSky.draw()===candidateSky.draw(),'same 90-star input restores exact unchanged native star draw commands across boots');
shared[0][0]=.99;mainInput[0][0]=.98;ok(mainSky.draw()===candidateSky.draw(),'shared input and returned copies cannot mutate the captured sky');
const wrongSky=mainSky.box.sky();wrongSky[0]=[0,0,0];candidateSky.box.sky(wrongSky);ok(mainSky.draw()!==candidateSky.draw(),'wrong star input remains detectable by unchanged native star renderer');
candidateSky.box.sky(mainSky.box.sky());ok(mainSky.draw()===candidateSky.draw(),'restoring reference input recovers every native star draw command');
candidateSky.box.freeze(false);ok(candidateSky.box.running&&candidateSky.box.compositorStars603===null&&candidateSky.box.starArray===originalArray&&JSON.stringify(candidateSky.box.sky())===originalCandidate,'thaw restores original star values, array identity and running state');
// Execute the exact dust setter, freeze path and production dust draw branch.
// Mock draw commands establish input/identity contracts; only Chrome proves full RGBA parity.
const fxStart=scene.indexOf('  function snapshotFx603('),fxEnd=scene.indexOf('  function nativeDraw603(',fxStart);
const fxDrawStart=html.indexOf('    if(o.fx){'),fxDrawEnd=html.indexOf('    const t=o.t;',fxDrawStart);
const isoStart=html.indexOf('function viewRotEff(){'),isoEnd=html.indexOf('function rotMask(',isoStart);
assert(fxStart>=0&&fxEnd>fxStart&&fxDrawStart>=0&&fxDrawEnd>fxDrawStart&&isoStart>=0&&isoEnd>isoStart);
const particle=(i,variant=0)=>({ty:'dust',wx:i===0?-32:i*32,wy:i===0?1056:1136+i*16,vx:i*.01+variant,vy:-6,age:0,life:.5+i*.001,dep:72.015+i+variant});
function fxContext(variant){
  const calls=[],array=Array.from({length:90},(_,i)=>particle(i,variant)),g={fillRect(...rect){calls.push({rect,alpha:this.globalAlpha,color:this.fillStyle});}};
  const box={window:{},N:72,viewRot:0,ctx:g,z:1.25,ox:70,oy:123,running:true,measureWork603:false,compositorRunning603:null,compositorStars603:null,compositorFx603:null,fxParts:array,compositorState603:()=>({})};
  vm.createContext(box);vm.runInContext(html.slice(isoStart,isoEnd)+scene.slice(fxStart,fxEnd)+';this.fx=snapshotFx603;this.freeze='+freezeExpression+';',box);
  return {box,array,draw:()=>{calls.length=0;box.objs=box.fxParts.map(fx=>({fx})).sort((a,b)=>a.fx.dep-b.fx.dep);vm.runInContext('for(const o of objs){'+html.slice(fxDrawStart,fxDrawEnd)+'}',box);return JSON.stringify(calls);}};
}
const mainFx=fxContext(0),candidateFx=fxContext(1),candidateArray=candidateFx.array,candidateObjects=candidateArray.slice(),originalFx=JSON.stringify(candidateFx.box.fx()),mainFxInput=mainFx.box.fx();
assert.throws(()=>candidateFx.box.fx(mainFxInput));candidateFx.box.running=false;assert.throws(()=>candidateFx.box.fx(mainFxInput));candidateFx.box.running=true;ok(JSON.stringify(candidateFx.box.fx())===originalFx,'dust setter rejects live or unfrozen inputs atomically');
candidateFx.box.freeze(true);candidateFx.box.measureWork603=true;assert.throws(()=>candidateFx.box.fx(mainFxInput));candidateFx.box.measureWork603=false;ok(candidateFx.box.compositorFx603===null,'dust setter rejects a live performance sample before saving state');
const copyFx=()=>JSON.parse(JSON.stringify(mainFxInput));
const invalidFx=[[],mainFxInput.slice(1)];
for(const key of Object.keys(mainFxInput[0])){const value=copyFx();delete value[0][key];invalidFx.push(value);}
for(const value of[undefined,null,NaN,Infinity,'4',{},[]]){const rows=copyFx();rows[0].wx=value;invalidFx.push(rows);}
for(const [key,value]of[['ty','leaf'],['age',.01],['life',0],['unrecorded',{path:[1,2]}]]){const rows=copyFx();rows[0][key]=value;invalidFx.push(rows);}
const sparse=copyFx();delete sparse[30];invalidFx.push(sparse);
const extraArray=copyFx();extraArray.extra='unserialized';invalidFx.push(extraArray);
const symbolRow=copyFx();symbolRow[0][Symbol('extra')]=1;invalidFx.push(symbolRow);
const arrayAccessor=copyFx();Object.defineProperty(arrayAccessor,'0',{get(){throw Error('Array getter must never run');},enumerable:true});invalidFx.push(arrayAccessor);
const accessor=copyFx();Object.defineProperty(accessor[0],'wx',{get(){throw Error('Getter must never run');},enumerable:true});invalidFx.push(accessor);
for(const invalid of invalidFx){assert.throws(()=>candidateFx.box.fx(invalid));assert.equal(JSON.stringify(candidateFx.box.fx()),originalFx);assert.equal(candidateFx.box.compositorFx603,null);}
ok(true,'complete dust schema rejects omitted, extra, nested, accessor, sparse, nonfinite and wrong-stage fields atomically');
const sharedFx=candidateFx.box.fx(mainFxInput);ok(JSON.stringify(sharedFx)===JSON.stringify(mainFxInput)&&mainFx.draw()===candidateFx.draw(),'complete native dust input gives identical unchanged production draw commands');
sharedFx[0].wx+=100;mainFxInput[0].dep+=100;ok(mainFx.draw()===candidateFx.draw(),'caller and returned dust objects cannot mutate the installed snapshot');
const fxWrong=mainFx.box.fx();fxWrong[0].wx+=8;candidateFx.box.fx(fxWrong);const fxChangedDraw=candidateFx.draw();ok(fxChangedDraw!==mainFx.draw()&&fxChangedDraw.includes('[40,1443,3,3]')&&mainFx.draw().includes('[30,1443,3,3]'),'one wrong native dust actor changes the exact original visible support');
candidateFx.box.fx(mainFx.box.fx());ok(candidateFx.draw()===mainFx.draw(),'restoring complete reference dust recovers every production draw command');
const stateStart603=scene.indexOf('  const compositorState603='),stateEnd603=scene.indexOf('  function snapshotStars603(',stateStart603),hashStart603=scene.indexOf('  const snapshotHash603=');
for(const key of['cars','citizens','smokes','trains','cargoShips','tramCars','ambulances','recycleTrucks','ladderTrucks','policeCars','schoolBuses','buses','rbuses','lifeShips','rain','confetti','stars'])candidateFx.box[key]=[];
for(const key of['visT','trafClock','waterT','waterF'])candidateFx.box[key]=0;
vm.runInContext(scene.slice(hashStart603,stateEnd603)+';this.fxState=compositorState603;',candidateFx.box);
const fullFxFields=Object.keys(mainFx.box.fx()[0]);for(const key of fullFxFields){const before=candidateFx.box.fxState().fx,old=candidateFx.box.fxParts[0][key];candidateFx.box.fxParts[0][key]=key==='ty'?'debris':old+.001;assert.notEqual(candidateFx.box.fxState().fx,before,key+' is fingerprinted');candidateFx.box.fxParts[0][key]=old;assert.equal(candidateFx.box.fxState().fx,before);}
ok(true,'actual complete FX fingerprint detects every native draw, update and depth dependency');
try{candidateFx.box.fx(mainFx.box.fx());throw Error('simulated screenshot failure');}catch(error){assert.equal(error.message,'simulated screenshot failure');}finally{candidateFx.box.freeze(false);}
ok(candidateFx.box.running&&candidateFx.box.compositorFx603===null&&candidateFx.box.fxParts===candidateArray&&candidateArray.every((p,i)=>p===candidateObjects[i])&&JSON.stringify(candidateFx.box.fx())===originalFx,'thaw after failure restores array, all particle object identities, every field and running state');
candidateFx.box.freeze(true);candidateFx.box.fx(mainFx.box.fx());candidateFx.box.fx(mainFx.box.fx());candidateFx.box.freeze(false);ok(candidateArray.every((p,i)=>p===candidateObjects[i])&&JSON.stringify(candidateFx.box.fx())===originalFx,'repeated snapshot replacements retain the first original pool for thaw');
const mutatedPool=fxContext(2);mutatedPool.box.freeze(true);mutatedPool.box.fxParts[0].hiddenDependency={path:[1,2]};assert.throws(()=>mutatedPool.box.fx(mainFx.box.fx()));ok(mutatedPool.box.compositorFx603===null&&mutatedPool.box.fxParts[0].hiddenDependency.path[0]===1,'unknown original pool dependencies fail closed before overwrite');
// Exercise the actual synchronous thaw/read task, then simulate the next RAF aging dust.
const thawTask603=/const restoredInputs603=await ev\('([^']+)'\);/.exec(scene);assert(thawTask603);
const raceFx=fxContext(3);raceFx.box.freeze(true);raceFx.box.fx(mainFx.box.fx());raceFx.box.__s603={compositorFreeze:raceFx.box.freeze,snapshotStars:()=>[],snapshotFx:raceFx.box.fx};
const readAtThaw603=vm.runInContext(thawTask603[1],raceFx.box),readAtThawJSON603=JSON.stringify(readAtThaw603.fx);
raceFx.box.fxParts[0].age=.016;ok(readAtThaw603.fx[0].age===0&&raceFx.box.fxParts[0].age===.016&&readAtThawJSON603===JSON.stringify(readAtThaw603.fx),'same-task thaw verification captures detached originals before the next live RAF');
const cleanupStart603=scene.indexOf('    }catch(error){nativeWorldError603=error;throw error;}finally{'),cleanupEnd603=scene.indexOf('    // setSeason is a simulation test API',cleanupStart603);
assert(cleanupStart603>=0&&cleanupEnd603>cleanupStart603);const actualCleanup603=scene.slice(cleanupStart603,cleanupEnd603).replace('await ev(', 'ev('),cleanupReport603={};
for(const primary of[true,false]){const cleanupBox603={report:cleanupReport603,persist:()=>{},ev:()=>{throw Error('thaw transport failed');}};assert.throws(()=>vm.runInNewContext('let nativeWorldError603=null;try{'+(primary?"throw Error('primary pixel mismatch');":'')+actualCleanup603,cleanupBox603),primary?/primary pixel mismatch/:/thaw transport failed/);assert.match(cleanupReport603.nativeWorldRestoreError,/thaw transport failed/);}
ok(true,'actual cleanup preserves the primary comparison failure and records secondary thaw failures');
console.log('T603_NATIVE_RESULT '+JSON.stringify({checks,baseIndexSHA256:result.baseSHA256,sourceSHA256:result.sourceSHA256}));
