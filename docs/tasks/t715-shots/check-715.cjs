/* T715 守衛（逐格迴圈只掃看得到的範圍）。
   G1 範圍保守——取 index.html 實際的 visRange715／w2v／v2w／viewRotEff／lotViewBase574／lotVisible574 原文與 OBJPAD715，
      隨機鏡頭（地圖 72～432、縮放 0.3～4、四個視角、各種畫布尺寸與鏡頭位置），每次暴力掃全圖：
      a. 一般格：vis(sx,sy) 為真（sx/sy 公式照 draw()）→ 必須在一般範圍裡；
      b. 物件層：一般格的 vis、園區（1×1～9×9，lotVisible574 原文）、兩種高塔（下緣多 440／200 像素）任何一種為真 → 必須在物件層範圍裡。
   G2 五段迴圈都改掃範圍，而且原本的可見判斷都還在。
   G3 園區最大 9×9（LOT_PLAN574）：有人加更大的園區，這條會紅，提醒要放大 OBJPAD715。
   G4 ?noT715=1 關、?noT715=0 不誤關；閥關時範圍是整張地圖。
   負控制：算範圍時忘了外擴邊界 pad → G1 必須抓到漏格；物件層忘了加 OBJPAD715 → G1 必須抓到漏格。
   只驗純函式與原文，不是像素驗收（像素逐位相同另以真 Chromium 實拍，見 README）。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../../..');
const HEAD=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function fn(src,name){const a=src.indexOf('\nfunction '+name+'(');if(a<0)return null;let d=0,i=src.indexOf('{',a);for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'&&--d===0)break;}return src.slice(a+1,i+1);}
function rangeCheck(src,trials){
  const objPad=+((src.match(/\nconst OBJPAD715=(\d+);/)||[])[1]);assert(objPad>0,'OBJPAD715 存在');
  const objExpr=(src.match(/const \[ox0715,ox1715,oy0715,oy1715\]=on715\?visRange715\(ox,oy,z,W,H,([^)]*)\):\[0,N-1,0,N-1\];/)||[])[1];
  assert(objExpr,'物件層範圍的呼叫在');
  const C={window:{},Math};vm.createContext(C);
  vm.runInContext('let N=72,viewRot=0;const OBJPAD715='+objPad+';'+['viewRotEff','w2v','v2w','visRange715','lotViewBase574','lotVisible574'].map(n=>fn(src,n)).join('\n')
    +';this.setN=n=>{N=n};this.setRot=r=>{viewRot=r};this.objRange=(ox,oy,z,W,H,pad)=>visRange715(ox,oy,z,W,H,'+objExpr+');',C);
  let seed=715;const R=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
  let checked=0,checkedObj=0,scanned=0,needed=0;
  for(let k=0;k<trials;k++){
    const N=[72,108,144,216,432][k%5],rot=(k>>2)&3,z=[.3,.5,.6,.7,1,1.5,2,3,4][k%9],W=[390,1280,1920,844][k%4],H=[844,800,1080,390][(k>>1)%4];
    C.setN(N);C.setRot(rot);
    const span=N*32*z;const ox=Math.round(W/2+(R()*2-1)*span),oy=Math.round(H/2-(R()*1.2-.1)*span);
    const pad=160*z;const [x0,x1,y0,y1]=C.visRange715(ox,oy,z,W,H,pad),[X0,X1,Y0,Y1]=C.objRange(ox,oy,z,W,H,pad);
    let bx0=1e9,bx1=-1,by0=1e9,by1=-1;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const p=C.w2v(x,y),sx=ox+((p[0]-p[1])*32-32)*z,sy=oy+((p[0]+p[1])*16)*z;
      const v=sx>-pad&&sx<W+pad&&sy>-pad&&sy<H+pad;
      if(v){checked++;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;
        if(x<x0||x>x1||y<y0||y>y1)throw new Error('G1 一般格 vis() 為真卻落在範圍外：N='+N+' rot='+rot+' z='+z+' W='+W+' H='+H+' ('+x+','+y+') 範圍 ['+x0+','+x1+']×['+y0+','+y1+']');}
      let o=v||(sx>-pad&&sx<W+pad&&sy>-pad&&sy<H+pad+440*z)||(sx>-pad&&sx<W+pad&&sy>-pad&&sy<H+pad+200*z);
      for(let sz=1;sz<=9&&!o;sz++)if(x+sz<=N&&y+sz<=N&&C.lotVisible574(x,y,sz,ox,oy,z,W,H))o=true;
      if(o){checkedObj++;if(x<X0||x>X1||y<Y0||y>Y1)throw new Error('G1 物件層看得到的格子落在範圍外：N='+N+' rot='+rot+' z='+z+' W='+W+' H='+H+' ('+x+','+y+') 範圍 ['+X0+','+X1+']×['+Y0+','+Y1+']');}
    }
    if(x1>=x0&&y1>=y0)scanned+=(x1-x0+1)*(y1-y0+1);if(bx1>=bx0)needed+=(bx1-bx0+1)*(by1-by0+1);
  }
  return {trials,visibleTilesChecked:checked,objectTilesChecked:checkedObj,overScanRatio:+(scanned/Math.max(1,needed)).toFixed(3)};
}
const out={};
out.G1=rangeCheck(HEAD,120);
{
  const loops=[...HEAD.matchAll(/for\(let y=vy0715;y<=vy1715;y\+\+\)for\(let x=vx0715;x<=vx1715;x\+\+\)\{ \/\/ T715：只掃可見範圍，每格照舊過 vis\(\)\n([\s\S]{0,400}?)if\(!vis\(sx,sy\)\)continue;/g)];
  assert.equal(loops.length,4,'G2 四段逐格迴圈改掃可見範圍、每段都照舊過 vis()（找到 '+loops.length+' 段）');
  const objLoop=HEAD.match(/for\(let y=oy0715;y<=oy1715;y\+\+\)for\(let x=ox0715;x<=ox1715;x\+\+\)\{[^\n]*\n([\s\S]{0,1600}?)else if\(!vis\(sx,sy\)\)continue;/);
  assert(objLoop&&objLoop[1].includes('lotVisible574(x,y,t.bld.sz,ox,oy,z,W,H)')&&objLoop[1].includes('sy<H+pad+440*z')&&objLoop[1].includes('sy<H+pad+200*z'),'G2 物件層改掃範圍、園區與高塔的可見判斷都還在');
  assert(HEAD.includes('const [vx0715,vx1715,vy0715,vy1715]=on715?visRange715(ox,oy,z,W,H,pad):[0,N-1,0,N-1];')&&HEAD.includes('const [ox0715,ox1715,oy0715,oy1715]=on715?visRange715(ox,oy,z,W,H,pad+OBJPAD715*z):[0,N-1,0,N-1];'),'G4 閥關時範圍是整張地圖');
  out.G2={loops:loops.length+1};
}
{ // G3：園區最大 9×9
  const a=HEAD.indexOf('const LOT_PLAN574=['),b=HEAD.indexOf('];',a);const sizes=[...HEAD.slice(a,b).matchAll(/\['[A-Za-z0-9]+',(\d+)\]/g)].map(m=>+m[1]);
  assert(sizes.length>50,'G3 讀到 LOT_PLAN574（'+sizes.length+' 筆）');assert(Math.max(...sizes)<=9,'G3 園區最大 '+Math.max(...sizes)+'×'+Math.max(...sizes)+'，超過 9 要放大 OBJPAD715');
  out.G3={lots:sizes.length,maxLot:Math.max(...sizes)};
}
{const C={window:{},location:{search:'?noT715=1'}};vm.createContext(C);vm.runInContext(fn(HEAD,'t715On'),C);assert.equal(C.t715On(),false,'G4 ?noT715=1 關閉');
 const D={window:{},location:{search:'?noT715=0'}};vm.createContext(D);vm.runInContext(fn(HEAD,'t715On'),D);assert.equal(D.t715On(),true,'G4 ?noT715=0 不誤關');}
const report={passed:true,limit:'Pure-function and source checks; pixel identity is shown separately in real Chromium (README).',result:out,negativeControls:[]};
for(const [id,mutate,expect] of [
  ['range-ignores-pad',t=>t.replace('  const u0=(-pad-ox)/(32*z)+1,','  pad=0;const u0=(-pad-ox)/(32*z)+1,'),'G1 '],
  ['objects-without-objpad',t=>t.replace('visRange715(ox,oy,z,W,H,pad+OBJPAD715*z)','visRange715(ox,oy,z,W,H,pad)'),'G1 物件層'],
]){
  const t=mutate(HEAD);assert.notEqual(t,HEAD,id+': mutation applied');
  let reason='';try{rangeCheck(t,120);}catch(e){reason=e.message;}
  assert(reason.startsWith(expect),id+': must fail first at '+expect+', got: '+reason);
  report.negativeControls.push({mutation:id,reason:reason.split('\n')[0].slice(0,160)});
}
console.log(JSON.stringify(report,null,2));
