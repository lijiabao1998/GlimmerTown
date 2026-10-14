/* T638 k30 區域消防局變體：v1 愛德華時期 LCC 式（多山牆陡屋頂、無塔）；v2 戰後平頂長條樓＋獨立訓練塔。
   只畫外觀；所有位置由 n／winter／vi 決定，零亂數。 */
window.fire638_k30=function(H,vi){
  const {P,Q,F,L,E,pixel635,faceV,faceU,box,course,windowV,windowU,light,pitched,door,arch,pave,tree,truck,pal,edge,stone,glass,lit,slate,slateD,n,winter,g,ng}=H;
  const W=winter,SN='#edf3f3',SND='#d8e5ea',bk=pal.brick,big=n>=2;
  const courseV=(u,v,du,z0,z1,col='#915845')=>{for(let z=z0+3;z<z1-1;z+=3)L(P(u+.02,v,z),P(u+du-.02,v,z),col);};
  const courseU=(u,v,dv,z0,z1,col='#6a433a')=>{for(let z=z0+3;z<z1-1;z+=3)L(P(u,v+.02,z),P(u,v+dv-.02,z),col);};
  const stack=(u,v,cw,cd,z0,z1)=>{box(u,v,cw,cd,z0,z1-z0,[bk[0],bk[1],bk[2]]);box(u-.012,v-.012,cw+.024,cd+.024,z1-2,2,['#d8cfb6','#aca48f','#c9c0a8']);
    for(const f of(cw>.08?[.3,.7]:[.5])){const p=P(u+cw*f,v+cd*.5,z1);pixel635([p[0],p[1]-3],W?'#e2e9ea':'#9a5442',2,3);}};
  /* FIRE STATION 字樣（家族統一寫法）：底帶 3px、字列在正中、上下各留 1px；字是 1px 高的等距點列（每格 1px），兩字之間空 2 格。
     uc＝字樣中心 u；a、b＝兩個字的點數；frame 有給就再包 1px 框。 */
  const sign=(uc,v,zc,a,b,base,ink,frame,mg)=>{const st=1/32,cnt=a+2+b,pw=(cnt+2*mg)*st,pu=uc-pw/2;
    if(frame)faceV(pu-st,v,pw+2*st,zc-2.5,zc+2.5,frame);faceV(pu,v,pw,zc-1.5,zc+1.5,base);
    for(let i=0;i<cnt;i++)if(i<a||i>a+1)pixel635(P(pu+(mg+i+.5)*st,v,zc+.5),ink,1,1);};
  if(vi===1){
    /* ===== v1：愛德華時期（倫敦郡議會式）Arts & Crafts 消防局 =====
       左：高山牆前突翼（三層山牆屋，不是塔）；中右：順立面長脊陡板岩主屋，脊上與山牆端各有高煙囪；
       右段一個前突交叉山牆；中段凸窗＋老虎窗；首層波特蘭石，三個半圓拱紅色摺門。 */
    /* T638 修：n=1 的 A 翼降成 he+3、山牆 8px（剪影變寬變矮）；n≥2 簷口升 4px 讓首層石匾與凸窗都有位置，A 山牆 RA 同步減 3，總高不變。 */
    const he=big?27+3*n:27,R=5+5*n,dh=11+2*n,zG=dh+3,heA=big?he+7:he+3,RA=big?3+7*n:8,cw2=big?2:1,zP=dh+2.4;
    const uA0=.06*n,uA1=.29*n,vA0=.17*n,VFA=.635*n,mA=(uA0+uA1)/2,duA=uA1-uA0,sA=RA/(duA/2),rA=heA+RA;
    const V0=.22*n,VF=.60*n,DV=VF-V0,hm=(V0+VF)/2,uM1=.86*n,rM=he+R,sM=R/(DV/2);
    const uB0=.62*n,uB1=.82*n,VFB=.625*n,mB=(uB0+uB1)/2,RB=R*.88,rB=he+RB,vInt=VF-RB/sM;
    const PS=['#ddd5bf','#b4ad98'],ridgeC=W?'#c9d6da':'#8a4b3d',cope='#e6dfcb';
    const wd=.15*n,c1=mA,c2=(uA1+uB0)/2,c3=mB;
    /* 前坪：整條石鋪人行帶＋三個車庫門前的深色車道，接到地塊前緣 */
    pave(.03*n,VF,.94*n,n-VF-.025,'#bdb5a2');
    for(const c of[c1,c2,c3])pave(c-wd*.62,VF+.02,wd*1.24,n-VF-.045,'#9a9a90');
    if(big)L(P(.03*n,VFA+.10*n),P(.97*n,VFA+.10*n),W?'#cdd8d9':'#aaa290');
    const rust=(u,v,du)=>{if(big)for(let z=3;z<zG-1;z+=3.2)L(P(u+.01,v,z),P(u+du-.01,v,z),'#c4bba4');};
    const band=(u,v,du)=>{faceV(u-.012,v,du+.024,zG-.6,zG+1.4,'#efe9d8');L(P(u-.012,v,zG-.6),P(u+du+.012,v,zG-.6),'#9d927b');};
    /* 半圓拱紅摺門：石砌拱圈、扇形氣窗、楔石、門燈 */
    const archDoor=(u,v,du,hh,open,on)=>{const r=du/2,uc=u+r,rz=Math.max(2,du*16),zs=hh-rz,N=10;
      const ring=(rr,rzz,z0)=>{const p=[P(uc-rr,v,z0),P(uc+rr,v,z0),P(uc+rr,v,zs)];for(let i=0;i<=N;i++){const t=Math.PI*i/N;p.push(P(uc+rr*Math.cos(t),v,zs+rzz*Math.sin(t)));}return p;};
      F(ring(r+.025,rz+2.2,0),'#e3dcc8');F(ring(r,rz,.5),open?'#23292d':'#93302a');if(open){faceV(uc-r+.02,v,du-.04,2,zs-1,'#a88b5c',ng);faceV(uc-r+.02,v,du-.04,.5,2,'#6e5a3c',ng);}
      const fan=[P(uc-r,v,zs),P(uc+r,v,zs)];for(let i=0;i<=N;i++){const t=Math.PI*i/N;fan.push(P(uc+r*Math.cos(t),v,zs+(rz-.8)*Math.sin(t)));}
      F(fan,'#7d9ea7');if(on)F(fan,lit,ng);L(P(uc-r,v,zs),P(uc+r,v,zs),'#e3dcc8');
      if(big)for(const f of[-.5,0,.5])L(P(uc,v,zs),P(uc+r*f*1.6,v,zs+rz*.8),'#d9cfb8');
      if(!open){for(const f of[-.5,0,.5])L(P(uc+r*f,v,1),P(uc+r*f,v,zs-.5),f===0?'#4f1a17':'#6c211d');
        if(big)for(let i=0;i<4;i++){const a=uc-r+r*.5*i+.012;faceV(a,v,r*.5-.024,zs-4.5,zs-1.2,'#8eb0b8');if(on&&i%2===0)faceV(a,v,r*.5-.024,zs-4.2,zs-1.4,'#f6d8a4',ng);}
        L(P(uc-r,v,zs*.42),P(uc+r,v,zs*.42),'#6c211d');}
      faceV(uc-.018,v,.036,zs+rz-1.2,zs+rz+2.4,'#f2ecdb');light(uc,v,hh+4.5);};
    const archWin=(u,v,du,z,hh,on)=>{const r=du/2,uc=u+r,rz=Math.max(1.5,du*14),zs=z+hh-rz,N=8;
      const ring=(rr,rzz,z0)=>{const p=[P(uc-rr,v,z0),P(uc+rr,v,z0),P(uc+rr,v,zs)];for(let i=0;i<=N;i++){const t=Math.PI*i/N;p.push(P(uc+rr*Math.cos(t),v,zs+rzz*Math.sin(t)));}return p;};
      F(ring(r+.016,rz+1,z-.8),'#e3dcc8');F(ring(r,rz,z),glass);L(P(uc,v,z),P(uc,v,zs+rz),'#e3dcc8');L(P(uc-r,v,zs),P(uc+r,v,zs),'#c9d6d8');
      if(on)F(ring(r-.01,rz-.6,z+.6),lit,ng);};
    const sash=(u,v,du,z,hh,on)=>{faceV(u-.014,v,du+.028,z-1,z+hh+.8,'#e3dcc8');faceV(u,v,du,z,z+hh,glass);L(P(u,v,z+hh*.55),P(u+du,v,z+hh*.55),'#e9e3d0');L(P(u,v,z+hh),P(u+du,v,z+hh),'#9cbcc6');
      if(du>.09)L(P(u+du/2,v,z),P(u+du/2,v,z+hh),'#e9e3d0');faceV(u-.02,v,du+.04,z-1.6,z-.6,'#f0eadb');if(on)faceV(u+.01,v,du-.02,z+.6,z+hh-.5,lit,ng);};
    /* 沿 v 的陡雙坡山牆（正面石壓頂＋頂飾） */
    const gableV=(u,v,du,dv,he0,rise,winFn)=>{const m=u+du/2,rz=he0+rise;
      F([P(u+du,v,he0),P(u+du,v+dv,he0),P(m,v+dv,rz),P(m,v,rz)],W?SND:slateD);
      F([P(u,v,he0),P(m,v,rz),P(m,v+dv,rz),P(u,v+dv,he0)],W?SN:slate);
      for(let i=1;i<5;i++){const f=i/5,z=rz-rise*f;L(P(m+du*f/2,v+.01,z),P(m+du*f/2,v+dv,z),W?'#c2d2d9':'#32434d');L(P(m-du*f/2,v+.01,z),P(m-du*f/2,v+dv,z),W?'#d5e0e3':'#647783');}
      L(P(u+du,v,he0),P(u+du,v+dv,he0),edge);L(P(m,v,rz+1),P(m,v+dv,rz+1),ridgeC);
      F([P(u,v+dv,he0),P(u+du,v+dv,he0),P(m,v+dv,rz)],bk[0]);
      for(let z=he0+3;z<rz-1;z+=3){const f=(z-he0)/rise;L(P(u+du*f/2+.01,v+dv,z),P(u+du-du*f/2-.01,v+dv,z),'#915845');}
      if(winFn)winFn(m,rz);
      L(P(u-.03,v+dv,he0-.5),P(m,v+dv,rz+1.5),cope,cw2);L(P(m,v+dv,rz+1.5),P(u+du+.03,v+dv,he0-.5),cope,cw2);
      if(big){faceV(u-.04,v+dv,.05,he0-2,he0+.5,cope);faceV(u+du-.01,v+dv,.05,he0-2,he0+.5,cope);const t=P(m,v+dv,rz+2);pixel635([t[0],t[1]-3],W?'#e9eff0':'#d8cfb6',1,3);}
      return rz;};
    /* --- A：左側高山牆前突翼（先畫，主屋頂靠它收谷線） --- */
    box(uA0,vA0,duA,VFA-vA0,0,heA,'brick');course(uA0,vA0,duA,VFA-vA0,heA);
    faceV(uA0,VFA,duA,0,zG,PS[0]);faceU(uA1,VF,VFA-VF,0,zG,PS[1]);rust(uA0,VFA,duA);band(uA0,VFA,duA);
    archDoor(c1-wd/2,VFA,wd,dh,false,false);
    /* n≥2：石匾放在最高、最前面的 A 翼門頂上（中段凸窗凸出 .05n 會往下蓋掉約 5px 牆，匾放中段會被吃掉）；底色比波特蘭石深一階＋1px 深框 */
    if(big)sign(c1,VFA+.002,zP+2.5,n>=3?4:3,n>=3?7:5,'#c9bfa5','#5b3a30','#8f8873',n>=3?1:.5);
    if(big){sash(mA-.075*n,VFA,.06*n,zP+6,6,true);sash(mA+.015*n,VFA,.06*n,zP+6,6,false);sash(mA-.04*n,VFA,.08*n,zP+14.5,heA-zP-16.5,true);}
    else sash(mA-.04,VFA,.08,zP+6.5,3.5,true);
    windowU(uA1,VF+.004*n,(VFA-VF)*.8,zG+3,4,false);
    gableV(uA0,vA0,duA,VFA-vA0,heA,RA,(m)=>{if(big)archWin(m-.04*n,VFA,.08*n,heA+2,RA*.42,true);else{faceV(m-.025,VFA,.05,heA+2,heA+6,glass);faceV(m-.02,VFA,.04,heA+2.5,heA+5.5,lit,ng);}});
    /* --- 主屋正立面（只畫正面與右端，左端埋進 A） --- */
    faceV(uA1,VF,uM1-uA1,0,he,bk[0]);courseV(uA1,VF,uM1-uA1,zG,he);
    faceV(uA1,VF,uM1-uA1,0,zG,PS[0]);rust(uA1,VF,uM1-uA1);band(uA1,VF,uM1-uA1);
    faceU(uM1,V0,DV,0,he,bk[1]);courseU(uM1,V0,DV,zG,he);faceU(uM1,V0,DV,0,zG,PS[1]);
    L(P(uM1,V0,0),P(uM1,V0,he),edge);L(P(uM1,VF,0),P(uM1,VF,he),edge);L(P(uA1,VF,0),P(uM1,VF,0),edge);
    windowU(uM1,V0+.04*n,.08*n,zG+2.5,big?5:4,true);if(big)windowU(uM1,V0+.27*n,.07*n,zG+2.5,5,false);
    faceU(uM1,V0+.15*n,.05*n,0,dh*.7,'#5a3b30');light(uM1,V0+.175*n,dh*.7+2.5);
    archDoor(c2-wd/2,VF,wd,dh,big,!big);
    /* 石匾 FIRE STATION（n=1） */
    if(!big)sign(c2,VF+.002,zP+2.5,3,4,'#c9bfa5','#5b3a30','#8f8873',.5); /* n=1：沒有凸窗，匾坐在中門楔石上 */
    /* --- 主屋陡坡板岩屋頂：脊順立面；左端沿谷線收進 A 的 +u 坡 --- */
    const lv=heA<rM,vs=VF-(heA-he)/sM,vsb=V0+(heA-he)/sM,ur=uA1-(rM-heA)/sA;
    F(lv?[P(uA1,V0,he),P(uM1,V0,he),P(uM1,hm,rM),P(ur,hm,rM),P(uA1,vsb,heA)]:[P(uA1,V0,he),P(uM1,V0,he),P(uM1,hm,rM),P(uA1,hm,rM)],W?SND:slateD);
    /* 脊上高煙囪：先畫，前坡再壓住根部 */
    if(big)stack(.41*n,hm-.03*n,.05*n+.02,.06*n,rM-8,rM+10); /* n=1 只露出米色帽、像浮在屋面上，拿掉，只留 A 後脊那根 */
    F(lv?[P(uA1,VF,he),P(uM1,VF,he),P(uM1,hm,rM),P(ur,hm,rM),P(uA1,vs,heA)]:[P(uA1,VF,he),P(uM1,VF,he),P(uM1,hm,rM),P(uA1,hm,rM)],W?SN:slate);
    for(let i=1;i<6;i++){const f=i/6,vv=VF-DV/2*f,z=he+R*f,ul=lv&&z>heA?uA1-(z-heA)/sA:uA1;L(P(ul+.01,vv,z),P(uM1-.01,vv,z),W?'#d5e0e3':'#647783');}
    L(P(uA1,VF+.02,he-.5),P(uM1+.02,VF+.02,he-.5),'#2e3a40');L(P(lv?ur:uA1,hm,rM+1),P(uM1,hm,rM+1),ridgeC);
    /* 右端山牆（側面三角） */
    F([P(uM1,V0,he),P(uM1,VF,he),P(uM1,hm,rM)],bk[1]);for(let z=he+3;z<rM-1;z+=3){const f=(z-he)/R;L(P(uM1,V0+DV*f/2+.01,z),P(uM1,VF-DV*f/2-.01,z),'#6a433a');}
    L(P(uM1,V0-.03,he-.5),P(uM1,hm,rM+1.5),'#cfc7b1',cw2);L(P(uM1,hm,rM+1.5),P(uM1,VF+.03,he-.5),'#cfc7b1',cw2);if(big){const t=P(uM1,hm,rM+2);pixel635([t[0],t[1]-3],W?'#e9eff0':'#8a4b3d',1,3);}
    /* 老虎窗（主坡上，凸窗正上方） */
    if(big){const dw=.10*n,du0=c2-dw/2,dd=.07*n,vfD=VF-.045*n,zD=he+sM*(VF-vfD),hd=6;
      faceV(du0,vfD,dw,zD-2,zD+hd,'#e7e0cc');faceU(du0+dw,vfD-dd,dd,zD-2,zD+hd,'#bdb6a2');
      sash(du0+dw*.18,vfD,dw*.64,zD,hd-1.5,true);
      const rz=zD+hd+5,mm=du0+dw/2;F([P(du0+dw,vfD-dd-.04,zD+hd),P(du0+dw+.01,vfD+.02,zD+hd),P(mm,vfD+.02,rz),P(mm,vfD-dd-.04,rz)],W?SND:slateD);
      F([P(du0-.01,vfD+.02,zD+hd),P(mm,vfD+.02,rz),P(mm,vfD-dd-.04,rz),P(du0,vfD-dd-.04,zD+hd)],W?SN:slate);
      F([P(du0,vfD,zD+hd),P(du0+dw,vfD,zD+hd),P(mm,vfD,rz)],'#e7e0cc');L(P(du0-.01,vfD+.02,zD+hd),P(mm,vfD+.02,rz+.5),'#f2ecdb');L(P(mm,vfD+.02,rz+.5),P(du0+dw+.01,vfD+.02,zD+hd),'#f2ecdb');}
    /* 凸窗（一樓，石框三扇；托座離拱頂留出凸出量蓋住的高度）：凸出 .05n、側面暗一階、鉛皮斜頂＋頂下 1px 簷影，讓它有體積 */
    if(big){ const ow=.13*n,ou=c2-ow/2,po=.05*n,z0=dh+5.5,z1=he-1.2,nn=3,pw=(ow-.024)/nn;
      F([P(ou+.01,VF,z0),P(ou+ow-.01,VF,z0),P(ou+ow-.02,VF+po,z0+1.5),P(ou+.02,VF+po,z0+1.5)],'#cfc7b1');
      faceV(ou,VF+po,ow,z0+1.5,z1,'#e3dcc8');faceU(ou+ow,VF,po,z0+1.5,z1,'#9d968a');
      for(let i=0;i<nn;i++){const a=ou+.012+i*pw;faceV(a+.006,VF+po,pw-.012,z0+2.8,z1-1.6,glass);L(P(a+.006,VF+po,(z0+z1)/2+1),P(a+pw-.006,VF+po,(z0+z1)/2+1),'#e9e3d0');if(i!==1)faceV(a+.012,VF+po,pw-.024,z0+3.4,z1-2,lit,ng);}
      faceU(ou+ow,VF+.008,po-.016,z0+2.8,z1-1.6,'#3f5d6c');
      /* 頂：1px 簷影 → 米色石簷口 → 鉛皮斜頂（石簷把凸窗頂跟後面同色系的板岩坡分開） */
      L(P(ou,VF+po,z1-1),P(ou+ow,VF+po,z1-1),'#2f3b41');
      faceV(ou-.012,VF+po+.012,ow+.024,z1-.2,z1+1.2,'#efe9d8');faceU(ou+ow+.012,VF,po+.012,z1-.2,z1+1.2,'#c9c1ab');
      F([P(ou-.012,VF,z1+3.4),P(ou+ow+.012,VF,z1+3.4),P(ou+ow+.012,VF+po+.012,z1+1.2),P(ou-.012,VF+po+.012,z1+1.2)],W?SN:'#5d6c75');
      /* 兩側小窗離凸窗太近會跟它連成一條米色橫帶；只在 n≥4 正面夠寬時才放，且收窄 */
      if(n>=4){sash(uA1+.03*n,VF,.045*n,zP+6,6,false);sash(uB0-.075*n,VF,.045*n,zP+6,6,true);}}
    else sash(c2-.05,VF,.10,zP+6.5,3.5,false);
    /* --- B：右段前突交叉山牆（脊低於主脊，谷線收進主前坡） --- */
    faceV(uB0,VFB,uB1-uB0,0,he,bk[0]);courseV(uB0,VFB,uB1-uB0,zG,he);faceU(uB1,VF,VFB-VF,0,he,bk[1]);
    faceV(uB0,VFB,uB1-uB0,0,zG,PS[0]);faceU(uB1,VF,VFB-VF,0,zG,PS[1]);rust(uB0,VFB,uB1-uB0);band(uB0,VFB,uB1-uB0);
    L(P(uB0,VFB,0),P(uB0,VFB,he),edge);L(P(uB1,VFB,0),P(uB1,VFB,he),edge);
    archDoor(c3-wd/2,VFB,wd,dh,false,true);
    if(big){sash(mB-.07*n,VFB,.055*n,zP+6,6,true);sash(mB+.015*n,VFB,.055*n,zP+6,6,false);}else sash(mB-.04,VFB,.08,zP+6.5,3.5,false);
    F([P(uB0,VFB,he),P(mB,VFB,rB),P(mB,vInt,rB),P(uB0,VF,he)],W?SN:slate);
    F([P(uB1,VFB,he),P(mB,VFB,rB),P(mB,vInt,rB),P(uB1,VF,he)],W?SND:slateD);
    L(P(mB,vInt,rB+1),P(mB,VFB,rB+1),ridgeC);L(P(uB0,VF,he),P(mB,vInt,rB),W?'#c9d6da':'#36444d');
    F([P(uB0,VFB,he),P(uB1,VFB,he),P(mB,VFB,rB)],bk[0]);for(let z=he+3;z<rB-1;z+=3){const f=(z-he)/RB;L(P(uB0+(uB1-uB0)*f/2+.01,VFB,z),P(uB1-(uB1-uB0)*f/2-.01,VFB,z),'#915845');}
    if(big)archWin(mB-.03*n,VFB,.06*n,he+1.5,RB*.5,false);else pixel635(P(mB,VFB,he+3),'#e3dcc8',2,2);
    L(P(uB0-.03,VFB,he-.5),P(mB,VFB,rB+1.5),cope,cw2);L(P(mB,VFB,rB+1.5),P(uB1+.03,VFB,he-.5),cope,cw2);
    if(big){const t=P(mB,VFB,rB+2);pixel635([t[0],t[1]-3],W?'#e9eff0':'#d8cfb6',1,3);}
    /* 外露山牆端煙囪：寬胸牆到簷口，再收成高煙囪過脊（右端側牆） */
    if(big){box(uM1,hm-.06*n,.03*n,.12*n,0,he+3,[bk[0],bk[1],bk[2]]);courseU(uM1+.03*n,hm-.06*n,.12*n,0,he+3);
      F([P(uM1+.03*n,hm-.06*n,he+3),P(uM1+.03*n,hm+.06*n,he+3),P(uM1+.03*n,hm+.035*n,he+6),P(uM1+.03*n,hm-.035*n,he+6)],W?SN:'#c9c0a8');
      stack(uM1,hm-.035*n,.03*n,.07*n,he+3,rM+8);}
    /* A 後脊高煙囪 */
    if(big)stack(mA-.03*n,vA0+.07*n,.06*n,.05*n,rA-6-sA*.03*n,rA+7);
    else stack(mA-.05,vA0+.06,.10,.05,rA-7,rA+2); /* n=1：矮胖雙管煙囪，不要細高得像小尖塔 */
    /* 前景：門燈柱、樹、消防車 */
    if(big)truck(c2-.07*n,VF+.06*n,.14*n,.2*n);
    light(.96*n,.88*n,8);tree(.93*n,.30*n);if(big)tree(.95*n,.52*n);
  }else{
    /* ===== v2：1950–60 年代戰後消防局 =====
       左前：獨立方形混凝土訓練塔（側面鋼梯、頂部開敞晾水帶層＋欄杆、逐層訓練窗洞、紅色演練陽台）；
       中：一層車庫大廳（混凝土框＋上半玻璃紅色摺門、薄挑簷）上壓退縮的二層紅磚長條樓（橫向帶狀窗、FIRE STATION 金屬字）；
       右：一層看守室翼（大玻璃、薄挑簷）。 */
    const nd=big?4:3,dz=12+1.5*n,hH=dz+4,hb=hH+9+n;
    /* T638 修：n=1 拿掉看守室翼，大廳往右延到 .92 吃回寬度；塔改紅磚填充＋淺色混凝土樓板線，降一層（th=40+8n，n=1 為 42），塔身加寬。 */
    const uB0=.27*n,uB1=big?.80*n:.92,V0=.26*n,VF=.58*n,VU1=VF-.10*n,DU=uB1-uB0,DV=VF-V0;
    const cF='#e2dfd3',cS='#b2b3a9',cT='#c9cabf',brF='#a45c48',brS='#7b463b',felt=W?SN:'#7c878a';
    const tw=.10*n+.10,uT0=big?.05*n:.04,vT0=.50*n,th=big?40+8*n:42;
    /* 鋪面：訓練場柏油（黃線）＋車庫前混凝土坪（分格縫） */
    pave(.02*n,.42*n,uB0-.03*n,n-.42*n-.025,'#8d938f');
    pave(uB0-.01*n,VF,.70*n,n-VF-.025,'#b4b5ab');
    for(let a=uB0+.15;a<.95*n;a+=.3)L(P(a,VF+.02),P(a,n-.03),W?'#cbd6d8':'#9c9e95');
    L(P(uB0-.01*n,VF+.38*(n-VF)),P(.955*n,VF+.38*(n-VF)),W?'#cbd6d8':'#9c9e95');
    if(!W){L(P(.04*n,.82*n),P(uB0-.04*n,.82*n),'#d9c25a');L(P(.04*n,.82*n),P(.04*n,.96*n),'#d9c25a');}
    tree(.95*n,.18*n);
    /* --- 訓練塔：與長條樓分離，左前角；淺色混凝土框（樓板線＋角柱）＋紅磚填充牆，跟上面的紅磚長條樓同一家 --- */
    { const u=uT0,v=vT0,t=tw,ft=big?11:9,dk='#2c3a40';
      box(u,v,t,t,0,th,[brF,brS,cT]);
      for(let z=3;z<th-2;z+=3)if(z%ft>1.5&&z%ft<ft-1.5){L(P(u+.02,v+t,z),P(u+t-.02,v+t,z),'#8f4f3e');L(P(u+t,v+.02,z),P(u+t,v+t-.02,z),'#683d34');}
      let fl=0;for(let z=ft;z<th-2;z+=ft){L(P(u,v+t,z),P(u+t,v+t,z),'#f4f2ea');L(P(u+t,v,z),P(u+t,v+t,z),'#cbccc3');L(P(u,v+t,z-1),P(u+t,v+t,z-1),'#d6d3c7');L(P(u+t,v,z-1),P(u+t,v+t,z-1),'#a9aaa1');}
      L(P(u+.012,v+t,0),P(u+.012,v+t,th),'#f4f2ea');L(P(u+t-.012,v+t,0),P(u+t-.012,v+t,th),'#cfccc0');L(P(u+t,v+.012,0),P(u+t,v+.012,th),'#b9b9b0');
      for(let z=3;z<th-ft;z+=ft,fl++){const on=fl%3===1;faceV(u+t*.3,v+t,t*.4,z,z+5,dk);if(on)faceV(u+t*.34,v+t,t*.32,z+1,z+4,'#f0c98e',ng);
        faceU(u+t,v+t*.12,t*.3,z+1,z+5.5,'#27343a');L(P(u+t*.27,v+t,z-.6),P(u+t*.73,v+t,z-.6),'#f4f2ea');
}
      /* 頂層晾水帶開敞層：角柱＋深色空腔＋垂掛水帶 */
      const zt=th-ft+1;faceV(u+.02,v+t,t-.04,zt+1,th-1.5,'#25323a');faceU(u+t,v+.02,t-.04,zt+1,th-1.5,'#1f2b31');
      L(P(u+t*.5,v+t,zt+1),P(u+t*.5,v+t,th-1.5),cF);L(P(u+t,v+t*.5,zt+1),P(u+t,v+t*.5,th-1.5),cS);
      for(const f of[.22,.72]){const p=P(u+t*f,v+t,th-2);L([p[0],p[1]],[p[0],p[1]+Math.min(6,ft-4)],'#c25546');}
      box(u-.02,v-.02,t+.04,t+.04,th,2,[cF,cS,cT]);
      /* 頂欄杆 */
      const rz=th+5;L(P(u-.02,v+t+.02,rz),P(u+t+.02,v+t+.02,rz),'#5e6c71');L(P(u+t+.02,v-.02,rz),P(u+t+.02,v+t+.02,rz),'#4f5d62');
      for(const f of[0,.5,1]){L(P(u-.02+(t+.04)*f,v+t+.02,th+2),P(u-.02+(t+.04)*f,v+t+.02,rz),'#5e6c71');L(P(u+t+.02,v-.02+(t+.04)*f,th+2),P(u+t+.02,v-.02+(t+.04)*f,rz),'#4f5d62');}
      /* 側面鋼梯（u+t 面）＋護籠圈 */
      const va=v+t*.6,vb=v+t*.86;L(P(u+t+.014,va,1),P(u+t+.014,va,rz),'#3f4b50');L(P(u+t+.014,vb,1),P(u+t+.014,vb,rz),'#3f4b50');
      if(big){for(let z=3;z<rz;z+=2.5)L(P(u+t+.014,va,z),P(u+t+.014,vb,z),'#7d8a8f');
        for(let z=14;z<rz-2;z+=7)L(P(u+t+.045,va-.012,z),P(u+t+.045,vb+.012,z),'#55636a');} /* n=1 只畫兩根立柱，不畫橫檔 */
      /* 塔頂桿（n=1 短一點） */
      const pp=P(u+t*.5,v+t*.5,th+2),ph=big?6:3;L(pp,[pp[0],pp[1]-ph],'#59666b');pixel635([pp[0]-1,pp[1]-ph],'#c64a3a',3,1);
      light(u+t+.06,v+t+.08,7);
      const hy=P(u+t*.4,v+t+.18,0);pixel635([hy[0]-1,hy[1]-4],'#c23b2f',3,4);pixel635([hy[0]-2,hy[1]-3],'#9b2c24',5,1);pixel635([hy[0]-1,hy[1]-5],W?'#eef3f3':'#d8564a',3,1); }
    /* --- 一層車庫大廳：混凝土框，摺門 --- */
    faceV(uB0,VF,DU,0,hH,cF);faceU(uB1,V0,DV,0,hH,cS);
    L(P(uB0,VF,0),P(uB0,VF,hH),edge);L(P(uB1,VF,0),P(uB1,VF,hH),edge);L(P(uB1,V0,0),P(uB1,V0,hH),edge);L(P(uB0,VF,0),P(uB1,VF,0),edge);
    const bw=(DU-.03*n)/nd;
    for(let i=0;i<nd;i++){const a=uB0+.015*n+bw*i+bw*.08,dw=bw*.84,open=(big&&i===1);
      faceV(a,VF,dw,.5,dz,open?'#20272b':'#b23b2f');
      if(!open){const lv=big?4:3;for(let j=1;j<lv;j++)L(P(a+dw*j/lv,VF,.5),P(a+dw*j/lv,VF,dz),'#7e2620');
        faceV(a+.01,VF,dw-.02,dz*.52,dz-1.2,'#8fb1ba');for(let j=0;j<lv;j++){L(P(a+dw*(j+.5)/lv,VF,dz*.52),P(a+dw*(j+.5)/lv,VF,dz-1.2),'#d55a4a');}
        L(P(a+.01,VF,dz*.52),P(a+dw-.01,VF,dz*.52),'#7e2620');if((i+n)%2===0)faceV(a+.015,VF,dw-.03,dz*.55,dz-1.5,'#f7dca8',ng);}
      else{faceV(a+.01,VF,dw-.02,2,dz-2,'#b2955f',ng);faceV(a+.01,VF,dw-.02,.5,2,'#6e5a3c',ng);}
      L(P(a,VF,dz),P(a+dw,VF,dz),'#8d8f86');}
    /* 大廳平頂＋門上薄挑簷（前緣外挑） */
    faceV(uB0,VF,DU,hH-2,hH,'#aaa79b');
    F(Q(uB0-.01,VU1-.01,DU+.02,VF-VU1+.055*n,hH),felt);
    faceV(uB0-.015,VF+.045*n,DU+.03,hH-1.6,hH+.4,'#efece2');faceU(uB1+.015,VU1,VF-VU1+.045*n,hH-1.6,hH+.4,'#cfd0c6');
    for(let i=0;i<nd;i++)light(uB0+.015*n+bw*(i+.5),VF+.05*n,hH-2.5);
    /* --- 退縮二層紅磚長條樓 --- */
    box(uB0,V0,DU,VU1-V0,hH,hb-hH,[brF,brS,W?SN:'#707c7f']);
    for(let z=hH+3;z<hb-1;z+=3){L(P(uB0+.02,VU1,z),P(uB1-.02,VU1,z),'#8f4f3e');L(P(uB1,V0+.02,z),P(uB1,VU1-.02,z),'#683d34');}
    { const z0=hH+2.5,z1=hb-2.2,lw=big?.50:.34,lu=uB0+.025*n,a0=lu+lw+(big?.03*n:.03),a1=uB1-.03*n;
      faceV(a0-.01,VU1,a1-a0+.02,z0-1.5,z0,'#e6e3d8');faceV(a0-.01,VU1,a1-a0+.02,z1,z1+1.2,'#e6e3d8');faceV(a0,VU1,a1-a0,z0,z1,'#58808f');
      L(P(a0,VU1,z1-.5),P(a1,VU1,z1-.5),'#8fb3be');
      const st=big?.047*n:.07;let k=0;for(let a=a0;a<a1-.01;a+=st,k++){L(P(a,VU1,z0),P(a,VU1,z1),'#e6e3d8');if(k%5===1||k%5===2||k%7===4)faceV(a+.008,VU1,Math.min(st,a1-a)-.016,z0+.5,z1-.5,'#f4d9a6',ng);}
      L(P(a1,VU1,z0),P(a1,VU1,z1),'#e6e3d8');
      /* FIRE STATION 字樣（左端，家族統一寫法）：淺色混凝土底帶嵌在紅磚面上，深青銅色點列字 */
      sign(lu+lw/2,VU1+.002,(z0+z1)/2,big?4:3,big?7:4,'#e6e3d8','#5e4e42',null,big?1.5:.5);
      /* 側面短帶窗 */
      faceU(uB1,V0+.03*n,VU1-V0-.06*n,z0,z1,'#46697a');for(let b=V0+.03*n;b<VU1-.04*n;b+=.05*n)L(P(uB1,b,z0),P(uB1,b,z1),'#c3c4ba');faceU(uB1,V0+.03*n,VU1-V0-.06*n,z0-1.5,z0,'#c3c4ba');
      if(big)faceU(uB1,V0+.08*n,.06*n,z0+.5,z1-.5,'#efcf98',ng); }
    L(P(uB0-.01,VU1+.01,hb),P(uB1+.01,VU1+.01,hb),'#efece2',2);L(P(uB1+.01,V0,hb),P(uB1+.01,VU1+.01,hb),'#d6d6cc',2);
    /* 屋頂：樓梯間、警報器桿、旗桿 */
    if(big){box(uB0+.05*n,V0+.02*n,.13*n,.09*n,hb,6,[cF,cS,cT]);faceV(uB0+.09*n,V0+.11*n,.03*n,hb,hb+4.5,'#4d5f66');
      const sp=P(uB1-.10*n,V0+.08*n,hb);L(sp,[sp[0],sp[1]-9],'#59666b');pixel635([sp[0]-2,sp[1]-12],'#8b979b',5,3);pixel635([sp[0]-1,sp[1]-13],'#b9c3c5',3,1);
      for(const f of[.48,.58,.68])box(uB0+DU*f,V0+.10*n,.05*n,.05*n,hb,1.5,['#b9c9cc','#8ea3a8','#a9c2c8']);
      for(const f of[.85,.92])pixel635(P(uB0+DU*f,V0+.04*n,hb),'#4a5558',2,2);
      const fp=P(uB0+.30*n,V0+.05*n,hb);L(fp,[fp[0],fp[1]-14],'#d8dcd8');pixel635([fp[0]+1,fp[1]-14],'#b8443a',4,3);}
    /* n=1：不放樓梯間盒，屋頂淨空（只剩塔、大廳、二層樓三段） */
    /* --- 右側一層看守室翼（n≥2）：紅磚、大玻璃混凝土框、入口、薄挑簷平頂；退到大廳正面之後（vf=.56n），四扇門完整露出 --- */
    if(big){ const u=uB1,v=.26*n,du=.15*n,dv=.30*n,hw=10+1.8*n,vf=v+dv;
      box(u,v,du,dv,0,hw,[brF,brS,W?SN:'#7c878a']);for(let z=3;z<hw-1;z+=3){L(P(u+.02,vf,z),P(u+du-.02,vf,z),'#8f4f3e');L(P(u+du,v+.02,z),P(u+du,vf-.02,z),'#683d34');}
      faceV(u+.012*n,vf,du*.6,1.5,hw-1.5,cF);faceV(u+.02*n,vf,du*.6-.016*n,2.5,hw-2.5,'#4f7887');
      for(let a=u+.02*n+.035*n;a<u+du*.6;a+=.035*n)L(P(a,vf,2.5),P(a,vf,hw-2.5),'#e8e6dc');
      faceV(u+.025*n,vf,du*.34,3.5,hw-3,lit,ng);
      faceV(u+du*.72,vf,du*.2,0,hw-3,cF);faceV(u+du*.74,vf,du*.16,.5,hw-4,'#86aab3');faceV(u+du*.74,vf,du*.16,.5,hw-4,lit,ng);
      faceU(u+du,v+.05*n,dv*.5,4,hw-3,'#46697a');faceU(u+du,v+.05*n,dv*.5,3,4,'#d6d6cc');
      faceV(u,vf+.04,du+.025,hw-1.2,hw+.4,'#efece2');faceU(u+du+.025,v-.02,dv+.06,hw-1.2,hw+.4,'#cfd0c6');
      F(Q(u,v-.02,du+.025,dv+.06,hw+.4),W?SN:'#e9e7de');F(Q(u+.012,v,du-.01,dv,hw+.9),W?'#f4f8f8':'#848f91');
      light(u+du*.82,vf+.06,hw-2); }
    if(big)truck(uB0+.015*n+bw*1.08,VF+.06*n,bw*.84,.22*n);
    light(.97*n,.95*n,8);
  }
};
