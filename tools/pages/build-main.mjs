import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import identity from './release-identity.cjs';

export const SOURCE_COMMIT='23564a810546e585758236553d1432c3aacb760b';
// T627: the namespace table lives in release-identity.cjs; re-exported so import sites stay unchanged.
export const {SAVE_NAMESPACE,CACHE_PREFIX}=identity;
const {substitutions}=identity;
export const PINS=Object.freeze({
  'index.html':'99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d',
  'sw.js':'79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2',
  'manifest.json':'21893d46de8bcf86645c964a7ed160237e4f3fa6c0d23055dc01daa98ee64e3e',
  'icon.svg':'31e67dd794b00928046ab48678aeae26763535ec3b40b94f679ddf37047eaf8b',
  'icon-v1-192.png':'a7252477296cc7704bd3d485c8a3a25bcfb6c36bcb5df2b0dca666bab4537951',
  'icon-v1-512.png':'42d58a67cc90bac9f965dbe8497aa5913aa5907623d2f278c2ba6ccc45566d4d',
  'icon-v1-maskable-512.png':'56ffc2b39731bacf19e121770fdce612c0cc915bb663c1a781d6e1e213005950'
});
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
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
  const manifest={sourceCommit:SOURCE_COMMIT,appVersion:'11.212',saveNamespace:SAVE_NAMESPACE,cachePrefix:CACHE_PREFIX,legacyCacheCleanup:false,files:{}};
  for(const [name,bytes] of files){writeFileSync(path.join(out,name),bytes,{flag:'wx'});manifest.files[name]={bytes:bytes.length,sha256:sha256(bytes),sourceSHA256:PINS[name]};}
  return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const args=process.argv.slice(2);if(args.length!==1)throw Error('Usage: node tools/pages/build-main.mjs OUTPUT_DIRECTORY');
  console.log(JSON.stringify(buildMain({root,out:args[0]}),null,2));
}
