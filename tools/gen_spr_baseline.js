// tools/gen_spr_baseline.js — 產生逐家族素材計數基線（T357）
// 用法：node tools/gen_spr_baseline.js   （在倉庫根目錄執行；素材「新增」後要更新基線才跑）
// 產出 tools/spr_families.json：{ ver, total, skipped, families: { 家族名: 件數 } }
// 語義：這是「誤刪偵測」基線——測試只斷 current[fam] >= baseline[fam]，
// 新增素材不必更新基線（恆大於），刪除/改壞才會紅。刻意刪減時才需重跑本腳本降基線。
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// 借用 test_fixde.js 的 DOM mock 頭（與測試同一環境，保證基線與斷言同一把尺）
const tsrc = fs.readFileSync(path.join(ROOT, 'test_fixde.js'), 'utf8');
(0, eval)(tsrc.slice(tsrc.indexOf('// ---- 最小 DOM'), tsrc.indexOf('// ---- 載入 index.html')));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let js = '', i = 0;
while (true) {
  const s = html.indexOf('<script>', i); if (s === -1) break;
  const e = html.indexOf('</script>', s); if (e === -1) break;
  js += html.slice(s + 8, e) + '\n'; i = e + 9;
}
(0, eval)(js);

const r = global.window.GV.sprAtlas356();
const families = {};
for (const e of r.entries) families[e.fam] = (families[e.fam] || 0) + 1;
const ver = (html.match(/const GAME_VER='([^']*)'/) || [])[1] || '?';
const out = { ver, total: r.entries.length, skipped: r.skipped, families };
fs.writeFileSync(path.join(ROOT, 'tools', 'spr_families.json'), JSON.stringify(out, null, 1) + '\n');
console.log('基線已寫入 tools/spr_families.json：ver=' + ver + ' total=' + out.total +
  ' families=' + Object.keys(families).length + ' skipped=' + r.skipped);
process.exit(0);
