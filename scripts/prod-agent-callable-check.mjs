/**
 * Non-destructive real-edge acceptance: one synthetic deterministic calculation.
 * Never posts analytics, accesses HQ, submits personal data, or writes D1.
 */
import assert from 'node:assert/strict';
const origin='https://yorphives.com';
const get=async(path,options={})=>{
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),16000);
 try{return await fetch(origin+path,{...options,signal:abort.signal,redirect:'manual',
  headers:{'user-agent':'YorpHives-Stateless-Agent-Release-Gate/1.0',...(options.headers||{})}})}
 finally{clearTimeout(timer)}
};
let ok=false,version;
for(let retry=0;retry<9;retry++){
 try{
  const r=await get('/api/agent/v1/openapi.json');
  if(r.status===200){
   const spec=await r.json();
   version=spec.info?.version;
   if(version==='1.1.0'&&spec.paths?.['/api/agent/v1/tools/discount/invoke']?.post) {ok=true;break;}
  }
 }catch{}
 if(retry<8)await new Promise(resolve=>setTimeout(resolve,20000));
}
assert.equal(ok,true,'Live agent-callable OpenAPI v1.1 has not deployed yet; observed version '+version);
const listing=await get('/api/agent/v1/tools');
assert.equal(listing.status,200);
assert.equal(listing.headers.get('x-yorphives-edge-runtime'),'workers-static');
const reg=await listing.json();
assert.equal(reg.tools.length,5);
assert.equal(reg.limits.perClientPerMinute,30);
const md=await get('/tools/word-counter/index.md');
assert.equal(md.status,200);
assert.match(await md.text(),/Canonical page: https:\/\/yorphives.com\/tools\/word-counter\//);
const script=await get('/agentic-browser.mjs');
assert.equal(script.status,200);
const src=await script.text();
assert.match(src,/document\?\.modelContext/);
assert.match(src,/invokePublicTool/);
const caller=await get('/api/agent/v1/tools/discount/invoke',{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({price:100,percent:15})});
assert.equal(caller.status,200,'Native rate limiter missing or live invocation failed');
assert.equal(caller.headers.get('access-control-allow-origin'),null);
assert.equal(caller.headers.get('x-yorphives-edge-runtime'),'workers-static');
const result=await caller.json();
assert.deepEqual(result.result,{savings:15,finalPrice:85});
assert.equal(result.stored,false);assert.equal(result.charged,false);
const wrong=await get('/api/agent/v1/tools/discount/invoke');
assert.equal(wrong.status,405);
const unknown=await get('/api/agent/v1/tools/admin_deploy/invoke',{
 method:'POST',headers:{'content-type':'application/json'},body:'{}'});
assert.equal(unknown.status,404);
const denied=await get('/api/admin/deploy');
assert.equal(denied.status,404);
console.log('PASS: live OpenAPI 1.1, 5 callable tools, Markdown, WebMCP, metered synthetic POST, no unauthorized actions.');
