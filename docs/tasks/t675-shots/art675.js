/* T675 獨立工坊候選；尚未接入遊戲，不冒充已驗收。 */
const CATALOG675=[
{id:'enginehouse',name:'石機房低鍋爐翼',wall:'#a69f8b',trim:'#d0c4a6'},
{id:'panhouse',name:'屋脊通風煮鹽棚',wall:'#9b8164',trim:'#c1b39a'},
{id:'glasscone',name:'開頂錐體玻璃工坊',wall:'#a16e52',trim:'#cba584'},
{id:'smokehouse',name:'直立煙室魚燻坊',wall:'#9d8067',trim:'#c9bda4'},
{id:'granary',name:'石墩架空木穀倉',wall:'#91866b',trim:'#c4b59a'},
{id:'frameshop',name:'連窗針織工作間',wall:'#a47f65',trim:'#d0c6ac'},
{id:'signaloffice',name:'上玻璃工業辦事房',wall:'#a5876f',trim:'#d2cfb9'},
{id:'maltkiln',name:'反曲頂麥芽窯',wall:'#c5bd9f',trim:'#e0d7bb'},
{id:'chainshop',name:'六煙囪鏈條工坊',wall:'#a67b61',trim:'#c7b597'},
{id:'limekiln',name:'厚石深拱石灰窯',wall:'#a8a38e',trim:'#ccc4a7'}
];
function bake675(vi,winter=false,sea=1){
  const d=CATALOG675[vi];if(!d)throw Error('T675 unknown model '+vi);
  const w=80,h=144,ax=40,ay=136,[c,g]=cv(w,h),[nc,ng]=cv(w,h),{P}=makeIso590(w,h,ax,ay,1),hooks={};
  const S=(col,n)=>shade(col,n),roof=winter?'#dce4dc':'#56616b',edge=winter?'#c0cfc8':'#414f58';
  const F=(ps,col,ctx=g)=>{if(ctx===g){ng.save();ng.globalCompositeOperation='destination-out';lotPoly574(ng,ps,'#000');ng.restore();}lotPoly574(ctx,ps,col);};
  const L=(a,b,col,wd=1)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)))),rows=[];
    for(let i=0;i<=n;i++){const x=Math.round(a[0]+dx*i/n),y=Math.round(a[1]+dy*i/n),r=rows[rows.length-1];if(r&&r[0]===y){r[1]=Math.min(r[1],x);r[2]=Math.max(r[2],x+wd);}else rows.push([y,x,x+wd]);}
    const paint=(q,color)=>{q.fillStyle=color;for(const r of rows)q.fillRect(r[1],r[0],r[2]-r[1],1);};ng.save();ng.globalCompositeOperation='destination-out';paint(ng,'#000');ng.restore();paint(g,col);
  };
  const Q=(u,v,du,dv,z=0)=>[P(u,v,z),P(u+du,v,z),P(u+du,v+dv,z),P(u,v+dv,z)];
  const B=(u,v,du,dv,z,bh,col=d.wall)=>{const a=Q(u,v,du,dv,z),b=Q(u,v,du,dv,z+bh);F([a[3],a[2],b[2],b[3]],col);F([a[2],a[1],b[1],b[2]],S(col,-22));F(b,S(col,8));L(b[3],b[2],S(col,15));return b;};
  function polyBody(ps,z,bh,col=d.wall){const lo=ps.map(p=>P(...p,z)),hi=ps.map(p=>P(...p,z+bh));for(let i=0;i<ps.length;i++){const j=(i+1)%ps.length,a=ps[i],b=ps[j];if(b[1]-a[1]-(b[0]-a[0])>0)F([lo[i],lo[j],hi[j],hi[i]],S(col,b[0]-a[0]>0?-21:0));}F(hi,S(col,8));return hi;}
  const circle=(u,v,rx,ry,n=12)=>Array.from({length:n},(_,i)=>[u+rx*Math.cos(i*Math.PI*2/n),v+ry*Math.sin(i*Math.PI*2/n)]);
  function cone(ps,z,peak,col=roof){const p=P(peak[0],peak[1],peak[2]);for(let i=0;i<ps.length;i++){const j=(i+1)%ps.length;F([P(...ps[i],z),P(...ps[j],z),p],S(col,i<ps.length/2?-12:7));L(P(...ps[i],z),p,S(col,-10));}}
  function window675(u,v,du,dv,side,a,b,z,hh,kind='sash'){
    const at=(t,zz)=>side===0?P(u+du*t,v+dv+.004,zz):P(u+du+.004,v+dv*t,zz),ps=[at(a,z),at(b,z),at(b,z+hh),at(a,z+hh)],span=Math.abs(at(b,z)[0]-at(a,z)[0]);
    F(ps,side?'#344d59':'#42616a');F(ps,side?'#bba776':'#ddc697',ng);
    const inset=Math.min((b-a)*.18,(b-a)/Math.max(2,span));
    if(span>=3&&hh>=4){const glass=(zz,h,col)=>lotPoly574(g,[at(a+inset,zz),at(b-inset,zz),at(b-inset,zz+h),at(a+inset,zz+h)],col);glass(z+hh*.57,hh*.23,side?'#64818b':'#8ea8ab');glass(z+1,Math.max(1,hh*.28),side?'#304954':'#36545d');}
    L(at(a,z),at(b,z),d.trim);L(at(a,z+hh),at(b,z+hh),d.trim);L(at(a,z),at(a,z+hh),S(d.trim,-30));L(at(b,z),at(b,z+hh),S(d.trim,-30));
    const wanted=kind==='mullion'?4:kind==='ribbon'?5:2,n=Math.min(wanted,Math.max(1,Math.floor(span/3)));for(let i=1;i<n;i++)L(at(a+(b-a)*i/n,z+1),at(a+(b-a)*i/n,z+hh-1),S(d.trim,-18));if(kind!=='ribbon'&&hh>=6)L(at(a,z+hh*.5),at(b,z+hh*.5),S(d.trim,-18));L(at(a,z-1),at(b,z-1),S(d.wall,-25));
  }
  function facetWindow(ps,i,z,hh){const a=ps[i],b=ps[(i+1)%ps.length],at=(t,zz)=>P(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,zz),q=[at(.12,z),at(.88,z),at(.88,z+hh),at(.12,z+hh)];F(q,'#344b53');F(q,'#d6bb86',ng);L(at(.12,z),at(.88,z),d.trim);L(at(.12,z+hh),at(.88,z+hh),d.trim);L(at(.12,z),at(.12,z+hh),S(d.trim,-20));L(at(.88,z),at(.88,z+hh),S(d.trim,-20));L(at(.12,z+hh*.5),at(.88,z+hh*.5),d.trim);}
  function door(u,v,z=0,hh=8,width=.11,lit=false){const ps=[P(u,v,z),P(u+width,v,z),P(u+width,v,z+hh),P(u,v,z+hh)];F(ps,'#4b4a3d');if(lit)F([P(u+.025,v,z+2),P(u+width-.025,v,z+2),P(u+width-.025,v,z+hh-1),P(u+.025,v,z+hh-1)],'#b39b6d',ng);L(P(u,v,z+hh),P(u+width,v,z+hh),d.trim);}
  function gable(u,v,du,dv,z,r,col=roof){const a=Q(u-.015,v-.015,du+.03,dv+.03,z),r0=P(u+du*.5,v-.015,z+r),r1=P(u+du*.5,v+dv+.015,z+r);F([a[3],a[2],r1],d.wall);F([a[0],a[3],r1,r0],col);F([a[1],a[2],r1,r0],S(col,-20));L(a[3],r1,d.trim);L(r1,a[2],S(d.trim,-16));L(r0,r1,S(col,15));for(const t of[.2,.4,.6,.8])L(P(u+du*t,v,z+r*(1-Math.abs(2*t-1))),P(u+du*t,v+dv,z+r*(1-Math.abs(2*t-1))),S(col,-12));}
  function hip(u,v,du,dv,z,r,col=roof){const a=Q(u-.025,v-.025,du+.05,dv+.05,z),p=P(u+du/2,v+dv*.25,z+r),q=P(u+du/2,v+dv*.75,z+r);F([a[0],a[1],p],S(col,-18));F([a[1],a[2],q,p],S(col,-14));F([a[2],a[3],q],col);F([a[3],a[0],p,q],S(col,8));L(p,q,S(col,19));}
  function chimney(u,v,z){B(u,v,.065,.08,z,7,S(d.wall,-14));B(u-.012,v-.012,.09,.105,z+6,2,d.trim);hooks.smoke=(hooks.smoke||[]).concat([P(u+.035,v+.04,z+9)]);}
  const gableHalf=(u,v,du,dv,z,r,col=roof)=>{const a=Q(u-.02,v-.02,du+.04,dv+.04,z),p=P(u+du*.5,v+dv*.12,z+r),q=P(u+du*.5,v+dv*.88,z+r);F([a[0],a[1],p],S(col,-18));F([a[1],a[2],q,p],S(col,-16));F([a[2],a[3],q],col);F([a[3],a[0],p,q],S(col,9));L(p,q,S(col,19));};
  function arch(u,v,z,width,height,col='#3c4848',lit=false){const ps=[P(u,v,z),P(u+width,v,z),P(u+width,v,z+height*.65)];for(let i=0;i<=8;i++){const t=i*Math.PI/8;ps.push(P(u+width*.5+width*.5*Math.cos(t),v,z+height*.65+height*.35*Math.sin(t)));}F(ps,col);if(lit){const q=ps.map(([x,y])=>[x+(P(u+width*.5,v,z+height*.4)[0]-x)*.2,y+(P(u+width*.5,v,z+height*.4)[1]-y)*.2]);F(q,'#c9aa6e',ng);}for(let i=2;i<ps.length-1;i++)L(ps[i],ps[i+1],d.trim);L(ps[0],ps[1],S(d.wall,-25));}
  function vent(u,v,du,dv,z,bh){B(u,v,du,dv,z,bh,'#454c49');for(let k=1;k<bh;k+=2){L(P(u,v+dv,k+z),P(u+du,v+dv,k+z),S(d.trim,-22));L(P(u+du,v,k+z),P(u+du,v+dv,k+z),S(d.trim,-40));}}
  function frustum(ps,z,top,zz,col){for(let i=0;i<ps.length;i++){const j=(i+1)%ps.length;F([P(...ps[i],z),P(...ps[j],z),P(...top[j],zz),P(...top[i],zz)],S(col,i<ps.length/2?-15:5));}}
  F(Q(.035,.035,.93,.93),winter?'#d9e2da':['#a5ac92','#a9ac95','#aea28b','#a2aaa0'][sea]);F(Q(.06,.8,.88,.14,.1),winter?'#d9e3dd':'#aba18d');
  if(vi===0){
    B(.13,.13,.42,.49,0,34);window675(.13,.13,.42,.49,1,.2,.7,21,8);window675(.13,.13,.42,.49,1,.22,.65,7,7);gable(.13,.13,.42,.49,34,8);arch(.24,.624,17,.2,12,'#40565b',true);arch(.27,.625,0,.15,10);for(const zz of[5,12,17,31])L(P(.13,.624,zz),P(.55,.624,zz),'#8b8778');
    B(.55,.3,.3,.46,0,12);hip(.55,.3,.3,.46,12,4);window675(.55,.3,.3,.46,0,.15,.85,4,5);window675(.55,.3,.3,.46,1,.2,.75,3,5);B(.77,.18,.09,.11,0,38,'#8a7765');B(.757,.167,.116,.136,37,2,'#b1977b');hooks.smoke=[P(.815,.235,40)];
  }else if(vi===1){
    B(.1,.13,.78,.62,0,12);gable(.1,.13,.78,.62,12,11,winter?roof:'#6e746c');for(const u of[.16,.3,.44,.58,.72,.84])L(P(u,.755,1),P(u,.755,11),'#665c4e');window675(.1,.13,.78,.62,0,.12,.8,5,4,'ribbon');door(.13,.756,0,8,.12);vent(.425,.14,.13,.59,23,4);B(.41,.12,.16,.63,27,1,winter?'#e2e7dd':'#7e8982');
    B(.61,.66,.27,.23,0,16,'#9e775d');window675(.61,.66,.27,.23,0,.2,.8,7,5);hip(.61,.66,.27,.23,16,3);chimney(.76,.7,18);
  }else if(vi===2){
    B(.1,.11,.3,.5,0,10,'#a88469');gable(.1,.11,.3,.5,10,4);window675(.1,.11,.3,.5,0,.18,.82,3,5);const ps=circle(.57,.56,.32,.31,16),top=ps.map(([u,v])=>[.57+(u-.57)*.25,.56+(v-.56)*.25]);frustum(ps,0,top,51,d.wall);for(const zz of[7,14,21,28,35,42]){const f=1-.75*zz/51,p=ps.map(([u,v])=>[.57+(u-.57)*f,.56+(v-.56)*f]);for(let i=0;i<8;i++)L(P(...p[i],zz),P(...p[i+1],zz),S(d.wall,-14));}F(top.map(p=>P(...p,51)),'#343b37');for(let i=0;i<16;i++)L(P(...top[i],51),P(...top[(i+1)%16],51),winter?'#d7dfd4':'#ba9675');arch(.49,.872,0,.16,11,'#3c4240',true);hooks.smoke=[P(.57,.56,52)];
  }else if(vi===3){
    B(.1,.14,.27,.67,0,36);B(.37,.14,.43,.22,0,36);for(const zz of[9,19,28]){L(P(.1,.813,zz),P(.37,.813,zz),S(d.wall,-9));L(P(.373,.36,zz),P(.373,.81,zz),S(d.wall,-19));}vent(.12,.797,.22,.018,31,3);vent(.358,.39,.018,.37,31,3);vent(.4,.346,.35,.018,31,3);B(.085,.125,.3,.7,36,1,roof);B(.37,.125,.445,.25,36,1,roof);for(const [u,v]of[[.18,.24],[.18,.57],[.57,.2]]){vent(u,v,.07,.08,37,2);hip(u-.015,v-.015,.1,.11,39,2);hooks.smoke=(hooks.smoke||[]).concat([P(u+.035,v+.04,42)]);}door(.17,.815,0,9,.13);B(.37,.36,.47,.45,0,17,'#b19a7a');hip(.37,.36,.47,.45,17,6);window675(.37,.36,.47,.45,0,.1,.4,8,5);window675(.37,.36,.47,.45,1,.15,.75,8,5);door(.65,.815,0,10,.13);
  }else if(vi===4){
    for(const u of[.18,.47,.76])for(const v of[.22,.65]){B(u-.025,v-.025,.05,.05,0,7,'#898c80');B(u-.05,v-.05,.1,.1,6,2,'#babba4');}B(.12,.12,.72,.59,8,17);for(let z=10;z<25;z+=3){L(P(.12,.713,z),P(.84,.713,z),'#776f5a');L(P(.843,.12,z),P(.843,.71,z),'#686553');}gableHalf(.12,.12,.72,.59,25,10);window675(.12,.12,.72,.59,1,.25,.6,16,5);vent(.22,.697,.16,.02,17,4);vent(.61,.697,.14,.02,17,4);B(.39,.71,.25,.17,8,13);hip(.39,.71,.25,.17,21,4);door(.43,.885,8,10,.16);for(let i=0;i<4;i++)B(.41,.885+i*.018,.2,.018,0,8-i*2,'#aba792');
  }else if(vi===5){
    B(.1,.12,.76,.57,0,29);gableHalf(.1,.12,.76,.57,29,5);window675(.1,.12,.76,.57,0,.08,.94,16,10,'ribbon');window675(.1,.12,.76,.57,1,.12,.89,16,10,'ribbon');for(const a of[.12,.48])window675(.1,.12,.76,.57,0,a,a+.22,5,7);door(.41,.695,0,10,.13);L(P(.1,.695,14),P(.86,.695,14),'#bca98a');chimney(.16,.22,31);B(.66,.69,.2,.18,0,9,'#8c8975');hip(.66,.69,.2,.18,9,3);door(.7,.875,0,7,.11);
  }else if(vi===6){
    B(.28,.23,.45,.53,0,15);arch(.4,.765,1,.15,8);B(.21,.18,.59,.64,15,12,'#b7b7a0');window675(.21,.18,.59,.64,0,.04,.96,17,8,'ribbon');window675(.21,.18,.59,.64,1,.06,.95,17,8,'ribbon');hip(.18,.15,.65,.7,27,7);B(.06,.18,.15,.1,14,1,'#939584');for(let i=0;i<8;i++)B(.06,.28+i*.075,.15,.06,13-i*1.65,1.2,'#aaa999');for(const u of[.06,.2]){L(P(u,.24,14),P(u,.88,0),'#666e67',2);for(const v of[.25,.47,.7,.86]){const z=Math.max(0,14-(v-.24)*22);L(P(u,v,z),P(u,v,z+5),'#c2c3b0');}L(P(u,.24,19),P(u,.88,5),'#c2c3b0');}chimney(.7,.31,29);
  }else if(vi===7){
    B(.1,.12,.4,.62,0,17);gable(.1,.12,.4,.62,17,9);window675(.1,.12,.4,.62,0,.18,.8,5,7);window675(.1,.12,.4,.62,1,.2,.7,6,7);chimney(.15,.21,23);B(.48,.34,.41,.45,0,21);arch(.6,.795,0,.16,10);const tiers=[[.44,.30,.49,.53,21],[.51,.37,.35,.39,23],[.55,.41,.27,.31,26],[.565,.425,.24,.28,29],[.58,.44,.21,.25,32]];for(let k=0;k<tiers.length-1;k++){const a=tiers[k],b=tiers[k+1],p=Q(...a),q=Q(...b);for(let i=0;i<4;i++){const j=(i+1)%4;F([p[i],p[j],q[j],q[i]],S(roof,i<2?-15:7));if(k===0)L(p[i],p[j],S(roof,15));}}vent(.58,.44,.21,.25,32,6);hip(.54,.4,.29,.33,38,4);hooks.smoke=(hooks.smoke||[]).concat([P(.685,.565,43)]);
  }else if(vi===8){
    B(.09,.2,.81,.56,0,12);gable(.09,.2,.81,.56,12,8);for(const a of[.08,.3,.55,.78])window675(.09,.2,.81,.56,0,a,a+.13,4,5);door(.44,.765,0,8,.12);window675(.09,.2,.81,.56,1,.2,.7,4,5);for(const v of[.25,.43,.64])for(const u of[.11,.81])chimney(u,v,15);L(P(.1,.764,11),P(.89,.764,11),'#c1a585');
  }else{
    B(.13,.2,.74,.62,0,22);for(const z of[4,9,14,19]){L(P(.13,.824,z),P(.87,.824,z),'#8c907d');L(P(.874,.2,z),P(.874,.82,z),'#7c8374');}for(const u of[.22,.47,.71])arch(u,.825,0,.12,11,'#39423b',true);for(const u of[.15,.83]){F([P(u,.83,0),P(u+.035,.94,0),P(u+.035,.85,18)],'#969c87');F([P(u+.035,.94,0),P(u+.075,.92,0),P(u+.075,.83,18),P(u+.035,.85,18)],'#8b927e');}for(const u of[.34,.67]){const ps=circle(u,.49,.105,.14,12);F(ps.map(p=>P(...p,22)),'#465046');for(let i=0;i<12;i++)L(P(...ps[i],22),P(...ps[(i+1)%12],22),winter?'#e0e6d9':'#c3bca0');}hooks.smoke=[P(.34,.49,23),P(.67,.49,23)];
  }
  const pixels=g.getImageData(0,0,w,h).data;let y0=h;for(let yy=0;yy<h&&y0===h;yy++)for(let xx=0;xx<w;xx++)if(pixels[(yy*w+xx)*4+3]){y0=Math.max(0,yy-2);break;}
  if(y0===h)y0=0;const nh=h-y0,[ic,ig]=cv(w,nh),[lc,lg]=cv(w,nh);ig.drawImage(c,0,y0,w,nh,0,0,w,nh);lg.drawImage(nc,0,y0,w,nh,0,0,w,nh);const smoke=(hooks.smoke||[]).map(p=>({dx:p[0]-ax,dy:p[1]-ay}));
  return {img:ic,night:lc,w,h:nh,ax,ay:ay-y0,__t601:1,__t675:1,smoke,lotMeta574:{sz:1,kind:3,variant:vi,stage:2,winter,ground:[ax,104-y0,32],feet:[],hooks:{smoke:(hooks.smoke||[]).map(p=>[p[0],p[1]-y0])},order574:[],cycles574:0,t591:false}};
}
/* T675 END：獨立工坊候選。 */
