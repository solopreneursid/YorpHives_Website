// Full read-only route sweep of the isolated Workers Static Assets pilot.
// No headless browser, analytics POST, user files, credentials, or production DB use.
import assert from 'node:assert/strict';
const root='https://yorphives-edge-static-pilot.solopreneursid-proy.workers.dev';
const fetchBound=async(path,method='GET')=>{
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{return await fetch(root+path,{method,redirect:'manual',signal:ctrl.signal,headers:{'user-agent':'YorpHives-Route-Integrity-Check/1.0'}})}
 finally{clearTimeout(timer)}
};
const cat=await fetchBound('/catalog.json');
assert.equal(cat.status,200,'Catalog must be a static asset');
const data=await cat.json();assert.ok(Array.isArray(data.items));
const pages=data.items.filter(x=>x?.published!==false&&x?.visibility!=='private'&&typeof x.url==='string');
assert.equal(pages.length,143,'Published route count changed; review release gates');
const routes=[...new Set(pages.map(x=>'/'+x.url))];assert.equal(routes.length,143);
let checked=0;
for(let start=0;start<routes.length;start+=8){
 const batch=routes.slice(start,start+8);
 await Promise.all(batch.map(async path=>{
  const r=await fetchBound(path);
  assert.equal(r.status,200,path+' served wrong status');
  assert.match(r.headers.get('content-type')||'',/text\/html/i,path+' not HTML');
  assert.match(r.headers.get('x-robots-tag')||'',/noindex/i,path+' lost staging noindex');
  const html=await r.text();
  assert.match(html,/<html/i,path+' missing document');
  assert.ok(html.length>600,path+' suspiciously small HTML');
  checked++;
 }));
}
for(const path of ['/tools/models/u2netp-309c8469.onnx','/tools/models/modnet-int8-92e49898.onnx']){
 const response=await fetchBound(path,'HEAD');
 assert.equal(response.status,200,path+' model asset absent');
}
const growth=await fetchBound('/api/insights/growth');
assert.equal(growth.status,200,'Growth API unavailable on pilot');
const gr=await growth.json();
assert.equal(gr.available,true,'Pilot growth contract not available');
assert.equal(gr.periodDays,30,'Wrong growth window');
for(const path of ['/api/agent/v1/capabilities','/api/agent/v1/openapi.json','/api/insights/public','/api/insights/growth']){
 const response=await fetchBound(path,'POST');
 assert.equal(response.status,405,path+' must not permit a write');
}
assert.equal((await fetchBound('/api/admin/deploy')).status,404);
console.log('PILOT ROUTE SWEEP PASS: '+checked+' published pages, pinned models, read-only APIs, staging robots headers.');
