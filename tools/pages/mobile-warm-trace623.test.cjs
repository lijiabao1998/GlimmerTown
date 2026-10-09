'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const trace = require('./mobile-warm-trace623.cjs'), mac = require('./native-mac-diagnostic.cjs');
const portability = require('./native-portability-diagnostic.cjs'), canonical = require('./native-correctness.cjs');
const base = portability.build(), built = trace.build(), clone = value => JSON.parse(JSON.stringify(value));
const loopEdit = trace.transformations().find(e => e.label.startsWith('trace original'));

test('six reversible host edits compose exactly the pinned base and preserve every original assertion and RAF guard', () => {
  assert.equal(base.sha256, 'c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b');
  assert.equal(built.traceBaseEmittedSHA256, base.sha256); assert.equal(built.traceChanges.length, 6);
  assert(built.traceChanges.every(c => c.occurrences === 1));
  let reversed = built.source;
  for (const edit of trace.transformations().reverse()) { assert.equal(reversed.split(edit.to).length, 2); reversed = reversed.replace(edit.to, edit.from); }
  assert.equal(reversed, base.source);
  for (const assertion of base.source.match(/(?:check|perfCheck)\([^\n]*?\);/g)) assert(built.source.includes(assertion), assertion);
  const raf = base.source.match(/    const raf=async ms=>\{[^\n]+/)[0];
  assert.equal(built.source.split(raf).length, 2, 'original browser RAF and all nine native qualifications are unchanged');
  const raw = fs.readFileSync(path.resolve(__dirname, '../../docs/tasks/t603-shots/scene603.js'), 'utf8');
  const span = canonical.TIMING.desktop, a = raw.indexOf(span.start), desktop = raw.slice(a, raw.indexOf(span.end, a));
  assert.equal(mac.sha256(desktop), span.sha256); assert.equal(built.source.split(desktop).length, 2);
  assert.equal(built.adapterSHA256, base.adapterSHA256, 'existing outer/inner supervisor identity is unchanged');
  assert(built.source.includes('portability620.finishOriginal();'));
  assert(built.source.includes("check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '"));
  assert.throws(() => trace.build(raw + '\n// source drift'), /identity drift/);
  assert.doesNotMatch(trace.createTrace623.toString(), /Page\.bringToFront|Browser\.setWindowBounds|Emulation\.|collectGarbage|requestAnimationFrame|setInterval/);
  assert(trace.CATEGORIES.includes('cc') && trace.CATEGORIES.includes('gpu') && trace.CATEGORIES.includes('blink'));
});

// Run 37991297831 regression. All 347 raw sample IDs/deltas and all 266 node
// IDs/edges/URL ancestry are retained; only unrelated node/trace metadata is omitted.
const REAL_BASELINE_37991297831 = {
  "sourceRun": "37991297831",
  "rawProfileSHA256": "ef13014fae18616f410efdae0a0c958401d8f0d1bae5ea6a82a8135df853ad79",
  "rawTraceSHA256": "421248ecd66a21133728d012a5a82b419ed55c8f3a8104446fa08fa412a34793",
  "originalIndicesSHA256": "7ae2b5cbe0583aff96b641e3c517e3a567b80758f7876eb8feb2e106c3b62237",
  "startTime": 442037294,
  "endTime": 444700901,
  "urls": ["","http://127.0.0.1:8763/index.html","t623://mobile-night/baseline/cold/0.js","t623://mobile-night/baseline/warm/0.js","t623://mobile-night/baseline/warm/1.js","t623://mobile-night/baseline/warm/2.js","t623://mobile-night/baseline/warm/3.js","t623://mobile-night/baseline/warm/4.js","t623://mobile-night/baseline/warm/5.js","t623://mobile-night/baseline/warm/6.js","t623://mobile-night/baseline/warm/7.js","t623://mobile-night/baseline/warm/8.js","t623://mobile-night/baseline/warm/9.js"],
  "nodes": [
    [1,[2,3,12,14,19,28,29,135,147,164,176,188,200,214,226,242,251,262],0],[2,[],0],[3,[4,8],1],[4,[5],1],[5,[6],1],[6,[7,20,223,263],1],[7,[],1],[20,[],1],[223,[],1],[263,[],1],[8,[9],1],[9,[10,24,27],1],
    [10,[11,16,18,21,22,23,25,144,145,159,162,199,224,225,239,240,241],1],[11,[15],1],[15,[],1],[16,[17],1],[17,[],1],[18,[],0],[21,[],0],[22,[],1],[23,[],1],[25,[26],1],[26,[],1],[144,[264],1],
    [264,[265],1],[265,[266],1],[266,[],1],[145,[146,163],1],[146,[],0],[163,[],0],[159,[160,197],1],[160,[161],1],[161,[],1],[197,[198],1],[198,[],0],[162,[],0],
    [199,[],1],[224,[],1],[225,[],0],[239,[],1],[240,[],1],[241,[],0],[24,[],1],[27,[],1],[12,[13],1],[13,[],1],[14,[],0],[19,[],0],
    [28,[],0],[29,[30],2],[30,[31],2],[31,[32],1],[32,[33],1],[33,[34],1],[34,[35],1],[35,[36,40,42,129,133],1],[36,[37],1],[37,[38],1],[38,[39],1],[39,[],1],
    [40,[41],1],[41,[],1],[42,[43,60],1],[43,[44,61,63,80,106,124,126],1],[44,[45,68,84,89],1],[45,[46,53,112],1],[46,[47],1],[47,[48],1],[48,[49],1],[49,[50],1],[50,[51],1],[51,[52],1],
    [52,[],1],[53,[54],1],[54,[55,57],1],[55,[56],1],[56,[],1],[57,[58],1],[58,[59],1],[59,[],1],[112,[113],1],[113,[114,120],1],[114,[115,117],1],[115,[116],1],
    [116,[],1],[117,[118],1],[118,[119],1],[119,[],0],[120,[121],1],[121,[122],1],[122,[123],1],[123,[],0],[68,[69,72],1],[69,[70],1],[70,[71],1],[71,[],1],
    [72,[73,74],1],[73,[],1],[74,[75],1],[75,[76],1],[76,[77],1],[77,[78],1],[78,[79],1],[79,[],0],[84,[85],1],[85,[86],1],[86,[87],1],[87,[88],1],
    [88,[],1],[89,[90],1],[90,[91,98,102],1],[91,[92,94,97],1],[92,[93],1],[93,[],1],[94,[95],1],[95,[96],1],[96,[],1],[97,[],0],[98,[99],1],[99,[100,101],1],
    [100,[],0],[101,[],1],[102,[103],1],[103,[104],1],[104,[105],1],[105,[],1],[61,[62],1],[62,[],1],[63,[64,109],1],[64,[65],1],[65,[66],1],[66,[67],1],
    [67,[],0],[109,[110],1],[110,[111],1],[111,[],1],[80,[81],1],[81,[82],1],[82,[83],1],[83,[],1],[106,[107],1],[107,[108],1],[108,[],1],[124,[125],1],
    [125,[],0],[126,[127],1],[127,[128],1],[128,[],1],[60,[],0],[129,[130,131],1],[130,[],1],[131,[132],1],[132,[],1],[133,[134],1],[134,[],0],[135,[136],3],
    [136,[137],1],[137,[138],1],[138,[139],1],[139,[140],1],[140,[141,143],1],[141,[142],1],[142,[],1],[143,[],0],[147,[148],4],[148,[149],1],[149,[150],1],[150,[151],1],
    [151,[152],1],[152,[153,156,157],1],[153,[154],1],[154,[155],1],[155,[],1],[156,[],0],[157,[158],1],[158,[],0],[164,[165],5],[165,[166],1],[166,[167],1],[167,[168],1],
    [168,[169],1],[169,[170,172,173,174],1],[170,[171],1],[171,[],1],[172,[],1],[173,[],0],[174,[175],1],[175,[],0],[176,[177],6],[177,[178],1],[178,[179],1],[179,[180],1],
    [180,[181],1],[181,[182,184,185,186],1],[182,[183],1],[183,[],1],[184,[],0],[185,[],0],[186,[187],1],[187,[],0],[188,[189],7],[189,[190],1],[190,[191],1],[191,[192],1],
    [192,[193],1],[193,[194,196],1],[194,[195],1],[195,[],1],[196,[],0],[200,[201],8],[201,[202],1],[202,[203],1],[203,[204],1],[204,[205],1],[205,[206,209,211,212],1],[206,[207],1],
    [207,[208],1],[208,[],1],[209,[210],1],[210,[],1],[211,[],0],[212,[213],1],[213,[],0],[214,[215],9],[215,[216],1],[216,[217],1],[217,[218],1],[218,[219],1],
    [219,[220,222],1],[220,[221],1],[221,[],1],[222,[],0],[226,[227],10],[227,[228],1],[228,[229],1],[229,[230],1],[230,[231],1],[231,[232,236,238],1],[232,[233],1],[233,[234],1],
    [234,[235],1],[235,[],1],[236,[237],1],[237,[],1],[238,[],0],[242,[243],11],[243,[244],1],[244,[245],1],[245,[246],1],[246,[247],1],[247,[248,250],1],[248,[249],1],
    [249,[],1],[250,[],0],[251,[252],12],[252,[253],1],[253,[254],1],[254,[255],1],[255,[256],1],[256,[257,259,260,261],1],[257,[258],1],[258,[],1],[259,[],1],[260,[],0],
    [261,[],1],[262,[],0],
  ],
  "samples": [
    2,3,7,11,13,14,15,17,15,9,14,14,15,18,19,15,14,15,10,14,15,2,14,20,15,15,21,2,15,15,2,9,
    15,22,9,2,15,23,15,24,19,19,9,15,10,10,2,2,2,2,15,2,26,2,2,2,15,27,2,28,2,14,15,10,
    39,39,35,41,35,52,56,59,60,62,67,35,71,73,79,83,88,93,96,91,97,100,101,105,108,111,116,119,123,60,125,128,
    60,130,132,134,14,2,10,15,21,2,2,142,142,143,2,14,15,21,2,2,2,15,9,144,146,10,2,155,155,152,156,156,
    152,151,156,2,158,6,161,15,162,162,162,162,21,21,21,163,2,146,2,171,172,172,173,173,169,173,173,173,175,14,2,19,
    19,19,180,183,180,184,185,185,181,185,181,187,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,
    14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,
    14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,
    14,14,14,14,14,14,14,14,14,14,14,2,14,15,10,10,2,195,192,196,14,2,2,2,2,198,15,21,10,21,199,208,
    210,204,205,211,213,14,2,15,10,21,2,21,221,222,219,2,222,223,15,224,225,2,21,235,237,238,2,14,239,15,240,2,
    241,249,249,250,247,2,14,15,9,21,2,2,258,259,260,2,261,262,2,263,11,15,23,10,266,145,146,
  ],
  "timeDeltas": [
    683076,571,1907,1658,5288,6750,2192,4483,6833,535,8562,3253,2774,4833,9918,633,10261,8550,601,9988,4576,5251,8834,3643,4390,1399,4176,1638,7502,866,8648,8553,
    1512,6354,3016,6033,5536,1825,5418,2866,7413,6597,6227,2014,11782,5132,1099,2045,2294,763,3812,4280,-1516,6073,1075,1018,2200,3204,1997,4478,1660,-476,7982,1773,
    8076,315,8664,1831,316,10027,9506,6506,7521,2956,3268,6273,8373,8736,10319,8526,7927,9988,6453,7694,603,7064,8492,8733,5854,8629,6309,3475,2074,7664,8115,6482,
    2054,1696,715,7636,4606,117,4175,230,7522,5698,2280,5520,741,4618,11912,-1835,9137,7556,4760,1369,655,2452,1417,10495,14199,5815,8675,7407,743,5975,4025,19665,
    1025,5759,6587,24534,-5261,6328,2779,4174,6107,9039,8652,3934,16149,15481,1598,7303,22141,-4225,8125,5037,3851,14702,3459,12482,3976,8919,17151,41,8711,4398,1577,13367,
    3577,13951,4172,1500,7417,5007,12944,1257,2930,14242,233,20200,2543,6034,6332,6308,5882,9090,3146,9197,11208,4574,8552,8702,7988,8780,8850,6818,8312,8853,8932,8889,
    9064,3851,2240,3401,3655,8822,9216,4791,4485,5849,9038,8981,8893,9853,7011,9110,2009,5773,2365,8657,5463,8773,7858,8773,6473,8624,7536,8263,8393,8173,5872,5709,
    8934,6647,6761,2131,7772,8968,7947,9407,8047,8396,7380,8720,7960,8834,7749,1225,9060,9133,9054,6825,8993,8116,7409,6351,2169,1306,1212,1111,5235,4554,4173,8971,
    3927,9926,6144,1736,8644,7364,8949,8861,1491,8508,6114,11168,-2217,4792,4048,5110,6030,3507,1293,8669,7655,1250,40,6194,303,3722,3822,4519,9190,4684,5998,11324,
    4817,441,1536,8457,6551,1604,1932,5735,1104,8699,7914,-542,7428,1638,8458,12683,-3858,7547,2517,4052,1904,14659,-6454,8703,2020,5989,11096,-1771,5448,6989,2577,12598,
    -3640,8868,303,6363,1124,8649,-2257,6027,2219,8996,8315,436,5073,2254,5737,10140,-3642,5640,1213,515,9267,15,9132,7948,7021,6462,853,
  ],
  "arm": {"mode":"baseline","samples":[{"kind":"cold","index":0,"sourceURL":"t623://mobile-night/baseline/cold/0.js","durationMs":213.09999999997672},{"kind":"warm","index":0,"sourceURL":"t623://mobile-night/baseline/warm/0.js","durationMs":19.300000000046566},{"kind":"warm","index":1,"sourceURL":"t623://mobile-night/baseline/warm/1.js","durationMs":69.39999999996508},{"kind":"warm","index":2,"sourceURL":"t623://mobile-night/baseline/warm/2.js","durationMs":78},{"kind":"warm","index":3,"sourceURL":"t623://mobile-night/baseline/warm/3.js","durationMs":70.29999999998836},{"kind":"warm","index":4,"sourceURL":"t623://mobile-night/baseline/warm/4.js","durationMs":20.199999999953434},{"kind":"warm","index":5,"sourceURL":"t623://mobile-night/baseline/warm/5.js","durationMs":24.400000000023283},{"kind":"warm","index":6,"sourceURL":"t623://mobile-night/baseline/warm/6.js","durationMs":23.5},{"kind":"warm","index":7,"sourceURL":"t623://mobile-night/baseline/warm/7.js","durationMs":15.700000000011642},{"kind":"warm","index":8,"sourceURL":"t623://mobile-night/baseline/warm/8.js","durationMs":16.199999999953434},{"kind":"warm","index":9,"sourceURL":"t623://mobile-night/baseline/warm/9.js","durationMs":19}],"qualified":false,"postWarmCacheRead":true,"startMarker":"T623:baseline:capture:start","warmEndMarker":"T623:baseline:warm:end"},
  "traceEvents": [{"name":"TimeStamp","cat":"devtools.timeline","pid":1285,"tid":7099,"ts":442973608,"args":{"data":{"message":"T623:baseline:capture:start"}}},{"name":"TimeStamp","cat":"devtools.timeline","pid":1285,"tid":7099,"ts":444651339,"args":{"data":{"message":"T623:baseline:warm:end"}}},{"name":"FunctionCall","cat":"devtools.timeline","pid":1285,"tid":7099,"ts":442975599,"dur":14118},{"name":"Scheduler::BeginFrame","cat":"cc,benchmark","pid":1285,"tid":7133,"ts":442975333,"dur":57},{"name":"CommandBuffer::FlushComplete","cat":"gpu,toplevel.flow","pid":1268,"tid":6882,"ts":442974347,"dur":2},{"name":"LayerTreeHostImpl::PrepareToDraw","cat":"cc","pid":1285,"tid":7133,"ts":442975401,"dur":51}],
};

function latchFixture() {
  const handlers = {}, doc = { visibilityState: 'visible', focused: true, hasFocus() { return this.focused; },
    addEventListener(k, f, o) { assert.equal(o.passive, true); handlers[k] = f; } };
  const window = { addEventListener(k, f, o) { assert.equal(o.passive, true); handlers[k] = f; } };
  vm.runInNewContext('(' + trace.installWarmLatch623.toString() + ')()', { window, document: doc });
  return { doc, handlers, latch: window.__mobileWarmLoss623 };
}

async function fixture(options = {}) {
  const files = new Map(), calls = [], evaluations = [], records = [], latch = latchFixture();
  const report = { nativeMac619: { host: { window: { bounds: { left: 0, top: 0, width: 1600, height: 1000, windowState: 'fullscreen' } },
    viewport: { width: 1600, height: 1000 } } } };
  const limits = { ...trace.LIMITS, captureMs: 2000, operationMs: 40, closeMs: 40, readMs: 80, ...options.limits };
  let tick = 1000, fakeNow = 1000, recording = false, active, warmIndex = 0, control;
  const realNow = options.fakeClock ? () => fakeNow : Date.now;
  const ev = async expression => {
    calls.push(['ev', expression]);
    if (expression.startsWith('({visibility:')) return { visibility: latch.doc.visibilityState, focus: latch.doc.focused,
      width: options.wrongViewport ? 1400 : 390, height: 844, dpr: 1, timeOrigin: 50,
      viewport: { cssWidth: 390, cssHeight: 844, width: 390, height: 844, dpr: 1, devicePixelRatio: 1 } };
    if (expression === '__mobileWarmLoss623.begin()') return latch.latch.begin();
    if (expression === '__mobileWarmLoss623.end()') return latch.latch.end();
    if (expression.startsWith('console.timeStamp(')) {
      const label = JSON.parse(expression.slice('console.timeStamp('.length, -');true'.length)); tick += 1000;
      if (recording && !(options.missingMarker && label.includes(':warm:end'))) active.events.push({ name: 'TimeStamp', cat: 'devtools.timeline', pid: 10, tid: 20, ts: tick, args: { data: { message: label } } });
      return true;
    }
    const [raw, url] = expression.split('\n//# sourceURL='); evaluations.push({ raw, url, callIndex: calls.length - 1 });
    if (raw === '__s603.cacheStats()') return { bakes: 1 };
    const cold = raw.startsWith('(()=>{window.__noT603=');
    if (cold) warmIndex = 0; else assert.equal(raw, '__s603.drawMs()');
    if (options.failDraw && !cold && warmIndex === 2) throw Error('original draw failed');
    if (options.stallDraw && !cold && warmIndex === 2) return new Promise(() => {});
    const duration = cold ? 30 : 10 + warmIndex++;
    if (recording) {
      const start = tick + 1000; tick += 3000;
      const evalId = active.nextNode++, drawId = active.nextNode++, profile = active.profile;
      profile.nodes[0].children.push(evalId);
      profile.nodes.push({ id: evalId, callFrame: { functionName: '', url }, children: [drawId] },
        { id: drawId, callFrame: { functionName: 'draw', url: 'http://127.0.0.1:8763/index.html', lineNumber: 20, columnNumber: 2 } });
      profile.samples.push(drawId); profile.timeDeltas.push(start + 500 - active.previousCpu); active.previousCpu = start + 500;
      active.events.push({ name: 'EvaluateScript', cat: 'devtools.timeline', pid: 10, tid: 20, ts: start, dur: 1000, args: { data: { url } } },
        { name: 'CanvasRenderingContext2D::FinalizeFrame', cat: 'blink', pid: 10, tid: 20, ts: start, dur: 1200 },
        { name: 'LayerTreeHost::DoUpdateLayers', cat: 'cc', pid: 10, tid: 20, ts: start, dur: 800 });
      if (!options.missingGPU) active.events.push({ name: 'GpuCommandBuffer::Flush', cat: 'gpu', pid: 11, tid: 21, ts: start, dur: 700 });
      if (options.lostFocus && !cold && warmIndex === 3) { latch.doc.focused = false; latch.handlers.blur(); latch.doc.focused = true; }
      if (options.lostVisibility && !cold && warmIndex === 3) { latch.doc.visibilityState = 'hidden'; latch.handlers.visibilitychange(); latch.doc.visibilityState = 'visible'; }
    }
    return cold ? { light: 100, first: duration, before: { bakes: 1 } } : duration;
  };
  const send = async (method, params) => {
    calls.push([method, params]);
    if (method === 'Browser.getWindowForTarget') return clone(report.nativeMac619.host.window);
    if (method === 'Tracing.getCategories') return { categories: options.malformedGC ? 'disabled-by-default-v8.gc' : trace.CATEGORIES.filter(c => !options.noGC || c !== 'disabled-by-default-v8.gc') };
    if (method === 'Profiler.start') {
      active = { mode: ['baseline', 'candidate'][records.length], ordinal: records.length + 1, nextNode: 2, previousCpu: tick, events: [], readOffset: 0,
        profile: { startTime: tick, endTime: tick + 1, nodes: [{ id: 1, callFrame: { functionName: '(root)', url: '' }, children: [] }], samples: [], timeDeltas: [] } };
      records.push(active);
    }
    if (method === 'Tracing.start') {
      recording = true; assert.equal(params.traceConfig.recordMode, 'recordUntilFull'); assert.equal(params.traceConfig.traceBufferSizeInKb, limits.traceBufferKiB);
      if (options.earlyComplete) control.routeTraceComplete({ stream: 'early-stream', dataLossOccurred: false }, false);
    }
    if (method === 'Profiler.stop') {
      if (options.stopFailure) throw Error('Profiler.stop failed');
      active.profile.endTime = tick + 1000;
      return { profile: options.emptyProfile ? {} : options.crossArmProfile && active.ordinal === 2 ? records[0].profile : active.profile };
    }
    if (method === 'Tracing.end') {
      recording = false; if (options.fakeClock) fakeNow += options.advanceOnStop || 0;
      if (!options.missingComplete) {
        const event = { stream: options.staleComplete && active.ordinal === 2 ? 'trace-1' : 'trace-' + active.ordinal, dataLossOccurred: !!options.dataLoss };
        control.routeTraceComplete(event, false);
        if (options.duplicateComplete) control.routeTraceComplete(event, false);
      }
    }
    if (method === 'IO.read') {
      assert(params.size > 0 && params.size <= limits.readChunkBytes);
      if (options.readStall) return new Promise(() => {});
      if (options.lostDuringRead) latch.handlers.blur();
      if (options.fakeClock) fakeNow += options.advanceOnRead || 0;
      const record = records[Number(params.handle.split('-')[1]) - 1];
      const events = options.crossArmTrace && record.ordinal === 2 ? records[0].events : record.events;
      const bytes = Buffer.from(JSON.stringify({ traceEvents: events }));
      const chunk = bytes.subarray(record.readOffset, record.readOffset + params.size); record.readOffset += chunk.length;
      return { data: chunk.toString('base64'), base64Encoded: true, eof: !options.neverEOF && record.readOffset >= bytes.length };
    }
    return {};
  };
  const run = (command, args, opts) => {
    calls.push(['native', args]); assert(opts.timeout > 0 && opts.timeout <= limits.operationMs);
    return { status: 0, stdout: args[0] === 'front' ? 'ASN:0x0-0x3003:' : '"pid"=4271\n"CFBundleIdentifier"="com.google.Chrome"\n' };
  };
  const create = new Function('return (' + trace.createTrace623.toString() + ');')();
  control = await create({ send, ev, browser: { pid: 4271 }, report, persist() {}, errors: [], consoleErrors: [],
    boundaryValid: mac.boundaryValid, installLatch: trace.installWarmLatch623, analyze: trace.analyzeEvidence623,
    limits, categories: trace.CATEGORIES, limitation: trace.LIMITATION, now: realNow,
    save: (name, value) => { if (options.saveTraceFailure && name.endsWith('-trace.json')) throw Error('trace evidence write failed'); files.set(name, Buffer.from(value)); }, run });
  const pair = {}, rafs = [];
  const raf = async ms => {
    rafs.push(ms); calls.push(['originalRAF', ms]); tick += 5000000;
    assert.equal(recording, false, 'trace is stopped before each original RAF');
    if (options.lostDuringRAF) latch.handlers.blur();
    if (options.fakeClock && rafs.length === 1) fakeNow += options.advanceOnBaselineRAF || 0;
    return { elapsed: 5000, frames: 300, mean: 5000 / 300, p95: 17, max: 20, visibility: 'visible' };
  };
  const pct = values => [...values].sort((a, b) => a - b).at(-1);
  const execute = phase => new Function('mobileWarmTrace623', 'ev', 'raf', 'pct', 'pair', 'phase', 'time',
    'return (async()=>{' + loopEdit.to + '})();')(control, ev, raf, pct, pair, phase, 100);
  return { control, execute, files, calls, evaluations, report, records, latch, pair, rafs, limits };
}

test('the emitted loop captures exactly two cold/warm bursts and drains after cacheStats before each original RAF', async () => {
  const f = await fixture(); await f.execute('night'); f.control.complete(); await f.control.cleanup();
  const state = f.report.mobileWarmTrace623;
  assert.equal(state.captureComplete, true); assert.deepEqual(f.rafs, [5000, 5000]);
  for (const method of ['Tracing.start', 'Tracing.end', 'Profiler.start', 'Profiler.stop', 'Profiler.disable', 'IO.close', 'IO.read']) assert.equal(f.calls.filter(c => c[0] === method).length, 2, method);
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.getCategories').length, 1);
  const indexed = f.evaluations.filter(e => e.url); assert.equal(indexed.length, 22);
  const indices = method => f.calls.map((c, i) => c[0] === method ? i : -1).filter(i => i >= 0);
  for (let arm = 0; arm < 2; arm++) {
    const rows = indexed.slice(arm * 11, arm * 11 + 11), mode = ['baseline', 'candidate'][arm];
    assert(rows[0].raw.includes('const first=__s603.drawMs();'));
    for (let i = 1; i < 11; i++) {
      assert.equal(rows[i].raw, '__s603.drawMs()'); assert.equal(rows[i].url, 't623://mobile-night/' + mode + '/warm/' + (i - 1) + '.js');
      assert.equal(rows[i].callIndex, rows[i - 1].callIndex + 1, 'no marker, polling, native query or other CDP task inside the original draw burst');
    }
    const cacheIndex = rows.at(-1).callIndex + 1;
    assert.deepEqual(f.calls[cacheIndex], ['ev', '__s603.cacheStats()'], 'original post-warm cache read directly follows warm draw 9');
    assert(cacheIndex < indices('Tracing.end')[arm]);
    assert(indices('Tracing.end')[arm] < indices('IO.close')[arm]);
    assert(indices('IO.close')[arm] < indices('originalRAF')[arm], 'trace-stream download finishes before original RAF');
    assert.deepEqual(f.pair[mode].warm, Array.from({ length: 10 }, (_, i) => 10 + i)); assert.equal(f.pair[mode].first, 30);
    assert.equal(state.arms[arm].capture.correlation.samples.length, 11);
    assert.equal(state.arms[arm].capture.correlation.markerCount, 2);
    assert(state.arms[arm].capture.correlation.graphics.every(g => g.ccEvents && g.gpuEvents && g.rendererCanvasEvents));
    assert.equal(state.arms[arm].capture.correlation.gcEventCount, 0, 'zero observed GC is allowed when category capability exists');
  }
  assert(indices('originalRAF')[0] < indices('Profiler.start')[1]);
  assert.equal(state.gcCapability.available, true);
  assert.equal(state.totals.events, f.records.reduce((sum, r) => sum + r.events.length, 0));
  assert.equal(state.totals.profileSamples, 22); assert.equal(state.totals.readCalls, 2);
  assert.equal(state.totals.traceBytes, [...f.files].filter(([name]) => name.endsWith('-trace.json')).reduce((sum, [, bytes]) => sum + bytes.length, 0));
  assert.equal(state.instrumentationDeadline - state.instrumentationStartedAt, f.limits.captureMs);
  assert.doesNotThrow(() => JSON.stringify(f.report), 'receipt excludes Promise/resolver and cyclic state');
});

test('day arms retain original evaluations and add no instrumentation or native tasks', async () => {
  const f = await fixture(), before = f.calls.length; await f.execute('day');
  assert.deepEqual(f.rafs, [5000, 5000]); assert.equal(f.evaluations.length, 26); assert(f.evaluations.every(e => !e.url));
  assert(f.calls.slice(before).every(c => ['ev', 'originalRAF'].includes(c[0]))); await f.control.cleanup();
});

for (const [label, option, expected, count] of [
  ['warm blur recovered before RAF', 'lostFocus', /latch\/runtime control/, 1],
  ['warm hidden recovered before RAF', 'lostVisibility', /latch\/runtime control/, 1],
  ['focus loss during trace stream read', 'lostDuringRead', /latch\/runtime control/, 1],
  ['focus loss during original RAF', 'lostDuringRAF', /latch\/runtime control/, 1],
  ['wrong mobile viewport', 'wrongViewport', /foreground\/viewport/, 0],
  ['GC category unavailable', 'noGC', /GC trace category capability/, 0],
  ['malformed GC capability response', 'malformedGC', /GC trace category capability/, 0],
  ['missing GPU events', 'missingGPU', /compositor\/GPU/, 1],
  ['missing indexed marker', 'missingMarker', /cross-arm capture markers/, 1],
  ['missing CPU profile', 'emptyProfile', /CPU profile/, 1],
  ['Chrome trace data loss', 'dataLoss', /data-loss/, 1],
  ['missing tracingComplete', 'missingComplete', /tracingComplete baseline timeout/, 1],
  ['Profiler.stop failure', 'stopFailure', /Profiler.stop failed/, 1],
  ['trace evidence write failure', 'saveTraceFailure', /trace evidence write failed/, 1],
  ['trace stream read timeout', 'readStall', /IO.read timeout/, 1],
  ['early completion', 'earlyComplete', /shared deadline\/arm order\/control/, 1],
  ['duplicate completion', 'duplicateComplete', /shared deadline\/arm order\/control/, 1],
  ['stale prior-arm stream', 'staleComplete', /stale\/reused trace completion/, 2],
  ['prior-arm trace body', 'crossArmTrace', /cross-arm capture markers/, 2],
  ['prior-arm CPU profile', 'crossArmProfile', /clocks or coverage/, 2]
]) test('fails closed for ' + label + ', stops both facilities and never adds a retry', async () => {
  const f = await fixture({ [option]: true });
  await assert.rejects(f.execute('night'), expected); await f.control.cleanup().catch(() => {});
  assert.equal(f.report.mobileWarmTrace623.captureComplete, false); assert(f.report.mobileWarmTrace623.failures.length);
  for (const method of ['Tracing.start', 'Tracing.end', 'Profiler.start', 'Profiler.stop']) assert.equal(f.calls.filter(c => c[0] === method).length, count, method);
  assert.deepEqual(f.records.map(r => r.mode), ['baseline', 'candidate'].slice(0, count));
  if (['dataLoss', 'readStall', 'saveTraceFailure'].includes(option)) assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 1);
});

test('all byte/count/sample/event budgets are cumulative across the two captures', async () => {
  const good = await fixture(); await good.execute('night'); await good.control.cleanup();
  const first = good.report.mobileWarmTrace623.arms[0].capture;
  for (const [budget, value] of [
    ['traceBytes', Math.floor(first.traceBytes * 1.5)], ['profileBytes', Math.floor(first.profileBytes * 1.5)],
    ['readCalls', 1], ['events', Math.floor(first.correlation.eventCount * 1.5)], ['profileSamples', 15]
  ]) {
    const f = await fixture({ limits: { [budget]: value } }); await assert.rejects(f.execute('night'), /cumulative .*limit exceeded/, budget);
    await f.control.cleanup().catch(() => {});
    assert.equal(f.records.length, 2, 'first arm fits its individual share but second exceeds shared ' + budget);
    assert.equal(f.report.mobileWarmTrace623.captureComplete, false);
    assert.equal(f.calls.filter(c => c[0] === 'Tracing.start').length, 2);
    assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 2);
  }
});

test('cumulative read time rejects even final EOF and read counts only include issued commands', async () => {
  const f = await fixture({ fakeClock: true, advanceOnRead: 45, limits: { readMs: 80 } });
  await assert.rejects(f.execute('night'), /cumulative trace read-time limit/); await f.control.cleanup().catch(() => {});
  assert.equal(f.records.length, 2); assert.equal(f.report.mobileWarmTrace623.totals.readElapsedMs, 90);
  assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 2);
  const expired = await fixture({ fakeClock: true, advanceOnStop: 90001, limits: { captureMs: 90000 } });
  await assert.rejects(expired.execute('night'), /IO.read deadline/); await expired.control.cleanup().catch(() => {});
  assert.equal(expired.report.mobileWarmTrace623.totals.readCalls, 0);
  assert.equal(expired.calls.filter(c => c[0] === 'IO.read').length, 0);
  assert.equal(expired.calls.filter(c => c[0] === 'IO.close').length, 1);
});

test('one wall deadline remains charged across baseline RAF and cannot reset for candidate', async () => {
  const f = await fixture({ fakeClock: true, advanceOnBaselineRAF: 90001, limits: { captureMs: 90000 } });
  await assert.rejects(f.execute('night'), /shared deadline\/arm order\/control/); await f.control.cleanup().catch(() => {});
  assert.equal(f.records.length, 1); assert.equal(f.report.mobileWarmTrace623.instrumentationDeadline, 91000);
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.start').length, 1);
});

test('one-shot watchdog stops both facilities during a stuck original evaluation', async () => {
  // Hold the injected clock steady so the earlier, absolute watchdog wins the
  // timer race deterministically instead of the per-evaluation deadline.
  const f = await fixture({ stallDraw: true, fakeClock: true, limits: { captureMs: 40 } });
  await assert.rejects(f.execute('night'), /deadline|timeout|capture/); await f.control.cleanup().catch(() => {});
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1);
  assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
  assert.equal(f.report.mobileWarmTrace623.captureComplete, false);
  assert(f.report.mobileWarmTrace623.failures.some(e => /watchdog/.test(e)));
});

test('original draw error is preserved while both tracing facilities stop', async () => {
  const f = await fixture({ failDraw: true }); await assert.rejects(f.execute('night'), /^Error: original draw failed$/);
  await f.control.cleanup().catch(() => {});
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1); assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
});

test('per-arm ancestry, ordering, clocks, markers and graphics have independent negative controls', async () => {
  const f = await fixture(); await f.execute('night'); await f.control.cleanup();
  const arm = f.report.mobileWarmTrace623.arms[0], text = f.files.get('T623-mobile-night-baseline-trace.json').toString(), record = f.records[0];
  for (const [name, mutate, expected] of [
    ['lost indexed URL', p => { p.nodes[1].callFrame.url = 'unrelated://script'; }, /no CPU samples resolve/],
    ['reordered warm ancestry', p => { const a = p.nodes[3].callFrame.url; p.nodes[3].callFrame.url = p.nodes[5].callFrame.url; p.nodes[5].callFrame.url = a; }, /cold\/ten-warm order/],
    ['cross-arm sampled ancestry', p => { p.nodes[1].callFrame.url = p.nodes[1].callFrame.url.replace('baseline', 'candidate'); }, /cross-arm indexed CPU/],
    ['unaligned clocks', p => { p.startTime += 90000000; p.endTime += 90000000; }, /clocks or coverage/],
    ['profile without samples', p => { p.samples = []; p.timeDeltas = []; }, /CPU profile/]
  ]) {
    const p = clone(record.profile); mutate(p); assert.throws(() => trace.analyzeEvidence623(text, p, arm, trace.LIMITS), expected, name);
  }
  assert.throws(() => trace.analyzeEvidence623(JSON.stringify({ traceEvents: record.events.filter(e => e.cat !== 'gpu') }), record.profile, arm, trace.LIMITS), /compositor\/GPU/);
  assert.throws(() => trace.analyzeEvidence623(JSON.stringify({ traceEvents: [...record.events, record.events.find(e => e.name === 'TimeStamp')] }), record.profile, arm, trace.LIMITS), /duplicate/);
  assert.equal(f.control.routeTraceComplete({ stream: 'original-desktop-stream' }, true), false, 'later original desktop trace handling is preserved');
  assert.equal(f.control.routeTraceComplete({ stream: 'trace-1' }, true), true, 'a reused T623 stream is rejected even when a later legacy trace is pending');
  assert(f.report.mobileWarmTrace623.failures.some(message => /stale\/reused/.test(message)));
});

function realBaselineRegression() {
  const source = REAL_BASELINE_37991297831;
  return {
    profile: { startTime: source.startTime, endTime: source.endTime,
      nodes: source.nodes.map(([id, children, urlIndex]) => ({ id, children: [...children],
        callFrame: { functionName: 'regression-node-' + id, url: source.urls[urlIndex] } })),
      samples: [...source.samples], timeDeltas: [...source.timeDeltas] },
    arm: clone(source.arm), text: JSON.stringify({ traceEvents: source.traceEvents })
  };
}

test('actual 347-sample regression accepts signed deltas, retains IDs/bounds and leaves saved baseline unqualified', () => {
  const f = realBaselineRegression(), before = JSON.stringify(f);
  const result = trace.analyzeEvidence623(f.text, f.profile, f.arm, trace.LIMITS);
  assert.equal(result.profileSamples, 347); assert.equal(f.profile.nodes.length, 266);
  assert.equal(result.normalization.negativeDeltaCount, 13); assert.equal(result.normalization.reorderedCount, 26);
  assert.equal(mac.sha256(JSON.stringify(result.normalization.originalIndices)), REAL_BASELINE_37991297831.originalIndicesSHA256);
  assert.equal(result.normalization.originalProfileStartTimeUs, 442037294);
  assert.equal(result.normalization.originalProfileEndTimeUs, 444700901);
  assert.match(result.normalization.method, /stable-sort\(timestamp,originalIndex\); sample-ID pairing preserved/);
  assert.deepEqual(result.samples.map(row => row.cpuSampleCount), [36, 3, 9, 10, 10, 3, 6, 4, 3, 4, 4]);
  assert(result.samples.every(row => row.mode === 'baseline'));
  for (const row of result.samples) {
    const ids = row.cpuOriginalIndices.map(index => f.profile.samples[index]);
    assert.equal(ids.length, row.cpuSampleCount);
    for (const leaf of row.sampledLeafNodes) assert.equal(ids.filter(id => id === leaf.id).length, leaf.samples);
  }
  assert.equal(JSON.stringify(f), before, 'no raw samples, bounds, source ancestry or qualification are rewritten');
  assert.equal(f.arm.qualified, false); assert.equal(Object.hasOwn(f.arm, 'latchAfter'), false);
  assert.equal(result.samples.length, 11, 'no candidate samples are inferred');
  assert.equal(trace.diagnosticComplete({ completed: true, cleanupVerified: true, restored: true, profileRemoved: true,
    innerSummary: { mobileWarmTrace623: { arms: [f.arm], captureComplete: false } } }), false);
});

test('signed cumulative timestamps sort stably by original index, with tied sample IDs inseparable', () => {
  const f = realBaselineRegression(), profile = f.profile;
  // Tie real adjacent samples 50/51, whose IDs descend. A sample-ID secondary
  // sort would reverse them; compensate the next delta to preserve later times.
  assert(profile.samples[50] > profile.samples[51]);
  profile.timeDeltas[51] = 0;
  profile.timeDeltas[52] += REAL_BASELINE_37991297831.timeDeltas[51];
  const before = JSON.stringify(profile), result = trace.analyzeEvidence623(f.text, profile, f.arm, trace.LIMITS);
  const order = result.normalization.originalIndices, position = order.indexOf(50);
  assert.equal(order[position + 1], 51, 'equal timestamps retain original order even when sample IDs descend');
  assert.equal(result.normalization.negativeDeltaCount, 12);
  assert.equal(new Set(order).size, 347); assert.equal(order.length, 347);
  assert.equal(JSON.stringify(profile), before);
});

test('every reconstructed timestamp stays within actual bounds, including interior excursions and overflow', () => {
  for (const [label, mutate] of [
    ['before actual start', p => { p.timeDeltas[0] = -1; }],
    ['interior above end then recovery', p => { const jump = p.endTime - p.startTime; p.timeDeltas[20] += jump; p.timeDeltas[21] -= jump; }],
    ['one microsecond beyond end', p => { const last = p.startTime + p.timeDeltas.reduce((a, b) => a + b, 0); p.timeDeltas[p.timeDeltas.length - 1] += p.endTime - last + 1; }],
    ['finite-delta cumulative overflow', p => { p.startTime = 0; p.endTime = Number.MAX_VALUE; p.timeDeltas.fill(0); p.timeDeltas[0] = Number.MAX_VALUE; p.timeDeltas[1] = Number.MAX_VALUE; }]
  ]) {
    const f = realBaselineRegression(); mutate(f.profile);
    assert.throws(() => trace.analyzeEvidence623(f.text, f.profile, f.arm, trace.LIMITS), /timestamp outside original profile bounds/, label);
  }
});

test('signed-delta support does not relax finite/count/ID/tree/cycle or cumulative-budget validation', () => {
  for (const [label, mutate, expected] of [
    ...[NaN, Infinity, -Infinity].map(value => ['nonfinite delta ' + value, p => { p.timeDeltas[52] = value; }, /malformed CPU profile/]),
    ['sample/delta count mismatch', p => { p.timeDeltas.pop(); }, /malformed CPU profile/],
    ['unknown sampled ID', p => { p.samples[0] = 9999; }, /identify the candidate/],
    ['fractional sampled ID', p => { p.samples[0] = 1.5; }, /malformed CPU profile/],
    ['negative node ID', p => { p.nodes[0].id = -1; }, /malformed CPU profile/],
    ['duplicate node ID', p => { p.nodes[1].id = p.nodes[0].id; }, /identify the candidate/],
    ['malformed children', p => { p.nodes[0].children = {}; }, /malformed CPU profile/],
    ['unknown child ID', p => { p.nodes[0].children.push(9999); }, /tree is malformed/],
    ['multiple parents', p => {
      const existingParent = p.nodes.find(node => node.id !== p.nodes[0].id && node.children.length);
      assert(existingParent); const child = existingParent.children[0];
      assert(p.nodes.some(node => node.id === child)); p.nodes[0].children.push(child);
    }, /tree is malformed/],
    ['disconnected node', p => { p.nodes.push({ id: 9998, callFrame: { url: '' } }); }, /one root/],
    ['unsampled disconnected cycle', p => { p.nodes.push({ id: 9998, callFrame: { url: '' }, children: [9999] }, { id: 9999, callFrame: { url: '' }, children: [9998] }); }, /cyclic/],
    ['cross-arm source ancestry', p => { const node = p.nodes.find(n => n.callFrame.url.includes('/baseline/cold/')); node.callFrame.url = node.callFrame.url.replace('/baseline/', '/candidate/'); }, /cross-arm indexed CPU/]
  ]) {
    const f = realBaselineRegression(); mutate(f.profile);
    assert.throws(() => trace.analyzeEvidence623(f.text, f.profile, f.arm, trace.LIMITS), expected, label);
  }
  const f = realBaselineRegression();
  assert.throws(() => trace.analyzeEvidence623(f.text, f.profile, f.arm, trace.LIMITS,
    { events: 0, profileSamples: trace.LIMITS.profileSamples - 346 }), /cumulative CPU sample limit/);
});

test('optional saved full baseline parses offline without changing raw status or closing-latch evidence', {
  skip: !process.env.T623_OFFLINE_ARTIFACT_DIR
}, () => {
  const dir = process.env.T623_OFFLINE_ARTIFACT_DIR;
  const profileBytes = fs.readFileSync(path.join(dir, 'T623-mobile-night-baseline-profile.json'));
  const traceBytes = fs.readFileSync(path.join(dir, 'T623-mobile-night-baseline-trace.json'));
  const summaryBytes = fs.readFileSync(path.join(dir, 'mobile-warm-trace623-supervisor.json'));
  assert.equal(mac.sha256(profileBytes), REAL_BASELINE_37991297831.rawProfileSHA256);
  assert.equal(mac.sha256(traceBytes), REAL_BASELINE_37991297831.rawTraceSHA256);
  const report = JSON.parse(summaryBytes), profile = JSON.parse(profileBytes), arm = report.innerSummary.mobileWarmTrace623.arms[0];
  const before = JSON.stringify(report), result = trace.analyzeEvidence623(traceBytes.toString(), profile, arm, trace.LIMITS);
  assert.equal(result.eventCount, 44622); assert.equal(result.profileSamples, 347);
  assert.equal(result.normalization.negativeDeltaCount, 13); assert.equal(result.normalization.reorderedCount, 26);
  assert.deepEqual(result.samples.map(row => row.cpuSampleCount), [36, 3, 9, 10, 10, 3, 6, 4, 3, 4, 4]);
  assert.equal(report.status, 'failed'); assert.equal(report.diagnosticTraceCompleted, false);
  assert.equal(arm.qualified, false); assert.equal(Object.hasOwn(arm, 'latchAfter'), false);
  assert.equal(report.innerSummary.mobileWarmTrace623.arms.length, 1);
  assert.equal(trace.diagnosticComplete(report), false); assert.equal(JSON.stringify(report), before);
  assert.equal(mac.sha256(fs.readFileSync(path.join(dir, 'T623-mobile-night-baseline-profile.json'))), mac.sha256(profileBytes));
  assert.equal(mac.sha256(fs.readFileSync(path.join(dir, 'T623-mobile-night-baseline-trace.json'))), mac.sha256(traceBytes));
  assert.equal(mac.sha256(fs.readFileSync(path.join(dir, 'mobile-warm-trace623-supervisor.json'))), mac.sha256(summaryBytes));
});

test('new warm latch catches recovered loss independently of the unchanged RAF latch', () => {
  const f = latchFixture(); f.latch.begin(); f.handlers.blur(); f.handlers.resize();
  f.doc.visibilityState = 'hidden'; f.handlers.visibilitychange(); f.doc.visibilityState = 'visible';
  const end = f.latch.end(); assert.equal(end.count, 3); assert.equal(end.active, false);
  assert.equal(f.latch.begin().count, 0); f.latch.end();
});

test('existing release acceptance rejects instrumentation even when every other acceptance condition is valid', () => {
  // Reuse the existing synthetic, otherwise-accepted controller fixture; no
  // browser, supervisor, release CLI, deployment or external action is invoked.
  const native = require('./release-native-acceptance.cjs');
  const fixtureSource = fs.readFileSync(path.join(__dirname, 'release-acceptance.test.mjs'), 'utf8');
  const start = fixtureSource.indexOf('function fixture() {'), end = fixtureSource.indexOf("\ntest('policy acceptance", start);
  assert(start > 0 && end > start);
  const report = new Function('clone', 'portability', 'native', 'mac', 'canonical', fixtureSource.slice(start, end) + '\nreturn fixture();')(clone, portability, native, mac, canonical);
  assert.equal(native.acceptance(report).nativeLaneAccepted, true);
  const diagnostic = { ...report, collectionCompleted: false, releaseGatePassed: false, releaseEligible: false,
    instrumentedDiagnostic: true, diagnosticTraceCompleted: true };
  const result = native.acceptance(diagnostic);
  assert.equal(result.nativeLaneAccepted, false);
  assert.deepEqual(result.failures, ['complete unchanged T620 collection']);
});

test('T623 reuses the unchanged supervisor bounds, restores after failure, and does not relax original status', async t => {
  const f = await fixture(); await f.execute('night');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'trace623-test-')); t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const actions = [], inner = { ...f.report, status: 'failed', error: 'Error: original warm p95 failure',
    performanceFailures: ['original warm p95 failure'], mobilePerformance: { night: f.pair }, coverage: { core: true } };
  inner.nativeMac619.complete = true; inner.nativeMac619.windows = Array.from({ length: 9 }, () => ({ qualified: true }));
  const result = await trace.supervise({ out, jobStart: 1000, platform: 'darwin', now: () => 1001, env: {},
    compile: async () => { actions.push('compile'); return {}; },
    invoke: (compiled, action, id) => { actions.push(action); return action === 'inspect' ?
      { ok: true, exitCode: 0, displayID: 1, restoreID: 2, before: { id: 2 } } :
      { ok: true, exitCode: 0, displayID: 1, after: { id: action === 'restore' ? id : 3, width: 1600, height: 1000 } }; },
    run: async (command, args, options) => {
      actions.push('inner'); assert.equal(options.timeoutMs, 38 * 60000); assert.equal(options.terminationGraceMs, 2000);
      fs.writeFileSync(path.join(out, 'native-mac-inner-summary.json'), JSON.stringify(inner));
      return { status: 2, cleanupVerified: true };
    }
  });
  assert.deepEqual(actions, ['compile', 'inspect', 'prepare', 'inner', 'restore']);
  assert.equal(result.status, 'failed'); assert.equal(result.inner.status, 2); assert.equal(result.diagnosticTraceCompleted, true);
  assert.equal(result.collectionCompleted, false); assert.equal(result.releaseEligible, false); assert.equal(result.releaseGatePassed, false);
  assert.deepEqual(result.boundsMs, mac.BOUNDS); assert.equal(result.requiredRemainingMs, 2372000);
  assert.equal(fs.existsSync(path.join(out, 'release-native-acceptance.json')), false);
  assert.equal(fs.existsSync(path.join(out, 'native-portability-supervisor.json')), false);
  await assert.rejects(trace.supervise({ out, jobStart: 1000, platform: 'darwin', now: () => 1001, env: {} }), /EEXIST/);
});
