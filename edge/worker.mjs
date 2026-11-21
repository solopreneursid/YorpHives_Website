/* Production Workers Static Assets entrypoint; only /api/* invokes the Worker.
 * Stateless public agent operations never access private HQ, D1 or third-party AI.
 */
import {collect,publicReport} from '../functions/_lib/insights.mjs';
import {growthReport} from '../functions/_lib/growth.mjs';
import {agentGet} from '../agentic/discovery.mjs';
import {invokeAgentTool} from '../agentic/invoke.mjs';
import {onRequestPost as submitHqconnect} from '../functions/api/hqconnect.js';

// Human-operated first-party enquiry intake. No agent or HQ can use this to
// publish or mutate site content; absent admission controls fail closed.
const admitContact=async(request,env)=>{
 if(typeof env?.HQCONNECT_DB?.prepare!=='function')return json({ok:false,error:'Intake temporarily unavailable'},503);
 if(typeof env?.CONTACT_CLIENT_LIMIT?.limit!=='function'||
    typeof env?.CONTACT_GLOBAL_LIMIT?.limit!=='function')
  return json({ok:false,error:'Intake temporarily unavailable'},503);
 try{
  const client=request.headers.get('cf-connecting-ip')||'anonymous';
  const [overall,individual]=await Promise.all([
   env.CONTACT_GLOBAL_LIMIT.limit({key:'hqconnect-global'}),
   env.CONTACT_CLIENT_LIMIT.limit({key:'hqconnect-client:'+client})
  ]);
  if(!overall?.success||!individual?.success)
   return json({ok:false,error:'Please try again later'},429,{'retry-after':'60'});
 }catch{return json({ok:false,error:'Intake temporarily unavailable'},503)}
 return null;
}

const json=(data,status=404,extra={})=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),p=url.pathname;
  if(p.startsWith('/api/')){
   const context={request,env,ctx};
   let response;
   if(p==='/api/hqconnect'){
    if(request.method!=='POST')response=json({error:'method-not-allowed'},405,{'allow':'POST'});
    else{
     const denied=await admitContact(request,env);
     response=denied||await submitHqconnect(context);
    }
   }
   else if(/^\/api\/agent\/v1\/tools\/[^/]+\/invoke$/.test(p))response=await invokeAgentTool(request,env,p);
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
  const assetResponse=await env.ASSETS.fetch(request);
  // AdSense site ownership only: no advertising scripts or placements.
  // Keep public tools and HQventures behavior unchanged.
  if(request.method==='GET' && (p==='/' || p==='/index.html') &&
     assetResponse.ok && (assetResponse.headers.get('content-type')||'').includes('text/html')){
   return new HTMLRewriter().on('head',{
    element(element){element.append('<meta name="google-adsense-account" content="ca-pub-9864775895222572">',{html:true});}
   }).transform(assetResponse);
  }
  return assetResponse;
 }
};
