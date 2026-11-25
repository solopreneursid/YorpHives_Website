import {calculateSalaryRemainder} from './taxable-income.mjs';
export function compareSalaryOffers(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'first')||!Object.hasOwn(input,'second'))throw new TypeError('Provide two salary offers');
 const {first,second}=input;
 const a=calculateSalaryRemainder(first),b=calculateSalaryRemainder(second);
 if(a.country!==b.country||a.region!==b.region||a.currency!==b.currency||a.taxYearLabel!==b.taxYearLabel)throw new RangeError('Compare offers in the same tax region and period');
 const diff=(x,y)=>(Math.round(y*100)-Math.round(x*100))/100;
 const annualDifference=diff(a.annualRemainder,b.annualRemainder);
 return {first:a,second:b,annualDifference,averageMonthlyDifference:diff(a.averageMonthlyRemainder,b.averageMonthlyRemainder),grossDifference:diff(a.annualGross,b.annualGross),higherRemainder:annualDifference===0?'equal':annualDifference>0?'second':'first',currency:a.currency,sampleOnly:true,taxRulesVerified:false,warnings:['Compare modeled cash salary only, not total compensation. Benefits, bonuses, working hours, living costs and unmodeled deductions may change which offer is preferable.']};
}
