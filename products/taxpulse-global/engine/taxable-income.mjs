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
