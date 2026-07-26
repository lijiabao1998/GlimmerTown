# -*- coding: utf-8 -*-
"""T352 一鍵驗證：施工者提交前必跑，五項機械檢查一次做完。

用法：
    python tools/verify.py

檢查項（任一項紅就不該提交）：
  1. script 區塊語法（new Function 整段）
  2. CRLF == 0（鐵律20：git 還原/worktree checkout 會偷偷轉換）
  3. 版本單一來源同步（index.html GAME_VER == sw.js APP_VER，鐵律22）
  4. 全套測試 0 FAIL
  5. 亂數流哨兵：檢查釘定種子斷言是否仍在測試檔內（防有人為了讓測試變綠而刪掉守衛）

輸出全 ASCII，避免 Windows 主控台把中文變亂碼。
"""
import io,os,re,subprocess,sys

HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ok(m):  print('  [OK]   '+m)
def bad(m): print('  [FAIL] '+m)

def main():
    fails=0
    print('verify @ '+HERE)

    # 1. 語法
    idx=io.open(os.path.join(HERE,'index.html'),'rb').read().decode('utf-8')
    m=re.search(r'<script>([\s\S]*?)</script>',idx)
    if not m:
        bad('no <script> block found'); return 1
    js=m.group(1)
    p=os.path.join(HERE,'_verify_tmp.js')
    io.open(p,'wb').write(js.encode('utf-8'))
    r=subprocess.run(['node','--check',p],capture_output=True)
    os.remove(p)
    if r.returncode==0: ok('syntax')
    else:
        bad('syntax: '+r.stderr.decode('utf-8',errors='replace').split('\n')[0][:160]); fails+=1

    # 2. CRLF
    crlf=[]
    for f in ['index.html','sw.js','test_fixde.js']:
        fp=os.path.join(HERE,f)
        if os.path.exists(fp):
            n=io.open(fp,'rb').read().count(b'\r\n')
            if n: crlf.append(f+':'+str(n))
    if crlf: bad('CRLF present: '+', '.join(crlf)+'  (fix: replace b"\\r\\n" -> b"\\n")'); fails+=1
    else: ok('CRLF=0')

    # 3. 版本同步
    sw=io.open(os.path.join(HERE,'sw.js'),'rb').read().decode('utf-8')
    a=re.search(r"const GAME_VER='([\d.]+)'",idx)
    b=re.search(r"const APP_VER='([\d.]+)'",sw)
    if a and b and a.group(1)==b.group(1): ok('version in sync: '+a.group(1))
    else:
        bad('version desync: GAME_VER=%s APP_VER=%s  (fix: python tools/bump.py <ver>)'%(a.group(1) if a else None,b.group(1) if b else None)); fails+=1

    # 4. 測試
    r=subprocess.run(['node','test_fixde.js'],cwd=HERE,capture_output=True,timeout=900)
    out=(r.stdout+r.stderr).decode('utf-8',errors='replace').split('\n')
    npass=sum(1 for t in out if t.startswith('PASS'))
    nfail=[t for t in out if t.startswith('FAIL')]
    if nfail:
        bad('suite RED: PASS=%d FAIL=%d'%(npass,len(nfail)))
        for t in nfail[:3]: print('         '+t[:170])
        fails+=1
    else: ok('suite green: PASS=%d'%npass)

    # 5. 亂數流哨兵：釘定種子斷言必須還在（有人把它刪掉就等於拆掉位元契約）
    tf=io.open(os.path.join(HERE,'test_fixde.js'),'rb').read().decode('utf-8')
    pins=len(re.findall(r'stats\(\)\.pop === \d+',tf))
    if pins>=1: ok('seed pins present: %d'%pins)
    else: bad('no pinned seed assertions found -- bit-contract guard missing'); fails+=1

    print('\nRESULT: '+('ALL GREEN' if fails==0 else '%d CHECK(S) FAILED'%fails))
    return 0 if fails==0 else 1

if __name__=='__main__':
    sys.exit(main())
