import {reconcileRegulatoryReports} from './regulatory-reconciliation.mjs';
export async function updateReviewQueue(kv,config,{now=new Date()}={}){
 const [edge,independent,prior]=await Promise.all(['latest','independent-latest','review-queue-latest'].map(k=>kv.get(k,'json')));
 const report=reconcileRegulatoryReports(config,edge,independent,{now});
 const old=new Map((prior?.entries||[]).map(r=>[r.id,r]));
 const entries=[];
 for(const row of report.sources){
  const previous=old.get(row.id);
  const reasons=new Set(previous?.reasons||[]);
  if(row.status==='unavailable')reasons.add('source_unavailable');
  if(row.reviewPending)reasons.add('source_review');
  if(row.extraction==='conflicting_candidates')reasons.add('candidate_conflict');
  if(row.extraction==='single_candidate'||row.extraction==='matching_candidates')reasons.add('candidate_review');
  if(reasons.size)entries.push({id:row.id,jurisdiction:row.jurisdiction,firstObserved:previous?.firstObserved||report.generatedAt,lastObserved:report.generatedAt,reasons:[...reasons].sort(),currentStatus:row.status,currentExtraction:row.extraction,status:'pending_review',automaticActivation:false});
 }
 const result={...report,entries};
 await kv.put('review-queue-latest',JSON.stringify(result));
 return result;
}
