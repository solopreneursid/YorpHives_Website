import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortableAgentServer} from '../agentic/portable-server.mjs';

async function locally(callback,{clock}={}){
 const server=createPortableAgentServer({clock});
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 const {port,address}=server.address();
 try{assert.equal(address,'127.0.0.1');return await callback('http://127.0.0.1:'+port)}
 finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))}
}
const call=(origin,id,body,headers={})=>fetch(origin+'/api/agent/v1/tools/'+id+'/invoke',{
 method:'POST',headers:{'content-type':'application/json',...headers},
 body:JSON.stringify(body)
});

test('Cloudflare-free Node adapter implements same OpenAPI and five utility outputs',async()=>{
 await locally(async origin=>{
  const api=await fetch(origin+'/api/agent/v1/openapi.json');
  assert.equal(api.status,200);
  assert.equal((await api.json()).info.version,'1.1.0');
  const list=await fetch(origin+'/api/agent/v1/tools');
  assert.equal(list.status,200);
  const registry=await list.json();
  assert.deepEqual(registry.tools.map(t=>t.id),
   ['word_count','slugify','case_convert','percentage','discount']);
  const cap=await fetch(origin+'/api/agent/v1/capabilities');
  assert.equal(cap.status,200);
  const data=await cap.json();
  assert.ok(data.itemsCount>=140);
  assert.equal(data.governance.headquartersReadOnly,true);
  const compute=await call(origin,'discount',{price:150,percent:20});
  assert.equal(compute.status,200);
  assert.deepEqual((await compute.json()).result,{savings:30,finalPrice:120});
  const word=await call(origin,'word_count',{text:'No remote AI'});
  assert.deepEqual((await word.json()).result,{words:3,characters:12,lines:1});
  const head=await fetch(origin+'/api/agent/v1/openapi.json',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
  assert.equal((await fetch(origin+'/api/admin/deploy')).status,404);
  assert.equal((await fetch(origin+'/api/insights/public')).status,404);
  assert.equal((await call(origin,'not_a_tool',{})).status,404);
  assert.equal((await call(origin,'discount',{price:20,percent:'not-numeric'})).status,422);
  assert.equal((await fetch(origin+'/api/agent/v1/tools/discount/invoke')).status,405);
 });
});

test('local adapter rejects input overflow without processing or logging content',async()=>{
 await locally(async origin=>{
  const oversized=await call(origin,'word_count',{text:'P'.repeat(5000)});
  assert.equal(oversized.status,413);
  assert.equal((await oversized.json()).error,'body-too-large');
  const extra=await call(origin,'discount',{price:100,percent:20,secret:'private'});
  assert.equal(extra.status,422);
  const broken=await fetch(origin+'/api/agent/v1/tools/discount/invoke',{
   method:'POST',headers:{'content-type':'application/json'},body:'{broken'});
  assert.equal(broken.status,400);
 });
});

test('local admission control applies a 30-per-minute IP limit with no Cloudflare rate-limit binding',async()=>{
 let now=1794920000000;
 await locally(async origin=>{
  let ok=0;
  for(let i=0;i<31;i++){
   const response=await call(origin,'percentage',{value:100,percent:5});
   if(i<30){assert.equal(response.status,200);ok++;}
   else{assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');}
  }
  assert.equal(ok,30);
  now+=61000;
  const reset=await call(origin,'percentage',{value:100,percent:5});
  assert.equal(reset.status,200);
 },{clock:()=>now});
});
