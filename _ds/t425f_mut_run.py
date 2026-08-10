import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425f_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 描邊改回深色
        assert "outlineSprite(s,176,182,192)" in s
        s = s.replace("outlineSprite(s,176,182,192);g.drawImage(s,0,0); // T425F 淺描邊",
                      "outlineSprite(s,26,30,44);g.drawImage(s,0,0);", 1)
    elif kind == 'M2':  # 刪磚紋
        assert "T425F 主箱左面中央帶磚紋" in s
        i = s.index("// T425F 主箱左面中央帶磚紋")
        j = s.index("// T425F 右翼箱面 MALL 招牌")
        s = s[:i] + s[j:]
    elif kind == 'M3':  # 刪右面招牌
        assert "sg.fillStyle='#b83c2e';sg.fillRect(ax+40,220,40,10)" in s
        s = s.replace("sg.fillStyle='#b83c2e';sg.fillRect(ax+40,220,40,10);sg.fillStyle='#fff8e8';sg.fillRect(ax+44,222,32,2);sg.fillRect(ax+44,226,32,2);\n", "", 1)
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
