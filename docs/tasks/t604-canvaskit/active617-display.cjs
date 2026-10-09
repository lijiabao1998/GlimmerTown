'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function compile(command, args, { timeout = 120000, terminationGraceMs = 2000 } = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, { detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', error = null, timedOut = false, hardTimer;
    child.stdout.on('data', data => { stdout = (stdout + data).slice(-65536); });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-65536); });
    const kill = signal => {
      if (!child.pid) return;
      try { if (process.platform === 'win32') child.kill(signal); else process.kill(-child.pid, signal); } catch {}
    };
    const timer = setTimeout(() => {
      timedOut = true; kill('SIGTERM');
      hardTimer = setTimeout(() => kill('SIGKILL'), terminationGraceMs);
    }, timeout);
    child.on('error', failure => { error = String(failure); });
    child.on('close', (status, signal) => {
      // The compiler driver can exit after SIGTERM while a frontend survives.
      // Kill the group again before clearing its outstanding hard deadline.
      if (timedOut) kill('SIGKILL');
      clearTimeout(timer); clearTimeout(hardTimer);
      resolve({ status, signal, error, timedOut, stdout, stderr });
    });
  });
}
function sourceFromHarness(source) {
  const start = 'const displaySwift603=', end = ';\nconst configureDisplay603=';
  if (source.split(start).length !== 2 || source.split(end).length !== 2) throw Error('T617 exact display helper boundary drift');
  return JSON.parse(source.split(start)[1].split(end)[0]);
}
async function prepare(directory, source, runner = compile, platform = process.platform) {
  if (platform !== 'darwin') throw Error('T617 display preparation requires approved macOS runner');
  const started = Date.now();
  fs.mkdirSync(directory, { recursive: false });
  const sourcePath = path.join(directory, 'display603.swift'), binaryPath = path.join(directory, 'display603');
  fs.writeFileSync(sourcePath, source);
  const result = await runner('/usr/bin/xcrun', ['swiftc', sourcePath, '-o', binaryPath],
    { timeout: 120000, terminationGraceMs: 2000 });
  const receipt = { sourceSHA256: hash(source), binaryPath, compiler: '/usr/bin/xcrun swiftc',
    boundMs: 120000, terminationGraceMs: 2000, resourceBoundMs: 122000,
    elapsedMs: Date.now() - started, exitCode: result.status, timedOut: !!result.timedOut,
    signal: result.signal, error: result.error ? String(result.error) : null, stderr: result.stderr };
  fs.writeFileSync(path.join(directory, 'compile.json'), JSON.stringify(receipt, null, 2));
  if (result.status !== 0 || result.error || result.timedOut || receipt.elapsedMs > 120000 || !fs.existsSync(binaryPath)) throw Error('T617 exact display helper compilation failed or exceeded bound');
  receipt.binarySHA256 = hash(fs.readFileSync(binaryPath));
  const manifest = path.join(directory, 'manifest.json');
  fs.writeFileSync(manifest, JSON.stringify(receipt, null, 2));
  return { ...receipt, manifest };
}
function invoke(source, manifestPath, action, id, runner = spawnSync) {
  if (!manifestPath || !['inspect', 'prepare', 'restore'].includes(action)) throw Error('T617 prepared display identity/action missing');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.sourceSHA256 !== hash(source) || manifest.binarySHA256 !== hash(fs.readFileSync(manifest.binaryPath))) throw Error('T617 prepared display source/binary identity mismatch');
  const started = Date.now();
  const result = runner(manifest.binaryPath, [action, ...(id === undefined ? [] : [String(id)])],
    { encoding: 'utf8', timeout: 60000, killSignal: 'SIGKILL' });
  if (result.error) throw Error('T617 display invocation failed: ' + result.error);
  let data;
  try { data = JSON.parse(result.stdout); } catch { throw Error('T617 prepared display did not return JSON: ' + String(result.stderr).slice(-3000)); }
  return { ...data, exitCode: result.status, stderr: result.stderr, elapsedMs: Date.now() - started,
    sourceSHA256: manifest.sourceSHA256, binarySHA256: manifest.binarySHA256 };
}
module.exports = { sourceFromHarness, prepare, invoke, compile };
