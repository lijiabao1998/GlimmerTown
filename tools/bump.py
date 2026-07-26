# -*- coding: utf-8 -*-
"""T349 版本單一來源：一條命令同步 index.html 的 GAME_VER 與 sw.js 的 APP_VER。

用法：  python tools/bump.py 9.0

背景（Kimi 誤判事件）：過去 index.html 的 GAME_VER 與 sw.js 的快取版本是兩個各自
手動維護的字串，曾經不同步（一份副本 sw v36 / 測試釘 v28），讓外部審閱者誤以為
「測試是紅的、專案飛到一半沒提交」。現在改成：
  1. sw.js 的快取名直接由 APP_VER 組出（glimmerville-shell-v<版本>）
  2. 本腳本同時改兩處，不可能只改一邊
  3. test_fixde.js 有一條斷言比對兩檔的版本字串必須相等（漂移立刻紅）
"""
import io,re,sys
ROOT=r'C:\dev\glimmer-town'
def readb(p): return io.open(p,'rb').read().decode('utf-8')
def writeb(p,s):
    assert '\r\n' not in s, 'CRLF 混入（鐵律20）：'+p
    io.open(p,'wb').write(s.encode('utf-8'))

def cur():
    idx=readb(ROOT+r'\index.html'); sw=readb(ROOT+r'\sw.js')
    a=re.search(r"const GAME_VER='([\d.]+)'",idx)
    b=re.search(r"const APP_VER='([\d.]+)'",sw) or re.search(r"CACHE_PREFIX\+'v([\d.]+)'",sw)
    return (a.group(1) if a else None),(b.group(1) if b else None)

def bump(new):
    ip=ROOT+r'\index.html'; sp=ROOT+r'\sw.js'
    idx=readb(ip); sw=readb(sp)
    old=re.search(r"const GAME_VER='([\d.]+)'",idx).group(1)
    idx=re.sub(r"const GAME_VER='[\d.]+'","const GAME_VER='"+new+"'",idx,count=1)
    if re.search(r"const APP_VER='[\d.]+'",sw):
        sw=re.sub(r"const APP_VER='[\d.]+'","const APP_VER='"+new+"'",sw,count=1)
    else:
        raise SystemExit('sw.js 尚未改為 APP_VER 單一來源，請先執行 T349 遷移')
    writeb(ip,idx); writeb(sp,sw)
    print('GAME_VER/APP_VER',old,'->',new)
    print('提醒：CHANGELOG 條目仍需手寫（設計如此，卡面敘事不該自動生成）')

if __name__=='__main__':
    g,s=cur()
    if len(sys.argv)<2:
        print('index.html GAME_VER =',g)
        print('sw.js     APP_VER   =',s)
        print('同步：','OK' if g==s else '❌ 不同步')
        print('用法：python tools/bump.py <新版本>')
    else:
        bump(sys.argv[1])
