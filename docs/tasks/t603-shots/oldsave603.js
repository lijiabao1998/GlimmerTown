// T603 舊檔驗收：三份v11.211真種子城，沒有玩家資料。新圖開著載入／存檔／再次載入。
// node docs/tasks/t603-shots/oldsave603.js [--repo=被驗目錄] [--json=輸出檔]
// 以改動前獨立盤點的root SHA256驗k/lv/v/占地，再驗每個ref、存檔關鍵欄位與往返。
// 槽3在讀index前設定；只用記憶體localStorage；Node不代替瀏覽器畫面验收。
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const option=(name,fallback)=>{const a=process.argv.find(a=>a.startsWith('--'+name+'='));return a?a.slice(name.length+3):fallback;};
const REPO=path.resolve(option('repo',path.join(__dirname,'..','..','..'))),OUT=option('json','');
const fixtureDir=path.join(__dirname,'fixtures'),manifest=JSON.parse(fs.readFileSync(path.join(fixtureDir,'manifest.json'),'utf8'));
const fixtures=manifest.cities.map(c=>{const raw=fs.readFileSync(path.join(fixtureDir,c.file),'utf8');if(crypto.createHash('sha256').update(raw).digest('hex')!==c.saveSHA256)throw new Error('fixture指紋漂移 '+c.file);return {...c,raw};});
const ts=fs.readFileSync(path.join(REPO,'test_fixde.js'),'utf8'),cut=ts.indexOf('\neval(js);');if(cut<0)throw new Error('找不到eval(js)開機錨點');
let head='function assert(){}\n'+ts.slice(0,cut).split('__dirname').join(JSON.stringify(REPO)).split('__filename').join(JSON.stringify(path.join(REPO,'test_fixde.js')));
const anchor='// ---- 載入 index.html 中的 script ----';if(head.split(anchor).length!==2)throw new Error('找不到載入前槽3錨點');
head=head.replace(anchor,"localStorage.setItem('glimmerville.v1.slot','3');\n"+anchor);
const bridge=`window.__oldsave603={inflate:saveInflate,flags:()=>({preview596:t596On(),t603:typeof t603On==='function'?t603On():null}),roots:()=>{const out=[];let bad=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=tiles[idx(x,y)].bld;if(!b||b.ref)continue;out.push([idx(x,y),b.k,b.lv,b.v,b.sz||1,!!b.lot574]);if(b.sz>=2)for(let yy=0;yy<b.sz;yy++)for(let xx=0;xx<b.sz;xx++){if(!xx&&!yy)continue;if(!inMap(x+xx,y+yy)){bad++;continue;}const q=tiles[idx(x+xx,y+yy)].bld;if(!q||!q.ref||q.ref[0]!==x||q.ref[1]!==y)bad++;}}return {rows:out,bad};}};`;
head+='\n{const end=js.lastIndexOf("})();");js=js.slice(0,end)+'+JSON.stringify(bridge)+'+js.slice(end);}\n';
const body=`
window.__noT602=false;window.__noT603=false;eval(js);
const G=window.GV,A=window.__oldsave603,out=[];
for(const fixture of ${JSON.stringify(fixtures)}){
 const original=A.inflate(JSON.parse(fixture.raw));localStorage.setItem('glimmerville.v1.s3',fixture.raw);
 if(!G.load())throw new Error('舊檔載入失敗 seed'+fixture.seed);G.ai(false);G.setSpeed(0);
 const before=A.roots(),st=G.stats(),rootSHA256=crypto.createHash('sha256').update(JSON.stringify(before.rows)).digest('hex');
 G.save();const saved=A.inflate(JSON.parse(localStorage.getItem('glimmerville.v1.s3')));
 const fields=['v','n','seed','money','day','df','bl','lots574','ter','tre','rd','zn','gvc'];
 const changedSaveFields=fields.filter(k=>JSON.stringify(original[k])!==JSON.stringify(saved[k]));
 if(!G.load())throw new Error('再次載入失敗 seed'+fixture.seed);const after=A.roots();
 out.push({seed:fixture.seed,sourceVersion:original.gameVer,sourceDay:original.day,roots:before.rows.length,rootSHA256,expectedRootSHA256:fixture.rootSHA256,rootDataExact:rootSHA256===fixture.rootSHA256,footprintErrors:before.bad,changedSaveFields,roundtripRootsExact:JSON.stringify(before)===JSON.stringify(after),flags:A.flags(),stats:{day:st.day,money:st.money,buildings:st.buildings,roads:st.roads,zones:st.zones}});
}
if(${JSON.stringify(OUT)})fs.writeFileSync(${JSON.stringify(OUT)},JSON.stringify(out,null,2)+'\\n');
console.log('OLDSAVE603 '+JSON.stringify(out));process.exit(out.some(r=>!r.rootDataExact||r.footprintErrors||r.changedSaveFields.length||!r.roundtripRootsExact||r.flags.preview596)?1:0);
`;
const temp=path.join(os.tmpdir(),'oldsave603-'+process.pid+'.js');process.on('exit',()=>{try{fs.unlinkSync(temp);}catch{}});fs.writeFileSync(temp,head+body);require(temp);
