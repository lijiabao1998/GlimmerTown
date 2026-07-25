# -*- coding: utf-8 -*-
# T309b 增量地標接線器：往已存在的 T309 結構追加新座位（KNAME/COST/TOOLS/canPlace/placeCost/doPlace/LMCFG309/PAL/sprite）
# 只接沙盒報告 OK 且尚未接線者。binary 防 CRLF。
import io,os,re
SC=r'C:\Users\Leon1\AppData\Local\Temp\claude\C--Users-Leon1-OneDrive-Desktop-----\c18d2666-aa5c-4132-b9f6-b80cd356823d\scratchpad'
IDX=r'C:\dev\glimmer-town\index.html'
ALL=[
 (69,'lighthouse','🗼','燈塔','#e05a4a',1400,4,4,16),
 (70,'windmill','🌀','風車','#c8a850',900,3,3,10),
 (71,'fountain','⛲','噴泉廣場','#5aa0c8',700,2,3,8),
 (72,'monument','🗿','紀念碑','#8a9a7a',1600,3,4,18),
 (73,'skytower','📡','觀景塔','#d0d4dc',1300,4,5,14),
 (74,'pavilion','🏛️','涼亭','#c8b090',800,2,3,9),
 (75,'archway','🏛','凱旋門','#c8b8a0',1500,3,4,17),
 (76,'ferriswheel','🎡','摩天輪','#e07ab0',2000,6,7,24),
 (77,'watertowerlm','🚰','水塔景觀','#a0b0b8',1100,3,4,11),
 (78,'ancienttree','🌳','古樹神木','#5a8a4a',600,1,2,10),
 (79,'harborlm','⚓','碼頭亭','#7a9aa8',900,2,3,12),
 (80,'carousel','🎠','旋轉木馬','#e0a0c0',1700,4,5,20),
]
ok=set()
for line in io.open(os.path.join(SC,'report2.txt'),encoding='utf-8').read().split('\n'):
    m=re.match(r'(\d+)_1_0 OK',line)
    if m:ok.add(int(m.group(1)))
s=open(IDX,'rb').read().decode('utf-8')
# 已接線＝LMCFG309 裡已有該 k
cfg_m=re.search(r'const LMCFG309=\{([^}]*(?:\{[^}]*\}[^}]*)*)\};',s)
assert cfg_m,'LMCFG309 not found'
wired=set(int(x) for x in re.findall(r'(\d+):\{t:',cfg_m.group(1)))
todo=[x for x in ALL if x[0] in ok and x[0] not in wired]
print('already wired:',sorted(wired))
print('to add:',[x[0] for x in todo])
if not todo:
    print('nothing to add');raise SystemExit
sprites=[]
for k,tid,ic,nm,col,cost,jobs,up,tour in todo:
    key='%d_1_0'%k
    ds=io.open(os.path.join(SC,'out_%s.js'%key),encoding='utf-8').read()
    ds=re.sub(r'```[a-z]*','',ds).strip()
    ds=ds.strip('`').strip()                            # 剝除首尾孤立反引號（DS 常見前導垃圾）
    assert '`' not in ds, 'backtick inside body of '+key # 今日血淚：游離反引號會把宿主上萬行吞成模板字串
    assert not re.search(r'\b(dia|diaEdge)\((c|nc|s)\s*,',ds), 'canvas-as-ctx in '+key
    assert ("SPR.bld['%s']"%key) in ds, 'no key '+key
    sprites.append(ds)
chk=[]
def rep(a,b,t):
    global s
    assert a in s,'MISS '+t
    s=s.replace(a,b,1);chk.append(t)
# 1 KNAME：追加在最後一個已接座位後
last_k=max(wired)
rep("%d:'%s'"%(last_k,dict((x[0],x[3]) for x in ALL)[last_k]),
    "%d:'%s',"%(last_k,dict((x[0],x[3]) for x in ALL)[last_k])+",".join("%d:'%s'"%(k,nm) for k,tid,ic,nm,*_ in todo),"KNAME")
# 2 COST
last_tid=dict((x[0],x[1]) for x in ALL)[last_k]; last_cost=dict((x[0],x[5]) for x in ALL)[last_k]
rep("%s:%d"%(last_tid,last_cost),"%s:%d,"%(last_tid,last_cost)+",".join("%s:%d"%(tid,cost) for k,tid,ic,nm,col,cost,*_ in todo),"COST")
# 3 TOOLS
tools="".join("\n  {id:'%s',cat:'culture',ic:'%s',nm:'%s',pr:'$'+COST.%s}, // T309b"%(tid,ic,nm,tid) for k,tid,ic,nm,*_ in todo)
rep("{id:'%s',cat:'culture'"%last_tid,"XPLACEHOLDERX","tmp")
s=s.replace("XPLACEHOLDERX","{id:'%s',cat:'culture'"%last_tid,1)
i=s.index("{id:'%s',cat:'culture'"%last_tid); j=s.index('\n',i)
s=s[:j]+tools+s[j:]; chk.append("TOOLS")
# 4 canPlace 1×1
rep("case '%s':"%last_tid,"case '%s':"%last_tid+"".join("case '%s':"%tid for k,tid,*_ in todo),"canPlace")
# 5 placeCost
rep("case '%s':c=COST.%s;break;"%(last_tid,last_tid),
    "case '%s':c=COST.%s;break;"%(last_tid,last_tid)+"".join("case '%s':c=COST.%s;break;"%(tid,tid) for k,tid,*_ in todo),"placeCost")
# 6 doPlace
dp="".join("\n    case '%s':{t.tree=0;t.zone=0;t.deco=0;t.bld={k:%d,lv:1,v:0,age:0,pw:true,h:1};break;} // T309b"%(tid,k) for k,tid,*_ in todo)
anchor_dp="case '%s':{t.tree=0;t.zone=0;t.deco=0;t.bld={k:%d,lv:1,v:0,age:0,pw:true,h:1};break;}"%(last_tid,last_k)
rep(anchor_dp,anchor_dp+dp,"doPlace")
# 7 LMCFG309 追加
rep("%d:{t:%d,j:%d,u:%d}"%(last_k,dict((x[0],x[8]) for x in ALL)[last_k],dict((x[0],x[6]) for x in ALL)[last_k],dict((x[0],x[7]) for x in ALL)[last_k]),
    "%d:{t:%d,j:%d,u:%d},"%(last_k,dict((x[0],x[8]) for x in ALL)[last_k],dict((x[0],x[6]) for x in ALL)[last_k],dict((x[0],x[7]) for x in ALL)[last_k])
    +",".join("%d:{t:%d,j:%d,u:%d}"%(k,tour,jobs,up) for k,tid,ic,nm,col,cost,jobs,up,tour in todo),"LMCFG")
# 8 count 範圍：確保涵蓋所有新 k（原本 b.k>=lo&&b.k<=hi）
m2=re.search(r'if\(b&&b\.k>=(\d+)&&b\.k<=(\d+)&&!b\.ref\)\{const lc309',s)
if m2:
    lo=min(int(m2.group(1)),min(x[0] for x in todo)); hi=max(int(m2.group(2)),max(x[0] for x in todo))
    s=s.replace(m2.group(0),'if(b&&b.k>=%d&&b.k<=%d&&!b.ref){const lc309'%(lo,hi),1);chk.append("count-range")
# 9 sprite 注入（最後一個已接 sprite 之後）
lastkey="SPR.bld['%d_1_0']"%last_k
i=s.index(lastkey); e=s.index('smoke:[]};}',i)+len('smoke:[]};}')
s=s[:e]+'\n'+'\n'.join(sprites)+s[e:]; chk.append("sprite-%d"%len(sprites))
# 10 PAL：補齊到 80（索引對齊；缺者灰）
pal_m=re.search(r"const MINI_BLD_PAL=\[(.*?)\];",s,re.S)
cols=re.findall(r"'(#[0-9a-fA-F]{6})'",pal_m.group(1))
colmap=dict((x[0],x[4]) for x in ALL)
need=81-len(cols)   # 索引 0..80
if need>0:
    add=[]
    for k in range(len(cols),81):
        add.append("'%s'"%colmap.get(k,'#8a8a8a'))
    s=s.replace(pal_m.group(0),"const MINI_BLD_PAL=["+pal_m.group(1).rstrip().rstrip(',')+","+",".join(add)+"];",1)
    chk.append("PAL+%d"%need)
open(IDX,'wb').write(s.encode('utf-8'))
print('DONE:',', '.join(chk))
