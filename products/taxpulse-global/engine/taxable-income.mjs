import {resolveIndiaSalaryRule} from './india-salary-registry.mjs';
import {regionalRules,resolveRegionalRule} from './regional-registry.mjs';
// 2026 assessment models; inputs are taxable income, not gross salary.
// Source-reviewed formula components are not full statutory certification.
const MAX=1_000_000_000;
const amount=(v)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>MAX)throw new TypeError('Invalid income');return v;};
const cents=v=>Math.round((v+Number.EPSILON)*100)/100;
const DE_SOURCE='https://www.gesetze-im-internet.de/estg/__32a.html';
const CA_SOURCE='https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan/t4032on-january-general-information.html';
const CA_CREDIT_SOURCE='https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/payroll-deductions-t4127-payroll-deductions-formulas/t4127-jan-122nd-edition-effective-january-1-2026/t4127-jan-payroll-deductions-formulas-computer-programs.html';

function germanTariff(value){
 // Exact integer rational evaluation avoids floating-point errors at euro floors.
 const x=BigInt(Math.floor(value));
 let tax,band;
 if(x<=12348n){tax=0n;band='Basic allowance';}
 else if(x<=17799n){
   const y=x-12348n;
   tax=(91451n*y*y+1400000000n*y)/10000000000n;
   band='First progressive zone';
 }else if(x<=69878n){
   const z=x-17799n;
   tax=(17310n*z*z+2397000000n*z+10348700000000n)/10000000000n;
   band='Second progressive zone';
 }else if(x<=277825n){tax=(42n*x-1113563n)/100n;band='42% zone';}
 else{tax=(45n*x-1947038n)/100n;band='45% zone';}
 return {roundedTaxableIncome:Number(x),tariffTax:Number(tax),band};
}

export function assessTaxableIncome(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.taxYear!=='2026')throw new TypeError('Unsupported tax period');
 const {country}=input;
 if(country==='AE'){
   if(Object.keys(input).some(k=>!['country','taxYear','salaryIncome','employeeWagesOnly'].includes(k))||input.employeeWagesOnly!==true)throw new TypeError('Only ordinary employee wages supported');
   const salaryIncome=amount(input.salaryIncome);
   return {country,taxYear:'2026',taxYearLabel:'Calendar year 2026',sampleOnly:true,taxRulesVerified:false,inputBasis:'employee-wages',currency:'AED',salaryIncome,incomeTax:0,sourceUrls:["https://u.ae/en/information-and-services/finance-and-investment/taxation","https://www.tax.gov.ae/en/taxes/corporate.tax/corporate.tax.topics/basis.of.taxation.natural.person.aspx"],ruleId:'AE-2026-employee-wages-v1',warnings:['UAE personal income tax on ordinary employee wages only. Excludes business activity, foreign tax obligations, social contributions and other taxes or deductions. Zero income tax is not a take-home pay estimate.']};
 }
 const taxableIncome=amount(input.taxableIncome);
 const common={country,taxYear:'2026',sampleOnly:true,taxRulesVerified:false,inputBasis:'taxable-income'};
 if(country==='DE'){
   if(!['individual','joint'].includes(input.assessment))throw new TypeError('Choose assessment type');
   if(Object.keys(input).some(k=>!['country','taxYear','taxableIncome','assessment'].includes(k)))throw new TypeError('Unsupported input');
   const joint=input.assessment==='joint',unit=germanTariff(joint?taxableIncome/2:taxableIncome);
   return {...common,currency:'EUR',sourceUrls:[DE_SOURCE],ruleId:'DE-2026-EStG-32a-v1',
    assessment:input.assessment,taxableIncome,unitTaxableIncome:unit.roundedTaxableIncome,
    tariffZone:unit.band,incomeTax:unit.tariffTax*(joint?2:1),
    warnings:['Ordinary tariff only. Excludes solidarity surcharge, church tax, special income, credits and payroll. Joint treatment assumes legal eligibility. Not a salary calculator.']};
 }
 if(country==='CA'){
   if(Object.keys(input).some(k=>!['country','taxYear','taxableIncome','netIncome','fullYearResident'].includes(k)))throw new TypeError('Unsupported input');
   if(input.fullYearResident!==true)throw new TypeError('Only full-year resident examples supported');
   const netIncome=amount(input.netIncome);
   if(netIncome<taxableIncome)throw new RangeError('Net income cannot be below taxable income');
   const bounds=[0,58523,117045,181440,258482,Infinity],rates=[.14,.205,.26,.29,.33];
   const rows=rates.map((rate,i)=>({lower:bounds[i],upper:Number.isFinite(bounds[i+1])?bounds[i+1]:null,rate,taxed:Math.max(0,Math.min(taxableIncome,bounds[i+1])-bounds[i])}));
   const taxBeforeCredits=rows.reduce((sum,r)=>sum+r.taxed*r.rate,0);
   const phase=Math.max(0,Math.min(1,(netIncome-181440)/(258482-181440)));
   const basicPersonalAmount=16452-1623*phase;
   const basicPersonalCredit=Math.min(taxBeforeCredits,basicPersonalAmount*.14);
   return {...common,currency:'CAD',sourceUrls:[CA_SOURCE,CA_CREDIT_SOURCE],ruleId:'CA-2026-federal-BPA-v1',
    taxableIncome,netIncome,taxBeforeCredits:cents(taxBeforeCredits),basicPersonalAmount:cents(basicPersonalAmount),
    basicPersonalCredit:cents(basicPersonalCredit),incomeTax:cents(Math.max(0,taxBeforeCredits-basicPersonalCredit)),
    brackets:rows,warnings:['Federal tax only, after the basic personal credit. Excludes provincial tax, Quebec abatement, other credits, payroll and special cases. Not a salary calculator.']};
 }
 if(country==='AU'||country==='SG'){
   if(Object.keys(input).some(k=>!['country','taxYear','taxableIncome','residentEligible'].includes(k))||input.residentEligible!==true)throw new TypeError('Resident rate eligibility must be confirmed');
   const au=country==='AU';
   const bounds=au?[0,18200,45000,135000,190000,Infinity]:[0,20000,30000,40000,80000,120000,160000,200000,240000,280000,320000,500000,1000000,Infinity];
   const rates=au?[0,.15,.30,.37,.45]:[0,.02,.035,.07,.115,.15,.18,.19,.195,.20,.22,.23,.24];
   const brackets=rates.map((rate,i)=>{const taxed=Math.max(0,Math.min(taxableIncome,bounds[i+1])-bounds[i]);return {lower:bounds[i],upper:Number.isFinite(bounds[i+1])?bounds[i+1]:null,rate,taxed,tax:cents(taxed*rate)};});
   const raw=brackets.reduce((sum,b)=>sum+b.taxed*b.rate,0);
   const eligibleOffset=au?Math.max(0,taxableIncome<=37500?700:taxableIncome<=45000?700-.05*(taxableIncome-37500):325-.015*(taxableIncome-45000)):0;
   const lowIncomeOffset=Math.min(raw,eligibleOffset);
   return {...common,currency:au?'AUD':'SGD',taxYearLabel:au?'FY 2026–27 (1 July 2026 to 30 June 2027)':'YA 2026 (income earned in 2025)',taxableIncome,
    taxBeforeCredits:cents(raw),lowIncomeOffset:cents(lowIncomeOffset),incomeTax:cents(Math.max(0,raw-lowIncomeOffset)),brackets,
    sourceUrls:au?["https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents","https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset"]:["https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates"],
    ruleId:au?'AU-FY2026-27-resident-LITO-v1':'SG-YA2026-resident-gross-tax-v1',
    warnings:au?['Full-year resident with full tax-free threshold, ordinary taxable income and low-income tax offset only. Excludes Medicare levy and surcharge, other offsets, student debt, and special cases. Not take-home pay.']:['Resident chargeable income and gross income tax before rebates or credits only. YA 2026 covers 2025 income. Excludes CPF, relief eligibility, rebates, nonresident and special income. Not take-home pay.']};
 }
 throw new TypeError('Unsupported country');
}

// All tax arithmetic uses integer units of 1/10000 INR, then statutory rounding.
const INR_SCALE=10000n;
const inr=x=>Number(x)/10000;
const minBig=(a,b)=>a<b?a:b;
const maxBig=(a,b)=>a>b?a:b;
const roundTo=(x,unit)=>((x+unit/2n)/unit)*unit;
function indiaBands(regime,resident,ageGroup,params){
 const rule=params[regime];
 const bands=rule.bands.map(([limit,rate])=>[limit===null?null:BigInt(limit),BigInt(rate)]);
 if(regime==='new')return bands;
 const exempt=BigInt(resident&&Object.hasOwn(rule.exempt,ageGroup)?rule.exempt[ageGroup]:rule.exempt.default);
 return [[exempt,0n],...bands];
}
function indiaBase(income,bands){
 let lower=0n,tax=0n;const brackets=[];
 for(const [upper,rate] of bands){
   const taxed=maxBig(0n,(upper===null?income:minBig(income,upper))-lower);
   const value=taxed*rate*100n;
   tax+=value;
   if(upper===null||upper>lower)brackets.push({lower:Number(lower),upper:upper===null?null:Number(upper),rate:Number(rate)/100,taxed:Number(taxed),tax:inr(value)});
   if(upper!==null)lower=upper;
 }
 return {tax,brackets};
}
function indiaSurcharge(income,rule,bands,baseAfterRebate){
 const levels=rule.surcharge.map(([threshold,rate])=>[BigInt(threshold),BigInt(rate)]);
 let rate=0n,priorRate=0n,threshold=0n;
 for(const [limit,next] of levels)if(income>limit){priorRate=rate;rate=next;threshold=limit;}
 const nominal=baseAfterRebate*rate/100n;
 // At the active threshold use the preceding surcharge rate, before cess.
 const cap=threshold===0n?baseAfterRebate:indiaBase(threshold,bands).tax*(100n+priorRate)/100n+(income-threshold)*INR_SCALE;
 const relief=maxBig(0n,baseAfterRebate+nominal-cap);
 return {rate,nominal,relief,net:nominal-relief};
}
function indiaRegime(regime,gross,deductions,resident,ageGroup,params){
 const rule=params[regime],rounding=BigInt(params.roundingRupees);
 const standard=minBig(gross,BigInt(rule.standardDeduction));
 if(deductions>gross-standard)throw new RangeError('Other eligible deductions cannot exceed salary after standard deduction');
 const taxableUnrounded=gross-standard-deductions,taxable=roundTo(taxableUnrounded,rounding);
 const bands=indiaBands(regime,resident,ageGroup,params),{tax,brackets}=indiaBase(taxable,bands);
 let rebate=0n,rebateMarginalRelief=0n;
 if(resident){
  const threshold=BigInt(rule.rebateThreshold);
  if(taxable<=threshold)rebate=minBig(tax,BigInt(rule.rebateLimit)*INR_SCALE);
  else if(rule.rebateMarginalRelief)rebateMarginalRelief=maxBig(0n,tax-(taxable-threshold)*INR_SCALE);
 }
 const base=tax-rebate-rebateMarginalRelief;
 const surcharge=indiaSurcharge(taxable,rule,bands,base);
 const beforeCess=base+surcharge.net,cess=beforeCess*BigInt(params.cessPercent)/100n;
 const unroundedTax=beforeCess+cess,finalTax=roundTo(unroundedTax/INR_SCALE,rounding);
 return {regime,grossSalary:Number(gross),standardDeduction:Number(standard),otherEligibleDeductions:Number(deductions),taxableIncomeBeforeRounding:Number(taxableUnrounded),taxableIncome:Number(taxable),brackets,taxBeforeRebate:inr(tax),rebateApplied:inr(rebate),rebateMarginalRelief:inr(rebateMarginalRelief),taxAfterRebate:inr(base),surchargeRate:Number(surcharge.rate)/100,surchargeBeforeRelief:inr(surcharge.nominal),surchargeMarginalRelief:inr(surcharge.relief),surchargeApplied:inr(surcharge.net),cessAmount:inr(cess),taxBeforeFinalRounding:inr(unroundedTax),incomeTax:Number(finalTax),salaryAfterIncomeTax:Number(gross-finalTax)};
}
export function compareIndiaRegimes(input,registry){
 const keys=['country','taxYear','grossSalary','residentIndividual','ageGroup','ordinarySalaryOnly','oldEligibleDeductions','newEligibleDeductions'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(input,k))||input.country!=='IN'||typeof input.taxYear!=='string'||!/^\d{4}$/.test(input.taxYear)||input.ordinarySalaryOnly!==true||typeof input.residentIndividual!=='boolean'||!['under-60','60-79','80-plus'].includes(input.ageGroup))throw new TypeError('Unsupported India salary example');
 const whole=value=>{if(!Number.isSafeInteger(value)||value<0||value>MAX)throw new RangeError('Enter a non-negative whole rupee amount');return BigInt(value);};
 const gross=whole(input.grossSalary),oldDeductions=whole(input.oldEligibleDeductions),newDeductions=whole(input.newEligibleDeductions);
 const rule=resolveIndiaSalaryRule(input.taxYear,registry);
 const oldRegime=indiaRegime('old',gross,oldDeductions,input.residentIndividual,input.ageGroup,rule.parameters);
 const newRegime=indiaRegime('new',gross,newDeductions,input.residentIndividual,input.ageGroup,rule.parameters);
 return {country:'IN',taxYear:rule.taxYear,taxYearLabel:'FY '+rule.taxYear+'–'+String(Number(rule.taxYear)+1).slice(-2)+' (1 April '+rule.taxYear+' to 31 March '+(Number(rule.taxYear)+1)+')',currency:'INR',sampleOnly:true,taxRulesVerified:false,inputBasis:'ordinary-salary',ruleId:rule.version,sourceUrls:rule.sourceUrls,oldRegime,newRegime,lowerTaxRegime:oldRegime.incomeTax===newRegime.incomeTax?'equal':oldRegime.incomeTax<newRegime.incomeTax?'old':'new',taxDifference:Math.abs(oldRegime.incomeTax-newRegime.incomeTax),warnings:['Ordinary salary only. Additional deductions are user-confirmed eligible amounts, excluding the standard deduction; eligibility is not independently determined. Excludes capital gains, business income, agricultural income, foreign tax credits, arrears relief, other taxes and payroll. This comparison is an unverified example, not a filing recommendation.']};
}

// One qualifying investment disposal; no inferred legal eligibility or tax basis.
// Integer minor units and basis-point rates; round final component to cents.
const CG_SOURCES={"US":["https://www.irs.gov/irb/2025-45_IRB","https://www.irs.gov/taxtopics/tc409","https://www.irs.gov/publications/p550","https://www.irs.gov/publications/p505"],"GB":["https://www.gov.uk/capital-gains-tax/rates","https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances","https://www.gov.uk/capital-gains-tax/losses"],"IN":["https://wm.incometaxindia.gov.in/w/determination-of-tax-in-certain-special-cases","https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/section-198-76","https://wm.incometaxindia.gov.in/w/section-2-1"]};
const US_CG={
 single:{zero:49450,top:545500,bounds:[12400,50400,105700,201775,256225,640600]},
 mfj:{zero:98900,top:613700,bounds:[24800,100800,211400,403550,512450,768700]},
 mfs:{zero:49450,top:306850,bounds:[12400,50400,105700,201775,256225,384350]},
 hoh:{zero:66200,top:579600,bounds:[17700,67450,105700,201750,256200,640600]}
};
const CG_RATES=[1000,1200,2200,2400,3200,3500,3700];
function cgMoney(v){
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>MAX)throw new RangeError('Invalid amount');
 const scaled=v*100,rounded=Math.round(scaled);
 if(Math.abs(scaled-rounded)>0.00002)throw new RangeError('Use at most two decimal places');
 return BigInt(rounded);
}
const cgOut=v=>Number(v)/100;
const cgRound=v=>(v+5000n)/10000n;
function cgDate(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||v<'1900-01-01'||v>'2099-12-31')throw new TypeError('Invalid date');
 const d=new Date(v+'T00:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw new TypeError('Invalid calendar date');
 return v;
}
function cgSlices(start,gain,bounds,rates){
 let lower=0n,total=0n;const rows=[];
 const end=start+gain;
 for(let i=0;i<rates.length;i++){
  const upper=i<bounds.length?BigInt(bounds[i])*100n:null;
  const used=maxBig(0n,(upper===null?end:minBig(end,upper))-maxBig(start,lower));
  const raw=used*BigInt(rates[i]);total+=raw;
  if(used>0n)rows.push({rate:rates[i]/10000,taxableGain:cgOut(used),tax:cgOut(cgRound(raw))});
  if(upper!==null)lower=upper;
 }
 return {total,rows};
}
export function calculateCapitalGain(input){
 const common=['country','taxYear','acquired','disposed','saleProceeds','adjustedBasis','eligibleLosses','otherTaxableIncome','scopeConfirmed'];
 if(!input||typeof input!=='object'||Array.isArray(input)||!['IN','US','GB'].includes(input.country)||input.taxYear!=='2026'||input.scopeConfirmed!==true)throw new TypeError('Unsupported investment example');
 const country=input.country,required=[...common,...(country==='US'?['filingStatus']:country==='IN'?['assetType']:[])];
 const keys=[...required,...(country==='IN'?[]:['assetType'])];
 if(Object.keys(input).some(k=>!keys.includes(k))||required.some(k=>!Object.hasOwn(input,k)))throw new TypeError('Unsupported fields');
 const assetType=Object.hasOwn(input,'assetType')?input.assetType:'listed-equity';
 const allowed=country==='IN'?['listed-equity','equity-fund','property','crypto']:country==='US'?['listed-equity','investment-land','crypto']:['listed-equity','property','crypto'];
 if(!allowed.includes(assetType))throw new TypeError('Unsupported asset type');
 const cryptoIndia=country==='IN'&&assetType==='crypto';
 const propertyIndia=country==='IN'&&assetType==='property';
 const acquired=cgDate(input.acquired),disposed=cgDate(input.disposed);
 const period=country==='US'?['2026-01-01','2026-12-31']:country==='IN'?['2026-04-01','2027-03-31']:['2026-04-06','2027-04-05'];
 if(acquired>disposed||disposed<period[0]||disposed>period[1])throw new RangeError('Disposal must be in the selected tax year and on or after acquisition');
 // Leap-day anniversary rules are excluded until jurisdiction-specific evidence is reviewed.
 if(country!=='GB'&&!cryptoIndia&&acquired.slice(5)==='02-29')throw new RangeError('Leap-day acquisition not supported');
 const holdingYears=propertyIndia?2:1;
 const anniversary=(Number(acquired.slice(0,4))+holdingYears)+acquired.slice(4);
 const holding=country==='GB'||cryptoIndia?'not-rate-determining':disposed>anniversary?'long-term':'short-term';
 const proceeds=cgMoney(input.saleProceeds),basis=cgMoney(input.adjustedBasis),loss=cgMoney(input.eligibleLosses),other=cgMoney(input.otherTaxableIncome);
 const realized=proceeds-basis,positive=maxBig(0n,realized);
 if(loss>positive)throw new RangeError('Eligible loss offset cannot exceed positive gain');
 if(cryptoIndia&&loss!==0n)throw new RangeError('Indian virtual digital asset losses cannot be offset');
 const net=positive-loss;
 let allowance=0n,raw=0n,rows=[],cess=0n,warnings=[];
 const sourceUrls=[...CG_SOURCES[country]];
 if(country==='US'){
  if(!Object.hasOwn(US_CG,input.filingStatus))throw new TypeError('Unsupported filing status');
  const p=US_CG[input.filingStatus];
  const ordinary=cgSlices(other,net,p.bounds,CG_RATES);
  const preferential=holding==='long-term'?cgSlices(other,net,[p.zero,p.top],[0,1500,2000]):ordinary;
  // IRS Publication 505 worksheet 2-7: compare preferential and ordinary regular tax.
  // The same ordinary-income base cancels when comparing incremental tax.
  const s=preferential.total<=ordinary.total?preferential:ordinary;
  raw=s.total;rows=s.rows;
  warnings=['Lower of ordinary and preferential regular federal rate schedules, not total tax or Form 1040 tax-table rounding. No NIIT, AMT, state tax, qualified dividends, other gains, unused deductions, wash sales, special asset rates or carryovers.'];
  if(assetType==='investment-land'){sourceUrls.push('https://www.irs.gov/taxtopics/tc704');warnings.push('Vacant land held solely for investment, no depreciable improvements, business use, installment sale, like-kind exchange or home-sale exclusion.');}
  if(assetType==='crypto'){sourceUrls.push('https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-digital-asset-transactions');warnings.push('One directly purchased lot of ordinary investment tokens sold for cash; excludes NFTs, derivatives, staking, mining, gifts and basis selection across lots.');}
 }else if(country==='GB'){
  allowance=minBig(net,300000n);
  const s=cgSlices(other,net-allowance,[37700],[1800,2400]);raw=s.total;rows=s.rows;
  warnings=['UK-resident individual, full annual exempt amount and standard basic rate band. Excludes business reliefs, pension/Gift Aid band extensions, FIG claims and other gains or carryovers. Holding length does not select the rate.'];
  if(assetType==='property'){sourceUrls.push('https://www.gov.uk/tax-sell-property/work-out-your-gain');warnings.push('UK investment residential property never used as your home; no private residence relief, business relief, connected-party sale or special valuation. Most taxable UK residential property sales must be reported and paid within 60 days of completion.');}
  else if(assetType==='crypto'){sourceUrls.push('https://www.gov.uk/guidance/check-if-you-need-to-pay-tax-when-you-sell-cryptoassets','https://www.gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto22200');warnings.push('Ordinary purchased tokens sold for cash, correct allowable pooled or matched cost supplied by user; same-day and 30-day matching are not calculated. No NFTs, staking, mining, lending or liquidity pools.');}
  else warnings.push('Ordinary shares; correct allowable share cost supplied by user. Special share matching is not calculated.');
 }else{
  // Exclude rebate, unused basic exemption and surcharge interactions.
  if(other<130000000n||other+net>500000000n)throw new RangeError('India requires other taxable ordinary income of INR 13 lakh or more and combined net taxable income at most INR 50 lakh');
  const scope='Resident individual using new regime, no other gains or special income. Other taxable ordinary income at least INR 13 lakh and combined net taxable income at most INR 50 lakh. Includes 4% cess; excludes surcharge, return-level rounding, withholding credits and other taxes.';
  if(cryptoIndia){
   sourceUrls.push('https://wm.incometaxindia.gov.in/w/section-194-78');
   raw=positive*3000n;rows=positive>0n?[{rate:.30,taxableGain:cgOut(positive),tax:cgOut(cgRound(raw))}]:[];
   warnings=[scope,'Ordinary purchased virtual digital asset sold for cash. Gross consideration before fees or withholding; actual acquisition cost only. No deduction for selling costs, no loss offset, no loss carryforward, and no TDS credit calculation.'];
  }else if(propertyIndia){
   if(acquired<'2024-07-23')throw new RangeError('Pre-23-July-2024 property requires grandfathering and indexation review');
   sourceUrls.push('https://www.incometaxindia.gov.in/w/capital-gain');
   const slice=holding==='long-term'?cgSlices(0n,net,[],[1250]):cgSlices(other,net,[400000,800000,1200000,1600000,2000000,2400000],[0,500,1000,1500,2000,2500,3000]);
   raw=slice.total;rows=slice.rows;
   warnings=[scope,'Indian investment land or building acquired on or after 23 July 2024; more than 24 months is long-term. No reinvestment relief, depreciation, agricultural land, deemed stamp-duty valuation or pre-2024 indexation comparison. User confirms tax consideration and allowable basis are correct.'];
  }else{
   if(acquired<'2018-02-01')throw new RangeError('Only qualifying post-January 2018 equity investments supported');
   allowance=holding==='long-term'?minBig(net,12500000n):0n;
   const rate=holding==='long-term'?1250:2000;
   raw=(net-allowance)*BigInt(rate);rows=net>allowance?[{rate:rate/10000,taxableGain:cgOut(net-allowance),tax:cgOut(cgRound(raw))}]:[];
   warnings=[scope,'Qualifying STT conditions confirmed; full annual equity gain threshold available.'];
  }
  cess=cgRound(raw*4n/100n);
 }
 const base=cgRound(raw),total=cgRound(raw+(country==='IN'?raw*4n/100n:0n));
 if(realized<0n)warnings.push('This disposal has a loss. No tax benefit, refund or carryforward is calculated.');
 return {country,taxYear:'2026',taxYearLabel:period.join(' to '),currency:country==='US'?'USD':country==='GB'?'GBP':'INR',sampleOnly:true,taxRulesVerified:false,ruleId:country+'-2026-investment-disposal-v2',assetType,acquired,disposed,holding,holdingYears:holding==='not-rate-determining'?null:holdingYears,realizedGain:cgOut(realized),eligibleLossesApplied:cgOut(loss),netPositiveGain:cgOut(net),allowanceApplied:cgOut(allowance),taxableGain:cgOut(net-allowance),otherTaxableIncome:cgOut(other),brackets:rows,taxBeforeCess:cgOut(base),cessAmount:cgOut(cess),estimatedGainTax:cgOut(total),sourceUrls,warnings};
}


// Regional tax components. Canada and US inputs are jurisdiction-specific taxable income,
// not federal taxable income or gross salary. UK takes ordinary salary only.
const regionalMetadata=r=>{const [country,region]=r.jurisdiction.split('-');return {country,region,name:r.name,currency:r.currency,inputBasis:country==='US'?(region==='TX'?'employee-wages':'state-taxable-income'):country==='CA'?'provincial-taxable-income':'ordinary-salary',resultBasis:country==='US'?'state-tax-before-credits':country==='CA'?'basic-provincial-tax-before-adjustments':'regional-uk-income-tax'};};
export function regionalTaxCatalog(){return regionalRules().filter(r=>r.taxYear==='2026').map(regionalMetadata);}
export function calculateRegionalTax(input,registry){
 const keys=['country','region','taxYear','income','scopeConfirmed'];
 if(!input||typeof input!=='object'||Array.isArray(input)||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k))||typeof input.taxYear!=='string'||!/^\d{4}$/.test(input.taxYear)||input.scopeConfirmed!==true)throw new TypeError('Unsupported regional example');
 const rule=resolveRegionalRule(input,registry);
 const config=regionalMetadata(rule);
 const gross=cgMoney(input.income);
 if(config.country==='US'&&config.region==='TX'&&rule.rates.some(n=>n!==0))throw RangeError('Texas taxable-income scope must be reviewed before changing zero tax');
 let taxable=gross,personalAllowance=0n,warnings;
 const {bounds,rates,sourceUrls:sources}=rule;
 if(config.country==='US'){
  warnings=[config.region==='TX'?'Texas does not levy state personal income tax. This is not a zero total tax or take-home estimate.':'State tax on caller-provided state taxable income only, before credits and tax forgiveness. Do not substitute federal taxable income or gross wages.', 'Excludes federal income tax, payroll, local taxes, other states and other obligations.'];
 }else if(config.country==='CA'){
  warnings=['Basic provincial or territorial tax before personal credits, surtaxes, tax reductions, health premiums and other adjustments. Not the final amount payable. Excludes federal tax, CPP/QPP and EI. Confirm jurisdiction of residence on December 31 and correct taxable income. Quebec is not supported.'];
 }else{
  // Salary is the only income and adjusted net income equals gross salary.
  // Round the allowance reduction down to whole pounds (input accepts whole pounds only).
  if(gross%100n!==0n)throw new RangeError('UK salary must be whole pounds');
  const reduction=maxBig(0n,(gross/100n-BigInt(rule.allowance.taperStart))/BigInt(rule.allowance.taperDivisor))*100n;
  personalAllowance=minBig(gross,maxBig(0n,BigInt(rule.allowance.base)*100n-reduction));
  taxable=gross-personalAllowance;
  warnings=['Ordinary annual salary only; assumes eligibility for standard personal allowance and no other income or adjustments to adjusted net income. No savings, dividends, pension contributions, benefits, reliefs, National Insurance or student loans. Scottish rates replace the rest-of-UK income tax rates; do not add both.'];
 }
 const result=cgSlices(0n,taxable,bounds,rates);
 return {...config,taxYear:rule.taxYear,taxYearLabel:config.country==='GB'?'6 April '+rule.taxYear+' to 5 April '+(Number(rule.taxYear)+1):'Calendar year '+rule.taxYear,sampleOnly:true,taxRulesVerified:false,ruleId:rule.version,inputIncome:cgOut(gross),taxableIncome:cgOut(taxable),personalAllowanceApplied:config.country==='GB'?cgOut(personalAllowance):null,brackets:result.rows,regionalTax:cgOut(cgRound(result.total)),sourceUrls:sources,warnings};
}


// Scoped annual salary remainder: ordinary employee wages, no other deductions.
// UK category A uses actual monthly pay-period thresholds, not annual NI thresholds.
const PAY_SOURCES={"US":["https://www.irs.gov/irb/2025-45_IRB","https://www.irs.gov/instructions/i941","https://www.irs.gov/taxtopics/tc560","https://www.texas.gov/business-taxes/taxes"],"GB":["https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027","https://www.gov.uk/income-tax-rates"]};
export function calculateSalaryRemainder(input){
 if(input&&['DE','AE'].includes(input.country))return germanEmiratiSalaryRemainder(input);
 if(input&&['CA','AU','IN','SG'].includes(input.country))return extendedSalaryRemainder(input);
 const keys=['country','region','taxYear','pay','scopeConfirmed'];
 if(!input||typeof input!=='object'||Array.isArray(input)||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k))||input.taxYear!=='2026'||input.scopeConfirmed!==true)throw new TypeError('Unsupported salary example');
 const pay=cgMoney(input.pay);
 let gross,incomeTax,contributions,currency,period,warnings,payFrequency;
 if(input.country==='US'&&input.region==='TX'){
  // Single, under 65, nondependent, nonblind, ordinary wages only.
  // Restrict to this range until AMT and credit eligibility are modeled.
  if(pay>25000000n)throw new RangeError('US examples limited to USD 250,000 annual wages');
  gross=pay;currency='USD';period='Calendar year 2026';payFrequency='annual';
  const taxable=maxBig(0n,gross-1610000n);
  incomeTax=cgRound(cgSlices(0n,taxable,US_CG.single.bounds,CG_RATES).total);
  contributions=[
   {name:'Social Security',amount:cgOut(cgRound(minBig(gross,18450000n)*620n))},
   {name:'Medicare',amount:cgOut(cgRound(gross*145n))},
   {name:'Additional Medicare',amount:cgOut(cgRound(maxBig(0n,gross-20000000n)*90n))}
  ];
  warnings=['Texas-only full-year resident employee, single filer, under 65, nonblind and not a dependent; one job, wages only, standard deduction, no credits or other deductions. All pay subject to Social Security and Medicare. Regular federal rate schedule estimate, not tax-table or paycheck withholding. Texas state personal income tax is zero. Excludes AMT, federal credits, health insurance, retirement and all other deductions.'];
 }else if(input.country==='GB'&&['SCT','RUK'].includes(input.region)){
  if(pay%100n!==0n||pay>10000000n)throw new RangeError('UK examples require whole pounds of monthly pay up to GBP 100,000');
  gross=pay*12n;currency='GBP';period='6 April 2026 to 5 April 2027';payFrequency='monthly';
  const regional=calculateRegionalTax({country:'GB',region:input.region,taxYear:'2026',income:cgOut(gross),scopeConfirmed:true});
  incomeTax=cgMoney(regional.regionalTax);
  const monthlyNI=cgRound(maxBig(0n,minBig(pay,418900n)-104800n)*800n+maxBig(0n,pay-418900n)*200n);
  contributions=[{name:'Employee National Insurance (category A)',amount:cgOut(monthlyNI*12n)}];
  warnings=['Twelve identical monthly pay periods, ordinary employee category A, not a director, standard personal allowance eligibility, correct UK taxpayer region, no other income or adjustments. Annual income tax estimate plus monthly employee NI. Excludes pensions, student loans, benefits, other deductions and PAYE timing differences.'];
 }else throw new TypeError('Unsupported salary region');
 const employeeContributions=contributions.reduce((sum,c)=>sum+cgMoney(c.amount),0n);
 const total=incomeTax+employeeContributions,remaining=gross-total;
 return {country:input.country,region:input.region,taxYear:'2026',taxYearLabel:period,currency,payFrequency,inputPay:cgOut(pay),annualGross:cgOut(gross),incomeTax:cgOut(incomeTax),employeeContributions:cgOut(employeeContributions),contributions,totalModeledDeductions:cgOut(total),annualRemainder:cgOut(remaining),averageMonthlyRemainder:cgOut((remaining+6n)/12n),sampleOnly:true,taxRulesVerified:false,ruleId:input.country+'-'+input.region+'-2026-salary-remainder-v1',sourceUrls:PAY_SOURCES[input.country],warnings:[...warnings,'Money left after the modeled taxes and contributions only; not an actual payslip or complete take-home pay.']};
}


// Contribution components only. Eligibility and wage bases are explicit caller assertions.
const CONTRIBUTION_SOURCES={"CA":["https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums.html","https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032oc-jan/t4032oc-january-general-information.html","https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html"],"AU":["https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/tax-time/before-you-lodge/medicare-levy"],"IN":["https://unifiedportal-emp.epfindia.gov.in/epfo/"],"SG":["https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay","https://www.cpf.gov.sg/service/article/what-is-the-ordinary-wage-ow-ceiling"]};
const CPF_RATES=Object.freeze({'55-or-under':[2000,3700],'56-60':[1800,3400],'61-65':[1250,2500],'66-70':[750,1650],'over-70':[500,1250]});
export function calculateEmployeeContributions(input){
 const required=['country','taxYear','income','scopeConfirmed'];
 if(!input||typeof input!=='object'||Array.isArray(input)||required.some(k=>!Object.hasOwn(input,k))||input.taxYear!=='2026'||input.scopeConfirmed!==true||!Object.hasOwn(CONTRIBUTION_SOURCES,input.country))throw new TypeError('Unsupported contribution example');
 const country=input.country,keys=[...required,...(country==='SG'?['ageBand']:[])];
 if(Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(input,k)))throw new TypeError('Unsupported fields');
 const income=cgMoney(input.income);
 let currency,period,frequency,basis,components,warnings,employerContribution=null,subjectIncome=null;
 const component=(name,amount)=>({name,amount:cgOut(amount)});
 if(country==='CA'){
  currency='CAD';period='Calendar year 2026';frequency='annual';basis='pensionable-and-insurable-earnings';
  const cpp=cgRound(maxBig(0n,minBig(income,7460000n)-350000n)*595n);
  const cpp2=cgRound(maxBig(0n,minBig(income,8500000n)-7460000n)*400n);
  const ei=cgRound(minBig(income,6890000n)*163n);
  components=[component('CPP',cpp),component('CPP2',cpp2),component('Employment Insurance',ei)];
  warnings=['Full-year ordinary employee outside Quebec, age 18–64 throughout the year, one employer, all earnings both pensionable and insurable, full basic exemption. Annual estimate; actual pay-period rounding and payroll deductions may differ. Excludes income tax and QPP/QPIP.'];
 }else if(country==='AU'){
  currency='AUD';period='FY 2026–27 (1 July 2026 to 30 June 2027)';frequency='annual';basis='taxable-income';
  // Do not infer eligibility for the full levy. No future threshold extrapolation.
  if(income<10000000n)throw new RangeError('Full-rate example requires taxable income of at least AUD 100,000');
  components=[component('Medicare levy (full 2% rate)',cgRound(income*200n))];
  warnings=['Full-year Australian resident with confirmed full-rate 2% Medicare levy liability, no exemption or reduction. This is an income-tax assessment component, not a separate payroll withholding calculation. Excludes Medicare levy surcharge, income tax, superannuation and other obligations.'];
 }else if(country==='IN'){
  currency='INR';period='Illustrative 2026 monthly contribution';frequency='monthly';basis='confirmed-epf-contribution-wage';
  if(income%100n!==0n||income>1500000n)throw new RangeError('Enter the confirmed whole-rupee EPF contribution wage, up to INR 15,000');
  components=[component('Employee EPF (12% example)',((income*12n+5000n)/10000n)*100n)];
  subjectIncome=cgOut(income);
  warnings=['Only employees with a confirmed applicable 12% EPF rate and an actual EPF contribution wage no greater than INR 15,000. Enter that wage, not gross pay; the engine does not determine the legal wage base, membership, wage ceiling eligibility or current labour-code treatment. No voluntary/higher-wage contributions, employer allocation, ESI, professional tax or income tax.'];
 }else{
  currency='SGD';period='Calendar year 2026';frequency='monthly';basis='ordinary-monthly-wages';
  if(!Object.hasOwn(CPF_RATES,input.ageBand)||income<=75000n)throw new RangeError('Only full-rate age bands and monthly wages above SGD 750 are supported');
  const [employeeRate,totalRate]=CPF_RATES[input.ageBand],wage=minBig(income,800000n);
  // Employee contribution floor to whole dollars; total nearest dollar; employer residual.
  const employee=wage*BigInt(employeeRate)/1000000n*100n;
  const total=(wage*BigInt(totalRate)+500000n)/1000000n*100n;
  components=[component('Employee CPF',employee)];employerContribution=cgOut(total-employee);subjectIncome=cgOut(wage);
  warnings=['Singapore citizen or third-year-or-later permanent resident on full rates; ordinary monthly wages above SGD 750 only, no additional wages, one employer. Select the applicable contribution age band for the month; rate changes apply from the month after the relevant birthday. No first/second-year PR graduated rates, annual additional-wage ceiling calculation or income tax.'];
 }
 return {country,taxYear:'2026',taxYearLabel:period,currency,frequency,inputBasis:basis,inputIncome:cgOut(income),contributionWage:subjectIncome,components,totalEmployeeContribution:cgOut(components.reduce((sum,c)=>sum+cgMoney(c.amount),0n)),employerContribution,sampleOnly:true,taxRulesVerified:false,ruleId:country+'-2026-contributions-v1',sourceUrls:[...CONTRIBUTION_SOURCES[country]],warnings:[...warnings,'Contribution component only, not a complete take-home estimate.']};
}


// Salary integration with explicit jurisdiction and eligibility contracts.
// No mixing of assessment years, or automatic inference of missing wage bases.
const EXTENDED_PAY_SOURCES={"CA":["https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032ab-jan/t4032ab-january-general-information.html","https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/payroll-deductions-t4127-payroll-deductions-formulas/t4127-jan-122nd-edition-effective-january-1-2026/t4127-jan-payroll-deductions-formulas-computer-programs.html","https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-enhancement.html"],"AU":["https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents","https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/what-is-the-medicare-levy","https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates"],"IN":["https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/objective-and-scope-new-act","https://www.incometax.gov.in/iec/foportal/help/new-tax-vs-old-tax-regime-faqs"],"SG":["https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates","https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/earned-income-relief","https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/central-provident-fund%28cpf%29-relief-for-employees"]};
function extendedSalaryRemainder(input){
 const required=['country','region','taxYear','pay','scopeConfirmed',...(input.country==='IN'?['epfMonthlyWage','professionalTaxAnnual']:[])];
 if(typeof input!=='object'||Array.isArray(input)||required.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!required.includes(k))||input.taxYear!=='2026'||input.scopeConfirmed!==true)throw new TypeError('Unsupported salary example');
 const country=input.country,pay=cgMoney(input.pay);
 if(pay%100n!==0n)throw new RangeError('Whole currency units required');
 let gross=pay,tax=0n,taxable=pay,contributions=[],incomeTaxComponents=[],taxAdjustments=[],currency,period,payFrequency='annual',warnings;
 const item=(name,amount)=>({name,amount:cgOut(amount)});
 const annualContrib=(income)=>calculateEmployeeContributions({country,taxYear:'2026',income:cgOut(income),scopeConfirmed:true});
 if(country==='CA'&&input.region==='AB'){
  if(pay<6000000n||pay>15000000n)throw new RangeError('Alberta example supports CAD 60,000–150,000 annual wages');
  currency='CAD';period='Calendar year 2026';
  const c=annualContrib(gross);
  contributions=c.components;
  const pensionable=maxBig(0n,minBig(gross,7460000n)-350000n);
  const enhanced=cgRound(pensionable*100n)+cgMoney(c.components[1].amount);
  const baseCPP=cgMoney(c.components[0].amount)-cgRound(pensionable*100n),ei=cgMoney(c.components[2].amount);
  taxable=gross-enhanced;
  const federal=assessTaxableIncome({country:'CA',taxYear:'2026',taxableIncome:cgOut(taxable),netIncome:cgOut(taxable),fullYearResident:true});
  const federalExtraCredit=cgRound((baseCPP+ei+minBig(gross,150100n))*1400n);
  const federalTax=maxBig(0n,cgMoney(federal.incomeTax)-federalExtraCredit);
  const provincial=calculateRegionalTax({country:'CA',region:'AB',taxYear:'2026',income:cgOut(taxable),scopeConfirmed:true});
  const provincialCredit=cgRound((2276900n+baseCPP+ei)*800n);
  const albertaTax=maxBig(0n,cgMoney(provincial.regionalTax)-provincialCredit);
  incomeTaxComponents=[item('Federal income tax',federalTax),item('Alberta income tax',albertaTax)];
  tax=federalTax+albertaTax;
  taxAdjustments=[item('Enhanced CPP and CPP2 deduction',enhanced),item('Federal basic personal credit',cgMoney(federal.basicPersonalCredit)),item('Federal CPP, EI and employment credits',federalExtraCredit),item('Alberta personal, CPP and EI credits',provincialCredit)];
  warnings=['Full-year Alberta resident, age 18–64, one ordinary employee job, all wages pensionable and insurable. No other income, deductions, dependents, credits, benefits or special adjustments. Annual estimates; actual pay-period rounding and tax-return rounding can differ.'];
 }else if(country==='AU'&&input.region==='AU'){
  if(pay<10000000n||pay>100000000n)throw new RangeError('Australia example supports AUD 100,000–1,000,000 annual salary');
  currency='AUD';period='FY 2026–27 (1 July 2026 to 30 June 2027)';
  const r=assessTaxableIncome({country:'AU',taxYear:'2026',taxableIncome:cgOut(gross),residentEligible:true});
  tax=cgMoney(r.incomeTax);incomeTaxComponents=[item('Resident income tax',tax)];
  contributions=annualContrib(gross).components;
  warnings=['Full-year Australian resident, ordinary salary equals taxable income and excludes employer superannuation. Full 2% Medicare levy applies; no Medicare levy surcharge liability, HELP/student debt, other income, deductions, tax offsets or salary sacrifice. Medicare levy is an assessment component, not separate paycheck withholding.'];
 }else if(country==='IN'&&input.region==='IN'){
  currency='INR';period='FY 2026–27 (1 April 2026 to 31 March 2027)';
  const epfWage=cgMoney(input.epfMonthlyWage),professionalTax=cgMoney(input.professionalTaxAnnual);
  if(epfWage%100n!==0n||professionalTax%100n!==0n||professionalTax>250000n||epfWage*12n>gross)throw new RangeError('Invalid confirmed contribution wage or professional tax');
  const epf=calculateEmployeeContributions({country:'IN',taxYear:'2026',income:cgOut(epfWage),scopeConfirmed:true});
  const annualEPF=cgMoney(epf.totalEmployeeContribution)*12n;
  const r=compareIndiaRegimes({country:'IN',taxYear:'2026',grossSalary:cgOut(gross),residentIndividual:true,ageGroup:'under-60',ordinarySalaryOnly:true,oldEligibleDeductions:0,newEligibleDeductions:0}).newRegime;
  tax=cgMoney(r.incomeTax);taxable=cgMoney(r.taxableIncome);
  incomeTaxComponents=[item('New-regime income tax including cess',tax)];
  contributions=[item('Employee EPF (confirmed 12% contribution wage)',annualEPF),item('Professional tax (user-confirmed annual amount)',professionalTax)];
  taxAdjustments=[item('Standard deduction',cgMoney(r.standardDeduction))];
  warnings=['Resident under age 60, ordinary cash salary only, new regime, no other income, exemptions or deductions. Twelve equal confirmed EPF contribution wages at 12%; zero EPF wage only if not liable. Professional tax amount is supplied by user, not calculated by state. Neither employee EPF nor professional tax is deducted from taxable income in this new-regime example. Excludes ESI, other deductions and independent determination of EPF liability.'];
 }else if(country==='SG'&&input.region==='SG'){
  if(pay<=75000n||pay>10000000n)throw new RangeError('Singapore example supports SGD 751–100,000 whole-dollar monthly wages');
  currency='SGD';period='Income earned in calendar year 2026; YA 2027';payFrequency='monthly';gross=pay*12n;
  const r=calculateEmployeeContributions({country:'SG',taxYear:'2026',income:cgOut(pay),ageBand:'55-or-under',scopeConfirmed:true});
  const cpf=cgMoney(r.totalEmployeeContribution)*12n;
  const earned=minBig(gross,100000n);
  taxable=maxBig(0n,gross-cpf-earned);
  // IRAS resident schedule YA 2024 onward; no speculative YA 2027 rebate.
  const t=cgSlices(0n,taxable,[20000,30000,40000,80000,120000,160000,200000,240000,280000,320000,500000,1000000],[0,200,350,700,1150,1500,1800,1900,1950,2000,2200,2300,2400]);
  tax=cgRound(t.total);incomeTaxComponents=[item('Resident income tax before rebates',tax)];
  contributions=[item('Employee CPF',cpf)];
  taxAdjustments=[item('Compulsory employee CPF relief',cpf),item('Earned income relief',earned)];
  warnings=['Full-year Singapore tax resident, citizen or third-year-or-later PR on full CPF rates, below 55 throughout 2026, twelve equal ordinary monthly wages, no bonus or other income. Ordinary earned-income relief and compulsory CPF relief only. YA 2027 estimate before any personal tax rebates or later changes; excludes self-help group contributions and other deductions.'];
 }else throw new TypeError('Unsupported salary region');
 const employeeContributions=contributions.reduce((sum,c)=>sum+cgMoney(c.amount),0n),total=tax+employeeContributions,remaining=gross-total;
 if(remaining<0n)throw new RangeError('Modeled deductions exceed wages');
 return {country,region:input.region,taxYear:'2026',taxYearLabel:period,currency,payFrequency,inputPay:cgOut(pay),annualGross:cgOut(gross),taxableIncome:cgOut(taxable),incomeTax:cgOut(tax),incomeTaxComponents,taxAdjustments,employeeContributions:cgOut(employeeContributions),contributions,totalModeledDeductions:cgOut(total),annualRemainder:cgOut(remaining),averageMonthlyRemainder:cgOut((remaining+6n)/12n),sampleOnly:true,taxRulesVerified:false,ruleId:country+'-'+input.region+'-2026-salary-remainder-v1',sourceUrls:[...new Set([...EXTENDED_PAY_SOURCES[country],...CONTRIBUTION_SOURCES[country]])],warnings:[...warnings,'Money left after modeled taxes and contributions only; not an actual payslip or complete take-home pay.']};
}


// Deliberately scoped annual assessment plus monthly contributions, not payroll withholding.
const DE_AE_PAY_SOURCES={"DE":["https://www.gesetze-im-internet.de/estg/__32a.html","https://www.gesetze-im-internet.de/solzg_1995/__3.html","https://www.gesetze-im-internet.de/solzg_1995/__4.html","https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/sozialversicherungs-rechengroessenverordnung-2026.html","https://www.bundesgesundheitsministerium.de/beitraege","https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/die-pflegeversicherung/finanzierung","https://www.deutsche-rentenversicherung.de/KnappschaftBahnSee/DE/Aktuelles/Meldungen/2026/2026_01_02_Sozialversicherungsrechengroessen2026.html"],"AE":["https://u.ae/en/information-and-services/finance-and-investment/taxation","https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-working-in-the-uae/pension-schemes-for-expatriate-workers","https://u.ae/en/information-and-services/jobs/insurance/unemployment-insurance-scheme","https://iloe.ae/default.aspx","https://tax.gov.ae/en/faq.aspx?keyword=What+is+the+standard+rate+of+VAT+in+the+UAE%3F"]};
function germanEmiratiSalaryRemainder(input){
 const keys=['country','region','taxYear','pay','scopeConfirmed',...(input.country==='DE'?['annualTaxableIncome','healthSupplementRate']:['monthlyBasicSalary'])];
 if(!input||typeof input!=='object'||Array.isArray(input)||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k))||input.taxYear!=='2026'||input.scopeConfirmed!==true||input.region!==input.country)throw new TypeError('Unsupported salary example');
 const pay=cgMoney(input.pay),gross=pay*12n;
 let tax,taxable,currency,contributions,incomeTaxComponents,warnings;
 const item=(name,amount)=>({name,amount:cgOut(amount)});
 if(input.country==='DE'){
  if(pay<250000n||pay>645000n)throw new RangeError('Monthly gross must be EUR 2,500–6,450');
  taxable=cgMoney(input.annualTaxableIncome);
  if(taxable>gross||taxable%100n!==0n)throw new RangeError('Supply whole-euro annual assessed taxable income no greater than annual gross');
  const supplement=cgMoney(input.healthSupplementRate);
  if(supplement>1000n)throw new RangeError('Supply insurer supplemental percentage from 0 to 10');
  currency='EUR';
  const incomeTax=cgMoney(assessTaxableIncome({country:'DE',taxYear:'2026',taxableIncome:cgOut(taxable),assessment:'individual'}).incomeTax);
  const solidarity=minBig(incomeTax*550n/10000n,maxBig(0n,incomeTax-2035000n)*1190n/10000n);
  tax=incomeTax+solidarity;
  incomeTaxComponents=[item('Ordinary income tax',incomeTax),item('Solidarity surcharge',solidarity)];
  const pensionBase=minBig(pay,845000n),healthBase=minBig(pay,581250n);
  const pension=cgRound(pensionBase*930n),unemployment=cgRound(pensionBase*130n);
  // Total insurer rate (14.6% plus supplemental rate), employee pays half.
  const health=(healthBase*(1460n+supplement)+10000n)/20000n;
  const care=cgRound(healthBase*240n);
  contributions=[item('Employee pension insurance',pension*12n),item('Employee unemployment insurance',unemployment*12n),item('Statutory health insurance',health*12n),item('Long-term care insurance (childless)',care*12n)];
  warnings=['Full-year German resident, individual assessment, no children, age 23–64, outside Saxony, no church tax. One ordinary job, twelve equal monthly cash wages, fully subject to statutory general-rate health, pension, unemployment and care insurance. Enter actual insurer supplemental rate unchanged for all months and assessed taxable income after eligible deductions; the engine does not derive taxable income from salary. Excludes special income, credits, midyear changes, other obligations and payroll withholding rounding.'];
 }else if(input.country==='AE'){
  if(pay<10000n||pay>100000000n)throw new RangeError('Monthly salary must be AED 100–1,000,000');
  const basic=cgMoney(input.monthlyBasicSalary);
  if(basic<=0n||basic>pay)throw new RangeError('Basic salary must be positive and no greater than monthly gross');
  currency='AED';tax=0n;taxable=null;
  incomeTaxComponents=[item('UAE personal income tax on wages',0n)];
  const monthlyPremium=basic<=1600000n?525n:1050n;
  contributions=[item('Standard ILOE job-loss insurance premium including VAT',monthlyPremium*12n)];
  warnings=['Full-year non-GCC expatriate private-sector employee, ordinary cash wages only, not subject to UAE or GCC pension contributions, eligible for and paying the standard ILOE insurance subscription with 5% VAT. Twelve equal salary months and unchanged basic salary. Excludes foreign tax obligations, visa and other costs, insurance transaction fees, optional plans, other employee deductions and end-of-service benefits. ILOE is an out-of-pocket premium, not necessarily payroll withholding.'];
 }else throw new TypeError('Unsupported country');
 const employeeContributions=contributions.reduce((sum,c)=>sum+cgMoney(c.amount),0n),total=tax+employeeContributions,remaining=gross-total;
 if(remaining<0n)throw new RangeError('Modeled deductions exceed wages');
 return {country:input.country,region:input.region,taxYear:'2026',taxYearLabel:'Calendar year 2026',currency,payFrequency:'monthly',inputPay:cgOut(pay),annualGross:cgOut(gross),...(taxable===null?{}:{taxableIncome:cgOut(taxable)}),incomeTax:cgOut(tax),incomeTaxComponents,taxAdjustments:[],employeeContributions:cgOut(employeeContributions),contributions,totalModeledDeductions:cgOut(total),annualRemainder:cgOut(remaining),averageMonthlyRemainder:cgOut((remaining+6n)/12n),sampleOnly:true,taxRulesVerified:false,ruleId:input.country+'-2026-scoped-salary-remainder-v1',sourceUrls:[...DE_AE_PAY_SOURCES[input.country]],warnings:[...warnings,'Money left after modeled annual taxes and employee costs only; not an actual payslip or complete take-home pay.']};
}
