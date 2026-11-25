import {calculateSalaryRemainder} from './taxable-income.mjs';
// Explicit bounded exhaustive search: rounding and tax cliffs can violate monotonicity.
// Whole currency-unit grid; no claim about fractional gross amounts.
export function reverseSalary(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['profile','target','period','minPay','maxPay'].includes(k)))throw new TypeError('Invalid reverse salary request');
 const {profile,target,period,minPay,maxPay}=input;
 if(!profile||typeof profile!=='object'||Array.isArray(profile)||Object.hasOwn(profile,'pay')||profile.scopeConfirmed!==true)throw new TypeError('Confirm salary assumptions without gross pay');
 if(!Number.isFinite(target)||target<0||target>1e9||Math.abs(target*100-Math.round(target*100))>0.00002||!['monthly','annual'].includes(period))throw new RangeError('Invalid target or period');
 if(!Number.isSafeInteger(minPay)||!Number.isSafeInteger(maxPay)||minPay<0||maxPay>1e9||maxPay<minPay||maxPay-minPay>10000)throw new RangeError('Choose a whole-unit search range of at most 10,001 candidates');
 const threshold=Math.round(target*100);
 // Endpoints must be valid under the unchanged, explicit profile.
 calculateSalaryRemainder({...profile,pay:minPay});
 calculateSalaryRemainder({...profile,pay:maxPay});
 for(let pay=minPay;pay<=maxPay;pay++){
  const salary=calculateSalaryRemainder({...profile,pay});
  const achieved=period==='annual'?salary.annualRemainder:salary.averageMonthlyRemainder;
  if(Math.round(achieved*100)>=threshold)return {found:true,target,period,minPay,maxPay,requiredPay:pay,achieved,salary,sampleOnly:true,taxRulesVerified:false,searchStep:1};
 }
 return {found:false,target,period,minPay,maxPay,sampleOnly:true,taxRulesVerified:false,searchStep:1};
}
