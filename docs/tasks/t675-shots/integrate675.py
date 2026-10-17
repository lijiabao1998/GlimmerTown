"""Strict-anchor T675 art integration. Existing tests and workflows are never edited."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[3]
p=ROOT/'index.html'
s=p.read_text()
assert 'function spr675(' not in s,'T675 already integrated'
def once(old,new):
    global s
    assert s.count(old)==1,(old[:100],s.count(old))
    s=s.replace(old,new,1)
def after_line(needle,new):
    lines=[l for l in s.splitlines() if needle in l]
    assert len(lines)==1,(needle,len(lines))
    once(lines[0],lines[0]+'\n'+new)
code=(Path(__file__).with_name('selector675.js').read_text()+'\n'+Path(__file__).with_name('art675.js').read_text())
once('/* T671 END：獨立美術家族。 */','/* T671 END：獨立美術家族。 */\n\n'+code)
after_line('if(t671On()){const p671=spr671(bd,x,y',"  if(t675On()){const p675=spr675(bd,x,y,inWinter()&&rainDays>0);if(p675)return p675;} // T675：同款工坊倒影")
after_line('if(t671On()){const p671=spr671(bd,o.x,o.y',"    if(t675On()){const p675=spr675(bd,o.x,o.y,win&&snowLvl>0);if(p675)s=p675;} // T675：十款工坊，未選中保留舊款")
after_line('let ownSmoke671=false;',"      let ownSmoke675=false;if(t675On()&&b.k===3&&b.pw&&!b.riot){const p675=spr675(b,x,y,sea===3&&rainDays>0);if(p675){offs=b.age>=9?p675.smoke:[];u596=true;ownSmoke675=true;}} // T675：只換既有工業煙採樣的實際出口；穀倉清空舊煙口")
after_line('if(ownSmoke671)smokes[smokes.length-1]',"      if(ownSmoke675)smokes[smokes.length-1].__t675=true; // T675：只標本波煙粒")
after_line('if(s.__t671&&!t671On())',"    if(s.__t675&&!t675On()){smokes.splice(i,1);continue;} // T675：關閥即清本波粒子")
once('if(!s.__t671||t671On())objs.push','if(!s.__t671||t671On())if(!s.__t675||t675On())objs.push')
# The seven original T596 conditions stay intact, with this new family appended.
assert s.count('!s.__t596&&!s.__t670&&!s.__t671')==7
s=s.replace('!s.__t596&&!s.__t670&&!s.__t671','!s.__t596&&!s.__t670&&!s.__t671&&!s.__t675')
# Existing per-sprite additions assume the old facade geometry. Suppress only on T675.
for line in ['if(!s.__t590)drawDistrictTexture424(ctx,o,bd,s,bx,by,z,drawA);','if(!s.__t590)drawFacadeMemory426(ctx,o,bd,s,bx,by,z,drawA); // T429']:
    once('      '+line,'      if(!s.__t675){\n        '+line+'\n      }')
assert s.count('      if(!s.__t671){')==5
s=s.replace('      if(!s.__t671){','      if(!s.__t675){\n      if(!s.__t671){')
for line in ['drawLivedIn421(ctx,o,bd,s,bx,by,z,drawA);','drawRooftop425(ctx,o,bd,s,bx,by,z,drawA); // T429','drawMaterialResponse430(ctx,o,bd,s,bx,by,z,drawA,wetLvl,snowLvl,nightDepth); // T429','drawNightIdentity423(ctx,o,bd,s,bx,by,z,drawA,nightDepth);','drawNightMicro431(ctx,o,bd,s,bx,by,z,drawA,nightDepth); // T429']:
    once('        if(!s.__t590)'+line+'\n      }','        if(!s.__t590)'+line+'\n      }\n      }')
after_line("emit('art671',[v,win,sea]", "      for(let v=0;v<10;v++)for(const [win,sea] of[[0,0],[0,1],[0,2],[0,3],[1,3]])emit('art675',[v,win,sea].join('_'),bake675(v,!!win,sea));")
# No broad ground-light guard is changed here; real in-game evidence must establish any model-specific issue.
p.write_text(s)
p=ROOT/'docs/APPROVED_ART.json';data=json.loads(p.read_text());assert 'T675' not in data['valves'];data['valves']['T675']='__noT675';p.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n')
print('T675 runtime integration prepared; original tests/workflows untouched. Run original bump/arch tools separately.')
