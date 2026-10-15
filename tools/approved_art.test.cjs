'use strict';
/* T647 approved_art.cjs 的單元測試：臨時 git 倉庫，每條檢查一個該紅、一個不該紅。執行：node --test tools/approved_art.test.cjs */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), {execFileSync} = require('child_process');
const {loadApproved} = require('./approved_art.cjs');

const ENV = {...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devnull, GIT_TERMINAL_PROMPT: '0'};
const OLD = 'function t634On(){return !window.__noT634&&!t634On.off;}\n';
const T635 = 'function t635On(){if(t635On.u===undefined){t635On.u=1;}return !window.__noT635&&!t635On.off;}\n';

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't647-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.invalid', ...a], {cwd: dir, env: ENV}).toString().trim();
  const write = (p, s) => { fs.mkdirSync(path.dirname(path.join(dir, p)), {recursive: true}); fs.writeFileSync(path.join(dir, p), s); };
  git('init', '-q', '-b', 'main');
  const commit = m => { git('add', '-A'); git('commit', '-q', '-m', m); return git('rev-parse', 'HEAD'); };
  return {dir, git, write, commit, close: () => fs.rmSync(dir, {recursive: true, force: true})};
}

/* 批准提交（只有 t634）→ HEAD 加上 later 裡的批次與登記冊。回傳 {r, approved, sha} */
function setup({later = '', valves = {}, mutate = e => e, tag = true} = {}) {
  const r = repo();
  r.write('index.html', '<script>\n' + OLD + '</script>\n');
  const approved = r.commit('approved art');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(r.dir, 'index.html'))).digest('hex');
  if (tag) r.git('tag', '-a', 'approved/t634', approved, '-m', 'approved');
  r.write('index.html', '<script>\n' + OLD + later + '</script>\n');
  const entry = mutate({tag: 'approved/t634', commit: approved, index_sha256: sha});
  r.write('docs/APPROVED_ART.json', JSON.stringify({schema: 1, approved: {T634: entry}, valves}, null, 1) + '\n');
  r.commit('registry and later batches');
  return {r, approved, sha};
}

function red(opts, pattern, tweak) {
  const {r} = setup(opts);
  try {
    if (tweak) tweak(r);
    assert.throws(() => loadApproved(r.dir, 'T634'), pattern);
  } finally { r.close(); }
}

test('a clean registry loads and reports no later batch', () => {
  const {r, approved, sha} = setup();
  try {
    const a = loadApproved(r.dir, 'T634');
    assert.equal(a.approved.commit, approved); assert.equal(a.approved.sha256, sha);
    assert.deepEqual(a.later, []); assert.equal(a.base, null);
    assert.ok(a.approved.source.includes('t634On'));
  } finally { r.close(); }
});

test('a later batch with a registered valve that its activation line reads is returned', () => {
  const {r} = setup({later: T635, valves: {T635: '__noT635'}});
  try { assert.deepEqual(loadApproved(r.dir, 'T634').valves, ['__noT635']); } finally { r.close(); }
});

test('unregistered batch is red', () => {
  const {r} = setup();
  try { assert.throws(() => loadApproved(r.dir, 'T999'), /T647 T999: not registered/); } finally { r.close(); }
});

test('malformed entry is red', () => red({mutate: e => ({...e, commit: e.commit.slice(0, 7)})}, /entry needs tag approved/));

test('missing tag is red', () => red({tag: false}, /tag approved\/t634 does not exist/));

test('tag pointing at another commit is red', () => red({}, /tag approved\/t634 points to/, r => {
  r.git('tag', '-d', 'approved/t634'); r.git('tag', '-a', 'approved/t634', 'HEAD', '-m', 'moved');
}));

test('one flipped digit of the registered hash is red', () => red({mutate: e => ({...e, index_sha256: (e.index_sha256[0] === '0' ? '1' : '0') + e.index_sha256.slice(1)})},
  /index\.html sha256 [0-9a-f]{64} differs from registry/));

test('approved commit that is not an ancestor of HEAD is red', () => {
  const r = repo();
  try {
    r.write('index.html', 'x\n'); r.commit('root');
    r.git('checkout', '-q', '-b', 'side'); r.write('index.html', '<script>\n' + OLD + '</script>\n');
    const side = r.commit('side approved');
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(r.dir, 'index.html'))).digest('hex');
    r.git('tag', '-a', 'approved/t634', side, '-m', 'a'); r.git('checkout', '-q', 'main');
    r.write('docs/APPROVED_ART.json', JSON.stringify({schema: 1, approved: {T634: {tag: 'approved/t634', commit: side, index_sha256: sha}}, valves: {}}) + '\n');
    r.commit('registry');
    assert.throws(() => loadApproved(r.dir, 'T634'), /is not an ancestor of HEAD/);
  } finally { r.close(); }
});

test('later batch without a registered valve is red', () => red({later: T635}, /later batch T635 has no escape valve registered/));

test('later batch whose activation line ignores its valve is red', () =>
  red({later: 'function t635On(){return true;}\n', valves: {T635: '__noT635'}}, /later batch T635 activation line does not read !window.__noT635/));

test('registry on disk that differs from HEAD is red', () => red({}, /on disk differs from HEAD/, r => {
  fs.appendFileSync(path.join(r.dir, 'docs/APPROVED_ART.json'), ' ');
}));

test('base anchor is checked with the same rules', () => {
  const {r, approved, sha} = setup();
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(r.dir, 'docs/APPROVED_ART.json'), 'utf8'));
    reg.approved.T634.base = {tag: 'approved/t634', commit: approved, index_sha256: sha};
    r.write('docs/APPROVED_ART.json', JSON.stringify(reg) + '\n'); r.commit('with base');
    assert.equal(loadApproved(r.dir, 'T634').base.commit, approved);
    reg.approved.T634.base.index_sha256 = '0'.repeat(64);
    r.write('docs/APPROVED_ART.json', JSON.stringify(reg) + '\n'); r.commit('bad base');
    assert.throws(() => loadApproved(r.dir, 'T634'), /T647 T634: T634\.base: index\.html sha256/);
  } finally { r.close(); }
});
