import {reconcileRegulatoryReports} from './regulatory-reconciliation.mjs';
const ISSUER='https://token.actions.githubusercontent.com';
export const AUDIENCE='taxpulse-regulatory-evidence-preview';
const REPO='solopreneursid/YorpHives_Website',REF='refs/heads/hqventures/taxpulse-global';
const MAX=300000;
function trustedWorkflow(p){const main='refs/heads/main';return (p.ref===REF&&p.event_name==='push'&&p.workflow_ref===REPO+'/.github/workflows/taxpulse-staging.yml@'+REF)||(p.ref===main&&['schedule','workflow_dispatch','push'].includes(p.event_name)&&p.workflow_ref===REPO+'/.github/workflows/taxpulse-regulatory-daily.yml@'+main);}

function decode(s){if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid JWT');return Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
function jsonPart(s){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(s)));}
export async function verifyCollectorToken(token,{fetcher=fetch,now=Date.now()}={}){
 if(typeof token!=='string'||token.length>16000)throw Error('Invalid token');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
 const h=jsonPart(parts[0]),p=jsonPart(parts[1]),sec=Math.floor(now/1000);
 if(h.alg!=='RS256'||typeof h.kid!=='string'||h.kid.length>200||p.iss!==ISSUER||p.aud!==AUDIENCE||p.repository_id!=='1457876727'||p.repository!==REPO||!trustedWorkflow(p)||![p.iat,p.nbf,p.exp].every(Number.isSafeInteger)||p.iat>sec+30||p.nbf>sec+30||p.exp<=sec||p.exp-p.iat>600||p.exp<=p.iat||p.iat<sec-600||typeof p.run_id!=='string'||!/^\d+$/.test(p.run_id))throw Error('Collector identity not permitted');
 const r=await fetcher(ISSUER+'/.well-known/jwks',{redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Issuer keys unavailable');
 const jwks=await r.json();const matches=jwks.keys?.filter(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
 if(matches?.length!==1)throw Error('Issuer key not found');
 const key=await crypto.subtle.importKey('jwk',matches[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('Invalid token signature');
 return {runId:p.run_id};
}
export async function acceptIndependentReport(kv,config,report,identity,{now=new Date()}={}){
 if(report?.schemaVersion!==1||report.mode!=='review_only'||report.automaticRuleChanges!==false||!Array.isArray(report.sources)||report.sources.length!==config.length||!/^\d+$/.test(identity.runId))throw Error('Invalid evidence');
 const age=now-Date.parse(report.checkedAt);if(!Number.isFinite(age)||age<0||age>3600000)throw Error('Stale evidence');
 const byId=new Map(config.map(s=>[s.id,s]));
 const seen=new Set();
 for(const row of report.sources){const s=byId.get(row.id);if(!s||seen.has(row.id)||s.url!==row.url||s.jurisdiction!==row.jurisdiction||row.ruleChangesApplied!==false||row.automaticActivation!==false||row.legalVerification!==false)throw Error('Unexpected source evidence');seen.add(row.id);const at=Date.parse(row.checkedAt);if(!Number.isFinite(at)||at>now.getTime()||now-at>3600000)throw Error('Invalid observation time');if(row.status!=='fetch_failed'){const u=new URL(row.resolvedUrl||row.url),origins=[s.url,...(s.alternateUrls||[])].map(v=>new URL(v).origin);if(u.protocol!=='https:'||u.username||u.password||u.port||!origins.includes(u.origin)||! /^[a-f0-9]{64}$/.test(row.sha256))throw Error('Invalid resolved source');}}
 reconcileRegulatoryReports(config,null,report,{now});
 const previous=await kv.get('independent-latest','json');
 if(previous&&Date.parse(previous.checkedAt)>=Date.parse(report.checkedAt))return {state:'already_observed'};
 await kv.put('independent-latest',JSON.stringify({...report,collectorRunId:identity.runId}));
 const summary=reconcileRegulatoryReports(config,await kv.get('latest','json'),report,{now});
 return {state:'accepted',reachable:summary.reachable,unavailable:summary.unavailable,reviewPending:summary.sources.filter(s=>s.reviewPending||s.extraction==='matching_candidates').length,automaticRuleChanges:false};
}
export function createEvidenceIntake(config){return {async fetch(req,env){
 const reply=(body,status)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff'}});
 if(new URL(req.url).pathname!=='/v1/evidence'||req.method!=='POST')return reply({error:'Not found'},404);
 let identity;try{const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))throw Error('No token');identity=await verifyCollectorToken(auth.slice(7));}catch{return reply({error:'Unauthorized'},401);}
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return reply({error:'Expected JSON'},415);
 try{const reader=req.body?.getReader();if(!reader)throw Error('Missing body');const chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){await reader.cancel();return reply({error:'Too large'},413);}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}const result=await acceptIndependentReport(env.REGULATORY_STATE,config,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),identity);return reply(result,200);}catch{return reply({error:'Evidence rejected'},400);}
 }};}
