# T424 五案紅源：逐案突變 index.html → node test_fixde.js → 首行 FAIL
import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t424_mut/base.html'
INDEX = 'index.html'

def mutate(kind):
    lines = io.open(BASE, encoding='utf-8').read().split('\n')
    # 找 6_1_0 行（嵌入後）
    for i, l in enumerate(lines):
        if l.startswith("  '6_1_0':{w:56"):
            idx = i; break
    l = lines[idx]
    if kind == 'M1':       # w-1
        l = l.replace('w:56,h:71', 'w:55,h:71', 1)
    elif kind == 'M2':     # ox+1
        l = l.replace('ox:8,oy:37', 'ox:9,oy:37', 1)
    elif kind == 'M3':     # palN 加 pal 外鍵
        l = l.replace("palN:{'F':'#ff5a5a','I':'#ffd77a'}", "palN:{'F':'#ff5a5a','I':'#ffd77a','Z':'#ffffff'}", 1)
    elif kind == 'M4':     # rows 加一行超界
        assert l.endswith(']},')
        l = l[:-3] + ",'....']},"  # 71→72 行 > h=71
    elif kind == 'M5':     # 一字符改 '.'
        l = l.replace("'..........................FFFF'", "'..........................FF..'", 1)
    else:
        raise ValueError(kind)
    lines[idx] = l
    io.open(INDEX, 'w', encoding='utf-8', newline='').write('\n'.join(lines))

for kind in ['M1','M2','M3','M4','M5']:
    mutate(kind)
    r = subprocess.run(['node','test_fixde.js'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout
    # 首行 FAIL
    fails = [ln for ln in out.split('\n') if ln.startswith('FAIL')]
    first = fails[0] if fails else '(NO FAIL — exit=%d)' % r.returncode
    print('=== %s ===' % kind)
    print('  exit=%d  first FAIL: %s' % (r.returncode, first[:220]))
    # 還原
    io.open(INDEX, 'w', encoding='utf-8', newline='').write(io.open(BASE, encoding='utf-8').read())
print('restored')
