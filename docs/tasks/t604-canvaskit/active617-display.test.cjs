'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const display = require('./active617-display.cjs'), { build } = require('./active617-build.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'display617-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return path.join(root, 'prepared');
}
const source = display.sourceFromHarness(build().source);
function compiler(command, args, options) {
  assert.equal(command, '/usr/bin/xcrun'); assert.equal(args[0], 'swiftc');
  assert.equal(options.timeout, 120000); assert.equal(options.terminationGraceMs, 2000);
  assert.equal(fs.readFileSync(args[1], 'utf8'), source);
  fs.writeFileSync(args[3], 'test compiled binary');
  return { status: 0, stdout: '', stderr: '' };
}
test('extracted display source equals exact original foreground helper bytes', () => {
  const foreground = fs.readFileSync(path.join(__dirname, '../t603-shots/foreground603.js'), 'utf8');
  const declarations = [...foreground.matchAll(/^const displaySwift=(.*);$/gm)];
  assert.equal(declarations.length, 1);
  assert.equal(source, JSON.parse(declarations[0][1]));
});
test('exact display source compiles once and all actions retain arguments', async t => {
  const dir = fixture(t); let compiled = 0;
  const p = await display.prepare(dir, source, (...args) => { compiled++; return compiler(...args); }, 'darwin');
  assert.equal(compiled, 1); assert.equal(p.boundMs, 120000);
  assert.equal(p.terminationGraceMs, 2000); assert.equal(p.resourceBoundMs, 122000);
  const calls = [], run = (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: '{"ok":true,"restoreID":42}', stderr: '' };
  };
  for (const action of ['inspect', 'prepare', 'restore']) {
    assert.equal(display.invoke(source, p.manifest, action, action === 'restore' ? 42 : undefined, run).ok, true);
  }
  assert.deepEqual(calls.map(c => c.args), [['inspect'], ['prepare'], ['restore', '42']]);
  assert(calls.every(c => c.command === p.binaryPath && c.options.timeout === 60000 && c.options.killSignal === 'SIGKILL'));
  await assert.rejects(display.prepare(dir, source, compiler, 'darwin'), /exist/i);
});
test('compile failure, timeout, missing executable and unsupported platform fail closed', async t => {
  for (const result of [{ status: 1, stderr: 'error' }, { status: null, error: Error('ETIMEDOUT'), stderr: '' },
    { status: 0, timedOut: true, stderr: '' }, { status: 0, stderr: '' }]) {
    const dir = fixture(t);
    await assert.rejects(display.prepare(dir, source, () => result, 'darwin'), /compilation failed/);
    assert(fs.existsSync(path.join(dir, 'compile.json')));
    assert(!fs.existsSync(path.join(dir, 'manifest.json')));
  }
  await assert.rejects(display.prepare(fixture(t), source, compiler, 'linux'), /macOS/);
});
test('source or executable replacement and missing identity never execute', async t => {
  const p = await display.prepare(fixture(t), source, compiler, 'darwin');
  let calls = 0; const run = () => { calls++; throw Error('must not execute'); };
  assert.throws(() => display.invoke(source + ' ', p.manifest, 'inspect', undefined, run), /identity mismatch/);
  assert.throws(() => display.invoke(source, null, 'inspect', undefined, run), /identity/);
  assert.throws(() => display.invoke(source, p.manifest, 'other', undefined, run), /action/);
  fs.appendFileSync(p.binaryPath, 'corrupt');
  assert.throws(() => display.invoke(source, p.manifest, 'restore', 42, run), /identity mismatch/);
  assert.equal(calls, 0);
});
test('malformed helper output and invocation timeout fail closed', async t => {
  const p = await display.prepare(fixture(t), source, compiler, 'darwin');
  assert.throws(() => display.invoke(source, p.manifest, 'inspect', undefined, () => ({ status: 0, stdout: 'bad' })), /JSON/);
  assert.throws(() => display.invoke(source, p.manifest, 'inspect', undefined, () => ({ status: null, error: Error('ETIMEDOUT') })), /invocation failed/);
});
test('generated overlay has no Swift interpreter invocation and retains setup bound', () => {
  const s = build().source;
  assert(!s.includes('spawnSync("/usr/bin/xcrun",["swift"'));
  assert(s.includes('p617.preparationAdmission.original.passed'));assert(s.includes("T617 setup fits fixed 60-second bound"));
  assert(s.includes('setupStages617.gameReadyMs')); assert(s.includes('setupStages617.fixtureReadyMs'));
  assert.throws(() => display.sourceFromHarness(s + 'const displaySwift603=1;'), /boundary/);
  assert.throws(() => display.sourceFromHarness(s.replace('const displaySwift603=', 'const missing=')), /boundary/);
});
test('compiler spawn failure returns an explicit failed result', async t => {
  const result = await display.compile(path.join(fixture(t), 'missing-compiler'), []);
  assert(result.error); assert.notEqual(result.status, 0); assert.equal(result.timedOut, false);
});
for (const driverIgnoresTerm of [false, true]) {
  test('compiler timeout kills descendants when driver ' + (driverIgnoresTerm ? 'ignores SIGTERM' : 'exits on SIGTERM'),
    { skip: process.platform === 'win32' }, async t => {
      const heartbeat = fixture(t), pids = [];
      t.after(() => { for (const pid of pids) try { process.kill(pid, 'SIGKILL'); } catch {} });
      const childCode = 'const fs=require("node:fs");process.on("SIGTERM",()=>{});' +
        'fs.writeFileSync(' + JSON.stringify(heartbeat) + ',"ready");console.log(process.pid);' +
        'setInterval(()=>fs.appendFileSync(' + JSON.stringify(heartbeat) + ',"."),10);';
      const driverCode = (driverIgnoresTerm ? 'process.on("SIGTERM",()=>{});' : '') +
        'console.log(process.pid);const child=require("node:child_process").spawn(process.execPath,["-e",' +
        JSON.stringify(childCode) + '],{stdio:["ignore","pipe","ignore"]});' +
        'child.stdout.on("data",data=>process.stdout.write(data));setInterval(()=>{},1000);';
      const result = await display.compile(process.execPath, ['-e', driverCode], { timeout: 400, terminationGraceMs: 100 });
      pids.push(...result.stdout.trim().split(/\s+/).map(Number).filter(n => Number.isInteger(n) && n > 1));
      assert.equal(result.timedOut, true); assert.notEqual(result.status, 0);
      assert.equal(pids.length, 2, 'driver and stubborn frontend both started');
      await new Promise(resolve => setTimeout(resolve, 50));
      const stopped = fs.readFileSync(heartbeat, 'utf8');
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(fs.readFileSync(heartbeat, 'utf8'), stopped, 'frontend stopped writing after timeout');
      for (const pid of pids) {
        const processState = spawnSync('ps', ['-p', String(pid), '-o', 'stat='], { encoding: 'utf8' }).stdout.trim();
        // Some container init processes delay reaping dead orphaned children.
        assert(!processState || /^Z/.test(processState), 'no live compiler process remains: ' + pid + ' ' + processState);
      }
    });
}
