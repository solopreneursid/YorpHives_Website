// A few *read-only* calls to public endpoints, never a backend load test.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const BASE='https://073b7c05.yorphives-v1-review.pages.dev';
const checks=[];
for(const path of ['/api/agent/v1/openapi.json','/api/agent/v1/tools']){
 let value={path},response;
 try{
  const started=performance.now();
  response=await fetch(BASE+path,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json','User-Agent':'YorpHives-Authorized-Read-Only-QA/1.0'}});
  value={...value,status:response.status,ms:Math.round(performance.now()-started)};
  assert.equal(response.status,200,'Public read endpoint unavailable');
  const json=await response.json();
  assert.ok(json&&typeof json==='object','Malformed JSON payload');
  value.ok=true;
 }catch(e){value.ok=false;value.reason=String(e).slice(0,300)}
 checks.push(value);
}
await writeFile(new URL('./review-api-100rps.json',import.meta.url),JSON.stringify({target:BASE,checks},null,2)+'\n');
console.log(JSON.stringify({checks},null,2));
if(checks.some(x=>!x.ok))process.exitCode=1;
