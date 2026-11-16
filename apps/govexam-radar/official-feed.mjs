// GovRadar government recruitment feed adapter, source-bound and portable SQLite/D1.
// First supported adapter: UK Department for Education Teaching Vacancies (OGL v3).
// Source: https://teaching-vacancies.service.gov.uk/api/v1/jobs.json
// Licence: https://teaching-vacancies.service.gov.uk/pages/terms-and-conditions
// Do not charge candidates/recruiters for contacting, interviewing or hiring in reuse of this data.
export const DFE_SOURCE = Object.freeze({
 id:"uk-dfe-teaching-vacancies",
 name:"Department for Education — Teaching Vacancies",
 api:"https://teaching-vacancies.service.gov.uk/api/v1/jobs.json",
 host:"teaching-vacancies.service.gov.uk",
 licence:"Open Government Licence v3.0",
 licenceUrl:"https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
 termsUrl:"https://teaching-vacancies.service.gov.uk/pages/terms-and-conditions",
 country:"United Kingdom"
});
const MAX_FEED_BYTES=3200000;
const MAX_ITEMS=100;
const MAX_BATCH=20;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const value=v=>typeof v==="string"?v.trim():"";
const plain=(v,max=240)=>value(v).replace(/[\u0000-\u001f\u007f<>]/g," ").replace(/\s+/g," ").slice(0,max);
function validDate(v){
 if(typeof v!=="string"||!/^20\d\d-\d\d-\d\d(?:T.*)?$/.test(v))return null;
 const ms=Date.parse(v);
 if(!Number.isFinite(ms)||ms<Date.UTC(2024,0,1)||ms>Date.UTC(2045,0,1))return null;
 return new Date(ms).toISOString();
}
function classifyStream(raw){
 const category=value(raw.occupationalCategory)+" "+value(raw.title);
 if(/\b(software|developer|software engineer|IT support|ICT support|information technology|network technician|engineering|data engineer|database administrator|computing|ICT technician|cybersecurity|IT technician)\b/i.test(category))return "Technical";
 if(/\b(teacher|teaching|tutor|catering|administrative|administrator|finance|headteacher|caretaker|assistant|reception|office|cleaning|school business|leadership)\b/i.test(category))return "Non-technical";
 return "Unclassified";
}
export function normalizeOfficialJob(raw,clock=Date.now()){
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||raw["@type"]!=="JobPosting")return {error:"not_jobposting"};
 const title=plain(raw.title,180);
 const employer=plain(raw.hiringOrganization?.name,160);
 const datePosted=validDate(raw.datePosted);
 const closingAt=validDate(raw.validThrough);
 let url;
 try{url=new URL(raw.url);}catch{return {error:"bad_url"};}
 if(url.protocol!=="https:"||url.hostname!==DFE_SOURCE.host||!url.pathname.startsWith("/jobs/"))return {error:"non_official_url"};
 // Do not retain tracking IDs, query params, hashes or redirects.
 url.search="";url.hash="";
 const sourceRef=url.toString();
 if(!title||!employer||title.length<3)return {error:"missing_required_fields"};
 if(!closingAt)return {error:"missing_valid_closing_date"};
 if(Date.parse(closingAt)<=clock)return {error:"already_closed"};
 if(datePosted&&Date.parse(datePosted)>clock+86400000)return {error:"invalid_published_date"};
 const loc=Array.isArray(raw.jobLocation)?raw.jobLocation[0]:raw.jobLocation;
 const addr=loc?.address||{};
 const region=plain(addr.addressRegion||addr.addressLocality||"",90);
 return {sourceId:DFE_SOURCE.id,sourceRef,title,employer,country:DFE_SOURCE.country,region,
  stream:classifyStream(raw),applyUrl:sourceRef,sourcePage:sourceRef,
  publishedAt:datePosted,closingAt,reviewState:"official_feed_unreviewed",
  lifeStatus:"open"};
}
export function parseOfficialFeed(payload,clock=Date.now()){
 if(!payload||typeof payload!=="object"||Array.isArray(payload)||!Array.isArray(payload.data))
   throw Error("unsupported_feed_schema");
 const items=payload.data;
 if(items.length>MAX_ITEMS)throw Error("feed_page_too_large");
 const pages=Number(payload.meta?.totalPages);
 const totalPages=Number.isSafeInteger(pages)&&pages>=1&&pages<=10000?pages:1;
 const valid=[],rejected={};const seen=new Set();
 for(const raw of items){
  const job=normalizeOfficialJob(raw,clock);
  if(job.error){rejected[job.error]=(rejected[job.error]||0)+1;continue;}
  if(seen.has(job.sourceRef)){rejected.duplicate=(rejected.duplicate||0)+1;continue;}
  seen.add(job.sourceRef);valid.push(job);
 }
 return {valid,rejected,totalPages,received:items.length};
}
async function digest(value){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function boundedOfficialFetch(page,fetcher=fetch){
 const u=new URL(DFE_SOURCE.api);u.searchParams.set("page",String(page));
 const ctl=new AbortController();const timeout=setTimeout(()=>ctl.abort(),14000);
 try{
  const res=await fetcher(u.toString(),{method:"GET",signal:ctl.signal,redirect:"error",headers:{
   "Accept":"application/json",
   "Referer":"https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev/",
   "User-Agent":"HQventuresGovRadar/2.2 (public-data reader, https://yorphives.com)"
  }});
  if(!res.ok)return {error:"http_"+res.status,status:res.status};
  if(!(res.headers.get("content-type")||"").includes("json"))return {error:"unexpected_content_type",status:res.status};
  const length=Number(res.headers.get("content-length")||0);
  if(length>MAX_FEED_BYTES)return {error:"response_too_large",status:res.status};
  const reader=res.body?.getReader();
  let text="";
  if(reader){
   const decoder=new TextDecoder();
   try{
    while(true){
     const {done,value}=await reader.read();if(done)break;
     text+=decoder.decode(value,{stream:true});
     if(text.length>MAX_FEED_BYTES){await reader.cancel();return {error:"response_too_large",status:res.status};}
    }
    text+=decoder.decode();
   }finally{reader.releaseLock();}
  }else{text=await res.text();if(text.length>MAX_FEED_BYTES)return {error:"response_too_large",status:res.status};}
  try{return {payload:JSON.parse(text),status:res.status};}
  catch{return {error:"invalid_json",status:res.status};}
 }catch(e){return {error:e?.name==="AbortError"?"timeout":"network_error",status:null};}
 finally{clearTimeout(timeout);}
}
async function audit(db,outcome){
 try{
  await db.prepare("INSERT INTO source_ingest_runs (id,source_id,started_at,finished_at,state,http_status,received,accepted,discarded,error_code,details) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
   .bind(outcome.id,DFE_SOURCE.id,outcome.startedAt,outcome.finishedAt,outcome.state,outcome.httpStatus??null,outcome.received||0,outcome.accepted||0,outcome.discarded||0,outcome.errorCode||null,outcome.details||"").run();
 }catch(e){console.error(JSON.stringify({event:"official_feed_audit_failed",reason:String(e?.message||e)}));}
}
export async function ingestDfE(db,fetcher=fetch,clock=Date.now()){
 if(!db)throw Error("database_binding_required");
 const outcome={id:crypto.randomUUID(),startedAt:clock,finishedAt:clock,state:"error",httpStatus:null,received:0,accepted:0,discarded:0,errorCode:null,details:""};
 try{
  const cursor=await db.prepare("SELECT next_page,last_total_pages FROM source_feed_cursors WHERE source_id=?").bind(DFE_SOURCE.id).first();
  const page=Math.max(1,Number(cursor?.next_page)||1);
  const {payload,error,status}=await boundedOfficialFetch(page,fetcher);
  outcome.httpStatus=status;
  if(error){outcome.errorCode=error;outcome.details="Page "+page+" was not imported.";return outcome;}
  const parsed=parseOfficialFeed(payload,clock);
  outcome.received=parsed.received;outcome.discarded=parsed.received-parsed.valid.length;
  // Empty or malformed official response should never silently reset or delete the catalogue.
  if(!parsed.received||!parsed.valid.length){outcome.state="rejected";outcome.errorCode=parsed.received?"no_eligible_records":"empty_page";outcome.details=JSON.stringify({page,rejected:parsed.rejected}).slice(0,800);return outcome;}
  const now=Date.now();
  for(let i=0;i<parsed.valid.length;i+=MAX_BATCH){
   const batch=await Promise.all(parsed.valid.slice(i,i+MAX_BATCH).map(async row=>{
    const id=DFE_SOURCE.id+":"+(await digest(row.sourceRef)).slice(0,32);
    const hash=await digest(JSON.stringify([row.sourceRef,row.title,row.employer,row.closingAt,row.region,row.publishedAt]));
    return db.prepare("INSERT INTO official_job_notices(id,source_id,source_ref,title,employer,country,region,stream,apply_url,source_page,published_at,closing_at,first_seen_at,last_seen_at,evidence_sha256,review_state,life_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,employer=excluded.employer,region=excluded.region,stream=excluded.stream,published_at=excluded.published_at,closing_at=excluded.closing_at,last_seen_at=excluded.last_seen_at,evidence_sha256=excluded.evidence_sha256,life_status='open'")
     .bind(id,DFE_SOURCE.id,row.sourceRef,row.title,row.employer,row.country,row.region,row.stream,row.applyUrl,row.sourcePage,row.publishedAt,row.closingAt,now,now,hash,row.reviewState,row.lifeStatus);
   }));
   await db.batch(batch);
  }
  outcome.accepted=parsed.valid.length;
  const nextPage=page>=parsed.totalPages?1:page+1;
  await db.prepare("INSERT INTO source_feed_cursors(source_id,next_page,last_total_pages,last_success_at) VALUES(?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET next_page=excluded.next_page,last_total_pages=excluded.last_total_pages,last_success_at=excluded.last_success_at")
   .bind(DFE_SOURCE.id,nextPage,parsed.totalPages,now).run();
  await db.prepare("UPDATE official_job_notices SET life_status='expired' WHERE source_id=? AND life_status='open' AND closing_at<=?")
   .bind(DFE_SOURCE.id,new Date(now).toISOString()).run();
  outcome.state="ok";outcome.details=JSON.stringify({page,nextPage,totalPages:parsed.totalPages,rejected:parsed.rejected}).slice(0,800);
  return outcome;
 }catch(e){
  outcome.errorCode="storage_or_schema_error";outcome.details=String(e?.message||e).slice(0,250);
  console.error(JSON.stringify({event:"official_feed_ingestion_failed",reason:outcome.details}));
  return outcome;
 }finally{
  outcome.finishedAt=Date.now();
  await audit(db,outcome);
  console.log(JSON.stringify({event:"official_feed_ingestion",source:DFE_SOURCE.id,outcome:outcome.state,count:outcome.accepted,rejected:outcome.discarded,reason:outcome.errorCode}));
 }
}
export async function serveOfficialNotices(db,params){
 if(!db)return json({error:"not_configured",notices:[]},503);
 try{
  const limit=Math.min(50,Math.max(1,Number(params.get("limit"))||18));
  const page=Math.max(1,Math.min(1000,Number(params.get("page"))||1));
  const keyword=plain(params.get("q"),60);
  const stream=["Technical","Non-technical","Unclassified"].includes(params.get("stream"))?params.get("stream"):"";
  const where=["life_status='open'","closing_at>?", "review_state IN ('official_feed_unreviewed','founder_reviewed')"];
  const bind=[new Date().toISOString()];
  if(stream){where.push("stream=?");bind.push(stream);}
  if(keyword){where.push("(title LIKE ? OR employer LIKE ? OR region LIKE ?)");bind.push(...Array(3).fill("%"+keyword+"%"));}
  const rows=await db.prepare("SELECT id,source_id as sourceId,title,employer,country,region,stream,source_page as sourceUrl,published_at as publishedAt,closing_at as closingAt,first_seen_at as firstSeenAt,last_seen_at as lastSeenAt,review_state as reviewState FROM official_job_notices WHERE "+where.join(" AND ")+" ORDER BY first_seen_at DESC,id ASC LIMIT ? OFFSET ?")
   .bind(...bind,limit,(page-1)*limit).all();
  const total=await db.prepare("SELECT COUNT(*) AS total FROM official_job_notices WHERE "+where.join(" AND ")).bind(...bind).first();
  return json({source:{id:DFE_SOURCE.id,name:DFE_SOURCE.name,licence:DFE_SOURCE.licence,licenceUrl:DFE_SOURCE.licenceUrl,termsUrl:DFE_SOURCE.termsUrl},
    notices:rows.results||[],total:total?.total||0,page,limit,
    disclaimer:"Records were retrieved from an official source feed; individual posts, eligibility and closing dates have NOT been independently verified. Check each linked official notice."});
 }catch(e){console.error(JSON.stringify({event:"official_notices_read_failed",reason:String(e?.message||e)}));return json({error:"temporarily_unavailable",notices:[]},503);}
}
export async function serveIngestionStatus(db){
 if(!db)return json({error:"not_configured"},503);
 try{
  const latest=await db.prepare("SELECT source_id as sourceId,started_at as startedAt,finished_at as finishedAt,state,received,accepted,discarded,error_code as errorCode,details FROM source_ingest_runs ORDER BY finished_at DESC LIMIT 5").all();
  const c=await db.prepare("SELECT COUNT(*) AS total FROM official_job_notices WHERE life_status='open' AND closing_at>?").bind(new Date().toISOString()).first();
  return json({source:DFE_SOURCE.name,openImportedNotices:c?.total||0,latest:latest.results||[],status:"official_feed_imports_not_independently_verified"});
 }catch{return json({error:"status_unavailable"},503);}
}
