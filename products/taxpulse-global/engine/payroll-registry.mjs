import data from '../rules/payroll-versions.json' with { type: 'json' };
const schema={
 'US:oasdi':['annualWageBase','employeeRateBasisPoints'],
 'US:medicare':['employeeRateBasisPoints','additionalRateBasisPoints','additionalThreshold'],
 'GB:ni':['monthlyLower','monthlyUpper','mainRateBasisPoints','upperRateBasisPoints'],
 'CA:cpp-ei':['cppExemption','cppCeiling','cpp2Ceiling','cppRateBasisPoints','cpp2RateBasisPoints','cppEnhancedRateBasisPoints','eiCeiling','eiRateBasisPoints'],
 'AU:medicare-levy':['fullRateBasisPoints','minimumSupportedIncome'],
 'IN:epf':['employeeRateBasisPoints','maximumSupportedWage'],
 'SG:cpf':['ordinaryWageCeiling','minimumExclusiveWage','ageRates']
};
const ageBands=['55-or-under','56-60','61-65','66-70','over-70'];
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function validatePayrollRegistry(registry){
 if(registry?.schemaVersion!==1||!Array.isArray(registry.versions)||!registry.versions.length||registry.versions.length>250)throw Error('Invalid payroll registry');
 const ids=new Set(),periods=new Set();
 for(const r of registry.versions){
  const key=r.jurisdiction+':'+r.component,year=r.taxYear,month=r.jurisdiction==='GB'||r.jurisdiction==='IN'?'04':r.jurisdiction==='AU'?'07':'01',day=r.jurisdiction==='GB'?'06':'01';
  if(!Object.hasOwn(schema,key)||typeof year!=='string'||!/^\d{4}$/.test(year)||+year<2000||+year>2100||r.effectiveFrom!==year+'-'+month+'-'+day||r.effectiveUntil!==(Number(year)+1)+'-'+month+'-'+day||r.status!=='preview'||r.legalStatus!=='unverified'||typeof r.version!=='string'||!r.version||ids.has(r.version)||periods.has(key+':'+year)||!exact(r.parameters,schema[key]))throw Error('Invalid payroll rule');
  ids.add(r.version);periods.add(key+':'+year);
  const p=r.parameters;
  for(const [k,v] of Object.entries(p)){if(k==='ageRates'){if(!exact(v,ageBands)||Object.values(v).some(a=>!Array.isArray(a)||a.length!==2||!a.every(n=>integer(n,10000))||a[0]>a[1]))throw Error('Invalid CPF age rates');}else if(!integer(v,k.endsWith('BasisPoints')?10000:1e9))throw Error('Invalid payroll value');}
  if(key==='CA:cpp-ei'&&(p.cppExemption>=p.cppCeiling||p.cppCeiling>=p.cpp2Ceiling||p.cppEnhancedRateBasisPoints>p.cppRateBasisPoints)||key==='GB:ni'&&p.monthlyLower>=p.monthlyUpper||key==='SG:cpf'&&p.minimumExclusiveWage>=p.ordinaryWageCeiling)throw Error('Inconsistent payroll thresholds');
  if(!Array.isArray(r.sourceUrls)||!r.sourceUrls.length||r.sourceUrls.some(v=>{try{const u=new URL(v);return u.protocol!=='https:'||u.username||u.password;}catch{return true;}}))throw Error('Invalid sources');
 }
 return registry;
}
function freeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
const baseline=freeze(validatePayrollRegistry(data));
export function payrollRules(){return baseline.versions;}
export function resolvePayrollRule(jurisdiction,component,taxYear,registry=baseline){if(registry!==baseline)validatePayrollRegistry(registry);const r=registry.versions.find(r=>r.jurisdiction===jurisdiction&&r.component===component&&r.taxYear===taxYear);if(!r)throw RangeError('Unsupported payroll period');return r;}
