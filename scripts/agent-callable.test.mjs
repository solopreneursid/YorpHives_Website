import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {PUBLIC_TOOLS,invokePublicTool,ToolInputError} from '../agentic/tools-core.mjs';
import {callableRegistry,openapi} from '../agentic/discovery.mjs';
import {invokeAgentTool} from '../agentic/invoke.mjs';
import worker from '../edge/worker.mjs';

const base='https://yorphives.com';
const limiter={limit:async()=>({success:true})};
const env={AGENT_GLOBAL_LIMIT:limiter,AGENT_CLIENT_LIMIT:limiter};
const request=(id,args={},method='POST',hdr={},body)=>new Request(base+'/api/agent/v1/tools/'+id+'/invoke',{
 method,headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.25',...hdr},
 ...(['GET','HEAD'].includes(method)?{}:{body:body??JSON.stringify(args)})});
const invoke=async(id,args={},overrideEnv=env,headers={},body)=>invokeAgentTool(request(id,args,'POST',headers,body),overrideEnv,
 '/api/agent/v1/tools/'+id+'/invoke');

test('portable operations have documented schemas and bounded outputs',()=>{
 assert.deepEqual(PUBLIC_TOOLS.map(x=>x.id),
 ['word_count','slugify','case_convert','percentage','discount']);
 assert.deepEqual(invokePublicTool('word_count',{text:'Hello, 世界!\nTwo words.'}),
  {words:4,characters:21,lines:2});
 assert.deepEqual(invokePublicTool('slugify',{text:'Café au lait / 2026'}),{slug:'cafe-au-lait-2026'});
 assert.deepEqual(invokePublicTool('case_convert',{text:'HeLLo WorLD',mode:'lower'}),{text:'hello world'});
 assert.deepEqual(invokePublicTool('percentage',{value:1000,percent:17.5}),{result:175});
 assert.deepEqual(invokePublicTool('discount',{price:100,percent:15}),{savings:15,finalPrice:85});
 assert.throws(()=>invokePublicTool('discount',{price:100,percent:101}),ToolInputError);
 assert.throws(()=>invokePublicTool('word_count',{text:'a',toString:'x'}),ToolInputError);
 assert.throws(()=>invokePublicTool('word_count',{text:'x'.repeat(2001)}),ToolInputError);
 assert.throws(()=>invokePublicTool('percentage',{value:Infinity,percent:50}),ToolInputError);
 assert.throws(()=>invokePublicTool('no_such_tool',{text:'a'}),ToolInputError);
});

test('read-only discovery points to exact allowed stateless tools',()=>{
 const d=callableRegistry();
 assert.equal(d.tools.length,5);assert.equal(d.usage.includes('Do not send confidential'),true);
 const spec=openapi();assert.equal(spec.openapi,'3.1.0');assert.equal(spec.info.version,'1.1.0');
 assert.equal(spec.paths['/api/agent/v1/tools'].get.operationId,'listCallableTools');
 for(const tool of PUBLIC_TOOLS){
  const path='/api/agent/v1/tools/'+tool.id+'/invoke';
  const op=spec.paths[path];
  assert.deepEqual(Object.keys(op),['post']);
  assert.equal(op.post['x-yorphives-stateless'],true);
  assert.deepEqual(op.post.requestBody.content['application/json'].schema,tool.inputSchema);
  assert.equal(op.post.requestBody.content['application/json'].schema.additionalProperties,false);
  assert.equal(op.post.responses[429].description.includes('Retry-After'),true);
 }
});

test('HTTP gateway allows only approved stateless POST with accurate metadata',async()=>{
 const r=await invoke('discount',{price:249,percent:20});
 assert.equal(r.status,200);
 assert.equal(r.headers.get('access-control-allow-origin'),null,'No browser-cross-origin calling');
 assert.equal(r.headers.get('cache-control'),'no-store');
 const body=await r.json();
 assert.deepEqual(body,{schemaVersion:1,tool:'discount',
  result:{savings:49.8,finalPrice:199.2},stateless:true,stored:false,charged:false});
 const get=await invokeAgentTool(request('discount',{},'GET'),env,
  '/api/agent/v1/tools/discount/invoke');
 assert.equal(get.status,405);assert.equal(get.headers.get('allow'),'POST');
 assert.equal((await invoke('not_enabled',{})).status,404);
});

test('gateway fails closed when rate limiting is absent, down, or exhausted',async()=>{
 let called=0;
 const no=await invoke('percentage',{value:5,percent:10},{});
 assert.equal(no.status,503);
 const offline={AGENT_GLOBAL_LIMIT:{limit:async()=>{throw Error('offline')}},
  AGENT_CLIENT_LIMIT:{limit:async()=>({success:true})}};
 assert.equal((await invoke('percentage',{value:5,percent:10},offline)).status,503);
 const blocked={AGENT_GLOBAL_LIMIT:{limit:async()=>{called++;return {success:false}}},
  AGENT_CLIENT_LIMIT:limiter};
 const restricted=await invoke('percentage',{value:5,percent:10},blocked);
 assert.equal(restricted.status,429);
 assert.equal(restricted.headers.get('retry-after'),'60');
 assert.equal(called,1);
});

test('gateway rejects oversized, malformed and unknown-field inputs',async()=>{
 const t={value:5,percent:10};
 assert.equal((await invoke('percentage',t,env,{'content-type':'text/plain'})).status,415);
 assert.equal((await invoke('percentage',t,env,{'content-length':'6000'})).status,413);
 assert.equal((await invoke('percentage',t,env,{},'x'.repeat(5000))).status,413);
 assert.equal((await invoke('percentage',t,env,{},'{invalid-json')).status,400);
 assert.equal((await invoke('percentage',{value:5,percent:10,token:'secret'})).status,422);
 assert.equal((await invoke('percentage',{value:5,percent:'10'})).status,422);
 assert.equal((await invoke('percentage',[])).status,422);
});

test('production worker dispatch never needs HQ, DB, AI or credentials for callable tools',async()=>{
 const yes=await worker.fetch(request('word_count',{text:'Open AI agents'}),env,{});
 assert.equal(yes.status,200);
 assert.equal(yes.headers.get('x-yorphives-edge-runtime'),'workers-static');
 assert.equal((await yes.json()).result.words,3);
 const list=await worker.fetch(new Request(base+'/api/agent/v1/tools'),env,{});
 assert.equal(list.status,200);assert.equal((await list.json()).tools.length,5);
 const spec=await worker.fetch(new Request(base+'/api/agent/v1/openapi.json'),env,{});
 assert.equal(spec.status,200);assert.equal((await spec.json()).info.version,'1.1.0');
 const missing=await worker.fetch(new Request(base+'/api/agent/v1/tools/secret/invoke',{
 method:'POST',headers:{'content-type':'application/json'},body:'{}'}),env,{});
 assert.equal(missing.status,404);
});

test('browser execution imports same pure core with no network invocation',()=>{
 const browser=readFileSync('agentic/browser-webmcp.mjs','utf8');
 const build=readFileSync('scripts/build-site.mjs','utf8');
 const live=readFileSync('edge/live/wrangler.jsonc','utf8');
 const pilot=readFileSync('edge/pilot/wrangler.jsonc','utf8');
 assert.match(browser,/import \{PUBLIC_TOOLS,invokePublicTool,ToolInputError\} from '\.\/agentic-tools\.mjs'/);
 assert.match(browser,/document\?\.modelContext/);
 assert.match(browser,/annotations:\{readOnlyHint:true\}/);
 assert.match(browser,/pagehide.*abort/);
 assert.ok(!browser.includes("fetch('/api/agent/v1/tools/"));
 assert.ok(build.includes("await cp(resolve(root,'agentic/tools-core.mjs'),resolve(dest,'agentic-tools.mjs'))"));
 assert.ok(build.includes('callableTools:'));
 for(const config of [live,pilot]){
  const x=JSON.parse(config);
  assert.ok(x.ratelimits.some(x=>x.name==='AGENT_GLOBAL_LIMIT'&&x.simple.limit===160));
  assert.ok(x.ratelimits.some(x=>x.name==='AGENT_CLIENT_LIMIT'&&x.simple.limit===30));
  assert.equal(x.assets.run_worker_first[0],'/api/*');
 }
 assert.equal(/\b(?:INSERT|DELETE FROM|UPDATE SET|fetch\(.+hq|payment)\b/i.test(readFileSync('agentic/invoke.mjs','utf8')),false);
});
