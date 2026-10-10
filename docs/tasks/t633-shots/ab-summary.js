// T633：彙整 macab-1.json／macab-2.json（Mac A/B 兩個 job）：每輪冷畫、每輪尖峰數、桌面夜尖峰的排列檢定。用法：node ab-summary.js
const fs=require('fs'),p=require('path');
const pct=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*q))]};
const rows=[];for(const j of [1,2]){const ss=JSON.parse(fs.readFileSync(p.join(__dirname,'macab-'+j+'.json')));for(const s of ss)for(const r of (s.rows||[]))rows.push({...r,job:j,growMs:s.growMs});}
for(const sc of ['mobile day','mobile night','desktop day','desktop night']){
  const [vp,l]=sc.split(' ');
  for(const v of ['W','N']){const R=rows.filter(r=>r.vp===vp&&r.light===l&&r.variant===v);
    const all=R.flatMap(r=>r.warm),m=pct(all,.5);
    const sp=R.map(r=>r.warm.filter(t=>t>3*m).length);
    console.log(sc.padEnd(13),v,'cold',R.map(r=>r.cold.toFixed(0)+'('+r.coldBakes+')').join(' '),'| spikes/session',sp.join(','),'| bigSpikes>200',R.map(r=>r.warm.filter(t=>t>200).length).join(','));
  }
}
// 排列檢定：桌面夜每輪尖峰數，W vs N
const sc=rows.filter(r=>r.vp==='desktop'&&r.light==='night'),all=sc.flatMap(r=>r.warm),m=pct(all,.5);
const per=sc.map(r=>({v:r.variant,s:r.warm.filter(t=>t>3*m).length}));
const obs=per.filter(x=>x.v==='W').reduce((a,x)=>a+x.s,0)-per.filter(x=>x.v==='N').reduce((a,x)=>a+x.s,0);
let ge=0,T=20000,seed=1;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
for(let t=0;t<T;t++){const vals=per.map(x=>x.s);for(let i=vals.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[vals[i],vals[j]]=[vals[j],vals[i]];}const d=vals.slice(0,10).reduce((a,b)=>a+b,0)-vals.slice(10).reduce((a,b)=>a+b,0);if(d>=obs)ge++;}
console.log('desktop night pooled med',m.toFixed(1),'W-N spikes diff',obs,'one-sided permutation p',(ge/T).toFixed(3));
