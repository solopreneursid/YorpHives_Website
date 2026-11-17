/* Progressive WebMCP discovery (experimental browser capability).
 * No polyfill, network service, write action, tool-input access or agent-to-HQ channel.
 * Ordinary browsers work exactly as before.
 */
const api=globalThis.document?.modelContext;
if(api&&typeof api.registerTool==='function'&&globalThis.isSecureContext){
 const abort=new AbortController();
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
 try{
  Promise.resolve(api.registerTool({
   name:'search_yorphives_public_tools',
   description:'Find published YorpHives tools and ventures. Read-only discovery; cannot process files, purchase, post, or deploy.',
   inputSchema:{type:'object',properties:{
    query:{type:'string',maxLength:80,description:'Optional search terms'},
    limit:{type:'integer',minimum:1,maximum:10,default:8}},additionalProperties:false},
   annotations:{readOnlyHint:true},execute:search
  },{signal:abort.signal})).catch(()=>{});
  addEventListener('pagehide',()=>abort.abort(),{once:true});
 }catch{/* No effect on normal browsing if experimental WebMCP differs. */}
}
