/**
 * Local-first Agentic Internet HTTP adapter (Node.js 20+).
 *
 * Zero Cloudflare packages or credentials. Defaults to loopback only:
 *   node agentic/portable-server.mjs
 *
 * This demonstrates that the first-party API contracts are fully portable.
 * Not intended as a public TLS service or distributed production rate limiter.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {agentGet} from './discovery.mjs';
import {invokeAgentTool} from './invoke.mjs';

const MAX_BODY_BYTES=4096;
const MAX_URL_CHARS=2048;
const CATALOG_PATH=fileURLToPath(new URL('../catalog.json',import.meta.url));
const TOOL_INVOKE=/^\/api\/agent\/v1\/tools\/[a-z][a-z0-9_-]{0,40}\/invoke$/;
const responseHeaders={'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff'};
const error=(name,status)=>new Response(JSON.stringify({error:name}),
 {status,headers:responseHeaders});

function windowLimiter(max,clock=Date.now){
 const counters=new Map();
 return {
  async limit({key}){
   const now=clock(),existing=counters.get(key);
   // Never track client metadata beyond the current one-minute memory window.
   if(counters.size>=4096){
    for(const [k,v] of counters)if(now-v.start>=60000)counters.delete(k);
    // Fail closed if the admission map is still full.
    if(counters.size>=4096&&!counters.has(key))return {success:false};
   }
   if(!existing||now-existing.start>=60000){
    counters.set(key,{start:now,count:1});
    return {success:true};
   }
   if(existing.count>=max)return {success:false};
   existing.count++;
   return {success:true};
  }
 };
}
async function boundedBody(req){
 const chunks=[];let size=0;
 for await(const chunk of req){
  size+=chunk.byteLength;
  if(size>MAX_BODY_BYTES)return {tooLarge:true};
  chunks.push(chunk);
 }
 return {data:Buffer.concat(chunks,size)};
}
async function replyNode(response,res,head=false){
 const headers=Object.fromEntries(response.headers.entries());
 const bytes=head?null:Buffer.from(await response.arrayBuffer());
 res.writeHead(response.status,headers);
 res.end(bytes);
}
export function createPortableAgentServer({catalogPath=CATALOG_PATH,clock=Date.now}={}){
 const globalLimiter=windowLimiter(160,clock);
 const perClientLimiter=windowLimiter(30,clock);
 const env={
  AGENT_GLOBAL_LIMIT:globalLimiter,
  AGENT_CLIENT_LIMIT:perClientLimiter,
  ASSETS:{
   // Only the public catalog is readable by this adapter; no arbitrary files.
   async fetch(){return new Response(await readFile(catalogPath),
    {status:200,headers:{'content-type':'application/json'}});}
  }
 };
 return createServer(async(req,res)=>{
  try{
   if(!req.url||req.url.length>MAX_URL_CHARS){
    return await replyNode(error('invalid-url',414),res);
   }
   const pathname=new URL(req.url,'http://127.0.0.1').pathname;
   const method=req.method||'GET';
   // Only published discovery, metadata, and five vetted operations exist.
   if(!pathname.startsWith('/api/agent/v1/')){
    return await replyNode(error('not-found',404),res);
   }
   let body;
   if(TOOL_INVOKE.test(pathname)&&method==='POST'){
    const parsed=await boundedBody(req);
    if(parsed.tooLarge)return await replyNode(error('body-too-large',413),res);
    body=parsed.data;
   }
   const headers=new Headers();
   if(req.headers['content-type'])headers.set('content-type',String(req.headers['content-type']));
   // Remote IP is used ONLY as a volatile limiter key. Spoofed forwarded headers
   // and CF-Connecting-IP supplied by clients must never influence it.
   headers.set('cf-connecting-ip',req.socket?.remoteAddress||'unknown-local');
   const opts={method,headers};
   if(body)opts.body=body;
   const request=new Request('http://127.0.0.1'+pathname,opts);
   const output=TOOL_INVOKE.test(pathname)?
    await invokeAgentTool(request,env,pathname):
    await agentGet(request,env,pathname);
   await replyNode(output,res,method==='HEAD');
  }catch{
   if(!res.headersSent){
    try{await replyNode(error('unavailable',503),res)}catch{res.destroy()}
   }else res.destroy();
  }
 });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.YORPHIVES_AGENT_PORT||8788);
 if(!Number.isInteger(port)||port<1024||port>65535)
  throw Error('Set YORPHIVES_AGENT_PORT to an integer between 1024 and 65535.');
 const server=createPortableAgentServer();
 server.listen(port,'127.0.0.1',()=>{
  console.log('YorpHives local agent API listening on http://127.0.0.1:'+port);
  console.log('Loopback-only proof; TLS and a shared rate limiter required before public hosting.');
 });
}
