const digest=/^[a-f0-9]{64}$/;
const states=new Set(['baseline','unchanged','review_required','fetch_failed']);
const DAY=86400000;
function canonical(o){
 if(Array.isArray(o))return o.map(canonical);
 if(o&&typeof o==='object')return Object.fromEntries(Object.keys(o).sort().map(k=>[k,canonical(o[k])]));
 return o;
}
function semantic(c){
 if(!c||typeof c!=='object')return null;
 const rows=Array.isArray(c.candidates)?c.candidates:[c];
 if(!rows.length||rows.length>100)return null;
 const values=rows.map(r=>{
  if(!r||r.status!=='candidate'||r.automaticActivation!==false||typeof r.jurisdiction!=='string'||typeof r.component!=='string'||!r.parameters||typeof r.parameters!=='object')throw Error('Invalid extracted candidate');
  return canonical({jurisdiction:r.jurisdiction,component:r.component,taxYear:r.taxYear??null,assessmentYearFrom:r.assessmentYearFrom??null,effectiveFrom:r.effectiveFrom??null,effectiveUntil:r.effectiveUntil??null,parameters:r.parameters});
 });
 return JSON.stringify(values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
function index(report,now,maxAge){
 if(!report)return new Map();
 if(report.mode!=='review_only'||report.automaticRuleChanges!==false||!Array.isArray(report.sources)||report.sources.length>40)throw Error('Invalid observation report');
 const age=now-Date.parse(report.checkedAt);
 if(!Number.isFinite(age)||age<0||age>maxAge)return new Map();
 const rows=new Map();
 for(const row of report.sources){
  if(typeof row.id!=='string'||rows.has(row.id)||!states.has(row.status))throw Error('Invalid or duplicate observation');
  const at=Date.parse(row.checkedAt);
  if(!Number.isFinite(at)||at>now||now-at>maxAge)continue;
  rows.set(row.id,row);
 }
 return rows;
}
function observed(source,row){
 if(!row||row.url!==source.url||row.status==='fetch_failed'||!digest.test(row.sha256||''))return null;
 let candidate=null;
 if(row.extractionStatus==='candidate'){
  if(row.candidate?.sourceDigest!==row.sha256)throw Error('Candidate does not match observation evidence');
  candidate=semantic(row.candidate);
  if(candidate===null)throw Error('Missing candidate');
 }
 return {digest:row.sha256,candidate,reviewPending:row.reviewPending===true||row.extractionStatus==='review_required',resolvedUrl:row.resolvedUrl||row.url};
}
export function reconcileRegulatoryReports(config,edge,independent,{now=new Date(),maxAgeMs=36*3600000,maxSkewMs=DAY}={}){
 const at=now.getTime();
 if(!Number.isFinite(at)||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<=0||!Number.isSafeInteger(maxSkewMs)||maxSkewMs<0||!Array.isArray(config)||config.length>40||new Set(config.map(s=>s.id)).size!==config.length)throw Error('Invalid reconciliation input');
 const a=index(edge,at,maxAgeMs),b=index(independent,at,maxAgeMs);
 const sources=config.map(s=>{
  const edgeRow=a.get(s.id),independentRow=b.get(s.id),e=observed(s,edgeRow),i=observed(s,independentRow);
  let status=e&&i?'both_retrieved':e?'edge_only':i?'independent_only':'unavailable';
  let extraction='none',sameContent=null;
  if(e&&i){
   sameContent=e.digest===i.digest;
   const skew=Math.abs(Date.parse(edgeRow.checkedAt)-Date.parse(independentRow.checkedAt));
   if(skew>maxSkewMs)extraction='observations_too_far_apart';
   else if(e.candidate&&i.candidate)extraction=e.candidate===i.candidate?'matching_candidates':'conflicting_candidates';
   else if(e.candidate||i.candidate)extraction='single_candidate';
  }else if(e?.candidate||i?.candidate)extraction='single_candidate';
  return {id:s.id,jurisdiction:s.jurisdiction,status,extraction,sameContent,reviewPending:Boolean(e?.reviewPending||i?.reviewPending||extraction==='conflicting_candidates'||extraction==='single_candidate'||extraction==='observations_too_far_apart'),edgeResolvedUrl:e?.resolvedUrl??null,independentResolvedUrl:i?.resolvedUrl??null,automaticActivation:false};
 });
 return {schemaVersion:1,mode:'review_only',generatedAt:now.toISOString(),configuredSources:sources.length,reachable:sources.filter(s=>s.status!=='unavailable').length,unavailable:sources.filter(s=>s.status==='unavailable').length,conflictingCandidates:sources.filter(s=>s.extraction==='conflicting_candidates').length,automaticRuleChanges:false,sources};
}
