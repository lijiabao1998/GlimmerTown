/* T659：第一波英式商店（__t670）不吃舊 T427 建築疊層。
   從 index.html 取出主繪圖裡實際的疊層呼叫段與 t659On 原文（不抄寫），在 vm 裡用記錄呼叫的替身函式重放。
   期望值的獨立來源：同一段原始碼拿掉 T659 外層兩行＝改前（main）的路由。只驗呼叫路由，不是像素驗收；
   像素前後對照見本卡 shots/README。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
const LEGACY=['drawDistrictTexture424','drawFacadeMemory426','drawLivedIn421','drawRooftop425','drawMaterialResponse430','drawNightIdentity423','drawNightMicro431'];
const LATER=['drawActivityPocket422','drawMicroLife429','drawPartyWall565','drawCorner571','drawLotFence565'];
const OPEN_MARK='{ // T659：',CLOSE='      } // T659 END';

function block(text){ // T427 建築層：從標頭註解後的 if(!constrRise&&(bd.age|0)>=9){ 到配對的右大括號
  const head=text.indexOf('/* ===== T427 GPT 美術波（建築層四層');assert(head>=0,'source: T427 building-layer header');
  const start=text.indexOf('if(!constrRise&&(bd.age|0)>=9){',head);assert(start>head,'source: T427 building-layer block');
  let depth=0;for(let i=start;i<text.length;i++){const c=text[i];if(c==='{')depth++;else if(c==='}'&&--depth===0)return text.slice(start,i+1);}
  throw new Error('source: unbalanced T427 block');
}
function valveFn(text){const line=text.split('\n').find(l=>l.startsWith('function t659On(){'));assert(line,'source: function t659On');return line;}
function unwrap(b){ // 改前路由：拿掉 T659 外層的開頭一行與結尾一行，其餘逐字不動
  const lines=b.split('\n'),i=lines.findIndex(l=>l.startsWith('      if(')&&l.includes(OPEN_MARK)),j=lines.findIndex(l=>l===CLOSE);
  assert(i>0&&j>i,'source: T659 wrapper lines present');lines.splice(j,1);lines.splice(i,1);return lines.join('\n');
}
function replay(code,fn,sprite,{search='',flag=false}={}){
  const calls=[],C={window:{__noT659:flag},location:{search},calls};
  for(const n of [...LEGACY,...LATER])C[n]=()=>{calls.push(n);return 1;};
  Object.assign(C,{constrRise:false,bd:{k:2,lv:1,age:60},s:{...sprite},o:{x:30,y:20},ctx:{},bx:0,by:0,z:3,drawA:1,wetLvl:.5,snowLvl:.5,nightDepth:.5});
  vm.createContext(C);vm.runInContext(fn+'\n'+code,C);return calls;
}
function run(text){
  const b=block(text),fn=valveFn(text),cases=[];
  // G1：第一波精靈、閥開 → 七個舊疊層一個都不畫
  const on=replay(b,fn,{__t670:1});
  assert.deepEqual(on.filter(n=>LEGACY.includes(n)),[],'G1 T670 精靈不吃舊 T427 疊層');cases.push({id:'t670-valve-open',calls:on});
  const before=unwrap(b);
  // G2／G3：兩個閥各自關得掉，關閥＝改前路由（七個全畫）
  const ref670=replay(before,fn,{__t670:1});assert.deepEqual(ref670.filter(n=>LEGACY.includes(n)),LEGACY,'G0 改前路由：T670 精靈吃七個舊疊層');
  assert.deepEqual(replay(b,fn,{__t670:1},{flag:true}),ref670,'G2 window.__noT659 退回改前路由');
  assert.deepEqual(replay(b,fn,{__t670:1},{search:'?noT659=1'}),ref670,'G3 ?noT659=1 退回改前路由');
  assert.deepEqual(replay(b,fn,{__t670:1},{search:'?noT659=0'}),on,'G3b ?noT659=0 不誤關');
  cases.push({id:'t670-valve-closed',calls:ref670});
  // G4：其他建築路由逐一不變（舊商店、第二波、第三波、T590、T596 預覽）
  for(const m of [{},{__t671:1},{__t675:1},{__t590:1},{__t596:1}]){
    const now=replay(b,fn,m),ref=replay(before,fn,m);
    assert.deepEqual(now,ref,'G4 非第一波路由不變 '+JSON.stringify(m));cases.push({id:'other-'+(Object.keys(m)[0]||'legacy'),calls:now});
  }
  return cases;
}
const report={passed:true,limit:'Actual index.html draw-call block and t659On source replayed in vm with recording stubs; routing only, not pixel acceptance.',cases:run(src),negativeControls:[]};
for(const [id,mutate] of [
  ['wrapper-always-true',t=>t.replace('if(!s.__t670||!t659On()){ // T659','if(true){ // T659')],
  ['valve-always-off',t=>t.replace(/^function t659On\(\)\{.*$/m,'function t659On(){return false;}')]
]){
  const t=mutate(src);assert.notEqual(t,src,id+': mutation applied');
  let reason='';try{run(t);}catch(e){reason=e.message;}
  assert(reason.includes('G1 T670 精靈不吃舊 T427 疊層'),id+': mutation must fail first at G1, got: '+reason.split('\n')[0]);
  report.negativeControls.push({mutation:id,reason:reason.split('\n')[0]});
}
console.log(JSON.stringify(report,null,2));
