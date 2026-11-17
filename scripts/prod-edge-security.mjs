// Independent public, read-only security posture test.
// All calls use GET/HEAD; no authentication, API writes or synthetic analytics.
import assert from 'node:assert/strict';
const origin='https://yorphives.com';
async function get(path,method='GET'){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);
 try{return await fetch(origin+path,{method,redirect:'manual',signal:c.signal,headers:{
 'user-agent':'YorpHives-Edge-Security-Gate/1.0'
 }})}finally{clearTimeout(timer)}
}
const page=await get('/');
assert.equal(page.status,200);
const h=page.headers;
const has=(key,pattern)=>{
 const value=h.get(key)||'';
 assert.match(value,pattern,'Missing or weak '+key+': '+value);
};
has('content-security-policy',/default-src\s+'self'/);
has('content-security-policy',/object-src\s+'none'/);
has('content-security-policy',/frame-ancestors\s+'none'/);
has('content-security-policy',/base-uri\s+'self'/);
has('x-frame-options',/^DENY$/i);
has('x-content-type-options',/^nosniff$/i);
has('referrer-policy',/strict-origin-when-cross-origin/i);
has('permissions-policy',/camera=\(\)/);
has('permissions-policy',/microphone=\(\)/);
has('permissions-policy',/geolocation=\(\)/);
assert.equal(h.has('set-cookie'),false,'Static site must not set cookies');
assert.doesNotMatch(h.get('x-robots-tag')||'',/noindex/i,'Live site must remain indexable');
assert.match(await page.text(),/id="yh-pulse"/);
const api=await get('/api/agent/v1/capabilities');
assert.equal(api.status,200);
assert.equal(api.headers.get('x-yorphives-edge-runtime'),'workers-static');
assert.equal(api.headers.has('set-cookie'),false);
assert.equal(api.headers.get('x-content-type-options'),'nosniff');
const catalog=await api.json();
assert.equal(catalog.actions.executeRemote,false);
assert.equal(catalog.actions.purchase,false);
assert.equal(catalog.itemsCount,catalog.items.length);
const open=await get('/api/agent/v1/openapi.json');
assert.equal(open.status,200);const spec=await open.json();
assert.equal(spec.openapi,'3.1.0');
assert.ok(Object.values(spec.paths).every(x=>x.get&&Object.keys(x).length===1),
 'Agent API inadvertently added a mutation operation');
const growth=await get('/api/insights/growth');
assert.equal(growth.status,200);
const g=await growth.json();
assert.equal(g.available,true);
assert.equal(g.revenue?.available,false,'Unverified revenue claims are forbidden');
assert.equal(g.revenue?.amount,null);
const privateRoute=await get('/api/admin/deploy');
assert.equal(privateRoute.status,404,'Private execution route must not exist');
const pageNotFound=await get('/yh-impossible-a9e7c5185d');
assert.equal(pageNotFound.status,404);
const model=await get('/tools/models/u2netp-309c8469.onnx','HEAD');
assert.equal(model.status,200);assert.equal(model.headers.get('x-content-type-options'),'nosniff');
const www=await fetch('https://www.yorphives.com/',{redirect:'manual'});
assert.equal(www.status,301);
assert.match(www.headers.get('location')||'',/^https:\/\/yorphives\.com\//);
console.log('SECURITY RELEASE PASS: TLS origin, CSP, frame blocking, permissions, privacy, agent read-only, guarded APIs, 404 and canonical routing');
