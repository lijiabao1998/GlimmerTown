// T602 真城盤點：借用原回歸台架開機，只數 root、不把 ref 格當成建築。
// node docs/tasks/t602-shots/census602.js 22 3 420 [--repo=基線目錄] [--json=輸出檔] [--save=存檔檔] [--off]
// 三座參考城：22/3/420、777/1/400、301/1/400；步數420對應遊戲day421。
// 槽3在讀入index前設定；不碰玩家origin、不改產品原始碼。Node盤點不代替真瀏覽器驗收。
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const option=(name,fallback)=>{const a=process.argv.find(a=>a.startsWith('--'+name+'='));return a?a.slice(name.length+3):fallback;};
const REPO=path.resolve(option('repo',path.join(__dirname,'..','..','..')));
const [seed=22,diff=3,steps=420]=process.argv.slice(2).filter(a=>!a.startsWith('--')).map(Number);
if(!Number.isInteger(seed)||![0,1,2,3].includes(diff)||!Number.isInteger(steps)||steps<0)throw new Error('seed/diff/steps格式錯誤');
const output=option('json',''),saveFile=option('save',''),off=process.argv.includes('--off');
const ts=fs.readFileSync(path.join(REPO,'test_fixde.js'),'utf8'),cut=ts.indexOf('\neval(js);');
if(cut<0)throw new Error('找不到eval(js)開機錨點');
let head='function assert(){}\n'+ts.slice(0,cut).split('__dirname').join(JSON.stringify(REPO)).split('__filename').join(JSON.stringify(path.join(REPO,'test_fixde.js')));
const loadAnchor='// ---- 載入 index.html 中的 script ----';
if(head.split(loadAnchor).length!==2)throw new Error('找不到載入前槽3錨點');
head=head.replace(loadAnchor,"localStorage.setItem('glimmerville.v1.slot','3');\n"+loadAnchor);
const bridge=`window.__census602={read:()=>{const rows=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=tiles[idx(x,y)].bld;if(b&&!b.ref)rows.push({x,y,k:b.k,name:KNAME[b.k],v:b.v,lv:b.lv,sz:b.sz||1,lot:!!b.lot574,ported590:portK590().has(b.k),plan:LOT_PLAN574[b.k]});}return {rows,size:N,preview596:t596On(),t602:typeof t602On==='function'?t602On():null,version:GAME_VER};}};`;
head+='\n{const end=js.lastIndexOf("})();");js=js.slice(0,end)+'+JSON.stringify(bridge)+'+js.slice(end);}\n';
const body=`
window.__noT602=${off};eval(js);
const G=window.GV,t0=Date.now();G.setMapSize(72);G.newWorldSeeded(${seed});G.setDiff(${diff});G.ai(true);G.setSpeed(0);
for(let step=0;step<${steps};step++)G.step(1);G.ai(false);
const raw=window.__census602.read(),counts={};
for(const r of raw.rows){const q=counts[r.k]||(counts[r.k]={k:r.k,name:r.name,plan:r.plan,total:0,lot:0,nonLot:0,variants:{},sizes:{},ported590:r.ported590});q.total++;q[r.lot?'lot':'nonLot']++;q.variants[r.v]=(q.variants[r.v]||0)+1;q.sizes[r.sz]=(q.sizes[r.sz]||0)+1;}
const excluded=[1,2,3,33,34,105,106,4,5,8,60,63,66,81,97],all=Object.values(counts).sort((a,b)=>b.total-a.total||a.k-b.k);
const result={seed:${seed},diff:${diff},steps:${steps},seconds:(Date.now()-t0)/1000,slot:localStorage.getItem('glimmerville.v1.slot'),stats:G.stats(),...raw,all,remaining:all.filter(q=>!excluded.includes(q.k)&&!q.ported590)};
if(${JSON.stringify(output)})fs.writeFileSync(${JSON.stringify(output)},JSON.stringify(result,null,2)+'\\n');
if(${JSON.stringify(saveFile)}){G.save();fs.writeFileSync(${JSON.stringify(saveFile)},localStorage.getItem('glimmerville.v1.s3'));}
console.log('CENSUS602 '+JSON.stringify({...result,rows:undefined,all:undefined}));process.exit(0);
`;
const temp=path.join(os.tmpdir(),'census602-'+process.pid+'.js');process.on('exit',()=>{try{fs.unlinkSync(temp);}catch{}});fs.writeFileSync(temp,head+body);require(temp);
