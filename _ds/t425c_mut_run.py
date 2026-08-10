import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425c_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 廣場色改回舊灰白
        assert "dia(g,ax,ay-128,128,'#a89e8e')" in s
        s = s.replace("dia(g,ax,ay-128,128,'#a89e8e')", "dia(g,ax,ay-128,128,'#b6b2a6')", 1)
    elif kind == 'M2':  # 漸層改回 2 級
        assert "gL.addColorStop(.5,'#d0b898')" in s
        s = s.replace("gL.addColorStop(0,'#dcc7a6');gL.addColorStop(.5,'#d0b898');gL.addColorStop(1,'#c2a888');",
                      "gL.addColorStop(0,'#dcc7a6');gL.addColorStop(1,'#c2a888');", 1)
    elif kind == 'M3':  # 陰影 alpha 改回 .25
        assert "rgba(20,24,32,.32)" in s
        s = s.replace("rgba(20,24,32,.32)", "rgba(20,24,32,.25)", 1)
    io.open(INDEX, 'w', encoding='utf-8', newline='').write(s)
for kind in ['M1','M2','M3']:
    mutate(kind)
    r = subprocess.run(['node','test_fixde.js'], capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    out = r.stdout + '\n' + r.stderr
    fails = [ln for ln in out.split('\n') if 'FAIL' in ln]
    first = fails[0].strip() if fails else ('(NO FAIL exit=%d stderr:%s)' % (r.returncode, r.stderr[:120]))
    print('=== %s === exit=%d' % (kind, r.returncode))
    print('  ' + first[:240])
    io.open(INDEX, 'w', encoding='utf-8', newline='').write(io.open(BASE, encoding='utf-8').read())
print('restored')
