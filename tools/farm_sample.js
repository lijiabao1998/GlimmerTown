// T395 樣張渲染器:從 index.html 抽出 field/plantGrid 原文 eval,按等距佈局拼 3x3 田塊
// 目的=展示「跨格連續」效果並做新舊對比。只用 fillRect,故 mock canvas 30 行即可。
const fs = require('fs'), zlib = require('zlib'), path = require('path');

function mkCanvas(W, H, bg) {
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { buf[i*4]=bg[0]; buf[i*4+1]=bg[1]; buf[i*4+2]=bg[2]; buf[i*4+3]=255; }
  let cur = [0,0,0];
  const ctx = {
    set fillStyle(v) {
      if (typeof v === 'string' && v[0] === '#') {
        const h = v.slice(1);
        const s = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
        cur = [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
      }
    },
    get fillStyle() { return '#000'; },
    fillRect(x, y, w, h) {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      for (let yy = y; yy < y + h; yy++) {
        if (yy < 0 || yy >= H) continue;
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || xx >= W) continue;
          const o = (yy * W + xx) * 4;
          buf[o] = cur[0]; buf[o+1] = cur[1]; buf[o+2] = cur[2]; buf[o+3] = 255;
        }
      }
    }
  };
  return { ctx, buf, W, H };
}

function png(W, H, buf) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- 從 index.html 抽出 T279 區塊的定義原文 ----
const REPO = process.argv[2];
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const i0 = html.indexOf('/* ===== T279 精細田地層');
const i1 = html.indexOf('/* ===== T279 精細田地層 END');
const blk = html.slice(i0, i1);
// 一次抓 SOIL..plantGrid 全段(分段切片太脆);外部依賴僅 shade,樣張不需精確明暗
const a0 = blk.indexOf('const SOIL='), a1 = blk.indexOf('/* T281');
if (a0 < 0 || a1 < a0) throw new Error('T279 段落定位失敗');
let src = blk.slice(a0, a1);
// 預覽用:可覆寫 fsc395 的分母以模擬 T396 的密植分級(argv[6])
if (process.argv[6]) src = src.replace(/const fsc395=\(hw\)=>\{[^\n]*\};/,
  'const fsc395=(hw)=>{const s=Math.round(hw/' + (+process.argv[6]) + ');return s<=1?1:s<=3?2:s<=6?4:8;};');
const shade = (c, d) => c;
const mod = eval('(function(shade){' + src + '\nreturn {field, plantGrid, CCLASS};})')(shade);

// ---- 等距佈局:3x3 農場(每座 2x2 格),相鄰農場 x+2→(+64,+32)、y+2→(-64,+32) ----
const S = +(process.argv[4] || 1); // 季節
const HW = +(process.argv[5] || 40), HH = Math.round(HW / 2); // 田半寬(64=鋪滿 2x2 footprint)
const W = 700, H = 460;
const cv = mkCanvas(W, H, [116, 178, 88]);
const CX = 350, CY = 160;
const CROPS = [1, 1, 1, 1, 1, 1, 1, 1, 1]; // 同作物=最能看出壟行是否連續
let n = 0;
for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
  const dsx = (gx - gy) * 64, dsy = (gx + gy) * 32;
  const ax = CX + dsx, ay = CY + dsy + 16; // field 內部 cy=ay-16
  mod.field(cv.ctx, ax, ay, HW, HH, S);
  mod.plantGrid(cv.ctx, ax, ay, HW, HH, mod.CCLASS[CROPS[n]], S);
  n++;
}
fs.writeFileSync(process.argv[3], png(W, H, cv.buf));
console.log('wrote', process.argv[3], 'from', REPO);
