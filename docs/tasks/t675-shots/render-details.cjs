/* T675 工坊候選樣張；Canvas native 預覽，不冒充 Chrome 或 CI 指紋。 */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),{createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const ctx={window:{},location:{search:''},Map,Math,Error,cv:(w,h)=>{const c=createCanvas(w,h);return[c,c.getContext('2d')];},shade:(c,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')};
vm.createContext(ctx);vm.runInContext(slice('function lotLine574(', 'function lotVariant574(')+slice('function makeIso590(','function silhouette590(')+fs.readFileSync(path.join(__dirname,'art675.js'),'utf8')+'\nthis.bake675=bake675;this.names675=CATALOG675.map(d=>d.id);',ctx);
const out=process.argv[2]||path.join(root,'artifacts','t675-preview');fs.mkdirSync(out,{recursive:true});
for(const night of[false,true]){const c=createCanvas(1260,680),g=c.getContext('2d');g.fillStyle=night?'#1d2b37':'#e4e8df';g.fillRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;[1,2,9].forEach((i,j)=>{const s=ctx.bake675(i,false,1),x=j*420+10,y=480-s.h*5;g.globalAlpha=night?.48:1;g.drawImage(s.img,x,y,s.w*5,s.h*5);g.globalAlpha=1;if(night)g.drawImage(s.night,x,y,s.w*5,s.h*5);g.globalAlpha=night?.48:1;g.drawImage(s.img,x+160,520);g.globalAlpha=1;if(night)g.drawImage(s.night,x+160,520);g.fillStyle=night?'#c4d1d1':'#304a4b';g.font='18px sans-serif';g.fillText((i+1)+' '+ctx.names675[i]+' 5x / native',x+20,650);});fs.writeFileSync(path.join(out,`detail-${night?'night':'day'}.png`),c.toBuffer('image/png'));}
