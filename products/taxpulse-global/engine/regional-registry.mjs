import registry from '../rules/regional-versions.json' with { type: 'json' };
const currencies={US:'USD',CA:'CAD',GB:'GBP'};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export function validateRegionalRegistry(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.versions)||!data.versions.length)throw Error('Invalid regional registry');
 const ids=new Set();
 for(const r of data.versions){
  const country=r.jurisdiction?.split('-')[0];
  if(!Object.hasOwn(currencies,country)||!new RegExp('^'+country+'-[A-Z0-9]{2,12}$').test(r.jurisdiction)||r.component!=='regional-income-tax'||r.currency!==currencies[country]||!/^\d{4}$/.test(r.taxYear)||typeof r.name!=='string'||!r.name||typeof r.version!=='string'||!r.version||ids.has(r.version)||!date(r.effectiveFrom)||!date(r.effectiveUntil)||r.effectiveFrom>=r.effectiveUntil||r.status!=='preview'||r.legalStatus!=='unverified')throw Error('Invalid or unauthorized regional rule');
  ids.add(r.version);
  if(!Array.isArray(r.bounds)||!Array.isArray(r.rates)||r.rates.length!==r.bounds.length+1||r.bounds.some((n,i)=>!Number.isSafeInteger(n)||n<=0||n>1e9||(i>0&&n<=r.bounds[i-1]))||r.rates.some(n=>!Number.isSafeInteger(n)||n<0||n>10000))throw Error('Invalid regional schedule');
  if(!Array.isArray(r.sourceUrls)||!r.sourceUrls.length||r.sourceUrls.some(s=>{try{const u=new URL(s);return u.protocol!=='https:'||!!u.username||!!u.password;}catch{return true;}}))throw Error('Invalid source URL');
  if(country==='GB'){const a=r.allowance;if(!a||Object.keys(a).length!==3||!Number.isSafeInteger(a.base)||a.base<0||a.base>1e9||!Number.isSafeInteger(a.taperStart)||a.taperStart<0||a.taperStart>1e9||!Number.isSafeInteger(a.taperDivisor)||a.taperDivisor<1||a.taperDivisor>100)throw Error('Invalid allowance');}else if(r.allowance!==null)throw Error('Unexpected allowance');
 }
 for(const a of data.versions)for(const b of data.versions)if(a!==b&&a.jurisdiction===b.jurisdiction&&a.effectiveFrom<b.effectiveUntil&&b.effectiveFrom<a.effectiveUntil)throw Error('Overlapping regional versions');
 return data;
}
const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(deepFreeze);Object.freeze(o);}return o;};
const baseline=deepFreeze(validateRegionalRegistry(registry));
export function regionalRules(){return baseline.versions;}
export function resolveRegionalRule({country,region,taxYear},data=baseline){
 if(data!==baseline)validateRegionalRegistry(data);
 const rows=data.versions.filter(r=>r.jurisdiction===country+'-'+region&&r.taxYear===taxYear);
 if(rows.length!==1)throw RangeError('No unique full-period regional rule; transition or unsupported year requires a dedicated model');
 const row=rows[0],start=country==='GB'?taxYear+'-04-06':taxYear+'-01-01',end=country==='GB'?(Number(taxYear)+1)+'-04-06':(Number(taxYear)+1)+'-01-01';
 if(row.effectiveFrom>start||row.effectiveUntil<end)throw RangeError('Regional rule does not cover the full tax period');
 return row;
}
