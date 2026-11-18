import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {acceptsRequest,validRoute,validTarget,digest,collect,publicReport} from '../functions/_lib/insights.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
test('first-party endpoints accept only public event targets',()=>{
 for(const v of ['home','ventures','builders','impact','tools','partners','contact','tool'])assert.ok(validRoute(v),v);
 for(const v of ['/admin','https://bad.example/','tools/../../secret/','tools/?q=x',''])assert.equal(validTarget(v),false,v);
 assert.ok(validTarget('tools/word-counter/'));
});
test('cross-site analytics, bots, Do Not Track, and Global Privacy Control are rejected',()=>{
 const req=(origin,extra={})=>new Request('https://yorphives.com/api/insights/collect',{method:'POST',
 headers:{origin,'user-agent':'Mozilla/5.0 Firefox/158.0','content-type':'application/json',...extra},body:'{}'});
 assert.equal(acceptsRequest(req('https://yorphives.com')),true);
 assert.equal(acceptsRequest(req('https://hostile.example')),false);
 assert.equal(acceptsRequest(req('https://yorphives.com',{'user-agent':'Googlebot'})),false);
 assert.equal(acceptsRequest(req('https://yorphives.com',{'DNT':'1'})),false);
 assert.equal(acceptsRequest(req('https://yorphives.com',{'Sec-GPC':'1'})),false);
});
test('no database means fail closed, never fabricate metrics',async()=>{
 const request=new Request('https://yorphives.com/api/insights/collect',{method:'POST',headers:{origin:'https://yorphives.com','content-type':'application/json'},body:'{}'});
 assert.equal((await collect({request,env:{}})).status,503);
 const r=await publicReport({request,env:{}});assert.equal(r.status,503);
 assert.equal((await r.json()).available,false);
});
test('browser session digests are not raw UUIDs',async()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const hash=await digest('session|'+id);
 assert.equal(hash.length,64);assert.ok(!hash.includes(id));
});
test('analytics schema never stores sensitive content or identifiers',async()=>{
 const sql=await read('analytics/schema.sql');
 for(const table of ['visitor_sessions','daily_pageviews','daily_completions','event_dedupe','cleanup_log'])
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS '+table),table);
 for(const forbidden of ['ip_address','user_agent','email','filename','user_input','fingerprint'])
  assert.ok(!sql.includes(forbidden),forbidden);
});
test('Cloudflare Functions stay confined to analytics and read-only agent discovery routes',async()=>{
 const s=await read('scripts/build-site.mjs');
 assert.ok(s.includes("'_routes.json'"));
 assert.ok(s.includes("include:['/api/insights/*','/api/agent/v1/*']"));
 assert.ok(s.includes("insights-client.mjs"));
});
test('Homepage progress uses measured first-party signals without a duplicate ticker',async()=>{
 const [html,studio,rotators,client]=await Promise.all(['reimagined/index.html','reimagined/studio.js','reimagined/rotators.js','insights-client.mjs'].map(read));
 assert.ok(html.includes('RECORDED PAGE VIEWS · 30 DAYS'));
 assert.ok(html.includes('anonymous-analytics-toggle'));
 assert.ok(studio.includes("fetch('/api/insights/growth'"));
 assert.doesNotMatch(html,/id="yh-pulse"/);
 assert.ok(studio.includes("fetch('/api/insights/growth'"));
 assert.ok(client.includes('globalPrivacyControl'));
 assert.ok(client.includes('yorphives:tool-completed'));
 assert.ok(!client.includes('String(node.value).slice'));
});
test('shared tool processors mark real successful completion',async()=>{
 for(const file of ['utility-page.mjs','file-tool-page.mjs','wave1-page.mjs','wave2-page.mjs','wave3-page.mjs']){
  const s=await read('tools/'+file);
  assert.ok(s.includes("new Event('yorphives:tool-completed')"),file);
 }
});
