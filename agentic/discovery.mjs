/**
 * Open, read-only discovery interface for YorpHives agents and humans.
 * JSON and OpenAPI are stable interchange formats; this endpoint is NOT an MCP
 * server or payment protocol. Only five small, stateless vetted tools may be
 * invoked at the edge; the remaining catalog stays browser-local.
 */
import {qualifiedProducts} from '../product-policy.mjs';
import {PUBLIC_TOOLS} from './tools-core.mjs';
const TOOL=/^tools\/[a-z0-9][a-z0-9-]*\/$/;
const OTHER=/^(?:apps|products)\/[a-z0-9][a-z0-9-]*\/$/;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=180','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
const text=x=>typeof x==='string'?x.trim().slice(0,350):'';
export const isPublic=x=>x?.published!==false&&x?.visibility!=='private'&&
  (x.type==='tool'&&TOOL.test(x.url)||(['app','product'].includes(x.type)&&OTHER.test(x.url)));
export function publishedAgentItems(items){
 const qualified=new Set(qualifiedProducts(items));
 return (Array.isArray(items)?items:[]).filter(x=>isPublic(x)&&
   (x.type==='tool'||qualified.has(x))).map(x=>({
    id:x.url,type:x.type,name:text(x.name),description:text(x.description),
    category:text(x.category)||'Other',url:'https://yorphives.com/'+x.url,
    markdown:'https://yorphives.com/'+(x.url.endsWith('/')?x.url+'index.md':x.url.replace(/\.html$/,'.md')),
    interaction:{kind:'web-page',execution:'browser-local-or-human',
     remoteExecutionAvailable:false,requiresUserInteraction:true}
 })).filter(x=>x.name&&x.description).sort((a,b)=>a.id.localeCompare(b.id));
}
async function catalog(request,env){
 const u=new URL('/catalog.json',request.url);
 // The ASSETS binding works on Workers Static Assets, while fetch() supports Pages.
 const resp=env?.ASSETS?await env.ASSETS.fetch(u.toString()):
   await fetch(u.toString(),{headers:{Accept:'application/json'},cf:{cacheTtl:60}});
 if(!resp.ok)throw Error('Catalog unavailable');
 const raw=await resp.text();
 if(raw.length>700000)throw Error('Catalog exceeds size budget');
 const data=JSON.parse(raw);
 if(!Array.isArray(data.items))throw Error('Invalid catalog');
 return publishedAgentItems(data.items);
}
export function capabilities(items){
 return {schemaVersion:1,site:'YorpHives',canonicalOrigin:'https://yorphives.com',
  description:'Founder-reviewed ventures and privacy-oriented, browser-local utilities.',
  interface:'read-only-public-discovery',generatedFrom:'published public catalog',
  machineReadable:{catalog:'/catalog.json',markdown:'<canonical page>/index.md',openapi:'/api/agent/v1/openapi.json',
   callableTools:'/api/agent/v1/tools',llms:'/llms.txt',sitemap:'/sitemap.xml'},
  callableTools:{count:PUBLIC_TOOLS.length,registry:'/api/agent/v1/tools',
   interface:'stateless-json-over-https',paymentRequired:false},
  actions:{browse:true,discover:true,executeRemote:false,purchase:false,post:false,authenticate:false},
  governance:{requiresFounderApprovalForPublishing:true,headquartersReadOnly:true},
  itemsCount:items.length,items};
}
export function callableRegistry(){
 return {schemaVersion:1,source:'yorphives-first-party',interface:'stateless-json-over-https',
  description:'Only listed public utilities can run at the edge. Other tools stay browser-local.',
  usage:'No user account, no payment, no storage. Do not send confidential data or personal documents.',
  limits:{maxJsonBodyBytes:4096,perClientPerMinute:30,perLocationPerMinute:160,
   approximate:true,mayReturn429:true},
  tools:PUBLIC_TOOLS.map(t=>({id:t.id,title:t.title,description:t.description,
   inputSchema:t.inputSchema,invoke:'/api/agent/v1/tools/'+t.id+'/invoke',
   method:'POST',noStorage:true,charged:false}))};
}
export function openapi(){
 const paths={
  '/api/agent/v1/capabilities':{get:{operationId:'listPublicCapabilities',
   summary:'List founder-qualified public offerings',
   responses:{200:{description:'Public discovery JSON'}}}},
  '/api/agent/v1/openapi.json':{get:{operationId:'getDiscoveryOpenApi',
   summary:'Read this OpenAPI 3.1 document',responses:{200:{description:'OpenAPI JSON'}}}},
  '/api/agent/v1/tools':{get:{operationId:'listCallableTools',
   summary:'Discover only the vetted remotely callable stateless utilities',
   responses:{200:{description:'Tool registry and JSON Schema input contracts'}}}}
 };
 for(const tool of PUBLIC_TOOLS){
  paths['/api/agent/v1/tools/'+tool.id+'/invoke']={post:{
   operationId:'invoke_'+tool.id,summary:tool.title,
   description:'Bounded stateless operation; never stores input, runs AI inference or calls HQ. Rate-limited. No payment or account required. Do not submit confidential data.',
   'x-yorphives-stateless':true,
   requestBody:{required:true,content:{'application/json':{schema:tool.inputSchema}}},
   responses:{
    200:{description:'Validated result; no user input stored',
     content:{'application/json':{schema:{type:'object',required:['schemaVersion','tool','result','stateless','stored','charged'],
      properties:{schemaVersion:{type:'integer',const:1},tool:{type:'string',const:tool.id},
       result:{type:'object'},stateless:{type:'boolean',const:true},
       stored:{type:'boolean',const:false},charged:{type:'boolean',const:false}}}}}},
    400:{description:'Invalid JSON'},413:{description:'Request exceeds byte limit'},
    415:{description:'JSON required'},422:{description:'Invalid tool arguments'},
    429:{description:'Usage limit reached; Retry-After 60s'},503:{description:'Invocation disabled or unverified'}
   }
  }};
 }
 return {openapi:'3.1.0',
  info:{title:'YorpHives public discovery and stateless utilities',version:'1.1.0',
   description:'Open, provider-neutral HTTP/JSON. Read-only discovery and five bounded stateless POST calculations. No hosted file handling, private HQ access or payment.'},
  servers:[{url:'https://yorphives.com'}],
  paths};
}
export async function agentGet(request,env,route){
 if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'read-only'},405);
 if(route==='/api/agent/v1/openapi.json')return request.method==='HEAD'?new Response(null,{headers}):json(openapi());
 if(route==='/api/agent/v1/tools')return request.method==='HEAD'?new Response(null,{headers}):json(callableRegistry());
 if(route!=='/api/agent/v1/capabilities')return json({error:'not-found'},404);
 try{
  const items=await catalog(request,env);
  return request.method==='HEAD'?new Response(null,{headers}):json(capabilities(items));
 }catch{return json({available:false,reason:'catalog-unavailable'},503)}
}
