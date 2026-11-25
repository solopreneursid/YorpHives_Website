import {classifyObservation} from './regulatory-policy.mjs';
import {extractCandidate} from './source-adapters.mjs';
const MAX=2*1024*1024;
export async function inspectEdge(source,previous={},fetcher=fetch,clock=()=>new Date()){
 const checkedAt=clock().toISOString();let observation;
 try{
  const r=await fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{'user-agent':'TaxPulse-Regulatory-Review/0.2'}});
  if(!r.ok||!r.body)throw Error('Source unavailable');
  const reader=r.body.getReader(),parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){await reader.cancel();throw Error('Source exceeds limit');}parts.push(value);}}finally{reader.releaseLock();}
  if(!size)throw Error('Empty source');
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const changed=Boolean(previous.sha256&&previous.sha256!==sha256);
  let candidate=null,extractionStatus='not_configured';
  try{candidate=extractCandidate(source,bytes);if(candidate){candidate={...candidate,sourceUrl:source.url,sourceDigest:sha256,observedAt:checkedAt};extractionStatus='candidate';}}catch{extractionStatus='review_required';}
  observation={...source,checkedAt,sha256,status:!previous.sha256?'baseline':changed?'review_required':'unchanged',reviewPending:Boolean(previous.reviewPending||changed),lastSuccessfulCheck:checkedAt,candidate,extractionStatus,ruleChangesApplied:false};
 }catch{observation={...source,checkedAt,sha256:previous.sha256||null,status:'fetch_failed',reviewPending:Boolean(previous.reviewPending),lastSuccessfulCheck:previous.lastSuccessfulCheck||null,candidate:previous.candidate||null,extractionStatus:'source_unavailable',ruleChangesApplied:false};}
 return {...observation,...classifyObservation(source,observation)};
}
export async function runRegulatoryMonitor(env,sources,fetcher=fetch){
 if(!env?.REGULATORY_STATE)throw Error('Regulatory storage unavailable');
 if(!Array.isArray(sources)||sources.length>40||new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('Invalid monitor configuration');
 for(const s of sources){const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid source');classifyObservation(s,{status:'baseline'});}
 const prior=await env.REGULATORY_STATE.get('latest','json'),old=new Map((prior?.sources||[]).map(s=>[s.id,s]));
 const results=[];
 for(let i=0;i<sources.length;i+=3)results.push(...await Promise.all(sources.slice(i,i+3).map(s=>inspectEdge(s,old.get(s.id),fetcher))));
 const report={schemaVersion:1,mode:'review_only',checkedAt:new Date().toISOString(),automaticRuleChanges:false,sources:results};
 await env.REGULATORY_STATE.put('latest',JSON.stringify(report));
 return report;
}
export function createMonitor(sources){return {scheduled(event,env,ctx){ctx.waitUntil(runRegulatoryMonitor(env,sources));},fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});}};}
