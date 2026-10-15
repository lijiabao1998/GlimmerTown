'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const {designs,validate,render}=require('./designs652.js'),root=path.resolve(__dirname,'../../..');let checks=0;
function ok(v,m){assert.ok(v,m);checks++;}
function bad(f,rule){assert.throws(f,new RegExp(rule));checks++;}
const copy=()=>structuredClone(designs);
ok(validate().count===10,'ten candidates');
let a=copy();a.pop();bad(()=>validate(a),'count');a=copy();a[1].id=a[0].id;bad(()=>validate(a),'identity');a=copy();a[1].m=a[0].m;bad(()=>validate(a),'structure');a=copy();a[0].m[0][0]=-.1;bad(()=>validate(a),'footprint');a=copy();a[1].m[1][0]=.2;bad(()=>validate(a),'intersection');a=copy();a[0].m[0][6]='unknown';bad(()=>validate(a),'roof');
// 獨立來源：既有不可變目錄的結構，並非讓新目錄自證無舊款。
const old=fs.readFileSync(path.join(root,'docs/tasks/t634-shots/rci634.js'),'utf8');const start=old.indexOf('const RCI_CATALOG634='),end=old.indexOf('\n};',start)+3;
const catalog=vm.runInNewContext(old.slice(start,end)+';RCI_CATALOG634');ok(Object.keys(catalog).length===108,'read original 108 designs');
const structural=m=>JSON.stringify(m.map(p=>p.slice(0,6)));
for(const d of designs)ok(!Object.values(catalog).some(o=>structural(o.m)===structural(d.m)),'not original structure '+d.id);
// 記錄真實畫筆呼叫：是非像素單元測試，不能取代真Chrome圖像驗收。
function fake(){const commands=[];const g={beginPath(){commands.push(['begin']);},moveTo(...a){commands.push(['move',...a]);},lineTo(...a){commands.push(['line',...a]);},closePath(){commands.push(['close']);},fill(){commands.push(['fill',this.fillStyle]);},stroke(){commands.push(['stroke',this.strokeStyle,this.lineWidth]);},fillRect(...a){commands.push(['rect',...a,this.fillStyle]);},clearRect(){}};return{commands,getContext(){return g;}};}
const states=[];for(let rot=0;rot<4;rot++)for(const season of ['spring','summer','autumn','winter'])for(const night of [false,true])for(const snow of season==='winter'?[false,true]:[false])states.push({rot,season,night,snow});
let cases=0;for(const d of designs)for(const s of states){const a=fake(),b=fake();render(a,d,s);render(b,d,s);ok(JSON.stringify(a.commands)===JSON.stringify(b.commands),'deterministic commands');for(const c of a.commands)if(['move','line','rect'].includes(c[0]))ok(Number.isFinite(c[1])&&Number.isFinite(c[2])&&c[1]>=0&&c[1]<=100&&c[2]>=0&&c[2]<=112,'canvas bounds');cases++;}
const base=process.env.BASE_REF||'origin/main',protectedPaths=['index.html','sw.js','docs/SPR_PINS.json','docs/ART_PINS.json','docs/APPROVED_ART.json','test_fixde.js'];
for(const p of protectedPaths)ok(cp.execFileSync('git',['show',base+':'+p],{cwd:root,maxBuffer:32e6}).equals(fs.readFileSync(path.join(root,p))),'protected bytes '+p);
const report={checks,candidates:10,statesPerCandidate:states.length,commandCases:cases,negativeControls:6,oldCatalogCount:108,protectedPaths,limitations:['Command recorder is not pixel validation.','No browser screenshots, night-mask pixel proof or gameplay integration claimed.']};
console.log(JSON.stringify(report,null,2));
