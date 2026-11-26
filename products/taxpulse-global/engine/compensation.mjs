import {compareSalaryOffers} from './salary-offers.mjs';
const fields=['retirement','insurance','otherBenefits','commuting','otherExpenses'];
function minor(v){
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e9||Math.abs(v*100-Math.round(v*100))>0.00002)throw new RangeError('Invalid annual amount');
 return Math.round(v*100);
}
function supplement(salary,extras){
 if(!extras||typeof extras!=='object'||Array.isArray(extras)||Object.keys(extras).length!==fields.length||fields.some(k=>!Object.hasOwn(extras,k)))throw new TypeError('Provide each annual compensation component');
 const v=Object.fromEntries(fields.map(k=>[k,minor(extras[k])]));
 const benefits=v.retirement+v.insurance+v.otherBenefits;
 const expenses=v.commuting+v.otherExpenses;
 const cash=minor(salary.annualRemainder)-expenses;
 return {salary,annualBenefits:benefits/100,annualExpenses:expenses/100,annualAvailableCash:cash/100,estimatedAnnualCombinedValue:(cash+benefits)/100,averageMonthlyAvailableCash:cash/1200};
}
export function compareCompensation(input,ruleContext={}){
 const keys=['first','second','firstExtras','secondExtras'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k)))throw new TypeError('Provide two offers and their annual extras');
 const salaries=compareSalaryOffers({first:input.first,second:input.second},ruleContext);
 const first=supplement(salaries.first,input.firstExtras),second=supplement(salaries.second,input.secondExtras);
 const diff=(a,b)=>(Math.round(b*100)-Math.round(a*100))/100;
 return {first,second,currency:salaries.currency,annualCashDifference:diff(first.annualAvailableCash,second.annualAvailableCash),annualCombinedValueDifference:diff(first.estimatedAnnualCombinedValue,second.estimatedAnnualCombinedValue),sampleOnly:true,taxRulesVerified:false,warnings:['Enter annual incremental non-cash benefit values not already included in salary; do not count the same benefit twice. Benefits are subjective estimates, not spendable cash. No additional benefit or bonus tax treatment is calculated. Cash salary must already include any applicable cash allowances or bonuses only if they meet the selected salary model conditions. Expenses are personal cash costs, not tax deductions.']};
}
