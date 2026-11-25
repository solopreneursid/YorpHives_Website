import baseline from '../rules/national-investment-2026.json' with {type:'json'};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const safe=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
function checkShape(value,model,path=''){
 if(typeof model==='number'){if(!safe(value,path.startsWith('national.DE.')?Number.MAX_SAFE_INTEGER:/rate/i.test(path)?10000:1e9))throw Error('Invalid parameter '+path);return;}
 if(typeof model==='string'){if(value!==model)throw Error('Incompatible metadata '+path);return;}
 if(Array.isArray(model)){if(!Array.isArray(value)||value.length!==model.length)throw Error('Unsupported schedule structure '+path);for(let i=0;i<model.length;i++)checkShape(value[i],model[i],path+'.'+i);return;}
 if(!exact(value,Object.keys(model)))throw Error('Unsupported fields '+path);
 for(const k of Object.keys(model))checkShape(value[k],model[k],path?path+'.'+k:k);
}
const increasing=a=>a.every((v,i)=>v>0&&(i===0||v>a[i-1]));
export function validateNationalRegistry(data){
 checkShape(data,baseline);
 const n=data.national,i=data.investment;
 for(const c of ['CA','AU','SG'])if(!increasing(n[c].bounds)||n[c].rates.length!==n[c].bounds.length+1)throw Error('Invalid brackets');
 for(const f of Object.values(n.US.filing))if(!increasing(f.bounds)||f.zero>=f.top||f.bounds.length+1!==n.US.ordinaryRates.length)throw Error('Invalid US filing schedule');
 if(!increasing(n.DE.limits)||n.DE.linearDivisor===0||n.DE.quadraticDivisor===0||n.CA.creditPhaseStart>=n.CA.creditPhaseEnd||n.CA.creditReduction>n.CA.basicPersonalAmount||n.AU.offsetFirstLimit>=n.AU.offsetSecondLimit||i.IN.minimumOtherIncome>i.IN.maximumCombinedIncome||i.IN.propertyHoldingYears<1||i.IN.equityHoldingYears<1||i.US.holdingYears<1)throw Error('Inconsistent national parameters');
 if(n.AE.employeeWagesRate!==0)throw Error('UAE scope must be reviewed before changing zero-wage-tax method');
 return data;
}
function freeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
const data=freeze(validateNationalRegistry(baseline));
export function nationalRules(year,registry=data){if(year!==data.taxYear)throw RangeError('Unsupported national assessment year');return registry===data?data:validateNationalRegistry(registry);}

// Each independently reviewable component receives a stable content-addressed identity.
export async function nationalEvidenceRules(registry){validateNationalRegistry(registry);const rows=[];for(const component of ['national','investment'])for(const [country,parameters] of Object.entries(registry[component])){const raw=JSON.stringify(parameters);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');rows.push({version:country+'-'+registry.taxYear+'-'+component+'-'+digest,jurisdiction:country,taxYear:registry.taxYear,component:component==='national'?'national-assessment':'investment-assessment',sourceUrls:registry.sources[country]});}return rows;}
