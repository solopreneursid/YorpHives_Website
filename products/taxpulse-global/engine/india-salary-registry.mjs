import data from '../rules/india-salary-versions.json' with { type: 'json' };
const validInt=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
function bands(rows,unbounded){if(!Array.isArray(rows)||!rows.length||rows.length>40)throw Error('Invalid bands');let previous=0;for(let i=0;i<rows.length;i++){const row=rows[i];if(!Array.isArray(row)||row.length!==2||!validInt(row[1],100))throw Error('Invalid band rate');if(row[0]===null){if(!unbounded||i!==rows.length-1)throw Error('Invalid unbounded band');}else{if(!validInt(row[0])||row[0]<=previous)throw Error('Invalid threshold');previous=row[0];}}if(unbounded&&rows.at(-1)[0]!==null)throw Error('Missing final band');}
export function validateIndiaSalaryRegistry(registry){
 if(registry?.schemaVersion!==1||!Array.isArray(registry.versions)||!registry.versions.length)throw Error('Invalid India registry');
 const ids=new Set(),years=new Set();
 for(const r of registry.versions){
  if(r.jurisdiction!=='IN'||r.component!=='ordinary-salary'||r.status!=='preview'||r.legalStatus!=='unverified'||typeof r.version!=='string'||!r.version||ids.has(r.version)||typeof r.taxYear!=='string'||!/^\d{4}$/.test(r.taxYear)||years.has(r.taxYear)||!date(r.effectiveFrom)||!date(r.effectiveUntil)||r.effectiveFrom!==r.taxYear+'-04-01'||r.effectiveUntil!==(Number(r.taxYear)+1)+'-04-01')throw Error('Unsupported India rule period or approval');
  ids.add(r.version);years.add(r.taxYear);
  const p=r.parameters;
  if(!p||!validInt(p.cessPercent,100)||!validInt(p.roundingRupees,100)||p.roundingRupees<1)throw Error('Invalid India parameters');
  for(const key of ['old','new']){const a=p[key];if(!a||!validInt(a.standardDeduction)||!validInt(a.rebateThreshold)||!validInt(a.rebateLimit)||typeof a.rebateMarginalRelief!=='boolean')throw Error('Invalid regime');bands(a.bands,true);bands(a.surcharge,false);if(key==='old'){if(!a.exempt||!['default','60-79','80-plus'].every(k=>validInt(a.exempt[k])&&a.exempt[k]<=a.bands[0][0]))throw Error('Invalid age allowance');}}
  if(!Array.isArray(r.sourceUrls)||!r.sourceUrls.length||r.sourceUrls.some(v=>{try{const u=new URL(v);return u.protocol!=='https:'||u.username||u.password;}catch{return true;}}))throw Error('Invalid sources');
 }
 return registry;
}
function freeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
const baseline=freeze(validateIndiaSalaryRegistry(data));
export function resolveIndiaSalaryRule(year,registry=baseline){if(registry!==baseline)validateIndiaSalaryRegistry(registry);const r=registry.versions.find(r=>r.taxYear===year);if(!r)throw RangeError('Unsupported India tax year');return r;}
