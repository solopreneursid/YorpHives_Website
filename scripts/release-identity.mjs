// Embedded build identity: keeps a source commit tied to the actual published assets.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const ROOT=resolve(dirname(new URL(import.meta.url).pathname),'..');
export async function writeReleaseIdentity({dir=resolve(ROOT,'dist'),target,sourceSha}){
 if(!['preview','production'].includes(target))throw Error('Invalid release target.');
 const sha=String(sourceSha||'').trim().toLowerCase();
 if(sha&&!/^[a-f0-9]{40}$/.test(sha))throw Error('Source commit must be an exact 40-digit SHA.');
 const names=['index.html','catalog.json','tools/index.html','sitemap.xml','_headers'];
 const checks={};
 for(const name of names){
  const bytes=await readFile(join(dir,name));
  checks[name]=createHash('sha256').update(bytes).digest('hex');
 }
 const fingerprint=createHash('sha256').update(
  Object.entries(checks).sort(([a],[b])=>a.localeCompare(b)).map(([a,b])=>a+':'+b+'\n').join('')
 ).digest('hex');
 const manifest={
  schemaVersion:1,site:'YorpHives',target,
  sourceSha:sha||null,assetFingerprint:fingerprint,assets:checks
 };
 const where=join(dir,'.well-known','yorphives-release.json');
 await mkdir(dirname(where),{recursive:true});
 await writeFile(where,JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const target=process.argv[2],sourceSha=process.argv[3];
 const result=await writeReleaseIdentity({target,sourceSha});
 console.log('RELEASE_IDENTITY '+JSON.stringify({target:result.target,sourceSha:result.sourceSha,assetFingerprint:result.assetFingerprint}));
}
