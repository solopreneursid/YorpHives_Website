import {calculateSalaryRemainder} from './taxable-income.mjs';
const own=(o,k)=>Object.hasOwn(o,k);
const regions=Object.freeze({TX:['US','USD','annual'],RUK:['GB','GBP','monthly'],SCT:['GB','GBP','monthly'],AB:['CA','CAD','annual'],AU:['AU','AUD','annual'],IN:['IN','INR','annual'],SG:['SG','SGD','monthly'],DE:['DE','EUR','monthly'],AE:['AE','AED','monthly']});
const extra=Object.freeze({IN:['epfMonthlyWage','professionalTaxAnnual'],DE:['annualTaxableIncome','healthSupplementRate'],AE:['monthlyBasicSalary']});
function exact(o,keys){
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!own(o,k)))throw new TypeError('Unsupported profile fields');
}
function minor(n){
 if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e9||Math.abs(n*100-Math.round(n*100))>0.00002)throw new RangeError('Enter a nonnegative amount with at most two decimal places');
 return Math.round(n*100);
}
export function createFinancialProfile(salary,ruleContext={}){
 if(!salary||typeof salary!=='object'||!own(regions,salary.region))throw new RangeError('Unsupported region');
 const [country,currency,payPeriod]=regions[salary.region];
 const keys=['country','region','taxYear','pay','scopeConfirmed',...(extra[country]||[])];
 exact(salary,keys);
 if(salary.country!==country||salary.taxYear!=='2026'||salary.scopeConfirmed!==true)throw new RangeError('Confirm the supported tax profile');
 minor(salary.pay);
 const result=calculateSalaryRemainder(salary,ruleContext);
 if(result.currency!==currency)throw new Error('Currency mismatch');
 return Object.freeze({schemaVersion:1,country,region:salary.region,currency,taxYear:salary.taxYear,payPeriod,annualGross:result.annualGross,annualIncomeTax:result.incomeTax,annualEmployeeContributions:result.employeeContributions,annualTakeHome:result.annualRemainder,salary:Object.freeze(Object.fromEntries(keys.map(k=>[k,salary[k]]))),sampleOnly:true,taxRulesVerified:false});
}
export function salaryFromProfile(profile,ruleContext={}){
 if(!profile||profile.schemaVersion!==1)throw new TypeError('Unsupported profile version');
 const validated=createFinancialProfile(profile.salary,ruleContext);
 for(const key of ['country','region','currency','taxYear','payPeriod','annualGross','annualIncomeTax','annualEmployeeContributions','annualTakeHome','sampleOnly','taxRulesVerified'])if(profile[key]!==validated[key])throw new RangeError('Profile metadata does not match salary');
 return {...validated.salary};
}
export function offerFromProfile(profile,ruleContext={}){const salary=salaryFromProfile(profile,ruleContext);return {...salary,scopeConfirmed:false};}
export function internationalFromProfile(profile,{housing,living},ruleContext={}){
 const salary=offerFromProfile(profile,ruleContext);
 return {salary,housing:minor(housing)/100,living:minor(living)/100};
}
export function negotiationFromProfile(profile,monthlyIncrease,ruleContext={}){
 const current=salaryFromProfile(profile,ruleContext);
 if(minor(monthlyIncrease)===0)throw new RangeError('Enter a positive increase');
 return {current,monthlyIncrease};
}
