import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import identity from './release-identity.cjs';

// T627 (R1/R2): "this release" is the checked-out commit. The seven source pins, the
// version and the cache name are read from git objects when this module loads; the
// working tree must be byte-identical to them, and GITHUB_SHA, when set, must be HEAD.
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CURRENT=identity.currentRelease(ROOT);
export const SOURCE_COMMIT=CURRENT.commit;
export const APP_VERSION=CURRENT.version;
export const CACHE_NAME=CURRENT.cacheName;
export const SOURCE_BLOB_IDS=CURRENT.blobIds;
// T627: the namespace table lives in release-identity.cjs; re-exported so import sites stay unchanged.
export const {SAVE_NAMESPACE,CACHE_PREFIX}=identity;
export const PINS=Object.freeze({...CURRENT.sourcePins});
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function packageFile(name,bytes,pins=PINS){return identity.packageFile(name,bytes,pins);}
export function verifyPackagedFile(name,bytes,pins=PINS){return identity.verifyPackagedFile(name,bytes,pins);}
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
  const manifest={sourceCommit:SOURCE_COMMIT,appVersion:APP_VERSION,saveNamespace:SAVE_NAMESPACE,cachePrefix:CACHE_PREFIX,legacyCacheCleanup:false,sourceBlobIds:{...SOURCE_BLOB_IDS},files:{}};
  for(const [name,bytes] of files){writeFileSync(path.join(out,name),bytes,{flag:'wx'});manifest.files[name]={bytes:bytes.length,sha256:sha256(bytes),sourceSHA256:PINS[name]};}
  return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length!==1)throw Error('Usage: node tools/pages/build-main.mjs OUTPUT_DIRECTORY');
  console.log(JSON.stringify(buildMain({root:ROOT,out:args[0]}),null,2));
}
