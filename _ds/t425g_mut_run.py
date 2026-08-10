import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425g_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 刪次箱 R
        assert "isoBox(sg,ax+24,190,16,12,'#cdb694','#a08a72','#8a6f50');  // T425G 次箱 R" in s
        s = s.replace("isoBox(sg,ax+24,190,16,12,'#cdb694','#a08a72','#8a6f50');  // T425G 次箱 R（主箱頂對稱——棱角規律）\n", "", 1)
    elif kind == 'M2':  # 次箱 cx 非對稱（ax-24→ax-18）
        assert "isoBox(sg,ax-24,190,16,12" in s
        s = s.replace("isoBox(sg,ax-24,190,16,12", "isoBox(sg,ax-18,190,16,12", 1)
    elif kind == 'M3':  # 刪台階
        assert "isoBox(sg,ax,262,16,4,'#c9c2b4'" in s
        s = s.replace("isoBox(sg,ax,262,16,4,'#c9c2b4','#a89e8e','#d4cec0');      // T425G 入口台階 1（前庭結構化）\n", "", 1)
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
