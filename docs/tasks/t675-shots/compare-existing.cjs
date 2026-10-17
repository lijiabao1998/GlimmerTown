/* T675 read-only comparison against original T634 industrial geometry. */
'use strict';
const fs=require('fs'),path=require('path'),{createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
function fn(name){const start=source.indexOf('function '+name+'('),body=source.indexOf('{',start);if(start<0)throw Error(name);let d=1,i=body+1;for(;d&&i<source.length;i++){if(source[i]==='{')d++;else if(source[i]==='}')d--;}return source.slice(start,i);}
const oldDir=path.join(root,'docs/tasks/t634-shots'),code=['shade','lotLine574','lotPoly574','lotEllipse574','hashLocal590'].map(fn).join('\n')+'\n'+['core634.js','civic634.js','industry634.js','rci634.js'].map(f=>fs.readFileSync(path.join(oldDir,f),'utf8')).join('\n')+'\nconst ART634={...CIVIC634,...INDUSTRY634,...RCI634};return {bake:bake634};';
const cv=(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];};
const api=new Function('cv','season','clamp',code)(cv,()=>0,(x,a,b)=>Math.max(a,Math.min(b,x)));
const cases=[[1,1,'Existing forge'],[1,4,'Existing weavers'],[1,8,'Existing bottle kiln'],[2,4,'Existing brewery'],[3,3,'Existing large brewery']];
const c=createCanvas(1500,400),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#e4e8df';g.fillRect(0,0,c.width,c.height);
cases.forEach(([lv,v,name],i)=>{const s=api.bake(3,v,1,lv,1,2,false,0),q=Math.min(3,260/s.w,320/s.h);g.drawImage(s.img,i*300+150-s.ax*q,340-s.ay*q,s.w*q,s.h*q);g.fillStyle='#304a4b';g.font='17px sans-serif';g.fillText(name,i*300+15,380);});
fs.writeFileSync(process.argv[2],c.toBuffer('image/png'));
