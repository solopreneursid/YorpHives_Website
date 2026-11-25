// Versioned snapshots: append new IDs, never revise an existing ID in place.
// Ordinary income rate schedules only. No inference of credits or future proposals.
import data from '../rules/historical-versions.json' with {type:'json'};
if(data.schemaVersion!==1||!Array.isArray(data.snapshots)||new Set(data.snapshots.map(r=>r.id)).size!==data.snapshots.length)throw Error('Invalid historical registry');
const SNAPSHOTS=data.snapshots;
for(const r of SNAPSHOTS){if(!Array.isArray(r.bounds)||!Array.isArray(r.rates)||r.rates.length!==r.bounds.length+1||r.bounds.some((v,i)=>!Number.isSafeInteger(v)||v<=0||v>1e9||(i&&v<=r.bounds[i-1]))||r.rates.some(v=>!Number.isSafeInteger(v)||v<0||v>10000)||r.start>=r.end||r.legislation!=='enacted')throw Error('Invalid historical schedule');}
for(const r of SNAPSHOTS){Object.freeze(r.bounds);Object.freeze(r.rates);Object.freeze(r.sourceUrls);Object.freeze(r);}
Object.freeze(SNAPSHOTS);
const find=id=>SNAPSHOTS.find(r=>r.id===id);
const copy=r=>({...r,bounds:[...r.bounds],rates:[...r.rates],sourceUrls:[...r.sourceUrls]});
export function historicalRuleCatalog(){return SNAPSHOTS.map(copy);}
function money(v){
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e9||Math.abs(v*100-Math.round(v*100))>0.00002)throw new RangeError('Use a nonnegative amount with at most two decimal places');
 return BigInt(Math.round(v*100));
}
const out=v=>Number(v)/100;
const round=v=>(v+5000n)/10000n;
function assess(rule,amount){
 let lower=0n,total=0n;const brackets=[];
 for(let i=0;i<rule.rates.length;i++){
  const upper=i<rule.bounds.length?BigInt(rule.bounds[i])*100n:null;
  const limit=upper===null||amount<upper?amount:upper;
  const used=limit>lower?limit-lower:0n;
  const raw=used*BigInt(rule.rates[i]);total+=raw;
  brackets.push({lower:out(lower),upper:upper===null?null:out(upper),rate:rule.rates[i]/10000,taxableIncome:out(used),tax:out(round(raw))});
  if(upper!==null)lower=upper;
 }
 return {rule:copy(rule),taxBeforeAdjustments:out(round(total)),brackets};
}
export function compareHistoricalTax(input){
 const keys=['country','firstRuleId','secondRuleId','taxableIncome','scopeConfirmed'];
 if(!input||typeof input!=='object'||Array.isArray(input)||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k))||input.scopeConfirmed!==true)throw new TypeError('Unsupported comparison');
 const first=find(input.firstRuleId),second=find(input.secondRuleId);
 if(!first||!second||first.country!==input.country||second.country!==input.country||first.id===second.id||first.start>=second.start)throw new RangeError('Choose two supported chronological tax periods for the same country');
 const amount=money(input.taxableIncome),a=assess(first,amount),b=assess(second,amount);
 return {country:input.country,currency:first.currency,inputBasis:'ordinary-taxable-income-before-credits',taxableIncome:out(amount),first:a,second:b,taxChange:out(money(b.taxBeforeAdjustments)-money(a.taxBeforeAdjustments)),sampleOnly:true,taxRulesVerified:false,algorithmId:'ordinary-progressive-minor-units-v1',warnings:[first.scope,'Same nominal taxable income in both periods; not inflation-adjusted. Enacted rate schedules only, not a prediction of future total tax. Unverified example, not for filing or decisions.']};
}
