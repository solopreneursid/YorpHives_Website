// Remote HTTP smoke tests for an isolated Workers Static Assets pilot.
// Read-only; no analytics events, user data, credentials or synthetic traffic seeding.
import assert from 'node:assert/strict';
const base='https://yorphives-edge-static-pilot.solopreneursid-proy.workers.dev';
async function get(path,{redirect='follow'}={}){
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),12000);
 try{
  const response=await fetch(base+path,{redirect,signal:control.signal,headers:{'user-agent':'YorpHives-Release-Safety-Check/1.0','accept':'*/*'}});
  const type=response.headers.get('content-type')||'';
  return {response,type,body:await response.text()};
 }finally{clearTimeout(timer)}
}
const checks=[];
function record(label,fn){checks.push((async()=>{await fn();console.log('PASS '+label)})());}
record('staging homepage renders redesigned root and carries noindex response header',async()=>{
 const {response,body}=await get('/');
 assert.equal(response.status,200);
 assert.match(body,/id="yh-pulse"/);
 assert.match(response.headers.get('x-robots-tag')||'',/noindex/i);
});
record('tool directory and working direct tool page',async()=>{
 for(const path of ['/tools/','/tools/image-resizer/']){
  const {response,body}=await get(path);
  assert.equal(response.status,200,path);
  assert.match(body,/<html/i);
 }
});
record('public agent capabilities only, with zero remote-execution claims',async()=>{
 const {response,body}=await get('/api/agent/v1/capabilities');
 assert.equal(response.status,200);
 const data=JSON.parse(body);
 assert.equal(data.actions.executeRemote,false);
 assert.equal(data.actions.purchase,false);
 assert.equal(data.itemsCount,data.items.length);
 assert.ok(data.itemsCount>100);
});
record('OpenAPI is read-only 3.1',async()=>{
 const {response,body}=await get('/api/agent/v1/openapi.json');
 assert.equal(response.status,200);
 const data=JSON.parse(body);
 assert.equal(data.openapi,'3.1.0');
 assert.deepEqual(Object.keys(data.paths).sort(),['/api/agent/v1/capabilities','/api/agent/v1/openapi.json']);
});
record('staging analytics report responds without synthetic seed',async()=>{
 const {response,body}=await get('/api/insights/public');
 assert.equal(response.status,200);
 assert.equal(JSON.parse(body).available,true);
});
record('static machine metadata and crawler controls',async()=>{
 const meta=await get('/.well-known/agentic.json');assert.equal(meta.response.status,200);
 assert.equal(JSON.parse(meta.body).remoteExecution,false);
 const robots=await get('/robots.txt');assert.equal(robots.response.status,200);
 assert.match(robots.body,/Disallow: \/|noindex/i);
 const llms=await get('/llms.txt');assert.equal(llms.response.status,200);
 assert.match(llms.body,/Agent-friendly discovery/);
});
record('legacy redirects preserved',async()=>{
 const {response}=await get('/free-tools/',{redirect:'manual'});
 assert.equal(response.status,302);
 assert.match(response.headers.get('location')||'',/\/tools\/?$/);
});
record('unknown static files do not return a fake successful page',async()=>{
 const {response}=await get('/not-a-real-yh-asset-xyzzzy-927ab');
 assert.equal(response.status,404);
});
record('security headers on static response',async()=>{
 const {response}=await get('/');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('x-frame-options'),'DENY');
});
const outcomes=await Promise.allSettled(checks);
const errors=outcomes.filter(x=>x.status==='rejected');
for(const x of errors)console.error(x.reason);
console.log('PILOT HTTP CHECKS',checks.length-errors.length,'/',checks.length,'passed');
if(errors.length)process.exitCode=1;
