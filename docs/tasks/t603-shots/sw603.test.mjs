/** Pure Node contract tests. No browser execution or pixel claim.
 * Run: node --test docs/tasks/t603-shots/sw603.test.mjs
 * Optional target: SW_TEST_TARGET=/absolute/path/to/sw.js node --test ...
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const target = process.env.SW_TEST_TARGET ?? fileURLToPath(new URL('../../../sw.js', import.meta.url));
const source = readFileSync(target, 'utf8');
const original = readFileSync(new URL('./fixtures/sw-before-lifetime603.js', import.meta.url), 'utf8');
const ORIGIN = 'https://example.test';
const SCOPE = `${ORIGIN}/GlimmerTown/`;
const INDEX = `${SCOPE}index.html`;
const MANIFEST = `${SCOPE}manifest.json`;
const CACHE = 'glimmerville-shell-v11.212';
const turn = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function observe(promise) {
  const state = { status: 'pending' };
  Promise.resolve(promise).then(
    value => { state.status = 'fulfilled'; state.value = value; },
    error => { state.status = 'rejected'; state.error = error; }
  );
  return state;
}

async function bounded(promise, label = 'promise') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} did not settle within 1000 ms`)), 1000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function boot(overrides = {}, code = source) {
  const listeners = new Map();
  const calls = { fetch: [], open: [], put: [], match: [] };
  const cache = {
    put(key, value) {
      calls.put.push({ key, value });
      return overrides.put ? overrides.put(key, value) : value.text().then(() => {});
    },
    match(key, options) {
      calls.match.push({ key, options });
      return overrides.match ? overrides.match(key, options) : Promise.resolve(undefined);
    }
  };
  const context = {
    URL, Response, Promise, Set,
    self: {
      location: new URL(`${SCOPE}sw.js`),
      registration: { scope: SCOPE },
      addEventListener(name, callback) { listeners.set(name, callback); },
      skipWaiting() { return Promise.resolve(); },
      clients: { claim() { return Promise.resolve(); } }
    },
    caches: {
      open(name) {
        calls.open.push(name);
        return overrides.open ? overrides.open(name, cache) : Promise.resolve(cache);
      }
    },
    fetch(request) {
      calls.fetch.push(request);
      return overrides.fetch ? overrides.fetch(request) : Promise.resolve(new Response('fresh html'));
    }
  };
  vm.runInNewContext(code, context, { filename: target });
  function dispatch(request = {}) {
    let active = true;
    const event = {
      request: { method: 'GET', mode: 'navigate', url: SCOPE, ...request },
      response: undefined,
      lifetimes: [],
      respondWith(value) {
        assert.equal(active, true, 'respondWith must be called synchronously during dispatch');
        assert.equal(this.response, undefined, 'respondWith must be called once');
        this.response = Promise.resolve(value);
      },
      waitUntil(value) {
        assert.equal(active, true, 'waitUntil must be called synchronously during dispatch');
        this.lifetimes.push(Promise.resolve(value));
      }
    };
    try { listeners.get('fetch')(event); } finally { active = false; }
    return event;
  }
  return { dispatch, calls, cache };
}

function entryLifetime(event) {
  assert.equal(event.lifetimes.length, 1, 'entry navigation must register one lifetime promise synchronously');
  return event.lifetimes[0];
}

async function plain503(event) {
  const response = await bounded(event.response);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Content-Type'), 'text/plain;charset=utf-8');
  assert.equal(await response.text(), '離線且尚未完成首次快取。');
  if (event.lifetimes.length) await bounded(entryLifetime(event));
}

test('scope, versions, install/activate, manifest and asset source stay byte-identical', () => {
  assert.equal(createHash('sha256').update(original).digest('hex'), '37a150eb00a391630b76c0afb3b9176a846606dc57ef5a4d4e5111ae8044807c', 'immutable pre-repair SW fixture');
  const head = "  if(req.mode==='navigate'){";
  const tail = '  if(url.pathname===new URL(MANIFEST_URL).pathname){';
  assert.equal(source.slice(0, source.indexOf(head)), original.slice(0, original.indexOf(head)));
  assert.equal(source.slice(source.indexOf(tail)), original.slice(original.indexOf(tail)));
});

test('entry waitUntil is registered synchronously while network fetch is pending', async () => {
  const network = deferred();
  const worker = boot({ fetch: () => network.promise });
  const event = worker.dispatch();
  const life = observe(entryLifetime(event));
  const response = observe(event.response);
  await turn();
  assert.equal(life.status, 'pending');
  assert.equal(response.status, 'pending');
  network.resolve(new Response('network finished'));
  assert.equal(await (await bounded(event.response)).text(), 'network finished');
  await bounded(event.lifetimes[0]);
});

test('pending cache.open does not block response; clone precedes body consumption and survives it', async () => {
  const opening = deferred();
  const fresh = new Response('body remains available to both consumers');
  let clones = 0;
  const clone = fresh.clone.bind(fresh);
  fresh.clone = () => { clones++; return clone(); };
  let cachedBody;
  const worker = boot({
    fetch: () => Promise.resolve(fresh),
    open: () => opening.promise,
    put: async (_, copy) => { cachedBody = await copy.text(); }
  });
  const event = worker.dispatch();
  const returned = await bounded(event.response, 'network response while cache.open is pending');
  const life = observe(entryLifetime(event));
  assert.equal(returned, fresh);
  assert.equal(clones, 1);
  assert.equal(await returned.text(), 'body remains available to both consumers');
  assert.equal(fresh.bodyUsed, true);
  assert.deepEqual(worker.calls.open, [CACHE]);
  assert.equal(worker.calls.put.length, 0);
  assert.equal(life.status, 'pending');
  opening.resolve(worker.cache);
  await bounded(event.lifetimes[0]);
  assert.equal(cachedBody, 'body remains available to both consumers');
  assert.equal(worker.calls.put[0].key, INDEX);
  assert.notEqual(worker.calls.put[0].value, returned);
});

test('pending cache.put does not block response or body read; waitUntil lasts until put settles', async () => {
  const writing = deferred();
  const fresh = new Response('readable while cache write stalls');
  const worker = boot({ fetch: () => Promise.resolve(fresh), put: () => writing.promise });
  const event = worker.dispatch({ url: `${INDEX}?reload=1` });
  const returned = await bounded(event.response, 'network response while cache.put is pending');
  const life = observe(entryLifetime(event));
  assert.equal(returned, fresh);
  assert.equal(await returned.text(), 'readable while cache write stalls');
  await turn();
  assert.equal(worker.calls.put.length, 1);
  assert.equal(worker.calls.put[0].key, INDEX, 'cache uses canonical entry key without search');
  assert.equal(life.status, 'pending');
  assert.equal(await worker.calls.put[0].value.text(), 'readable while cache write stalls');
  writing.resolve();
  await bounded(event.lifetimes[0]);
  await turn();
  assert.equal(life.status, 'fulfilled');
});

test('waitUntil follows both pending open and subsequent pending put', async () => {
  const opening = deferred();
  const writing = deferred();
  const worker = boot({ open: () => opening.promise, put: () => writing.promise });
  const event = worker.dispatch();
  const life = observe(entryLifetime(event));
  assert.equal(await (await bounded(event.response)).text(), 'fresh html');
  await turn();
  assert.equal(life.status, 'pending');
  assert.equal(worker.calls.put.length, 0);
  opening.resolve(worker.cache);
  await turn();
  assert.equal(worker.calls.put.length, 1);
  assert.equal(life.status, 'pending');
  await worker.calls.put[0].value.text();
  writing.resolve();
  await bounded(event.lifetimes[0]);
  await turn();
  assert.equal(life.status, 'fulfilled');
});

test('streaming original body is delivered while complete cache write remains pending', async () => {
  let controller;
  const writing = deferred();
  const chunks = new TextEncoder();
  const fresh = new Response(new ReadableStream({ start(value) { controller = value; } }));
  let cachedBody;
  const worker = boot({
    fetch: () => Promise.resolve(fresh),
    put: async (_, copy) => {
      const text = copy.text();
      await writing.promise;
      cachedBody = await text;
    }
  });
  const event = worker.dispatch();
  const returned = await bounded(event.response);
  const life = observe(entryLifetime(event));
  const reader = returned.body.getReader();
  controller.enqueue(chunks.encode('first '));
  const first = await bounded(reader.read());
  assert.equal(new TextDecoder().decode(first.value), 'first ');
  assert.equal(first.done, false);
  assert.equal(life.status, 'pending');
  controller.enqueue(chunks.encode('second'));
  controller.close();
  const second = await bounded(reader.read());
  assert.equal(new TextDecoder().decode(second.value), 'second');
  assert.equal((await bounded(reader.read())).done, true);
  await turn();
  assert.equal(life.status, 'pending');
  writing.resolve();
  await bounded(event.lifetimes[0]);
  assert.equal(cachedBody, 'first second');
});

test('concurrent entry navigations retain their own independent write lifetimes', async () => {
  const writes = [deferred(), deferred()];
  let next = 0;
  const worker = boot({
    fetch: request => Promise.resolve(new Response(request.url)),
    put: () => writes[next++].promise
  });
  const first = worker.dispatch({ url: `${INDEX}?visit=one` });
  const second = worker.dispatch({ url: `${INDEX}?visit=two` });
  const firstLife = observe(entryLifetime(first));
  const secondLife = observe(entryLifetime(second));
  assert.equal(await (await bounded(first.response)).text(), `${INDEX}?visit=one`);
  assert.equal(await (await bounded(second.response)).text(), `${INDEX}?visit=two`);
  await turn();
  assert.equal(worker.calls.put.length, 2);
  writes[1].resolve();
  await bounded(second.lifetimes[0]);
  await turn();
  assert.equal(firstLife.status, 'pending');
  assert.equal(secondLife.status, 'fulfilled');
  writes[0].resolve();
  await bounded(first.lifetimes[0]);
  await Promise.all(worker.calls.put.map(call => call.value.text()));
});

for (const [name, hook] of [
  ['cache.open rejects', { open: () => Promise.reject(new Error('open rejected')) }],
  ['cache.open throws synchronously', { open: () => { throw new Error('open threw'); } }],
  ['cache.put rejects', { put: () => Promise.reject(new Error('put rejected')) }],
  ['cache.put throws synchronously', { put: () => { throw new Error('put threw'); } }]
]) {
  test(`${name}: successful response survives and lifetime fulfills`, async () => {
    const fresh = new Response(`success despite ${name}`);
    const worker = boot({ ...hook, fetch: () => Promise.resolve(fresh) });
    const event = worker.dispatch();
    const life = entryLifetime(event);
    assert.equal(await bounded(event.response), fresh);
    assert.equal(await fresh.text(), `success despite ${name}`);
    await bounded(life, 'contained cache failure');
    assert.equal(worker.calls.match.length, 0, 'cache failure must not trigger offline fallback');
    if (worker.calls.put.length) await worker.calls.put[0].value.text();
  });
}

test('delayed cache rejection after original body consumption remains contained', async () => {
  const writing = deferred();
  const worker = boot({ put: () => writing.promise });
  const event = worker.dispatch();
  const life = entryLifetime(event);
  assert.equal(await (await bounded(event.response)).text(), 'fresh html');
  await turn();
  writing.reject(new Error('late disk failure'));
  await bounded(life);
  assert.equal(await worker.calls.put[0].value.text(), 'fresh html');
});

test('clone failure keeps original successful response and skips cache storage', async () => {
  const fresh = new Response('unclonable but readable original');
  fresh.clone = () => { throw new TypeError('clone failed'); };
  const worker = boot({ fetch: () => Promise.resolve(fresh) });
  const event = worker.dispatch();
  assert.equal(await bounded(event.response), fresh);
  assert.equal(await fresh.text(), 'unclonable but readable original');
  await bounded(entryLifetime(event));
  assert.equal(worker.calls.open.length, 0);
  assert.equal(worker.calls.put.length, 0);
});

test('cache completion populates canonical entry and supports subsequent offline hit', async () => {
  const stored = new Map();
  let online = true;
  const worker = boot({
    fetch: () => online ? Promise.resolve(new Response('saved document')) : Promise.reject(new Error('offline')),
    put: async (key, response) => { stored.set(key, await response.text()); },
    match: async key => stored.has(key) ? new Response(stored.get(key)) : undefined
  });
  const onlineEvent = worker.dispatch({ url: `${INDEX}?visit=one` });
  assert.equal(await (await bounded(onlineEvent.response)).text(), 'saved document');
  await bounded(entryLifetime(onlineEvent));
  assert.equal(stored.get(INDEX), 'saved document');
  online = false;
  const offlineEvent = worker.dispatch();
  assert.equal(await (await bounded(offlineEvent.response)).text(), 'saved document');
  await bounded(entryLifetime(offlineEvent));
  assert.equal(worker.calls.put.length, 1);
  assert.equal(worker.calls.match.at(-1).key, INDEX);
});

for (const [name, hooks] of [
  ['cache miss', {}],
  ['cache.open rejection', { open: () => Promise.reject(new Error('unreadable cache')) }],
  ['cache.open synchronous exception', { open: () => { throw new Error('unreadable cache'); } }],
  ['cache.match rejection', { match: () => Promise.reject(new Error('read failed')) }],
  ['cache.match synchronous exception', { match: () => { throw new Error('read failed'); } }]
]) {
  test(`network failure plus ${name} returns original plain-text 503`, async () => {
    const worker = boot({ ...hooks, fetch: () => Promise.reject(new Error('offline')) });
    await plain503(worker.dispatch());
    assert.equal(worker.calls.put.length, 0);
  });
}

test('synchronous fetch exception still returns cached offline entry', async () => {
  const offline = new Response('previous entry');
  const worker = boot({ fetch: () => { throw new Error('network failure'); }, match: () => Promise.resolve(offline) });
  const event = worker.dispatch();
  assert.equal(await bounded(event.response), offline);
  assert.equal(await offline.text(), 'previous entry');
  await bounded(entryLifetime(event));
});

for (const status of [404, 500, 503]) {
  test(`HTTP ${status} response is unchanged and never cached`, async () => {
    const fresh = new Response(`HTTP ${status}`, { status });
    const worker = boot({ fetch: () => Promise.resolve(fresh) });
    const event = worker.dispatch();
    assert.equal(await bounded(event.response), fresh);
    assert.equal((await event.response).status, status);
    assert.equal(await fresh.text(), `HTTP ${status}`);
    await bounded(entryLifetime(event));
    assert.equal(worker.calls.open.length, 0);
  });
}

test('nonentry navigation remains network-first without cache writes or a new waitUntil', async () => {
  for (const code of [original, source]) {
    const fresh = new Response('other route');
    const worker = boot({ fetch: () => Promise.resolve(fresh) }, code);
    const event = worker.dispatch({ url: `${SCOPE}another-page.html` });
    assert.equal(await bounded(event.response), fresh);
    assert.equal(await fresh.text(), 'other route');
    assert.equal(event.lifetimes.length, 0);
    assert.equal(worker.calls.open.length, 0);
  }
});

test('nonentry navigation offline fallback remains canonical entry', async () => {
  for (const code of [original, source]) {
    const worker = boot({ fetch: () => Promise.reject(new Error('offline')), match: () => Promise.resolve(new Response('entry fallback')) }, code);
    const event = worker.dispatch({ url: `${SCOPE}another-page.html` });
    assert.equal(await (await bounded(event.response)).text(), 'entry fallback');
    assert.equal(worker.calls.match[0].key, INDEX);
    assert.equal(event.lifetimes.length, 0);
  }
});

test('nonentry navigation still returns 503 on offline miss', async () => {
  const worker = boot({ fetch: () => Promise.reject(new Error('offline')) });
  const event = worker.dispatch({ url: `${SCOPE}another-page.html` });
  await plain503(event);
  assert.equal(event.lifetimes.length, 0);
});

test('manifest route intentionally keeps existing awaited cache write behavior', async () => {
  for (const code of [original, source]) {
    const writing = deferred();
    const worker = boot({ fetch: () => Promise.resolve(new Response('{"name":"town"}')), put: () => writing.promise }, code);
    const event = worker.dispatch({ mode: 'cors', url: `${MANIFEST}?version=1` });
    const response = observe(event.response);
    await turn();
    assert.equal(response.status, 'pending');
    assert.equal(event.lifetimes.length, 0);
    assert.equal(worker.calls.put[0].key, MANIFEST);
    assert.equal(await worker.calls.put[0].value.text(), '{"name":"town"}');
    writing.resolve();
    assert.equal(await (await bounded(event.response)).text(), '{"name":"town"}');
  }
});

test('offline uncached manifest retains its JSON 503', async () => {
  const worker = boot({ fetch: () => Promise.reject(new Error('offline')) });
  const event = worker.dispatch({ mode: 'cors', url: MANIFEST });
  const response = await bounded(event.response);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Content-Type'), 'application/manifest+json;charset=utf-8');
  assert.equal(await response.text(), '{"error":"offline-manifest-not-cached"}');
  assert.equal(event.lifetimes.length, 0);
});

test('asset cache hit remains cache-first, ignores query, and does not fetch', async () => {
  const worker = boot({ match: () => Promise.resolve(new Response('cached icon')) });
  const event = worker.dispatch({ mode: 'no-cors', url: `${SCOPE}icon.svg?cachebuster=7` });
  assert.equal(await (await bounded(event.response)).text(), 'cached icon');
  assert.equal(worker.calls.match[0].key, `${SCOPE}icon.svg?cachebuster=7`);
  assert.equal(worker.calls.match[0].options.ignoreSearch, true);
  assert.equal(worker.calls.fetch.length, 0);
  assert.equal(event.lifetimes.length, 0);
});

for (const [name, hook] of [
  ['asset cache miss', {}],
  ['asset cache open failure', { open: () => Promise.reject(new Error('cache broken')) }],
  ['asset cache match failure', { match: () => Promise.reject(new Error('cache broken')) }]
]) {
  test(`${name} still falls through to network`, async () => {
    const worker = boot({ ...hook, fetch: () => Promise.resolve(new Response('network icon')) });
    const event = worker.dispatch({ mode: 'no-cors', url: `${SCOPE}icon.svg` });
    assert.equal(await (await bounded(event.response)).text(), 'network icon');
    assert.equal(worker.calls.fetch.length, 1);
    assert.equal(event.lifetimes.length, 0);
  });
}

for (const [name, request] of [
  ['non-GET', { method: 'POST' }],
  ['cross-origin', { url: 'https://elsewhere.test/GlimmerTown/' }],
  ['out of scope', { url: `${ORIGIN}/other-town/` }],
  ['same-prefix sibling outside scope', { url: `${ORIGIN}/GlimmerTownElsewhere/` }],
  ['nonshell asset', { mode: 'cors', url: `${SCOPE}unlisted.js` }]
]) {
  test(`${name} remains unintercepted`, () => {
    const worker = boot();
    const event = worker.dispatch(request);
    assert.equal(event.response, undefined);
    assert.equal(event.lifetimes.length, 0);
    assert.equal(worker.calls.fetch.length, 0);
    assert.equal(worker.calls.open.length, 0);
  });
}
