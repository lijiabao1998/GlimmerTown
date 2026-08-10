import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t424_mut/base.html'
INDEX = 'index.html'

def mutate(kind):
    lines = io.open(BASE, encoding='utf-8').read().split('\n')
    idx = next(i for i, l in enumerate(lines) if l.startswith("  '6_1_0':{w:56"))
    l = lines[idx]
    if kind == 'M1':
        assert 'w:56,h:71' in l; l = l.replace('w:56,h:71', 'w:55,h:71', 1)
    elif kind == 'M2':
        assert 'ox:8,oy:37' in l; l = l.replace('ox:8,oy:37', 'ox:9,oy:37', 1)
    elif kind == 'M3':
        assert "'F':'#ff5a5a','I':'#ffd77a'}" in l
        l = l.replace("palN:{'F':'#ff5a5a','I':'#ffd77a'}", "palN:{'F':'#ff5a5a','I':'#ffd77a','Z':'#ffffff'}", 1)
    elif kind == 'M4':
        assert l.endswith(']},')
        l = l[:-3] + ",'....']},"
    elif kind == 'M5':
        assert "'..........................FFFF'" in l
        l = l.replace("'..........................FFFF'", "'..........................FF..'", 1)
    lines[idx] = l
    io.open(INDEX, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
    # 驗證突變寫入
    chk = io.open(INDEX, encoding='utf-8').read()
    assert 'w:55,h:71' in chk if kind=='M1' else True

for kind in ['M1','M2','M3','M4','M5']:
    mutate(kind)
    r = subprocess.run(['node', 'test_fixde.js'], capture_output=True, text=True,
                       encoding='utf-8', errors='replace', cwd='.')
    out = (r.stdout + '\n' + r.stderr)
    fails = [ln for ln in out.split('\n') if 'FAIL' in ln]
    first = fails[0].strip() if fails else ('(NO FAIL in stdout; exit=%d; stderr head: %s)' % (r.returncode, r.stderr[:100]))
    print('=== %s === exit=%d' % (kind, r.returncode))
    print('  ' + first[:260])
    io.open(INDEX, 'w', encoding='utf-8', newline='').write(io.open(BASE, encoding='utf-8').read())
print('restored OK')
