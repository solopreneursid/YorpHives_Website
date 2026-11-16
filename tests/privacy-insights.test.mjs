import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validRoute,validTarget,acceptsRequest,digest,collect,publicReport} from '../functions/_lib/insights.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=x=>readFile(resolve(root,x),'utf8');

test('analytics accepts only publicly valid route and tool slugs',()=>{
 for(const route of ['home','ventures','builders','impact','tools','partners','contact','tool'])
  assert.equal(validRoute(route),true);
 for(const bad of ['../../private','/tools/foo/','https://x.com','to;ols','contact?email=x'])
  assert.equal(validTarget(bad),false);
 assert.equal(validTarget('tools/word-counter/'),true);
 assert.equal(validTarget('apps/verified-app/'),true);
});

test('analytics rejects cross-origin, Do Not Track, GPC, and known bots',()=>{
 const make=headers=>new Request('https://yorphives.com/api/insights/collect',{method:'POST',
  headers:{'Origin':'https://yorphives.com',...headers},body:'{}'});
 assert.equal(acceptsRequest(make({'User-Agent':'Mozilla/5.0'})),true);
 assert.equal(acceptsRequest(make({'Origin':'https://attacker.example'})),false);
 assert.equal(acceptsRequest(make({'DNT':'1'})),false);
 assert.equal(acceptsRequest(make({'Sec-GPC':'1'})),false);
 assert.equal(acceptsRequest(make({'User-Agent':'Googlebot'})),false);
});

test('session hashes are stable and not the raw browser token',async()=>{
 const h=await digest('session|test-random-identifier');
 assert.match(h,/^[0-9a-f]{64}$/);
 assert.equal(h,await digest('session|test-random-identifier'));
 assert.notEqual(h,await digest('session|another-identifier'));
 assert.equal(h.includes('test-random-identifier'),false);
});

test('analytics is non-blocking, no raw tracker identifiers exposed',async()=>{
 const request=new Request('https://yorphives.com/api/insights/collect',{method:'POST',
  headers:{'Origin':'https://yorphives.com','DNT':'1','Content-Type':'application/json'},
  body:JSON.stringify({event:'view',route:'home',sessionId:'00000000-0000-4000-8000-000000000001'})});
 const response=await collect({request,env:{INSIGHTS_DB:{}},waitUntil:()=>{}});
 assert.equal(response.status,204);
 const unavailable=await publicReport({request,env:{},waitUntil:()=>{}});
 assert.equal(unavailable.status,503);
});

test('first-party client cannot send content or upload files',async()=>{
 const client=await read('insights-client.mjs');
 const backend=await read('functions/_lib/insights.mjs');
 const html=await read('reimagined/index.html');
 for(const id of ['anonymous-analytics-toggle','impact-privacy-note','impact-visitors'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(client,/navigator\.globalPrivacyControl/);
 assert.match(client,/navigator\.doNotTrack/);
 assert.match(client,/sessionStorage/);
 assert.match(client,/crypto\.randomUUID/);
 assert.match(client,/event\('complete',\{url\}\)/);
 assert.doesNotMatch(client,/FormData|FileReader|\\.files\\b|ipAddress|localStorage\.setItem\([^,]+,\s*sessionId/i);
 assert.match(backend,/SHA-256/);
 assert.match(backend,/session_hash/);
 assert.doesNotMatch(backend,/CF-Connecting-IP|req\.ip|ip_address|user_agent|toolContent|fileName|rawContent/);
 assert.match(backend,/SELECT url,SUM\(completions\)/);
 assert.match(backend,/qualifiedProducts/);
});

test('published builds include the same first-party script on marketing and direct tools',async()=>{
 const source=await read('scripts/build-site.mjs');
 assert.match(source,/resolve\(root,'insights-client\.mjs'\)/);
 assert.match(source,/src="\.\.\/\.\.\/insights-client\.mjs"/);
 const built=await read('dist/index.html');
 const word=await read('dist/tools/word-counter/index.html');
 assert.match(built,/insights-client\.mjs/);
 assert.match(word,/insights-client\.mjs/);
 const publicClient=await read('dist/insights-client.mjs');
 assert.match(publicClient,/anonymous-analytics-disabled/);
});
