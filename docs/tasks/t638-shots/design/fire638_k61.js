/* T638 k61 城市消防總局 v1／v2：只畫外觀；輸出只由 (k,n,winter,vi) 決定，零亂數。
   v1＝愛德華式對稱總局：石砌拱門基座（深紅木門）、紅磚兩層、孟莎屋頂、兩端高亭、正中鐘塔＋鉛灰穹頂燈籠亭（內掛銅色消防鐘）。
   v2＝1930 裝飾藝術市政總局：L 形（低石材車庫前翼＋高磚宿舍後翼）圍出右側柏油操練場，內角一座石材訓練塔（兩階退縮石冠＋晾水帶洞）。
   T638 美術總監第一輪意見已修：旗改整面紅、鐘外圈改石暗色、門改深紅、隅石後重描外角線、立面減密、字樣統一成 1px 等距點列。 */
window.fire638_k61=function(H,vi){
  const {P,Q,F,L,pixel635,faceV,faceU,box,windowV,windowU,light,arch,pave,tree,truck,edge,stone,glass,lit,slate,slateD,n,winter,ng}=H;
  const SN='#e7edef';
  const on=(i,j,p)=>((i*37+j*61+n*13+((i*j)%7)*11)%100)<p;
  const lamp=(u,v,hh)=>{L(P(u,v,0),P(u,v,hh),'#3a4648');light(u,v,hh+1.5);};
  const ring=(fn,r,N=12)=>{const a=[];for(let i=0;i<N;i++){const t=i/N*Math.PI*2;a.push(fn(Math.cos(t)*r/32,Math.sin(t)*r));}return a;};
  /* 鐘面：外圈用石暗色（不用近黑，免得兩面鐘並排讀成一對眼睛）；lt=false 時夜裡不亮。 */
  const clockV=(cu,v,cz,r,lt=true)=>{const f=(a,b)=>P(cu+a,v,cz+b);F(ring(f,r+1),'#8f8873');F(ring(f,r),'#f3eedc');if(lt)F(ring(f,r-.7),'#fff0c4',ng);L(P(cu,v,cz),P(cu,v,cz+r*.75),'#2b2f31');L(P(cu,v,cz),P(cu+r*.55/32,v,cz),'#2b2f31');};
  const clockU=(u,cv,cz,r,lt=true)=>{const f=(a,b)=>P(u,cv-a,cz+b);F(ring(f,r+1),'#7d7764');F(ring(f,r),'#dcd6c3');if(lt)F(ring(f,r-.7),'#f6e2b0',ng);L(P(u,cv,cz),P(u,cv,cz+r*.75),'#2b2f31');L(P(u,cv,cz),P(u,cv-r*.55/32,cz),'#2b2f31');};
  /* 拱頂窗（v 面／u 面）：石框＋玻璃＋可選中梃；on 時夜層點燈。 */
  const archV=(u,v,du,z,hh,lt,fr=stone,gl=glass,mull=true)=>{const r=Math.min(du*16,hh*.5),N=8;
    const pth=(e,ez)=>{const a=[P(u-e,v,z-ez),P(u+du+e,v,z-ez),P(u+du+e,v,z+hh-r)];for(let i=1;i<N;i++){const f=i/N;a.push(P(u+du+e-(du+2*e)*f,v,z+hh-r+Math.sin(f*Math.PI)*(r+ez)));}a.push(P(u-e,v,z+hh-r));return a;};
    F(pth(.018,.9),fr);F(pth(0,0),gl);if(mull){L(P(u+du/2,v,z),P(u+du/2,v,z+hh-1),fr);L(P(u,v,z+hh-r),P(u+du,v,z+hh-r),fr);}
    if(lt)F(pth(-.014,-.7),lit,ng);};
  const archU=(u,v,dv,z,hh,lt,fr='#b9b3a0',gl='#496b7c')=>{const r=Math.min(dv*16,hh*.5),N=8;
    const pth=(e,ez)=>{const a=[P(u,v-e,z-ez),P(u,v+dv+e,z-ez),P(u,v+dv+e,z+hh-r)];for(let i=1;i<N;i++){const f=i/N;a.push(P(u,v+dv+e-(dv+2*e)*f,z+hh-r+Math.sin(f*Math.PI)*(r+ez)));}a.push(P(u,v-e,z+hh-r));return a;};
    F(pth(.018,.8),fr);F(pth(0,0),gl);if(lt)F(pth(-.014,-.7),'#f0cf96',ng);};
  /* 字樣（全家族統一寫法）：一個字母＝1px 點，沿 v 面斜率每 2px 一點、等距；slots 是字母序列，' ' 表示空格
     （FIRE␣␣STATION＝兩字中間空 2 格）。以 uc 為中心；依字帶 z0..z1 的實際像素列（lotPoly574 的掃描規則）放在中線。 */
  const word=(uc,v,z0,z1,slots,col='#5a4a3a')=>{const c=P(uc,v,z1),m=slots.length-1,x0=Math.round(c[0]-m);
    for(let i=0;i<=m;i++){if(slots[i]===' ')continue;const x=x0+2*i,t=c[1]+(x-c[0])/2,top=Math.floor(t)+1,bot=Math.floor(t+z1-z0);pixel635([x,top+Math.floor((bot-top)/2)],col,1,1);}};

  if(vi===1){
    /* ===== v1：愛德華式對稱總局 ===== */
    const U0=n*.07,U1=n*.93,du=U1-U0,V0=n*.14,VF=n*.50,dv=VF-V0,bw=du/5,pp=.04+n*.02,vv=VF+pp;
    const hg=17+n,z1=hg+4,w1=8,z2=hg+15,w2=6,he=hg+27,r1=10+n,m1=.12,r2=r1+7,m2=.15;
    const BF='#aa6550',BS='#804c42',CF='#9a5948',CS='#6f453b';
    const SF='#dcd4be',SS='#aca794',SL='#ebe4ce',SLS='#bdb7a2',RJ='#c3b9a1',RJS='#8f8a79';
    const RF=winter?'#edf3f3':slate,RS=winter?'#d8e5ea':slateD,RT=winter?SN:'#6a787f',RL=winter?'#d5e0e3':'#46545e',CR='#2b3437';
    /* 穹頂改鉛灰（避開 k15 郵局的綠尖帽），金頂飾保留。 */
    const DL=winter?'#eef3f3':'#6f7d84',DD=winter?'#d1dde1':'#55646b';
    /* 前坪：石板地＋每門一條淺色車道；右側小徑。 */
    pave(n*.02,VF,n*.96,n-VF-.025,'#a4a498');for(let i=0;i<5;i++)pave(U0+bw*(i+.1),vv,bw*.8,n-vv-.03,'#b9b7aa');
    L(P(n*.02,n-.025),P(n*.98,n-.025),winter?'#c3d0d4':'#86887e');pave(U1,V0,n*.98-U1,VF-V0,'#a4a498');
    /* 石帶只留兩條：一樓頂的腰線＋簷壁（簷壁 3px，兼作 FIRE／STATION 字帶）。 */
    const bandV=(a,b,v)=>{faceV(a,v,b-a,hg,hg+2.5,SL);faceV(a,v,b-a,he-3,he,SL);L(P(a,v,he-3.5),P(b,v,he-3.5),'#6b4136');};
    const bandU=(u,a,b)=>{faceU(u,a,b-a,hg,hg+2.5,SLS);faceU(u,a,b-a,he-3,he,SLS);L(P(u,a,he-3.5),P(u,b,he-3.5),'#553229');};
    const qV=(u,v,dir,za=hg+2.5,zb=he-3.2)=>{let i=0;for(let z=za;z<zb;z+=3,i++){const w=i%2?.045:.08;faceV(dir>0?u:u-w,v,w,z,z+2.5,SL);}};
    const qU=(u,v,dir,za=hg+2.5,zb=he-3.2)=>{let i=0;for(let z=za;z<zb;z+=3,i++){const w=i%2?.045:.08;faceU(u,dir>0?v:v-w,w,z,z+2.5,SLS);}};
    /* 一樓石面從 z=.5 起畫，不蓋掉 box 的牆腳邊線（否則牆腳變成黑白虛線）。 */
    const groundV=(a,b,v)=>{faceV(a,v,b-a,.5,hg,SF);for(let z=3;z<hg-1;z+=3)L(P(a,v,z),P(b,v,z),RJ);};
    const brickV=(a,b,v,za,zb)=>{for(let z=za;z<zb;z+=3)L(P(a+.02,v,z),P(b-.02,v,z),CF);};
    /* 石框拱形車庫門：門板自己畫，用家族傳統款深紅 #93302a＋豎縫 #6c211d；上方玻璃扇形氣窗（夜裡多數亮）＋拱心門燈。 */
    const gate=(u,v,dw,hh,sd)=>{const sp=[P(u,v,.5),P(u+dw,v,.5),P(u+dw,v,hh-3)];for(let i=0;i<=8;i++){const f=i/8;sp.push(P(u+dw*(1-f),v,hh-3+Math.sin(f*Math.PI)*3));}F(sp,'#d8d0b9');
      const fz=hh-6.5,a=u+.03,b=u+dw-.03,m=(a+b)/2;faceV(a,v,b-a,.5,fz,'#93302a');for(const f of[.25,.75])L(P(a+(b-a)*f,v,1),P(a+(b-a)*f,v,fz-.6),'#6c211d');L(P(m,v,.5),P(m,v,fz),'#4f1a17');L(P(a,v,fz*.45),P(b,v,fz*.45),'#6c211d');
      const fp=[P(a,v,fz),P(b,v,fz)];for(let i=0;i<=8;i++){const f=i/8;fp.push(P(b-(b-a)*f,v,hh-3+Math.sin(f*Math.PI)*1.6));}
      F(fp,'#86a7b0');L(P(a,v,fz),P(b,v,fz),'#6c211d');for(const f of[.33,.67])L(P(a+(b-a)*f,v,fz),P(a+(b-a)*f,v,hh-1.6),'#6c211d');if(on(sd,13,65)){const lp=[P(a+.02,v,fz+.6),P(b-.02,v,fz+.6)];for(let i=0;i<=6;i++){const f=i/6;lp.push(P(b-.02-(b-a-.04)*f,v,hh-3.6+Math.sin(f*Math.PI)*1.4));}F(lp,'#fae1b1',ng);}
      light(u+dw/2,v,hh+1.5);};
    /* 三樓窗：只留石楣，不做窗台。 */
    const winP=(u,v,dw,z,hh,lt)=>{faceV(u,v,dw,z,z+hh,glass);L(P(u,v,z+hh-.5),P(u+dw,v,z+hh-.5),'#91b3bf');L(P(u+dw/2,v,z),P(u+dw/2,v,z+hh),'#c9c0a8');faceV(u-.02,v,dw+.04,z+hh,z+hh+1.3,SL);if(lt)faceV(u+.012,v,dw-.024,z+.6,z+hh-.6,lit,ng);};
    /* 主體（全寬），之後兩端亭與中央塔段蓋上去。 */
    box(U0,V0,du,dv,0,he,[BF,BS,RT]);brickV(U0,U1,VF,hg+3,he-3);for(let z=hg+3;z<he-3;z+=4)L(P(U1,V0+.02,z),P(U1,VF-.02,z),CS);
    groundV(U0,U1,VF);faceU(U1,V0,dv,.5,hg,SS);for(let z=3;z<hg-1;z+=3)L(P(U1,V0,z),P(U1,VF,z),RJS);
    bandV(U0,U1,VF);bandU(U1,V0,VF);L(P(U1,V0,0),P(U1,V0,he),edge);
    for(const b of[1,3]){const a=U0+bw*b;gate(a+bw*.14,VF,bw*.72,hg-2,b);for(let j=0;j<2;j++){const wu=a+bw*(.15+j*.42),ww=bw*.28;archV(wu,VF,ww,z1,w1,on(b,j,42));winP(wu,VF,ww,z2,w2,on(b+3,j,38));}}
    /* 簷壁刻字：左開間 FIRE、右開間 STATION（被中央塔段隔開，對稱）。 */
    word(U0+bw*1.5,VF,he-3,he,'FIRE');word(U0+bw*3.5,VF,he-3,he,'STATION');
    /* 側立面：一層小窗＋側門，二三層拱窗與方窗。 */
    const ns=Math.max(3,Math.round(dv/.36));
    for(let i=0;i<ns;i++){const a=V0+dv*(i+.25)/ns,wv=dv*.5/ns;archU(U1,a,wv,z1,w1,on(i,7,40));windowU(U1,a,wv,z2,w2,on(i,9,35));
      if(i===1){faceU(U1,a-.02,wv+.04,0,hg-5,'#cfc7b0');faceU(U1,a,wv,0,hg-6,'#5b3a30');L(P(U1,a+wv/2,0),P(U1,a+wv/2,hg-6),'#3d2722');light(U1,a+wv/2,hg-3.5);}
      else windowU(U1,a,wv,6,hg-11,on(i,4,30));}
    /* 前凸段（兩端亭、中央塔段）：只畫凸出部分的牆。 */
    const bay=(a,ql,qr)=>{box(a,VF-.02,bw,pp+.02,0,he,[BF,BS,RT]);brickV(a,a+bw,vv,hg+3,he-3);groundV(a,a+bw,vv);faceU(a+bw,VF-.02,pp+.02,.5,hg,SS);
      bandV(a,a+bw,vv);bandU(a+bw,VF-.02,vv);if(ql)qV(a,vv,1);if(qr){qV(a+bw,vv,-1);qU(a+bw,vv,-1);}
      /* 隅石與石帶會切斷 box 的外角線：畫完再用 edge 重描一次開間轉角。 */
      L(P(a,vv,0),P(a,vv,he),edge);L(P(a+bw,vv,0),P(a+bw,vv,he),edge);
      gate(a+bw*.14,vv,bw*.72,hg-2,a*7|0);};
    const pav=(a)=>{bay(a,a<n/2,a>n/2);const s=(a*10|0);
      archV(a+bw*.36,vv,bw*.28,z1,w1,on(s,1,45));windowV(a+bw*.14,vv,bw*.13,z1+1,w1-4,on(s,2,35));windowV(a+bw*.73,vv,bw*.13,z1+1,w1-4,on(s,3,35));
      winP(a+bw*.2,vv,bw*.24,z2,w2,on(s,4,40));winP(a+bw*.56,vv,bw*.24,z2,w2,on(s,5,40));};
    /* 端亭高孟莎頂：前坡＋右坡＋平頂＋鐵花脊；前坡一扇圓頭老虎窗。 */
    const proof=(a,flag)=>{const v=V0,dd=vv-V0,z=he;
      F([P(a+bw,v,z),P(a+bw,v+dd,z),P(a+bw-m2,v+dd-m2,z+r2),P(a+bw-m2,v+m2,z+r2)],RS);
      F([P(a,v+dd,z),P(a+bw,v+dd,z),P(a+bw-m2,v+dd-m2,z+r2),P(a+m2,v+dd-m2,z+r2)],RF);
      for(const f of[.33,.67]){L(P(a+m2*f,v+dd-m2*f,z+r2*f),P(a+bw-m2*f,v+dd-m2*f,z+r2*f),RL);L(P(a+bw-m2*f,v+m2*f,z+r2*f),P(a+bw-m2*f,v+dd-m2*f,z+r2*f),winter?'#c5d4da':'#33414a');}
      L(P(a+bw,v+dd,z),P(a+bw-m2,v+dd-m2,z+r2),winter?'#b9c9cf':'#2a363d');
      F(Q(a+m2,v+m2,bw-2*m2,dd-2*m2,z+r2),RT);L(P(a+m2,v+dd-m2,z+r2),P(a+bw-m2,v+dd-m2,z+r2),CR);
      for(let x=a+m2+.04;x<a+bw-m2;x+=.09)pixel635(P(x,v+dd-m2,z+r2+2),CR,1,2);
      for(const p of[P(a+m2,v+dd-m2,z+r2+2),P(a+bw-m2,v+dd-m2,z+r2+2)])pixel635(p,CR,1,2);
      /* 牛眼圓窗（石環＋深色玻璃），夜裡亮。 */
      {const cu=a+bw/2,vd=vv-m2*.5,cz=he+r2*.5+.5,f=(x,y)=>P(cu+x,vd,cz+y);F(ring(f,3.4),SL);F(ring(f,2.2),'#34444d');if(on(a*10|0,8,50))F(ring(f,1.6),lit,ng);F([P(cu-.06,vd,cz+3.2),P(cu+.06,vd,cz+3.2),P(cu,vd,cz+5)],winter?SN:SL);}
      if(flag){const fp=P(a+bw/2,(V0+vv)/2,z+r2);L(fp,[fp[0],fp[1]-15],'#e0e2dc');pixel635([fp[0]+1,fp[1]-15],'#b8322a',5,3);}};
    /* 主屋孟莎頂（只畫前坡＋平頂，兩端被高亭夾住）。 */
    const mroof=(a,b)=>{F([P(a,VF,he),P(b,VF,he),P(b,VF-m1,he+r1),P(a,VF-m1,he+r1)],RF);for(const f of[.3,.6])L(P(a,VF-m1*f,he+r1*f),P(b,VF-m1*f,he+r1*f),RL);
      F(Q(a,V0+m1,b-a,dv-2*m1,he+r1),RT);L(P(a,VF-m1,he+r1),P(b,VF-m1,he+r1),winter?'#b9c7cc':'#56636a');for(let x=a+.05;x<b-.02;x+=.1)pixel635(P(x,VF-m1,he+r1+2),CR,1,2);};
    const dorm=(a,dw,i)=>{const vd=VF-m1*.45,z0=he+r1*.45-1,hh=Math.min(8,r1*.58);faceU(a+dw+.02,vd-.07,.07,z0,z0+hh,'#a9a28d');faceV(a-.02,vd,dw+.04,z0,z0+hh,SL);
      windowV(a+.01,vd,dw-.02,z0+1.2,hh-3.2,on(i,11,35));F([P(a-.04,vd,z0+hh),P(a+dw+.04,vd,z0+hh),P(a+dw/2,vd,z0+hh+3)],winter?SN:SL);L(P(a-.04,vd,z0+hh),P(a+dw+.04,vd,z0+hh),'#8f8873');};
    const chim=(a,b)=>{box(a,b,.1,.16,he+r1-1,8,[BF,BS,RT]);faceV(a-.012,b+.172,.124,he+r1+7,he+r1+8.5,SL);faceU(a+.112,b-.012,.184,he+r1+7,he+r1+8.5,SLS);F(Q(a-.012,b-.012,.124,.184,he+r1+8.5),winter?SN:'#cfc8b2');pixel635(P(a+.03,b+.08,he+r1+10),'#4a3a33',1,2);pixel635(P(a+.07,b+.08,he+r1+10),'#4a3a33',1,2);};
    const Uc=U0+2*bw,tw=bw*.74,td=bw*.62,Tu=Uc+(bw-tw)/2,Tv=vv-td,zB=he+r1+9,zC=zB+11,zD=zC+2,zE=zD+8;
    /* 畫序：左亭 → 左半主屋頂 → 中央塔段 → 鐘塔 → 右半主屋頂 → 右亭。 */
    pav(U0);proof(U0,true);
    mroof(U0+bw,Tu+tw);for(let j=0;j<2;j++)dorm(U0+bw*(1.15+j*.42),bw*.28,j);chim(U0+bw*1.08,V0+m1+.12);
    bay(Uc,false,false);
    archV(Uc+bw*.3,vv,bw*.4,z1,w1+2,on(5,5,60));faceV(Uc+bw*.2,vv+.035,bw*.6,z1-1.4,z1+1.6,SL);for(let x=Uc+bw*.24;x<Uc+bw*.78;x+=.05)L(P(x,vv+.035,z1-1),P(x,vv+.035,z1+1),'#a79f88');
    winP(Uc+bw*.32,vv,bw*.36,z2,w2,on(6,2,50));
    /* 鐘塔：磚身（百葉拱窗）→ 石簷 → 石鐘層（正面＋側面鐘）→ 石簷 → 開敞燈籠亭 → 銅綠穹頂＋金頂飾。 */
    box(Tu,Tv,tw,td,he,zB-he,[BF,BS,RT]);for(let z=he+3;z<zB-1;z+=3)L(P(Tu+.02,vv,z),P(Tu+tw-.02,vv,z),CF);for(let z=he+3;z<zB-1;z+=4)L(P(Tu+tw,Tv+.02,z),P(Tu+tw,vv-.02,z),CS);
    archV(Tu+tw*.17,vv,tw*.26,he+4,zB-he-7,false,SL,'#3b3433');archV(Tu+tw*.57,vv,tw*.26,he+4,zB-he-7,false,SL,'#3b3433');archU(Tu+tw,Tv+td*.3,td*.4,he+r1-1,zB-he-r1-2,false,SLS,'#2f2a29');
    box(Tu-.025,Tv-.025,tw+.05,td+.05,zB,2,[SL,SLS,'#d1cab4']);box(Tu+.01,Tv+.01,tw-.02,td-.02,zB+2,zC-zB-2,[SF,SS,SL]);
    const cr=Math.min(3,(tw-.02)*32*.3);clockV(Tu+tw/2,vv-.01,zB+2+(zC-zB-2)/2,cr);clockU(Tu+tw-.01,Tv+td/2,zB+2+(zC-zB-2)/2,Math.min(cr,(td-.02)*32*.3),false);
    box(Tu-.025,Tv-.025,tw+.05,td+.05,zC,2,[SL,SLS,'#d1cab4']);
    const lw=Math.min(tw,td)*.7,Lu=Tu+tw/2-lw/2,Lv=Tv+td/2-lw/2;box(Lu,Lv,lw,lw,zD,zE-zD,[SL,SLS,SL]);
    archV(Lu+lw*.22,Lv+lw,lw*.56,zD+1,zE-zD-2,true,SL,'#4b5152',false);archU(Lu+lw,Lv+lw*.22,lw*.56,zD+1,zE-zD-2,false,SLS,'#3e4445');
    /* 燈籠亭裡掛一口銅色消防鐘（2×2），夜裡是亮洞裡的剪影。 */
    {const bp=P(Lu+lw/2,Lv+lw,zD+1+(zE-zD-2)*.5);pixel635([Math.round(bp[0])-1,Math.round(bp[1])-1],'#b08a4a',2,2);}
    {F(Q(Lu-.03,Lv-.03,lw+.06,lw+.06,zE),DD);const c0=P(Lu-.03,Lv+lw+.03,zE),c1=P(Lu+lw+.03,Lv-.03,zE),cx=(c0[0]+c1[0])/2,cy=c0[1],rx=(c1[0]-c0[0])/2,ry=Math.max(5,rx*.85);
      const lh=[[cx,cy]],rh=[[cx,cy]];for(let i=0;i<=6;i++){const t=Math.PI/2+i/6*Math.PI/2;lh.push([cx+rx*Math.cos(t),cy-ry*Math.sin(t)]);rh.push([cx+rx*Math.cos(i/6*Math.PI/2),cy-ry*Math.sin(i/6*Math.PI/2)]);}
      F(lh,DL);F(rh,DD);pixel635([cx-rx*.5,cy-ry*.65],winter?'#ffffff':'#95a3a9',1,2);L([cx,cy-ry],[cx,cy-ry-6],'#c9a548');pixel635([cx-1,cy-ry-3],'#d8b45a',2,2);}
    mroof(Tu+tw,U1-bw);for(let j=0;j<2;j++)dorm(U0+bw*(3.15+j*.42),bw*.28,j+4);chim(U1-bw*1.08-.1,V0+m1+.12);
    pav(U1-bw);proof(U1-bw,false);
    /* 前坪：一台消防車半出庫；大尺寸再停一台；兩支街燈＋一棵樹。 */
    truck(U0+bw*1.5-n*.055,VF+.1,n*.11,n*.19);if(n>=4)truck(U0+bw*3.5-n*.055,VF+.36,n*.11,n*.19);
    lamp(n*.05,n*.95,10);lamp(n*.96,n*.62,10);tree(n*.91,n*.08);
    /* 紅色電話亭（K6）：一個很英國的街角小物。 */
    {const ku=n*.05,kv=n*.83;box(ku,kv,.1,.1,0,9,['#c2372d','#8f2720','#c2372d']);faceV(ku+.02,kv+.1,.06,3,7,'#d9d3b8');faceU(ku+.1,kv+.02,.06,3,7,'#b5ad92');faceV(ku+.025,kv+.1,.05,3.5,6.5,'#f6e2b0',ng);L(P(ku+.05,kv+.1,3),P(ku+.05,kv+.1,7),'#a52f27');}
  }else{
    /* ===== v2：1930 裝飾藝術市政總局 ===== */
    const Ur0=n*.04,Ur1=n*.95,Vr0=n*.05,Vr1=n*.30,Uf0=n*.04,Uf1=n*.68,VF=n*.57,tw=n*.12,Tu=Uf1,Tv=Vr1+.01;
    const hR=Math.round(40+n*2),hF=Math.round(24+n*1.5),par=3,hT=66+n*3,hd=14+Math.round(n*.5);
    const SF='#e2dcc8',SS='#b6b7aa',SC=winter?SN:'#efe9d7',SB='#d6cfb9',SBS='#a9aa9c';
    const KF='#9b5c48',KS='#71463b',KC='#8a5242',KCS='#633d34',GF='#4d5a5d',GS='#3b4649',GL='#3f5763',GLS='#344a55';
    const pbox=(u,v,du,dv,h,c)=>{const e=.04;faceV(u,v+dv,du,0,h,c[0]);faceU(u+du,v,dv,0,h,c[1]);F(Q(u,v,du,dv,h),winter?SN:c[2]);
      faceV(u+e,v+e,du-2*e,h,h+par,c[3]);faceU(u+e,v+e,dv-2*e,h,h+par,c[4]);F(Q(u,v,du,e,h+par),SC);F(Q(u,v,e,dv,h+par),SC);
      faceV(u,v+dv,du,h,h+par,c[0]);faceU(u+du,v,dv,h,h+par,c[1]);F(Q(u+du-e,v,e,dv,h+par),SC);F(Q(u,v+dv-e,du,e,h+par),SC);
      L(P(u,v+dv,0),P(u+du,v+dv,0),edge);L(P(u+du,v+dv,0),P(u+du,v,0),edge);L(P(u,v+dv,0),P(u,v+dv,h+par),edge);L(P(u+du,v+dv,0),P(u+du,v+dv,h+par),edge);L(P(u+du,v,0),P(u+du,v,h+par),edge);};
    /* 帶窗：鋼框長條窗，分段點燈。 */
    const ribV=(a,b,v,z,hh,sd,p)=>{faceV(a,v,b-a,z-1.4,z,SB);faceV(a,v,b-a,z,z+hh,GL);L(P(a,v,z+hh),P(b,v,z+hh),'#7f9fab');for(let x=a+.09;x<b-.03;x+=.17)L(P(x,v,z),P(x,v,z+hh-1),'#26323a');
      const sg=.36;for(let x=a,i=0;x<b-.06;x+=sg,i++)if(on(sd,i,p))faceV(x+.03,v,Math.min(sg,b-x)-.06,z+.7,z+hh-.4,lit,ng);};
    const ribU=(u,a,b,z,hh,sd,p)=>{faceU(u,a,b-a,z-1.4,z,SBS);faceU(u,a,b-a,z,z+hh,GLS);for(let x=a+.09;x<b-.03;x+=.17)L(P(u,x,z),P(u,x,z+hh-1),'#202a30');
      const sg=.34;for(let x=a,i=0;x<b-.06;x+=sg,i++)if(on(sd,i+3,p))faceU(u,x+.03,Math.min(sg,b-x)-.06,z+.7,z+hh-.4,'#f0cf96',ng);};
    /* 地面：淺色前坪；操練場用較深的柏油（與 k30 v2 訓練場同色），從後翼一直鋪到右前草地前。 */
    pave(n*.02,VF,n*.96,n-VF-.025,'#9ea29a');pave(Uf1,Vr1,n*.97-Uf1,n*.84-Vr1,'#8d938f');
    const D0=Uf0+n*.112,D1=Uf1-n*.02,bwd=(D1-D0)/4,dw=bwd*.8;
    for(let i=0;i<4;i++)pave(D0+bwd*i+(bwd-dw)/2,VF,dw,n-VF-.03,'#b3b5aa');
    L(P(n*.02,n-.025),P(n*.98,n-.025),winter?'#c3d0d4':'#83877f');L(P(D0,VF+n*.16),P(D1,VF+n*.16),winter?'#d4c98f':'#d6c25e');
    /* 操練場標線：兩條長白線（≥0.5n）夾出水帶操練道＋前端起點線；側牆前一個黃色停車框。 */
    {const W=winter?'#f4f7f6':'#ecebdf',la=Tu+tw+.26,lb=n*.97-.05,y0=Vr1+.07,y1=n*.84-.03;L(P(la,y0),P(la,y1),W);L(P(lb,y0),P(lb,y1),W);L(P(la,y1-.12),P(lb,y1-.12),W);
     const Y=winter?'#d4c98f':'#d6c25e',pu=Uf1+.06,pv=Tv+tw+.2,pw=n*.13,pd=n*.21;L(P(pu,pv),P(pu+pw,pv),Y);L(P(pu+pw,pv),P(pu+pw,pv+pd),Y);L(P(pu+pw,pv+pd),P(pu,pv+pd),Y);L(P(pu,pv+pd),P(pu,pv),Y);}
    /* 後翼：四層磚宿舍，帶窗＋石腰線；屋頂機房。 */
    pbox(Ur0,Vr0,Ur1-Ur0,Vr1-Vr0,hR,[KF,KS,'#7d898b',KC,KCS]);
    const fl=(hR-6)/4;for(let i=0;i<4;i++){const z=5+i*fl;ribV(Ur0+.06,Ur1-.06,Vr1,z,5,i,38);ribU(Ur1,Vr0+.05,Vr1-.05,z,5,i,38);}
    faceV(Ur0,Vr1,Ur1-Ur0,hR-2.6,hR-.8,SB);faceU(Ur1,Vr0,Vr1-Vr0,hR-2.6,hR-.8,SBS);
    box(n*.16,Vr0+.06,.34,.2,hR,6,[SB,SBS,'#c8c6b8']);box(n*.16+.4,Vr0+.08,.16,.14,hR,9,[SB,SBS,'#c8c6b8']);
    for(const f of[.42,.86]){box(n*f,Vr0+.07,.1,.13,hR,7,[KF,KS,'#7d898b']);faceV(n*f-.01,Vr0+.21,.12,hR+7,hR+8.2,SB);faceU(n*f+.11,Vr0+.06,.15,hR+7,hR+8.2,SBS);F(Q(n*f-.01,Vr0+.06,.12,.15,hR+8.2),winter?SN:'#c8c6b8');}
    /* 前翼：石材車庫＋一層辦公；花崗岩基座、四扇紅色折疊門、門楣字帶、長條窗、出女兒牆的直肋。 */
    pbox(Uf0,Vr1,Uf1-Uf0,VF-Vr1,hF,[SF,SS,'#88918f','#c9c3b1','#a7a99d']);
    faceV(Uf0,VF,Uf1-Uf0,0,3,GF);faceU(Uf1,Vr1,VF-Vr1,0,3,GS);
    /* 車庫屋頂：每一跨一座低矮玻璃天窗（冬天頂面積雪）。 */
    for(let i=0;i<4;i++){const a=D0+bwd*(i+.5)-.13,b=Vr1+(VF-Vr1)*.28;box(a,b,.26,(VF-Vr1)*.4,hF,3,['#a9c2c8','#7896a0','#b9ccd0']);if(on(i,31,55))F(Q(a+.03,b+.03,.2,(VF-Vr1)*.4-.06,hF+3),'#f3d9a0',ng);if(!winter)for(let x=a+.09;x<a+.22;x+=.08)L(P(x,b,hF+3),P(x,b+(VF-Vr1)*.4,hF+3),'#6f8d97');}
    for(let i=0;i<4;i++){const a=D0+bwd*i+(bwd-dw)/2;faceV(a-.03,VF,dw+.06,0,hd+1.5,'#cdc5ae');faceV(a,VF,dw,.5,hd,'#b23b2d');
      for(const f of[.25,.5,.75])L(P(a+dw*f,VF,1),P(a+dw*f,VF,hd-.5),'#7f261f');faceV(a+.02,VF,dw-.04,hd*.6,hd*.82,'#a3c4c9');for(const f of[.25,.5,.75])L(P(a+dw*f,VF,hd*.6),P(a+dw*f,VF,hd*.82),'#7f261f');
      if(on(i,3,55))faceV(a+.03,VF,dw-.06,hd*.62,hd*.8,'#fae1b1',ng);L(P(a,VF,1),P(a+dw,VF,1),'#5c1f1a');}
    /* 門楣字帶 4px，FIRE␣␣STATION 等距 1px 點列置中在中線。 */
    faceV(D0-.02,VF,D1-D0+.04,hd+1.5,hd+5.5,'#d8cfb6');word((D0+D1)/2,VF,hd+1.5,hd+5.5,'FIRE  STATION');
    /* 門燈：放在字帶上、左右兩端門的正上方，跟字列對稱成「燈 字 燈」，不跟點列擠在一起。 */
    for(const i of[0,3])light(D0+bwd*(i+.5),VF,hd+3.5);
    const zr=hd+7.6,hr=Math.max(3.5,Math.min(4.5,hF-zr-.4));for(let i=0;i<4;i++)ribV(D0+bwd*i+.035,D0+bwd*(i+1)-.035,VF,zr,hr,i+10,45);
    for(let i=0;i<=4;i++){const x=D0+bwd*i;faceV(x-.02,VF,.04,hd+5.5,hF+par+3,'#f3eee0');L(P(x+.02,VF,hd+5.5),P(x+.02,VF,hF+par+3),'#b4ad98');pixel635(P(x-.02,VF,hF+par+3),winter?SN:'#f7f3e8',2,1);}
    /* 前翼面向操練場的側牆：一扇側門（緊貼塔前，避開停車框）＋一段帶窗。 */
    {const a=Tv+tw+.06,b=VF-.05;ribU(Uf1,a,b,zr,hr,7,40);faceU(Uf1,a,.12,0,10,'#cdc5ae');faceU(Uf1,a+.02,.08,.5,9,'#3d4a4f');light(Uf1,a+.06,11.5);}
    /* 入口塔門（左端）：凸出石板＋階梯式頂、玻璃大門、雨庇、圓鐘、旗桿。 */
    const pe=n*.1,pf=.06,hP=hF+par+7,PF='#ebe5d2',PS='#bfbfb2',PT=winter?SN:'#ddd8c6';
    box(Uf0,VF-.27,pe,.27,hF+par,hP-hF-par,[PF,PS,PT]);box(Uf0,VF-.02,pe,pf+.02,0,hP,[PF,PS,PT]);faceV(Uf0,VF+pf,pe,0,3,GF);faceU(Uf0+pe,VF-.02,pf+.02,0,3,GS);
    box(Uf0+pe*.16,VF-.2,pe*.68,.2+pf-.02,hP,4,[PF,PS,PT]);box(Uf0+pe*.33,VF-.14,pe*.34,.14+pf-.04,hP+4,4,[PF,PS,PT]);
    for(const f of[.2,.8])L(P(Uf0+pe*f,VF+pf,13),P(Uf0+pe*f,VF+pf,hP-1),'#cbc4ae');
    faceV(Uf0+pe*.2,VF+pf,pe*.6,0,10,'#2f3b3f');faceV(Uf0+pe*.26,VF+pf,pe*.48,.6,9.2,'#86aab3');L(P(Uf0+pe*.5,VF+pf,.6),P(Uf0+pe*.5,VF+pf,9.2),'#2f3b3f');faceV(Uf0+pe*.28,VF+pf,pe*.44,1,8.6,lit,ng);
    box(Uf0+pe*.08,VF+pf,pe*.84,.07,10,1.6,['#d9d2bd','#a5a698',winter?SN:'#c9c4b2']);light(Uf0+pe*.5,VF+pf+.07,9.5);
    faceV(Uf0+pe*.3,VF+pf,pe*.4,13,hP-11,GL);for(let z=16;z<hP-11;z+=3)L(P(Uf0+pe*.3,VF+pf,z),P(Uf0+pe*.7,VF+pf,z),'#d9d2bd');faceV(Uf0+pe*.33,VF+pf,pe*.34,14,hP-12,lit,ng);
    clockV(Uf0+pe*.5,VF+pf,hP-5.5,Math.min(3.6,pe*32*.3));
    {const fp=P(Uf0+pe*.5,VF-.07,hP+8);L(fp,[fp[0],fp[1]-15],'#e0e2dc');pixel635([fp[0]+1,fp[1]-15],'#b8322a',5,3);}
    /* 內角訓練塔：波特蘭石身、正面直條窗、朝操練場一面逐層操練窗洞＋木梯；
       塔冠兩階退縮（呼應左端塔門的階梯頂），頂層四面開敞的晾水帶洞（看得到兩面，各垂兩條紅水帶），夜裡只亮一格；桅杆紅燈。 */
    box(Tu,Tv,tw,tw,0,hT,[SF,SS,'#ddd8c6']);faceV(Tu,Tv+tw,tw,0,4,GF);faceU(Tu+tw,Tv,tw,0,4,GS);
    faceV(Tu+tw*.34,Tv+tw,tw*.32,8,hT-10,GL);for(let z=12,i=0;z<hT-10;z+=5,i++){L(P(Tu+tw*.34,Tv+tw,z),P(Tu+tw*.66,Tv+tw,z),SB);if(on(i,17,35))faceV(Tu+tw*.36,Tv+tw,tw*.28,z+.6,z+4.4,lit,ng);}
    for(const f of[.18,.82])L(P(Tu+tw*f,Tv+tw,5),P(Tu+tw*f,Tv+tw,hT-3),'#f1ecde');
    for(let z=10,i=0;z<hT-12;z+=10,i++){faceU(Tu+tw,Tv+tw*.2,tw*.6,z-1,z,SB);faceU(Tu+tw,Tv+tw*.22,tw*.56,z,z+6,'#2a3337');if(on(i,21,30))faceU(Tu+tw,Tv+tw*.26,tw*.48,z+.6,z+5.4,'#f0cf96',ng);}
    box(Tu-.02,Tv-.02,tw+.04,tw+.04,hT-3,3,[SB,SBS,'#d6d1bf']);
    {const s1=tw*.12,s2=tw*.24,zA=hT+5,bs=tw-2*s2,bu=Tu+s2,bv=Tv+s2,zH=zA+8;
      box(Tu+s1,Tv+s1,tw-2*s1,tw-2*s1,hT,5,[SF,SS,'#ddd8c6']);box(bu,bv,bs,bs,zA,8,[SF,SS,'#ddd8c6']);
      faceV(bu+bs*.18,bv+bs,bs*.64,zA+1,zA+6.6,'#2a3337');faceU(bu+bs,bv+bs*.18,bs*.64,zA+1,zA+6.6,'#232c30');faceU(bu+bs,bv+bs*.22,bs*.56,zA+1.4,zA+6.2,'#e2bf86',ng);
      for(const f of[.38,.62]){L(P(bu+bs*f,bv+bs,zA+6.4),P(bu+bs*f,bv+bs,zA+1.6),'#b8322a');L(P(bu+bs,bv+bs*f,zA+6.4),P(bu+bs,bv+bs*f,zA+1.6),'#93302a');}
      box(bu-.03,bv-.03,bs+.06,bs+.06,zH,1.5,[SB,SBS,'#d6d1bf']);
      const m=P(Tu+tw/2,Tv+tw/2,zH+1.5);L(m,[m[0],m[1]-8],'#4a5456');pixel635([m[0],m[1]-9],'#c44a3a',1,1);pixel635([m[0],m[1]-9],'#ff7b66',1,1,ng);}
    /* 靠在操練面的木梯：兩根梯柱＋每 4px 一根橫檔。 */
    {const lb=Tu+tw+.2,lt0=Tu+tw+.01,la=Tv+tw*.28,lc=Tv+tw*.72;for(let t=.08;t<.97;t+=.13){const u=lb-(lb-lt0)*t;L(P(u,la,30*t),P(u,lc,30*t),'#7d6240');}
      L(P(lb,la,0),P(lt0,la,30),'#b08a55');L(P(lb,lc,0),P(lt0,lc,30),'#b08a55');}
    /* 後翼凸出樓梯間（操練場一側）：直條玻璃，夜裡多半亮。 */
    {const sw=n*.055,Us=Tu+tw+(Ur1-Tu-tw)*.55-sw/2;box(Us,Vr1-.02,sw,.08,0,hR+6,[SF,SS,'#d8d3c2']);faceV(Us+sw*.28,Vr1+.06,sw*.44,6,hR+2,GL);
      for(let z=9,i=0;z<hR+2;z+=4,i++){L(P(Us+sw*.28,Vr1+.06,z),P(Us+sw*.72,Vr1+.06,z),'#cfc8b2');if(on(i,29,60))faceV(Us+sw*.3,Vr1+.06,sw*.4,z-3.4,z-.6,lit,ng);}}
    box(Ur1-.14,Vr1+.16,.05,.05,0,4,['#c0392b','#8e2a20','#d4574a']);
    /* 前坪：一台消防車半出庫（大尺寸再一台停進操練場的黃色停車框）、街燈。 */
    truck(D0+bwd*1.5-n*.055,VF+.1,n*.11,n*.19);if(n>=4)truck(Uf1+.06+n*.01,Tv+tw+.2+n*.01,n*.11,n*.19);
    /* 右前角一塊草地＋樹，軟化前坪；不擋任何車庫門的出車道。 */
    pave(n*.74,n*.84,n*.235,n*.135,'#7f9a6b');L(P(n*.74,n*.84),P(n*.975,n*.84),winter?'#c9d5d6':'#9aa58e');L(P(n*.74,n*.84),P(n*.74,n*.975),winter?'#c9d5d6':'#9aa58e');
    lamp(n*.04,n*.95,10);lamp(n*.72,n*.95,10);tree(n*.88,n*.92);
  }
};
