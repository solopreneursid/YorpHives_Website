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
if(response.status===404){
 await record('not_activated');
 console.error('RELEASE_GATE_NOT_ACTIVATED: public site lacks a revision manifest. This is not proof that the currently live site is down.');
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
