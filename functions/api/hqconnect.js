/* Same-origin HQconnect intake. No email/SaaS API. Persistence is SQLite via D1,
 * and can be moved to a self-hosted SQLite adapter without changing the form contract.
 * This endpoint NEVER provides public list/read/update operations. */
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
});
const trim=(x,max)=>typeof x==='string'?x.trim().slice(0,max+1):'';
const emailOk=x=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x)&&x.length<=180;
const allowed=new Set(['Build a product','Long-term partnership','Other']);
const timelines=new Set(['','As soon as practical','1–3 months','3–6 months','Flexible']);
const budgets=new Set(['','Under $1,000','$1,000–$5,000','$5,000–$20,000','$20,000+']);
export async function onRequestPost({request,env}){
 const origin=request.headers.get('origin'),site=new URL(request.url).origin;
 if(origin!==site)return json({ok:false,error:'Origin not allowed'},403);
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({ok:false,error:'JSON required'},415);
 if(Number(request.headers.get('content-length')||0)>10000)return json({ok:false,error:'Request too large'},413);
 if(!env.HQCONNECT_DB)return json({ok:false,error:'Intake temporarily unavailable'},503);
 let data;
 try{const raw=await request.text();if(raw.length>10000)return json({ok:false,error:'Request too large'},413);data=JSON.parse(raw);}
 catch{return json({ok:false,error:'Invalid JSON'},400)}
 if(!data||typeof data!=='object'||Array.isArray(data))return json({ok:false,error:'Invalid request'},400);
 if(data.website)return json({ok:true,reference:'received'},201); // bot trap
 const name=trim(data.name,100),email=trim(data.email,180),kind=trim(data.requestType,50),
  project=trim(data.project,120),message=trim(data.message,4000),
  timeline=trim(data.timeline,40),budget=trim(data.budget,50);
 const startedAt=Number(data.startedAt);
 if(!data.consent||name.length<2||name.length>100||!emailOk(email)||
  !allowed.has(kind)||project.length>120||message.length<20||message.length>4000||
  !timelines.has(timeline)||!budgets.has(budget))
   return json({ok:false,error:'Check the required fields'},400);
 // Ordinary browser typing is never instantaneous. This is a bot friction gate, not security proof.
 if(!Number.isFinite(startedAt)||startedAt<0||startedAt>Date.now()+60000||Date.now()-startedAt<2000)
   return json({ok:false,error:'Please complete the request form normally'},400);
 const id=crypto.randomUUID(),created=new Date().toISOString();
 try{
  await env.HQCONNECT_DB.prepare(
   'INSERT INTO hqconnect_requests (id,created_at,request_type,name,email,project,message,timeline,budget,consent_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id,created,kind,name,email,project,message,timeline,budget,created,'new').run();
 }catch{
  return json({ok:false,error:'Intake temporarily unavailable'},503);
 }
 return json({ok:true,reference:id.slice(0,8)},201);
}
export function onRequestGet(){return json({ok:false,error:'Method not allowed'},405)}
