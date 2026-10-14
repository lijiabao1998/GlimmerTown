  // ===== T638 守衛：消防局 v1／v2（業主 2026-10-14「補變體」；真像素台架 px601，簽名＝挑款頁定稿） =====
  // 首紅對照：改新設計任一筆→G1；挑款恆為同一款→G2；v0 也走 T638 或 vi 沒傳進去→G3；拿掉逃生閥→G4；T635 關了 T638 還畫→G5；
  // 畫出地塊或夜燈漏到本體外→G6；改到 T635 區塊任一字、繪製處那一行不見或重複→G7。
  {
    const T8=window.__t638T,SZ638={6:[1,2],30:[1,3],61:[3,4]},sig638={};
    const pxSig638=s=>pxHash601(s.img)+'.'+pxHash601(s.night)+'.'+s.w+'x'+s.h;
    const BK638={};
    for(const k of [6,30,61])for(const n of SZ638[k])for(const vi of [1,2])for(const w of [false,true]){
      const key=k+'_'+n+'_'+vi+(w?'w':'d'),s=withPx601(()=>T8.bake(k,n,w,vi));BK638[key]=s;sig638[key]=pxSig638(s);}
    const PX638=__PX638__;
    const again638=pxSig638(withPx601(()=>T8.bake(30,3,false,2)));
    const bad638=Object.keys(sig638).filter(k=>sig638[k]!==PX638[k]);
    assert(bad638.length===0&&Object.keys(PX638).length===24&&again638===sig638['30_3_2d'],
      'T638 G1 六款新消防局像素簽名等於 2026-10-14 挑款頁定稿（24 張日夜；同一張烘兩次相同）：'+(bad638.length?bad638.join('、')+' '+JSON.stringify(sig638):'重烘不同'));

    const cnt638=[0,0,0];for(let y=0;y<72;y++)for(let x=0;x<72;x++)cnt638[T8.vi({k:6},x,y)]++;
    assert(cnt638.every(c=>c>=72*72*.25&&c<=72*72*.42),'T638 G2 挑款依根格雜湊、三款都會出現（72×72 格各佔 25–42%）：'+cnt638.join('/'));

    const at638=vi=>{for(let y=0;y<72;y++)for(let x=0;x<72;x++)if(T8.vi({k:30},x,y)===vi)return [x,y];return null;};
    const p0=at638(0),p1=at638(1),p2=at638(2),old635=window.__noT635;
    let r0,r1,r2,rEsc,rOff,rRef,r6;
    try{
      window.__noT635=false;T8.reset();
      r0=withPx601(()=>T8.spr({k:30,sz:3,v:0},false,p0[0],p0[1]));
      r1=withPx601(()=>T8.spr({k:30,sz:3,v:0},false,p1[0],p1[1]));
      r2=withPx601(()=>T8.spr({k:61,sz:4,v:0},true,p2[0],p2[1]));
      r6=withPx601(()=>T8.spr({k:6,sz:2,v:4},false,p1[0],p1[1]));
      rRef=withPx601(()=>T8.spr({k:30,ref:[p1[0],p1[1]]},false,p1[0],p1[1]));
      window.__noT638=true;rEsc=withPx601(()=>T8.spr({k:30,sz:3,v:0},false,p1[0],p1[1]));delete window.__noT638;
      window.__noT635=true;T8.reset();rOff=withPx601(()=>T8.spr({k:30,sz:3,v:0},false,p1[0],p1[1]));
    }finally{window.__noT635=old635;delete window.__noT638;T8.reset();}
    assert(r0===null&&r1&&r1.lotMeta574.variant===1&&r1.__t638===1&&pxSig638(r1)===PX638['30_3_1d']&&r2&&r2.lotMeta574.variant===2&&pxSig638(r2)===PX638['61_4_2w']
      &&r6&&pxSig638(r6)===PX638['6_2_1d']&&rRef===null,
      'T638 G3 選到 v0 回 null（畫面＝T635 原圖），v1／v2 回對應變體且與定稿相同；附屬格不畫：'+[r0===null,!!r1,!!r2,!!r6,rRef===null].join('/'));

    const line638=html.split('\n').filter(l=>l.startsWith('function t638On(){'));
    const vmOn638=(q,win)=>require('vm').runInNewContext(line638[0]+';t638On()',{window:win||{},location:{search:q}});
    assert(line638.length===1&&vmOn638('')===true&&vmOn638('?noT638=1')===false&&vmOn638('?a=1&noT638')===false&&vmOn638('',{__noT638:true})===false&&rEsc===null,
      'T638 G4 逃生閥：?noT638=1／window.__noT638=true 都退回每類一款，預設開');
    assert(rOff===null,'T638 G5 T635 關掉時 T638 也不畫（不會在舊圖上冒出新款）');

    let out638=[],night638=[];
    for(const [key,s] of Object.entries(BK638)){
      // 地塊菱形（像素單位、固定 2px 邊距，角尖也有）：左右不超過中心 ±(32n+2)；中心以下 |dx|/2+dy ≤ 16n+2。往上長的建築不算出界。
      const n=+key.split('_')[1],D=PXW(s.img),Nn=PXW(s.night),cx=s.ax,cy=s.ay-16*n;let o=0,nl=0;
      for(let y=0;y<D.H;y++)for(let x=0;x<D.W;x++){const i=(y*D.W+x)*4,dx=Math.abs(x+.5-cx),dy=y+.5-cy;
        if(D.buf[i+3]>0&&(dx>32*n+2||(dy>0&&dx/2+dy>16*n+2)))o++;if(Nn.buf[i+3]>0&&D.buf[i+3]===0)nl++;}
      if(o)out638.push(key+':'+o);if(nl)night638.push(key+':'+nl);}
    assert(out638.length===0&&night638.length===0,'T638 G6 不畫出地塊（菱形兩側與下緣外零像素）、夜燈只在本體上：'+out638.concat(night638).join('、'));

    const fnv638=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(16);};
    const b635=html.indexOf('/* ===== T635 FIRE CANDIDATE BEGIN ====='),e635=html.indexOf('/* ===== T635 FIRE CANDIDATE END ===== */');
    const call638=html.split('\n').filter(l=>l.includes('if(t638On()){const p638=spr638(bd,win&&snowLvl>0,o.x,o.y);if(p638)s=p638;}'));
    const call635=html.split('\n').filter(l=>l.includes('if(t635On()){const p635=spr635(bd,win&&snowLvl>0);if(p635)s=p635;}'));
    const k635=html.split('\n').findIndex(l=>l===call635[0]);
    assert(b635>0&&e635>b635&&fnv638(html.slice(b635,e635))==='__FNV635__'&&call638.length===1&&call635.length===1&&html.split('\n')[k635+1]===call638[0],
      'T638 G7 T635 區塊逐字未動（批准款原封）、繪製處 T638 一行緊接在 T635 那一行之後且只有一行');
  }
