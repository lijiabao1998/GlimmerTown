import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425a_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 噴泉盤移出菱形
        assert 'sg.fillRect(128,262,16,4)' in s
        s = s.replace('sg.fillRect(128,262,16,4)', 'sg.fillRect(112,262,16,4)', 1)
    elif kind == 'M2':  # 刪小人
        assert "fillStyle='#20242c';sg.fillRect(px2,py2,1,1)" in s
        i = s.index("// M 購物者小人")
        j = s.index("// N 夜間補充")
        s = s[:i] + s[j:]
    elif kind == 'M3':  # 霓虹 ng→sg
        assert "ng.fillStyle='rgba(255,138,114,.8)';ng.fillRect(59,202,4,33)" in s
        s = s.replace("ng.fillStyle='rgba(255,138,114,.8)';ng.fillRect(59,202,4,33)",
                      "sg.fillStyle='rgba(255,138,114,.8)';sg.fillRect(59,202,4,33)", 1)
    elif kind == 'M4':  # 幾何 w
        assert "w:272,h:280" in s
        s = s.replace("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280",
                      "SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:280,h:280", 1)
    elif kind == 'M5':  # 小人 y→200（上半）
        assert "[110,240,'#e05252']" in s
        s = s.replace("[110,240,'#e05252']", "[110,200,'#e05252']", 1)
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
