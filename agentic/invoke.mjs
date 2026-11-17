/**
 * First-party, portable stateless invocation gateway. Public API operations
 * are intentionally NOT agent-to-HQ, MCP proxies, payments or user-data storage.
 */
import {invokePublicTool,publicToolDefinition,ToolInputError} from './tools-core.mjs';
import {recordAgentUtilityCall} from './usage.mjs';
const MAX_BODY=4096;
const baseHeaders={'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(data,status=200,extra={})=>new Response(JSON.stringify(data),
 {status,headers:{...baseHeaders,...extra}});
async function bodyWithinLimit(request,max){
 if(!request.body)return '';
 const reader=request.body.getReader(),parts=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>max)throw new ToolInputError('body-too-large');
   parts.push(value);
  }
 }finally{reader.releaseLock();}
 const result=new Uint8Array(size);let index=0;
 for(const part of parts){result.set(part,index);index+=part.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(result);
}
export async function invokeAgentTool(request,env,path){
 const match=/^\/api\/agent\/v1\/tools\/([a-z][a-z0-9_-]{0,40})\/invoke$/.exec(path);
 if(!match||!publicToolDefinition(match[1]))return reply({error:'unknown-tool'},404);
 if(request.method!=='POST')return reply({error:'method-not-allowed'},405,{allow:'POST'});
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))
  return reply({error:'json-required'},415);
 const sizeHeader=Number(request.headers.get('content-length')||0);
 if(!Number.isFinite(sizeHeader)||sizeHeader>MAX_BODY)
  return reply({error:'body-too-large'},413);
 // Mandatory fail-closed binding: never publish an unmetered compute endpoint.
 if(typeof env?.AGENT_GLOBAL_LIMIT?.limit!=='function'||
    typeof env?.AGENT_CLIENT_LIMIT?.limit!=='function')
  return reply({error:'calls-temporarily-unavailable'},503);
 const client=request.headers.get('cf-connecting-ip')||'anonymous';
 try{
  const [global,individual]=await Promise.all([
   env.AGENT_GLOBAL_LIMIT.limit({key:'agent-v1-global'}),
   env.AGENT_CLIENT_LIMIT.limit({key:'agent-v1-client:'+client})
  ]);
  if(!global?.success||!individual?.success)
   return reply({error:'rate-limited'},429,{'retry-after':'60'});
 }catch{return reply({error:'calls-temporarily-unavailable'},503)}
 try{
  const raw=await bodyWithinLimit(request,MAX_BODY);
  if(!raw)return reply({error:'invalid-json'},400);
  const args=JSON.parse(raw);
  const result=invokePublicTool(match[1],args);
  // Only the allowlisted utility ID is recorded; never input values or caller identity.
  recordAgentUtilityCall(env,match[1]);
  return reply({schemaVersion:1,tool:match[1],result,stateless:true,stored:false,
   charged:false});
 }catch(error){
  if(error instanceof ToolInputError)
   return reply({error:error.message},error.message==='body-too-large'?413:422);
  return reply({error:'invalid-json'},400);
 }
}
