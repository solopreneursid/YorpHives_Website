// Pure policy layer. No rule is activated by source text or a monitor fingerprint.
const topics=Object.freeze({
 'income-tax':['my-tax','india-regimes','taxable-income','compare','salary-remainder','reverse-salary','salary-offers','salary-negotiation','compensation','international-salary','india-ctc','india-deduction-scenario','time-machine'],
 'payroll':['salary-remainder','reverse-salary','salary-offers','salary-negotiation','compensation','international-salary','employee-contributions','india-ctc'],
 'regional-tax':['regional-tax','salary-remainder','reverse-salary','salary-offers','salary-negotiation','compensation','international-salary','india-ctc'],
 'investment-tax':['investment-tax'],
 'business-tax':['business'],
 'privacy':['site-wide'], 'consumer-protection':['site-wide'], 'employment':['salary-remainder','salary-offers','business']
});
const countries=new Set(['IN','US','GB','CA','AU','DE','AE','SG']);
function jurisdiction(value){
 if(typeof value!=='string'||!(/^[A-Z]{2}(?:-[A-Z0-9]{1,12}){0,2}$/).test(value)||!countries.has(value.split('-')[0]))throw new TypeError('Unsupported jurisdiction identifier');
 return value;
}
function date(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('Use an ISO calendar date');
 const d=new Date(value+'T00:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new RangeError('Invalid calendar date');
 return value;
}
export function regulatoryImpact(source){
 const scope=jurisdiction(source.jurisdiction||source.country);
 const requested=source.topics;
 if(!Array.isArray(requested)||!requested.length||requested.some(t=>!Object.hasOwn(topics,t)))throw new TypeError('Unclassified regulatory source');
 return {jurisdiction:scope,topics:[...new Set(requested)],affectedTools:[...new Set(requested.flatMap(t=>topics[t]))].sort(),coverage:scope.includes('-')?'subnational':'national-or-directory'};
}
export function classifyObservation(source,observation){
 const impact=regulatoryImpact(source);
 const action=observation.status==='fetch_failed'?'source_unavailable':observation.reviewPending||observation.status==='review_required'?'review_required':observation.status==='baseline'?'baseline_unverified':'no_detected_change';
 return {...impact,action,automaticActivation:false,legalVerification:false};
}
// This resolves only externally approved immutable versions, not arbitrary scraped numbers.
// Exact jurisdiction and component matching is mandatory. No federal fallback for a local component.
export function selectEffectiveRule(versions,{jurisdiction:scope,component,onDate}){
 jurisdiction(scope);date(onDate);
 if(typeof component!=='string'||!component||!Array.isArray(versions))throw new TypeError('Invalid rule query');
 const candidates=versions.filter(v=>v.jurisdiction===scope&&v.component===component&&v.status==='approved'&&v.legalStatus==='enacted');
 for(const v of candidates){date(v.effectiveFrom);if(v.effectiveUntil!==null){date(v.effectiveUntil);if(v.effectiveUntil<=v.effectiveFrom)throw new RangeError('Invalid effective interval');}}
 const active=candidates.filter(v=>v.effectiveFrom<=onDate&&(v.effectiveUntil===null||onDate<v.effectiveUntil));
 if(active.length!==1)throw new RangeError(active.length?'Conflicting approved rule versions':'No approved rule for requested jurisdiction and date');
 return active[0];
}
