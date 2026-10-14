# T638 紅源：對提交 3f47c6d 的副本套一種改壞方式。用法：python mutate638.py <worktree> <M1..M9> [pins.json]
import io, sys, re
root, m = sys.argv[1], sys.argv[2]
ip, tp = root + '/index.html', root + '/test_fixde.js'
s = io.open(ip, encoding='utf-8', newline='').read()

def once(a, b):
    global s
    assert s.count(a) >= 1, (m, a[:60])
    i = s.index(a); s = s[:i] + b + s[i + len(a):]

if m == 'M1':
    i = s.index('function fire638K30(H,vi){'); j = s.index("'#", i)
    s = s[:j + 2] + ('0' if s[j + 2] != '0' else '1') + s[j + 3:]
elif m == 'M2':
    once('return !window.__noT638&&!t638On.off;}', 'return true;}')
elif m == 'M3':
    once('if(!vi)return null; // v0', 'if(vi<0)return null; // v0')
elif m == 'M4':
    once('function vi638(b,x,y){return Math.min(2,Math.floor(streetHash(x|0,y|0,638)*3));}', 'function vi638(b,x,y){return 1;}')
elif m == 'M5':
    once('  if(!t635On()||!t638On()||!b||b.ref||!fireKind635(b.k))return null;', '  if(!t638On()||!b||b.ref||!fireKind635(b.k))return null;')
elif m == 'M6':
    once('function fire638K6(H,vi){', "function fire638K6(H,vi){H.pixel635([0,H.ay-2],'#ff0000');")
    if len(sys.argv) > 3:  # 第二步：連簽名一起更新，逼 G6 自己出面
        t = io.open(tp, encoding='utf-8', newline='').read()
        new = io.open(sys.argv[3], encoding='utf-8').read().strip()
        t2 = re.sub(r'const PX638=\{[^\n]*\};', lambda _: 'const PX638=' + new + ';', t, count=1)
        assert t2 != t; io.open(tp, 'w', encoding='utf-8', newline='').write(t2)
elif m == 'M7':
    once("const edge='#303d40',stone='#d6cfb8'", "const edge='#303d41',stone='#d6cfb8'")
elif m == 'M8':
    i = s.index('    if(t638On()){const p638=spr638('); j = s.index('\n', i) + 1; s = s[:i] + s[j:]
elif m == 'M9':
    once('const s=bakeFire638(b.k,n,winter,vi),px=', 'const s=bakeFire638(b.k,n,winter,1),px=')
else:
    raise SystemExit('unknown ' + m)
io.open(ip, 'w', encoding='utf-8', newline='').write(s)
print('mutated', m)
