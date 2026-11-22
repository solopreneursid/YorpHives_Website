import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import edge from '../edge/worker.mjs';
const origin='https://yorphives.com';
const req=(data={},method='POST',headers={})=>new Request(origin+'/api/hqconnect',{
 method,headers:{origin,'content-type':'application/json','cf-connecting-ip':'203.0.113.34',...headers},
 ...(['GET','HEAD'].includes(method)?{}:{body:JSON.stringify({
  name:'Test Founder',email:'test@example.org',requestType:'Other',project:'Test application',
  message:'This is a detailed non-sensitive enquiry for our new application.',
  consent:true,startedAt:Date.now()-5000,...data
 })})
});
const allow={limit:async()=>({success:true})};
const DB={prepare(sql){
 assert.match(sql,/INSERT INTO hqconnect_requests/);
 return {bind(...values){assert.equal(values[2],'Other');return {run:async()=>({success:true})}}}
}};
const env={HQCONNECT_DB:DB,CONTACT_GLOBAL_LIMIT:allow,CONTACT_CLIENT_LIMIT:allow};
test('edge accepts validated human intake into its own D1 binding',async()=>{
 const response=await edge.fetch(req(),env,{});
 assert.equal(response.status,201);
 assert.equal(response.headers.get('x-yorphives-edge-runtime'),'workers-static');
 const body=await response.json();
 assert.equal(body.ok,true);
 assert.match(body.reference,/^[a-f0-9]{8}$/);
});
test('single-character names are accepted, blank names and descriptions are rejected',async()=>{
 assert.equal((await edge.fetch(req({name:'J'}),env,{})).status,201);
 assert.equal((await edge.fetch(req({name:'   '}),env,{})).status,400);
 assert.equal((await edge.fetch(req({message:'                   '}),env,{})).status,400);
});
test('edge intake fails closed without database and admission controls',async()=>{
 for(const bindings of [{},{HQCONNECT_DB:DB},{...env,CONTACT_CLIENT_LIMIT:{limit:async()=>{throw Error('unavailable')}}}]){
  const result=await edge.fetch(req(),bindings,{});
  assert.equal(result.status,503);
 }
 const blocked=await edge.fetch(req(),{...env,CONTACT_GLOBAL_LIMIT:{limit:async()=>({success:false})}},{});
 assert.equal(blocked.status,429);
 assert.equal(blocked.headers.get('retry-after'),'60');
});
test('edge rejects cross origin, malformed and unsupported contact actions',async()=>{
 const cross=await edge.fetch(req({},'POST',{origin:'https://not-yorphives.example'}),env,{});
 assert.equal(cross.status,403);
 const bad=await edge.fetch(req({requestType:'Unsupported'}),env,{});
 assert.equal(bad.status,400);
 const read=await edge.fetch(req({},'GET'),env,{});
 assert.equal(read.status,405);
 assert.equal(read.headers.get('allow'),'POST');
 const unknown=await edge.fetch(new Request(origin+'/api/hqconnect/list'),env,{});
 assert.equal(unknown.status,404);
});
test('live and preview intake bindings stay separated from agent execution',async()=>{
 const {readFileSync}=await import('node:fs');
 const live=JSON.parse(readFileSync('edge/live/wrangler.jsonc','utf8'));
 const pilot=JSON.parse(readFileSync('edge/pilot/wrangler.jsonc','utf8'));
 assert.notEqual(live.d1_databases[1].database_id,pilot.d1_databases[1].database_id);
 assert.equal(live.d1_databases[1].binding,'HQCONNECT_DB');
 assert.equal(pilot.d1_databases[1].binding,'HQCONNECT_DB');
 assert.ok(live.ratelimits.some(x=>x.name==='CONTACT_CLIENT_LIMIT'));
 const w=readFileSync('edge/worker.mjs','utf8');
 assert.doesNotMatch(w,/\/api\/admin\/deploy|runShell|githubToken/i);
});
