'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=JSON.parse(fs.readFileSync(path.join(__dirname,'BASELINE.json'),'utf8'));
const block='<!-- T604 isolated renderer candidate; local pinned assets, no runtime CDN. -->\n<script src="vendor/canvaskit-0.42.0/canvaskit.js"></script>\n<script src="renderers/t604-recorder.js"></script>\n<script src="renderers/t604-canvaskit-player.js"></script>\n<script src="renderers/t604-controller.js"></script>\n';
const current="const cvs=$('#game'), nativeCtx604=cvs.getContext('2d');\nconst renderer604=typeof window.TownRenderer604==='object'?window.TownRenderer604.attach(cvs,nativeCtx604):null;\nconst ctx=renderer604?renderer604.context:nativeCtx604;";
const additions=[block,"  if(renderer604)renderer604.begin(); // T604: produce one ordered frame; no model replay\n","  if(renderer604)renderer604.end(); // T604: one GPU replay or whole-frame native fallback\n"];
const extraFiles=["./renderers/t604-recorder.js","./renderers/t604-canvaskit-player.js","./renderers/t604-controller.js","./vendor/canvaskit-0.42.0/canvaskit.js","./vendor/canvaskit-0.42.0/canvaskit.wasm","./vendor/canvaskit-0.42.0/LICENSE"];
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function invertIndex(html){
  for(const addition of additions){if(html.split(addition).length!==2)throw Error('Renderer source hook drift');html=html.replace(addition,'');}
  if(html.split(current).length!==2)throw Error('Renderer context boundary drift');
  html=html.replace(current,"const cvs=$('#game'), ctx=cvs.getContext('2d');");
  if(sha256(html)!==base.runtimeSHA256['index.html'])throw Error('Game/art/model changed beyond renderer hooks');return html;
}
function invertSW(text){const from="  './icon-v1-maskable-512.png',\n"+extraFiles.map(s=>"  '"+s+"'").join(',\n');if(text.split(from).length!==2)throw Error('Candidate shell list drift');text=text.replace(from,"  './icon-v1-maskable-512.png'");if(sha256(text)!==base.runtimeSHA256['sw.js'])throw Error('SW behavior changed outside candidate shell assets');return text;}
function verify(root){const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');return {base,baselineIndexSHA256:sha256(invertIndex(html)),baselineSWSHA256:sha256(invertSW(sw)),candidateIndexSHA256:sha256(html),candidateSWSHA256:sha256(sw)};}
module.exports={invertIndex,invertSW,extraFiles,verify,sha256};
if(require.main===module)console.log(JSON.stringify(verify(path.resolve(__dirname,'../../..')),null,2));
