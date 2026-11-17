/**
 * Usage counters for public, successful stateless utility calls only.
 * Portable adapter: no request/IP, user agent, user inputs, cookies, files,
 * token, payment data or identifiers are accepted by this function.
 * Cloudflare Analytics Engine is optional and replaceable.
 */
import {publicToolDefinition} from './tools-core.mjs';
export function recordAgentUtilityCall(env,id){
 if(!publicToolDefinition(id)||typeof env?.AGENT_USAGE?.writeDataPoint!=='function')return false;
 try{
  env.AGENT_USAGE.writeDataPoint({
   blobs:[id,'public-stateless','free'],
   doubles:[1],
   indexes:[id]
  });
  return true;
 }catch{return false}
}
