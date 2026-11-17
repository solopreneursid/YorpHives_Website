import {loadPublishedCatalog} from './catalog-source.mjs';
/* YorpHives first-party event aggregation. Portable SQLite/D1.
 * No raw IP, UA, files, user content, email or cookies stored.
 * Only cryptographically random browser-tab session digests and daily counts.
 */
import {qualifiedProducts} from '../../product-policy.mjs';
const ROUTES=new Set(['home','ventures','builders','impact','tools','partners','contact','tool']);
const TOOL_URL=/^(?:tools|apps|products)\/[a-z0-9][a-z0-9-]*\/$/;
const SESSION=/^[a-f0-9-]{36}$/i;
const isBot=ua=>/(?:bot|crawler|spider|headless|curl\/|wget\/|python-requests|lighthouse|pagespeed|uptimerobot|monitor)/i.test(ua||'');
const json=(data,status=200,cache='no-store')=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':cache,
 'X-Content-Type-Options':'nosniff'}
});
const dayNow=()=>new Date().toISOString().slice(0,10);
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
export const validRoute=x=>typeof x==='string'&&ROUTES.has(x);
export const validTarget=x=>typeof x==='string'&&TOOL_URL.test(x)&&x.length<95;
export const acceptsRequest=request=>{
 const origin=new URL(request.url).origin;
 return request.headers.get('origin')===origin &&
   request.headers.get('sec-fetch-site')!=='cross-site' &&
   !isBot(request.headers.get('user-agent')) &&
   request.headers.get('DNT')!=='1' &&
   request.headers.get('Sec-GPC')!=='1' &&
   request.cf?.botManagement?.verifiedBot!==true;
};
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value){
 return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}
const published=async (request,env)=>{
 const items=await loadPublishedCatalog(request,env);
 const verifiedProducts=qualifiedProducts(items);
 return new Set([
  ...items.filter(t=>t?.type==='tool'&&t.published!==false&&t.visibility!=='private'&&validTarget(t.url)).map(t=>t.url),
  ...verifiedProducts.filter(t=>validTarget(t.url)).map(t=>t.url)
 ]);
};
const dbFor=ctx=>ctx.env?.INSIGHTS_DB;
const query=async(db,sql,...args)=>db.prepare(sql).bind(...args).all();
const run=async(db,sql,...args)=>db.prepare(sql).bind(...args).run();
export async function collect(ctx){
 const {request}=ctx;
 if(!dbFor(ctx))return json({ok:false,reason:'not-configured'},503);
 if(!acceptsRequest(request))return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({ok:false},415);
 const length=Number(request.headers.get('content-length')||0);
 if(length>400)return json({ok:false},413);
 let data;
 try{const raw=await request.text();if(raw.length>400)return json({ok:false},413);data=JSON.parse(raw);}
 catch{return json({ok:false},400)}
 if(!SESSION.test(data?.sessionId)||!['view','complete'].includes(data?.event))
  return json({ok:false},422);
 const target=data.event==='view'?data.route:data.url;
 if(data.event==='view'?!validRoute(target):!validTarget(target))
  return json({ok:false},422);
 if(data.event==='complete'){
  try{if(!(await published(request,ctx.env)).has(target))return json({ok:false},422)}
  catch{return json({ok:false},503)}
 }
 const db=dbFor(ctx),now=dayNow();
 const bucket=Math.floor(Date.now()/(data.event==='view'?300000:60000));
 const sessionHash=await digest('session|'+data.sessionId);
 const dedupe=await digest('event|'+data.sessionId+'|'+data.event+'|'+target+'|'+bucket);
 try{
  const inserted=await run(db,'INSERT OR IGNORE INTO event_dedupe(digest,day) VALUES(?,?)',dedupe,now);
  if(inserted.meta?.changes!==1)return json({ok:true,counted:false});
  await run(db,'INSERT INTO visitor_sessions(session_hash,first_seen,last_seen) VALUES(?,?,?) ON CONFLICT(session_hash) DO UPDATE SET last_seen=excluded.last_seen',sessionHash,now,now);
  if(data.event==='view'){
   await run(db,'INSERT INTO daily_pageviews(day,route,views) VALUES(?,?,1) ON CONFLICT(day,route) DO UPDATE SET views=views+1',now,target);
  }else{
   await run(db,'INSERT INTO daily_completions(day,url,completions) VALUES(?,?,1) ON CONFLICT(day,url) DO UPDATE SET completions=completions+1',now,target);
  }
  return json({ok:true,counted:true});
 }catch{return json({ok:false,reason:'temporarily-unavailable'},503)}
}
async function prune(db){
 const now=dayNow(),old=daysAgo(35);
 const check=await db.prepare("SELECT day FROM cleanup_log WHERE name='analytics'").first();
 if(check?.day===now)return;
 await run(db,'DELETE FROM event_dedupe WHERE day < ?',old);
 await run(db,'DELETE FROM visitor_sessions WHERE last_seen < ?',old);
 await run(db,'DELETE FROM daily_pageviews WHERE day < ?',old);
 await run(db,'DELETE FROM daily_completions WHERE day < ?',old);
 await run(db,"INSERT INTO cleanup_log(name,day) VALUES('analytics',?) ON CONFLICT(name) DO UPDATE SET day=excluded.day",now);
}
export async function publicReport(ctx){
 const db=dbFor(ctx);
 if(!db)return json({schemaVersion:1,available:false,reason:'not-configured'},503);
 const start=daysAgo(29);
 try{
  const [sessions,views,usage]=await Promise.all([
   query(db,'SELECT COUNT(*) AS total FROM visitor_sessions WHERE last_seen >= ?',start),
   query(db,'SELECT COALESCE(SUM(views),0) AS total FROM daily_pageviews WHERE day >= ?',start),
   query(db,'SELECT url,SUM(completions) AS actions FROM daily_completions WHERE day >= ? GROUP BY url ORDER BY actions DESC,url ASC LIMIT 50',start)
  ]);
  let eligible=new Set();
  try{eligible=await published(ctx.request,ctx.env)}catch{}
  const ranked=(usage.results||[]).filter(x=>eligible.has(x.url)&&
    Number.isSafeInteger(x.actions)&&x.actions>0).slice(0,10)
    .map(x=>({url:x.url,completedActions:x.actions}));
  const report={schemaVersion:1,available:true,generatedAt:new Date().toISOString(),
   periodDays:30,traffic:{estimatedSessions30d:Number(sessions.results?.[0]?.total||0),
    pageViews30d:Number(views.results?.[0]?.total||0),uniquePeople30d:null},
   usage:{metric:'browser_reported_completed_actions',ranked,
    note:'First-party success signals from supported tools; indicative, not independently verified.'},
   privacy:{cookies:false,rawIpStored:false,deviceFingerprinting:false,
    sessionScope:'browser-tab',retentionDays:35}};
  ctx.waitUntil?.(prune(db).catch(()=>{}));
  return json(report,200,'public, max-age=45, s-maxage=120');
 }catch{return json({schemaVersion:1,available:false,reason:'temporarily-unavailable'},503)}
}
