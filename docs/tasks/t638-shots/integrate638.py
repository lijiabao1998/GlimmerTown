# T638 整合：把三個設計檔接進 index.html 的獨立 T638 區塊；T635 區塊一個位元組都不動。
# 用法：python integrate638.py <repoDir> <designDir>
import io, sys, re
root, design = sys.argv[1], sys.argv[2]
p = root + '/index.html'
src = io.open(p, encoding='utf-8', newline='').read()

B635 = '/* ===== T635 FIRE CANDIDATE BEGIN ====='
E635 = '/* ===== T635 FIRE CANDIDATE END ===== */\n'
assert src.count(B635) == 1 and src.count(E635) == 1
a, e = src.index(B635), src.index(E635) + len(E635)
block635 = src[a:e]
assert 'T638' not in src, 'already integrated'

# 1. bakeFire635 → bakeFire638：前置畫筆與收尾逐字複製，只換分支與 meta
fa = block635.index('function bakeFire635(k,n,winter=false){')
fe = block635.index('/* ===== T635 FIRE CANDIDATE END')
fn = block635[fa:fe]
assert fn.count('function bakeFire635(k,n,winter=false){') == 1
fn = fn.replace('function bakeFire635(k,n,winter=false){', 'function bakeFire638(k,n,winter=false,vi=1){', 1)
b0 = '  if(k===6){\n'
b1 = '  /* 夜燈先按本體 alpha 裁切'
assert fn.count(b0) == 1 and fn.count(b1) == 1 and fn.index(b0) < fn.index(b1)
H = ('  const H638={P,Q,F,L,E,pixel635,faceV,faceU,box,course,windowV,windowU,light,pitched,door,arch,pave,tree,truck,pal,'
     'edge,stone,glass,lit,slate,slateD,occlude635,n,winter,k,w,h,ax,ay,top,g,ng};\n'
     '  (k===6?fire638K6:k===30?fire638K30:fire638K61)(H638,vi); // T638：只換三類的畫法；前後畫筆、地塊、夜燈裁切、裁頂與 bakeFire635 逐字相同\n')
fn = fn[:fn.index(b0)] + H + fn[fn.index(b1):]
m0 = 'lotMeta574:{sz:n,kind:k,variant:0,'
assert fn.count(m0) == 1 and fn.count('__t635:1,') == 1
fn = fn.replace(m0, 'lotMeta574:{sz:n,kind:k,variant:vi,', 1).replace('__t635:1,', '__t635:1,__t638:1,', 1)
fn = fn.rstrip('\n') + '\n'

# 2. 設計檔 → 區塊內具名函式
def named(k):
    s = io.open('%s/k%d/fire638_k%d.js' % (design, k, k), encoding='utf-8', newline='').read().replace('\r\n', '\n')
    head = 'window.fire638_k%d=function(H,vi){' % k
    assert s.count(head) == 1 and s.count('window.') == 1, k
    s = s.replace(head, 'function fire638K%d(H,vi){' % k, 1)
    s = s.rstrip()
    assert s.endswith('};'), k
    s = s[:-2] + '}'
    for bad in ('Math.random', 'Date', 'performance', 'localStorage', 'document', 'GV.', 'tiles'):
        assert bad not in s, (k, bad)
    return s + '\n'

block638 = (
    '/* ===== T638 FIRE VARIANTS BEGIN =====\n'
    '   業主 2026-10-14「補變體」：k6／k30／k61 各補 v1、v2（結構不同的英式設計）；v0＝T635 批准款，走 T635 原路、不經這裡。\n'
    '   挑款依建築根格 streetHash(x,y,638)，跟其他園區新圖一樣不寫存檔、零亂數；?noT638=1 或 window.__noT638=true 退回每類一款。\n'
    '   T635 區塊一個位元組都不動：bakeFire638 的前置畫筆與收尾由 bakeFire635 逐字複製。 */\n'
    "function t638On(){if(t638On.off===undefined){const q=(typeof location!=='undefined'&&location.search)||'';t638On.off=/(?:^|[?&])noT638(?:=1)?(?:&|$)/.test(q);}return !window.__noT638&&!t638On.off;}\n"
    'function vi638(b,x,y){return Math.min(2,Math.floor(streetHash(x|0,y|0,638)*3));}\n'
    'function spr638(b,winter,x,y){\n'
    '  if(!t635On()||!t638On()||!b||b.ref||!fireKind635(b.k))return null;\n'
    '  const vi=vi638(b,x,y);if(!vi)return null; // v0：回 null，畫面就是 T635 原圖\n'
    "  const n=Math.max(1,Math.min(4,b.sz||1)),key=b.k+'_'+n+'_'+(+winter)+'_'+vi,C=spr638.cache||(spr638.cache=new Map());\n"
    '  if(C.has(key)){const s=C.get(key);C.delete(key);C.set(key,s);return s;}\n'
    '  const s=bakeFire638(b.k,n,winter,vi),px=s.w*s.h*2;\n'
    '  let total=spr638.pixels||0;while(C.size&&(C.size>=24||total+px>2400000)){const first=C.keys().next().value,old=C.get(first);total-=old.w*old.h*2;C.delete(first);}\n'
    '  C.set(key,s);spr638.pixels=total+px;return s;\n'
    '}\n'
    + fn + named(6) + named(30) + named(61) +
    '/* ===== T638 FIRE VARIANTS END ===== */\n'
)
src = src[:e] + block638 + src[e:]

# 3. 繪製處：T635 那一行之後加一行
call635 = '    if(t635On()){const p635=spr635(bd,win&&snowLvl>0);if(p635)s=p635;}'
assert src.count(call635) == 1
i = src.index(call635); j = src.index('\n', i) + 1
src = src[:j] + '    if(t638On()){const p638=spr638(bd,win&&snowLvl>0,o.x,o.y);if(p638)s=p638;} // T638：消防局 v1／v2 依根格雜湊選款，v0 回 null 保留 T635 原圖；?noT638=1 退回\n' + src[j:]

io.open(p, 'w', encoding='utf-8', newline='').write(src)
assert io.open(p, encoding='utf-8', newline='').read().count(block635) == 1
print('integrated; T638 block lines:', block638.count('\n'))
