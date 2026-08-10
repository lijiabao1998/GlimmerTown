import io, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = '_ds/t425d_mut_base.html'
INDEX = 'index.html'
def mutate(kind):
    s = io.open(BASE, encoding='utf-8').read()
    if kind == 'M1':  # 背光面改回連續漸層
        assert "fillStyle='#b89f82'" in s
        s = s.replace("sg.fillStyle='#b89f82';sg.fillRect(wingL.x+Math.ceil(wingL.w*2/3),by-wingL.h,wingL.w-Math.ceil(wingL.w*2/3),wingL.h);",
                      "const gL2=sg.createLinearGradient(wingL.x,0,wingL.x+wingL.w,0);gL2.addColorStop(0,'#dcc7a6');gL2.addColorStop(1,'#b89f82');sg.fillStyle=gL2;sg.fillRect(wingL.x,by-wingL.h,wingL.w,wingL.h);", 1)
    elif kind == 'M2':  # 側帶 8→4px
        assert "sg.fillStyle='#a08a72';sg.fillRect(wingL.x+wingL.w-8,by-wingL.h,8,wingL.h)" in s
        s = s.replace("sg.fillStyle='#a08a72';sg.fillRect(wingL.x+wingL.w-8,by-wingL.h,8,wingL.h)",
                      "sg.fillStyle='#a08a72';sg.fillRect(wingL.x+wingL.w-4,by-wingL.h,4,wingL.h)", 1)
    elif kind == 'M3':  # 刪屋頂板亮面
        assert "sg.fillStyle='#f0e4cc';sg.fillRect(wingL.x,by-wingL.h-6,wingL.w,3)" in s
        s = s.replace("sg.fillStyle='#f0e4cc';sg.fillRect(wingL.x,by-wingL.h-6,wingL.w,3); // T425D 屋頂板亮面",
                      "sg.fillStyle='#dccdb0';sg.fillRect(wingL.x,by-wingL.h-6,wingL.w,2);", 1)
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
