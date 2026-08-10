// 提取 HERO_PIX 指定鍵 → JSON（供樣張渲染）
const fs = require('fs');
const path = process.argv[2], out = process.argv[3];
const html = fs.readFileSync(path, 'utf8');
const m = html.match(/const HERO_PIX=\{\n([\s\S]*?)\n\};/);
const wl = ['6_1_0','7_1_0','11'];
const keys = {};
for (const l of m[1].split('\n')) {
  const km = l.match(/^\s*'([^']+)':\{/);
  if (!km || !wl.includes(km[1])) continue;
  keys[km[1]] = eval('({' + l.trim().replace(/,$/, '') + '})')[km[1]];
}
fs.writeFileSync(out, JSON.stringify(keys));
