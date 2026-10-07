import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SOURCE_COMMIT='4e8823781178ea69e7862bbf3db2a74328080291';
export const SAVE_NAMESPACE='glimmerville.main.v1';
export const CACHE_PREFIX='glimmerville-main-shell-';
export const PINS=Object.freeze({
  'index.html':'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265',
  'sw.js':'836d1d867d10d6c63d71c722d3337e5b7119ad36006314f74872583ec029dd3b',
  'manifest.json':'21893d46de8bcf86645c964a7ed160237e4f3fa6c0d23055dc01daa98ee64e3e',
  'icon.svg':'31e67dd794b00928046ab48678aeae26763535ec3b40b94f679ddf37047eaf8b',
  'icon-v1-192.png':'a7252477296cc7704bd3d485c8a3a25bcfb6c36bcb5df2b0dca666bab4537951',
  'icon-v1-512.png':'42d58a67cc90bac9f965dbe8497aa5913aa5907623d2f278c2ba6ccc45566d4d',
  'icon-v1-maskable-512.png':'56ffc2b39731bacf19e121770fdce612c0cc915bb663c1a781d6e1e213005950'
});
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const substitutions=Object.freeze({
  'index.html':[["const SAVEKEY='glimmerville.v1';",`const SAVEKEY='${SAVE_NAMESPACE}';`]],
  'sw.js':[["const CACHE_PREFIX='glimmerville-shell-';",`const CACHE_PREFIX='${CACHE_PREFIX}';`],
    ["const LEGACY_CACHES=new Set(['gv-v1','gv-v2']);","const LEGACY_CACHES=new Set([]);"]]
});
export function packageFile(name,bytes){
  if(!(name in PINS)||sha256(bytes)!==PINS[name])throw Error('Unverified main source: '+name);
  let text=bytes.toString('utf8');
  for(const [from,to] of substitutions[name]||[]){
    if(text.split(from).length!==2)throw Error('Expected unique namespace anchor: '+name);
    text=text.replace(from,to);
  }
  return substitutions[name]?Buffer.from(text):Buffer.from(bytes);
}
export function verifyPackagedFile(name,bytes){
  let original=bytes;
  if(substitutions[name]){
    let text=bytes.toString('utf8');
    for(const [from,to] of substitutions[name]){
      if(text.split(to).length!==2)throw Error('Expected unique packaged namespace: '+name);
      text=text.replace(to,from);
    }
    original=Buffer.from(text);
  }
  if(!(name in PINS)||sha256(original)!==PINS[name])throw Error('Unexpected change outside namespace: '+name);
  return true;
}
export function buildMain({root,out}){
  root=path.resolve(root);out=path.resolve(out);
  if(out===root||root.startsWith(out+path.sep))throw Error('Output must not replace source root');
  const files=new Map();
  for(const name of Object.keys(PINS)){
    const source=path.join(root,name);
    if(!lstatSync(source).isFile()||lstatSync(source).isSymbolicLink())throw Error('Expected regular source file: '+name);
    const bytes=packageFile(name,readFileSync(source));verifyPackagedFile(name,bytes);files.set(name,bytes);
  }
  if(existsSync(out)&&(lstatSync(out).isSymbolicLink()||!lstatSync(out).isDirectory()||readdirSync(out).length))throw Error('Output must be a new or empty directory');
  mkdirSync(out,{recursive:true});
  const manifest={sourceCommit:SOURCE_COMMIT,appVersion:'11.211',saveNamespace:SAVE_NAMESPACE,cachePrefix:CACHE_PREFIX,legacyCacheCleanup:false,files:{}};
  for(const [name,bytes] of files){writeFileSync(path.join(out,name),bytes,{flag:'wx'});manifest.files[name]={bytes:bytes.length,sha256:sha256(bytes),sourceSHA256:PINS[name]};}
  return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const args=process.argv.slice(2);if(args.length!==1)throw Error('Usage: node tools/pages/build-main.mjs OUTPUT_DIRECTORY');
  console.log(JSON.stringify(buildMain({root,out:args[0]}),null,2));
}
