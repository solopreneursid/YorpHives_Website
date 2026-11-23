// Fail-closed remote release check: actual live bytes must match approved build hashes.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const REQUIRED=['index.html','catalog.json','tools/index.html','sitemap.xml','_headers'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function inspectRelease(manifest,{target,sourceSha,fingerprint}={}){
 if(manifest?.schemaVersion!==1||manifest?.site!=='YorpHives'||!['preview','production'].includes(manifest.target))
  throw Error('Missing or invalid YorpHives release identity.');
 if(target&&manifest.target!==target)throw Error('Wrong release target: '+manifest.target);
 if(!SHA.test(manifest.sourceSha||''))throw Error('Deployment lacks an exact source commit.');
 if(sourceSha&&manifest.sourceSha!==sourceSha.toLowerCase())throw Error('Wrong source commit deployed.');
 if(!HASH.test(manifest.assetFingerprint||''))throw Error('Invalid asset fingerprint.');
 if(fingerprint&&manifest.assetFingerprint!==fingerprint.toLowerCase())throw Error('Build fingerprint differs from approved artifact.');
 for(const name of REQUIRED)if(!HASH.test(manifest.assets?.[name]||''))throw Error('Missing hashed asset: '+name);
 const computed=digest(Object.entries(manifest.assets).sort(([a],[b])=>a.localeCompare(b)).map(([a,b])=>a+':'+b+'\n').join(''));
 if(manifest.assetFingerprint!==computed)throw Error('Asset manifest fingerprint is inconsistent.');
 return true;
}
export async function verifyRemote({origin,sourceSha,fingerprint,target='production',fetcher=fetch}){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)
  throw Error('Release verification requires a clean HTTPS origin.');
 const base=url.origin+'/';
 const get=async(path)=>{
  const r=await fetcher(new URL(path,base),{
   headers:{'cache-control':'no-cache'},redirect:'error',
   signal:AbortSignal.timeout(15000)
  });
  if(r.status!==200)throw Error('Missing deployed path '+path+': HTTP '+r.status);
  return new Uint8Array(await r.arrayBuffer());
 };
 const bytes=await get('.well-known/yorphives-release.json');
 let manifest;
 try{manifest=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('Live release identity is not JSON.');}
 inspectRelease(manifest,{target,sourceSha,fingerprint});
 // _headers is a deployment configuration file in Pages and is not publicly served.
 // Verify publicly retrievable assets byte-for-byte.
 const publicPaths={'index.html':'','tools/index.html':'tools/'};
 for(const name of REQUIRED.filter(x=>x!=='_headers')){
  const data=await get(publicPaths[name]??name);
  if(digest(data)!==manifest.assets[name])throw Error('Live asset mismatch: '+name);
 }
 const sitemap=new TextDecoder().decode(await get('sitemap.xml'));
 if(!sitemap.includes('yorphives.com'))throw Error('Unexpected public sitemap content.');
 return {sourceSha:manifest.sourceSha,target:manifest.target,assetFingerprint:manifest.assetFingerprint,origin:base};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const [origin,sourceSha,fingerprint,target='production']=process.argv.slice(2);
 if(!origin||!sourceSha||!fingerprint)throw Error('Usage: node scripts/release-verify.mjs <https-origin> <source-SHA> <fingerprint> [preview|production]');
 console.log('LIVE_RELEASE_VERIFIED '+JSON.stringify(await verifyRemote({origin,sourceSha,fingerprint,target})));
}
