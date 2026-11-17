/* Progressive, first-party WebMCP integration (W3C Community Group draft).
 * Only supported browsers register tools. Utilities execute LOCALLY, with no
 * network transfer of tool inputs, no tokens, no HQ or third-party services.
 */
import {PUBLIC_TOOLS,invokePublicTool,ToolInputError} from './agentic-tools.mjs';
const api=globalThis.document?.modelContext;
if(api&&typeof api.registerTool==='function'&&globalThis.isSecureContext){
 const abort=new AbortController();
 const register=tool=>{
  try{Promise.resolve(api.registerTool(tool,{signal:abort.signal})).catch(()=>{});}
  catch{/* Progressive feature: no effect on normal browsers. */}
 };
 const search=async({query='',limit=8}={})=>{
  const q=typeof query==='string'?query.trim().toLocaleLowerCase('en-US').slice(0,80):'';
  const cap=Number.isInteger(limit)?Math.max(1,Math.min(10,limit)):8;
  try{
   const response=await fetch('/api/agent/v1/capabilities',{signal:abort.signal,credentials:'omit'});
   if(!response.ok)return {available:false,items:[]};
   const result=await response.json();
   const items=Array.isArray(result.items)?result.items:[];
   return {available:true,items:items.filter(x=>!q||
    [x.name,x.description,x.category].some(v=>String(v||'').toLocaleLowerCase('en-US').includes(q)))
    .slice(0,cap).map(x=>({name:x.name,description:x.description,url:x.url,
     remoteExecutionAvailable:false}))};
  }catch{return {available:false,items:[]}}
 };
 register({
  name:'search_yorphives_public_tools',
  description:'Find published YorpHives tools and ventures. Read-only discovery; cannot process files, purchase, post or deploy.',
  inputSchema:{type:'object',properties:{
   query:{type:'string',maxLength:80,description:'Optional search terms'},
   limit:{type:'integer',minimum:1,maximum:10,default:8}},additionalProperties:false},
  annotations:{readOnlyHint:true},execute:search
 });
 for(const tool of PUBLIC_TOOLS){
  register({
   name:'yorphives_'+tool.id,
   description:tool.description+' Executes locally in this browser; never sends its inputs to a server.',
   inputSchema:tool.inputSchema,annotations:{readOnlyHint:true},
   execute:async input=>{
    try{return {tool:tool.id,result:invokePublicTool(tool.id,input),stateless:true,
      processing:'browser-local',stored:false};}
    catch(error){return {error:error instanceof ToolInputError?error.message:'invalid-input'};}
   }
  });
 }
 addEventListener('pagehide',()=>abort.abort(),{once:true});
}
