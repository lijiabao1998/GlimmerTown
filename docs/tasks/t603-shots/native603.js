// Native-renderer contract and exact screenshot comparison. No browser, product mutation, or cache.
'use strict';
const assert=require('assert/strict'),crypto=require('crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const APPROVED_NATIVE_SHA256='99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d';
const BASE_INDEX_SHA256='b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265';
// These unchanged blocks are bound to immutable main 637c8cc by sourceBaseline603.
const NATIVE_BLOCKS=[
  "        ctx.save();\n        ctx.translate(ax2,ay2);ctx.scale(1,-.35);\n        ctx.filter='brightness(0)';\n        ctx.globalAlpha=.22;\n        ctx.drawImage(rs.img,-rs.ax*z,-rs.ay*z,rs.w*z,rs.h*z);\n        ctx.restore();",
  "      const shH=Math.max(2,s.h*z*.32);\n      ctx.save();\n      ctx.filter='brightness(0)';\n      ctx.globalAlpha=shadowA;\n      ctx.drawImage(s.img,bx+SHOX*z,by+s.h*z-shH+SHOY*z,s.w*z,shH);\n      ctx.restore();"
];
function assertNativeSource603(source,check=(value,message)=>assert(value,message)){
  check(!/clipFilter603|__noClip603/.test(source),'production has no T603 clip helper, calls, or clip-mode escape');
  for(const [i,block] of NATIVE_BLOCKS.entries())check(source.split(block).length===2,'unchanged native '+(i?'shadow':'reflection')+' save/filter/alpha/draw/restore block');
  check((source.match(/ctx\.filter='brightness\(0\)'/g)||[]).length===2,'exactly two original native filter sites');
  const base=sourceBaseline603(source,check);
  check(hash(source)===APPROVED_NATIVE_SHA256,'approved art, variant hooks and owner/dog depth preserved in exact clean native candidate');
  return {base,baseSHA256:hash(base),sourceSHA256:hash(source),nativeBlockSHA256:NATIVE_BLOCKS.map(hash)};
}
function sourceBaseline603(source,check=(value,message)=>assert(value,message)){
  let base=source;const start='\n\n/* ===== T603 藍灰社區公共設施：',end='/* ===== T603 區塊結束 ===== */\n';const lo=base.indexOf(start),hi=base.indexOf(end,lo);check(lo>=0&&hi>lo,'unique new art block for exact-base reconstruction');base=base.slice(0,lo)+base.slice(hi+end.length);
  for(const [a,b]of [
    ["const GAME_VER='11.212'","const GAME_VER='11.211'"],
    ['objs.push({dep:lifeDepth603(x,y,t.bld,t.bld.lot574?_iso[2]:viewDep(x,y)),dog:{hx:ph369}', 'objs.push({dep:(t.bld.lot574?_iso[2]:viewDep(x,y))+.016,dog:{hx:ph369}'],
    ["objs.push({dep:lifeDepth603(x,y,t.bld,t.bld.lot574?_iso2[2]:viewDep(x,y)),ped:{ptype:'adult',hx:oh}", "objs.push({dep:(t.bld.lot574?_iso2[2]:viewDep(x,y))+.016,ped:{ptype:'adult',hx:oh}"],
    ['  if(LOT603.has(k)&&t603On())return Math.max(0,Math.min(2,v|0)); // T603：社區設施三款\n',''],
    ['&&!(LOT603.has(k)&&t603On())',''],
    ["if(LOT603.has(k)&&t603On())return '_t603_s'+season();",''],
    ['if(b&&LOT603.has(b.k)&&t603On())return v603(b.k,x,y,b);',''],
    ['  if(LOT603.has(k)&&t603On()){const r603=bakeArt603(k,v,stage,winter);if(r603)return r603;} // T603：本批原創園區；獨立快取與回退\n','']
  ]){check(base.split(a).length===2,'exact-base inverse anchor '+a.slice(0,45));base=base.replace(a,b);}
  const sha=hash(base);check(sha==='b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265','reconstructed base exactly matches immutable main index SHA256');return base;
}
function pngRgba603(bytes){
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Not PNG');
  let w,h,bpp;const idat=[];
  for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p),kind=bytes.toString('ascii',p+4,p+8),data=bytes.subarray(p+8,p+8+n);if(kind==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);if(data[8]!==8||![2,6].includes(data[9])||data[12]!==0||w>8192||h>8192)throw Error('Unsupported screenshot PNG');bpp=data[9]===6?4:3;}if(kind==='IDAT')idat.push(data);p+=n+12;if(kind==='IEND')break;}
  if(!w||!h||!bpp)throw Error('Incomplete PNG');const raw=require('zlib').inflateSync(Buffer.concat(idat)),stride=w*bpp,pixels=Buffer.alloc(w*h*bpp),rgba=Buffer.alloc(w*h*4);if(raw.length!==(stride+1)*h)throw Error('PNG row length mismatch');
  const paeth=(a,b,c)=>{const p=a+b-c,A=Math.abs(p-a),B=Math.abs(p-b),C=Math.abs(p-c);return A<=B&&A<=C?a:B<=C?b:c;};
  for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Unknown PNG filter');for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?pixels[i-bpp]:0,b=y?pixels[i-stride]:0,c=y&&x>=bpp?pixels[i-stride-bpp]:0,predict=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);pixels[i]=(raw[y*(stride+1)+1+x]+predict)&255;}}
  for(let i=0,j=0;i<pixels.length;i+=bpp,j+=4){rgba[j]=pixels[i];rgba[j+1]=pixels[i+1];rgba[j+2]=pixels[i+2];rgba[j+3]=bpp===4?pixels[i+3]:255;}return {w,h,rgba};
}
function pixelDelta603(a,b){if(a.w!==b.w||a.h!==b.h)throw Error('Screenshot dimensions differ');let n=0;for(let i=0;i<a.rgba.length;i+=4)if(a.rgba[i]!==b.rgba[i]||a.rgba[i+1]!==b.rgba[i+1]||a.rgba[i+2]!==b.rgba[i+2]||a.rgba[i+3]!==b.rgba[i+3])n++;return n;}
function snapshotUnchanged603(a,b){return !a.running&&!b.running&&a.actors===b.actors&&['visT','trafClock','waterT','waterF'].every(k=>a[k]===b[k]);}

module.exports={APPROVED_NATIVE_SHA256,BASE_INDEX_SHA256,NATIVE_BLOCKS,assertNativeSource603,sourceBaseline603,pngRgba603,pixelDelta603,snapshotUnchanged603};
