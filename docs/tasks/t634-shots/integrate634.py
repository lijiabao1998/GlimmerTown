"""Rebuild only the published T634 candidate block; retain all baseline code paths."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
p=ROOT/'index.html';s=p.read_text()
START='/* ===== T634 WHOLE BATCH BEGIN ===== */'
END='/* ===== T634 WHOLE BATCH END ===== */'
parts=[(ROOT/'docs/tasks/t634-shots'/name).read_text() for name in ['core634.js','civic634.js','industry634.js','rci634.js']]
block=START+'\n'+'\n'.join(parts)+'\nconst ART634={...CIVIC634,...INDUSTRY634,...RCI634};\n'+END+'\n'
if START in s:
 a=s.index(START);b=s.index(END,a)+len(END);s=s[:a]+block.rstrip()+s[b:]
else:
 anchor='/* =====================================================================\n   13. 啟動'
 assert s.count(anchor)==1;s=s.replace(anchor,block+'\n'+anchor)
 def rep(a,b):
  global s
  assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b)
 rep('function lotVariant574(k,v){','function lotVariant574(k,v){\n  if(t634On()&&REMAIN634.has(k))return ((v|0)%3+3)%3; // T634：本批三款，不改存檔')
 rep('function lotKey591(k){','function lotKey591(k){if(t634On()&&REMAIN634.has(k))return \'_t634_s\'+season();')
 rep('function lotV591(x,y,b){','function lotV591(x,y,b){if(t634On()&&b&&REMAIN634.has(b.k))return v634(b.k,x,y,b);')
 rep('function bakeLot574(k,v,stage,winter){','function bakeLot574(k,v,stage,winter){\n  if(t634On()&&REMAIN634.has(k)){const s634=bake634(k,v,LOT_PLAN574[k][1],1,1,stage,winter);if(s634){lotHookCache574.set(k+\'_\'+v+lotKey591(k),{ax:s634.ax,ay:s634.ay,hooks:s634.lotMeta574.hooks});return s634;}} // T634：保持原配方作逐位回退')
 rep("&&!(LOT603.has(k)&&t603On()))?0:lotVariant574(k,v);","&&!(LOT603.has(k)&&t603On())&&!(t634On()&&REMAIN634.has(k)))?0:lotVariant574(k,v);")
 rep('  if(!bd||bd.ref||(bd.sz&&bd.sz>=2))return null;','  if(!bd||bd.ref||(bd.sz&&bd.sz>=2))return null;\n  if(t634On()){const p634=spr634(bd,x,y,inWinter()&&rainDays>0);if(p634)return p634;} // T634：倒影同本體、同錨點')
 anchor='    if(bd.lot574)s=lotSprite574(bd.k,lotV591(o.x,o.y,bd),cropStage574,win&&snowLvl>0,lotFar574);'
 rep(anchor,'    if(!bd.lot574&&t634On()){const p634=spr634(bd,o.x,o.y,win&&snowLvl>0,cropStage574);if(p634)s=p634;} // T634：舊檔與住商工只換視覺，不改足跡\n'+anchor)
 anchor='      if(!offs||!offs.length)continue;'
 rep(anchor,"      if(t634On()&&!b.riot&&(b.k===1||b.k===3)&&offs){const p634=spr634(b,x,y,sea===3&&rainDays>0,2,false);if(p634){offs=p634.smoke;u596=true;}} // T634：只讀已烘的新煙口\n"+anchor)
 rep('LOT602.has(b.k)&&t602On()?lotV591(x,y,b):b.v','(LOT602.has(b.k)&&t602On())||(t634On()&&REMAIN634.has(b.k))?lotV591(x,y,b):b.v')
 old="  const s=lotHooks574(b.k,b.v),p=s.hooks[key],a=lotViewBase574(x,y,b.sz),v=w2v(x,y),z=cam.z;"
 new="  const b634=t634On()&&REMAIN634.has(b.k),s634=b634&&!b.lot574?spr634(b,x,y,inWinter()&&rainDays>0):null,s=s634?{ax:s634.ax,ay:s634.ay,hooks:s634.lotMeta574.hooks}:lotHooks574(b.k,b634?lotV591(x,y,b):b.v),p=s.hooks[key],a=lotViewBase574(x,y,b.sz||1),v=w2v(x,y),z=cam.z;"
 rep(old,new)
 rep("if(b.lot574){const p574=lotLightPoint574(x,y,b,k===76?'wheel':'aviation');sx=p574[0];sy=p574[1]+(k===76?28:58)*z2;}","if(b.lot574||(t634On()&&REMAIN634.has(k))){const p574=lotLightPoint574(x,y,b,k===76?'wheel':'aviation');sx=p574[0];sy=p574[1]+(k===76?28:k===69?40:58)*z2;}")
 rep('      const wh574=b.lot574?lotHooks574(k,b.v).hooks.wheel:null;',"      const b634=t634On()&&REMAIN634.has(k),s634=b634&&!b.lot574?spr634(b,x,y,inWinter()&&rainDays>0):null,wh574=s634?s634.lotMeta574.hooks.wheel:b.lot574?lotHooks574(k,b634?lotV591(x,y,b):b.v).hooks.wheel:null;")
 rep("    if(k===81&&!b.lot574&&t601On())continue;", "    if(t634On()&&REMAIN634.has(k))continue; // T634：新招牌夜圖自帶發光，不疊寫死位置\n    if(k===81&&!b.lot574&&t601On())continue;")
 rep("if(b.lot574){const p574=lotLightPoint574(x,y,b,'aviation');sx=p574[0];sy=p574[1]+30*z2;}","if(b.lot574||(t634On()&&REMAIN634.has(k))){const p574=lotLightPoint574(x,y,b,'aviation');sx=p574[0];sy=p574[1]+30*z2;}")
 # Body attached layers use the same candidate canvas points on old footprints.
 s=s.replace('bd.lot574?s.lotMeta574.hooks','(bd.lot574||s.__t634)?s.lotMeta574.hooks')
 rep('if(bd.k===2&&bd.pw&&!lodFar&&!window.__noNeon&&!constrRise){','if(bd.k===2&&bd.pw&&!lodFar&&!window.__noNeon&&!constrRise&&!s.__t634){')
 rep('}else if(bd.k===26){ // 風車葉片','}else if(bd.k===26&&!(s.__t634&&s.lotMeta574.hooks.rotorStatic)){ // 風車葉片')
 # New hook-aware farm ranges prevent legacy 1x1/2x2 actors wandering beyond actual footprint.
 rep('(bd.lot574?18:90)', '((bd.lot574||s.__t634)?18:90)')
p.write_text(s)
print('T634 block rebuilt:',len(block.splitlines()),'lines')
