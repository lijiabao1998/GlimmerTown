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
  /* Lab 的實體量體／凹窗／連續板岩語彙，按 Town 真足跡重繪，不搬大圖縮小。 */
  const house=(u,v,du,dv,h,opt={})=>{
    const stone=opt.stone===true,brick=opt.color||(stone?'#c9b99a':'#ad6652'),front=shade(brick,3),side=shade(brick,-31),trim=stone?'#d7c8aa':'#c7b697',roof=W?'#e1e8e3':'#55636d',roofD=W?'#c2d1cf':'#424e59',pitch=opt.roof==='flat'?0:(opt.pitch===undefined?Math.min(19,8+du*6):opt.pitch),fl=Math.max(1,opt.floors||Math.round(h/15));
    box(u,v,du,dv,h,{left:front,right:side,top:roof,edge:'#52483e'});
    const wall=(r,t,z)=>r?P(u+du,v+dv*(1-t),z):P(u+du*t,v+dv,z),panel=(r,a,b,z0,z1,c)=>face([wall(r,a,z0),wall(r,b,z0),wall(r,b,z1),wall(r,a,z1)],c);
    /* 暗灰縫低對比，不把建築框成亮網；勒腳與屋簷才用較強明暗。 */
    for(const r of[0,1]){
      panel(r,0,1,0,2.4,shade(r?side:front,-20));
      for(let z=5;z<h-3;z+=stone?7:5){ln(wall(r,0,z),wall(r,1,z),shade(r?side:front,-9));const step=(stone?.24:.17)/(r?dv:du);for(let q=.08+((z/5|0)&1)*step*.5;q<.98;q+=step)ln(wall(r,q,z),wall(r,q,z-2),shade(r?side:front,-6));}
      if(stone&&du>.65)for(let z=3;z<h-3;z+=7)panel(r,r?0:.95,r?.05:1,z,z+3,shade(trim,r?-38:-15));
      if(fl>2)for(let f=1;f<fl;f++)ln(wall(r,0,h*f/fl),wall(r,1,h*f/fl),shade(r?side:front,9));
    }
    const nw=Math.max(1,Math.floor(du*32/12)),ns=Math.max(1,Math.floor(dv*32/14)),fh=h/fl;
    const sash=(r,a,b,z0,z1)=>{
      const fr=r?shade(trim,-33):trim;
      panel(r,a-.023,b+.023,z0-.6,z1+.8,shade(r?side:front,-24));
      panel(r,a,b,z0,z1,r?'#2e4249':'#394c53');
      const ps=[wall(r,a+.025,z0+.6),wall(r,b-.014,z0+.6),wall(r,b-.014,z1-.7),wall(r,a+.025,z1-.7)];face(ps,r?'#3c5662':'#526c75');poly(ng,ps,'#eace99');
      ln(wall(r,a,z0),wall(r,a,z1),fr);ln(wall(r,a,z1),wall(r,b,z1),shade(fr,-23));
      if(z1-z0>=5)ln(wall(r,a,(z0+z1)*.52),wall(r,b,(z0+z1)*.52),shade(fr,-14));
      ln(wall(r,a-.015,z0-.5),wall(r,b+.024,z0-.5),fr);ln(wall(r,a-.015,z0-1.5),wall(r,b+.024,z0-1.5),shade(r?side:front,-22));
    };
    for(const r of[0,1])for(let f=0;f<fl;f++){
      const count=r?ns:nw,ww=Math.min(.52,.16/(r?dv:du)*count),z0=f*fh+3,z1=Math.min(h-3,z0+Math.max(3,Math.min(8,fh-5)));
      for(let i=0;i<count;i++){const m=(i+.5)/count;sash(r,m-ww/count/2,m+ww/count/2,z0,z1);}
    }
    /* 門口是較深的暗面；石門楣、突出一步只佔入口，不吞掉整面磚。 */
    const dw=Math.min(.13,.09/du),dh=Math.min(11,h-3),door=opt.shop?'#35545a':'#294c41';panel(0,.5-dw,.5+dw,0,dh,'#343b36');panel(0,.5-dw+.035,.5+dw-.018,.5,dh-.7,door);ln(wall(0,.5-dw,0),wall(0,.5-dw,dh),shade(trim,-17));ln(wall(0,.5-dw,dh+.6),wall(0,.5+dw,dh+.6),trim);ln(wall(0,.5-dw-.02,.5),wall(0,.5+dw+.02,.5),trim,2);
    const handle=wall(0,.5+dw*.45,4);px(handle[0],handle[1],'#c0a375');
    /* 屋頂的簷口有實際厚度，完整坡面保留大部分原色。 */
    const eu=Math.min(.025,u,.99*T.n-u-du),ev=Math.min(.025,v,.99*T.n-v-dv),ru=u-Math.max(0,eu),rv=v-Math.max(0,ev),rw=du+Math.max(0,eu)*2,rd=dv+Math.max(0,ev)*2;
    box(ru,rv,rw,rd,2,{left:'#3a464e',right:'#293a43',top:roof},h-1);
    const a=P(ru,rv,h+1),b=P(ru+rw,rv,h+1),c=P(ru+rw,rv+rd,h+1),d=P(ru,rv+rd,h+1),mix=(x,y,t)=>[x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t];
    const slate=(aa,bb,cc,dd,co)=>{if(W)return;for(const q of[.28,.56,.82])ln(mix(aa,bb,q),mix(dd,cc,q),co);};
    if(pitch&&opt.roof==='hip'){
      const r1=P(u+du*.5,v+dv*.22,h+pitch),r2=P(u+du*.5,v+dv*.78,h+pitch);face([a,b,r1],roofD);face([a,r1,r2,d],roof);face([b,c,r2,r1],roofD);face([d,r2,c],W?'#e5ece6':'#66727b');slate(a,r1,r2,d,'#4c5a64');slate(b,r1,r2,c,'#394651');ln(r1,r2,W?'#f0f3ed':'#77818a');
    }else if(pitch){
      const r1=P(u+du*.5,rv,h+pitch),r2=P(u+du*.5,rv+rd,h+pitch);face([a,r1,r2,d],roof);face([r1,b,c,r2],roofD);face([d,c,r2],front);ln(d,r2,shade(trim,-17));ln(c,r2,shade(trim,-30));ln(r1,r2,W?'#f0f3ed':'#78828a');slate(a,r1,r2,d,'#4a5862');slate(r1,b,c,r2,'#3a4852');
      if(du>.55){const q=P(u+du*.5,v+dv,h+pitch*.32);px(q[0]-1,q[1]-2,'#354851',3,3);px(q[0]-2,q[1]+1,shade(trim,-15),5,1);}
    }else{face([a,b,c,d],W?'#dfe7df':'#727b79');ln(d,c,shade(trim,-18),2);ln(c,b,shade(trim,-40),2);ln([d[0],d[1]+2],[c[0],c[1]+2],'#37454b');}
    if(opt.chimney!==false)chimney(u+du*.19,v+dv*.32,h+pitch*.65);
    if(opt.bay){const bw=Math.min(.24,du*.31),bh=Math.min(h-3,14),bu=u+du*.12,bv=v+dv-.025;box(bu,bv,bw,.09,bh,{left:shade(trim,-14),right:shade(trim,-39),top:roof});for(const q of[.26,.72]){const pp=P(bu+bw*q,bv+.09,3);px(pp[0]-1,pp[1]-5,'#3d5762',3,5);LIT(pp[0],pp[1]-4,1,3,'#6c8990','#eacf99');}ln(P(bu,bv+.09,bh),P(bu+bw,bv+.09,bh),shade(roof,9));}
    if(opt.porch){const pu=u+du*.5,pv=v+dv+.008,pw=Math.min(.11,du*.22),dep=Math.max(.015,Math.min(.07,T.n-pv-.04)),ph=Math.min(10,h-3);face(quad(pu-pw,pv,pw*2,dep,1),'#b2a286');for(const q of[pu-pw,pu+pw])ln(P(q,pv+dep),P(q,pv+dep,ph),shade(trim,-16),2);face(quad(pu-pw-.012,pv-.015,pw*2+.024,dep+.025,ph),roof);ln(P(pu-pw,pv+dep,ph),P(pu+pw,pv+dep,ph),'#3c484e');}
    if(opt.shop){const p=P(u+du*.5,v+dv,12);for(const a of[.19,.78]){const q=P(u+du*a,v+dv,2);px(q[0]-3,q[1]-7,'#2e4a48',7,8);LIT(q[0]-2,q[1]-6,5,5,'#587881','#e9c996');px(q[0]-3,q[1]+1,shade(trim,-17),7,1);}sign(u+du*.5,v+dv,13,opt.sign||'SHOP',opt.signColor||'#31534d');}else if(opt.sign)sign(u+du*.5,v+dv,Math.min(14,h*.55),opt.sign);
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
