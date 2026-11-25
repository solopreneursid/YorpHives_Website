// Versioned snapshots: append new IDs, never revise an existing ID in place.
// Ordinary income rate schedules only. No inference of credits or future proposals.
const SNAPSHOTS=[
  {
    "id": "US-2024-single-ordinary-v1",
    "country": "US",
    "label": "2024",
    "start": "2024-01-01",
    "end": "2024-12-31",
    "currency": "USD",
    "scope": "US single filer; regular federal rate schedule on ordinary taxable income, before credits, AMT, state taxes and payroll. Not tax-table rounding or a complete return.",
    "legislation": "enacted",
    "bounds": [
      11600,
      47150,
      100525,
      191950,
      243725,
      609350
    ],
    "rates": [
      1000,
      1200,
      2200,
      2400,
      3200,
      3500,
      3700
    ],
    "sourceUrls": [
      "https://www.irs.gov/irb/2023-48_IRB"
    ]
  },
  {
    "id": "US-2025-single-ordinary-v1",
    "country": "US",
    "label": "2025",
    "start": "2025-01-01",
    "end": "2025-12-31",
    "currency": "USD",
    "scope": "US single filer; regular federal rate schedule on ordinary taxable income, before credits, AMT, state taxes and payroll. Not tax-table rounding or a complete return.",
    "legislation": "enacted",
    "bounds": [
      11925,
      48475,
      103350,
      197300,
      250525,
      626350
    ],
    "rates": [
      1000,
      1200,
      2200,
      2400,
      3200,
      3500,
      3700
    ],
    "sourceUrls": [
      "https://www.irs.gov/irb/2024-45_IRB"
    ]
  },
  {
    "id": "US-2026-single-ordinary-v1",
    "country": "US",
    "label": "2026",
    "start": "2026-01-01",
    "end": "2026-12-31",
    "currency": "USD",
    "scope": "US single filer; regular federal rate schedule on ordinary taxable income, before credits, AMT, state taxes and payroll. Not tax-table rounding or a complete return.",
    "legislation": "enacted",
    "bounds": [
      12400,
      50400,
      105700,
      201775,
      256225,
      640600
    ],
    "rates": [
      1000,
      1200,
      2200,
      2400,
      3200,
      3500,
      3700
    ],
    "sourceUrls": [
      "https://www.irs.gov/irb/2025-45_IRB"
    ]
  },
  {
    "id": "AU-2024-25-resident-ordinary-v1",
    "country": "AU",
    "label": "FY 2024–25",
    "start": "2024-07-01",
    "end": "2025-06-30",
    "currency": "AUD",
    "scope": "Full-year Australian resident eligible for full tax-free threshold; ordinary taxable income before offsets, Medicare levy, surcharge, student debt or other adjustments.",
    "legislation": "enacted",
    "bounds": [
      18200,
      45000,
      135000,
      190000
    ],
    "rates": [
      0,
      1600,
      3000,
      3700,
      4500
    ],
    "sourceUrls": [
      "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
      "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer"
    ]
  },
  {
    "id": "AU-2025-26-resident-ordinary-v1",
    "country": "AU",
    "label": "FY 2025–26",
    "start": "2025-07-01",
    "end": "2026-06-30",
    "currency": "AUD",
    "scope": "Full-year Australian resident eligible for full tax-free threshold; ordinary taxable income before offsets, Medicare levy, surcharge, student debt or other adjustments.",
    "legislation": "enacted",
    "bounds": [
      18200,
      45000,
      135000,
      190000
    ],
    "rates": [
      0,
      1600,
      3000,
      3700,
      4500
    ],
    "sourceUrls": [
      "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
      "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer"
    ]
  },
  {
    "id": "AU-2026-27-resident-ordinary-v1",
    "country": "AU",
    "label": "FY 2026–27",
    "start": "2026-07-01",
    "end": "2027-06-30",
    "currency": "AUD",
    "scope": "Full-year Australian resident eligible for full tax-free threshold; ordinary taxable income before offsets, Medicare levy, surcharge, student debt or other adjustments.",
    "legislation": "enacted",
    "bounds": [
      18200,
      45000,
      135000,
      190000
    ],
    "rates": [
      0,
      1500,
      3000,
      3700,
      4500
    ],
    "sourceUrls": [
      "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
      "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer"
    ]
  },
  {
    "id": "AU-2027-28-resident-ordinary-v1",
    "country": "AU",
    "label": "FY 2027–28",
    "start": "2027-07-01",
    "end": "2028-06-30",
    "currency": "AUD",
    "scope": "Full-year Australian resident eligible for full tax-free threshold; ordinary taxable income before offsets, Medicare levy, surcharge, student debt or other adjustments.",
    "legislation": "enacted",
    "bounds": [
      18200,
      45000,
      135000,
      190000
    ],
    "rates": [
      0,
      1400,
      3000,
      3700,
      4500
    ],
    "sourceUrls": [
      "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
      "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer"
    ]
  }
];
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
