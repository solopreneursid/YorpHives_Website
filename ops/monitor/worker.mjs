/* Portable, deterministic and independent website monitor.
 * The monitor runs on a separate scheduled Worker with its own KV.
 * No HQ privileges, HTTP mutation endpoints, personal data, third-party analytics,
 * synthetic visitor events, D1 writes, external LLM or user-provided URLs.
 */
export const TARGET='https://yorphives.com';
export const FREQUENCY_MINUTES=15;
export const CHECKS=Object.freeze([
 {id:'home',path:'/',method:'GET',kind:'html'},
 {id:'agent-api',path:'/api/agent/v1/openapi.json',method:'GET',kind:'openapi'},
 {id:'capabilities',path:'/api/agent/v1/capabilities',method:'GET',kind:'capabilities'},
 {id:'agent-tools',path:'/api/agent/v1/tools',method:'GET',kind:'tools'},
 {id:'agent-markdown',path:'/tools/word-counter/index.md',method:'GET',kind:'markdown'},
 {id:'analytics',path:'/api/insights/public',method:'GET',kind:'analytics'},
 {id:'growth',path:'/api/insights/growth',method:'GET',kind:'growth'},
 {id:'model',path:'/tools/models/u2netp-309c8469.onnx',method:'HEAD',kind:'model'},
 {id:'missing',path:'/not-a-real-yh-asset-xyzzzy-927ab',method:'GET',kind:'missing'}
]);
const readOnlyHeaders={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
export async function probeOne(check,fetcher=fetch){
 const started=Date.now();
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),7000);
 try{
  // Same-origin targets only; redirects are never automatically followed.
  const response=await fetcher(TARGET+check.path,{
   method:check.method,redirect:'manual',signal:c.signal,
   headers:{'accept':check.kind==='model'?'*/*':'application/json,text/html;q=0.9,*/*;q=0.8',
    'user-agent':'YorpHives-Independent-ReadOnly-Monitor/1.0'},
   cache:'no-store'
  });
  const latencyMs=Date.now()-started;
  if(response.url&&new URL(response.url).origin!==TARGET)throw Error('origin-mismatch');
  const expected=check.kind==='missing'?404:200;
  if(response.status!==expected)return {id:check.id,ok:false,reason:'http-'+response.status,latencyMs};
  if(check.kind==='missing')return {id:check.id,ok:true,latencyMs};
  if(check.kind==='model'){const mime=(response.headers.get('content-type')||'').toLowerCase();const ok=!mime.includes('text/html');return {id:check.id,ok,reason:ok?undefined:'model-replaced-by-html',latencyMs};}
  if(response.headers.get('x-robots-tag')?.toLowerCase().includes('noindex'))
   return {id:check.id,ok:false,reason:'production-noindex',latencyMs};
  if(!['html','markdown'].includes(check.kind)&&response.headers.get('x-yorphives-edge-runtime')!=='workers-static')
   return {id:check.id,ok:false,reason:'not-workers-runtime',latencyMs};
  if(Number(response.headers.get('content-length')||0)>120000)
   return {id:check.id,ok:false,reason:'payload-too-large',latencyMs};
  const raw=await response.text();
  if(raw.length>120000)return {id:check.id,ok:false,reason:'payload-too-large',latencyMs};
  if(check.kind==='html'){
   if(!raw.includes('id="yh-pulse"'))return {id:check.id,ok:false,reason:'home-marker-missing',latencyMs};
   const csp=response.headers.get('content-security-policy')||'';
   if(!csp.includes("object-src 'none'")||!csp.includes("frame-ancestors 'none'")||
      !csp.includes("default-src 'self'"))
    return {id:check.id,ok:false,reason:'csp-weakened',latencyMs};
   const xframe=response.headers.get('x-frame-options')||'';
   if(xframe.toUpperCase()!=='DENY')return {id:check.id,ok:false,reason:'framing-not-denied',latencyMs};
   const nosniff=(response.headers.get('x-content-type-options')||'').split(',').every(x=>x.trim().toLowerCase()==='nosniff');
   if(!nosniff)return {id:check.id,ok:false,reason:'nosniff-missing',latencyMs};
   return {id:check.id,ok:true,latencyMs};
  }
  if(check.kind==='markdown'){
   const ok=raw.includes('Canonical page: https://yorphives.com/tools/word-counter/')&&
    !/^\s*<!doctype html/i.test(raw);
   return {id:check.id,ok,reason:ok?undefined:'agent-markdown-invalid',latencyMs};
  }
  const data=JSON.parse(raw);
  let good=false;
  if(check.kind==='openapi')good=data.openapi==='3.1.0'&&!!data.paths?.['/api/agent/v1/capabilities']?.get;
  if(check.kind==='capabilities')good=data.actions?.executeRemote===false&&Array.isArray(data.items)&&data.items.length>=100;
  if(check.kind==='tools')good=data.interface==='stateless-json-over-https'&&
   data.limits?.perClientPerMinute===30&&Array.isArray(data.tools)&&data.tools.length===5&&
   data.tools.every(t=>t.noStorage===true&&t.charged===false&&t.method==='POST'&&
    /^\/api\/agent\/v1\/tools\/[a-z0-9_-]+\/invoke$/.test(t.invoke));
  if(check.kind==='analytics')good=data.available===true&&data.schemaVersion===1&&data.privacy?.rawIpStored===false;
  if(check.kind==='growth')good=data.available===true&&data.schemaVersion===1&&data.periodDays===30&&data.revenue?.available===false;
  return {id:check.id,ok:good,reason:good?undefined:'contract-invalid',latencyMs};
 }catch(e){
  const message=e?.name==='AbortError'?'timeout':'network-or-contract-error';
  return {id:check.id,ok:false,reason:message,latencyMs:Date.now()-started};
 }finally{clearTimeout(timer);}
}
export async function runChecks(fetcher=fetch,now=()=>new Date()){
 const results=await Promise.all(CHECKS.map(x=>probeOne(x,fetcher)));
 return {schemaVersion:1,checkedAt:now().toISOString(),origin:TARGET,
  healthy:results.every(x=>x.ok),checks:results,
  failedChecks:results.filter(x=>!x.ok).map(x=>x.id),
  statement:'Public read-only probes; no user data, writes or synthetic analytics'};
}
export async function scheduledRun(env,fetcher=fetch,now=()=>new Date()){
 if(!env?.STATUS_KV)throw Error('STATUS_KV missing');
 const report=await runChecks(fetcher,now);
 const old=await env.STATUS_KV.get('latest',{type:'json'}).catch(()=>null);
 const streak=report.healthy?0:Math.min(1000,(Number.isSafeInteger(old?.failureStreak)?old.failureStreak:0)+1);
 const output={...report,failureStreak:streak};
 const day=report.checkedAt.slice(0,10),hour=report.checkedAt.slice(11,13),minute=report.checkedAt.slice(14,16);
 const quarter=Math.floor(Number(minute)/15)*15;
 const key='history/'+day+'/'+hour+String(quarter).padStart(2,'0');
 await Promise.all([
  env.STATUS_KV.put('latest',JSON.stringify(output),{expirationTtl:86400}),
  env.STATUS_KV.put(key,JSON.stringify(output),{expirationTtl:7*86400})
 ]);
 if(!report.healthy)console.error(JSON.stringify({event:'edge-health-failure',time:report.checkedAt,failedChecks:report.failedChecks,streak}));
 else console.log(JSON.stringify({event:'edge-health-ok',time:report.checkedAt,count:report.checks.length}));
 return output;
}
/**
 * Bounded, read-only historical status. KV stores no visitors or personal data.
 * Returned records contain only the nine named probe IDs, status and timing.
 */
export async function historyReport(env){
 if(!env?.STATUS_KV)return {available:false,reason:'status-storage-unconfigured',records:[]};
 const found=await env.STATUS_KV.list({prefix:'history/',limit:1000});
 const names=(found?.keys||[]).map(x=>String(x.name||'')).filter(x=>/^history\/\d{4}-\d{2}-\d{2}\/\d{4}$/.test(x)).sort().slice(-24);
 const rows=await Promise.all(names.map(name=>env.STATUS_KV.get(name,{type:'json'}).catch(()=>null)));
 const records=rows.filter(x=>x&&Number.isFinite(Date.parse(x.checkedAt))&&Array.isArray(x.checks)).map(x=>({
  checkedAt:x.checkedAt,healthy:x.healthy===true,
  failedChecks:(x.failedChecks||[]).filter(v=>CHECKS.some(c=>c.id===v)).slice(0,7),
  checks:x.checks.filter(c=>CHECKS.some(k=>k.id===c.id)).map(c=>({id:c.id,ok:c.ok===true})),
  failureStreak:Number.isSafeInteger(x.failureStreak)?Math.max(0,Math.min(x.failureStreak,1000)):0
 }));
 return {schemaVersion:1,available:true,historyWindow:'last-24-samples',records};
}
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(scheduledRun(env));},
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET'||!['/status','/history'].includes(url.pathname))return new Response(null,{status:404,headers:{'cache-control':'no-store'}});
  if(url.pathname==='/history'){
   try{return new Response(JSON.stringify(await historyReport(env)),{status:200,headers:readOnlyHeaders});}
   catch{return new Response(JSON.stringify({schemaVersion:1,available:false,records:[]}),{status:503,headers:readOnlyHeaders});}
  }
  const latest=await env?.STATUS_KV?.get('latest',{type:'json'}).catch(()=>null);
  if(!latest)return new Response(JSON.stringify({available:false,reason:'awaiting-first-scheduled-check'}),{status:503,headers:readOnlyHeaders});
  const age=Date.now()-Date.parse(latest.checkedAt);
  // Do not assert healthy if the monitor itself stopped running.
  const fresh=Number.isFinite(age)&&age>=0&&age<=35*60*1000;
  const status={available:true,checkedAt:latest.checkedAt,healthy:!!latest.healthy&&fresh,
   stale:!fresh,failedChecks:latest.failedChecks||[],failureStreak:latest.failureStreak||0,
   checks:(latest.checks||[]).map(x=>({id:x.id,ok:x.ok,latencyMs:x.latencyMs,reason:x.reason||null}))};
  return new Response(JSON.stringify(status),{status:status.healthy?200:503,headers:readOnlyHeaders});
 }
};
