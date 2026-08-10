import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425i_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # boxUnit 刪稜線（左稜亮線）
        assert "g.fillStyle=shade(cL,3);\n  for(let dx=1;dx<=hw;dx++){const yF=by-(dx>>1);g.fillRect(cx-dx,yF-h,1,1);}" in s
        s = s.replace("g.fillStyle=shade(cL,3);\n  for(let dx=1;dx<=hw;dx++){const yF=by-(dx>>1);g.fillRect(cx-dx,yF-h,1,1);}", "// 稜線刪除", 1)
    elif kind == 'M2':  # 65 一個箱體改回 isoBox
        assert "boxUnit(sg,ng,ax,198,24,24" in s
        s = s.replace("boxUnit(sg,ng,ax,198,24,24", "isoBox(sg,ax,198,24,24", 1)
    elif kind == 'M3':  # 主箱 win 移除
        assert "{win:{gx:10,ht:5,lit:.55},tex:'brick'}" in s
        s = s.replace("boxUnit(sg,ng,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50',{win:{gx:10,ht:5,lit:.55},tex:'brick'});",
                      "boxUnit(sg,ng,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50');", 1)
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
