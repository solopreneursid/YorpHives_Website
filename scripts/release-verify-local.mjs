// Verify an unpacked immutable release artifact before allowing upload.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative} from 'node:path';
import {inspectRelease} from './release-verify.mjs';
export async function verifyLocal({directory,sourceSha,fingerprint,target='production'}){
 const root=resolve(directory);
 const marker=JSON.parse(await readFile(join(root,'.well-known','yorphives-release.json'),'utf8'));
 inspectRelease(marker,{sourceSha,fingerprint,target});
 const walk=async(rel='')=>{
  const records=[];
  for(const e of await readdir(join(root,rel),{withFileTypes:true})){
   const name=rel?rel+'/'+e.name:e.name;
   if(name==='.well-known/yorphives-release.json')continue;
   if(e.isDirectory())records.push(...await walk(name));
   else if(e.isFile())records.push(name);
   else throw Error('Unsupported release output type: '+name);
  }
  return records;
 };
 const names=(await walk()).sort();
 const expected=Object.keys(marker.assets).sort();
 if(JSON.stringify(names)!==JSON.stringify(expected))throw Error('Candidate contains unaccounted or missing assets.');
 for(const name of expected){
  const digest=createHash('sha256').update(await readFile(join(root,name))).digest('hex');
  if(digest!==marker.assets[name])throw Error('Candidate asset tampered: '+name);
 }
 return {sourceSha:marker.sourceSha,assetFingerprint:marker.assetFingerprint,assets:names.length};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const [directory,sourceSha,fingerprint,target]=process.argv.slice(2);
 if(!directory||!sourceSha||!fingerprint)throw Error('Usage: node scripts/release-verify-local.mjs <dist> <source-SHA> <fingerprint> [target]');
 console.log('LOCAL_RELEASE_VERIFIED '+JSON.stringify(await verifyLocal({directory,sourceSha,fingerprint,target})));
}
