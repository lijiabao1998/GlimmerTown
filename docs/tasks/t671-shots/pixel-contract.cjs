/* Exact existing repository px601 interpreter, read-only extraction.
   Default: software-mask contract replay. --native explicitly selects native
   Canvas parity checks; missing native dependencies are errors, never fallback. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../../test_fixde.js'),'utf8');
const start=source.indexOf('  const px601=');
const end=source.indexOf("  // 在 fn 期間，document.createElement('canvas')",start);
assert(start>=0&&end>start,'exact px601 source boundaries available');
const implementation=source.slice(start,end);
assert(implementation.includes("throw Error('px601 不支援 ctx.'"),'px601 unsupported operations remain fail-closed');
const px601=Function(implementation+'\nreturn px601;')();
const native=process.argv.includes('--native');
const backend=native?'native-canvas':'repository-px601-software-mask';
const createCanvas=native?require('@napi-rs/canvas').createCanvas:(width,height)=>{const c=px601();c.width=width;c.height=height;return c;};
module.exports={createCanvas,backend};
