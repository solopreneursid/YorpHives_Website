import {classifyObservation} from './regulatory-policy.mjs';
import {extractCandidate} from './source-adapters.mjs';
const MAX=2*1024*1024;
const redirects=new Set([301,302,303,307,308]);
function officialUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('Invalid official source URL');return u;}
async function retrieve(source,fetcher,extraRequest){
 const initial=officialUrl(source.url),alternates=(source.alternateUrls||[]).map(officialUrl);
 let target=initial,lastFailure='network_error';
 const attempts=[];
 for(let i=0;i<3;i++){
  if(i>0&&!extraRequest())break;
  let response;
  try{response=await fetcher(target.href,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'user-agent':'TaxPulse-Regulatory-Review/0.3'}});}
  catch{attempts.push({url:target.href,status:'network_error'});lastFailure='network_error';}
  if(response){
   attempts.push({url:target.href,status:response.status});
   if(response.ok&&response.body)return {response,resolvedUrl:target.href,attempts};
   lastFailure='http_'+response.status;
   if(redirects.has(response.status)){
    let next;try{next=officialUrl(new URL(response.headers.get('location')||'',target).href);}catch{}
    if(next&&(next.origin===initial.origin||alternates.some(a=>a.href===next.href))&&!attempts.some(a=>a.url===next.href)){await response.body?.cancel();target=next;continue;}
    lastFailure='redirect_rejected';
   }
   await response.body?.cancel();
  }
  const fallback=alternates.find(a=>!attempts.some(x=>x.url===a.href));if(!fallback)break;target=fallback;
 }
 return {failure:lastFailure,attempts};
}
export async function inspectEdge(source,previous={},fetcher=fetch,clock=()=>new Date(),extraRequest=()=>true){
 const checkedAt=clock().toISOString();let observation;let attempts=[],resolvedUrl=null,failure='response_read_failed';
 try{
  const result=await retrieve(source,fetcher,extraRequest);attempts=result.attempts;resolvedUrl=result.resolvedUrl||null;
  if(!result.response){failure=result.failure;throw Error('Source unavailable');}const r=result.response;
  const reader=r.body.getReader(),parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){failure='response_too_large';await reader.cancel();throw Error('Source exceeds limit');}parts.push(value);}}finally{reader.releaseLock();}
  if(!size){failure='empty_response';throw Error('Empty source');}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const changed=Boolean(previous.sha256&&(previous.sha256!==sha256||previous.resolvedUrl&&previous.resolvedUrl!==resolvedUrl));
  let candidate=null,extractionStatus='not_configured';
  try{candidate=extractCandidate({...source,url:resolvedUrl},bytes);if(candidate){candidate={...candidate,sourceUrl:resolvedUrl,sourceDigest:sha256,observedAt:checkedAt};extractionStatus='candidate';}}catch{extractionStatus='review_required';}
  observation={...source,checkedAt,sha256,status:!previous.sha256?'baseline':changed?'review_required':'unchanged',reviewPending:Boolean(previous.reviewPending||changed||extractionStatus==='review_required'||(previous.extractionStatus==='candidate'&&extractionStatus!=='candidate')),lastSuccessfulCheck:checkedAt,resolvedUrl,attempts,candidate,extractionStatus,ruleChangesApplied:false};
 }catch{observation={...source,checkedAt,sha256:previous.sha256||null,status:'fetch_failed',reviewPending:Boolean(previous.reviewPending),lastSuccessfulCheck:previous.lastSuccessfulCheck||null,resolvedUrl:previous.resolvedUrl||null,attempts,failure,candidate:previous.candidate||null,extractionStatus:'source_unavailable',ruleChangesApplied:false};}
 return {...observation,...classifyObservation(source,observation)};
}
export async function runRegulatoryMonitor(env,sources,fetcher=fetch){
 if(!env?.REGULATORY_STATE)throw Error('Regulatory storage unavailable');
 if(!Array.isArray(sources)||sources.length>40||new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('Invalid monitor configuration');
 for(const s of sources){officialUrl(s.url);if(s.alternateUrls&&(!Array.isArray(s.alternateUrls)||s.alternateUrls.length>2))throw Error('Invalid alternate source list');for(const url of s.alternateUrls||[])officialUrl(url);classifyObservation(s,{status:'baseline'});}
 const prior=await env.REGULATORY_STATE.get('latest','json'),old=new Map((prior?.sources||[]).map(s=>[s.id,s]));
 const results=[];let extras=Math.max(0,45-sources.length);const extraRequest=()=>extras>0?(extras--,true):false;
 for(let i=0;i<sources.length;i+=3)results.push(...await Promise.all(sources.slice(i,i+3).map(s=>inspectEdge(s,old.get(s.id),fetcher,()=>new Date(),extraRequest))));
 const report={schemaVersion:1,mode:'review_only',checkedAt:new Date().toISOString(),automaticRuleChanges:false,sources:results};
 await env.REGULATORY_STATE.put('latest',JSON.stringify(report));
 return report;
}
export function createMonitor(sources){return {scheduled(event,env,ctx){ctx.waitUntil(runRegulatoryMonitor(env,sources));},fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});}};}
