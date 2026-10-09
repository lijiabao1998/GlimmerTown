// T603 projected actor-clearance review. Offline art-only guard; does not boot a world or touch saves.
// Supplementary center-sampled raster evidence; never a replacement for real Chromium image review.
// Usage: node review603-probe.js /path/index.html [/path/art603.js|-] [padding=1]
// "-" reads the integrated T603 block from index.html. Exit 1 means a clearance or lighting failure.
'use strict';
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const sourcePath=process.argv[2]||'index.html',artPath=process.argv[3]||'-',padding=Number(process.argv[4]??1);
if(!Number.isInteger(padding)||padding<0||padding>3)throw Error('padding must be integer 0..3');
const src=fs.readFileSync(sourcePath,'utf8');
const start='/* ===== T603 藍灰社區公共設施：',end='/* ===== T603 區塊結束 ===== */';
const ai=src.indexOf(start),aj=src.indexOf(end,ai);
const art=artPath==='-'?(ai>=0&&aj>ai?src.slice(ai,aj+end.length):''):fs.readFileSync(artPath,'utf8');
if(!art.includes('const ART603='))throw Error('T603 art block missing');

function fn(n){let s=src.indexOf('function '+n+'(');if(s<0||src.indexOf('function '+n+'(',s+1)>=0)throw Error('Expected unique function '+n);let a=src.indexOf('{',s),d=1,i=a+1;for(;d;i++){if(src[i]==='{')d++;if(src[i]==='}')d--;}return src.slice(s,i);}
let active='raw',args=[],contexts=[];
function context(w,h){const c={w,h,grid:Array(w*h).fill(null),tags:Array(w*h).fill(null),globalCompositeOperation:'source-over',fillStyle:'#000',stack:[],save(){this.stack.push([this.globalCompositeOperation,this.fillStyle])},restore(){[this.globalCompositeOperation,this.fillStyle]=this.stack.pop()},fillRect(x,y,ww,hh){for(let yy=Math.round(y);yy<Math.round(y+hh);yy++)for(let xx=Math.round(x);xx<Math.round(x+ww);xx++){if(xx<0||yy<0||xx>=w||yy>=h)continue;let j=xx+yy*w;this.grid[j]=this.globalCompositeOperation==='destination-out'?null:this.fillStyle;this.tags[j]=this.globalCompositeOperation==='destination-out'?null:[active,args]}},clearRect(x,y,ww,hh){const z=this.globalCompositeOperation;this.globalCompositeOperation='destination-out';this.fillRect(x,y,ww,hh);this.globalCompositeOperation=z;}};contexts.push(c);return c;}
const globals={console,window:{},season:()=>0,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),LOT_PLAN574:{29:['recycling',2],85:['senior',2],92:['dogpark',2],88:['compost',2]},lotSpec574:()=>true,lotHookCache574:new Map(),lotKey591:()=>'',cv:(w,h)=>{const c=context(w,h);return[c,c]}};vm.createContext(globals);
let code=['shade','lotLine574','lotPoly574','lotEllipse574','kit602','hashLocal590','streetHash'].map(fn).join('\n')+'\n'+art.replace('function kit603(T){','function realKit603(T){');
code+='\nfunction kit603(T){const K=realKit603(T);const O={};for(const [k,f]of Object.entries(K))O[k]=(...a)=>{const old=active,oa=args;active=k;args=a;try{return f(...a)}finally{active=old;args=oa}};return O;}';
Object.defineProperty(globals,'active',{get(){return active},set(v){active=v}});Object.defineProperty(globals,'args',{get(){return args},set(v){args=v}});
vm.runInContext(code,globals);

// Sprite masks copied from the unchanged T368/T155 shape contract. Fail if source contract moves.
for(const pin of ["SPR.lifeDog=[0,1].map(f=>{const[c,g]=cv(6,4);","return {img:c,ax:3,ay:4,w:6,h:4}","mkPed(3,5,g=>","1+Math.sin(visT*(.6+ph369*.3)+ph369*6.283)*.2","1+Math.cos(visT*(.9+ph369*.2)+ph369*4)*.4",".95,1+Math.sin(visT*.4+oh*6.283)*.3"]){
 if(!src.includes(pin))throw Error('Actor projection/mask source changed: '+pin);
}
const dog=f=>[[1,1],[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2],[f?0:1,3],[f?4:3,3],[4,0],[5,0],[5,1],[0,0]];
const adult=f=>[[1,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[f?2:0,3],[f?2:0,4]];
const shadowColors=new Set(['#748575','#c8d4ce']); // kit602 house casts a painted ground shadow, not a solid wall.
const results={source:crypto.createHash('sha256').update(src).digest('hex'),art:crypto.createHash('sha256').update(art).digest('hex'),padding,step:.005,clearance:[],lighting:[]};
for(let variant=0;variant<3;variant++)for(const winter of[false,true]){
 const s=vm.runInContext('bakeArt603(92,'+variant+',2,'+winter+')',globals),g=s.img,found={};let tested=0;
 const hit=(u,v,frame,isAdult)=>{
  tested++;const X=s.ax+(u-v)*32,Y=s.ay-64+(u+v)*16,ax=isAdult?2:3,ay=isAdult?5:4,ps=isAdult?adult(frame):dog(frame);
  for(const[dx,dy]of ps)for(let py=-padding;py<=padding;py++)for(let px=-padding;px<=padding;px++){
   const x=Math.round(X-ax)+dx+px,y=Math.round(Y-ay)+dy+py;
   if(x<0||y<0||x>=s.w||y>=s.h)throw Error('Actor outside canvas');
   const j=y*s.w+x,tag=g.tags[j],col=g.grid[j];
   if(tag&&!['yard','ground'].includes(tag[0])&&!shadowColors.has(col)){
    const key=(isAdult?'adult':'dog')+JSON.stringify(tag);
    found[key]??={actor:isAdult?'adult':'dog',u,v,frame,x,y,color:col,obstacle:tag};
   }
  }
 };
 // Sweep the entire activity rectangle, including extrema; stronger than finitely sampled time phases.
 for(let iu=0;iu<=80;iu++)for(let iv=0;iv<=160;iv++)for(let frame=0;frame<2;frame++)hit(.8+iu*.005,.6+iv*.005,frame,false);
 for(let iv=0;iv<=120;iv++)for(let frame=0;frame<2;frame++)hit(.95,.7+iv*.005,frame,true);
 results.clearance.push({variant,winter,tested,collisions:Object.values(found)});
}
for(const k of[29,85,92,88])for(let v=0;v<3;v++)for(const winter of[false,true]){
 const s=vm.runInContext('bakeArt603('+k+','+v+',2,'+winter+')',globals),d=s.img,n=s.night;let light=0,orphan=0;
 for(let i=0;i<n.grid.length;i++)if(n.grid[i]){light++;if(!['#aacbd0','#dfddbd'].includes(d.grid[i]))orphan++;}
 results.lighting.push({k,v,winter,light,orphan,smoke:s.smoke.length});
}
const ok=results.clearance.every(r=>r.collisions.length===0)&&results.lighting.every(r=>r.light>0&&r.orphan===0&&r.smoke===0);
console.log('T603_PROJECTED_RESULT '+JSON.stringify({...results,ok}));
if(!ok)process.exitCode=1;
