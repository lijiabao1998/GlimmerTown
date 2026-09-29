// T600 量化工具：Node 無頭長城（test_fixde.js 的開機段，和守衛同一套樁），量「最外圍 20%」對「最中心 20%」的平均樓高（改前＝bd.v、改後＝v600），
// 每款佔比、用到幾款，以及連續快照之間的換臉數。中心性 s＝pickV406 同式（鄰域都市密度、地價、抖動），高度＝HT600（真 Chrome 量）。
// 用法：node docs/tasks/t600-shots/grad600.js <seed> <diff> <day,day,...> [--json=輸出檔]
// 只讀：不寫檔（除了 --json）、不碰玩家目錄。
'use strict';
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..', '..', '..');
const [seed, diff, daysArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const OUTJ = (process.argv.find(a => a.startsWith('--json=')) || '').slice(7);
const DAYS = String(daysArg || '400').split(',').map(Number);
let src = fs.readFileSync(path.join(REPO, 'test_fixde.js'), 'utf8');
const cut = src.indexOf('\neval(js);'); if (cut < 0) throw new Error('找不到 eval(js)');
const BRIDGE = `
window.__g600={rci:()=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=tiles[idx(x,y)].bld;if(!b||b.ref||b.k<1||b.k>3)continue;
    const dens=urbanDens406(x,y),lnd=clamp((LAND[idx(x,y)]-128)/48,0,1),jit=streetHash(x,y,4060)*.14-.07,s=clamp(dens*.70+lnd*.22+jit+.04,0,.999);
    const lv=Math.min(3,Math.max(1,b.lv|0)),v=((b.v|0)%12+12)%12,w=v600(b,x,y);
    const an=v2=>{const a=arche594(b.k,lv,v2);return a?(a.fs||a.n):'?';};out.push({x,y,k:b.k,lv,v,w,s,one:!(b.sz>=2)&&!b.lot574,av:an(v),aw:an(w)});}
  return out;},ht:()=>JSON.parse(JSON.stringify(HT600)),rank:()=>JSON.parse(JSON.stringify(RANK600))};`;
const head = 'function assert(){}\n' + src.slice(0, cut).split('__dirname').join(JSON.stringify(REPO)).split('__filename').join(JSON.stringify(path.join(REPO, 'test_fixde.js'))) + '\n{const e6=js.lastIndexOf("})();");js=js.slice(0,e6)+' + JSON.stringify(BRIDGE) + '+js.slice(e6);}\n';
const BODY = `
eval(js);
{
  const G=window.GV,t0=Date.now(),want=${JSON.stringify(DAYS)},maxD=Math.max(...want),snaps={};
  G.setMapSize(72);G.newWorldSeeded(${+seed});G.setDiff(${+diff});G.ai(true);
  for(let d=1;d<=maxD;d++){G.step(1);if(want.includes(d)){const st=G.stats();snaps['d'+d]={pop:st.pop,rci:window.__g600.rci()};}}
  G.ai(false);
  const HT=window.__g600.ht(),RK=window.__g600.rank();
  const met=(rows)=>{const n=rows.length;if(!n)return null;const srt=rows.map(r=>r.s).sort((a,b)=>a-b),q=p=>srt[Math.min(n-1,Math.floor(p*(n-1)))],q20=q(.2),q80=q(.8);
    const h=(r,v)=>HT[r.k+'_'+r.lv][v],mean=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):null;
    const sub=rows.filter(r=>r.s<=q20),core=rows.filter(r=>r.s>=q80);
    const slot=new Array(12).fill(0);for(const r of rows)slot[RK[r.k+'_'+r.lv].indexOf(r.w)]++;
    const distinct=kl=>new Set(rows.filter(r=>r.k+'_'+r.lv===kl).map(r=>r.w)).size,distinctOld=kl=>new Set(rows.filter(r=>r.k+'_'+r.lv===kl).map(r=>r.v)).size;
    const top=(arr,f)=>{const c={};for(const r of arr){const q=r.k+'_'+r.lv+':'+f(r);c[q]=(c[q]||0)+1;}return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([q,m])=>q+' '+(100*m/arr.length).toFixed(0)+'%');};
    const kinds=(arr,f)=>new Set(arr.map(r=>r.k+'_'+r.lv+':'+f(r))).size;
    return {n,coreFacade:{n:core.length,before:top(core,r=>r.av),after:top(core,r=>r.aw),kindsBefore:kinds(core,r=>r.av),kindsAfter:kinds(core,r=>r.aw)},before:{sub:mean(sub.map(r=>h(r,r.v))),core:mean(core.map(r=>h(r,r.v))),all:mean(rows.map(r=>h(r,r.v)))},after:{sub:mean(sub.map(r=>h(r,r.w))),core:mean(core.map(r=>h(r,r.w))),all:mean(rows.map(r=>h(r,r.w)))},
      share:slot.map(c=>+(c/n).toFixed(3)),distinct:Object.fromEntries(['1_1','2_1','3_1','2_2','1_2','1_3','2_3','3_2','3_3'].map(kl=>[kl,[distinctOld(kl),distinct(kl)]]))};};
  const out={seed:${+seed},diff:${+diff},sec:(Date.now()-t0)/1000,snaps:{}};
  const keys=Object.keys(snaps);
  for(const d of keys){const r=snaps[d].rci;out.snaps[d]={pop:snaps[d].pop,all:met(r),one:met(r.filter(t=>t.one))};}
  // 換臉：相鄰快照同一格、k／lv／v 都沒變，v600 卻不同（應為 0）；模擬本身改建／升級另計
  for(let i=1;i<keys.length;i++){const A=new Map(snaps[keys[i-1]].rci.map(t=>[t.x+','+t.y,t])),B=snaps[keys[i]].rci;let same=0,flip=0,sim=0;
    for(const t of B){const a=A.get(t.x+','+t.y);if(!a)continue;if(a.k===t.k&&a.lv===t.lv&&a.v===t.v){same++;if(a.w!==t.w)flip++;}else sim++;}
    out['flip_'+keys[i-1]+'_'+keys[i]]={same,flip,sim};}
  if(${JSON.stringify(OUTJ)})require('fs').writeFileSync(${JSON.stringify(OUTJ)},JSON.stringify(out,null,1));
  console.log('GRAD600 '+JSON.stringify(out));
}
process.exit(0);
`;
const tmp = path.join(require('os').tmpdir(), '_grad600_run_' + process.pid + '.js');
process.on('exit', () => { try { fs.unlinkSync(tmp); } catch {} });
fs.writeFileSync(tmp, head + BODY);
require(tmp);
