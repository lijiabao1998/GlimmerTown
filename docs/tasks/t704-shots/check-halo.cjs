/* T704：T149 地面光暈迴圈不得因缺座標的 rdecGlow 條目丟錯（曾讓有鐵路線尾的夜景整片白）。
   從 index.html 取出實際的迴圈原文，在 vm 裡用「遇到非有限數就丟錯」的 createRadialGradient 替身重放（同 Chromium 行為）。
   只驗迴圈本身與條目格式，不是像素驗收；真 Chromium 前後對照見本卡 shots/README。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const SRC=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');

function loopOf(text){ // T149 段：從 if(nightDepth>0&&rdecGlow.length){ 到配對的右大括號
  const head=text.indexOf('/* ===== T149 路燈／裝飾光源地面光暈');assert(head>=0,'source: T149 header');
  const start=text.indexOf('if(nightDepth>0&&rdecGlow.length){',head);assert(start>head,'source: T149 loop');
  let d=0;for(let i=start;i<text.length;i++){if(text[i]==='{')d++;else if(text[i]==='}'&&--d===0)return text.slice(start,i+1);}
  throw new Error('source: unbalanced T149 loop');
}
function bufferPush(text){ // T582 車擋條目：取原始碼裡實際推入的物件字面（不抄寫）
  const m=text.match(/rdecGlow\.push\((\{rect:\[sx\+30\*z,sy\+11\*z,4\*z,3\*z\][^)]*\})\);/);assert(m,'source: T582 buffer-stop rdecGlow push');return m[1];
}
function replay(text){
  const calls={save:0,restore:0,grad:0,fill:0},ctx={
    globalCompositeOperation:'source-over',fillStyle:'',
    save(){calls.save++;},restore(){calls.restore++;this.globalCompositeOperation='source-over';},
    createRadialGradient(...a){if(!a.every(Number.isFinite))throw new TypeError('non-finite createRadialGradient arguments');calls.grad++;return{addColorStop(){}};},
    beginPath(){},arc(){},fill(){calls.fill++;}
  };
  const C={ctx,nightDepth:.8,z:2,Math,calls};
  vm.createContext(C);
  const buffer=vm.runInContext('(function(sx,sy,z){return '+bufferPush(text)+';})(100,60,2)',C);
  C.rdecGlow=[buffer,{img:{},x:10,y:20,w:8,h:6},{img:{},w:8,h:6,col:'#ff0000'}]; // 車擋 rect、正常路燈、故意缺 x/y 的條目
  let err=null;try{vm.runInContext(loopOf(text),C);}catch(e){err=e;}
  return{err,calls,gco:ctx.globalCompositeOperation,buffer};
}
function run(text){
  const r=replay(text);
  assert.equal(r.err,null,'G1 光暈迴圈遇到缺座標條目不丟錯：'+(r.err&&r.err.message));
  assert.equal(r.calls.save,r.calls.restore,'G2 save／restore 成對');
  assert.equal(r.gco,'source-over','G2 迴圈結束後合成模式回到 source-over');
  assert.equal(r.calls.grad,1,'G3 正常路燈條目照畫一圈光暈，車擋與缺座標條目不畫');
  const pushes=text.match(/rdecGlow\.push\(\{rect:[^)]*\)/g)||[];
  assert(pushes.length>=1&&pushes.every(p=>/noHalo:1/.test(p)),'G4 每一個 rdecGlow 的 rect 條目都帶 noHalo:1');
  return{calls:r.calls,bufferEntry:r.buffer,rectPushes:pushes.length};
}
const report={passed:true,limit:'Actual T149 loop and T582 push source replayed in vm with a throwing createRadialGradient stub; loop behaviour only.',result:run(SRC),negativeControls:[]};
for(const [id,mutate,expect] of [
  ['finite-guard-removed',t=>t.replace(/\n {6}if\(!Number\.isFinite\(gx\)\|\|!Number\.isFinite\(gy\)\)continue;[^\n]*/,''),'G1 '],
  ['noHalo-removed',t=>t.replace("col:'#ff6a5a',noHalo:1}","col:'#ff6a5a'}"),'G4 '],
  ['both-removed-equals-main',t=>t.replace(/\n {6}if\(!Number\.isFinite\(gx\)\|\|!Number\.isFinite\(gy\)\)continue;[^\n]*/,'').replace("col:'#ff6a5a',noHalo:1}","col:'#ff6a5a'}"),'G1 '],
]){
  const t=mutate(SRC);assert.notEqual(t,SRC,id+': mutation applied');
  let reason='';try{run(t);}catch(e){reason=e.message;}
  assert(reason.startsWith(expect),id+': must fail first at '+expect.trim()+', got: '+reason.split('\n')[0]);
  report.negativeControls.push({mutation:id,reason:reason.split('\n')[0]});
}
console.log(JSON.stringify(report,null,2));
