import {loadPublishedCatalog} from './catalog-source.mjs';
/* Aggregate-only growth intelligence: shared by public dashboards and read-only HQ.
 * Compatible with SQLite/D1; no personal identifiers, revenue guesses or provider SDK.
 */
import {qualifiedProducts} from '../../product-policy.mjs';

const DAY_MS=86400000;
const isoDay=ms=>new Date(ms).toISOString().slice(0,10);
const dateRange=(now=Date.now())=>{
 const today=Date.parse(isoDay(now)+'T00:00:00Z');
 return Array.from({length:30},(_,i)=>isoDay(today-(29-i)*DAY_MS));
};
const safeCount=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):0;
const safeTarget=url=>typeof url==='string'&&/^(?:tools|apps|products)\/[a-z0-9][a-z0-9-]*\/$/.test(url);
const response=(payload,status=200)=>new Response(JSON.stringify(payload),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=45, s-maxage=120':'no-store',
 'X-Content-Type-Options':'nosniff'}
});
async function catalogFor(request,env){
 const items=await loadPublishedCatalog(request,env);
 const toolItems=items.filter(t=>t?.type==='tool'&&t.published!==false&&t.visibility!=='private');
 const verified=qualifiedProducts(items);
 return new Map([...toolItems,...verified].filter(t=>safeTarget(t.url)).map(t=>[t.url,{
  url:t.url,name:String(t.name||t.url).slice(0,100),category:String(t.category||'Other').slice(0,60)
 }]));
}
export function buildGrowthReport({days,views,completions,eligible,generatedAt=new Date().toISOString()}){
 const perDay=new Map(days.map(day=>[day,{day,pageViews:0,completedActions:0}]));
 const byUrl=new Map();
 const toolViews=new Map();
 for(const row of views){
  const target=perDay.get(row.day);
  if(target)target.pageViews+=safeCount(row.views);
  // Exact Free Tool routes are collected only after catalog allowlisting.
  // The original generic "tool" route stays included in sitewide totals,
  // but cannot be backfilled into per-tool pageviews.
  const product=eligible.get(row.route);
  if(target&&product&&row.route.startsWith('tools/')){
   const current=toolViews.get(row.route)||{...product,pageViews30d:0,pageViews7d:0,previous7d:0};
   const amount=safeCount(row.views),offset=days.indexOf(row.day);
   current.pageViews30d+=amount;
   if(offset>=23)current.pageViews7d+=amount;
   else if(offset>=16)current.previous7d+=amount;
   toolViews.set(row.route,current);
  }
 }
 for(const row of completions){
  const day=perDay.get(row.day),product=eligible.get(row.url);
  if(!day||!product)continue;
  const amount=safeCount(row.completions);day.completedActions+=amount;
  const totals=byUrl.get(row.url)||{...product,completedActions30d:0,completedActions7d:0,previous7d:0};
  totals.completedActions30d+=amount;
  const offset=days.indexOf(row.day);
  if(offset>=23)totals.completedActions7d+=amount;
  else if(offset>=16)totals.previous7d+=amount;
  byUrl.set(row.url,totals);
 }
 const daily=[...perDay.values()];
 const totals=(a,b,key)=>daily.slice(a,b).reduce((sum,row)=>sum+row[key],0);
 const recent=totals(23,30,'completedActions'),previous=totals(16,23,'completedActions');
 const ranked=[...byUrl.values()].sort((a,b)=>b.completedActions30d-a.completedActions30d||a.url.localeCompare(b.url));
 // Signals are not automated approval or verified demand; all require founder review.
 const opportunities=ranked.filter(x=>x.completedActions7d>=3&&x.completedActions7d>x.previous7d)
  .sort((a,b)=>(b.completedActions7d-b.previous7d)-(a.completedActions7d-a.previous7d)).slice(0,5)
  .map(x=>({url:x.url,name:x.name,signal:'increasing-completions',recent7d:x.completedActions7d,previous7d:x.previous7d,action:'investigate',requiresFounderReview:true}));
 return {schemaVersion:1,available:true,generatedAt,periodDays:30,
  methodology:'Anonymous browser-reported completions; indicative, not independently verified. Dates are UTC.',
  daily,comparison:{recent7dCompletedActions:recent,previous7dCompletedActions:previous,
   recent7dPageViews:totals(23,30,'pageViews'),previous7dPageViews:totals(16,23,'pageViews')},
  ranked:ranked.slice(0,10),
  toolPageViews:[...toolViews.values()].sort((a,b)=>b.pageViews7d-a.pageViews7d||a.url.localeCompare(b.url)).slice(0,10),
  opportunities,signalsAvailable:ranked.length>0||toolViews.size>0,
  revenue:{available:false,amount:null,reason:'No verified revenue source connected'},
  access:'Public aggregates only. HQ may observe and recommend; never change site, deployments, or approvals.'};
}
export async function growthReport(ctx){
 const db=ctx.env?.INSIGHTS_DB;
 if(!db)return response({schemaVersion:1,available:false,reason:'not-configured'},503);
 try{
  const days=dateRange(),since=days[0];
  const [v,c,eligible]=await Promise.all([
   db.prepare('SELECT day,route,views FROM daily_pageviews WHERE day >= ?').bind(since).all(),
   db.prepare('SELECT day,url,completions FROM daily_completions WHERE day >= ?').bind(since).all(),
   catalogFor(ctx.request,ctx.env)
  ]);
  return response(buildGrowthReport({days,views:v.results||[],completions:c.results||[],eligible}));
 }catch{return response({schemaVersion:1,available:false,reason:'temporarily-unavailable'},503)}
}
