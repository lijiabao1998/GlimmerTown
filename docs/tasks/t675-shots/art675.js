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
  function masonry675(u,v,du,dv,z,bh,col){if(bh<9||du<.18||dv<.18||vi===4||(vi===1&&col===d.wall)||(vi===6&&z>=15))return;const stone=vi===0||vi===9,step=stone?4:3;for(let zz=z+step;zz<z+bh-1;zz+=step){const row=Math.round((zz-z)/step);for(let side=0;side<2;side++){const at=(t,h)=>side?P(u+du+.002,v+dv*t,h):P(u+du*t,v+dv+.002,h),n=stone?4:6;L(at(.02,zz),at(.98,zz),S(col,side?-28:-9));for(let j=0;j<n;j++){const t=(j+(row%2?.5:0))/n;if(t>.04&&t<.96)L(at(t,zz-step+.6),at(t,zz-.5),S(col,side?-30:-12));}}}}
  const B=(u,v,du,dv,z,bh,col=d.wall)=>{const a=Q(u,v,du,dv,z),b=Q(u,v,du,dv,z+bh);F([a[3],a[2],b[2],b[3]],col);F([a[2],a[1],b[1],b[2]],S(col,-22));F(b,S(col,8));masonry675(u,v,du,dv,z,bh,col);L(b[3],b[2],S(col,15));L(a[3],a[2],S(col,-18));return b;};
  function polyBody(ps,z,bh,col=d.wall){const lo=ps.map(p=>P(...p,z)),hi=ps.map(p=>P(...p,z+bh));for(let i=0;i<ps.length;i++){const j=(i+1)%ps.length,a=ps[i],b=ps[j];if(b[1]-a[1]-(b[0]-a[0])>0)F([lo[i],lo[j],hi[j],hi[i]],S(col,b[0]-a[0]>0?-21:0));}F(hi,S(col,8));return hi;}
  const circle=(u,v,rx,ry,n=12)=>Array.from({length:n},(_,i)=>[u+rx*Math.cos(i*Math.PI*2/n),v+ry*Math.sin(i*Math.PI*2/n)]);
  function cone(ps,z,peak,col=roof){const p=P(peak[0],peak[1],peak[2]);for(let i=0;i<ps.length;i++){const j=(i+1)%ps.length;F([P(...ps[i],z),P(...ps[j],z),p],S(col,i<ps.length/2?-12:7));L(P(...ps[i],z),p,S(col,-10));}}
  function window675(u,v,du,dv,side,a,b,z,hh,kind='sash'){
    const at=(t,zz)=>side===0?P(u+du*t,v+dv+.004,zz):P(u+du+.004,v+dv*t,zz),ps=[at(a,z),at(b,z),at(b,z+hh),at(a,z+hh)],span=Math.abs(at(b,z)[0]-at(a,z)[0]);
    F(ps,side?'#263d49':'#304b55');F(ps,side?'#bba776':'#ddc697',ng);
    const inset=Math.min((b-a)*.18,(b-a)/Math.max(2,span));
    if(kind!=='barred'&&span>=3&&hh>=4){const glass=(zz,h,col)=>lotPoly574(g,[at(a+inset,zz),at(b-inset,zz),at(b-inset,zz+h),at(a+inset,zz+h)],col);glass(z+hh*.57,hh*.23,side?'#64818b':'#8ea8ab');glass(z+1,Math.max(1,hh*.28),side?'#304954':'#36545d');}
    L(at(a,z),at(b,z),d.trim);L(at(a,z+hh),at(b,z+hh),d.trim);L(at(a,z),at(a,z+hh),S(d.trim,-30));L(at(b,z),at(b,z+hh),S(d.trim,-30));
    const wanted=kind==='mullion'?4:kind==='ribbon'?5:kind==='barred'?3:2,n=Math.min(wanted,Math.max(1,Math.floor(span/3)));for(let i=1;i<n;i++)L(at(a+(b-a)*i/n,z+1),at(a+(b-a)*i/n,z+hh-1),S(d.trim,-18));if(kind!=='ribbon'&&kind!=='barred'&&hh>=6)L(at(a,z+hh*.5),at(b,z+hh*.5),S(d.trim,-18));L(at(a,z-1),at(b,z-1),S(d.wall,-30));const sa=at(a-.025,z-1),sb=at(b+.025,z-1);F([sa,sb,[sb[0],sb[1]+1],[sa[0],sa[1]+1]],S(d.trim,-8));L(at(a-.015,z+hh+1),at(b+.015,z+hh+1),S(d.trim,8));L(at(a-.02,z),at(a-.02,z+hh),S(d.wall,-34));
  }
  function facetWindow(ps,i,z,hh){const a=ps[i],b=ps[(i+1)%ps.length],at=(t,zz)=>P(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,zz),q=[at(.12,z),at(.88,z),at(.88,z+hh),at(.12,z+hh)];F(q,'#344b53');F(q,'#d6bb86',ng);L(at(.12,z),at(.88,z),d.trim);L(at(.12,z+hh),at(.88,z+hh),d.trim);L(at(.12,z),at(.12,z+hh),S(d.trim,-20));L(at(.88,z),at(.88,z+hh),S(d.trim,-20));L(at(.12,z+hh*.5),at(.88,z+hh*.5),d.trim);}
  function door(u,v,z=0,hh=8,width=.11,lit=false){const ps=[P(u,v,z),P(u+width,v,z),P(u+width,v,z+hh),P(u,v,z+hh)];F(ps,'#4b4a3d');if(lit)F([P(u+.025,v,z+2),P(u+width-.025,v,z+2),P(u+width-.025,v,z+hh-1),P(u+.025,v,z+hh-1)],'#b39b6d',ng);L(P(u,v,z+hh),P(u+width,v,z+hh),d.trim);L(P(u,v,z),P(u,v,z+hh),S(d.wall,-36));L(P(u+width,v,z),P(u+width,v,z+hh),S(d.trim,-12));for(const t of[.25,.5,.75])L(P(u+width*t,v,z+1),P(u+width*t,v,z+hh-1),'#393d35');L(P(u-.02,v,z-1),P(u+width+.02,v,z-1),d.trim);const kp=P(u+width*.8,v,z+hh*.43);g.fillStyle='#c1ad77';g.fillRect(Math.round(kp[0]),Math.round(kp[1]),1,1);}
  function gable(u,v,du,dv,z,r,col=roof){const a=Q(u-.015,v-.015,du+.03,dv+.03,z),r0=P(u+du*.5,v-.015,z+r),r1=P(u+du*.5,v+dv+.015,z+r);F([a[3],a[2],r1],d.wall);F([a[0],a[3],r1,r0],col);F([a[1],a[2],r1,r0],S(col,-20));L(a[3],r1,d.trim);L(r1,a[2],S(d.trim,-16));L(P(u-.015,v+dv+.015,z-1),P(u+du+.015,v+dv+.015,z-1),S(d.wall,-30));L(a[3],a[0],S(col,-28));L(a[2],a[1],S(col,-29));L(r0,r1,S(col,20));for(const t of[.16,.32,.68,.84]){const zz=z+r*(1-Math.abs(2*t-1));L(P(u+du*t,v,zz),P(u+du*t,v+dv,zz),S(col,-9));for(const f of[.2,.45,.7,.9])L(P(u+du*t,v+dv*f,zz),P(u+du*(t+(t<.5?.05:-.05)),v+dv*f,zz+r*.1),S(col,-14));}for(const f of[.2,.4,.6,.8])L(P(u+du*.5,v+dv*f,z+r),P(u+du*.5+.025,v+dv*f,z+r-.8),S(col,-12));}
  function roofCourses675(a,b,c,d,col){const mix=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];for(const t of[.25,.5,.75]){const x=mix(a,d,t),y=mix(b,c,t);L(x,y,S(col,-9));for(const f of[.2,.45,.7,.9])L(mix(x,y,f),mix(mix(a,d,Math.min(.98,t+.16)),mix(b,c,Math.min(.98,t+.16)),f),S(col,-13));}}
  function hip(u,v,du,dv,z,r,col=roof){const a=Q(u-.025,v-.025,du+.05,dv+.05,z),p=P(u+du/2,v+dv*.25,z+r),q=P(u+du/2,v+dv*.75,z+r);F([a[0],a[1],p],S(col,-18));F([a[1],a[2],q,p],S(col,-14));F([a[2],a[3],q],col);F([a[3],a[0],p,q],S(col,8));L(p,q,S(col,19));L(a[3],a[2],S(col,-23));L(a[2],a[1],S(col,-29));L(a[3],a[0],S(col,-20));roofCourses675(a[1],a[2],q,p,S(col,-14));roofCourses675(a[3],a[0],p,q,S(col,8));}
  function chimney(u,v,z){B(u,v,.065,.08,z,7,S(d.wall,-14));B(u-.012,v-.012,.09,.105,z+6,2,d.trim);F(Q(u+.012,v+.015,.04,.05,z+8.1),'#303731');L(P(u-.01,v+.095,z+5),P(u+.078,v+.095,z+5),S(d.trim,-30));hooks.smoke=(hooks.smoke||[]).concat([P(u+.035,v+.04,z+9)]);}
  const gableHalf=(u,v,du,dv,z,r,col=roof)=>{const a=Q(u-.02,v-.02,du+.04,dv+.04,z),p=P(u+du*.5,v+dv*.12,z+r),q=P(u+du*.5,v+dv*.88,z+r);F([a[0],a[1],p],S(col,-18));F([a[1],a[2],q,p],S(col,-16));F([a[2],a[3],q],col);F([a[3],a[0],p,q],S(col,9));L(p,q,S(col,19));L(a[3],a[2],S(col,-23));L(a[2],a[1],S(col,-29));L(a[3],a[0],S(col,-20));roofCourses675(a[1],a[2],q,p,S(col,-14));roofCourses675(a[3],a[0],p,q,S(col,8));};
  function arch(u,v,z,width,height,col='#3c4848',lit=false){const ps=[P(u,v,z),P(u+width,v,z),P(u+width,v,z+height*.65)];for(let i=0;i<=8;i++){const t=i*Math.PI/8;ps.push(P(u+width*.5+width*.5*Math.cos(t),v,z+height*.65+height*.35*Math.sin(t)));}F(ps,col);if(lit){const q=ps.map(([x,y])=>[x+(P(u+width*.5,v,z+height*.4)[0]-x)*.2,y+(P(u+width*.5,v,z+height*.4)[1]-y)*.2]);F(q,'#c9aa6e',ng);}for(let i=2;i<ps.length-1;i++){L(ps[i],ps[i+1],d.trim);if(i%2===0){const q=ps[i];L(q,[q[0]+(q[0]-P(u+width*.5,v,z+height*.6)[0])*.18,q[1]-1],S(d.trim,-22));}}L(ps[0],ps[ps.length-1],S(d.wall,-34));L(ps[0],ps[1],S(d.wall,-25));}
  function vent(u,v,du,dv,z,bh){B(u,v,du,dv,z,bh,'#454c49');for(let k=1;k<bh;k+=2){L(P(u,v+dv,k+z),P(u+du,v+dv,k+z),S(d.trim,-22));L(P(u+du,v,k+z),P(u+du,v+dv,k+z),S(d.trim,-40));}}
  function frustum(ps,z,top,zz,col){for(let i=0;i<ps.length;i++){const j=(i+1)%ps.length;F([P(...ps[i],z),P(...ps[j],z),P(...top[j],zz),P(...top[i],zz)],S(col,i<ps.length/2?-15:5));}}
  F(Q(.035,.035,.93,.93),winter?'#d9e2da':['#a5ac92','#a9ac95','#aea28b','#a2aaa0'][sea]);F(Q(.06,.8,.88,.14,.1),winter?'#d9e3dd':'#aba18d');
  if(vi===0){
    B(.13,.13,.42,.49,0,34);window675(.13,.13,.42,.49,1,.2,.7,21,8);window675(.13,.13,.42,.49,1,.22,.65,7,7);gable(.13,.13,.42,.49,34,8);arch(.24,.624,17,.2,12,'#40565b',true);arch(.27,.625,0,.15,10);for(const zz of[5,12,17,31])L(P(.13,.624,zz),P(.55,.624,zz),'#8b8778');
    B(.55,.3,.3,.46,0,12);hip(.55,.3,.3,.46,12,4);window675(.55,.3,.3,.46,0,.15,.85,4,5);window675(.55,.3,.3,.46,1,.2,.75,3,5);B(.77,.18,.09,.11,0,38,'#8a7765');B(.757,.167,.116,.136,37,2,'#b1977b');hooks.smoke=[P(.815,.235,40)];
  }else if(vi===1){
    B(.1,.13,.78,.62,0,12);gable(.1,.13,.78,.62,12,11,winter?roof:'#6e746c');for(const u of[.16,.3,.44,.58,.72,.84])L(P(u,.755,1),P(u,.755,11),'#665c4e');vent(.19,.747,.53,.015,5,5);door(.13,.756,0,8,.12);vent(.425,.14,.13,.59,23,4);B(.41,.12,.16,.63,27,1,winter?'#e2e7dd':'#7e8982');
    B(.61,.66,.27,.23,0,16,'#9e775d');window675(.61,.66,.27,.23,0,.2,.8,7,5);hip(.61,.66,.27,.23,16,3);chimney(.76,.7,18);
  }else if(vi===2){
    B(.1,.11,.3,.5,0,10,'#a88469');gable(.1,.11,.3,.5,10,4);window675(.1,.11,.3,.5,0,.18,.82,3,5);const ps=circle(.57,.56,.32,.31,16),top=ps.map(([u,v])=>[.57+(u-.57)*.25,.56+(v-.56)*.25]);frustum(ps,0,top,51,d.wall);for(const zz of[7,14,21,28,35,42]){const f=1-.75*zz/51,p=ps.map(([u,v])=>[.57+(u-.57)*f,.56+(v-.56)*f]);for(let i=0;i<8;i++)L(P(...p[i],zz),P(...p[i+1],zz),S(d.wall,-7));}F(top.map(p=>P(...p,51)),'#343b37');for(let i=0;i<16;i++)L(P(...top[i],51),P(...top[(i+1)%16],51),winter?'#d7dfd4':'#ba9675');arch(.49,.872,0,.16,11,'#3c4240',true);hooks.smoke=[P(.57,.56,52)];
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
    B(.16,.1,.56,.78,0,12);gable(.16,.1,.56,.78,12,8);for(const a of[.08,.3,.55,.78])window675(.16,.1,.56,.78,1,a,a+.13,4,5,'barred');for(const a of[.12,.56])window675(.16,.1,.56,.78,0,a,a+.3,4,6,'barred');for(const v of[.18,.43,.68])for(const u of[.17,.64])chimney(u,v,11);L(P(.16,.884,11),P(.72,.884,11),'#c1a585');
  }else{
    B(.13,.2,.74,.62,0,22);for(const z of[4,9,14,19]){L(P(.13,.824,z),P(.87,.824,z),'#8c907d');L(P(.874,.2,z),P(.874,.82,z),'#7c8374');}for(const u of[.22,.47,.71])arch(u,.825,0,.12,11,'#39423b',true);for(const u of[.15,.83]){F([P(u,.83,0),P(u+.035,.94,0),P(u+.035,.85,18)],'#969c87');F([P(u+.035,.94,0),P(u+.075,.92,0),P(u+.075,.83,18),P(u+.035,.85,18)],'#8b927e');}for(const u of[.34,.67]){const ps=circle(u,.49,.105,.14,12);F(ps.map(p=>P(...p,22)),'#465046');for(let i=0;i<12;i++)L(P(...ps[i],22),P(...ps[(i+1)%12],22),winter?'#e0e6d9':'#c3bca0');}hooks.smoke=[P(.34,.49,23),P(.67,.49,23)];
  }
  // T675：逐款設備與構造收口；僅烘焙期繪製，沒有逐幀新增循環。
  const iron='#515b59',metal='#82918a',wood='#786b55';
  function pipe675(u,v,z,hh,side=0){const a=P(u,v,z),b=P(u,v,z+hh);L([a[0]+1,a[1]], [b[0]+1,b[1]],'#3c4541');L(a,b,metal);for(let k=2;k<hh;k+=7){const t=P(u,v,z+k);L([t[0]-1,t[1]],[t[0]+1,t[1]],iron);}}
  function beam675(u,v,du,z){L(P(u,v,z),P(u+du,v,z),wood,2);L(P(u,v,z+1),P(u+du,v,z+1),'#b4a180');}
  function wheel675(u,v,z,r){const q=P(u,v,z);for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;L([q[0]+Math.cos(a)*r,q[1]+Math.sin(a)*r],[q[0]+Math.cos(b)*r,q[1]+Math.sin(b)*r],iron);}for(let i=0;i<6;i++){const a=i*Math.PI/3;L(q,[q[0]+Math.cos(a)*r,q[1]+Math.sin(a)*r],metal);}g.fillStyle='#b5a27b';g.fillRect(Math.round(q[0]),Math.round(q[1]),1,1);}
  function brace675(u,v,du,z,hh){L(P(u,v,z),P(u+du,v,z+hh),wood);L(P(u+du,v,z),P(u,v,z+hh),wood);}
  if(vi===0){
    // 石角、金屬抽水立管、飛輪與鍋爐翼落水管。
    for(const z of[2,8,14,28,32]){beam675(.13,.628,.065,z);beam675(.49,.628,.06,z);}
    pipe675(.57,.77,1,11);wheel675(.73,.77,5,3);L(P(.59,.77,3),P(.82,.77,3),iron);
    pipe675(.55,.626,13,19);beam675(.2,.626,.29,15);L(P(.2,.626,14),P(.25,.626,11),iron);
    F(Q(.772,.183,.08,.09,39.1),'#343b35');
  }else if(vi===1){
    // 木棚斜撐、鹽盤搬運門橫帶、排水槽與磚灶檢修蓋。
    brace675(.32,.758,.22,1,4);beam675(.11,.758,.48,2);beam675(.11,.758,.48,11);
    L(P(.12,.75,12),P(.6,.75,12),'#343f3c',2);pipe675(.59,.76,0,12);
    F([P(.882,.72,3),P(.882,.84,3),P(.882,.84,9),P(.882,.72,9)],iron);L(P(.884,.72,9),P(.884,.84,9),metal);
  }else if(vi===2){
    // 錐窯環箍、錯縫磚皮、門洞石拱與地面熔爐搬料軌。
    for(const zz of[5,12,19,26,33,40,47]){const f=1-.75*zz/51;for(let i=0;i<8;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,u=.57+.32*f*Math.cos(a),v=.56+.31*f*Math.sin(a);if(i%2===0)L(P(u,v,zz),P(u,v,zz+2),S(d.wall,-16));if(zz===12||zz===33)L(P(u,v,zz),P(.57+.32*f*Math.cos(b),.56+.31*f*Math.sin(b),zz),iron);}}
    for(const u of[.51,.61])L(P(u,.88,.3),P(u,.96,.3),iron);beam675(.46,.873,.22,12);
  }else if(vi===3){
    // 盲煙室拉結件與排水管，低翼門上吊運支架。
    for(const z of[10,20,29])for(const u of[.16,.3]){L(P(u,.815,z-1),P(u,.815,z+1),iron);L(P(u-.02,.815,z),P(u+.02,.815,z),iron);}
    pipe675(.375,.814,1,33);beam675(.62,.817,.18,12);L(P(.65,.817,12),P(.65,.88,14),iron);L(P(.65,.88,14),P(.65,.88,10),iron);
  }else if(vi===4){
    // 架空榫接斜撐、糧門鉸鏈、吊糧架與磨損木板。
    brace675(.18,.72,.24,2,6);brace675(.5,.72,.25,2,6);beam675(.12,.716,.72,9);
    for(const z of[11,16])L(P(.44,.887,z),P(.57,.887,z),iron);
    L(P(.5,.887,22),P(.5,.94,22),wood,2);L(P(.5,.94,22),P(.5,.94,18),iron);wheel675(.5,.94,21,1);
    for(const u of[.21,.4,.63,.78])L(P(u,.715,12),P(u,.715,15),'#a99c7c');
  }else if(vi===5){
    // 連窗下承重帶、磚柱、鑄鐵拉結與工坊小門雨篷支架。
    beam675(.1,.697,.76,15);for(const u of[.13,.82])pipe675(u,.699,2,25);
    for(const u of[.22,.6]){L(P(u-.025,.698,12),P(u+.025,.698,12),iron);L(P(u,.698,11),P(u,.698,13),iron);}
    L(P(.68,.877,8),P(.72,.877,6),wood);L(P(.81,.877,8),P(.77,.877,6),wood);
  }else if(vi===6){
    // 外階梯承台與下層斜撐，玻璃室底部木裙板。
    beam675(.21,.825,.59,16);for(const u of[.25,.39,.55,.71])L(P(u,.826,15),P(u,.826,17),wood);
    L(P(.07,.3,0),P(.07,.3,13),iron);L(P(.07,.3,0),P(.07,.68,5),iron);L(P(.2,.3,0),P(.2,.3,13),iron);
    pipe675(.805,.818,1,25);
  }else if(vi===7){
    // 窯身石墩、束箍、深門門斗與通風帽支承。
    for(const u of[.5,.84]){beam675(u,.796,.04,2);beam675(u,.796,.04,13);L(P(u,.796,2),P(u,.796,20),S(d.wall,-18));}
    beam675(.49,.796,.4,19);L(P(.48,.797,18),P(.89,.797,18),iron);pipe675(.495,.746,0,16);
    for(const u of[.6,.76])L(P(u,.695,32),P(u,.695,38),wood);
  }else if(vi===8){
    // 鍛造工坊窗間磚墩、牆面拉結與排水管；六煙口不增採樣。
    for(const v of[.12,.29,.48,.68,.85]){L(P(.724,v,2),P(.724,v,11),S(d.trim,-28));}
    beam675(.16,.886,.56,2);pipe675(.72,.886,1,11);
    for(const u of[.22,.6]){L(P(u-.025,.886,10),P(u+.025,.886,10),iron);L(P(u,.886,9),P(u,.886,11),iron);}
  }else{
    // 厚窯頂蓋石、側牆鎖石與深拱口爐柵。
    L(P(.13,.824,21),P(.87,.824,21),d.trim);L(P(.874,.2,21),P(.874,.82,21),S(d.trim,-22));
    for(const u of[.24,.49,.73])for(const d0 of[0,.035,.07])L(P(u+d0,.828,1),P(u+d0,.828,5),iron);
    for(const v of[.3,.5,.7]){L(P(.876,v,15),P(.876,v+.05,15),S(d.trim,-10));L(P(.876,v+.025,14),P(.876,v+.025,16),iron);}
  }
  // 工作場地構件以本格內實體接地，不用散點替代結構。
  function barrel675(u,v,z=0){B(u,v,.07,.075,z,4,'#8a785c');for(const zz of[1,3]){L(P(u,v+.076,z+zz),P(u+.07,v+.076,z+zz),iron);L(P(u+.071,v,z+zz),P(u+.071,v+.075,z+zz),iron);}L(P(u+.01,v+.01,z+4),P(u+.06,v+.06,z+4),'#b6a17b');}
  function crate675(u,v,du=.1,dv=.09){B(u,v,du,dv,0,4,'#9d8b68');brace675(u,v+dv+.002,du,0,4);L(P(u+du+.002,v,0),P(u+du+.002,v+dv,4),wood);}
  if(vi===1){
    // 側牆雙扇工作門，木框與鐵合頁，門前鹽筐和架高小工作臺。
    const u=.884,v=.34,v2=.62;F([P(u,v,0),P(u,v2,0),P(u,v2,10),P(u,v,10)],'#414a42');
    for(const t of[v,v+.07,v+.14,v+.21,v2])L(P(u,t,1),P(u,t,9),'#8d8167');
    for(const z of[2,8])L(P(u,v,z),P(u,v2,z),iron);L(P(u,v,10),P(u,v2,10),d.trim);
    L(P(u,v,0),P(u,v,10),d.trim);L(P(u,v2,0),P(u,v2,10),S(d.trim,-20));
    B(.887,.39,.075,.21,3,1,'#b8a580');for(const v of[.4,.57])B(.93,v,.018,.025,0,3,wood);
    crate675(.77,.9,.1,.065);barrel675(.13,.82);barrel675(.22,.84);
  }else if(vi===2){
    // 外置鋼圈固定扣、加料小窗、相連的窯門遮篷與玻璃料箱。
    for(const [u,v,z]of[[.77,.72,12],[.7,.66,33],[.42,.76,12]]){const q=P(u,v,z);g.fillStyle='#a4a490';g.fillRect(Math.round(q[0])-1,Math.round(q[1])-1,2,2);}
    const q=[P(.79,.67,9),P(.83,.58,9),P(.79,.58,15),P(.75,.67,15)];F(q,'#394640');for(let i=0;i<4;i++)L(q[i],q[(i+1)%4],'#b39c7b');
    L(P(.76,.66,10),P(.8,.59,14),iron);beam675(.44,.883,.25,13);
    F([P(.44,.88,13),P(.69,.88,13),P(.69,.95,11),P(.44,.95,11)],'#66716a');
    for(const u of[.45,.68]){L(P(u,.89,7),P(u,.94,11),iron);}
    crate675(.76,.82,.13,.1);B(.78,.84,.08,.05,4,1,'#8ca7a1');barrel675(.26,.81);
    L(P(.27,.83,4),P(.33,.83,8),'#c0b397');
  }else if(vi===9){
    // 石灰窯工作臺與頂部裝料吊架，石階可連到窯頂，底部燃料格。
    for(let i=0;i<6;i++)B(.88,.26+i*.07,.07,.07,0,22-i*3.3,'#8f947f');
    for(const v of[.26,.61])L(P(.955,v,0),P(.955,v,25-(v-.26)*47),iron);
    L(P(.955,.26,25),P(.955,.65,7),iron);
    for(const u of[.2,.78]){B(u,.22,.035,.045,22,11,wood);L(P(u,.22,25),P(u,.32,22),wood,2);}
    beam675(.2,.25,.62,33);L(P(.53,.25,33),P(.53,.47,32),iron,2);L(P(.53,.47,32),P(.53,.47,26),iron);wheel675(.53,.47,31,2);
    B(.39,.88,.22,.08,0,3,'#6a6e5e');F(Q(.41,.89,.18,.06,3.1),'#343e39');for(const u of[.43,.48,.54])L(P(u,.89,3.2),P(u+.02,.93,3.8),'#596355');
    crate675(.14,.89,.1,.07);
  }
  const pixels=g.getImageData(0,0,w,h).data;let y0=h;for(let yy=0;yy<h&&y0===h;yy++)for(let xx=0;xx<w;xx++)if(pixels[(yy*w+xx)*4+3]){y0=Math.max(0,yy-2);break;}
  if(y0===h)y0=0;const nh=h-y0,[ic,ig]=cv(w,nh),[lc,lg]=cv(w,nh);ig.drawImage(c,0,y0,w,nh,0,0,w,nh);lg.drawImage(nc,0,y0,w,nh,0,0,w,nh);const smoke=(hooks.smoke||[]).map(p=>({dx:p[0]-ax,dy:p[1]-ay}));
  return {img:ic,night:lc,w,h:nh,ax,ay:ay-y0,__t601:1,__t675:1,smoke,lotMeta574:{sz:1,kind:3,variant:vi,stage:2,winter,ground:[ax,104-y0,32],feet:[],hooks:{smoke:(hooks.smoke||[]).map(p=>[p[0],p[1]-y0])},order574:[],cycles574:0,t591:false}};
}
/* T675 END：獨立工坊候選。 */
