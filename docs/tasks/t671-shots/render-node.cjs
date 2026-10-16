/* T671 快速結構樣張；Canvas native 預覽，不冒充 Chrome 或 CI 指紋。 */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),{createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const ctx={window:{},location:{search:''},Map,Math,Error,cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
vm.createContext(ctx);vm.runInContext(slice('function lotLine574(', 'function lotVariant574(')+slice('function makeIso590(','function silhouette590(')+slice('/* T671：第二波','/* T671 END')+'\nthis.bake671=bake671;this.names671=CATALOG671.map(d=>d.id);',ctx);
const out=process.argv[2]||path.join(root,'artifacts','t671-preview');fs.mkdirSync(out,{recursive:true});
for(const night of[false,true])for(const snow of[false,true]){
 const c=createCanvas(1200,650),g=c.getContext('2d');g.fillStyle=night?'#1d2b37':'#e4e8df';g.fillRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;
 for(let i=0;i<10;i++){const s=ctx.bake671(i,snow,snow?3:1),x=10+(i%5)*240,y=30+Math.floor(i/5)*310;g.globalAlpha=night?.48:1;g.drawImage(s.img,x,y+(94-s.h)*3,s.w*3,s.h*3);g.globalAlpha=1;if(night)g.drawImage(s.night,x,y+(94-s.h)*3,s.w*3,s.h*3);g.fillStyle=night?'#c4d1d1':'#304a4b';g.font='14px sans-serif';g.fillText((i+1)+' '+ctx.names671[i],x+15,y+290);}
 fs.writeFileSync(path.join(out,`sheet-${night?'night':'day'}-${snow?'snow':'clear'}.png`),c.toBuffer('image/png'));
}
