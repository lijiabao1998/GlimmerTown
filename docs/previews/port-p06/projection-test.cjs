'use strict';
/* 原生地格投影獨立守衛：讀未改 T707 的相機／點格函式，驗真正 builder 的投影，不複製被測答案。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const HERE=__dirname,ROOT=path.resolve(HERE,'../../..'),native=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),builder=fs.readFileSync(path.join(HERE,'build.cjs'),'utf8'),A=require('./native-layout.js'),L=require('../port-p05/landside-geometry.js');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),extract=(from,to)=>{assert.equal(native.split(from).length,2,'Native anchor must be unique: '+from);const start=native.indexOf(from),end=native.indexOf(to,start);assert(end>start,'Missing native end anchor '+to);return native.slice(start,end);};
const view=extract('function w2v(x,y){','function isoW2V('),point=extract('function toTile(cssX,cssY){','function isRectTool('),sx=native.split('\n').find(s=>s.includes('const sxOf=(x,y)=>')),sy=native.split('\n').find(s=>s.includes('const syOf=(x,y)=>'));
assert(sx&&sy,'Native rendering transforms required');
const matches=[...builder.matchAll(/P06\.project=\(x,y,h=0\)=>\{[^\n]+\};/g)];assert.equal(matches.length,1,'One actual renderer projection assignment');const actual=matches[0][0];
assert(builder.includes('const PP=P06.project,PL=(x,y,h=0)=>PP(x+20,y+20,h).slice(0,2);'),'Object painters must use tested projection');for(const call of['P05.paint(ctx,o.p05,PP,z)','P04.paint(ctx,o.p04,PP,z,b)','P03.paint(ctx,o.p03,PP,z)','P01B.paint(ctx,o.p01b,PL,z,b)'])assert(builder.includes(call),'Projection disconnected from '+call);
const old=actual.replaceAll('p[0]-.5','p[0]').replaceAll('p[1]-.5','p[1]');assert.notEqual(old,actual,'Half-cell red mutation must change renderer');
/* 此旋轉只建立期待的原生道路格；不讀被測 map 的回傳來產生標準答案。 */
const n=72,rotate=(x,y,q)=>q===0?[x,y]:q===1?[n-y,x]:q===2?[n-x,n-y]:[y,n-x],cases=[];
function run(projection,z=1,DPR=1){let outside=0,total=0;const rows=[];for(let q=0;q<4;q++){
 const corners=[[23,32],[26,32],[23,35],[26,35]].map(p=>rotate(...p,q)),port={key:'projection-port',x:Math.min(...corners.map(p=>p[0])),y:Math.min(...corners.map(p=>p[1])),size:3},world={width:n,height:n,cells:Array.from({length:n*n},()=>({t:2,road:0}))};
 for(let x=19;x<=43;x++){const p=rotate(x+.5,31.5,q);world.cells[Math.floor(p[1])*n+Math.floor(p[0])].road=1;}
 const frame=A.frame(world,port,q);
 for(let r=0;r<4;r++){const env=new Function('N','r','z','DPR',`const cam={x:0,y:0,z},W=1440*DPR,H=1000*DPR,ox=W/2,oy=H/2;function viewRotEff(){return r;}\n${view}\n${sx}\n${sy}\n${point}\nreturn{sxOf,syOf,toTile};`)(n,r,z,DPR),P06={map:frame.point},project=new Function('P06','sxOf','syOf','z',projection+';return P06.project;')(P06,env.sxOf,env.syOf,z),points=[];
  for(const [x,y]of L.corners({x:29.75,y:31.5,angle:Math.PI})){const pixel=project(x,y,0),cell=env.toTile(pixel[0]/DPR,pixel[1]/DPR),legal=!!world.cells[cell[1]*n+cell[0]]?.road;points.push({canonical:[x,y],screen:pixel.slice(0,2),nativeCell:cell,legal});if(!legal)outside++;total++;}
  rows.push({orientation:q,camera:r,zoom:z,DPR,points});
 }
}return{outside,total,rows};}
const red=run(old),green=run(actual);assert.equal(red.total,64);assert.equal(red.outside,32,'Known old renderer must fail target native-road guard');assert.equal(green.total,64);assert.equal(green.outside,0,'Actual renderer draws retained full truck outside real road');
let rejected=false;try{assert.equal(red.outside,0,'Native projected truck road occupancy');}catch(e){rejected=true;}assert(rejected,'Red source escaped target guard');
for(const zoom of[.5,1.1,1.8])for(const DPR of[1,2]){const r=run(actual,zoom,DPR);assert.equal(r.outside,0,'Actual renderer road projection '+zoom+'/'+DPR);cases.push(r);}
const out={status:'passed',notBrowser:true,method:'Actual unmodified native w2v/v2w/toTile + sxOf/syOf; actual build.cjs projection invoked; independent cardinal road cells; no screenshot mask/tolerance',nativeSHA256:sha(native),builderSHA256:sha(builder),projection:actual,red:{mutation:old,firstTarget:'Native projected truck road occupancy',rejected,...red},green,zoomAndDPR:cases};
fs.mkdirSync(path.join(HERE,'evidence'),{recursive:true});fs.writeFileSync(path.join(HERE,'evidence/projection-tests.json'),JSON.stringify(out,null,2)+'\n');console.log('PASS Native screen/ground projection: old 32/64 outside road, actual 0/64; 384 zoom/DPR corners valid');
