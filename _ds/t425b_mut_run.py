import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425b_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 刪陰影塊
        assert "g.fillStyle='rgba(20,24,32,.25)';" in s
        i = s.index("===== T425B 風格（TheoTown 三規則")
        j = s.index("// 左翼（奶油砂岩，矮；T425B 左光源漸層")
        s = s[:i] + s[j:]
    elif kind == 'M2':  # 左翼漸層改純色
        assert 'const gL=sg.createLinearGradient(wingL.x,0,wingL.x+wingL.w,0);' in s
        s = s.replace('const gL=sg.createLinearGradient(wingL.x,0,wingL.x+wingL.w,0);\n   gL.addColorStop(0,\'#f0e4cc\');gL.addColorStop(1,\'#d8c8a8\');\n   sg.fillStyle=gL;',
                      "sg.fillStyle='#e8dcc4';", 1)
    elif kind == 'M3':  # 刪基腳
        assert 'T425B 接地基腳線（TheoTown 落地感' in s
        i = s.index('// T425B 接地基腳線')
        j = s.index('   outlineSprite(s,26,30,44);g.drawImage(s,0,0);')
        s = s[:i] + s[j:]
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
