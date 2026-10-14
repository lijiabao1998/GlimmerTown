/* T638 k6 小型地方消防局 v1／v2（只畫外觀；輸出只由 k,n,winter,vi 決定，零亂數）。
   v1：維多利亞引擎房（側坡主屋頂＋正面十字山牆＋框邊石匾＋紅色扁弧摺門）＋右後矮方晾水帶塔（百葉段露出屋脊、紅水帶、出簷低四坡帽、風向標）＋低矮值班室。
   v2：1930 年代平頂紅磚站，高低兩段：左側一層半引擎廳（兩扇紅摺門＋階梯石女兒牆刻 FIRE／STATION），右側兩層辦公段＋屋頂瞭望室與紅旗。 */
window.fire638_k6=function(H,vi){
  const {P,Q,F,L,E,pixel635,faceV,faceU,box,course,windowV,windowU,light,pitched,door,arch,pave,tree,truck,pal,edge,stone,glass,lit,slate,slateD,n,winter,g,ng}=H;
  const sideStone='#b3baa9',snowF='#edf3f3',snowS='#d5e0e3',slateLn=winter?'#c9d6db':'#647783';
  const post=(u,v,z)=>{L(P(u,v,0),P(u,v,z-1),'#4b5152');light(u,v,z);};
  const hydrant=(u,v)=>{const p=P(u,v,0);pixel635([p[0]-1,p[1]-4],'#b8392c',3,4);pixel635([p[0]-1,p[1]-5],winter?'#eef3f3':'#d9d2bd',3,1);};
  /* 統一字樣：1px 高、2px 等距點列沿牆面斜走；gap>0 時依 FIRE:STATION=4:7 分兩字、中間空 gap 格。 */
  const letters=(x0,vv,len,z,col,gap=0)=>{const cells=Math.floor((len*32+1)/2),a0=x0+(len-cells/16)/2,w1=gap?Math.round((cells-gap)*4/11):cells;
    for(let i=0;i<cells;i++){if(gap&&i>=w1&&i<w1+gap)continue;pixel635(P(a0+(i+.3)/16,vv,z),col,1,1);}};
  if(vi===1){
    const u=n*.10,v=n*.17,du=n*.52,dv=n*.43,vf=v+dv,he=17+2*n,rise=7+2*n,mv=v+dv/2,rid=he+rise,dh=8+2*n;
    const tu=u+du,tv=v,tw=n*.21,th=rid+7,tvf=tv+tw,tue=tu+tw,sp=4+n;
    const au=tu,av=tvf,aw=n*.22,ad=vf-av,ah=9+n,ah2=ah+3;
    /* 前坪：整片淺石鋪面接到地塊邊，門前一段深色車道＋花崗石塊縫。 */
    pave(n*.05,vf,n*.90,n-vf-.025,'#bcb6a4');pave(u+du*.08,vf,du*.84,n-vf-.025,'#97958a');
    for(let b=vf+.09;b<n-.05;b+=.10)L(P(u+du*.09,b),P(u+du*.91,b),winter?'#c9d4d6':'#8a8a80');
    /* 引擎房：兩層紅磚、石勒腳。 */
    box(u,v,du,dv,0,he,'brick');course(u,v,du,dv,he);
    faceV(u,vf,du,0,1.4,'#8f8676');faceU(u+du,v,dv,0,1.4,'#6f6a5f');
    /* 側坡主屋頂（脊線平行街面）：後坡、前坡、右側山牆。 */
    F([P(u,v,he),P(u+du,v,he),P(u+du,mv,rid),P(u,mv,rid)],winter?snowS:slateD);
    F([P(u,vf,he),P(u+du,vf,he),P(u+du,mv,rid),P(u,mv,rid)],winter?snowF:slate);
    for(let i=1;i<4;i++){const f=i/4;L(P(u,vf-dv/2*f,he+rise*f),P(u+du,vf-dv/2*f,he+rise*f),slateLn);}
    F([P(u+du,v,he),P(u+du,vf,he),P(u+du,mv,rid)],pal.brick[1]);
    for(let z=he+3;z<rid-1;z+=3){const f=(z-he)/rise;L(P(u+du,v+dv/2*f,z),P(u+du,vf-dv/2*f,z),'#6a433a');}
    L(P(u-.02,mv,rid+.6),P(u+du,mv,rid+.6),'#8b979c');
    L(P(u+du,v-.03,he),P(u+du,mv,rid+1),stone);L(P(u+du,mv,rid+1),P(u+du,vf+.03,he),stone);
    L(P(u,vf+.02,he),P(u,mv,rid+1),stone);
    /* 煙囪（後坡左段）。 */
    box(u+du*.12,mv-.05,.06,.08,he+rise*.55,4+n,['#8d5644','#714836','#ab775a']);
    /* 正面十字山牆：脊線垂直街面，屋谷落在主屋頂前坡上。 */
    const cw=du*.50,cu=u+du*.25,cm=cu+cw/2,r2=rise-2,ctop=he+r2,cvb=vf-(r2/rise)*(dv/2);
    F([P(cu,vf,he),P(cm,vf,ctop),P(cm,cvb,ctop)],winter?'#e4ecee':slate);
    F([P(cu+cw,vf,he),P(cm,vf,ctop),P(cm,cvb,ctop)],winter?'#cfdbe0':slateD);
    L(P(cm,cvb,ctop+.5),P(cm,vf,ctop+.5),'#8b979c');
    F([P(cu,vf,he),P(cu+cw,vf,he),P(cm,vf,ctop)],pal.brick[0]);
    for(let z=he+3;z<ctop-1;z+=3){const f=(z-he)/r2;L(P(cu+cw*f/2+.02,vf,z),P(cu+cw-cw*f/2-.02,vf,z),'#915845');}
    L(P(cu-.03,vf,he-.5),P(cm,vf,ctop+1.2),stone,2);L(P(cm,vf,ctop+1.2),P(cu+cw+.03,vf,he-.5),stone,2);
    /* 石匾（FIRE STATION）：跨在山牆底與二樓牆之間，1px 深框＋淺刻痕點列。 */
    const pw=cw*(n>1?.66:.84),px=cm-pw/2,pz0=he-3.6,pz1=he+1.2;
    faceV(px,vf,pw,pz0,pz1,'#8f8873');faceV(px+1/32,vf,pw-2/32,pz0+1,pz1-1,stone);
    letters(px+1/32,vf,pw-2/32,(pz0+pz1)/2+.5,'#8a7c63',n>1?2:0);
    /* 二樓扁弧拱上下推拉窗：石框（弧高 ≤1px）、玻璃、中橫檔、石窗台。 */
    const swin=(x,w,z,hh,on)=>{F([P(x-.02,vf,z-.8),P(x+w+.02,vf,z-.8),P(x+w+.02,vf,z+hh+.5),P(x+w/2,vf,z+hh+1.3),P(x-.02,vf,z+hh+.5)],stone);
      F([P(x,vf,z),P(x+w,vf,z),P(x+w,vf,z+hh-.1),P(x+w/2,vf,z+hh+.6),P(x,vf,z+hh-.1)],glass);
      L(P(x,vf,z+hh*.5),P(x+w,vf,z+hh*.5),'#c9c2ad');if(w*32>=5)L(P(x+w/2,vf,z),P(x+w/2,vf,z+hh),'#c9c2ad');
      L(P(x-.03,vf,z-.8),P(x+w+.03,vf,z-.8),'#ece5d0');
      if(on)faceV(x+.012,vf,w-.024,z+.6,z+hh-.4,lit,ng);};
    const wz=dh+3.6,wh=4;
    (n>1?[[.06,.14,1],[.80,.14,0]]:[[.05,.15,1],[.80,.15,0]]).forEach(([f,w,on])=>swin(u+du*f,du*w,wz,wh,on));
    /* 石條帶（門楣）。 */
    faceV(u,vf,du,dh+.8,dh+2.2,stone);faceU(u+du,v,dv,dh+.8,dh+2.2,sideStone);
    /* 紅色扁弧摺門：石框、拱心石、四片摺門豎縫、上段玻璃格、門燈。n=1 一扇寬門，n=2 兩扇。 */
    const rdoor=(x,w,hh)=>{const s0=hh-2,o=[P(x-.026,vf,0),P(x+w+.026,vf,0),P(x+w+.026,vf,s0)];
      for(let i=0;i<=8;i++){const f=i/8;o.push(P(x+w+.026-(w+.052)*f,vf,s0+.8+Math.sin(f*Math.PI)*2));}F(o,'#d8d0b9');
      const r=[P(x,vf,.5),P(x+w,vf,.5),P(x+w,vf,s0)];for(let i=0;i<=8;i++){const f=i/8;r.push(P(x+w-w*f,vf,s0+Math.sin(f*Math.PI)*2));}F(r,'#962f26');
      faceV(x+.014,vf,w-.028,hh*.56,hh*.78,'#8fb2bb');faceV(x+.02,vf,w-.04,hh*.58,hh*.76,'#fae1b1',ng);
      for(const f of[.25,.5,.75])L(P(x+w*f,vf,.8),P(x+w*f,vf,s0+(f===.5?1.6:1)),f===.5?'#4a1c18':'#6e221d');
      L(P(x+.01,vf,hh*.56),P(x+w-.01,vf,hh*.56),'#6e221d');
      for(const f of[.40,.60])pixel635(P(x+w*f,vf,hh*.40),'#d2b26c',1,1);
      pixel635(P(x+w/2,vf,hh+1.6),'#efe9d6',1,2);light(x+w/2,vf,hh+2.3);};
    if(n>1){rdoor(u+du*.09,du*.36,dh);rdoor(u+du*.55,du*.36,dh);}
    else rdoor(u+du*.18,du*.64,dh);
    /* 晾水帶塔：矮方磚塔、石帶、窄窗（z=6 起每 9px）、頂層兩面百葉＋兩條紅水帶、石簷口、出簷低四坡板岩帽＋風向標。 */
    box(tu,tv,tw,tw,0,th,'brick');course(tu,tv,tw,tw,th);
    const ww=Math.max(.05,tw*.26),zl0=th-7.6,zl1=th-1.6;
    faceV(tu,tvf,tw,he,he+1.3,stone);faceU(tue,tv,tw,he,he+1.3,sideStone);
    for(let z=6,i=0;z+4<=zl0-3.8;z+=9,i++){faceV(tu+tw/2-ww/2,tvf,ww,z,z+4,glass);faceU(tue,tv+tw/2-ww/2,ww,z,z+4,'#496b7c');if(i===0)faceU(tue,tv+tw/2-ww/2+.01,ww-.02,z+.6,z+3.4,'#f0cf96',ng);}
    faceV(tu+tw*.14,tvf,tw*.72,zl0-.8,zl1+.6,stone);faceV(tu+tw*.20,tvf,tw*.60,zl0,zl1,'#2b3437');
    faceU(tue,tv+tw*.14,tw*.72,zl0-.8,zl1+.6,sideStone);faceU(tue,tv+tw*.20,tw*.60,zl0,zl1,'#242c2f');
    for(let z=zl0+1.5;z<zl1;z+=2){L(P(tu+tw*.20,tvf,z),P(tu+tw*.80,tvf,z),'#7d7766');L(P(tue,tv+tw*.20,z),P(tue,tv+tw*.80,z),'#6c6759');}
    for(const f of[.36,.64])L(P(tu+tw*f,tvf,zl1-.3),P(tu+tw*f,tvf,zl0+.8),'#c25546');
    box(tu-.025,tv-.025,tw+.05,tw+.05,th,1.6,[stone,sideStone,'#c9c2ad']);
    const sb=th+1.6,su=tu-.045,sv=tv-.045,sw=tw+.09,ap=P(su+sw/2,sv+sw/2,sb+sp);
    F([P(su,sv+sw,sb),P(su+sw,sv+sw,sb),ap],winter?snowF:slate);F([P(su+sw,sv,sb),P(su+sw,sv+sw,sb),ap],winter?'#cbd8dd':slateD);
    const lerp=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
    L(lerp(P(su,sv+sw,sb),ap,.5),lerp(P(su+sw,sv+sw,sb),ap,.5),slateLn);L(lerp(P(su+sw,sv,sb),ap,.5),lerp(P(su+sw,sv+sw,sb),ap,.5),winter?'#b5c6cd':'#2c3a43');
    L(P(su,sv+sw,sb),P(su+sw,sv+sw,sb),edge);L(P(su+sw,sv+sw,sb),P(su+sw,sv,sb),edge);L(P(su+sw,sv+sw,sb),ap,'#8b979c');
    pixel635([ap[0],ap[1]-3],'#2f3a3c',1,3);pixel635([ap[0]-1,ap[1]-3],'#2f3a3c',3,1);pixel635([ap[0]-1,ap[1]-2],'#2f3a3c',1,1);pixel635([ap[0]+2,ap[1]-3],'#8b979c',1,1);
    /* 值班室：單層、靠塔的單坡板岩頂（後高前低），小門＋窗。 */
    faceV(au,vf,aw,0,ah,'#a66250');F([P(au+aw,av,0),P(au+aw,vf,0),P(au+aw,vf,ah),P(au+aw,av,ah2)],'#7c4a40');
    for(let z=3;z<ah-1;z+=3){L(P(au+.02,vf,z),P(au+aw-.02,vf,z),'#915845');L(P(au+aw,av+.02,z),P(au+aw,vf-.02,z),'#6a433a');}
    L(P(au,vf,0),P(au+aw,vf,0),edge);L(P(au+aw,vf,0),P(au+aw,av,0),edge);L(P(au+aw,vf,0),P(au+aw,vf,ah),edge);
    F([P(au,av,ah2),P(au+aw+.02,av,ah2),P(au+aw+.02,vf+.03,ah-.4),P(au,vf+.03,ah-.4)],winter?snowF:slate);
    for(const f of[.34,.67])L(P(au,vf-ad*f,ah+3*f),P(au+aw,vf-ad*f,ah+3*f),slateLn);
    L(P(au,vf+.03,ah-.4),P(au+aw+.02,vf+.03,ah-.4),edge);L(P(au+aw+.02,vf+.03,ah-.4),P(au+aw+.02,av,ah2),edge);
    faceV(au+aw*.16,vf,aw*.30,0,8,'#d8d0b9');faceV(au+aw*.19,vf,aw*.24,.5,7.2,'#5b3b2c');faceV(au+aw*.21,vf,aw*.20,5.6,6.9,'#e8d9a8',ng);
    windowV(au+aw*.58,vf,aw*.28,3.5,3.5,true);windowU(au+aw,av+ad*.32,ad*.36,3.5,3.5,false);
    /* 側牆二樓窗（值班室屋頂以上）。 */
    if(n>1)windowU(u+du,v+dv*.62,dv*.20,he-6.5,5,true);
    /* 院落小物：燈柱、消防栓、樹（塔後右側，不擋門）。 */
    post(n*.07,n*.93,9);hydrant(au+aw*.86,vf+.12);
    tree(n*.93,n>1?n*.24:n*.10);
  }else{
    const N1=n<2,u=N1?.07:n*.08,du=N1?.80:n*.72,dv=N1?.34:n*.40,v=N1?.25:n*.20,vf=v+dv,ue=u+du,ou=u+du*.70;
    const dh=9+1.5*n,heH=N1?17:21,heO=N1?21:26;
    /* 樹在左側、先畫（跟 v0／v1 的右後方錯開），廳屋左角擋住一點樹冠。 */
    tree(n*.04,n*.62);
    pave(n*.04,vf,n*.92,n-vf-.025,'#b8b2a2');pave(u+du*.03,vf,du*.64,n-vf-.025,'#8e9490');
    /* 兩門前黃色禁停框線（冬天被雪蓋淡）。 */
    const hatch=winter?'#e3dcb4':'#d6b94c',hv0=vf+.05,hv1=n-.07;
    for(const [a,w] of[[u+du*.05,du*.28],[u+du*.37,du*.28]]){L(P(a,hv0),P(a,hv1),hatch);L(P(a+w,hv0),P(a+w,hv1),hatch);}
    /* 引擎廳（一層半）與辦公段（兩層）：兩個平頂紅磚盒，高低錯開。 */
    const roofC='#6c7473';
    box(u,v,ou-u,dv,0,heH,[pal.brick[0],pal.brick[1],roofC]);course(u,v,ou-u,dv,heH);
    box(ou,v,ue-ou,dv,0,heO,[pal.brick[0],pal.brick[1],roofC]);course(ou,v,ue-ou,dv,heO);
    faceV(u,vf,du,0,1.6,'#c9c1a8');faceU(ue,v,dv,0,1.6,'#a9ad9e');L(P(u,vf,0),P(ue,vf,0),edge);L(P(ue,vf,0),P(ue,v,0),edge);
    /* 波特蘭石：門楣帶（全寬）、兩段各自的簷口帶與壓頂。 */
    faceV(N1?ou:u,vf,N1?ue-ou:du,dh+1,dh+2.8,stone);faceU(ue,v,dv,dh+1,dh+2.8,sideStone);
    faceV(u,vf,ou-u,heH-2,heH,stone);L(P(u-.02,vf+.02,heH),P(ou,vf+.02,heH),'#efe9d6');
    faceV(ou,vf,ue-ou,heO-2.2,heO,stone);faceU(ue,v,dv,heO-2.2,heO,sideStone);
    L(P(ou-.02,vf+.02,heO),P(ue+.02,vf+.02,heO),'#efe9d6');L(P(ue+.02,vf+.02,heO),P(ue+.02,v,heO),'#c9c6b4');
    /* 屋頂小物（n=2 才有）：引擎廳玻璃採光頂（通風管被辦公段擋住、已拿掉）。 */
    if(!N1){box(u+du*.10,v+dv*.14,du*.20,dv*.26,heH,2,['#6f8f99','#55707a','#86a5ae']);
      if(!winter)for(const f of[.35,.68])L(P(u+du*(.10+.20*f),v+dv*.14,heH+2),P(u+du*(.10+.20*f),v+dv*.40,heH+2),'#55707a');}
    /* 辦公段屋頂瞭望室：米色石牆、帶狀窗、出簷平板、旗桿＋整面紅旗。 */
    const lw=du*(N1?.22:.24),lu=ou+(ue-ou-lw)/2,lv=v+dv*.12,ld=dv*.46,lh=N1?6:9,lz=heO;
    box(lu,lv,lw,ld,lz,lh,'cream');
    faceV(lu+.02,lv+ld,lw-.04,lz+1.8,lz+lh-1.4,glass);faceU(lu+lw,lv+.02,ld-.04,lz+1.8,lz+lh-1.4,'#496b7c');
    for(let a=lu+.06;a<lu+lw-.03;a+=.07)L(P(a,lv+ld,lz+1.8),P(a,lv+ld,lz+lh-1.4),'#d4d8d0');
    faceV(lu+.03,lv+ld,lw*.45,lz+2.4,lz+lh-2,lit,ng);
    box(lu-.03,lv-.03,lw+.06,ld+.06,lz+lh,1.6,['#5b6766','#46504f','#7d8786']);
    const fp=P(lu+lw*.5,lv+ld*.5,lz+lh+1.6),fl=N1?9:11;L(fp,[fp[0],fp[1]-fl],'#d8dcdc');F([[fp[0]+1,fp[1]-fl],[fp[0]+6,fp[1]-fl+1.5],[fp[0]+1,fp[1]-fl+3]],'#c0392b');
    /* 階梯石女兒牆（置中於兩門）：下階刻 STATION、上階刻 FIRE；上階頂下 1px 陰影線，讀成石匾不是多一層樓。 */
    const cx=u+du*.35,w1=du*.56,w2=du*.30,st=3+n*.5,pd=.05,pf='#e4ddc8',cop=winter?'#eef3f3':'#f1ebda',lc='#7a6e5a';
    for(const [w,z0,z1] of[[w1,heH-2,heH+st],[w2,heH+st-.3,heH+2*st]]){faceV(cx-w/2,vf,w,z0,z1,pf);L(P(cx-w/2,vf,Math.max(z0,heH)),P(cx-w/2,vf,z1),'#a49f8d');faceU(cx+w/2,vf-pd,pd,Math.max(z0,heH),z1,sideStone);F(Q(cx-w/2,vf-pd,w,pd,z1),cop);L(P(cx-w/2,vf-pd,z1),P(cx+w/2,vf-pd,z1),'#9a9584');L(P(cx-w/2,vf,z1),P(cx+w/2,vf,z1),cop);L(P(cx+w/2,vf,Math.max(z0,heH)),P(cx+w/2,vf,z1),'#8d8a7c');}
    L(P(cx-w2/2+.02,vf,heH+2*st-1),P(cx+w2/2-.02,vf,heH+2*st-1),'#a49f8d');
    letters(cx-w2*.36,vf,w2*.72,heH+st+1.6,lc);letters(cx-w1*.38,vf,w1*.76,heH+1.8,lc);
    /* 兩扇信號紅摺疊門（上段玻璃格、門燈）。 */
    const rdoor=(x,w,hh)=>{faceV(x-.022,vf,w+.044,0,hh+1,'#d9d2bd');faceV(x,vf,w,.6,hh,'#b23b2f');
      for(let i=1;i<4;i++)L(P(x+w*i/4,vf,1),P(x+w*i/4,vf,hh-.4),'#7a2520');
      faceV(x+.012,vf,w-.024,hh*.60,hh*.84,'#a4c3c9');faceV(x+.02,vf,w-.04,hh*.62,hh*.82,'#fae1b1',ng);
      for(let i=1;i<4;i++)L(P(x+w*i/4,vf,hh*.60),P(x+w*i/4,vf,hh*.84),'#7a2520');
      light(x+w/2,vf,hh+2.3);};
    rdoor(u+du*.05,du*.28,dh);rdoor(u+du*.37,du*.28,dh);
    /* 水平鋼窗（Crittall 式，只留石窗台）。 */
    const crit=(x,w,z,hh,on)=>{faceV(x,vf,w,z,z+hh,'#3c4e55');faceV(x+.01,vf,w-.02,z+.5,z+hh-.4,glass);for(let a=x+.045;a<x+w-.02;a+=.05)L(P(a,vf,z),P(a,vf,z+hh),'#2f3d40');L(P(x,vf,z+hh*.62),P(x+w,vf,z+hh*.62),'#2f3d40');L(P(x-.015,vf,z-.6),P(x+w+.015,vf,z-.6),'#e2dccb');if(on)faceV(x+.015,vf,w-.03,z+.7,z+hh-.6,lit,ng);};
    const critU=(b,w,z,hh,on)=>{faceU(ue,b,w,z,z+hh,'#30424a');faceU(ue,b+.01,w-.02,z+.5,z+hh-.4,'#496b7c');for(let a=b+.045;a<b+w-.02;a+=.05)L(P(ue,a,z),P(ue,a,z+hh),'#26353a');L(P(ue,b-.015,z-.6),P(ue,b+w+.015,z-.6),'#c2c6b8');if(on)faceU(ue,b+.015,w-.03,z+.7,z+hh-.6,'#f0cf96',ng);};
    /* 辦公段正面：玻璃小門＋一樓窗＋二樓窗。 */
    const z2=dh+(N1?3.2:5.2),h2=heO-z2-(N1?3.6:4),od=ou+du*.03;
    faceV(od,vf,du*.08,0,8,'#d9d2bd');faceV(od+.012,vf,du*.08-.024,.5,7.4,'#34494f');faceV(od+.02,vf,du*.08-.04,4.5,7,'#f5dca8',ng);
    crit(ou+du*.145,du*.125,4,4.6,false);
    crit(ou+du*.03,du*.24,z2,h2,true);
    /* 側面：上下兩排水平窗。 */
    if(N1){critU(v+dv*.18,dv*.64,4,4.6,true);critU(v+dv*.18,dv*.64,z2,h2,false);}
    else{critU(v+dv*.12,dv*.32,4,4.6,false);critU(v+dv*.56,dv*.32,4,4.6,true);critU(v+dv*.12,dv*.32,z2,h2,true);critU(v+dv*.56,dv*.32,z2,h2,false);}
    /* 門前消防車（n=2）、燈柱、消防栓。 */
    if(!N1)truck(u+du*.08,vf+.10,n*.12,n*.20);
    post(n*.05,n*.93,9);hydrant(u+du*.93,vf+.14);
  }
};
