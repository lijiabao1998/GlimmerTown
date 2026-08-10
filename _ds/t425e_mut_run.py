import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425e_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 刪中庭玻璃箱
        assert "isoBox(sg,ax,198,24,24,'#90b8cc'" in s
        s = s.replace("isoBox(sg,ax,198,24,24,'#90b8cc','#5a7a8a','#7ca4b8');     // 中庭玻璃箱（疊主箱頂面中心，頂 y=150）\n", "", 1)
    elif kind == 'M2':  # 主箱 hw 96→120
        assert "isoBox(sg,ax,ay,96,32,'#dcc7a6'" in s
        s = s.replace("isoBox(sg,ax,ay,96,32,'#dcc7a6'", "isoBox(sg,ax,ay,120,32,'#dcc7a6'", 1)
    elif kind == 'M3':  # 刪噴泉
        assert "sg.fillStyle='#b8bcc4';sg.fillRect(128,262,16,4)" in s
        s = s.replace("sg.fillStyle='#b8bcc4';sg.fillRect(128,262,16,4);", "", 1)
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
