const states=new Set(['baseline','unchanged','review_required','fetch_failed']);
export function regulatorySummary(config,report,now=new Date()){
 const checkedAt=typeof report?.checkedAt==='string'&&Number.isFinite(Date.parse(report.checkedAt))?report.checkedAt:null;
 const age=checkedAt?now.getTime()-Date.parse(checkedAt):Infinity;
 const stale=age<0||age>36*3600000;
 const rows=config.map(s=>{const r=report?.sources?.find(x=>x.id===s.id&&x.url===s.url);return {id:s.id,jurisdiction:s.jurisdiction,topics:s.topics,url:s.url,status:r&&states.has(r.status)?r.status:'not_checked',reviewPending:r?.reviewPending===true,lastSuccessfulCheck:typeof r?.lastSuccessfulCheck==='string'?r.lastSuccessfulCheck:null,extractionStatus:r?.extractionStatus==='candidate'?'candidate':r?.extractionStatus==='review_required'?'review_required':'not_available'};});
 return {mode:'review_only',checkedAt,stale,configuredSources:rows.length,reviewPending:rows.filter(r=>r.reviewPending).length,unavailable:rows.filter(r=>r.status==='fetch_failed'||r.status==='not_checked').length,sources:rows,taxRulesVerified:false,automaticProductionActivation:false};
}
export async function loadRegulatorySummary(config,env){try{return regulatorySummary(config,await env?.REGULATORY_STATE?.get('latest','json'));}catch{return regulatorySummary(config,null);}}
