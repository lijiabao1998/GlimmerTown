'use strict';
/** T627 release identity: which runtime is "this release" and which one is live.
 *
 * Current release (R1/R2): the seven runtime files of the checked-out commit, hashed from
 * git objects; the working tree must be byte-identical to those blobs and GITHUB_SHA, when
 * set, must be HEAD. GAME_VER (index.html) and APP_VER (sw.js) must each occur exactly once
 * and agree.
 * Previous release (R3): what https://lijiabao1998.github.io/GlimmerTown/ serves now. The
 * live bytes are un-namespaced, matched by git blob id against the first-parent history of
 * origin/main (newest match wins), the match must be an ancestor of HEAD, and packaging it
 * must reproduce the live bytes exactly. Every step fails closed; there is no fallback.
 * Local-only override: PAGES_PREV_COMMIT=<sha> (refused under CI, recorded as unverified).
 * Release delta (R4): if any runtime file differs, sw.js must differ and the version rise.
 *
 * CLI (JSON on stdout): node tools/pages/release-identity.cjs [--root=DIR] [--previous] [--json]
 * CommonJS so the .cjs harnesses can require it; ESM: import identity from './release-identity.cjs'.
 */
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ---- Strict literals (R7). Only hashes and versions are derived; these never are. ----
const RUNTIME_FILES = Object.freeze(['index.html', 'sw.js', 'manifest.json', 'icon.svg',
  'icon-v1-192.png', 'icon-v1-512.png', 'icon-v1-maskable-512.png']);
const PAGES_ORIGIN = 'https://lijiabao1998.github.io';
const PAGES_PATH = '/GlimmerTown/';
const PAGES_BASE = PAGES_ORIGIN + PAGES_PATH;
const SAVE_NAMESPACE = 'glimmerville.main.v1';
const CACHE_PREFIX = 'glimmerville-main-shell-';
const substitutions = Object.freeze({
  'index.html': Object.freeze([
    Object.freeze(["const SAVEKEY='glimmerville.v1';", `const SAVEKEY='${SAVE_NAMESPACE}';`])]),
  'sw.js': Object.freeze([
    Object.freeze(["const CACHE_PREFIX='glimmerville-shell-';", `const CACHE_PREFIX='${CACHE_PREFIX}';`]),
    Object.freeze(["const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);", 'const LEGACY_CACHES=new Set([]);'])])
});
const HARNESS_FILE = 'test_fixde.js';
const HARNESS_DOM_ANCHOR = '// ---- 載入 index.html 中的 script ----';
const HARNESS_DOM_PREFIX_SHA256 = '5a6bf931394f4ba4858f8e60cba7e692be8b8f9fe2d591858c12c951da93d507';
const MAIN_REF = 'refs/remotes/origin/main';
const MAIN_REFSPEC = '+refs/heads/main:refs/remotes/origin/main';
const HISTORY_DEPTHS = Object.freeze([100, 400]);
const LIVE_TRIES = 3;
const LIVE_TIMEOUT_MS = 60 * 1000;
const FROZEN_ESCAPE_FLAG = '__noT603';
const GAME_VER_RE = /const GAME_VER='(\d+(?:\.\d+){1,2})'/g;
const APP_VER_RE = /const APP_VER='(\d+(?:\.\d+){1,2})';/g;
const VERSION_FORMAT = /^\d+(?:\.\d+){1,2}$/;
const FULL_SHA = /^[0-9a-f]{40}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const REGULAR_MODES = new Set(['100644', '100755']);

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
/** Same id as `git hash-object --no-filters` in a SHA-1 repository. */
const gitBlobId = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function cacheName(version) { versionTuple(version); return CACHE_PREFIX + 'v' + version; }

function asBytes(value, label = 'bytes') {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  throw Error('Expected ' + label + ' as a Buffer');
}
function asText(value, label) {
  if (typeof value === 'string') return value;
  return asBytes(value, label).toString('utf8');
}

// ---- R2: version ----
function uniqueCapture(text, pattern, declaration, label) {
  const hits = [...text.matchAll(pattern)];
  const declared = (text.match(declaration) || []).length;
  if (hits.length !== 1 || declared !== 1)
    throw Error(`Expected exactly one ${label} declaration, found ${hits.length} well-formed of ${declared}`);
  return hits[0][1];
}
function parseVersion(indexText, swText) {
  const game = uniqueCapture(asText(indexText, 'index.html'), GAME_VER_RE, /\bconst\s+GAME_VER\b/g, 'index.html GAME_VER');
  const app = uniqueCapture(asText(swText, 'sw.js'), APP_VER_RE, /\bconst\s+APP_VER\b/g, 'sw.js APP_VER');
  if (game !== app) throw Error(`GAME_VER and APP_VER differ: index.html ${game}, sw.js ${app}`);
  return game;
}
function versionTuple(version) {
  if (typeof version !== 'string' || !VERSION_FORMAT.test(version)) throw Error('Invalid version: ' + JSON.stringify(version));
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw Error('Invalid version: ' + JSON.stringify(version));
  return parts;
}
/** Numeric tuple order; missing components count as 0 (11.2 == 11.2.0, 11.99 < 11.100). */
function compareVersions(a, b) {
  const x = versionTuple(a), y = versionTuple(b);
  for (let i = 0; i < 3; i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

// ---- Packaging: three namespace substitutions, nothing else ----
function requirePins(pins) {
  if (!pins || typeof pins !== 'object') throw Error('Source pins are required');
  return pins;
}
function packageFile(name, bytes, pins) {
  requirePins(pins); bytes = asBytes(bytes, name);
  if (!RUNTIME_FILES.includes(name) || !Object.hasOwn(pins, name) || sha256(bytes) !== pins[name])
    throw Error('Unverified main source: ' + name);
  const subs = substitutions[name];
  if (!subs) return Buffer.from(bytes);
  let text = bytes.toString('utf8');
  for (const [from, to] of subs) {
    const parts = text.split(from);
    if (parts.length !== 2) throw Error('Expected unique namespace anchor: ' + name);
    text = parts[0] + to + parts[1];
  }
  return Buffer.from(text);
}
/** Reverse of packageFile without any pin: each packaged ("to") anchor must occur exactly once. */
function unpackageFile(name, bytes) {
  if (!RUNTIME_FILES.includes(name)) throw Error('Not a runtime file: ' + name);
  bytes = asBytes(bytes, name);
  const subs = substitutions[name];
  if (!subs) return Buffer.from(bytes);
  let text = bytes.toString('utf8');
  for (const [from, to] of [...subs].reverse()) {
    const parts = text.split(to);
    if (parts.length !== 2) throw Error('Expected unique packaged namespace: ' + name);
    text = parts[0] + from + parts[1];
  }
  return Buffer.from(text);
}
function verifyPackagedFile(name, bytes, pins) {
  requirePins(pins); bytes = asBytes(bytes, name);
  if (!RUNTIME_FILES.includes(name) || !Object.hasOwn(pins, name)) throw Error('Unexpected change outside namespace: ' + name);
  const original = unpackageFile(name, bytes);
  if (sha256(original) !== pins[name]) throw Error('Unexpected change outside namespace: ' + name);
  // Round trip on bytes, so lossy UTF-8 decoding can never hide a changed byte.
  if (!packageFile(name, original, pins).equals(bytes)) throw Error('Unexpected change outside namespace: ' + name);
  return true;
}
function packageRelease(release) {
  return new Map(RUNTIME_FILES.map(name => [name, packageFile(name, release.files.get(name), release.sourcePins)]));
}

// ---- git, from objects only ----
const GIT_ENV_STRIP = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_PREFIX', 'GIT_QUARANTINE_PATH'];
function gitEnv() {
  const env = { ...process.env };
  for (const key of GIT_ENV_STRIP) delete env[key];
  return env;
}
function git(root, args, { input, allowStatus = [0], timeout = 15 * 60 * 1000 } = {}) {
  const r = spawnSync('git', ['-C', root, ...args], { input, maxBuffer: 1 << 30, windowsHide: true, env: gitEnv(), timeout });
  if (r.error) throw Error(`git ${args[0]} could not run: ${r.error.message}`);
  if (!allowStatus.includes(r.status))
    throw Error(`git ${args.join(' ')} failed (${r.status}): ${String(r.stderr || '').trim()}`);
  return { status: r.status, stdout: r.stdout };
}
const gitOut = (root, args, opts) => git(root, args, opts).stdout;
function resolveCommit(root, rev) {
  if (typeof rev !== 'string' || !rev || rev.startsWith('-') || /[\s:]/.test(rev)) throw Error('Invalid revision: ' + JSON.stringify(rev));
  const sha = gitOut(root, ['rev-parse', '--verify', '--end-of-options', rev + '^{commit}']).toString().trim();
  if (!FULL_SHA.test(sha)) throw Error('Unexpected commit id for ' + rev + ': ' + sha);
  return sha;
}
function hasCommit(root, sha) {
  return git(root, ['cat-file', '-e', sha + '^{commit}'], { allowStatus: [0, 1, 128] }).status === 0;
}
function refExists(root, ref) {
  return git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', ref + '^{commit}'], { allowStatus: [0, 1] }).status === 0;
}
function isShallow(root) {
  const out = gitOut(root, ['rev-parse', '--is-shallow-repository']).toString().trim();
  if (out !== 'true' && out !== 'false') throw Error('Cannot tell whether the repository is shallow: ' + out);
  return out === 'true';
}
function isAncestor(root, ancestor, descendant) {
  return git(root, ['merge-base', '--is-ancestor', ancestor, descendant], { allowStatus: [0, 1] }).status === 0;
}
function sameDirectory(a, b) {
  const norm = p => { const r = fs.realpathSync.native(p); return process.platform === 'win32' ? r.toLowerCase() : r; };
  return norm(a) === norm(b);
}
function assertWorktreeRoot(root) {
  const top = gitOut(root, ['rev-parse', '--show-toplevel']).toString().trim();
  if (!top || !sameDirectory(top, root)) throw Error(`Release root must be the worktree top level: ${root} (git: ${top})`);
}
function readFileAt(root, commit, file) {
  if (typeof file !== 'string' || !file || file.startsWith('/') || file.split(/[\\/]/).includes('..'))
    throw Error('Invalid repository path: ' + JSON.stringify(file));
  return gitOut(root, ['cat-file', 'blob', `${commit}:${file}`]);
}
function parseLsTree(buffer) {
  const entries = new Map();
  for (const record of buffer.toString('utf8').split('\0')) {
    if (!record) continue;
    const m = /^(\d{6}) (\w+) ([0-9a-f]{40,64})\t(.+)$/s.exec(record);
    if (!m) throw Error('Unexpected ls-tree record: ' + JSON.stringify(record));
    entries.set(m[4], { mode: m[1], type: m[2], oid: m[3] });
  }
  return entries;
}

/** The seven runtime files of `commit`, read only from git objects. */
function releaseAt(root, commit) {
  root = path.resolve(root);
  const sha = resolveCommit(root, commit);
  const tree = parseLsTree(gitOut(root, ['ls-tree', '-z', '--full-tree', sha, '--', ...RUNTIME_FILES]));
  const files = new Map(), sourcePins = {}, blobIds = {};
  for (const name of RUNTIME_FILES) {
    const entry = tree.get(name);
    if (!entry) throw Error(`Runtime file missing at ${sha}: ${name}`);
    if (entry.type !== 'blob' || !REGULAR_MODES.has(entry.mode))
      throw Error(`Expected regular runtime file at ${sha}: ${name} (mode ${entry.mode} ${entry.type})`);
    const bytes = gitOut(root, ['cat-file', 'blob', entry.oid]);
    if (gitBlobId(bytes) !== entry.oid) throw Error(`Blob bytes do not hash to their object id: ${name}`);
    files.set(name, bytes); sourcePins[name] = sha256(bytes); blobIds[name] = entry.oid;
  }
  const version = parseVersion(files.get('index.html'), files.get('sw.js'));
  return Object.freeze({ commit: sha, version, cacheName: cacheName(version), sourcePins: Object.freeze(sourcePins),
    blobIds: Object.freeze(blobIds), files, readFile: file => readFileAt(root, sha, file) });
}

/** R1: the checked-out commit; the working tree must be byte-identical to it. */
function currentRelease(root, { env = process.env } = {}) {
  root = path.resolve(root);
  assertWorktreeRoot(root);
  const head = resolveCommit(root, 'HEAD');
  if (env.GITHUB_SHA !== undefined && env.GITHUB_SHA !== head)
    throw Error(`GITHUB_SHA ${env.GITHUB_SHA} does not match checked-out HEAD ${head}`);
  const release = releaseAt(root, head);
  for (const name of RUNTIME_FILES) {
    const file = path.join(root, name);
    const stat = fs.lstatSync(file, { throwIfNoEntry: false });
    if (!stat || stat.isSymbolicLink() || !stat.isFile() || !fs.readFileSync(file).equals(release.files.get(name)))
      throw Error('Runtime file differs from committed HEAD: ' + name);
  }
  return Object.freeze({ ...release, source: 'HEAD' });
}

// ---- History: fetched by the scripts themselves, never by a workflow edit ----
function fetchGit(root, args) { gitOut(root, args); }
/** Fetch commits that are not present. A complete repository is never made shallow. */
function ensureObjects(root, commits, { fetchGit: fetcher = fetchGit } = {}) {
  root = path.resolve(root);
  for (const sha of commits) {
    if (typeof sha !== 'string' || !FULL_SHA.test(sha)) throw Error('ensureObjects needs full commit ids: ' + JSON.stringify(sha));
    if (hasCommit(root, sha)) continue;
    fetcher(root, ['fetch', '--no-tags', ...(isShallow(root) ? ['--depth=1'] : []), 'origin', sha]);
    if (!hasCommit(root, sha)) throw Error('Commit is not available after fetch: ' + sha);
  }
  return commits;
}
/** Deepen origin/main (and HEAD's own history when shallow) until satisfied() reports done:
 * shallow: --depth=100, --depth=400, --unshallow; complete: one plain refresh of origin/main. */
function ensureMainHistory(root, { satisfied, head, fetchGit: fetcher = fetchGit }) {
  root = path.resolve(root);
  for (let attempt = 0; ; attempt++) {
    const state = satisfied();
    if (state.done) return state.value;
    const shallow = isShallow(root);
    const steps = shallow ? [...HISTORY_DEPTHS.map(d => ['--depth=' + d]), ['--unshallow']] : [[]];
    if (attempt >= steps.length) throw Error(state.reason);
    const wants = [MAIN_REFSPEC];
    if (shallow && head) wants.push(head);
    fetcher(root, ['fetch', '--no-tags', ...steps[attempt], 'origin', ...wants]);
  }
}
/** Newest commit on the first-parent chain of `ref` whose seven blob ids all equal blobIds. */
function findReleaseCommit(root, blobIds, ref = MAIN_REF) {
  if (!refExists(root, ref)) return null;
  const chain = gitOut(root, ['rev-list', '--first-parent', ref, '--']).toString().split('\n').filter(Boolean);
  if (!chain.length) return null;
  const input = chain.flatMap(c => RUNTIME_FILES.map(n => `${c}:${n}`)).join('\n') + '\n';
  const lines = gitOut(root, ['cat-file', '--batch-check=%(objectname) %(objecttype)'], { input }).toString().split('\n');
  if (lines.length !== chain.length * RUNTIME_FILES.length + 1) throw Error('Unexpected cat-file batch output');
  for (let i = 0; i < chain.length; i++) {
    const hit = RUNTIME_FILES.every((name, j) => {
      const [oid, type] = lines[i * RUNTIME_FILES.length + j].split(' ');
      return type === 'blob' && oid === blobIds[name];
    });
    if (hit) return chain[i];
  }
  return null;
}

// ---- R3: the live release ----
const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));
/** GET one runtime file from the Pages site: no-store, no redirects, 200 only, 3 tries. */
async function fetchLiveFile(name, { fetchImpl = globalThis.fetch, sleep = defaultSleep } = {}) {
  if (!RUNTIME_FILES.includes(name)) throw Error('Not a runtime file: ' + name);
  let last;
  for (let attempt = 1; attempt <= LIVE_TRIES; attempt++) {
    const url = new URL(name, PAGES_BASE);
    url.searchParams.set('release-probe', randomUUID());
    try {
      if (url.origin !== PAGES_ORIGIN || url.pathname !== PAGES_PATH + name) throw Error('Unexpected live URL ' + url.href);
      const res = await fetchImpl(url.href, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } });
      if (res.redirected) throw Error('redirected');
      if (res.status !== 200) throw Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      last = error;
      if (attempt < LIVE_TRIES) await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw Error(`Live fetch failed after ${LIVE_TRIES} tries: ${name}: ${last && last.message}`);
}
function inCI(env) {
  const ci = String(env.CI ?? '').trim().toLowerCase();
  return (ci !== '' && ci !== 'false' && ci !== '0') || String(env.GITHUB_ACTIONS ?? '').trim().toLowerCase() === 'true';
}
function overrideRelease(root, value, head, env, fetcher) {
  if (inCI(env)) throw Error('PAGES_PREV_COMMIT is a local-only override and is refused under CI');
  if (!/^[0-9a-f]{7,40}$/.test(value)) throw Error('PAGES_PREV_COMMIT must be a lowercase hex commit id');
  if (FULL_SHA.test(value)) ensureObjects(root, [value], { fetchGit: fetcher });
  const sha = resolveCommit(root, value);
  if (!isAncestor(root, sha, head)) throw Error(`Previous release ${sha} is not an ancestor of HEAD ${head}`);
  const release = releaseAt(root, sha);
  return Object.freeze({ ...release, source: 'override-unverified', liveSHA256: null, liveFiles: null,
    packagedFiles: packageRelease(release) });
}
async function previousRelease(root, { fetchLive = fetchLiveFile, env = process.env, fetchGit: fetcher = fetchGit, mainRef = MAIN_REF } = {}) {
  root = path.resolve(root);
  const head = resolveCommit(root, 'HEAD');
  const override = env.PAGES_PREV_COMMIT;
  if (override !== undefined && override !== '') return overrideRelease(root, override, head, env, fetcher);
  // 1. the seven live files
  const live = new Map();
  for (const name of RUNTIME_FILES) {
    const bytes = Buffer.from(asBytes(await fetchLive(name), 'live ' + name));
    if (!bytes.length) throw Error('Live file is empty: ' + name);
    live.set(name, bytes);
  }
  // 2-3. undo the namespace substitutions, then blob ids
  const blobIds = {};
  for (const [name, bytes] of live) blobIds[name] = gitBlobId(unpackageFile(name, bytes));
  // 4-5. newest first-parent origin/main match that is an ancestor of HEAD
  const prev = ensureMainHistory(root, { head, fetchGit: fetcher, satisfied: () => {
    const found = findReleaseCommit(root, blobIds, mainRef);
    if (!found) return { done: false, reason: 'Live release matches no first-parent commit on origin/main' };
    if (!isAncestor(root, found, head)) return { done: false, reason: `Previous release ${found} is not an ancestor of HEAD ${head}` };
    return { done: true, value: found };
  } });
  const release = releaseAt(root, prev);
  for (const name of RUNTIME_FILES)
    if (release.blobIds[name] !== blobIds[name]) throw Error('Previous release blob changed under lookup: ' + name);
  // 6. packaging PREV must give the live bytes exactly
  const packagedFiles = packageRelease(release);
  for (const name of RUNTIME_FILES)
    if (!packagedFiles.get(name).equals(live.get(name))) throw Error('Packaged previous release differs from live: ' + name);
  const liveSHA256 = Object.freeze(Object.fromEntries([...live].map(([name, bytes]) => [name, sha256(bytes)])));
  return Object.freeze({ ...release, source: 'live', liveSHA256, liveFiles: live, packagedFiles });
}

// ---- R4: what counts as a release ----
function checkRelease(label, release) {
  if (!release || !release.sourcePins) throw Error(`${label} release is missing`);
  for (const name of RUNTIME_FILES)
    if (!SHA256_HEX.test(release.sourcePins[name])) throw Error(`${label} release lacks a source pin: ${name}`);
  versionTuple(release.version);
}
function releaseDelta(prev, cur) {
  checkRelease('previous', prev); checkRelease('current', cur);
  const changedFiles = RUNTIME_FILES.filter(name => prev.sourcePins[name] !== cur.sourcePins[name]);
  const base = { previousVersion: prev.version, currentVersion: cur.version };
  if (!changedFiles.length) {
    if (prev.version !== cur.version) throw Error(`Identical runtime with different versions: ${prev.version} -> ${cur.version}`);
    return Object.freeze({ runtimeChanged: false, changedFiles: Object.freeze([]), ...base });
  }
  if (compareVersions(cur.version, prev.version) <= 0)
    throw Error(`Runtime changed (${changedFiles.join(', ')}), so the version must increase: ${prev.version} -> ${cur.version}`);
  if (!changedFiles.includes('sw.js'))
    throw Error(`Runtime changed (${changedFiles.join(', ')}) but sw.js did not; installed players would never update`);
  return Object.freeze({ runtimeChanged: true, changedFiles: Object.freeze(changedFiles), ...base });
}
const escapeFlags = text => new Set([...asText(text, 'index.html').matchAll(/window\.(__noT\d{3,})\b/g)].map(m => m[1]));
/** window.__noT### flags present in the current index but not in PREV (T603's own flag excluded). */
function newEscapeFlags(prevIndex, curIndex) {
  const before = escapeFlags(prevIndex);
  return [...escapeFlags(curIndex)].filter(flag => flag !== FROZEN_ESCAPE_FLAG && !before.has(flag)).sort();
}

// ---- The DOM/BOM mock prefix of test_fixde.js ----
function harnessDomPrefixOf(bytes) {
  bytes = asBytes(bytes, HARNESS_FILE);
  const anchor = Buffer.from(HARNESS_DOM_ANCHOR, 'utf8');
  const at = bytes.indexOf(anchor);
  if (at < 0 || bytes.indexOf(anchor, at + 1) >= 0) throw Error('Expected exactly one harness DOM anchor in ' + HARNESS_FILE);
  const prefix = bytes.subarray(0, at);
  if (sha256(prefix) !== HARNESS_DOM_PREFIX_SHA256) throw Error('Harness DOM prefix changed in ' + HARNESS_FILE);
  return prefix.toString('utf8');
}
function harnessDomPrefix(root) {
  return harnessDomPrefixOf(fs.readFileSync(path.join(path.resolve(root), HARNESS_FILE)));
}

// ---- Synchronous pair for synchronous callers (scene603) ----
function describeRelease(release) {
  const out = { commit: release.commit, version: release.version, cacheName: release.cacheName,
    source: release.source, sourcePins: release.sourcePins, blobIds: release.blobIds };
  if (release.liveSHA256 !== undefined) out.liveSHA256 = release.liveSHA256;
  return out;
}
function releasePairSync(root, { env = process.env, timeout = 20 * 60 * 1000 } = {}) {
  root = path.resolve(root);
  const r = spawnSync(process.execPath, [__filename, '--root=' + root, '--previous', '--json'],
    { env, encoding: 'utf8', maxBuffer: 64 << 20, windowsHide: true, timeout });
  if (r.error) throw Error('Release identity could not run: ' + r.error.message);
  if (r.status !== 0) throw Error('Release identity failed: ' + String(r.stderr || '').trim());
  const resolved = JSON.parse(r.stdout);
  const current = currentRelease(root, { env });
  if (resolved.current.commit !== current.commit) throw Error('HEAD moved while the previous release was resolved');
  const found = releaseAt(root, resolved.previous.commit);
  for (const name of RUNTIME_FILES)
    if (found.blobIds[name] !== resolved.previous.blobIds[name]) throw Error('Previous release changed between processes: ' + name);
  const previous = Object.freeze({ ...found, source: resolved.previous.source, liveSHA256: resolved.previous.liveSHA256 });
  return Object.freeze({ current, previous, delta: releaseDelta(previous, current),
    newEscapeFlags: newEscapeFlags(previous.files.get('index.html'), current.files.get('index.html')) });
}

async function main(args) {
  let root = path.resolve(__dirname, '../..'), previous = false;
  const seen = new Set();
  for (const arg of args) {
    const key = arg.split('=')[0];
    if (seen.has(key)) throw Error('Duplicate option: ' + key);
    seen.add(key);
    if (arg === '--previous') previous = true;
    else if (arg === '--json') continue;
    else if (arg.startsWith('--root=') && arg.length > 7) root = path.resolve(arg.slice(7));
    else throw Error('Unknown option: ' + arg);
  }
  const current = currentRelease(root);
  const out = { current: describeRelease(current) };
  if (previous) {
    const prev = await previousRelease(root);
    out.previous = describeRelease(prev);
    out.delta = releaseDelta(prev, current);
    out.newEscapeFlags = newEscapeFlags(prev.files.get('index.html'), current.files.get('index.html'));
  }
  return JSON.stringify(out, null, 2) + '\n';
}

module.exports = {
  RUNTIME_FILES, PAGES_ORIGIN, PAGES_PATH, PAGES_BASE, SAVE_NAMESPACE, CACHE_PREFIX, substitutions,
  HARNESS_FILE, HARNESS_DOM_ANCHOR, HARNESS_DOM_PREFIX_SHA256, MAIN_REF, FROZEN_ESCAPE_FLAG,
  sha256, gitBlobId, cacheName, parseVersion, compareVersions,
  packageFile, verifyPackagedFile, unpackageFile, packageRelease,
  releaseAt, currentRelease, ensureObjects, ensureMainHistory, findReleaseCommit, fetchGit,
  fetchLiveFile, previousRelease, releaseDelta, newEscapeFlags, harnessDomPrefix, harnessDomPrefixOf,
  describeRelease, releasePairSync
};

if (require.main === module) {
  main(process.argv.slice(2)).then(
    text => process.stdout.write(text, () => process.exit(0)),
    error => process.stderr.write(String(error && error.stack || error) + '\n', () => process.exit(1)));
}
