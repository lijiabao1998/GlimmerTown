import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
export const lock=JSON.parse(fs.readFileSync(path.join(here,'canvaskit-0.42.0.lock.json'),'utf8'));
const digest=(bytes,kind='sha256')=>crypto.createHash(kind).update(bytes).digest('hex');
export async function fetchCanvasKit604({out,tarballPath}={}){
  out=path.resolve(out||path.join(here,'../../vendor/canvaskit-0.42.0'));
  const bytes=tarballPath?fs.readFileSync(tarballPath):Buffer.from(await(await fetch(lock.tarball)).arrayBuffer());
  const integrity='sha512-'+crypto.createHash('sha512').update(bytes).digest('base64');
  if(integrity!==lock.integrity||digest(bytes,'sha1')!==lock.shasum||digest(bytes)!==lock.tarballSHA256)throw Error('Official CanvasKit tarball digest mismatch');
  const archive=zlib.gunzipSync(bytes),files=new Map();
  for(let pos=0;pos+512<=archive.length;){
    const header=archive.subarray(pos,pos+512);if(header.every(b=>b===0))break;
    const name=header.subarray(0,100).toString('utf8').split('\0')[0],size=parseInt(header.subarray(124,136).toString('ascii').replace(/\0.*$/,''),8)||0;
    const relative=name.replace(/^package\//,'');
    if(relative in lock.files)files.set(relative,archive.subarray(pos+512,pos+512+size));
    pos+=512+Math.ceil(size/512)*512;
  }
  fs.mkdirSync(out,{recursive:true});const result={version:lock.version,license:lock.license,tarballBytes:bytes.length,tarballSHA256:digest(bytes),files:{}};
  for(const[name,pin]of Object.entries(lock.files)){
    const value=files.get(name);if(!value||value.length!==pin.bytes||digest(value)!==pin.sha256)throw Error('Pinned CanvasKit file mismatch: '+name);
    const target=path.join(out,path.basename(name));fs.writeFileSync(target,value);result.files[path.basename(name)]={bytes:value.length,sha256:digest(value)};
  }
  fs.writeFileSync(path.join(out,'vendor-lock.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log(JSON.stringify(await fetchCanvasKit604({out:process.argv[2],tarballPath:process.argv[3]}),null,2));
}
