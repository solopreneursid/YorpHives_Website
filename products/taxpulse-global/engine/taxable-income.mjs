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
const roundTen=x=>((x+5n)/10n)*10n;
const NEW_BANDS=[[400000n,0n],[800000n,5n],[1200000n,10n],[1600000n,15n],[2000000n,20n],[2400000n,25n],[null,30n]];
function indiaBands(regime,resident,ageGroup){
 if(regime==='new')return NEW_BANDS;
 const exempt=resident&&ageGroup==='80-plus'?500000n:resident&&ageGroup==='60-79'?300000n:250000n;
 return [[exempt,0n],[500000n,5n],[1000000n,20n],[null,30n]];
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
function indiaSurcharge(income,regime,bands,baseAfterRebate){
 const levels=regime==='new'?[[5000000n,10n],[10000000n,15n],[20000000n,25n]]:[[5000000n,10n],[10000000n,15n],[20000000n,25n],[50000000n,37n]];
 let rate=0n,priorRate=0n,threshold=0n;
 for(const [limit,next] of levels)if(income>limit){priorRate=rate;rate=next;threshold=limit;}
 const nominal=baseAfterRebate*rate/100n;
 // At the active threshold use the preceding surcharge rate, before cess.
 const cap=threshold===0n?baseAfterRebate:indiaBase(threshold,bands).tax*(100n+priorRate)/100n+(income-threshold)*INR_SCALE;
 const relief=maxBig(0n,baseAfterRebate+nominal-cap);
 return {rate,nominal,relief,net:nominal-relief};
}
function indiaRegime(regime,gross,deductions,resident,ageGroup){
 const standard=minBig(gross,regime==='new'?75000n:50000n);
 if(deductions>gross-standard)throw new RangeError('Other eligible deductions cannot exceed salary after standard deduction');
 const taxableUnrounded=gross-standard-deductions,taxable=roundTen(taxableUnrounded);
 const bands=indiaBands(regime,resident,ageGroup),{tax,brackets}=indiaBase(taxable,bands);
 let rebate=0n,rebateMarginalRelief=0n;
 if(resident){
  if(regime==='old'&&taxable<=500000n)rebate=minBig(tax,12500n*INR_SCALE);
  if(regime==='new'){
   if(taxable<=1200000n)rebate=minBig(tax,60000n*INR_SCALE);
   else rebateMarginalRelief=maxBig(0n,tax-(taxable-1200000n)*INR_SCALE);
  }
 }
 const base=tax-rebate-rebateMarginalRelief;
 const surcharge=indiaSurcharge(taxable,regime,bands,base);
 const beforeCess=base+surcharge.net,cess=beforeCess*4n/100n;
 const unroundedTax=beforeCess+cess,finalTax=roundTen(unroundedTax/INR_SCALE);
 return {regime,grossSalary:Number(gross),standardDeduction:Number(standard),otherEligibleDeductions:Number(deductions),taxableIncomeBeforeRounding:Number(taxableUnrounded),taxableIncome:Number(taxable),brackets,taxBeforeRebate:inr(tax),rebateApplied:inr(rebate),rebateMarginalRelief:inr(rebateMarginalRelief),taxAfterRebate:inr(base),surchargeRate:Number(surcharge.rate)/100,surchargeBeforeRelief:inr(surcharge.nominal),surchargeMarginalRelief:inr(surcharge.relief),surchargeApplied:inr(surcharge.net),cessAmount:inr(cess),taxBeforeFinalRounding:inr(unroundedTax),incomeTax:Number(finalTax),salaryAfterIncomeTax:Number(gross-finalTax)};
}
export function compareIndiaRegimes(input){
 const keys=['country','taxYear','grossSalary','residentIndividual','ageGroup','ordinarySalaryOnly','oldEligibleDeductions','newEligibleDeductions'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(input,k))||input.country!=='IN'||input.taxYear!=='2026'||input.ordinarySalaryOnly!==true||typeof input.residentIndividual!=='boolean'||!['under-60','60-79','80-plus'].includes(input.ageGroup))throw new TypeError('Unsupported India salary example');
 const whole=value=>{if(!Number.isSafeInteger(value)||value<0||value>MAX)throw new RangeError('Enter a non-negative whole rupee amount');return BigInt(value);};
 const gross=whole(input.grossSalary),oldDeductions=whole(input.oldEligibleDeductions),newDeductions=whole(input.newEligibleDeductions);
 const oldRegime=indiaRegime('old',gross,oldDeductions,input.residentIndividual,input.ageGroup);
 const newRegime=indiaRegime('new',gross,newDeductions,input.residentIndividual,input.ageGroup);
 return {country:'IN',taxYear:'2026',taxYearLabel:'FY 2026–27 (1 April 2026 to 31 March 2027)',currency:'INR',sampleOnly:true,taxRulesVerified:false,inputBasis:'ordinary-salary',ruleId:'IN-TY2026-27-ordinary-salary-comparison-v1',sourceUrls:["https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf","https://www.incometaxindia.gov.in/documents/d/guest/finance-act-2026-pdf-1","https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-and-tax-estimator-um"],oldRegime,newRegime,lowerTaxRegime:oldRegime.incomeTax===newRegime.incomeTax?'equal':oldRegime.incomeTax<newRegime.incomeTax?'old':'new',taxDifference:Math.abs(oldRegime.incomeTax-newRegime.incomeTax),warnings:['Ordinary salary only. Additional deductions are user-confirmed eligible amounts, excluding the standard deduction; eligibility is not independently determined. Excludes capital gains, business income, agricultural income, foreign tax credits, arrears relief, other taxes and payroll. This comparison is an unverified example, not a filing recommendation.']};
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
 const country=input.country,keys=[...common,...(country==='US'?['filingStatus']:country==='IN'?['assetType']:[])];
 if(Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(input,k)))throw new TypeError('Unsupported fields');
 const acquired=cgDate(input.acquired),disposed=cgDate(input.disposed);
 const period=country==='US'?['2026-01-01','2026-12-31']:country==='IN'?['2026-04-01','2027-03-31']:['2026-04-06','2027-04-05'];
 if(acquired>disposed||disposed<period[0]||disposed>period[1])throw new RangeError('Disposal must be in the selected tax year and on or after acquisition');
 // Leap-day anniversary rules are excluded until jurisdiction-specific evidence is reviewed.
 if(country!=='GB'&&acquired.slice(5)==='02-29')throw new RangeError('Leap-day acquisition not supported');
 const anniversary=(Number(acquired.slice(0,4))+1)+acquired.slice(4);
 const holding=country==='GB'?'not-rate-determining':disposed>anniversary?'long-term':'short-term';
 const proceeds=cgMoney(input.saleProceeds),basis=cgMoney(input.adjustedBasis),loss=cgMoney(input.eligibleLosses),other=cgMoney(input.otherTaxableIncome);
 const realized=proceeds-basis,positive=maxBig(0n,realized);
 if(loss>positive)throw new RangeError('Eligible loss offset cannot exceed positive gain');
 const net=positive-loss;
 let allowance=0n,raw=0n,rows=[],cess=0n,warnings=[];
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
 }else if(country==='GB'){
  allowance=minBig(net,300000n);
  const s=cgSlices(other,net-allowance,[37700],[1800,2400]);raw=s.total;rows=s.rows;
  warnings=['Ordinary UK-resident individual investment shares only, full annual exempt amount and standard basic rate band. Excludes property, business reliefs, pension/Gift Aid band extensions, FIG claims, special share matching and other gains or carryovers. Holding length does not select the rate.'];
 }else{
  if(!['listed-equity','equity-fund'].includes(input.assetType)||acquired<'2018-02-01')throw new RangeError('Only qualifying post-January 2018 equity investments supported');
  // Avoid rebate, unused basic exemption and surcharge interactions.
  if(other<130000000n||other+net>500000000n)throw new RangeError('India requires other taxable ordinary income of INR 13 lakh or more and combined net taxable income at most INR 50 lakh');
  allowance=holding==='long-term'?minBig(net,12500000n):0n;
  const rate=holding==='long-term'?1250:2000;
  raw=(net-allowance)*BigInt(rate);rows=net>allowance?[{rate:rate/10000,taxableGain:cgOut(net-allowance),tax:cgOut(cgRound(raw))}]:[];
  cess=cgRound(raw*4n/100n);
  warnings=['Resident individual, new regime, qualifying STT conditions confirmed, full annual equity gain threshold available. No other gains or special income. Ordinary taxable income must be at least INR 13 lakh and combined net income at most INR 50 lakh. Includes 4% cess; excludes surcharge, final return-level rounding and other taxes.'];
 }
 const base=cgRound(raw),total=cgRound(raw+(country==='IN'?raw*4n/100n:0n));
 if(realized<0n)warnings.push('This disposal has a loss. No tax benefit, refund or carryforward is calculated.');
 return {country,taxYear:'2026',taxYearLabel:period.join(' to '),currency:country==='US'?'USD':country==='GB'?'GBP':'INR',sampleOnly:true,taxRulesVerified:false,ruleId:country+'-2026-investment-disposal-v1',acquired,disposed,holding,realizedGain:cgOut(realized),eligibleLossesApplied:cgOut(loss),netPositiveGain:cgOut(net),allowanceApplied:cgOut(allowance),taxableGain:cgOut(net-allowance),otherTaxableIncome:cgOut(other),brackets:rows,taxBeforeCess:cgOut(base),cessAmount:cgOut(cess),estimatedGainTax:cgOut(total),sourceUrls:CG_SOURCES[country],warnings};
}
