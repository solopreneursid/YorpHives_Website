// Read-only production drift detection: compare deployed bytes to the release manifest.
import {verifyRemote} from './release-verify.mjs';
import {appendFile} from 'node:fs/promises';
const record=async state=>{if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'gate_state='+state+'\n');};
const origin=process.argv[2]||'https://yorphives.com';
const base=new URL(origin);
if(base.origin!=='https://yorphives.com')throw Error('Only the canonical YorpHives domain may be monitored.');
const response=await fetch('https://yorphives.com/.well-known/yorphives-release.json',{
 headers:{'cache-control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(15000)
});
const type=response.headers.get('content-type')||'';
// Cloudflare Pages may serve the homepage (200 text/html) for a missing static JSON path.
// Distinguish that missing release identity from a present but corrupted JSON manifest.
if(response.status===404||response.status===200&&!/application\/json/i.test(type)){
 await record('identity_missing');
 console.error('RELEASE_IDENTITY_MISSING: no deployed JSON release manifest. The old live site may predate first activation; confirm the active Cloudflare deployment before treating this as drift.');
 process.exitCode=2;
}else{
 if(!response.ok)throw Error('Live identity endpoint failed: HTTP '+response.status);
 const manifest=await response.json();
 const result=await verifyRemote({
  origin:base.origin,sourceSha:manifest.sourceSha,
  fingerprint:manifest.assetFingerprint,target:'production'
 });
 await record('verified');
 console.log('LIVE_RELEASE_INTEGRITY_PASS '+JSON.stringify(result));
}
