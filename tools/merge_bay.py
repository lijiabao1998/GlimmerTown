# -*- coding: utf-8 -*-
"""T352 車位合併自動化：把 bay/<name> 的成果併回 master，全程機械檢查。

用法：
    python tools/merge_bay.py kimi            # 合併並驗證（不部署）
    python tools/merge_bay.py kimi --deploy    # 全綠後同時部署到玩家目錄
    python tools/merge_bay.py --status         # 只看各車位領先幾個 commit

為什麼要腳本而不是口頭流程：這個專案的合併有四個容易漏的機械檢查
（CRLF、版本雙處同步、全套 1865 斷言、部署逐位元相同），漏任何一項都可能
靜默壞掉。腳本讓「合併」變成不可能忘步驟的動作。

輸出全部 ASCII，避免 Windows 主控台把中文變亂碼。
"""
import io,os,re,subprocess,sys

ROOT=r'C:\dev\glimmer-town'
DEPLOY=r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\glimmer-town'
BAYS={'kimi':r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\bay-kimi',
      'codex':r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\bay-codex',
      'grok':r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\bay-grok'}
RUNTIME=['index.html','sw.js']
TEXT_CHECK=['index.html','sw.js','test_fixde.js']

def run(args,cwd=ROOT,timeout=300):
    r=subprocess.run(args,cwd=cwd,capture_output=True,timeout=timeout)
    return r.returncode,r.stdout.decode('utf-8',errors='replace'),r.stderr.decode('utf-8',errors='replace')

def ok(m):   print('  [OK]   '+m)
def bad(m):  print('  [FAIL] '+m)
def info(m): print('  .      '+m)
def step(m): print('\n== '+m)

def git(*a,cwd=ROOT):
    return run(['git']+list(a),cwd=cwd)

def clean(cwd):
    _,out,_=git('status','--porcelain',cwd=cwd)
    return out.strip()=='' , out.strip()

def suite(cwd):
    """回傳 (pass_count, fail_count, first_fail_line)"""
    c,out,err=run(['node','test_fixde.js'],cwd=cwd,timeout=600)
    lines=(out+err).split('\n')
    p=sum(1 for t in lines if t.startswith('PASS'))
    fails=[t for t in lines if t.startswith('FAIL')]
    return p,len(fails),(fails[0][:200] if fails else '')

def crlf(cwd):
    bads=[]
    for f in TEXT_CHECK:
        p=os.path.join(cwd,f)
        if not os.path.exists(p):continue
        n=io.open(p,'rb').read().count(b'\r\n')
        if n:bads.append(f+':'+str(n))
    return bads

def vsync(cwd):
    idx=io.open(os.path.join(cwd,'index.html'),'rb').read().decode('utf-8')
    sw=io.open(os.path.join(cwd,'sw.js'),'rb').read().decode('utf-8')
    a=re.search(r"const GAME_VER='([\d.]+)'",idx)
    b=re.search(r"const APP_VER='([\d.]+)'",sw)
    return (a.group(1) if a else None),(b.group(1) if b else None)

def status_only():
    step('bay status')
    for name,d in BAYS.items():
        if not os.path.isdir(d):
            bad(name+': bay dir missing'); continue
        _,ahead,_=git('rev-list','--count','master..bay/'+name)
        _,behind,_=git('rev-list','--count','bay/'+name+'..master')
        c,dirty=clean(d)
        print('  %-6s ahead=%s behind=%s worktree=%s'%(name,ahead.strip(),behind.strip(),'clean' if c else 'DIRTY'))
        if not c:
            for t in dirty.split('\n')[:6]:info('   '+t)

def main():
    if '--status' in sys.argv: status_only(); return 0
    if len(sys.argv)<2: print(__doc__); return 1
    name=sys.argv[1]
    if name not in BAYS: print('unknown bay: '+name+' (expect '+('|'.join(BAYS))+')'); return 1
    bay=BAYS[name]; branch='bay/'+name
    deploy='--deploy' in sys.argv

    step('1. pre-flight: bay worktree must be clean and ahead of master')
    if not os.path.isdir(bay): bad('bay dir missing: '+bay); return 1
    c,dirty=clean(bay)
    if not c:
        bad('bay worktree dirty -- commit or discard first:')
        for t in dirty.split('\n')[:10]:info(t)
        return 1
    ok('bay worktree clean')
    _,ahead,_=git('rev-list','--count','master..'+branch)
    n_ahead=int(ahead.strip() or 0)
    if n_ahead==0: bad('nothing to merge (bay has 0 commits ahead of master)'); return 1
    ok('%d commit(s) ahead of master'%n_ahead)
    _,log,_=git('log','--oneline','master..'+branch)
    for t in log.strip().split('\n')[:12]:info(t)

    step('2. pre-merge gate: suite must be green IN THE BAY')
    bc=crlf(bay)
    if bc: bad('CRLF found in bay: '+', '.join(bc)); return 1
    ok('bay CRLF=0')
    p,f,first=suite(bay)
    if f: bad('bay suite RED: PASS=%d FAIL=%d :: %s'%(p,f,first)); return 1
    ok('bay suite green (PASS=%d)'%p)

    step('3. master worktree must be clean before merge')
    c,dirty=clean(ROOT)
    if not c:
        bad('master worktree dirty -- commit/stash first:')
        for t in dirty.split('\n')[:10]:info(t)
        return 1
    ok('master clean')

    step('4. merge --no-ff (keeps a merge commit naming the bay)')
    rc,out,err=git('merge','--no-ff','--no-edit',branch)
    if rc!=0:
        bad('merge conflict -- NOT aborted, resolve then re-run step 5+ manually')
        print(out[-1500:]); print(err[-800:])
        _,cf,_=git('diff','--name-only','--diff-filter=U')
        print('\n  conflicted files:')
        for t in cf.strip().split('\n'):
            if t.strip():info(t)
        print("""
  resolution hints (this repo's known conflict points):
    docs/CHANGELOG.md -> union merge, newest entry first
    test_fixde.js     -> both sides inject before the same anchor; keep BOTH blocks
    index.html        -> real conflict: check the task card's allowed-touch region
    version strings   -> do NOT hand-edit; after resolving run: python tools/bump.py <ver>
  then: git add -A && git commit && python tools/merge_bay.py %s (re-run to re-verify)
"""%name)
        return 2
    ok('merged')

    step('5. post-merge machine checks')
    mc=crlf(ROOT)
    if mc: bad('CRLF appeared after merge: '+', '.join(mc)); return 1
    ok('CRLF=0')
    g,s=vsync(ROOT)
    if not g or not s or g!=s:
        bad('version desync: index GAME_VER=%s vs sw APP_VER=%s -> run tools/bump.py'%(g,s)); return 1
    ok('version single-source in sync: '+g)
    p,f,first=suite(ROOT)
    if f: bad('master suite RED after merge: PASS=%d FAIL=%d :: %s'%(p,f,first)); return 1
    ok('master suite green (PASS=%d)'%p)

    if deploy:
        step('6. deploy runtime files and byte-verify')
        for fn in RUNTIME:
            src=os.path.join(ROOT,fn); dst=os.path.join(DEPLOY,fn)
            io.open(dst,'wb').write(io.open(src,'rb').read())
        allsame=all(io.open(os.path.join(ROOT,fn),'rb').read()==io.open(os.path.join(DEPLOY,fn),'rb').read() for fn in RUNTIME)
        (ok if allsame else bad)('deploy byte-identical: '+str(allsame))
        if not allsame: return 1
    else:
        info('skipped deploy (pass --deploy to also publish)')

    step('7. sync every bay back to master (fast-forward)')
    for bn,bd in BAYS.items():
        if not os.path.isdir(bd):continue
        c,_=clean(bd)
        if not c: bad(bn+': dirty, skipped (commit then merge master manually)'); continue
        rc,o,e=git('merge','master','--no-edit','-q',cwd=bd)
        (ok if rc==0 else bad)(bn+': '+('synced' if rc==0 else 'merge failed: '+e[:120]))

    step('DONE')
    _,h,_=git('log','--oneline','-1')
    ok('master HEAD = '+h.strip())
    return 0

if __name__=='__main__':
    sys.exit(main())
