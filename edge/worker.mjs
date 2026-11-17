/* Production Workers Static Assets entrypoint; only /api/* invokes the Worker.
 * Stateless public agent operations never access private HQ, D1 or third-party AI.
 */
import {collect,publicReport} from '../functions/_lib/insights.mjs';
import {growthReport} from '../functions/_lib/growth.mjs';
import {agentGet} from '../agentic/discovery.mjs';
import {invokeAgentTool} from '../agentic/invoke.mjs';

const json=(data,status=404)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),p=url.pathname;
  if(p.startsWith('/api/')){
   const context={request,env,ctx};
   let response;
   if(/^\/api\/agent\/v1\/tools\/[^/]+\/invoke$/.test(p))response=await invokeAgentTool(request,env,p);
   else if(p.startsWith('/api/agent/v1/'))response=await agentGet(request,env,p);
   else if(p==='/api/insights/collect')response=await (request.method==='POST'?collect(context):json({error:'method-not-allowed'},405));
   else if(p==='/api/insights/public')response=await (request.method==='GET'?publicReport(context):json({error:'method-not-allowed'},405));
   else if(p==='/api/insights/growth')response=await (request.method==='GET'?growthReport(context):json({error:'method-not-allowed'},405));
   else response=json({error:'unknown-endpoint'});
   // Observability only: proves the public response came from the Worker,
   // without disclosing secrets or requiring another paid monitoring service.
   const headers=new Headers(response.headers);
   headers.set('X-YorpHives-Edge-Runtime','workers-static');
   return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
  if(!env.ASSETS)return json({error:'static-assets-not-configured'},503);
  return env.ASSETS.fetch(request);
 }
};
