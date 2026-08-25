// 波3b：編輯器＋export/import code 往返
import { ensureChrome, enterCity } from './helpers.mjs';
import { sleep } from './cdp.mjs';
await ensureChrome();
const c = await enterCity();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(S + n, Buffer.from(r.data, 'base64')); };
const esc = async () => { for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };

// 回主選單
const menuBtn = await c.evalJs(`(()=>{const b=document.querySelector('#bMenu');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
await c.click(menuBtn.x, menuBtn.y);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(700);

// 進編輯器
const ed = await c.evalJs(`(()=>{const b=document.querySelector('#bEditorMode');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
if (!ed) throw new Error('no editor btn');
await c.click(ed.x, ed.y);
await sleep(1500);
out.push('after-editor-click startDisp: ' + await c.evalJs(`(()=>{const s=document.querySelector('#start');return s?getComputedStyle(s).display:'no-#start';})()`));
out.push('editorOn: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.editorOn?GV.editorOn():'n/a')}catch(e){return 'ERR'}})()`));
await shot('w3b-editor.png');
out.push('editor-text: ' + await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el&&el.offsetParent!==null?el.innerText.replace(/\\n+/g,'|').slice(0,400):'infoBody hidden';})()`));

// 匯出 code
const code = await c.evalJs(`(()=>{try{const s=GV.editorExportCode();return typeof s==='string'?s.slice(0,80):JSON.stringify(s)}catch(e){return 'ERR '+e.message}})()`);
out.push('export-code: ' + code);
console.log(out.join('\n'));
process.exit(0);
