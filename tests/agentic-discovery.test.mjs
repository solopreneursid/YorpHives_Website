import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilities,openapi,publishedAgentItems,agentGet} from '../agentic/discovery.mjs';
import edge from '../edge/worker.mjs';
import {PUBLIC_TOOLS,PUBLIC_TOOL_PAGES} from '../agentic/tools-core.mjs';
test('agent discovery never publishes unapproved ventures or private tools',()=>{
 const items=[
  {type:'tool',name:'Word Counter',description:'Counts words',url:'tools/word-counter/',published:true},
  {type:'tool',name:'Secret',description:'Private internal',url:'tools/private/',visibility:'private'},
  {type:'app',name:'Pending App',description:'Not approved for launch',url:'apps/pending/',published:true},
  {type:'tool',name:'Bad URL',description:'Untrusted URL',url:'https://evil.example/',published:true}
 ];
 const published=publishedAgentItems(items);
 assert.deepEqual(published.map(x=>x.id),['tools/word-counter/']);
 const data=capabilities(published);
 assert.equal(data.itemsCount,1);
 assert.equal(data.actions.executeRemote,false);
 assert.equal(data.actions.purchase,false);
 assert.equal(data.governance.headquartersReadOnly,true);
 assert.equal(published[0].interaction.remoteExecutionAvailable,true);
 assert.equal(published[0].interaction.remoteToolId,'word_count');
 assert.equal(published[0].interaction.remoteEndpoint,
  'https://yorphives.com/api/agent/v1/tools/word_count/invoke');
 assert.equal(published[0].interaction.charged,false);
});
test('only five exact public pages expose matching bounded stateless HTTP metadata',()=>{
 const candidates=Object.entries(PUBLIC_TOOL_PAGES).map(([url,id])=>({
  type:'tool',name:id,description:'Validated free utility',url,published:true
 })).concat([{type:'tool',name:'Text diff',description:'Local only',
  url:'tools/text-diff/',published:true}]);
 const listed=publishedAgentItems(candidates);
 assert.equal(listed.length,6);
 for(const [url,id] of Object.entries(PUBLIC_TOOL_PAGES)){
  const item=listed.find(x=>x.id===url);
  assert.ok(item);
  assert.equal(item.interaction.remoteExecutionAvailable,true);
  assert.equal(item.interaction.method,'POST');
  assert.equal(item.interaction.remoteToolId,id);
  assert.equal(item.interaction.storesInput,false);
  assert.deepEqual(item.interaction.inputSchema,
   PUBLIC_TOOLS.find(x=>x.id===id).inputSchema);
 }
 const local=listed.find(x=>x.id==='tools/text-diff/');
 assert.equal(local.interaction.remoteExecutionAvailable,false);
 assert.equal(local.interaction.requiresUserInteraction,true);
 assert.equal(local.interaction.remoteEndpoint,undefined);
});
test('OpenAPI lists only read-only discovery and tightly bounded stateless utility POSTs',()=>{
 const spec=openapi();
 assert.equal(spec.openapi,'3.1.0');
 assert.deepEqual(spec.servers,[{url:'https://yorphives.com'}]);
 const callable=new Set(['word_count','slugify','case_convert','percentage','discount']);
 const executed=new Set();
 for(const [path,methods] of Object.entries(spec.paths)){
  if(methods.get&&Object.keys(methods).length===1)continue;
  const match=/^\/api\/agent\/v1\/tools\/([a-z_]+)\/invoke$/.exec(path);
  assert.ok(match&&callable.has(match[1]),'Unexpected agent mutation operation: '+path);
  assert.deepEqual(Object.keys(methods),['post']);
  const operation=methods.post;
  assert.equal(operation['x-yorphives-stateless'],true);
  assert.equal(operation.requestBody?.content?.['application/json']?.schema?.additionalProperties,false);
  assert.ok(operation.responses[429], 'No rate-limit response documented');
  executed.add(match[1]);
 }
 assert.deepEqual([...executed].sort(),[...callable].sort());
});
test('Pages review exposes callable utility registry as JSON rather than SPA HTML',async()=>{
 const {onRequestGet,onRequestHead}=await import('../functions/api/agent/v1/tools.js');
 const request=new Request('https://preview.example/api/agent/v1/tools');
 const response=await onRequestGet({request,env:{}});
 assert.equal(response.status,200);
 assert.ok((response.headers.get('content-type')||'').includes('application/json'));
 const registry=await response.json();
 assert.equal(registry.schemaVersion,1);
 assert.equal(registry.tools.length,5);
 const headResponse=await onRequestHead({request:new Request(request.url,{method:'HEAD'}),env:{}});
 assert.equal(headResponse.status,200);
});
test('read-only discovery remains GET-only and fails closed',async()=>{
 const req=(path,method='GET')=>new Request('https://yorphives.com'+path,{method});
 const missing=await agentGet(req('/api/agent/v1/capabilities'),{ASSETS:{fetch:async()=>new Response('Unavailable',{status:503})}},'/api/agent/v1/capabilities');
 assert.equal(missing.status,503);
 const blocked=await agentGet(req('/api/agent/v1/capabilities','POST'),{},'/api/agent/v1/capabilities');
 assert.equal(blocked.status,405);
 const doc=await agentGet(req('/api/agent/v1/openapi.json'),{},'/api/agent/v1/openapi.json');
 assert.equal(doc.status,200);
 assert.equal((await doc.json()).openapi,'3.1.0');
 const edgeBlocked=await edge.fetch(req('/api/agent/v1/capabilities','POST'),{},{});
 assert.equal(edgeBlocked.status,405);
 const unknown=await edge.fetch(req('/api/admin/deploy'),{},{});
 assert.equal(unknown.status,404);
 assert.equal(unknown.headers.get('X-YorpHives-Edge-Runtime'),'workers-static');
 const noAssets=await edge.fetch(req('/'),{},{});
 assert.equal(noAssets.status,503);
});
test('edge static and agent discovery work with ASSETS adapter',async()=>{
 const catalog={items:[{type:'tool',name:'Word Counter',description:'Counts words',url:'tools/word-counter/',published:true}]};
 let seen='';
 const env={ASSETS:{fetch:async req=>{seen=String(req);return Response.json(catalog);}}};
 const response=await edge.fetch(new Request('https://preview.example/api/agent/v1/capabilities'),env,{});
 const data=await response.json();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('X-YorpHives-Edge-Runtime'),'workers-static');
 assert.equal(data.itemsCount,1);
 assert.ok(seen.endsWith('/catalog.json'));
});
