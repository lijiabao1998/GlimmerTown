# -*- coding: utf-8 -*-
# T310 市民人生階段（重寫，IDX 相對路徑）：注入 DS 生活文本 + age 增長/階段轉換/心聲。binary 防 CRLF。
import io,os,re,json
SC=os.path.dirname(os.path.abspath(__file__))
IDX=os.path.join(SC,'..','index.html')
raw=io.open(os.path.join(SC,'life_out.json'),encoding='utf-8').read()
raw=re.sub(r'```[a-z]*','',raw).strip()
arr=json.loads(raw[raw.find('['):raw.rfind(']')+1])
buckets={'infant':[],'student':[],'worker':[],'retired':[]}
for e in arr:
    st=str(e.get('stage','')).strip().lower()
    if st not in buckets:continue
    t=str(e.get('text','')).strip()[:26].replace(chr(39),'').replace('`','').replace('\\','')
    if t:buckets[st].append(t)
for st in buckets:
    if not buckets[st]:buckets[st]=['在這座城市生活著']
print('life texts:',{k:len(v) for k,v in buckets.items()})
LIFE_JS="const LIFE_TEXTS={"+",".join("%s:[%s]"%(st,",".join("'%s'"%t for t in buckets[st])) for st in buckets)+"};"
s=open(IDX,'rb').read().decode('utf-8')
chk=[]
def rep(a,b,t):
    global s;assert a in s,'MISS '+t;s=s.replace(a,b,1);chk.append(t)
rep("const CITIZEN_CAP=48;",
    LIFE_JS+"\nconst czStage=a=>a<7?'infant':a<18?'student':a<65?'worker':'retired'; // T310 人生階段\nconst czQuote=st=>{const a=LIFE_TEXTS[st]||LIFE_TEXTS.worker;return a[Math.floor(Math.random()*a.length)];};\nconst CITIZEN_CAP=48;","LIFE+helper")
rep("      fx:hx,fy:hy,at:0,path:null,pi:0,p:0,ptype:age<14?'child':(Math.random()<.12?'stroller':'adult')",
    "      fx:hx,fy:hy,at:0,path:null,pi:0,p:0,ptype:age<14?'child':(Math.random()<.12?'stroller':'adult'),stage:czStage(age),quote:czQuote(czStage(age))","push")
rep("  const cap=Math.min(CITIZEN_CAP,Math.floor(pop/8));\n  if(citizens.length<cap)spawnCitizen();",
"""  if(day%40===0){ // T310 每40天老化一歲：階段轉換(學生→工作/工作→退休)＋82歲離世＋更新心聲
    for(let i2=citizens.length-1;i2>=0;i2--){const c=citizens[i2];c.age++;
      if(c.age>=82){citizens.splice(i2,1);continue;}
      const ns=czStage(c.age);
      if(ns!==c.stage){c.stage=ns;c.quote=czQuote(ns);
        if(ns==='worker'){c.job='待業';for(let t3=0;t3<20;t3++){const jx=Math.floor(Math.random()*N),jy=Math.floor(Math.random()*N),jb=T(idx(jx,jy)).bld;if(jb&&!jb.ref&&(jb.k===2||jb.k===3)&&jb.pw){c.work=idx(jx,jy);c.wx=jx;c.wy=jy;c.job=rnJob(jb.k);break;}}}
        else if(ns==='retired'){c.work=-1;c.wx=-1;c.wy=-1;c.job='退休';c.at=0;c.path=null;}
        else if(ns==='student')c.job='學生';
      }
    }
  }
  const cap=Math.min(CITIZEN_CAP,Math.floor(pop/8));
  if(citizens.length<cap)spawnCitizen();""","aging")
rep("html+=`<div class=\"row\" style=\"font-size:11px;opacity:.9\">・${c.name}（${c.age}歲・${c.job}）${cm}</div>`;",
    "html+=`<div class=\"row\" style=\"font-size:11px;opacity:.9\">・${c.name}（${c.age}歲・${c.job}）${cm}</div><div class=\"row\" style=\"font-size:10px;opacity:.6;font-style:italic\">　“${c.quote||''}”</div>`;","inspect")
rep("citizens:()=>citizens.map(c=>({name:c.name,age:c.age,job:c.job,",
    "citizens:()=>citizens.map(c=>({name:c.name,age:c.age,job:c.job,stage:c.stage,quote:c.quote,","hook")
open(IDX,'wb').write(s.encode('utf-8'))
print('DONE:',', '.join(chk))
