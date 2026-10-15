'use strict';
/* T648 整幀比對與接觸表：同一個釘版 Chromium 裡把 base 與 head 的遊戲畫面逐幀比，畫布 RGBA 逐位元組。
   用法（CI 的 frame job）：node tools/pages/frame-compare.cjs --base <sha> --scope evidence/scope.json --out evidence/frame
         node tools/pages/frame-compare.cjs --self-test     （只跑判定與解析的純函式，不開瀏覽器）
   判定（tools/scope.py 的結果給本 PR 那張卡的卡頭）：
   1. 純 revert：跳過（它只是把畫面退回 main 有過的樣子）。
   2. base 在兩個獨立分頁各算一次必須逐幀相同，每一幀畫兩次也必須相同——否則是量具本身不穩，結束碼 3。
   3. head 和 base 有任何一幀不同：卡頭 owner_ok 是空的就紅（非美術卡要畫面零變；美術卡要業主看接觸表點頭再寫 owner_ok）。
   4. 卡頭 valve 寫了逃生閥（?noTNNN／window.__noTNNN）：head 打開這些閥後必須和 base 逐幀相同，否則紅（閥漏關）。
   5. 有不同的幀就出接觸表（base｜head｜差異），放在 --out，CI 會上傳；美術卡卻沒有任何一幀變，只警告（新圖不在場景裡）。
   結束碼：0＝綠；1＝紅；2＝用法／環境錯誤；3＝量具不穩。
   場景：seed22／seed777 兩座存檔城市（docs/tasks/t603-shots/fixtures，不跑模擬，換玩法的卡不會連帶改畫面），
   設施與工業各一張全款式陣列（直接寫地塊，比照 t634-shots 的 rig）。每個場景 4 視角×晝夜、秋、雪晝夜；另有一張夜空遠景。 */
const fs = require('fs'), path = require('path'), http = require('http'), {execFileSync} = require('child_process');

const VIEWPORT = {width: 1280, height: 800};
const SHEET_LIMIT = 12;

// ---------- 純函式（--self-test 會測） ----------

function cardOf(scope) {
  const own = (scope.cards || []).filter(c => c.header);
  const header = own.length ? own[0].header : null;
  const families = header ? String(header.families || '').split(/[,，]/).map(s => s.trim()).filter(s => s && s !== '無') : [];
  const valves = header ? [...new Set([...String(header.valve || '').matchAll(/noT(\d{3,4})/g)].map(m => '__noT' + m[1]))] : [];
  return {path: own.length ? own[0].path : null, families, valves, ownerOk: !!(header && header.owner_ok), revertOf: scope.revert_of || null};
}

function verdict({card, baseA, baseB, head, valve}) {
  const ids = Object.keys(baseA).sort();
  const problems = [], warnings = [];
  const unstable = [...ids.filter(id => baseA[id].unstable || baseB[id].unstable || head[id].unstable || (valve && valve[id].unstable))];
  const drift = ids.filter(id => baseA[id].hash !== baseB[id].hash);
  if (unstable.length || drift.length) {
    return {code: 3, problems: [{rule: 'unstable', detail: '量具不穩：同一幀畫兩次不同 ' + unstable.length + '、base 兩個分頁不同 ' + drift.length + '：' + [...unstable, ...drift].slice(0, 8).join('、')}], warnings, changed: [], leaked: []};
  }
  const changed = ids.filter(id => head[id].hash !== baseA[id].hash);
  const leaked = valve ? ids.filter(id => valve[id].hash !== baseA[id].hash) : [];
  // Codex #37 P1：畫面要能變，卡必須同時宣告美術家族並有業主原話；非美術卡的 owner_ok（例如登記冊的批准）不能拿來放行畫面變動
  const shown = changed.slice(0, 8).join('、');
  if (changed.length && !card.families.length)
    problems.push({rule: 'frame-changed', detail: '畫面變了（' + changed.length + ' 幀：' + shown + '），卡頭 families 是「無」——非美術卡要畫面零變' + (card.ownerOk ? '（owner_ok 有字也不算，要宣告美術家族）' : '')});
  else if (changed.length && !card.ownerOk)
    problems.push({rule: 'frame-changed', detail: '畫面變了（' + changed.length + ' 幀：' + shown + '），卡頭 owner_ok 是空的——美術卡要業主看接觸表點頭再寫 owner_ok'});
  // Codex #37 P1：每張新圖都要有逃生閥，閥關時整幀等於 base；畫面變了卻沒寫 valve 就驗不了，判紅
  if (changed.length && card.families.length && !card.valves.length)
    problems.push({rule: 'no-valve', detail: '美術卡的畫面變了，卡頭 valve 卻沒寫逃生閥（?noTNNN／window.__noTNNN）——「閥關時整幀與改前相同」沒辦法驗'});
  if (leaked.length)
    problems.push({rule: 'valve-leak', detail: '打開逃生閥 ' + card.valves.join('、') + ' 後仍和 base 不同（' + leaked.length + ' 幀：' + leaked.slice(0, 8).join('、') + '）——閥漏關了某處'});
  if (card.families.length && !changed.length)
    warnings.push({rule: 'no-visible-change', detail: '卡頭宣告了美術家族 ' + card.families.join('、') + '，但所有場景都沒有變——新圖可能不在場景裡'});
  return {code: problems.length ? 1 : 0, problems, warnings, changed, leaked};
}

function inject(source, label) {
  const hits = source.split('window.GV={').length - 1;
  if (hits !== 1) throw new Error(label + ': expected exactly one "window.GV={" (found ' + hits + ')');
  return source.replace('window.GV={', () => '(' + bridge648.toString() + ')();window.GV={');
}

// ---------- 頁內橋（注入到 window.GV={ 之前，和遊戲同一個作用域） ----------

function bridge648() {
  const freeze = () => {
    running = false; speed = 0;
    for (const a of [cars, citizens, smokes, trains, cargoShips, tramCars, ambulances, recycleTrucks, ladderTrucks, policeCars, schoolBuses, buses, rbuses, lifeShips, rain, fxParts, confetti]) a.length = 0;
    for (let i = 0; i < stars.length; i++) stars[i] = [(i * 37 % 100) / 100, (i * 13 % 80) / 100, (i * 19 % 628) / 100];
    selTile = null; hover.x = hover.y = -1; tool = 'pan'; quality = 1; weather = 0;
    // 動畫細節層（行人、公園生活、煙）與冬季炊煙關掉：它們用 Math.random 生成，兩個分頁不會一樣（試跑實測 industry 場景在 base 兩頁間不同）。
    // 美術、夜燈、倒影都是靜態的，照樣在比對範圍裡。
    window.__noAnim = true; window.__noChimney = true;
    const st = document.getElementById('start'); if (st) st.classList.add('hide');
  };
  const densest = () => {
    let best = {x: N / 2, y: N / 2, score: -1};
    for (let y = 8; y < N - 8; y += 2) for (let x = 8; x < N - 8; x += 2) {
      let score = 0;
      for (let yy = y - 7; yy <= y + 7; yy++) for (let xx = x - 7; xx <= x + 7; xx++) { const b = T(idx(xx, yy)).bld; if (b && !b.ref) score += b.k <= 3 ? 2 : 1; }
      if (score > best.score) best = {x, y, score};
    }
    return [best.x, best.y];
  };
  const rig = ids => { // 直接寫地塊（比照 t634-shots 的 rig），排在 x 20–46 的方塊裡、鏡頭看得到；南邊一條水岸給倒影
    GV.setMapSize(72); GV.newWorldSeeded(648); GV.setDiff(3); GV.ai(false); GV.setSpeed(0); freeze(); money = 1e9;
    for (const t of tiles) Object.assign(t, {t: 2, tree: 0, gv: 0, road: 0, rc: 0, mask: 0, bridge: 0, zone: 0, bld: null, deco: 0, rail: 0, tram: 0, dock: 0, el: 0});
    let x = 20, y = 21, rowH = 0;
    ids.forEach((k, i) => {
      const p = LOT_PLAN574[k], lot = !!(p && lotSpec574(p[0])), n = lot ? p[1] : (k === 9 ? 2 : MSZ[k] || 1);
      if (x + n > 47) { x = 20; y += rowH + 2; rowH = 0; }
      const b = {k, lv: k <= 3 ? 1 + Math.floor(i / 12) % 3 : 1, v: k <= 3 ? i % 12 : i % 3, age: 60, pw: true, wa: true, h: 1, we: 1, den: 3, ...(n >= 2 ? {sz: n} : {}), ...(lot ? {lot574: n} : {})};
      for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) T(idx(x + dx, y + dy)).bld = dx || dy ? {k, ref: [x, y]} : b;
      for (let xx = x - 1; xx <= x + n; xx++) if (inMap(xx, y - 1) && !T(idx(xx, y - 1)).bld) Object.assign(T(idx(xx, y - 1)), {road: 1, rc: 2});
      x += n + 2; rowH = Math.max(rowH, n);
    });
    const bottom = y + rowH + 1;
    for (let yy = bottom + 1; yy < Math.min(72, bottom + 4); yy++) for (let xx = 18; xx < 50; xx++) T(idx(xx, yy)).t = 0;
    recalcAllMasks(); computeFoam(); computePower(); computeWater(); rebuildCov();
    groundDirty = true;
    return [33, Math.round((20 + bottom) / 2)];
  };
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  window.__frame648 = {
    setup: ({scene, fixture, ids, zoom}) => {
      let c;
      if (fixture) { localStorage.setItem('glimmerville.v1.s3', fixture); if (!GV.load()) throw new Error('fixture load rejected: ' + scene); GV.ai(false); GV.setSpeed(0); freeze(); c = densest(); }
      else c = rig(ids);
      // 暖身：第一次繪製會觸發按需烘焙與地面快取，量第一幀之前先在每個季節畫過一次（試跑實測：不暖身時陣列場景的第一幀畫兩次會不同）
      GV.setZoom(zoom); GV.lookAt(c[0], c[1]);
      for (const sea of [1, 2, 3]) { GV.setSeason(sea); rainDays = sea === 3 ? SNOW_ACC_DAYS + 3 : 0; for (const t of [55, 5]) { visT = t; groundDirty = true; GV.forceDraw(); } }
      return c;
    },
    frame: async ({cx, cy, zoom, rot, sea, snow, night, png}) => {
      freeze(); GV.setRot(rot); GV.setSeason(sea); rainDays = snow ? SNOW_ACC_DAYS + 3 : 0; GV.setZoom(zoom); GV.lookAt(cx, cy);
      const draw = () => { visT = night ? 5 : 55; trafClock = 12; waterT = waterF = 0; shakeT = 0; groundDirty = true; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; GV.forceDraw(); };
      // 按需烘焙是跨幀漸進的（換季後快取被擠掉，要畫幾次才收斂；試跑實測）：畫到連續兩次逐位元組相同為止，最多 8 次，收斂不了才算不穩
      const grab = () => { freeze(); draw(); return ctx.getImageData(0, 0, cvs.width, cvs.height).data.slice(); };
      let a = grab(), b = grab(), draws = 2, unstable = 0;
      const diff = () => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
      while ((unstable = diff()) && draws < 8) { a = b; b = grab(); draws++; }
      const hash = hex(await crypto.subtle.digest('SHA-256', b));
      return {hash, unstable, draws, w: cvs.width, h: cvs.height, png: png ? cvs.toDataURL('image/png') : null};
    },
  };
}

// ---------- 場景 ----------

// 陣列場景：T600 以後的新美術都要出現（逃生閥漏關才看得出來）。按位置選款的批次（T638 用 streetHash 選 v0–v2）每種放三份。
const FIRE_LOTS = [6, 30, 61, 6, 30, 61, 6, 30, 61, 8, 60, 63, 66, 53, 104, 117, 29, 85, 88, 92];
const RCI = Array.from({length: 36}, (_, i) => 1 + (i % 3));
const CIVIC = [9, 16, 24, 31, 45, 54, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 86, 90, 93, 94, 96, 98, 99, 101, 103, 107, 112, 115];
const INDUSTRY = [22, 25, 26, 27, 46, 49, 50, 51, 57, 58, 59, 62, 64, 89, 91, 100, 109, 110, 111, 116, 118, 119, 120, 121, 122, 123, 128, 129, 131, 133];

function scenes(repo) {
  const fx = f => fs.readFileSync(path.join(repo, 'docs/tasks/t603-shots/fixtures', f), 'utf8');
  return [
    {scene: 'seed22', fixture: fx('seed22-d3-420-v11.211.json'), zoom: 2, sky: true},
    {scene: 'seed777', fixture: fx('seed777-d1-400-v11.211.json'), zoom: 1},
    {scene: 'fire-lots', ids: FIRE_LOTS, zoom: 0.7},
    {scene: 'rci', ids: RCI, zoom: 0.9},
    {scene: 'civic', ids: CIVIC, zoom: 0.55},
    {scene: 'industry', ids: INDUSTRY, zoom: 0.55},
  ];
}

function states(s) {
  const out = [];
  for (let rot = 0; rot < 4; rot++) for (const night of [false, true]) out.push({id: s.scene + '-r' + rot + (night ? '-night' : '-day'), rot, sea: 1, snow: false, night, zoom: s.zoom});
  out.push({id: s.scene + '-autumn', rot: 0, sea: 2, snow: false, night: false, zoom: s.zoom});
  for (const night of [false, true]) out.push({id: s.scene + '-snow' + (night ? '-night' : '-day'), rot: 0, sea: 3, snow: true, night, zoom: s.zoom});
  if (s.sky) out.push({id: s.scene + '-sky-night', rot: 0, sea: 1, snow: false, night: true, zoom: 0.65});
  return out;
}

// ---------- 瀏覽器 ----------

async function render(browser, origin, key, valves, plan, wantPng) {
  const context = await browser.newContext({viewport: VIEWPORT, deviceScaleFactor: 1, serviceWorkers: 'block'});
  try {
    await context.addInitScript(vs => { localStorage.setItem('glimmerville.v1.slot', '3'); localStorage.setItem('glimmerville.v1.snd', '0'); for (const v of vs) window[v] = true; }, valves);
    await context.route('**/*', r => r.request().url().startsWith(origin + '/') ? r.continue() : r.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const out = {};
    for (const s of plan) {
      await page.goto(origin + '/' + key + '.html');
      await page.waitForFunction(() => window.GV && window.__frame648 && window.__boot426 && __boot426().ready, null, {timeout: 120000});
      const [cx, cy] = await page.evaluate(a => __frame648.setup(a), {scene: s.scene, fixture: s.fixture || null, ids: s.ids || null, zoom: s.zoom});
      for (const st of states(s)) out[st.id] = await page.evaluate(a => __frame648.frame(a), {...st, cx, cy, png: !!wantPng});
    }
    if (errors.length) throw new Error(key + ' page errors: ' + errors.slice(0, 3).join(' | '));
    return out;
  } finally { await context.close(); }
}

async function sheets(browser, outDir, ids, base, head, valve) {
  const page = await browser.newPage();
  const files = [];
  try {
    for (const id of ids) {
      const png = await page.evaluate(async ({id, a, b, c}) => {
        const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
        const imgs = await Promise.all([a, b, c].filter(Boolean).map(load));
        const w = imgs[0].width, h = imgs[0].height, s = 0.5, cols = imgs.length + 1, cw = Math.round(w * s), ch = Math.round(h * s);
        // 差異遮罩：和 base 比，任何一欄（head、head+閥）不同的像素都算；順便求外框，給下面那列原尺寸放大
        const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d');
        const px = im => { tg.clearRect(0, 0, w, h); tg.drawImage(im, 0, 0); return tg.getImageData(0, 0, w, h).data; };
        const A = px(imgs[0]), others = imgs.slice(1).map(px), M = tg.createImageData(w, h);
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let i = 0, p = 0; i < A.length; i += 4, p++) {
          const d = others.some(O => O[i] !== A[i] || O[i + 1] !== A[i + 1] || O[i + 2] !== A[i + 2] || O[i + 3] !== A[i + 3]);
          const O = others[0]; M.data[i] = d ? 255 : O[i] >> 2; M.data[i + 1] = d ? 0 : O[i + 1] >> 2; M.data[i + 2] = d ? 0 : O[i + 2] >> 2; M.data[i + 3] = 255;
          if (d) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        const pad = 16; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = x1 >= x0 ? Math.min(2, cw / bw) : 0, zh = k ? Math.round(bh * k) : 0;
        const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = 24 + ch + (zh ? zh + 24 : 0);
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#20262b'; g.fillRect(0, 0, cv.width, cv.height);
        g.fillStyle = '#e8e4d8'; g.font = '14px monospace'; g.fillText(id + '   base | head' + (c ? ' | head+valve' : '') + ' | diff (red)', 8, 17);
        imgs.forEach((im, i) => g.drawImage(im, i * cw, 24, cw, ch));
        tg.putImageData(M, 0, 0); g.drawImage(t, (cols - 1) * cw, 24, cw, ch);
        if (zh) {
          g.fillText('changed region x' + x0 + '-' + x1 + ' y' + y0 + '-' + y1 + ' (scale ' + k.toFixed(2) + ')', 8, 24 + ch + 17);
          [...imgs, t].forEach((im, i) => g.drawImage(im, x0, y0, bw, bh, i * cw, 24 + ch + 24, Math.round(bw * k), zh));
        }
        return cv.toDataURL('image/png');
      }, {id, a: base[id].png, b: head[id].png, c: valve && valve[id] ? valve[id].png : null});
      const f = path.join(outDir, 'sheet-' + id + '.png');
      fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); files.push(path.basename(f));
    }
  } finally { await page.close(); }
  return files;
}

// ---------- 主程式 ----------

function arg(name, def) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; }

async function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return 0; }
  const repo = path.resolve(arg('--repo', process.cwd())), base = arg('--base'), scopePath = arg('--scope'), outDir = path.resolve(arg('--out', 'evidence/frame'));
  if (!base || !scopePath) { console.error('usage: frame-compare.cjs --base <sha> --scope <scope.json> [--out dir] [--repo dir]'); return 2; }
  fs.mkdirSync(outDir, {recursive: true});
  const card = cardOf(JSON.parse(fs.readFileSync(scopePath, 'utf8')));
  const report = {card, base, scenes: [], problems: [], warnings: [], changed: [], leaked: [], sheets: []};
  const finish = code => { report.code = code; fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1)); summary(report); return code; };
  if (card.revertOf) { report.warnings.push({rule: 'pure-revert', detail: '純 revert（' + card.revertOf.slice(0, 12) + '）：跳過整幀比對'}); return finish(0); }
  const git = (...a) => execFileSync('git', a, {cwd: repo, maxBuffer: 64e6}).toString('utf8');
  const headSrc = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  if (headSrc !== git('show', 'HEAD:index.html')) throw new Error('index.html on disk differs from HEAD');
  const sources = {base: inject(git('show', base + ':index.html'), 'base'), head: inject(headSrc, 'head')};
  const server = http.createServer((req, res) => { const k = new URL(req.url, 'http://x').pathname.slice(1).replace(/\.html$/, ''); res.setHeader('Content-Type', 'text/html;charset=utf-8'); res.end(sources[k] || '<!doctype html>'); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port, {chromium} = require('playwright');
  let browser;
  try {
    browser = await chromium.launch({executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--disable-background-networking', '--mute-audio']});
    report.browser = browser.version();
    const plan = scenes(repo); report.scenes = plan.map(s => s.scene);
    const t0 = Date.now();
    // 第一輪就留 PNG（接觸表要用），不必等比完再整套重算三次（試跑：總時間 15 分→約 7 分）；第二輪 base 只為驗確定性
    const baseA = await render(browser, origin, 'base', [], plan, true), baseB = await render(browser, origin, 'base', [], plan, false);
    const head = await render(browser, origin, 'head', [], plan, true);
    const valve = card.valves.length ? await render(browser, origin, 'head', card.valves, plan, true) : null;
    report.frames = Object.keys(baseA).length; report.seconds = Math.round((Date.now() - t0) / 1000);
    const v = verdict({card, baseA, baseB, head, valve});
    Object.assign(report, {problems: v.problems, warnings: v.warnings, changed: v.changed, leaked: v.leaked});
    report.slowToSettle = Object.keys(head).filter(id => head[id].draws > 2 || baseA[id].draws > 2).map(id => id + '（base ' + baseA[id].draws + '／head ' + head[id].draws + ' 次）');
    const show = [...new Set([...v.changed, ...v.leaked])].slice(0, SHEET_LIMIT);
    if (v.code !== 3 && show.length) {
      report.sheets = await sheets(browser, outDir, show, baseA, head, valve);
      if (new Set([...v.changed, ...v.leaked]).size > SHEET_LIMIT) report.warnings.push({rule: 'sheet-limit', detail: '接觸表只出前 ' + SHEET_LIMIT + ' 幀'});
    }
    return finish(v.code);
  } finally { if (browser) await browser.close(); server.close(); }
}

function summary(r) {
  const lines = ['## 整幀比對（T648）', '', '- 結論：' + (r.code === 0 ? '綠' : r.code === 3 ? '**量具不穩**' : '**紅**'),
    '- 卡：' + (r.card.path || '無') + '；families：' + (r.card.families.join('、') || '無') + '；valve：' + (r.card.valves.join('、') || '無') + '；owner_ok：' + (r.card.ownerOk ? '有' : '空'),
    '- 場景 ' + r.scenes.length + '、每頁 ' + (r.frames || 0) + ' 幀；畫面變了 ' + r.changed.length + ' 幀' + (r.card.valves.length ? '；閥關後仍不同 ' + r.leaked.length + ' 幀' : '') + (r.seconds ? '；' + r.seconds + ' 秒' : '')];
  lines.push(...r.problems.map(p => '- ❌ `' + p.rule + '` ' + p.detail), ...r.warnings.map(p => '- ⚠️ `' + p.rule + '` ' + p.detail));
  if (r.sheets.length) lines.push('- 接觸表（附件 Town-main-frame-<sha>）：' + r.sheets.join('、'));
  const text = lines.join('\n') + '\n';
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
}

// ---------- 自測 ----------

function selfTest() {
  const assert = require('assert/strict');
  const H = h => ({hash: h, unstable: 0});
  const frames = (o = {}) => ({a: H('1'), b: H('2'), ...o});
  const card = (o = {}) => ({path: 'docs/tasks/T650-x.md', families: [], valves: [], ownerOk: false, revertOf: null, ...o});
  const run = o => verdict({card: card(o.card), baseA: frames(), baseB: o.baseB || frames(), head: o.head || frames(), valve: o.valve || null});
  assert.equal(run({}).code, 0, 'identical frames are green');
  assert.deepEqual(run({head: frames({b: H('9')})}).problems.map(p => p.rule), ['frame-changed'], 'non-art change is red');
  assert.equal(run({head: frames({b: H('9')}), card: {ownerOk: true, families: ['art638'], valves: ['__noT638']}, valve: frames()}).code, 0, 'approved art with a working valve is green');
  assert.deepEqual(run({head: frames({b: H('9')}), card: {ownerOk: true, families: ['art638'], valves: ['__noT638']}, valve: frames({b: H('9')})}).problems.map(p => p.rule), ['valve-leak'], 'leaking valve is red');
  assert.deepEqual(run({card: {families: ['art638']}}).warnings.map(w => w.rule), ['no-visible-change']);
  assert.deepEqual(run({head: frames({b: H('9')}), card: {ownerOk: true, families: ['art638']}}).problems.map(p => p.rule), ['no-valve'], 'art change without a valve is red (Codex #37 P1)');
  assert.deepEqual(run({head: frames({b: H('9')}), card: {ownerOk: true}}).problems.map(p => p.rule), ['frame-changed'], 'owner_ok on a non-art card does not waive frame changes (Codex #37 P1)');
  assert.deepEqual(run({head: frames({b: H('9')}), card: {families: ['art638'], valves: ['__noT638']}, valve: frames()}).problems.map(p => p.rule), ['frame-changed'], 'art change without owner_ok is red');
  assert.equal(run({baseB: frames({a: H('7')})}).code, 3, 'base drift is unstable');
  assert.equal(run({head: frames({a: {hash: '1', unstable: 4}})}).code, 3, 'a frame that changes between two draws is unstable');
  const c = cardOf({cards: [{path: 'p', header: {families: 'art638, park', valve: '?noT638 / window.__noT638 ?noT638', owner_ok: '上綫吧'}}], revert_of: null});
  assert.deepEqual(c.families, ['art638', 'park']); assert.deepEqual(c.valves, ['__noT638']); assert.equal(c.ownerOk, true);
  const blank = cardOf({cards: [{path: 'p', header: {families: '無', valve: '', owner_ok: ''}}]});
  assert.deepEqual(blank.families, []); assert.equal(blank.ownerOk, false, 'empty owner_ok is not consent'); assert.deepEqual(blank.valves, []);
  assert.equal(cardOf({cards: [{path: 'old', header: null}]}).ownerOk, false, 'a card without header gives no consent');
  assert.equal(cardOf({cards: [], revert_of: 'abc'}).revertOf, 'abc');
  assert.throws(() => inject('no hook', 'x'), /exactly one/); assert.throws(() => inject('window.GV={}window.GV={}', 'x'), /found 2/);
  assert.ok(inject('a;window.GV={b:1}', 'x').includes('__frame648'));
  console.log('frame-compare self-test: ok');
}

if (require.main === module) main().then(c => process.exit(c), e => { console.error(e.stack || e.message); process.exit(2); });
module.exports = {cardOf, verdict, inject, states, scenes};
