import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{TARGET,CHECKS,probeOne,runChecks,scheduledRun} from '../ops/monitor/worker.mjs';
const data={
 'home':{status:200,body:'<!doctype html><div id="yh-pulse"></div>'},
 'agent-api':{status:200,body:JSON.stringify({openapi:'3.1.0',paths:{'/api/agent/v1/capabilities':{get:{}}}})},
 'capabilities':{status:200,body:JSON.stringify({actions:{executeRemote:false},items:Array.from({length:143},()=>({}))})},
 'analytics':{status:200,body:JSON.stringify({available:true,schemaVersion:1,privacy:{rawIpStored:false}})},
 'growth':{status:200,body:JSON.stringify({available:true,schemaVersion:1,periodDays:30,revenue:{available:false}})},
 'model':{status:200,body:''},
 'missing':{status:404,body:''}
};
const fetcher=async(url,{method})=>{
 assert.ok(url.startsWith(TARGET+'/'),'No user-controlled external URL');
 assert.ok(method==='GET'||method==='HEAD');
 const check=CHECKS.find(c=>url.endsWith(c.path));
 const v=data[check?.id];
 return new Response(method==='HEAD'?null:v.body,{status:v.status,headers:{
  'content-type':check?.id==='home'?'text/html':check?.id==='model'?'application/octet-stream':'application/json',
  ...(check?.id==='home'?{
   'content-security-policy':"default-src 'self'; object-src 'none'; frame-ancestors 'none'",
   'x-frame-options':'DENY','x-content-type-options':'nosniff'
  }:{}),
  ...(check?.id!=='home'&&check?.id!=='missing'&&check?.id!=='model'?{'x-yorphives-edge-runtime':'workers-static'}:{})
 }});
};
test('all seven deterministic read-only checks pass on verified production contracts',async()=>{
 const r=await runChecks(fetcher,()=>new Date('2026-11-17T06:00:00Z'));
 assert.equal(r.checks.length,7);assert.equal(r.healthy,true);assert.deepEqual(r.failedChecks,[]);
});
test('failure of edge marker and noindex prevent false green',async()=>{
 const noMarker=async(url,opts)=>{
  const r=await fetcher(url,opts);
  if(url.endsWith('/api/insights/growth'))r.headers.delete('x-yorphives-edge-runtime');
  return r;
 };
 assert.equal((await probeOne(CHECKS.find(c=>c.id==='growth'),noMarker)).reason,'not-workers-runtime');
 const noindex=async(url,opts)=>{
  const r=await fetcher(url,opts);if(url.endsWith('/'))r.headers.set('x-robots-tag','noindex');
  return r;
 };
 assert.equal((await probeOne(CHECKS[0],noindex)).reason,'production-noindex');
});
test('continuous monitor flags weakened CSP and missing anti-framing defenses',async()=>{
 const weakened=async(url,opts)=>{
  const response=await fetcher(url,opts);
  if(url.endsWith('/'))response.headers.set('content-security-policy',"default-src 'self'");
  return response;
 };
 assert.equal((await probeOne(CHECKS[0],weakened)).reason,'csp-weakened');
 const framing=async(url,opts)=>{
  const response=await fetcher(url,opts);
  if(url.endsWith('/'))response.headers.delete('x-frame-options');
  return response;
 };
 assert.equal((await probeOne(CHECKS[0],framing)).reason,'framing-not-denied');
});
test('KV records minimal recent evidence, failure streak and daily expiry',async()=>{
 const m=new Map(),history=[];
 const kv={
  get:async key=>JSON.parse(m.get(key)||'null'),
  put:async(key,value,opts)=>{m.set(key,value);history.push({key,ttl:opts.expirationTtl})}
 };
 const env={STATUS_KV:kv};
 const first=await scheduledRun(env,fetcher,()=>new Date('2026-11-17T06:00:00Z'));
 assert.equal(first.healthy,true);assert.equal(first.failureStreak,0);
 assert.equal(history.length,2);assert.ok(history.some(x=>x.ttl===7*86400));
 const failed=async(url,opts)=>url.endsWith('/api/insights/growth')?new Response('{}',{status:503}):fetcher(url,opts);
 const second=await scheduledRun(env,failed,()=>new Date('2026-11-17T06:15:00Z'));
 assert.equal(second.healthy,false);assert.equal(second.failureStreak,1);
 const status=await worker.fetch(new Request('https://monitor.example/status'),env);
 assert.equal(status.status,503);
 assert.ok((await status.json()).failedChecks.includes('growth'));
});
test('pinned model HEAD with 200 but no content type is not a false outage',async()=>{
 const withoutType=async (url,opts)=>{
  const r=await fetcher(url,opts);
  if(url.includes('/tools/models/'))r.headers.delete('content-type');
  return r;
 };
 assert.equal((await probeOne(CHECKS.find(x=>x.id==='model'),withoutType)).ok,true);
 const spoofedHtml=async (url,opts)=>{
  const r=await fetcher(url,opts);
  if(url.includes('/tools/models/'))r.headers.set('content-type','text/html');
  return r;
 };
 assert.equal((await probeOne(CHECKS.find(x=>x.id==='model'),spoofedHtml)).reason,'model-replaced-by-html');
});
test('history is read-only bounded and sanitizes KV evidence',async()=>{
 const latest=Array.from({length:27},(_,i)=>({
  name:'history/2026-11-17/'+String(Math.floor(i/4)).padStart(2,'0')+String(i%4*15).padStart(2,'0')
 }));
 const stored=Object.fromEntries(latest.map((x,i)=>[x.name,{checkedAt:new Date(Date.UTC(2026,10,17,0,i*15)).toISOString(),
   healthy:i%3!==0,failedChecks:i%3===0?['model','danger']:[],
   checks:[{id:'model',ok:i%3!==0,privateMessage:'should not surface'}],
   extraSecret:'not-for-output',failureStreak:i%3===0?1:0}]));
 const env={STATUS_KV:{
  list:async()=>({keys:[...latest,{name:'../../secret'}]}),
  get:async key=>stored[key]??null
 }};
 const result=await worker.fetch(new Request('https://watchdog.example/history'),env);
 assert.equal(result.status,200);
 const x=await result.json();
 assert.equal(x.available,true);assert.equal(x.records.length,24);
 assert.equal(x.records.at(-1).checkedAt,stored[latest.at(-1).name].checkedAt);
 assert.ok(x.records.every(v=>!Object.hasOwn(v,'extraSecret')&&v.checks.every(c=>!Object.hasOwn(c,'privateMessage'))));
 assert.ok(x.records.every(v=>v.failedChecks.every(id=>CHECKS.some(c=>c.id===id))));
 assert.equal((await worker.fetch(new Request('https://watchdog.example/history',{method:'POST'}),env)).status,404);
});
test('monitor status is read-only and never exposes KV keys or external actions',async()=>{
 const env={STATUS_KV:{get:async()=>null}};
 assert.equal((await worker.fetch(new Request('https://monitor.example/api/admin'),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://monitor.example/status',{method:'POST'}),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://monitor.example/status'),env)).status,503);
});
