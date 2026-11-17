/* Optional edge-native Workers Static Assets entrypoint.
 * API response contracts shared with the current Pages Functions deployment.
 * Static assets served by the CDN; only /api/* reaches this Worker.
 * Deployment is intentionally separate from the live Pages domain until
 * full asset, redirect, D1 and authenticated smoke checks pass.
 */
import {collect,publicReport} from '../functions/_lib/insights.mjs';
import {growthReport} from '../functions/_lib/growth.mjs';
import {agentGet} from '../agentic/discovery.mjs';

const json=(data,status=404)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),p=url.pathname;
  if(p.startsWith('/api/agent/v1/'))return agentGet(request,env,p);
  const context={request,env,ctx};
  if(p==='/api/insights/collect')return request.method==='POST'?collect(context):json({error:'method-not-allowed'},405);
  if(p==='/api/insights/public')return request.method==='GET'?publicReport(context):json({error:'method-not-allowed'},405);
  if(p==='/api/insights/growth')return request.method==='GET'?growthReport(context):json({error:'method-not-allowed'},405);
  if(p.startsWith('/api/'))return json({error:'unknown-endpoint'});
  if(!env.ASSETS)return json({error:'static-assets-not-configured'},503);
  return env.ASSETS.fetch(request);
 }
};
