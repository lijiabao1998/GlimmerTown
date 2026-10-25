'use strict';
// UI hardening does not authorize a new harbor engine, economy or native input path.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const H=__dirname,ROOT=path.resolve(H,'../../..'),BASE='f1483c40d35bd6db30f44fab59477d865e60a1d6',P='docs/previews/port-p06/',hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(path.join(ROOT,p)),old=p=>cp.execFileSync('git',['show',BASE+':'+p],{cwd:ROOT,maxBuffer:16*1024*1024});
const originals=cp.execFileSync('git',['ls-tree','-r','--name-only',BASE,'--','docs/previews/port-p01','docs/previews/port-p01b','docs/previews/port-p02','docs/previews/port-p03','docs/previews/port-p04','docs/previews/port-p05'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const workflows=cp.execFileSync('git',['ls-tree','-r','--name-only',BASE,'--','.github/workflows'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const protectedFiles=['index.html','sw.js','test_fixde.js','docs/SPR_PINS.json','docs/ART_PINS.json','docs/GPT-方向.md','AGENTS.md','docs/RULES.md','docs/COLLAB.md','docs/迭代不改壞標準.md',...workflows,...originals,...['native-bridge.js','native-layout.js','native-performance.js','native-vector-cache.js'].map(p=>P+p)];
const rows=protectedFiles.map(file=>{const currentSHA256=hash(read(file)),baselineSHA256=hash(old(file));assert.equal(currentSHA256,baselineSHA256,'UX changed protected engine/native/art source: '+file);return{file,currentSHA256,baselineSHA256};});
// Compare whole builder after removing only its one UI-injection declaration.
const withoutUI=s=>s.toString().replace(/^const ui=.*;$/m,'const ui=UI_ONLY;');
assert.equal(withoutUI(read(P+'build.cjs')),withoutUI(old(P+'build.cjs')),'Builder changes outside the UI injection are forbidden');
const fixture=read(P+'native-fixtures.js').toString(),observer=fixture.split('\n').filter(l=>l.startsWith(' inputState(){'));
assert.equal(observer.length,1,'One read-only input snapshot is required');
assert.equal(fixture.split('\n').filter(l=>!l.startsWith(' inputState(){')).join('\n'),old(P+'native-fixtures.js').toString(),'Fixture changed beyond the read-only input snapshot');
assert(!/\b(?:delete|setPointerCapture|releasePointerCapture)\b|(?:tool|selTile|hover|pointers|downInfo|panBase|pinchBase|rect)\s*=/.test(observer[0]),'Input observer cannot mutate native input');
const ui=read(P+'native-ui.js').toString();
assert(!/P06\.(?:advance|replay|scan|enable|disable|live|reset|active|changed|checkTopology)\s*=/.test(ui),'UI cannot replace harbor methods');
assert(!/\.preventDefault\(/.test(ui.replace(/panel\.addEventListener\('click',[\s\S]*?\},true\);/,'')),'Native form/touch defaults cannot be globally suppressed');
const result={status:'passed',baseline:BASE,protectedFileCount:rows.length,protectedFiles:rows,builder:'Only const ui declaration differs',fixture:'Only read-only inputState observer added',scope:'Byte equality and source boundary, not a claim of browser gesture/layout correctness'};
fs.mkdirSync(path.join(H,'evidence'),{recursive:true});fs.writeFileSync(path.join(H,'evidence/ui-scope.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS UX scope: '+rows.length+' protected source files byte-identical, builder/UI boundary intact');
