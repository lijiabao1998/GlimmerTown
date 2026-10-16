'use strict';
/* T647 核准美術登記冊：讀 docs/APPROVED_ART.json、驗證錨點，給 release634／release635 共用。
   依序驗（第一個不過就丟錯，訊息以「T647 <批次>:」開頭）：
   1. 登記冊在磁碟上的內容等於 HEAD 裡的版本（台架不能讀一份沒提交的登記冊）；
   2. 批次有登記，欄位齊全：approved/* 標籤、40 位提交、64 位 index.html sha256；
   3. 標籤存在，而且指到登記的提交（標籤只是方便人找，登記的提交才是錨點；兩者不一致就紅）；
   4. 該提交的 index.html 位元組 sha256 等於登記值；
   5. 該提交是 HEAD 的祖先；
   6. 登記的提交裡有這一批自己的 `function tNNNOn(){`（T654）；
   7. 後批規則：HEAD 裡有、批准提交裡沒有的每個 `function tNNNOn(){`，都要在 valves 登記一個 __noTNNN，
      而且在沙箱裡打開那個閥、或網址帶 ?noTNNN=1 時，啟用函式都真的回傳假——否則台架隔離不了它、玩家也沒有退路。
      回傳這些閥，台架一律打開它們。
   T635 這類有「批准前的 main」的批次，base 用同樣的 2～5 條驗。 */
const crypto = require('crypto'), fs = require('fs'), path = require('path'), vm = require('vm'), {execFileSync} = require('child_process');

const REGISTRY = 'docs/APPROVED_ART.json';
const HEX40 = /^[0-9a-f]{40}$/, HEX64 = /^[0-9a-f]{64}$/, VALVE = /^__noT\d+$/;
const ON = /^function t(\d+)On\(\)\{.*$/gm;

function activations(source) {
  return new Map([...source.matchAll(ON)].map(m => ['T' + m[1], m[0]]));
}

/* 真的執行啟用函式（Codex #36 P2 兩條）：只看字面會讓寫在註解或字串裡的 !window.__noTNNN 混過去；
   只驗執行期的閥又會漏掉「網址 ?noTNNN=1 關不掉」——玩家的退路是網址。
   在空白沙箱裡各跑一次：打開 window 閥、網址不帶參數；不開 window 閥、網址帶 ?noTNNN=1。兩次都必須回傳假。
   讀不到別的遊戲狀態就無法單獨判定，也算不過。回傳哪一種關不掉（null＝都關得掉）。 */
function escapeFails(line, id, valve) {
  const run = (win, search) => {
    try { return !!vm.runInNewContext(line + ';' + id.toLowerCase() + 'On()', {window: win, location: {search}}, {timeout: 1000}); } catch (e) { return true; }
  };
  if (run({[valve]: true}, '')) return 'setting window.' + valve;
  if (run({}, '?' + valve.slice(2) + '=1')) return 'the URL ?' + valve.slice(2) + '=1';
  return null;
}

function loadApproved(root, batch) {
  const git = (...a) => execFileSync('git', a, {cwd: root, maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'pipe']});
  const fail = m => { throw new Error('T647 ' + batch + ': ' + m); };
  const head = git('rev-parse', 'HEAD').toString().trim();
  let committed;
  try { committed = git('show', 'HEAD:' + REGISTRY).toString('utf8'); } catch (e) { fail(REGISTRY + ' is not committed at HEAD'); }
  if (fs.readFileSync(path.join(root, REGISTRY), 'utf8') !== committed) fail(REGISTRY + ' on disk differs from HEAD');
  const reg = JSON.parse(committed);
  if (reg.schema !== 1) fail('unknown registry schema ' + reg.schema);
  const entry = reg.approved && reg.approved[batch];
  if (!entry) fail('not registered in ' + REGISTRY);

  const anchor = (e, label) => {
    if (!e || typeof e.tag !== 'string' || !e.tag.startsWith('approved/') || !HEX40.test(e.commit || '') || !HEX64.test(e.index_sha256 || ''))
      fail(label + ': entry needs tag approved/*, a 40-hex commit and a 64-hex index_sha256');
    let tagged = '';
    try { tagged = git('rev-parse', '--verify', '--quiet', 'refs/tags/' + e.tag + '^{commit}').toString().trim(); } catch (x) { tagged = ''; }
    if (!tagged) fail(label + ': tag ' + e.tag + ' does not exist (git fetch --tags)');
    if (tagged !== e.commit) fail(label + ': tag ' + e.tag + ' points to ' + tagged + ', registry says ' + e.commit);
    const bytes = git('show', e.commit + ':index.html');
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== e.index_sha256) fail(label + ': index.html sha256 ' + digest + ' differs from registry ' + e.index_sha256);
    try { git('merge-base', '--is-ancestor', e.commit, head); } catch (x) { fail(label + ': ' + e.commit + ' is not an ancestor of HEAD'); }
    return {tag: e.tag, commit: e.commit, sha256: digest, source: bytes.toString('utf8')};
  };
  const approved = anchor(entry, batch);
  const base = entry.base ? anchor(entry.base, batch + '.base') : null;

  const then = activations(approved.source), later = [];
  // Codex #36 P2（T654 收）：登記的提交裡要有這一批自己的啟用函式，否則登記錯了提交（例如填成批准前的 main），後批規則會把這一批也當成「批准過的」
  if (!then.has(batch)) fail(approved.commit + ' has no function ' + batch.toLowerCase() + 'On(){ of its own; the registered commit is not this batch');
  for (const [id, line] of activations(git('show', 'HEAD:index.html').toString('utf8'))) {
    if (then.has(id)) continue;
    const valve = reg.valves && reg.valves[id];
    if (typeof valve !== 'string' || !VALVE.test(valve)) fail('later batch ' + id + ' has no escape valve registered in ' + REGISTRY + ' valves');
    if (valve !== '__no' + id) fail('later batch ' + id + ' must use its own valve __no' + id + ', registry says ' + valve); // Codex #36 P2：閥名要對上批次號
    const leak = escapeFails(line, id, valve);
    if (leak) fail(leak + ' does not turn later batch ' + id + ' off');
    later.push({id, valve});
  }
  return {batch, head, approved, base, later, valves: later.map(x => x.valve)};
}

/* Codex #36 P2：台架只讀 T634、T635；之後新登記的批次（approved 裡任何一批）也要有人驗錨點。
   validate 跑 `node tools/approved_art.cjs --check-all`：登記冊裡每一批都走一次 loadApproved。 */
function checkAll(root) {
  const reg = JSON.parse(execFileSync('git', ['show', 'HEAD:' + REGISTRY], {cwd: root, maxBuffer: 64e6}).toString('utf8'));
  return Object.keys(reg.approved || {}).sort().map(batch => loadApproved(root, batch));
}

if (require.main === module) {
  if (!process.argv.includes('--check-all')) { console.error('usage: node tools/approved_art.cjs --check-all'); process.exit(2); }
  try {
    for (const a of checkAll(process.cwd()))
      console.log('T647 ' + a.batch + ': ' + a.approved.tag + ' = ' + a.approved.commit.slice(0, 12) + (a.base ? '（base ' + a.base.tag + '）' : '') + '；後批閥 ' + (a.valves.join('、') || '無'));
  } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = {loadApproved, checkAll, activations, REGISTRY};
