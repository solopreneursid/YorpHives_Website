/**
 * Open, read-only discovery interface for YorpHives agents and humans.
 * JSON and OpenAPI are stable interchange formats; this endpoint is NOT an MCP
 * server, payment protocol, or authorization to execute tools on our servers.
 * All tools remain client-side unless separately documented and approved.
 */
import {qualifiedProducts} from '../product-policy.mjs';
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
  machineReadable:{catalog:'/catalog.json',openapi:'/api/agent/v1/openapi.json',llms:'/llms.txt',sitemap:'/sitemap.xml'},
  actions:{browse:true,discover:true,executeRemote:false,purchase:false,post:false,authenticate:false},
  governance:{requiresFounderApprovalForPublishing:true,headquartersReadOnly:true},
  itemsCount:items.length,items};
}
export function openapi(){
 return {openapi:'3.1.0',info:{title:'YorpHives public discovery',version:'1.0.0',
  description:'Read-only product and tool discovery. No hosted execution, payment, or write endpoints.'},
  servers:[{url:'https://yorphives.com'}],paths:{
   '/api/agent/v1/capabilities':{get:{operationId:'listPublicCapabilities',
    summary:'List founder-qualified public tools and ventures',
    responses:{200:{description:'Public discovery',content:{'application/json':{schema:{type:'object',properties:{schemaVersion:{type:'integer'},items:{type:'array',items:{type:'object'}}}}}}}}}},
   '/api/agent/v1/openapi.json':{get:{operationId:'getDiscoveryOpenApi',summary:'Read this OpenAPI document',responses:{200:{description:'OpenAPI 3.1 JSON'}}}}
  }};
}
export async function agentGet(request,env,route){
 if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'read-only'},405);
 if(route==='/api/agent/v1/openapi.json')return request.method==='HEAD'?new Response(null,{headers}):json(openapi());
 if(route!=='/api/agent/v1/capabilities')return json({error:'not-found'},404);
 try{
  const items=await catalog(request,env);
  return request.method==='HEAD'?new Response(null,{headers}):json(capabilities(items));
 }catch{return json({available:false,reason:'catalog-unavailable'},503)}
}
