// Public, read-only verification for the Pages -> Workers Static Assets cutover.
// Never posts analytics events, changes DNS/Workers routing, or touches HQ.
import assert from 'node:assert/strict';
const host=process.env.YH_HOST||'yorphives.com';
const expectRuntime=process.env.EXPECT_RUNTIME||'either'; // pages, workers, either
if(!['yorphives.com','www.yorphives.com'].includes(host))throw Error('Host is not allowlisted');
if(!['pages','workers','either'].includes(expectRuntime))throw Error('Invalid expectation');
const origin='https://'+host;
const fetchBound=async(path,{method='GET',redirect=host==='www.yorphives.com'?'follow':'manual'}={})=>{
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
 try{return await fetch(origin+path,{method,redirect,signal:ctl.signal,
  headers:{'user-agent':'YorpHives-Nonmutating-Release-Check/1.0'}});}
 finally{clearTimeout(timer);}
};
if(host==='www.yorphives.com'){
 const canonical=await fetchBound('/api/agent/v1/openapi.json',{redirect:'manual'});
 assert.equal(canonical.status,301,'www must redirect to canonical apex');
 assert.match(canonical.headers.get('location')||'',/^https:\/\/yorphives\.com\//i);
}
const open=await fetchBound('/api/agent/v1/openapi.json');
assert.equal(open.status,200,'Agent API unavailable');
const marked=open.headers.get('x-yorphives-edge-runtime')==='workers-static';
if(expectRuntime==='workers')assert.equal(marked,true,'Worker API marker missing: route did not cut over');
if(expectRuntime==='pages')assert.equal(marked,false,'Unexpected Worker route is still active');
assert.equal((await open.json()).openapi,'3.1.0');
const home=await fetchBound('/');
assert.equal(home.status,200);
assert.equal(/noindex/i.test(home.headers.get('x-robots-tag')||''),false,'Preview noindex leaked onto live');
const content=await home.text();
assert.match(content,/id="yh-pulse"/);
assert.ok(!content.includes('/browser-smoke.mjs'),'QA script published on live');
const items=await fetchBound('/catalog.json');assert.equal(items.status,200);
const list=(await items.json()).items.filter(x=>x?.published!==false&&x?.visibility!=='private');
assert.equal(list.length,144);
const errors=[];
let count=0;
for(let i=0;i<list.length;i+=9){
 await Promise.all(list.slice(i,i+9).map(async x=>{
  const url='/'+x.url;
  const r=await fetchBound(url);
  if(r.status!==200){errors.push(url+': HTTP '+r.status);return;}
  if(/noindex/i.test(r.headers.get('x-robots-tag')||'')){errors.push(url+': noindex');return;}
  const body=await r.text();
  if(!body.includes('<title>')||!/rel="canonical"/i.test(body)){errors.push(url+': missing SEO metadata');return;}
  count++;
 }));
}
assert.deepEqual(errors,[],'Live route regressions: '+errors.slice(0,10).join('; '));
for(const path of ['/tools/models/u2netp-309c8469.onnx','/tools/models/modnet-int8-92e49898.onnx']){
 assert.equal((await fetchBound(path,{method:'HEAD'})).status,200,path);
}
for(const path of ['/api/insights/public','/api/insights/growth','/api/agent/v1/capabilities']){
 const r=await fetchBound(path);assert.equal(r.status,200,path);
 const data=await r.json();
 if(path.includes('/insights/'))assert.equal(data.available,true,'Analytics unavailable at '+path);
 if(path.includes('/capabilities'))assert.equal(data.actions?.executeRemote,false,'Agent execution must remain disabled');
}
const gone=await fetchBound('/not-a-real-yh-asset-xyzzzy-927ab');
if(marked)assert.equal(gone.status,404,'Worker must not serve an SPA fallback for missing files');
else assert.ok([200,404].includes(gone.status),'Existing Pages fallback changed unexpectedly');
const legacy=await fetchBound('/free-tools/',{redirect:'manual'});
if(host==='www.yorphives.com'){
 assert.equal(legacy.status,301,'www canonical redirect must remain first');
 assert.match(legacy.headers.get('location')||'',/^https:\/\/yorphives\.com\//i);
 const apexLegacy=await fetch('https://yorphives.com/free-tools/',{redirect:'manual'});
 assert.equal(apexLegacy.status,302,'Apex legacy redirect must remain intact');
 assert.match(apexLegacy.headers.get('location')||'',/\/tools\/?$/);
}else{
 assert.equal(legacy.status,302);
 assert.match(legacy.headers.get('location')||'',/\/tools\/?$/);
}
assert.ok(content.includes('agentic-browser.mjs'));
console.log('LIVE CUTOVER CHECK PASSED: host='+host+' runtime='+(marked?'workers-static':'pages')+' routes='+count+' validated; noindex absent; agent and analytics routes available.');
