/* T634：全批英式美術候選。只讀視覺，不改模擬／舊精靈；預設關閉，逐家族按需烘焙。 */
const REMAIN634=new Set([1,2,3,9,16,22,24,25,26,27,31,45,46,49,50,51,54,57,58,59,62,64,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,86,89,90,91,93,94,96,98,99,100,101,103,107,109,110,111,112,115,116,118,119,120,121,122,123,124,125,126,127,128,129,131,132,133]);
const LEGACY634=new Set([8,29,53,60,63,66,85,88,92,104,117]);
function t634On(){if(t634On.u===undefined){const q=(typeof location!=='undefined'&&location.search)||'';t634On.u=/(?:^|[?&])T634=1(?:&|$)/.test(q);t634On.off=/(?:^|[?&])noT634(?:=1)?(?:&|$)/.test(q);}return !window.__noT634&&!t634On.off&&(window.__t634===true||t634On.u);}
function v634(k,x,y,bd){if(k<=3)return ((bd.v|0)%12+12)%12;return bd.v?((bd.v|0)%3+3)%3:Math.min(2,Math.floor(hashLocal590(x|0,y|0,k*131+634)*3));}
/* T634 舊足跡的煙粒跟在所屬本體之後，仍在前景鄰樓之前；不改任何粒子/建築欄位。 */
function orderSmoke634(objs){
  if(!t634On()||!objs.some(o=>o.smoke&&o.smoke.lot574))return objs;
  const owners=new Map(),attached=new Set();
  for(const o of objs){const b=o.t&&o.t.bld;if(b&&!b.ref&&!b.lot574&&(REMAIN634.has(b.k)||LEGACY634.has(b.k)))owners.set(o.x+','+o.y,{node:o,sz:b.sz||1,after:[]});}
  for(const o of objs){const q=o.smoke&&o.smoke.lot574,owner=q&&owners.get(q.x+','+q.y);if(owner&&owner.sz===q.sz){owner.after.push(o);attached.add(o);}}
  if(!attached.size)return objs;
  const after=new Map([...owners.values()].filter(r=>r.after.length).map(r=>[r.node,r.after])),out=[];
  for(const o of objs)if(!attached.has(o)){out.push(o);const children=after.get(o);if(children)for(const child of children)out.push(child);}
  for(let i=0;i<out.length;i++)objs[i]=out[i];return objs;
}
const CACHE634=new Map(),STAT634={bakes:0,hits:0,fail:0,pixels:0},LIMIT634={entries:192,pixels:16000000};
function kit634(T){
  const {g,ng,P,quad,poly,line,ell,LIT,box,occlude}=T,W=T.winter,sea=T.sea;
  const px=(x,y,c,w=1,h=1)=>{x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));g.fillStyle=c;g.fillRect(x,y,w,h);ng.clearRect(x,y,w,h);};
  const face=(ps,c)=>{occlude(ps);poly(g,ps,c);};
  const ln=(a,b,c,wd=1)=>{line(g,a,b,c,wd);ng.save();ng.globalCompositeOperation='destination-out';line(ng,a,b,'#000',wd);ng.restore();};
  const ground=(u,v,du,dv,c)=>face(quad(u,v,du,dv),W?'#dce4df':c);
  const lamp=(u,v,h=16)=>{const p=P(u,v,h);ln(P(u,v),p,'#26383c',2);px(p[0]-3,p[1]-2,'#26383c',7,5);LIT(p[0]-2,p[1]-1,5,3,'#e3d2a2','#ffd78b');};
  const text=(x,y,label,col)=>{const glyph={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['011','100','101','101','011'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['001','001','001','101','010'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],P:['110','101','110','100','100'],Q:['010','101','101','111','011'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111']};let off=0;for(const c of String(label||'').toUpperCase().slice(0,10)){const rows=glyph[c];if(rows)for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(rows[j][i]==='1')px(x+off+i,y+j,col);off+=4;}};
  const sign=(u,v,h,label,col='#284d4b')=>{const p=P(u,v,h),w=Math.min(43,String(label||'').length*4+5);px(p[0]-w/2-1,p[1]-4,'#c9b893',w+2,9);px(p[0]-w/2,p[1]-3,col,w,7);text(Math.round(p[0]-w/2+3),Math.round(p[1]-2),label,'#f3e3b8');};
  const chimney=(u,v,h)=>{box(u,v,.07,.07,9,{left:'#744b40',right:'#a56750',top:'#bd8e73'},h);for(const z of[3,6]){ln(P(u,v+.07,h+z),P(u+.07,v+.07,h+z),'#b28164');ln(P(u+.07,v,h+z),P(u+.07,v+.07,h+z),'#754b3e');}box(u-.009,v-.009,.088,.088,2,{left:'#9d8c73',right:'#bfac8d',top:W?'#e9eeeb':'#d4c2a2'},h+8);for(const d of[.014,.05]){const p=P(u+d,v+.04,h+11);px(p[0]-1,p[1]-3,'#835741',3,4);px(p[0]-1,p[1]-3,'#b47c57',1,4);px(p[0]-1,p[1]-3,'#413c35',3,1);T.hooks.smoke||(T.hooks.smoke=[]);T.hooks.smoke.push([p[0],p[1]-3]);}};
  const fence=(u,v,du,dv)=>{for(const [a,b]of[[[u,v],[u+du,v]],[[u+du,v],[u+du,v+dv]],[[u+du,v+dv],[u,v+dv]],[[u,v+dv],[u,v]]]){const dist=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(2,Math.ceil(dist/.11));ln(P(a[0],a[1],5),P(b[0],b[1],5),'#394446');ln(P(a[0],a[1],2),P(b[0],b[1],2),'#53605c');for(let i=0;i<=steps;i++){const t=i/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;ln(P(x,y),P(x,y,7),'#303c3e');}}};
  const hedge=(u,v,du,dv)=>box(u,v,du,dv,5,{left:sea===2?'#766d3d':'#405949',right:sea===2?'#918447':'#5f7650',top:W?'#e6ece7':sea===2?'#a18c4c':'#7d9360'});
  const tree=(u,v,r=.16)=>{const p=P(u,v),rx=Math.max(3,r*32),ry=Math.max(4,r*26),h=12+Math.min(9,r*15),c=sea===2?'#b08243':sea===1?'#55734d':'#628357';ln(p,[p[0],p[1]-h],'#655441',2);const ps=[[p[0]-rx-1,p[1]-h-ry-1],[p[0]+rx+1,p[1]-h-ry-1],[p[0]+rx+1,p[1]-h+ry+1],[p[0]-rx-1,p[1]-h+ry+1]];occlude(ps);ell(g,p[0],p[1]-h,rx,ry,'#334b40');ell(g,p[0]-1,p[1]-h-2,rx-1,ry-1,c);ell(g,p[0]-3,p[1]-h-4,Math.max(1,rx-4),Math.max(1,ry-4),W?'#edf2ed':sea===2?'#d4ad62':'#90a66c');};
  const water=(u,v,du,dv)=>{face(quad(u,v,du,dv),W?'#b5cbd0':'#678e9a');for(let a=.1;a<.9;a+=.2)ln(P(u+du*.12,v+dv*a),P(u+du*.7,v+dv*a),W?'#e6eeea':'#a1bdba');};
  const tank=(u,v,r,h,col='#a5afb0')=>{const p=P(u,v),top=P(u,v,h),rx=r*32,ry=r*16;occlude([[p[0]-rx,p[1]-h-ry],[p[0]+rx,p[1]-h-ry],[p[0]+rx,p[1]+ry],[p[0]-rx,p[1]+ry]]);g.fillStyle=shade(col,-22);g.fillRect(Math.round(p[0]-rx),Math.round(top[1]),Math.ceil(rx*2),Math.ceil(h));ell(g,p[0],p[1],rx,ry,shade(col,-20));ell(g,top[0],top[1],rx,ry,W?'#e9efed':col);ln([p[0]-rx+2,top[1]+1],[p[0]-rx+2,p[1]],shade(col,20));};
  const house=(u,v,du,dv,h,opt={})=>{
    const stone=opt.stone===true,brick=opt.color||(stone?'#c4b397':'#ae715a'),front=shade(brick,8),side=shade(brick,-28),trim=stone?'#e5d6b7':'#d7c5a2',roof=W?'#e1e9e4':'#465660',pitch=opt.roof==='flat'?0:(opt.pitch===undefined?Math.min(15,6+du*5):opt.pitch),fl=Math.max(1,opt.floors||Math.round(h/15));
    box(u,v,du,dv,h,{left:front,right:side,top:roof,edge:'#564f44'});
    /* 勒腳、樓層腰線與轉角石：紋理依結構分段，不灑遍整面噪點。 */
    for(const z of[1,3]){ln(P(u,v+dv,z),P(u+du,v+dv,z),z===1?shade(front,-35):shade(trim,-22),z===1?2:1);ln(P(u+du,v,z),P(u+du,v+dv,z),z===1?shade(side,-28):shade(trim,-36),z===1?2:1);}
    for(let z=7;z<h-3;z+=stone?7:5){ln(P(u,v+dv,z),P(u+du,v+dv,z),shade(front,stone?-10:-6));ln(P(u+du,v,z),P(u+du,v+dv,z),shade(side,stone?-9:-5));}
    for(let f=1;f<fl;f++){const z=h*f/fl;ln(P(u,v+dv,z),P(u+du,v+dv,z),shade(trim,-12),2);ln(P(u+du,v,z),P(u+du,v+dv,z),shade(trim,-35));}
    const qw=Math.min(.075,du*.16),qv=Math.min(.075,dv*.16);
    for(let z=4;z<h-3;z+=6){const zw=Math.min(4,h-z-2),q=qw*(z%12===4?1:.7),r=qv*(z%12===4?.7:1);face([P(u+du-q,v+dv,z),P(u+du,v+dv,z),P(u+du,v+dv,z+zw),P(u+du-q,v+dv,z+zw)],shade(trim,-20));face([P(u+du,v+dv-r,z),P(u+du,v+dv,z),P(u+du,v+dv,z+zw),P(u+du,v+dv-r,z+zw)],shade(trim,-42));if(du>.38)face([P(u,v+dv,z),P(u+q,v+dv,z),P(u+q,v+dv,z+zw),P(u,v+dv,z+zw)],stone?shade(trim,-13):shade(brick,15));}
    const nw=Math.max(1,Math.floor(du*32/12)),ns=Math.max(1,Math.floor(dv*32/13));
    const sash=(a,b,z,right)=>{const p=P(a,b,z),w=Math.max(1,Math.min(3,Math.floor((right?dv/ns:du/nw)*8))),hh=Math.max(3,Math.min(9,h/fl-5)),x=Math.round(p[0]),y=Math.round(p[1]),fr=right?shade(trim,-26):trim;
      px(x-w-1,y-hh-1,'#334347',w*2+3,hh+3);px(x-w,y-hh-1,fr,w*2+1,hh+1);px(x-w+1,y-hh,'#293e47',Math.max(1,w*2-1),hh);
      LIT(x-w+1,y-hh+1,Math.max(1,w*2-1),Math.max(1,hh-2),right?'#3f5965':'#557481','#f8d894');
      if(w>=2)px(x,y-hh+1,shade(fr,-6),1,Math.max(1,hh-2));if(hh>=5)px(x-w,y-Math.ceil(hh/2),fr,w*2+1,1);
      px(x-w-1,y-hh-3,shade(fr,-12),w*2+3,2);px(x-w-1,y+1,fr,w*2+3,1);px(x-w,y+2,right?shade(side,-24):shade(front,-24),w*2+2,1);if(stone&&w>=2)px(x,y-hh-4,trim,1,3);
    };
    for(let f=0;f<fl;f++){const z=4+f*(h/fl);for(let i=0;i<nw;i++)sash(u+du*(i+.5)/nw,v+dv,z,false);for(let i=0;i<ns;i++)sash(u+du,v+dv*(i+.5)/ns,z,true);}
    /* 門洞有內縮陰影、門扇分格與門檻；矮亭依真實高度收窄。 */
    const dr=P(u+du*.5,v+dv,1),dh=Math.max(5,Math.min(11,h-3)),dw=Math.max(2,Math.min(3,du*7));px(dr[0]-dw-1,dr[1]-dh-2,shade(trim,-26),dw*2+3,dh+3);px(dr[0]-dw,dr[1]-dh-1,trim,dw*2+1,dh+1);px(dr[0]-dw+1,dr[1]-dh,'#263d3e',Math.max(2,dw*2-1),dh);px(dr[0]-dw+2,dr[1]-dh+1,opt.shop?'#4a676d':'#36534b',Math.max(1,dw*2-2),dh-2);px(dr[0]-dw+1,dr[1]-Math.ceil(dh*.5),'#667970',Math.max(2,dw*2-1),1);px(dr[0]+1,dr[1]-4,'#c8a873');px(dr[0]-dw-1,dr[1]+1,shade(trim,-9),dw*2+3,2);
    if(h>=18)LIT(dr[0]-2,dr[1]-dh+1,4,2,'#435d64','#ddc796');
    if(pitch&&opt.roof==='hip'){
      const a=P(u,v,h),b=P(u+du,v,h),c=P(u+du,v+dv,h),d=P(u,v+dv,h),r1=P(u+du*.5,v+dv*.22,h+pitch),r2=P(u+du*.5,v+dv*.78,h+pitch);face([a,b,r1],W?'#d8e3de':'#53626b');face([a,r1,r2,d],roof);face([b,c,r2,r1],W?'#cbd9d4':'#33464e');face([d,r2,c],W?'#eaf0eb':'#61717a');
      for(let q=.25;q<1;q+=.25){const left=[d[0]+(r2[0]-d[0])*q,d[1]+(r2[1]-d[1])*q],right=[c[0]+(r2[0]-c[0])*q,c[1]+(r2[1]-c[1])*q];ln(left,right,W?'#d2ded9':'#73818a');}ln(r1,r2,W?'#f1f4ec':'#899590');ln(d,r2,W?'#edf2eb':'#718087');
    }else if(pitch){
      const a=P(u,v,h),b=P(u+du,v,h),c=P(u+du,v+dv,h),d=P(u,v+dv,h),r1=P(u+du*.5,v,h+pitch),r2=P(u+du*.5,v+dv,h+pitch);face([a,r1,r2,d],roof);face([r1,b,c,r2],W?'#cedbd7':'#34454f');face([d,c,r2],stone?'#c9bda3':'#b87f62');
      ln([d[0],d[1]+1],[r2[0],r2[1]+1],'#3d484b',2);ln([c[0],c[1]+1],[r2[0],r2[1]+1],'#3d484b',2);ln(d,r2,trim);ln(c,r2,trim);ln(r1,r2,W?'#f3f5ed':'#879590',2);
      for(let f=.23;f<.98;f+=.23){const e=[a[0]+(r1[0]-a[0])*f,a[1]+(r1[1]-a[1])*f],q=[d[0]+(r2[0]-d[0])*f,d[1]+(r2[1]-d[1])*f];ln(e,q,W?'#d9e3df':'#62717a');if(dv>.45)for(let j=1;j<Math.floor(dv*3);j++){const t=j/Math.floor(dv*3),xx=e[0]+(q[0]-e[0])*t,yy=e[1]+(q[1]-e[1])*t;ln([xx,yy],[xx-2,yy-2],W?'#cbd8d5':'#3e505b');}}
      if(du>.35){const p=P(u+du*.5,v+dv,h+pitch*.32);px(p[0]-3,p[1]-3,shade(trim,-25),7,6);px(p[0]-2,p[1]-2,trim,5,5);LIT(p[0]-1,p[1]-1,3,3,'#4d6b73','#f3ce86');px(p[0],p[1]-1,trim,1,3);}
    }else{const rim=quad(u,v,du,dv,h+2);ln([rim[3][0],rim[3][1]+2],[rim[2][0],rim[2][1]+2],'#3d4c50',2);ln([rim[2][0],rim[2][1]+2],[rim[1][0],rim[1][1]+2],'#3d4c50',2);ln(rim[3],rim[2],trim,2);ln(rim[2],rim[1],trim,2);}
    ln(P(u,v+dv,h),P(u+du,v+dv,h),W?'#e3ebe6':'#293e45',2);ln(P(u+du,v,h),P(u+du,v+dv,h),W?'#c4d4d1':'#32484d',2);ln(P(u+du-.012,v+dv,h-1),P(u+du-.012,v+dv,3),'#5b6865');
    if(opt.chimney!==false)chimney(u+du*.19,v+dv*.32,h+pitch*.65);
    if(opt.bay){const bw=Math.min(.22,du*.28),bh=Math.min(h-3,15),bu=u+du*.12,bv=v+dv-.035;box(bu,bv,bw,.1,bh,{left:trim,right:'#a69a83',top:roof});ln(P(bu,bv+.1,2),P(bu+bw,bv+.1,2),shade(trim,-22),2);for(let i=0;i<2;i++)sash(bu+bw*(i+.5)/2,bv+.1,3,false);ln(P(bu,bv+.1,bh),P(bu+bw,bv+.1,bh),W?'#edf1eb':'#6d7b7e',2);}
    if(opt.porch){const pu=u+du*.5,pv=v+dv+.015,w=Math.min(.1,du*.25),depth=Math.max(.025,Math.min(.07,T.n-pv-.02)),ph=Math.min(12,h-2);face([P(pu-w-.02,pv-.03,1),P(pu+w+.02,pv-.03,1),P(pu+w+.02,pv+depth,1),P(pu-w-.02,pv+depth,1)],'#bcb29b');for(const q of[pu-w,pu+w]){ln(P(q,pv+depth),P(q,pv+depth,ph),shade(trim,-25),3);ln(P(q-.01,pv+depth),P(q-.01,pv+depth,ph),trim);}
      const roofPs=[P(pu-w-.03,pv-.06,ph),P(pu+w+.03,pv-.06,ph),P(pu+w+.03,pv+depth+.005,ph),P(pu-w-.03,pv+depth+.005,ph)];face(roofPs,roof);ln(roofPs[3],roofPs[2],trim,2);ln(P(pu-w,pv+depth,2),P(pu+w,pv+depth,2),'#d5c9ad',2);}
    if(opt.shop){const p=P(u+du*.5,v+dv,13),ww=Math.min(du*30,25);px(p[0]-ww/2,p[1]-3,'#365954',ww,5);for(const a of[.18,.78]){const q=P(u+du*a,v+dv,2);px(q[0]-4,q[1]-9,'#c5baa0',8,9);LIT(q[0]-3,q[1]-8,6,7,'#608b92','#fbd49a');px(q[0],q[1]-8,'#cfbf9d',1,7);}sign(u+du*.5,v+dv,14,opt.sign||'SHOP',opt.signColor||'#365954');}else if(opt.sign)sign(u+du*.5,v+dv,Math.min(15,h*.55),opt.sign);
    return {u,v,du,dv,h,pitch};
  };
  const tower=(u,v,du,dv,h,opt={})=>{house(u,v,du,dv,h,{...opt,floors:opt.floors||Math.max(2,Math.floor(h/14)),chimney:false,roof:opt.roof||'flat'});if(opt.clock){const p=P(u+du*.5,v+dv,h-8);px(p[0]-4,p[1]-4,'#e6d8ae',9,9);ln([p[0],p[1]],[p[0],p[1]-3],'#3b4948');ln([p[0],p[1]],[p[0]+2,p[1]+1],'#3b4948');}};
  const court=(u,v,du,dv,type)=>{ground(u,v,du,dv,type==='ice'?'#bed5d6':type==='tennis'?'#71836a':'#977d67');const p=quad(u+.03,v+.03,du-.06,dv-.06);for(let i=0;i<4;i++)ln(p[i],p[(i+1)%4],'#e5dfc7');ln(P(u+du*.5,v),P(u+du*.5,v+dv),'#e6e3cc');if(type==='tennis')ln(P(u+du*.5,v),P(u+du*.5,v+dv),'#354847',2);};
  return {px,face,ln,ground,house,tower,chimney,sign,fence,hedge,water,tank,court,tree,lamp,text};
}
/* 同一支純繪圖三葉轉子：烘焙定格、真實動畫、倒影與接觸表共用輪廓。 */
function paintRotor634(ctx,x,y,radius,angle,z=1,winter=false){
  if(![x,y,radius,angle,z].every(Number.isFinite)||radius<=0||z<=0)return;
  const p=(a,d,q)=>[x+(Math.cos(a)*d-Math.sin(a)*q)*z,y+(Math.sin(a)*d+Math.cos(a)*q)*z],fill=ctx.fillStyle;
  ctx.save();
  for(let j=0;j<3;j++){
    const a=angle+j*Math.PI*2/3,ps=[p(a,1.2,-1.3),p(a,radius*.3,-2),p(a,radius-.8,-.65),p(a,radius,0),p(a,radius*.34,1.8)];
    lotPoly574(ctx,ps,winter?'#e9eee7':'#d4ded7');
    lotLine574(ctx,p(a,radius*.23,1.45),p(a,radius*.84,.27),winter?'#c2d3cf':'#a0b5b0',Math.max(1,Math.round(z)));
  }
  lotEllipse574(ctx,Math.round(x),Math.round(y),Math.max(1,Math.round(3*z)),Math.max(1,Math.round(3*z)),'#829b9a');
  lotEllipse574(ctx,Math.round(x-z*.5),Math.round(y-z*.5),Math.max(1,Math.round(1.4*z)),Math.max(1,Math.round(1.4*z)),winter?'#e6ece4':'#bfcfc5');
  ctx.restore();ctx.fillStyle=fill;
}
/* 額外轉子底圖也計入留存像素，不能只算日／夜兩張。 */
function spritePixels634(s){return s.w*s.h*(s.rotorBase634?3:2);}
function bake634(k,v,n,lv=1,we=1,stage=2,winter=false,sea=season()){
  const art=ART634[k];if(!art)return null;
  const w=n*64+16,h=n*32+192,ax=w/2,ay=h-8,top=ay-n*32,[c,g]=cv(w,h),[nc,ng]=cv(w,h);
  const P=(u,vv,z=0)=>[ax+u*32-vv*32,top+u*16+vv*16-z],quad=(u,vv,du,dv,z=0)=>[P(u,vv,z),P(u+du,vv,z),P(u+du,vv+dv,z),P(u,vv+dv,z)];
  const poly=(q,ps,col)=>lotPoly574(q,ps,col),line=(q,a,b,col,wd=1)=>lotLine574(q,a,b,col,wd),ell=(q,x,y,rx,ry,col)=>lotEllipse574(q,x,y,rx,ry,col);
  const occlude=ps=>{ng.save();ng.globalCompositeOperation='destination-out';poly(ng,ps,'#000');ng.restore();};
  const LIT=(x,y,ww,hh,dc,ncol)=>{x=Math.round(x);y=Math.round(y);ww=Math.max(1,Math.round(ww));hh=Math.max(1,Math.round(hh));g.fillStyle=dc;g.fillRect(x,y,ww,hh);ng.fillStyle=ncol;ng.fillRect(x,y,ww,hh);};
  const box=(u,vv,du,dv,bh,col,z0=0)=>{const a=quad(u,vv,du,dv,z0),b=quad(u,vv,du,dv,z0+bh),l=[a[3],a[2],b[2],b[3]],r=[a[2],a[1],b[1],b[2]];occlude(l);occlude(r);occlude(b);poly(g,l,col.left);poly(g,r,col.right);poly(g,b,col.top);if(col.edge){line(g,b[3],b[2],col.edge);line(g,b[2],b[1],col.edge);line(g,a[2],b[2],col.edge);}return b;};
  const H=(a,b,s=0)=>hashLocal590(Math.round(a*997)+k*13,Math.round(b*991)+v*17,s+634),hooks={};
  const T={k,v,n,lv,we,stage,sea,winter,g,ng,P,quad,poly,line,ell,LIT,H,box,occlude,shade,hooks};T.tree=(...a)=>kit634(T).tree(...a);T.car=(u,v,col)=>box(u,v,.2,.12,4,{left:shade(col,-25),right:col,top:shade(col,12)});
  art.draw(T);
  let rotorRaw634=null;
  if(hooks.rotors&&hooks.rotors.length&&!hooks.rotorStatic){
    const[rc,rg]=cv(w,h);rg.drawImage(c,0,0);rotorRaw634=rc;
    for(const p of hooks.rotors){paintRotor634(g,p[0],p[1],p[2],-.4,1,winter);ng.save();ng.globalCompositeOperation='destination-out';paintRotor634(ng,p[0],p[1],p[2],-.4,1,winter);ng.restore();}
  }
  /* 只在烘焙時裁掉透明天際；錨點與全部掛點一起移動，施工樓板與懸停不用虛假的空白高度。 */
  const pixels=g.getImageData(0,0,w,h).data;let y0=h;for(let y=0;y<h&&y0===h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]){y0=Math.max(0,y-2);break;}
  if(y0===h)throw Error('T634 empty sprite '+k);
  if(rotorRaw634)for(const p of hooks.rotors)y0=Math.min(y0,Math.max(0,Math.floor(p[1]-p[2]-3))); /* 留足整圈葉尖，不能只按定格角度裁切。 */
  const nh=h-y0,[ic,ig]=cv(w,nh),[lc,lg]=cv(w,nh);ig.drawImage(c,0,y0,w,nh,0,0,w,nh);lg.drawImage(nc,0,y0,w,nh,0,0,w,nh);
  let rotorBase634=null;if(rotorRaw634){const[bc,bg]=cv(w,nh);bg.drawImage(rotorRaw634,0,y0,w,nh,0,0,w,nh);rotorBase634=bc;}
  const move=p=>[p[0],p[1]-y0,...p.slice(2)],hh={};for(const key in hooks){const a=hooks[key];hh[key]=Array.isArray(a)&&typeof a[0]==='number'?move(a):Array.isArray(a)?a.map(move):a;}
  const smoke=[...(hh.smoke||[]),...(hh.steam||[])].map(p=>({dx:p[0]-ax,dy:p[1]-(ay-y0)}));
  return {img:ic,night:lc,...(rotorBase634?{rotorBase634}:{}),w,h:nh,ax,ay:ay-y0,__t590:1,__t601:1,__t596:1,__t634:1,smoke,lotMeta574:{sz:n,kind:k,variant:v,stage,winter,ground:[ax,top-y0,n*32],feet:[],hooks:hh,order574:[],cycles574:0,t591:false}};
}
function legacyArt634(k,v,n,winter,stage){
  const src=LOT603.has(k)?bakeArt603(k,v,stage,winter):LOT602.has(k)?bakeArt602(k,v,stage,winter):bakeArt601(k,v,stage,winter);if(!src)return null;
  const q=n/LOT_PLAN574[k][1],w=Math.ceil(src.w*q),h=Math.ceil(src.h*q),[c,g]=cv(w,h),[nc,ng]=cv(w,h);g.drawImage(src.img,0,0,w,h);ng.drawImage(src.night,0,0,w,h);
  const hooks={};for(const key in src.lotMeta574.hooks){const a=src.lotMeta574.hooks[key],f=p=>p.map(a=>a*q);hooks[key]=key==='playZone'?a.slice():Array.isArray(a)&&typeof a[0]==='number'?f(a):Array.isArray(a)?a.map(f):a;}
  return {...src,img:c,night:nc,w,h,ax:src.ax*q,ay:src.ay*q,__t634:1,__t596:1,lotMeta574:{...src.lotMeta574,sz:n,hooks},smoke:[...(hooks.smoke||[]),...(hooks.steam||[])].map(p=>({dx:p[0]-src.ax*q,dy:p[1]-src.ay*q}))};
}
function spr634(bd,x=0,y=0,winter=false,stage=2,gen=true){
  if(!t634On()||!bd||bd.ref||(!REMAIN634.has(bd.k)&&!(LEGACY634.has(bd.k)&&!bd.lot574)))return null;
  const k=bd.k,n=bd.sz||1,lv=k<=3?Math.min(3,Math.max(1,bd.lv|0)):1,we=k===1?Math.max(0,Math.min(2,bd.we===undefined?1:bd.we)):1,v=v634(k,x,y,bd),sea=season(),key=[k,v,n,lv,we,stage,+winter,sea].join('_');
  if(CACHE634.has(key)){const s=CACHE634.get(key);CACHE634.delete(key);CACHE634.set(key,s);STAT634.hits++;return s;}if(!gen)return null;
  let s;try{s=LEGACY634.has(k)?legacyArt634(k,v,n,winter,stage):bake634(k,v,n,lv,we,stage,winter,sea);}catch(e){STAT634.fail++;return null;}if(!s)return null;
  const pixels=spritePixels634(s);while(CACHE634.size&&(CACHE634.size>=LIMIT634.entries||STAT634.pixels+pixels>LIMIT634.pixels)){const first=CACHE634.keys().next().value,old=CACHE634.get(first);STAT634.pixels-=spritePixels634(old);CACHE634.delete(first);}CACHE634.set(key,s);STAT634.pixels+=pixels;STAT634.bakes++;return s;
}
