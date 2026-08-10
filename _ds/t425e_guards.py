# -*- coding: utf-8 -*-
# T425E 守衛同步：T425 G1a / T425B G1b / T425C G2c G3c / T425D G1d-G4d / T425A G3 霓虹花園 → 箱體結構釘
import io, re
p = 'test_fixde.js'
s = io.open(p, encoding='utf-8').read()
done = []

def sub(old, new, tag):
    global s
    assert old in s, 'MISS: ' + tag
    s = s.replace(old, new, 1)
    done.append(tag)

# 1. T425 G1a 兩條常量釘 → 箱體常量釘
sub(r"""    assert(/const bw=142,bh=68,bx=ax-72,by=ay-40;/.test(html),'T425 G1a 常量：店窗帶 bw=142/bx=ax-72（T425 收窄值）');
    assert(/const wingL=\{x:ax-72,w:62,h:46\},wingR=\{x:ax\+8,w:44,h:56\},atr=\{x:ax-8,w:24,h:74\};/.test(html),
      'T425 G1a 常量：三段體量 T425 收窄值（翼 62/44、中庭 24×74）');""",
r"""    assert(/const by=ay-40; \/\/ T425E：常量簡化/.test(html),
      'T425 G1a 常量：65 段常量簡化（箱體化後 bw/bx/wingL/wingR/atr 由 isoBox 參數取代）');
    assert(/isoBox\(sg,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50'\)/.test(html),
      'T425 G1a 箱體：主箱 isoBox(ax,ay,96,32)（半寬96 高32，頂面頂 y=150 恰齊 4×4 菱形頂）');""", 'T425 G1a')

# 2. T425B G1b 陰影（wingL 引用 → 箱體陰影）
sub(r"""    assert(/g\.fillStyle='rgba\(20,24,32,\.32\)'/.test(html)&&/g\.fillRect\(wingL\.x\+3,by-wingL\.h\+1,wingL\.w,wingL\.h-2\)/.test(html),
      'T425B G1b 陰影：右落陰影（左翼 (wingL.x+3, h-2) 半透明黑）必須畫在 g 底層（超出下緣由 T425 尾部貼合清除）');""",
r"""    assert(/g\.fillStyle='rgba\(20,24,32,\.32\)'/.test(html)&&/g\.fillRect\(ax-93,by-31,96,31\);g\.fillRect\(ax-39,by-23,40,23\);g\.fillRect\(ax\+47,by-29,44,29\)/.test(html),
      'T425B G1b 陰影：箱體右落陰影（主/左翼/右翼偏移副本）必須畫在 g 底層（超出下緣由 T425 尾部貼合清除）');""", 'T425B G1b')

# 3. T425C G2c 受光面釘 → 主箱左面色
sub(r"""    assert(/fillStyle='#dcc7a6';sg\.fillRect\(wingL\.x,by-wingL\.h,Math\.ceil\(wingL\.w\/3\),wingL\.h\)/.test(html),
      'T425C G2c 亮度：左翼受光面 #dcc7a6（L≈.78，原 #f0e4cc L≈.9——蒼白根源下壓）');""",
r"""    assert(/isoBox\(sg,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50'\)/.test(html),
      'T425C G2c 亮度：主箱左面 #dcc7a6（受光面 L≈.78——蒼白根源下壓）');""", 'T425C G2c')

# 4. T425C G3c 三條階梯釘 → 箱體結構釘
sub(r"""    // G3c 階梯釘（T425D 取代：階梯三色帶＋過渡線——面轉折）
    assert(/fillStyle='#dcc7a6';sg\.fillRect\(wingL\.x,by-wingL\.h,Math\.ceil\(wingL\.w\/3\),wingL\.h\)/.test(html),
      'T425C G3c 階梯：左翼受光面 #dcc7a6（1/3 寬）必須存在');
    assert(/fillStyle='#b89f82';sg\.fillRect\(wingL\.x\+Math\.ceil\(wingL\.w\*2\/3\),by-wingL\.h,wingL\.w-Math\.ceil\(wingL\.w\*2\/3\),wingL\.h\)/.test(html),
      'T425C G3c 階梯：左翼背光面 #b89f82（最後 1/3）必須存在');
    assert(/fillStyle='#967e68';sg\.fillRect\(wingR\.x\+Math\.ceil\(wingR\.w\*2\/3\),by-wingR\.h,wingR\.w-Math\.ceil\(wingR\.w\*2\/3\),wingR\.h\)/.test(html),
      'T425C G3c 階梯：右翼背光面 #967e68 必須存在');""",
r"""    // G3c 箱體結構釘（T425E 取代：多箱體等距組合）
    assert(/isoBox\(sg,ax-44,ay,40,24,'#cdb694','#a08a72','#7a6a52'\)/.test(html),
      'T425C G3c 箱體：左翼箱 isoBox(ax-44,ay,40,24)（矮）必須存在');
    assert(/isoBox\(sg,ax\+44,ay,44,30,'#c8b498','#8a7058','#6e5a44'\)/.test(html),
      'T425C G3c 箱體：右翼箱 isoBox(ax+44,ay,44,30)（中高）必須存在');
    assert(/isoBox\(sg,ax,198,24,24,'#90b8cc','#5a7a8a','#7ca4b8'\)/.test(html),
      'T425C G3c 箱體：中庭玻璃箱 isoBox(ax,198,24,24)（疊主箱頂面）必須存在');""", 'T425C G3c')

# 5. T425A G3 霓虹釘 → 招牌塔霓虹
sub(r"""    assert(/sg.fillStyle='#b83c2e';sg.fillRect\(59,202,4,33\)/.test(html),
      'T425A G3 霓虹：左翼側牆垂直霓虹招牌必須存在');""",
r"""    assert(/isoBox\(sg,ax,174,6,14,'#b83c2e','#8a2a1e','#c0453a'\)/.test(html)&&/ng\.fillStyle='#ff8a72';ng\.fillRect\(ax-1,174,2,14\)/.test(html),
      'T425A G3 霓虹：招牌塔（細箱＋塔頂霓虹）必須存在（箱體化後側牆霓虹改塔霓虹）');""", 'T425A G3 neon')

# 6. T425A G3 花園釘 → 主箱頂面花園
sub(r"""    assert(/sg\.fillStyle='#4f8a44';sg\.fillRect\(wingR\.x\+4,by-wingR\.h\+2,wingR\.w-8,4\)/.test(html),
      'T425A G3 花園：右翼屋頂花園綠植帶必須存在（TheoTown 附屬物語彙）');""",
r"""    assert(/sg\.fillStyle='#4f8a44';sg\.fillRect\(ax-60,162,30,8\)/.test(html),
      'T425A G3 花園：主箱頂面植栽（箱體化後屋頂綠植帶）必須存在');""", 'T425A G3 garden')

# 7. T425A G5 地面收斂：噴泉/旗桿/平台原文（保留）——平台 `sg.fillRect(80,226,12,2)` 仍在 ✓ 不變
# 8. T425D G1d-G4d 整塊 → T425E 箱體釘
old_d = re.search(r"  \{ // ===== T425D 立體感深化：等距箱體體積語言（業主反饋「立體程度不夠」） =====\n.*?\n  \}\n", s, re.S)
assert old_d, 'T425D block'
new_d = """  { // ===== T425E 結構化 2.5D：多箱體等距組合（業主反饋「結構化的接近 2.5d」；isoBox 語彙與 v1-v4 統一） =====
    // G1e 箱體結構釘：主體必須由 isoBox 箱體組合構成（≥5 個）
    const seg65e=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    const boxN65e=(seg65e.match(/isoBox\\(sg,/g)||[]).length;
    assert(boxN65e>=8,'T425E G1e 箱體：65 段至少 8 個 isoBox 箱體（主/左翼/右翼/中庭/天窗×2/招牌塔/雨棚——結構化 2.5D），實得 '+boxN65e);
    assert(/const detR=\\(\\(\\)=>\\{let ws=911\\+65\\*37/.test(html),
      'T425E G1e 箱體：局部決定性 PRNG（零全域 rand，T223 先例）必須存在');
    // G2e 箱體幾何釘：主箱/中庭箱參數（菱形內含由 G3e 驗算）
    assert(/isoBox\\(sg,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50'\\)/.test(html),
      'T425E G2e 幾何：主箱（ax,ay,96,32——半寬96 高32，頂面頂恰齊菱形頂）');
    // G3e 菱形內含：箱體包圍盒驗算（頂面菱形＋側面，±2px；下半由 T425 尾部貼合）
    const boxes65e=[[136,278,96,32,'主箱'],[92,278,40,24,'左翼'],[180,278,44,30,'右翼'],[136,198,24,24,'中庭'],[80,180,12,10,'天窗L'],[192,180,12,10,'天窗R'],[136,174,6,14,'招牌塔'],[136,246,30,4,'雨棚']];
    const g3e=[];
    for(const[cx2,by2,hw2,h2,nm]of boxes65e){
      const top2=by2-h2-hw2; // 頂面菱形頂點 y（isoBox 幾何）
      for(const py2 of[top2,top2+hw2]){
        const hwD=128*(1-Math.abs(py2-214)/64);
        if(py2<150||py2>278||Math.abs(cx2-136)>hwD+2||Math.abs((cx2-hw2)-136)>hwD+2||Math.abs((cx2+hw2)-136)>hwD+2)g3e.push(nm+'@y'+py2);
      }
    }
    assert(g3e.length===0,'T425E G3e 菱形內含：全部箱體頂面菱形在 4×4 footprint 內（±2px；側面下半由 T425 尾部貼合），實得 '+JSON.stringify(g3e));
    // G4e 地面件保留：噴泉/旗桿/貨箱/小人/地燈（重構不得刪）
    assert(/sg\.fillRect\(128,262,16,4\)/.test(html)&&/sg\.fillRect\(fqx,226,1,16\)/.test(html)&&/sg\.fillRect\(80,219,7,6\)/.test(html),
      'T425E G4e 地面件：噴泉/旗桿/貨箱堆保留（箱體化不得刪地面件）');
    assert(/fillStyle='#20242c';sg\.fillRect\(px2,py2,1,1\)/.test(html),
      'T425E G4e 地面件：購物者小人保留');
  }
"""
s = s[:old_d.start()] + new_d + s[old_d.end():]
done.append('T425D block -> T425E')

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('guards synced:', done)
