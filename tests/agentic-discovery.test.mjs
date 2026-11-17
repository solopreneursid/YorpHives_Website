import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilities,openapi,publishedAgentItems,agentGet} from '../agentic/discovery.mjs';
import edge from '../edge/worker.mjs';
test('agent discovery never publishes unapproved ventures, private tools or remote execution claims',()=>{
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
 assert.equal(published[0].interaction.remoteExecutionAvailable,false);
});
test('OpenAPI declares only read-only operations on official origin',()=>{
 const spec=openapi();
 assert.equal(spec.openapi,'3.1.0');
 assert.deepEqual(spec.servers,[{url:'https://yorphives.com'}]);
 assert.ok(Object.values(spec.paths).every(x=>x.get && Object.keys(x).length===1));
});
test('edge and Pages compatible API is no-credential GET-only and fails closed',async()=>{
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
