# -*- coding: utf-8 -*-
# T310 市民人生階段（終版，內聯生活文本、絕對路徑、冪等、binary 防 CRLF；不依賴任何易失中間檔）
import io,re
IDX=r'C:\dev\glimmer-town\index.html'
buckets={
 'infant':['在媽媽懷裡咯咯笑','蹣跚學步撲向陽光','把積木疊得高高的','追著泡泡滿屋跑','午睡時抱著小熊','咿呀學說第一個字','在沙坑裡玩一整天','看見小狗就想去摸'],
 'student':['揹著書包蹦跳去上學','考了滿分想告訴媽媽','和同學分享便當','在操場上追逐打鬧','放學路上買糖葫蘆','為明天的考試熬夜','夢想長大當科學家','在課本角落偷偷塗鴉'],
 'worker':['在寫字樓敲打鍵盤的日常','趕在末班車前衝出公司','週末只想睡到自然醒','為了房貸再拼一年','靠咖啡續命的下午','和同事吐槽老闆','存錢想去看看大海','下班後的燒烤攤最治癒'],
 'retired':['在公園長椅上曬太陽','清晨去菜市場挑最新鮮的','含飴弄孫的好時光','和老友下棋到黃昏','把陽台種成小花園','慢慢散步看城市變化','泡壺茶讀半天報紙','跳廣場舞認識新朋友'],
}
s=open(IDX,'rb').read().decode('utf-8')
if 'LIFE_TEXTS' in s or 'czStage' in s:
    print('SKIP: T310 already present'); raise SystemExit
LIFE_JS="const LIFE_TEXTS={"+",".join("%s:[%s]"%(st,",".join("'%s'"%t for t in buckets[st])) for st in buckets)+"};"
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
