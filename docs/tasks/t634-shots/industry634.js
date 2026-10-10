/* T634 英式工業／基礎設施：正規化院落，各款以設備與量體區分；零亂數。 */
function industryKit634(T){
  const K=kit634(T),n=T.n,P=(u,v,h=0)=>T.P(u*n,v*n,h),F=K.face,L=K.ln,px=K.px;
  const C={brick:'#a05e49',dark:'#77483f',stone:'#b8ad91',stoneD:'#948970',slate:'#4d5a61',slateL:'#68747b',steel:'#8c9c9c',steelD:'#566a70',cream:'#d4c5a8',water:'#527f8b',glass:'#334e5c',gold:'#c2a058'};
  const snow=c=>T.winter?'#e5e9e4':c;
  const ground=(u,v,du,dv,col)=>K.ground(u*n,v*n,du*n,dv*n,col);
  const box=(u,v,du,dv,h,col=C.brick,z=0)=>T.box(u*n,v*n,du*n,dv*n,h,{left:T.shade(col,-22),right:col,top:snow(T.shade(col,18)),edge:'#4a4942'},z);
  const plate=(u,v,du,dv,h,c)=>F([P(u,v,h),P(u+du,v,h),P(u+du,v+dv,h),P(u,v+dv,h)],c);
  const lit=(p,w=2,h=3,warm=true)=>T.LIT(p[0],p[1],w,h,C.glass,warm?'#ffdba0':'#b9dae0');
  const beacon=(u,v,h)=>{const p=P(u,v,h);px(p[0]-1,p[1]-1,'#c36d54',3,2);if(!T.hooks.aviation||p[1]<T.hooks.aviation[1])T.hooks.aviation=p;};
  const shed=(u,v,du,dv,h=24,roof='gable',stone=false)=>{
    box(u,v,du,dv,h,stone?C.stone:C.brick);const rh=Math.min(12,5+n*1.4);
    if(roof==='gable'){
      F([P(u,v,h),P(u+du,v,h),P(u+du,v+dv*.5,h+rh),P(u,v+dv*.5,h+rh)],snow(C.slateL));
      F([P(u,v+dv*.5,h+rh),P(u+du,v+dv*.5,h+rh),P(u+du,v+dv,h),P(u,v+dv,h)],snow(C.slate));
      F([P(u+du,v,h),P(u+du,v+dv*.5,h+rh),P(u+du,v+dv,h)],stone?C.stone:C.brick);
      L(P(u,v+dv*.5,h+rh),P(u+du,v+dv*.5,h+rh),snow('#919a97'));
      for(let i=1;i<4;i++)L(P(u,v+dv*(.5+i*.12),h+rh*(1-i*.24)),P(u+du,v+dv*(.5+i*.12),h+rh*(1-i*.24)),T.winter?'#c7d3d3':'#5c6870');
    }else if(roof==='saw'){
      const count=n<2?2:3;
      for(let j=0;j<count;j++){const va=v+dv*j/count,d= dv/count;
        F([P(u,va,h),P(u+du,va,h),P(u+du,va+d*.77,h+rh),P(u,va+d*.77,h+rh)],snow(C.slateL));
        F([P(u,va+d*.77,h+rh),P(u+du,va+d*.77,h+rh),P(u+du,va+d,h),P(u,va+d,h)],'#88a9af');
        L(P(u,va+d*.77,h+rh),P(u+du,va+d*.77,h+rh),C.cream);
        F([P(u+du,va,h),P(u+du,va+d*.77,h+rh),P(u+du,va+d,h)],C.dark);
      }
    }else{
      plate(u,v,du,dv,h+1,snow(C.slate));L(P(u,v+dv,h+2),P(u+du,v+dv,h+2),C.cream,2);L(P(u+du,v,h+2),P(u+du,v+dv,h+2),C.cream,2);
    }
    const bands=Math.max(1,Math.floor(h/12));
    for(let j=1;j<=bands;j++){const hh=5+j*(h-8)/(bands+1);
      L(P(u,v+dv,hh-2),P(u+du,v+dv,hh-2),stone?'#a1967e':'#925743');
      for(let i=1;i<=Math.max(1,Math.round(du*n*5));i++){const p=P(u+du*i/(Math.max(1,Math.round(du*n*5))+1),v+dv,hh+3);lit([p[0]-1,p[1]],2,h>26?5:3);}
      for(let i=1;i<=Math.max(1,Math.round(dv*n*4));i++){const p=P(u+du,v+dv*i/(Math.max(1,Math.round(dv*n*4))+1),hh+3);lit([p[0]-1,p[1]],2,h>26?5:3);}
    }
    L(P(u,v+dv,h-2),P(u+du,v+dv,h-2),C.cream);L(P(u+du,v,h-2),P(u+du,v+dv,h-2),C.cream);
    return P(u+du*.5,v+dv*.5,h+rh);
  };
  const door=(u,v,du,h=10,col='#4d6264')=>{F([P(u,v),P(u+du,v),P(u+du,v,h),P(u,v,h)],col);for(let j=2;j<h;j+=3)L(P(u,v,j),P(u+du,v,j),'#78878a');};
  const ell=(x,y,rx,ry,col)=>{rx=Math.max(1,rx);ry=Math.max(1,ry);for(let j=-Math.ceil(ry);j<=ry;j++){const r=rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry)));px(x-r,y+j,col,Math.max(1,r*2),1);}};
  const tank=(u,v,r,h=20,col=C.steel,open=false,z0=0)=>{const b=P(u,v,z0),rx=Math.max(3,r*n*32),ry=Math.max(2,rx*.43);ell(b[0],b[1],rx,ry,C.steelD);px(b[0]-rx,b[1]-h,col,rx*2,h);px(b[0]+rx*.38,b[1]-h,T.shade(col,-22),rx*.62,h);px(b[0]-rx*.7,b[1]-h,T.shade(col,18),Math.max(1,rx*.19),h);ell(b[0],b[1]-h,rx,ry,snow(T.shade(col,20)));if(open)ell(b[0],b[1]-h,rx-2,ry-1,T.winter?'#b2d1d7':C.water);for(let j=10;j<h;j+=13)L([b[0]-rx,b[1]-j],[b[0]+rx,b[1]-j],T.shade(col,-16));return[b[0],b[1]-h];};
  const dome=(u,v,r,h=20,col='#c6ceca')=>{const p=tank(u,v,r,h,col),rx=Math.max(3,r*n*32);ell(p[0],p[1]-rx*.3,rx,rx*.58,snow(col));ell(p[0]-rx*.19,p[1]-rx*.4,rx*.52,rx*.36,snow(T.shade(col,14)));return[p[0],p[1]-rx*.84];};
  const stack=(u,v,h=55,r=.035,steam=false)=>{const p=tank(u,v,r,h,C.brick);const rp=Math.max(3,r*n*32);px(p[0]-rp-1,p[1]-2,C.cream,rp*2+2,3);ell(p[0],p[1]-2,rp-1,2,'#393b3d');const key=steam?'steam':'smoke';(T.hooks[key]||(T.hooks[key]=[])).push([p[0],p[1]-3]);T.hooks.exhaust=[p[0],p[1]-3];beacon(u,v,h+1);return p;};
  const pipe=(points,col='#87a6a5',wd=3)=>{for(let j=1;j<points.length;j++){const a=P(...points[j-1]),b=P(...points[j]);L(a,b,'#3c545c',wd+2);L([a[0],a[1]-1],[b[0],b[1]-1],col,wd);}};
  const lattice=(u,v,h=58,spread=.075,col='#586e74')=>{
    const a=P(u-spread,v),b=P(u+spread,v),c=P(u,v,h);L(a,c,col,2);L(b,c,col,2);L(a,b,col,2);
    for(let j=1;j<6;j++){const f=j/6,hh=h*f,w=spread*(1-f);L(P(u-w,v,hh),P(u+w,v,hh),col);if(j<5){const w2=spread*(1-(j+1)/6);L(P(u-w,v,hh),P(u+w2,v,h*(j+1)/6),col);L(P(u+w,v,hh),P(u-w2,v,h*(j+1)/6),col);}}
    return c;
  };
  const crane=(u,v,span=.36,h=52,gantry=false)=>{
    const col='#b3985e';if(gantry){lattice(u-span*.5,v,h,.035,col);lattice(u+span*.5,v,h,.035,col);L(P(u-span*.5,v,h),P(u+span*.5,v,h),col,4);L(P(u-span*.5,v,h+6),P(u+span*.5,v,h+6),'#d6c080',2);for(let j=0;j<5;j++)L(P(u-span*.5+span*j/5,v,h),P(u-span*.5+span*(j+1)/5,v,h+6),col);}
    else{lattice(u,v,h,.055,col);L(P(u-span*.22,v,h),P(u+span*.7,v,h),col,4);L(P(u,v,h+13),P(u+span*.7,v,h),col);box(u-.055,v-.035,.11,.09,7,'#667f7d',h-9);}
    const hu=gantry?u+span*.18:u+span*.58;L(P(hu,v,h),P(hu,v,h*.45),'#454d50');L(P(hu,v,h*.45),P(hu+.025,v,h*.45-3),'#454d50',2);
  };
  const container=(u,v,du=.2,dv=.1,h=10,col='#5b7b80')=>{box(u,v,du,dv,h,col);for(let j=1;j<6;j++)L(P(u+du*j/6,v+dv,1),P(u+du*j/6,v+dv,h-1),T.shade(col,25));};
  const truck=(u,v,col='#547277',long=true)=>{const du=long?.19:.12,dv=.085;box(u,v,du,dv,7,col);box(u+du,v,.055,dv,6,C.cream);for(const f of[.04,du-.02,du+.035]){const p=P(u+f,v+dv);ell(p[0],p[1]+1,2,2,'#303b40');}const p=P(u+du+.025,v,7);px(p[0],p[1],'#375665',3,3);};
  const road=(u=.055,v=.83,du=.89,dv=.11)=>{ground(u,v,du,dv,'#777e79');L(P(u,v+dv*.5),P(u+du,v+dv*.5),'#d3c9aa');};
  const railFence=(a,b)=>{const steps=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*n/.11));L(P(a[0],a[1],5),P(b[0],b[1],5),'#394446');L(P(a[0],a[1],2),P(b[0],b[1],2),'#53605c');for(let j=0;j<=steps;j++){const f=j/steps,u=a[0]+(b[0]-a[0])*f,v=a[1]+(b[1]-a[1])*f;L(P(u,v),P(u,v,7),'#303c3e');}};
  const fence=(u=.035,v=.035,du=.93,dv=.93)=>{railFence([u+du,v],[u+du,v+dv]);railFence([u+du,v+dv],[u,v+dv]);};
  const sign=(u,v,h,text)=>{K.sign(u*n,v*n,h,text,'#305651');T.hooks.sign=P(u,v,h);};
  const lamp=(u,v,h=18)=>K.lamp(u*n,v*n,h);
  const pond=(u,v,du,dv)=>{box(u,v,du,dv,3,'#a6ada3');plate(u+.008,v+.008,du-.016,dv-.016,4,T.winter?'#b6d4da':C.water);for(let j=1;j<4;j++)L(P(u+du*.1,v+dv*j/4,4),P(u+du*.83,v+dv*j/4,4),'#7ca8b1');};
  const rail=(u,v,du)=>{ground(u,v,du,.09,'#6f716b');for(let j=0;j<Math.max(5,n*5);j++){const x=u+du*j/Math.max(5,n*5);L(P(x,v),P(x+.018,v+.09),'#988d73',2);}L(P(u,v+.023),P(u+du,v+.023),'#b8c2bf',2);L(P(u,v+.068),P(u+du,v+.068),'#b8c2bf',2);};
  const dish=(u,v,h=47,r=.095)=>{const p=lattice(u,v,h-5,.055);const rx=Math.max(5,r*n*32);ell(p[0],p[1]-6,rx,Math.max(3,rx*.35),snow('#c5cec8'));L([p[0]-rx*.65,p[1]-8],[p[0]+rx*.48,p[1]-2],'#839a9b');L([p[0],p[1]-6],[p[0]+rx*.65,p[1]-19],'#536e76',2);px(p[0]+rx*.65,p[1]-20,'#e1bb72',3,3);T.hooks.radar=[p[0],p[1]-7];return T.hooks.radar;};
  const fan=(u,v,h=25,r=.05)=>{const p=P(u,v,h),rx=Math.max(3,r*n*32);ell(p[0],p[1],rx,rx*.48,'#293f47');for(let a=0;a<4;a++){const c=a*Math.PI/2+.4;L(p,[p[0]+Math.cos(c)*rx*.8,p[1]+Math.sin(c)*rx*.38],'#a7b8b8',2);}};
  const finish=()=>{lamp(.88,.87,15);};
  const grass=[22,25,26,46,109,120,133].includes(T.k);ground(.025,.025,.95,.95,grass?(T.sea===2?'#929466':T.sea===0?'#82956c':'#82956c'):'#9b9d8c');
  L(P(.025,.975),P(.975,.975),T.winter?'#b9c8c5':'#657267',2);L(P(.975,.025),P(.975,.975),T.winter?'#c3ceca':'#7b8575',2);
  /* 遠邊欄杆先畫，近邊欄杆最後畫；不可把後欄硬蓋在廠房屋頂。 */
  if(T.k!==109){const q=T.k===22?[.025,.025,.95,.78]:T.k===26?[.055,.08,.89,.88]:[.035,.035,.93,.93];railFence([q[0],q[1]],[q[0]+q[2],q[1]]);railFence([q[0],q[1]],[q[0],q[1]+q[3]]);}
  return {K,n,P,F,L,px,C,snow,ground,box,plate,lit,beacon,shed,door,ell,tank,dome,stack,pipe,lattice,crane,container,truck,road,fence,sign,lamp,pond,rail,dish,fan,finish};
}
const INDUSTRY634={
  22:{name:'英式農場',draw(T){
    const I=industryKit634(T),{P,L,px,ground,shed,tank,road,fence,box}=I,v=T.v%3,s=T.stage|0;
    const field=(u,w,du,dv)=>{ground(u,w,du,dv,T.winter?'#d9e1da':'#776049');const rows=3+Math.min(5,T.n),cols=3+Math.min(5,T.n);
      for(let a=0;a<rows;a++){const y=w+dv*(a+.5)/rows;L(P(u,y),P(u+du,y),T.winter?'#bac4b9':'#ae9068');for(let b=0;b<cols;b++){const p=P(u+du*(b+.5)/cols,y),m=(a+b)%2;
        if(s===0){px(p[0],p[1],T.winter?'#afb9ad':'#d4ba80',2,1);}
        else if(s===1){px(p[0],p[1]-3,T.winter?'#a6b6a2':'#6e9654',2,4);px(p[0]-1,p[1]-2,T.winter?'#bcc7b7':'#88ac61',3,1);}
        else if(s===2){L([p[0],p[1]],[p[0]+m,p[1]-7],T.winter?'#b4bfac':'#aa9b4b');px(p[0]-1+m,p[1]-7,T.winter?'#e6e8d9':T.sea===0?'#91ab62':'#d3bc65',3,3);}
        else{px(p[0],p[1]-2,T.winter?'#a5b3a1':'#b39a5e',1,3);if((a+b)%3===0)px(p[0]+2,p[1]-1,'#9b8059',3,2);}
      }}
    };
    if(v===0){field(.45,.1,.45,.64);shed(.07,.1,.3,.32,19,'gable');tank(.2,.58,.065,25,'#b7b5a2');road(.365,.07,.055,.72);box(.1,.73,.13,.08,4,'#bba66e');}
    else if(v===1){field(.49,.09,.42,.33);field(.49,.49,.42,.29);shed(.06,.11,.35,.16,25,'gable',true);shed(.06,.32,.18,.35,17,'gable');ground(.26,.32,.15,.35,'#bcb096');road(.41,.1,.045,.7);box(.28,.53,.09,.09,7,'#c1a862');}
    else{field(.07,.48,.38,.3);field(.53,.48,.37,.3);shed(.12,.1,.25,.27,23,'gable');shed(.4,.1,.22,.27,23,'gable');tank(.78,.22,.07,34,'#999e92');road(.06,.395,.85,.045);}
    fence(.025,.025,.95,.78);I.sign(.27,.83,7,['FARM','GRANGE','HOME FARM'][v]);T.hooks.field=P(.64,.61);T.hooks.sprinkler=P(.46,.6,3);T.hooks.farmer=P(.4,.77);I.pipe([[.46,.44,1],[.46,.72,1]],'#537e82',1);
  }},
  25:{name:'英式太陽能場',draw(T){
    const I=industryKit634(T),{P,F,L,box,shed}=I,v=T.v%3;
    const panel=(u,w,du,dv,h=7)=>{for(const a of[.08,.88])L(P(u+du*a,w+dv*.7),P(u+du*a,w+dv*.7,h),'#737d76',2);F([P(u,w,h+5),P(u+du,w,h+5),P(u+du,w+dv,h),P(u,w+dv,h)],T.winter?'#c8d5d7':'#31516b');for(let j=1;j<4;j++)L(P(u+du*j/4,w,h+5),P(u+du*j/4,w+dv,h),'#7395a6');L(P(u,w+dv*.5,h+2.5),P(u+du,w+dv*.5,h+2.5),'#839fab');};
    if(v===0){for(let j=0;j<3;j++)for(let k=0;k<2;k++)panel(.08+k*.4,.1+j*.22,.33,.14);shed(.68,.79,.22,.11,10,'gable');}
    else if(v===1){shed(.08,.09,.21,.26,17,'gable',true);for(let j=0;j<3;j++)panel(.37,.1+j*.25,.52-j*.07,.17,5+j*4);box(.13,.55,.13,.13,11,'#91a3a0');}
    else{for(let k=0;k<2;k++)panel(.1+k*.42,.15,.31,.46,22);I.truck(.15,.55);I.truck(.58,.55,'#8c6250',false);shed(.13,.76,.24,.12,12,'flat');box(.6,.79,.21,.09,8,'#889894');}
    I.fence();I.sign(.26,.91,9,'SOLAR');
  }},
  26:{name:'英式風力站',draw(T){
    const I=industryKit634(T),{P,L,F,tank,box}=I,v=T.v%3;
    const turbine=(u,w,h,r)=>{const c=tank(u,w,.025,h,'#b8c5c1'),rad=Math.min(r,12+T.n*6);for(let j=0;j<3;j++){const a=j*2.094-.4,tip=[c[0]+Math.cos(a)*rad,c[1]+Math.sin(a)*rad];F([[c[0]-1,c[1]-1],[tip[0]-Math.sin(a)*2,tip[1]+Math.cos(a)*2],[tip[0],tip[1]],[c[0]+Math.sin(a)*3,c[1]-Math.cos(a)*3]],'#dde3d9');}I.ell(c[0],c[1],3,3,'#839d9e');return c;};
    if(v===0){T.hooks.rotor=turbine(.46,.4,73,29);I.shed(.65,.73,.22,.15,12,'gable',true);}
    else if(v===1){turbine(.18,.5,52,20);T.hooks.rotor=turbine(.75,.35,67,24);I.shed(.1,.72,.26,.13,12,'gable');}
    else{const p=tank(.49,.43,.028,65,'#aebebb');for(const s of[-1,1]){F([[p[0],p[1]-3],[p[0]+s*12,p[1]+11],[p[0]+s*8,p[1]+44],[p[0],p[1]+56],[p[0]+s*4,p[1]+27]],'#a9c2c1');L([p[0],p[1]],[p[0],p[1]+58],'#566f74',2);}T.hooks.rotor=p;T.hooks.rotorStatic=true;I.shed(.1,.73,.32,.13,12,'gable',true);box(.66,.71,.2,.12,9,'#73938c');}
    I.road(.08,.89,.8,.06);I.fence(.055,.08,.89,.88);
  }},
  27:{name:'英式污水處理',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.08,.39,.2,22,'gable');for(const q of[[.69,.29],[.64,.69]]){const p=I.tank(...q,.17,7,'#b6b8a7',true);I.L([p[0]-T.n*5,p[1]],[p[0]+T.n*5,p[1]],'#687d7d',2);}I.shed(.08,.62,.29,.19,15,'flat');}
    else if(v===1){I.shed(.07,.08,.2,.59,26,'gable',true);for(let j=0;j<3;j++){I.pond(.35,.1+j*.23,.55,.17);I.L(I.P(.41,.1+j*.23,6),I.P(.41,.27+j*.23,6),'#dad1ae',2);}I.pipe([[.31,.14,5],[.31,.82,5],[.85,.82,5]],'#839795');}
    else{I.dome(.27,.25,.16,25,'#899a91');I.shed(.57,.1,.31,.2,20,'saw');for(let j=0;j<2;j++){I.pond(.13+j*.41,.52,.31,.26);for(let k=0;k<4;k++){const p=I.P(.17+j*.41+k*.062,.69,5);I.L(p,[p[0],p[1]-7],'#81965e');}}I.pipe([[.27,.34,8],[.27,.45,8],[.72,.45,8]]);}
    I.road();I.fence();I.sign(.29,.91,8,'WATER');
  }},
  46:{name:'英式氣象站',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.12,.38,.29,21,'gable',true);const p=I.lattice(.72,.34,65,.07);I.L([p[0]-9,p[1]+9],[p[0]+9,p[1]+9],'#b9c8c2',2);I.ell(p[0]-9,p[1]+7,3,2,'#657e85');I.ell(p[0]+9,p[1]+10,3,2,'#657e85');T.hooks.radar=p;I.box(.22,.7,.12,.13,11,'#d9ddd2',6);}
    else if(v===1){I.shed(.1,.12,.27,.54,27,'gable');const p=I.dome(.69,.38,.16,32,'#c4d1ce');T.hooks.radar=p;I.box(.58,.66,.23,.12,7,'#729391');}
    else{I.shed(.1,.64,.56,.2,19,'flat',true);I.dish(.57,.24,51,.16);I.lattice(.17,.22,37,.035);I.pond(.76,.7,.11,.12);}
    const p=I.P(.32,.58,9);for(let j=0;j<4;j++)I.px(p[0]-4,p[1]+j*2,'#e7e8dc',9,1);I.fence();I.sign(.43,.91,7,'MET');
  }},
  49:{name:'英式油井',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const jack=(u,w,h=32,span=.33)=>{I.box(u-.07,w-.075,.14,.15,4,'#657575');const p=I.lattice(u,w,h,.08,'#6e746a');const a=I.P(u-span*.38,w,h+7),b=I.P(u+span*.58,w,h-1);I.L(a,b,'#b99b62',5);I.F([b,[b[0]+4,b[1]-4],[b[0]+5,b[1]+9],[b[0]+1,b[1]+11]],'#7e7659');I.L([b[0]+2,b[1]+10],I.P(u+span*.58,w,3),'#465b61');I.ell(p[0]-5,p[1]+h*.55,5,5,'#465b5c');};
    if(v===0){jack(.57,.35,33,.37);I.shed(.09,.58,.29,.21,17,'gable',true);I.tank(.74,.75,.09,16,'#8c9f98');}
    else if(v===1){I.lattice(.49,.32,81,.14,'#85745a');I.box(.36,.2,.26,.22,7,'#637d7c',48);I.pipe([[.5,.37,4],[.75,.58,4],[.75,.8,4]]);I.shed(.1,.67,.34,.16,16,'gable');I.tank(.78,.75,.09,21);}
    else{jack(.3,.27,32,.25);jack(.7,.57,40,.25);I.shed(.08,.69,.3,.16,17,'flat');I.tank(.79,.84,.07,19);}
    I.road(.06,.9,.87,.07);I.fence();
  }},
  50:{name:'英式礦場',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.12,.12,.27,.31,45,'gable',true);I.stack(.17,.17,70,.035);const p=I.lattice(.65,.31,50,.13,'#7e6551');I.ell(p[0],p[1],7+T.n,7+T.n,'#33464b');I.ell(p[0],p[1],4+T.n,4+T.n,'#a99b7d');I.L([p[0]-8,p[1]],I.P(.37,.32,32),'#4b5756');I.shed(.42,.59,.44,.2,18,'saw');}
    else if(v===1){for(let j=0;j<4;j++)I.ground(.11+j*.06,.1+j*.065,.7-j*.12,.56-j*.115,['#aa9776','#8c7c62','#736754','#494f49'][j]);I.crane(.7,.66,.32,39);I.shed(.11,.74,.3,.16,18,'gable',true);I.pipe([[.28,.35,4],[.28,.6,15],[.65,.79,15]],'#ad986f',6);}
    else{for(const u of[.27,.69]){I.lattice(u,.29,61,.12,'#607276');const p=I.P(u,.29,61);I.ell(p[0],p[1],6+T.n,6+T.n,'#3e5058');I.L([p[0]-5,p[1]],[p[0]+5,p[1]],'#b4a478');}I.shed(.14,.51,.7,.22,25,'saw');I.rail(.07,.84,.84);}
    I.ground(.7,.78,.17,.1,'#5c6158');I.fence();I.sign(.39,.94,8,'COLLIERY');
  }},
  51:{name:'英式太空研究中心',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const rocket=(u,w,h=88)=>{const p=I.tank(u,w,.035,h,'#d2d8cf');I.F([[p[0]-4,p[1]],[p[0],p[1]-13],[p[0]+4,p[1]]],'#ececdf');for(const s of[-1,1])I.F([I.P(u,w,8),[p[0]+s*9,I.P(u,w)[1]-4],[p[0]+s*4,I.P(u,w)[1]-23]],'#899fa2');};
    if(v===0){I.shed(.08,.12,.3,.43,51,'flat');I.ground(.49,.12,.4,.47,'#7b837b');I.lattice(.65,.27,96,.06,'#938b72');rocket(.73,.42,87);I.shed(.16,.7,.34,.16,25,'gable');}
    else if(v===1){I.shed(.09,.11,.62,.32,39,'saw');I.dish(.69,.7,51,.2);I.dome(.22,.68,.11,18);I.road(.1,.48,.74,.09);}
    else{I.shed(.11,.12,.27,.52,54,'flat',true);I.crane(.68,.29,.33,83,true);rocket(.67,.4,67);I.shed(.46,.7,.4,.16,23,'flat');I.tank(.23,.8,.06,26,'#a8b9b5');}
    I.fence();I.sign(.47,.92,13,'SPACE');I.beacon(v===1?.69:v===0?.65:.68,v===1?.7:v===0?.27:.29,v===1?51:v===0?96:89);
  }},
  57:{name:'英式食品加工廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.1,.58,.4,31,'saw');I.tank(.8,.23,.07,37,'#c0c5b8');I.tank(.8,.48,.07,32,'#bac1b5');I.shed(.12,.62,.3,.17,20,'gable');I.stack(.2,.18,58,.026,true);}
    else if(v===1){I.shed(.07,.1,.34,.58,39,'gable');I.shed(.47,.1,.37,.25,23,'flat');for(let j=0;j<3;j++)I.tank(.5+j*.16,.64,.055,24,'#bdc7c0');I.pipe([[.33,.43,26],[.6,.43,26],[.6,.6,26]]);I.stack(.19,.22,58,.025,true);}
    else{I.shed(.1,.1,.69,.24,25,'saw');I.shed(.1,.39,.46,.26,26,'saw');I.tank(.76,.6,.12,35,'#abbab2');I.box(.6,.76,.22,.09,10,'#a4b8b6');I.stack(.76,.6,47,.022,true);}
    I.door(.22,.79,.15,12);I.road();I.truck(.53,.86);I.fence();I.sign(.29,.7,24,'FOODS');
  }},
  58:{name:'英式核電廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const cooling=(u,w,r,h)=>{const b=I.P(u,w),rx=r*T.n*32;for(let y=0;y<h;y++){const p=y/h,rr=rx*(.5+.48*Math.pow(Math.abs(p-.52)/.52,1.45));I.px(b[0]-rr,b[1]-h+y,'#aab9b5',rr*2,1);I.px(b[0]-rr,b[1]-h+y,'#ccd3c7',rr*.75,1);}I.ell(b[0],b[1]-h,rx*.97,rx*.29,'#d0d8cf');I.ell(b[0],b[1]-h,rx*.72,rx*.2,'#536b72');(T.hooks.steam||(T.hooks.steam=[])).push([b[0],b[1]-h-1]);};
    if(v===0){I.dome(.24,.25,.16,35);cooling(.68,.23,.13,69);cooling(.74,.59,.13,63);I.shed(.08,.57,.4,.24,27,'gable');}
    else if(v===1){cooling(.28,.27,.18,82);I.dome(.7,.26,.15,42);I.shed(.14,.63,.69,.22,27,'saw');I.pipe([[.29,.38,11],[.29,.55,11],[.72,.55,11]]);}
    else{I.dome(.27,.23,.14,38);I.dome(.66,.23,.14,38);I.shed(.1,.54,.69,.28,30,'flat');for(let j=0;j<3;j++){I.box(.2+j*.2,.61,.12,.12,10,'#a9b8b5',31);I.fan(.26+j*.2,.67,43,.055);}I.stack(.85,.52,67,.035,true);}
    T.hooks.smoke=[];I.fence();I.road(.06,.9,.85,.06);I.sign(.41,.94,10,'ENERGY');if(v===0)I.beacon(.68,.23,69);else if(v===1)I.beacon(.28,.27,82);else I.beacon(.85,.52,67);
  }},
  59:{name:'英式水力發電廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.pond(.53,.07,.36,.78);I.box(.47,.39,.46,.17,26,'#a1a99b');for(let j=0;j<3;j++)I.box(.55+j*.105,.51,.035,.12,18,'#596f72');I.shed(.08,.21,.28,.42,29,'gable',true);I.pipe([[.6,.3,4],[.6,.59,3],[.6,.77,3]],'#96bcc0',6);}
    else if(v===1){I.pond(.1,.06,.77,.3);I.box(.08,.37,.8,.14,35,'#a8ab96');for(let j=0;j<4;j++){I.box(.14+j*.19,.36,.055,.18,40,'#999e8d');I.pond(.21+j*.19,.53,.1,.31);}I.shed(.1,.78,.32,.12,18,'gable',true);}
    else{I.pond(.1,.11,.25,.7);I.pond(.65,.11,.23,.7);I.shed(.31,.26,.35,.4,35,'gable',true);for(let j=0;j<2;j++){I.pipe([[.19,.21+j*.19,7],[.48,.3+j*.19,7],[.76,.3+j*.19,7]],'#73989e',5);}I.box(.31,.14,.35,.08,12,'#b4b5a1');}
    I.fence();I.sign(.34,.92,9,'HYDRO');
  }},
  62:{name:'英式焚化發電廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.12,.56,.48,38,'saw');I.stack(.78,.22,85,.042);I.tank(.78,.6,.1,27);I.pipe([[.6,.3,24],[.78,.3,24],[.78,.55,24]]);}
    else if(v===1){I.shed(.07,.1,.31,.58,48,'gable');I.shed(.46,.14,.38,.25,26,'saw');I.stack(.66,.52,79,.035);I.stack(.81,.62,69,.03);I.container(.48,.76,.32,.09,10,'#8a9279');}
    else{I.shed(.12,.09,.72,.24,29,'saw');I.shed(.12,.41,.39,.28,38,'flat');I.stack(.68,.49,91,.055);I.tank(.79,.7,.095,31,'#9aaba0');I.pipe([[.43,.55,25],[.65,.55,25],[.78,.68,25]]);}
    I.road();I.truck(.2,.88,'#73907b');I.fence();I.sign(.31,.62,30,'ENERGY');const work=I.P(v===1?.24:.32,v===1?.68:v===2?.69:.6,8);I.lit([work[0]-5,work[1]-4],10,5);T.hooks.work=[work[0]-5,work[1]-4,10,5];
  }},
  64:{name:'英式倉儲物流',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.1,.63,.51,31,'saw');for(let j=0;j<3;j++)I.door(.14+j*.17,.61,.12,14);I.container(.77,.19,.13,.19,17,'#857e60');}
    else if(v===1){I.shed(.07,.12,.29,.54,47,'gable');I.shed(.42,.13,.45,.24,24,'gable');for(let j=0;j<3;j++)I.container(.47,.47+j*.12,.35,.09,10,['#6e8e88','#9d755b','#7a8390'][j]);}
    else{I.shed(.09,.11,.32,.5,28,'gable');I.shed(.52,.11,.32,.5,28,'gable');I.box(.4,.26,.13,.13,8,'#a6b5ad',19);I.container(.55,.7,.29,.11,11,'#8c9a84');}
    I.road(.07,.79,.86,.14);I.truck(.17,.84);I.truck(.56,.85,'#985f4d',false);I.fence();I.sign(.26,.67,24,'WAREHOUSE');
  }},
  89:{name:'英式電視塔',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.11,.61,.48,.22,24,'gable');const p=I.tank(.59,.35,.035,92,'#a9b7b4');I.tank(.59,.35,.14,7,'#8caaa8',false,67);I.tank(.59,.35,.115,6,'#c2c9bd',false,77);I.L([p[0],p[1]],I.P(.59,.35,114),'#b8c4be',2);T.hooks.radar=I.P(.59,.35,89);}
    else if(v===1){I.lattice(.5,.36,106,.18,'#647b7e');for(let j=0;j<3;j++){const p=I.P(.5,.36,55+j*15);I.ell(p[0]+7,p[1],6,4,'#c5d1c9');I.L([p[0]-8,p[1]],[p[0]+8,p[1]],'#b9c6bd',2);}I.shed(.12,.66,.65,.2,23,'flat');T.hooks.radar=I.P(.5,.36,100);}
    else{I.shed(.31,.18,.27,.28,56,'flat',true);I.box(.25,.13,.39,.37,12,'#7c999c',55);I.tank(.45,.32,.035,108,'#c0c6b9');I.dish(.79,.66,43,.1);I.shed(.11,.73,.48,.13,18,'gable');T.hooks.radar=I.P(.45,.32,101);}
    I.beacon(v===0?.59:v===1?.5:.45,v===0?.35:v===1?.36:.32,v===0?114:v===1?106:108);I.fence();I.sign(.27,.94,9,'BBC');
  }},
  91:{name:'英式貿易站',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.09,.1,.33,.39,43,'gable');I.shed(.5,.12,.37,.23,24,'gable');I.container(.52,.51,.27,.11,13,'#78958c');I.crane(.75,.64,.24,39);}
    else if(v===1){I.shed(.1,.1,.73,.24,34,'gable',true);I.shed(.1,.4,.22,.32,22,'gable');for(let j=0;j<3;j++)I.container(.4+j*.16,.62,.12,.13,12,['#9b735a','#6d8c87','#9b9b78'][j]);I.sign(.39,.4,20,'EXCHANGE');}
    else{I.shed(.1,.1,.28,.52,42,'gable');I.shed(.5,.16,.33,.41,23,'saw');I.box(.35,.28,.17,.09,7,'#879792',22);I.container(.52,.68,.3,.1,14,'#776b62');}
    I.road();I.truck(.18,.85,'#71968a',false);I.fence();I.sign(.24,.63,24,'TRADE');
  }},
  100:{name:'英式釀酒廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.1,.12,.36,.47,42,'gable');I.stack(.18,.17,71,.03);for(let j=0;j<3;j++)I.tank(.66+j*.09,.27+j*.14,.061,31,'#b48a58');I.shed(.52,.67,.32,.13,18,'gable');}
    else if(v===1){I.shed(.1,.12,.69,.24,25,'saw');for(const q of[[.27,.64],[.59,.64]]){I.tank(...q,.115,31,'#b59869');const p=I.P(...q,31),r=T.n*3.8;I.F([[p[0]-r,p[1]],[p[0],p[1]-20],[p[0]+r,p[1]]],I.snow('#57636a'));I.L([p[0],p[1]-20],[p[0]+6,p[1]-20],'#c0c9bd',2);}I.stack(.84,.25,56,.029,true);}
    else{I.shed(.09,.1,.31,.48,46,'gable',true);I.shed(.49,.11,.35,.24,29,'gable');for(let j=0;j<3;j++)I.tank(.51+j*.15,.63,.057,27,'#c4c8b9');I.pipe([[.35,.41,25],[.68,.41,25],[.68,.6,25]],'#b28a53');I.stack(.23,.18,71,.027);}
    for(let j=0;j<3;j++)I.tank(.12+j*.095,.75,.029,7,'#8e7553');I.road();I.fence();I.sign(.26,.62,29,'BREWERY');
  }},
  109:{name:'英式科技園',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.1,.1,.56,.26,43,'gable');I.shed(.1,.48,.25,.27,26,'flat');I.shed(.52,.49,.34,.27,33,'flat');I.box(.33,.24,.2,.35,9,'#799b9e',14);}
    else if(v===1){I.shed(.08,.11,.28,.61,47,'flat',true);I.shed(.46,.11,.38,.25,28,'saw');I.shed(.55,.51,.29,.23,35,'flat');I.pond(.14,.79,.36,.09);}
    else{I.shed(.1,.13,.34,.28,47,'gable');I.shed(.56,.13,.28,.28,39,'gable');I.shed(.17,.59,.61,.18,26,'flat');I.box(.4,.23,.19,.1,8,'#76959a',28);I.dome(.66,.66,.05,35);}
    I.ground(.4,.47,.12,.26,'#bdb797');I.K.tree(.46*T.n,.53*T.n,.11*T.n);I.K.hedge(.08*T.n,.9*T.n,.82*T.n,.04*T.n);I.sign(.43,.92,11,'SCIENCE');I.finish();
  }},
  110:{name:'英式貨運站',draw(T){
    const I=industryKit634(T),v=T.v%3;
    I.rail(.06,.12,.88);I.rail(.06,.28,.88);
    if(v===0){I.crane(.56,.38,.67,66,true);I.shed(.1,.57,.31,.24,27,'gable');for(let j=0;j<3;j++)I.container(.49,.55+j*.105,.35,.085,10,['#6b8c82','#a2765d','#85978d'][j]);}
    else if(v===1){I.shed(.09,.44,.59,.26,42,'saw');I.crane(.8,.6,.2,47);I.container(.17,.17,.24,.1,12,'#96745a');I.container(.54,.17,.25,.1,12,'#759293');}
    else{I.shed(.09,.45,.27,.33,32,'gable',true);I.crane(.62,.52,.39,48,true);I.container(.46,.65,.2,.11,22,'#859476');I.container(.69,.68,.2,.11,11,'#ab775d');I.container(.23,.17,.46,.09,12,'#737f8e');}
    I.road(.06,.85,.88,.095);I.truck(.51,.88);I.sign(.23,.82,24,'FREIGHT');I.fence();
  }},
  111:{name:'英式資源回收廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.09,.1,.55,.35,33,'saw');for(let j=0;j<3;j++)I.container(.1+j*.23,.61,.18,.15,12,['#708b7b','#a58b65','#718f97'][j]);I.crane(.79,.3,.23,39);}
    else if(v===1){I.shed(.08,.1,.3,.62,37,'gable');I.shed(.48,.1,.36,.2,23,'flat');I.pipe([[.35,.32,19],[.64,.48,19],[.64,.7,12]],'#a4956b',6);for(let j=0;j<2;j++)I.container(.52+j*.18,.72,.15,.13,15,'#778e7a');}
    else{I.shed(.1,.1,.67,.23,25,'saw');I.shed(.12,.48,.3,.26,26,'saw');I.crane(.67,.52,.38,47,true);for(let j=0;j<3;j++)I.box(.52+j*.11,.69,.075,.09,7,'#a49d7c');}
    I.road();I.truck(.25,.86,'#73927d');I.fence();I.sign(.27,.53,25,'RECYCLE');
  }},
  116:{name:'英式數據中心',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const units=(u,w,du,dv,h,count)=>{I.shed(u,w,du,dv,h,'flat');for(let j=0;j<count;j++){const x=u+du*(j+.5)/count;I.box(x-du/count*.3,w+dv*.32,du/count*.6,dv*.36,8,'#8fa6a5',h+2);I.fan(x,w+dv*.5,h+11,.035);}for(let j=0;j<3;j++)I.L(I.P(u,w+dv,9+j*7),I.P(u+du,w+dv,9+j*7),'#426474',2);};
    if(v===0){units(.1,.1,.69,.38,35,4);I.shed(.1,.63,.24,.16,20,'gable');for(let j=0;j<3;j++)I.container(.48+j*.14,.66,.1,.13,15,'#8f9d90');}
    else if(v===1){units(.08,.12,.29,.59,46,2);units(.49,.12,.34,.36,30,2);I.pipe([[.34,.44,28],[.55,.44,28],[.55,.62,10]],'#a8b6a7');I.tank(.71,.7,.095,24,'#a8b5ac');}
    else{units(.1,.11,.32,.24,37,2);units(.53,.11,.32,.24,37,2);units(.16,.55,.62,.21,28,3);I.box(.4,.22,.15,.08,9,'#94a9a7',23);}
    I.fence();I.road();I.sign(.3,.82,18,'DATA');I.finish();
  }},
  118:{name:'英式化肥廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.1,.43,.46,30,'saw');for(let j=0;j<3;j++)I.tank(.69,.17+j*.22,.08,35+j*8,'#a9b5a0');I.stack(.84,.72,65,.026);I.pipe([[.45,.35,20],[.7,.35,20],[.7,.65,20]]);}
    else if(v===1){I.shed(.07,.11,.65,.25,26,'gable');I.dome(.28,.65,.16,17,'#b7b9a3');I.dome(.7,.65,.14,21,'#9aa98e');I.stack(.83,.19,58,.031);I.pipe([[.25,.32,15],[.25,.49,15],[.68,.49,15]]);}
    else{I.tank(.23,.23,.12,48,'#9aada5');I.tank(.61,.2,.07,72,'#b1bfb2');I.tank(.82,.37,.07,55,'#a9b8ad');I.shed(.12,.56,.69,.22,28,'saw');I.pipe([[.25,.29,23],[.62,.37,23],[.76,.53,23]]);I.stack(.59,.3,81,.022);}
    I.road();I.truck(.18,.88,'#8f9579');I.fence();I.sign(.35,.66,25,'FERTILISER');
  }},
  119:{name:'英式中央廚房',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.1,.1,.55,.39,29,'gable');I.shed(.1,.54,.33,.21,19,'flat');I.container(.71,.18,.16,.28,17,'#b6c3b8');I.stack(.34,.23,49,.018,true);I.stack(.51,.23,47,.018,true);}
    else if(v===1){I.shed(.11,.1,.27,.59,39,'gable');I.shed(.46,.11,.37,.24,26,'saw');I.box(.35,.24,.14,.12,8,'#819a98',20);I.box(.57,.56,.26,.18,18,'#bfc5b2');I.stack(.22,.19,58,.024,true);}
    else{I.shed(.11,.1,.69,.24,29,'saw');I.shed(.12,.43,.22,.3,24,'gable');I.shed(.57,.43,.23,.3,24,'gable');I.box(.36,.52,.19,.14,11,'#8d9f92');I.stack(.65,.16,48,.022,true);}
    I.road();I.truck(.17,.85,'#bfc5b6',false);I.truck(.58,.85,'#82988b',false);I.fence();I.sign(.26,.61,25,'KITCHEN');
  }},
  120:{name:'英式魚塘',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.1,.29,.24,19,'gable',true);I.pond(.46,.1,.43,.26);I.pond(.1,.46,.35,.34);I.pond(.55,.46,.34,.34);I.road(.46,.4,.06,.44);}
    else if(v===1){I.shed(.1,.1,.74,.16,18,'gable');for(let j=0;j<3;j++){I.pond(.1+j*.27,.39,.21,.44);I.L(I.P(.1+j*.27,.59,6),I.P(.31+j*.27,.59,6),'#bfb58f',2);}}
    else{I.shed(.09,.13,.26,.55,20,'gable');for(const q of[[.61,.29],[.63,.69]]){const p=I.tank(...q,.19,8,'#a2b6b0',true);I.L([p[0]-T.n*6,p[1]],[p[0]+T.n*6,p[1]],'#b8aa83',2);}I.pipe([[.34,.23,5],[.4,.23,5],[.4,.76,5]],'#7baca9');}
    const p=I.P(.7,.65,8);I.L([p[0]-4,p[1]],[p[0]+4,p[1]],'#cdd9ce',2);I.fence();I.sign(.38,.91,7,'FISHERY');
  }},
  121:{name:'英式煉油廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const column=(u,w,h,r=.043)=>{I.tank(u,w,r,h,'#a7b8b4');for(let j=12;j<h;j+=15){I.plate(u-r*.62,w-r*.62,r*1.24,r*1.24,j,'#7c908e');I.L(I.P(u+r,w,j),I.P(u+r,w,j+6),'#a7a477');}I.L(I.P(u+r*1.3,w,3),I.P(u+r*1.3,w,h),'#d3c9a1');};
    if(v===0){for(let j=0;j<3;j++)column(.61+j*.12,.16+j*.19,62+j*13);I.shed(.08,.12,.35,.37,26,'saw');I.tank(.22,.72,.13,23,'#c1c5b6');I.tank(.56,.75,.11,20,'#b2beb0');I.stack(.87,.72,87,.024);}
    else if(v===1){column(.24,.27,87,.075);column(.59,.23,66,.056);I.shed(.1,.61,.43,.2,26,'saw');I.tank(.73,.64,.15,30,'#bfc9bb');I.stack(.82,.2,104,.027);}
    else{I.tank(.2,.22,.12,28,'#bfc8bb');I.tank(.52,.21,.12,28,'#bfc8bb');column(.77,.39,90,.048);column(.62,.61,63,.044);I.shed(.1,.61,.34,.21,28,'gable');I.stack(.87,.72,96,.025);}
    I.pipe([[.2,.44,18],[.2,.52,18],[.78,.52,18],[.78,.72,18]],'#a6b9ae',4);I.pipe([[.18,.82,7],[.81,.82,7]],'#c0a56b',3);I.fence();I.sign(.25,.9,8,'REFINERY');const work=I.P(v===1?.3:.25,v===0?.49:.81,9);I.lit([work[0]-5,work[1]-3],10,5);T.hooks.work=[work[0]-5,work[1]-3,10,5];
  }},
  122:{name:'英式鋼鐵廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const furnace=(u,w,h)=>{I.tank(u,w,.09,h,'#687f81');I.tank(u,w,.055,h+17,'#859797');I.pipe([[u-.1,w,h*.55],[u-.17,w,h*.55],[u-.17,w,10]],'#938b73',4);I.box(u-.078,w-.07,.156,.14,5,'#929c90',h*.54);const p=I.P(u,w,7);I.lit([p[0]-5,p[1]-2],10,5);};
    if(v===0){I.shed(.08,.12,.44,.42,34,'saw');furnace(.73,.28,54);I.stack(.86,.53,86,.036);I.crane(.58,.73,.53,44,true);}
    else if(v===1){furnace(.3,.25,68);furnace(.69,.29,59);I.shed(.09,.62,.67,.21,31,'saw');I.stack(.84,.62,89,.035);}
    else{I.shed(.08,.1,.66,.29,39,'saw');furnace(.28,.66,45);I.crane(.69,.64,.32,69,true);I.stack(.82,.2,96,.033);I.tank(.51,.7,.074,26,'#8c9c90');}
    I.rail(.07,.88,.83);for(let j=0;j<3;j++)I.container(.49+j*.11,.84,.07,.035,3,'#555f63');I.fence();I.sign(.24,.57,31,'STEEL');
  }},
  123:{name:'英式造船廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const hull=(u,w,du,dv,h=14)=>{I.F([I.P(u,w,h),I.P(u+du*.82,w,h),I.P(u+du,w+dv*.5,h),I.P(u+du*.8,w+dv,h),I.P(u,w+dv,h)],'#738c8b');I.F([I.P(u,w+dv,h),I.P(u+du*.8,w+dv,h),I.P(u+du,w+dv*.5,h),I.P(u+du*.83,w+dv*.88,2),I.P(u+.04,w+dv,2)],'#4a636d');I.box(u+du*.14,w+dv*.18,du*.3,dv*.54,9,'#c7c9b4',h);I.box(u+du*.28,w+dv*.3,du*.08,dv*.22,10,'#997d58',h+9);I.L(I.P(u+.02,w+dv,h+2),I.P(u+du*.78,w+dv,h+2),'#d2c4a3');};
    if(v===0){I.pond(.38,.12,.52,.68);I.crane(.56,.44,.59,78,true);hull(.43,.44,.4,.16,16);I.shed(.08,.13,.23,.47,28,'saw');}
    else if(v===1){I.pond(.1,.41,.8,.39);I.shed(.1,.1,.36,.23,31,'gable');I.crane(.72,.25,.36,86);hull(.23,.54,.51,.18,19);I.container(.12,.86,.3,.07,10,'#98785c');}
    else{I.pond(.35,.08,.25,.75);I.pond(.66,.13,.22,.7);I.crane(.61,.39,.56,75,true);hull(.37,.38,.19,.28,16);hull(.68,.54,.17,.2,12);I.shed(.06,.13,.22,.57,35,'saw');}
    I.fence();I.sign(.24,.88,12,'SHIPYARD');I.beacon(v===1?.72:v===0?.56:.61,v===1?.25:v===0?.44:.39,v===1?86:v===0?78:75);
  }},
  128:{name:'英式變電所',draw(T){
    const I=industryKit634(T),v=T.v%3;
    const transformer=(u,w,du=.19,dv=.14)=>{I.box(u,w,du,dv,19,'#788e89');for(let j=0;j<5;j++)I.L(I.P(u+du*j/5,w+dv,2),I.P(u+du*j/5,w+dv,17),'#4d6b70',2);for(let j=0;j<3;j++){const p=I.P(u+du*(j+.5)/3,w+dv*.5,19);I.L(p,[p[0],p[1]-11],'#a08f58',2);for(let z=3;z<10;z+=3)I.px(p[0]-2,p[1]-z,'#cad1bd',5,1);}};
    const bus=(u,w,span)=>{for(const x of[u,u+span])I.lattice(x,w,40,.025,'#708885');I.L(I.P(u,w,40),I.P(u+span,w,40),'#adbfac',2);};
    if(v===0){I.shed(.08,.08,.32,.24,18,'gable',true);bus(.15,.44,.62);transformer(.17,.57);transformer(.56,.57);}
    else if(v===1){I.shed(.08,.1,.2,.61,24,'gable');for(let j=0;j<3;j++)transformer(.43,.15+j*.24,.29,.16);bus(.39,.77,.47);}
    else{I.shed(.12,.1,.62,.18,22,'flat',true);bus(.13,.4,.65);bus(.13,.69,.65);transformer(.15,.48,.24,.16);transformer(.56,.48,.24,.16);}
    I.fence();I.sign(.3,.91,7,'GRID');I.finish();T.hooks.smoke=[];
  }},
  129:{name:'英式海水淡化廠',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.1,.37,.35,27,'gable',true);for(let j=0;j<3;j++)I.tank(.65,.17+j*.23,.075,31,'#c6d1c6');I.pond(.1,.6,.3,.21);I.pipe([[.3,.47,9],[.51,.47,9],[.51,.78,9],[.76,.78,9]],'#568fa6',4);}
    else if(v===1){I.shed(.09,.11,.68,.22,28,'saw');for(let j=0;j<3;j++){I.box(.15+j*.23,.51,.16,.22,15,'#b0c1bb');for(let k=0;k<3;k++)I.pipe([[.17+j*.23+k*.038,.54,17],[.17+j*.23+k*.038,.72,17]],'#8aafb6',2);}I.pond(.08,.83,.76,.09);}
    else{I.tank(.23,.23,.13,29,'#bfcbc1');I.tank(.65,.23,.13,29,'#bfcbc1');I.shed(.12,.58,.45,.23,27,'flat',true);I.pond(.67,.53,.22,.28);I.pipe([[.22,.38,10],[.22,.47,10],[.75,.47,10],[.75,.65,10]],'#739eaa',4);}
    I.fence();I.sign(.29,.82,19,'DESAL');I.finish();
  }},
  131:{name:'英式防災中心',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.08,.1,.52,.3,41,'gable',true);I.shed(.08,.52,.52,.22,25,'flat');I.dish(.78,.31,59,.12);I.container(.73,.67,.13,.13,15,'#728a80');}
    else if(v===1){I.shed(.09,.12,.27,.59,52,'flat',true);I.shed(.45,.12,.38,.23,27,'gable');I.shed(.45,.5,.38,.22,25,'saw');I.lattice(.24,.3,86,.045);I.dish(.7,.23,44,.08);}
    else{I.shed(.13,.12,.62,.23,35,'gable');I.shed(.13,.43,.22,.3,30,'flat');I.shed(.55,.43,.22,.3,30,'flat');I.box(.34,.23,.23,.11,10,'#739599',21);I.dish(.7,.23,58,.1);}
    for(let j=0;j<2;j++)I.door(.17+j*.18,.74,.11,12,'#4d6875');I.road();I.truck(.2,.86,'#b2684d',false);I.fence();I.sign(.31,.47,25,'RESILIENCE');I.beacon(v===0?.78:v===1?.24:.7,v===0?.31:v===1?.3:.23,v===0?59:v===1?86:58);
  }},
  133:{name:'英式防災雷達',draw(T){
    const I=industryKit634(T),v=T.v%3;
    if(v===0){I.shed(.1,.54,.4,.25,24,'gable',true);I.dish(.63,.31,83,.15);I.box(.7,.68,.15,.12,14,'#82958b');}
    else if(v===1){I.shed(.12,.13,.31,.28,40,'flat',true);T.hooks.radar=I.dome(.28,.27,.155,56,'#cbd3c8');I.lattice(.7,.29,77,.055);I.shed(.48,.62,.36,.17,22,'gable');}
    else{I.shed(.1,.62,.68,.17,22,'flat');I.dish(.23,.23,55,.14);I.dish(.69,.36,76,.14);I.box(.12,.76,.18,.1,11,'#8d9b8b');}
    const p=I.P(.55,.67,19);I.F([[p[0]-7,p[1]-2],[p[0]-1,p[1]],[p[0]-1,p[1]+4],[p[0]-7,p[1]+6]],'#c4ae6e');I.fence();I.sign(.31,.93,8,'RADAR');I.beacon(v===0?.63:v===1?.7:.69,v===0?.31:v===1?.29:.36,v===0?83:v===1?77:76);
  }}
};
