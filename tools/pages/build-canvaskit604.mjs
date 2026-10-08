import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {SAVE_NAMESPACE,CACHE_PREFIX,PINS} from './build-main.mjs';
import {lock} from '../vendor/fetch-canvaskit604.mjs';
const require=createRequire(import.meta.url),contract=require('../../docs/tasks/t604-canvaskit/source-contract.cjs');
export function buildCandidate604({root,out}){
  root=path.resolve(root);out=path.resolve(out);if(out===root||root.startsWith(out+path.sep))throw Error('Output must not replace source');
  const source=contract.verify(root),files=[...Object.keys(PINS),...contract.extraFiles.map(f=>f.slice(2))];
  if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Output must be new or empty');fs.mkdirSync(out,{recursive:true});
  const manifest={candidate:'T604 CanvasKit whole-frame prototype',releaseGatePassed:false,source,saveNamespace:SAVE_NAMESPACE,cachePrefix:CACHE_PREFIX,canvaskit:lock.version,files:{},totalBytes:0};
  for(const name of files){
    const original=fs.readFileSync(path.join(root,name));let bytes=original;
    if(name==='index.html')bytes=Buffer.from(original.toString().replace("const SAVEKEY='glimmerville.v1';",`const SAVEKEY='${SAVE_NAMESPACE}';`));
    else if(name==='sw.js')bytes=Buffer.from(original.toString().replace("const CACHE_PREFIX='glimmerville-shell-';",`const CACHE_PREFIX='${CACHE_PREFIX}';`).replace("const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);","const LEGACY_CACHES=new Set([]);"));
    else if(name in PINS&&contract.sha256(original)!==PINS[name])throw Error('Original platform asset changed: '+name);
    if(name.startsWith('vendor/')){const sourceName=name.endsWith('/LICENSE')?'LICENSE':'bin/'+path.basename(name),pin=lock.files[sourceName];if(!pin||original.length!==pin.bytes||contract.sha256(original)!==pin.sha256)throw Error('Vendor pin mismatch: '+name);}
    const destination=path.join(out,name);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
    manifest.files[name]={bytes:bytes.length,sha256:contract.sha256(bytes),sourceSHA256:contract.sha256(original)};manifest.totalBytes+=bytes.length;
  }
  return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(!process.argv[2])throw Error('Output directory required');console.log(JSON.stringify(buildCandidate604({root:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out:process.argv[2]}),null,2));}
