import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 左翼加寬 62→80（超菱形）
        assert 'const wingL={x:ax-72,w:62,h:46}' in s
        s = s.replace('const wingL={x:ax-72,w:62,h:46}', 'const wingL={x:ax-72,w:80,h:46}', 1)
    elif kind == 'M2':  # 幾何 w:272→w:280
        assert "w:272,h:280" in s
        s = s.replace("w:272,h:280", "w:280,h:280", 1)
    elif kind == 'M3':  # 刪 T345 遮罩
        assert 'idc=g2.getImageData(0,0,w,h)' in s
        i = s.index('/* T425 根治：色環沿下緣描邊')
        j = s.index('      // (b) 屋頂徽記')
        s = s[:i] + s[j:]
    elif kind == 'M4':  # 刪尾部 pass
        assert 'T425 統一底部貼合 pass' in s
        i = s.index('  /* ===== T425 統一底部貼合 pass')
        j = s.index('  R=__savedR;')
        s = s[:i] + s[j:]
    elif kind == 'M5':  # bw 142→150
        assert 'const bw=142' in s
        s = s.replace('const bw=142', 'const bw=150', 1)
    io.open(INDEX, 'w', encoding='utf-8', newline='').write(s)
for kind in ['M1','M2','M3','M4','M5']:
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
