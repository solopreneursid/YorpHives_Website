// Decision tools use explicit user-supplied assumptions; no statutory eligibility inferred.
import {compareIndiaRegimes} from './taxable-income.mjs';
const currencies=['INR','USD','GBP','CAD','AUD','EUR','SGD','AED'];
function exact(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))throw new TypeError('Unsupported input fields');}
function units(v,scale=100,max=1e9){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||Math.abs(v*scale-Math.round(v*scale))>0.00002)throw new RangeError('Invalid amount or precision');return BigInt(Math.round(v*scale));}
const out=n=>{if(n>100000000000000n||n< -100000000000000n)throw new RangeError('Result outside supported range');return Number(n)/100;};
const round=(n,d)=>n<0n?-round(-n,d):(n+d/2n)/d;
function currency(c){if(!currencies.includes(c))throw new RangeError('Unsupported currency');return c;}
const sample={sampleOnly:true,taxRulesVerified:false};
export function indiaCtc(input){
 exact(input,['annualCtc','employerContributions','nonCashBenefits','employeeContributions','otherPayrollDeductions','residentIndividual','ageGroup','oldEligibleDeductions','newEligibleDeductions']);
 const whole=v=>{if(!Number.isSafeInteger(v)||v<0||v>1e9)throw new RangeError('Enter whole annual rupees');return BigInt(v);};
 const ctc=whole(input.annualCtc),employer=whole(input.employerContributions),benefits=whole(input.nonCashBenefits),employee=whole(input.employeeContributions),other=whole(input.otherPayrollDeductions);
 const gross=ctc-employer-benefits;if(gross<0n||employee+other>gross)throw new RangeError('Salary components exceed cash wages');
 const tax=compareIndiaRegimes({country:'IN',taxYear:'2026',grossSalary:Number(gross),residentIndividual:input.residentIndividual,ageGroup:input.ageGroup,ordinarySalaryOnly:true,oldEligibleDeductions:input.oldEligibleDeductions,newEligibleDeductions:input.newEligibleDeductions});
 const regime=r=>{const net=gross-employee-other-BigInt(Math.round(r.incomeTax));return {incomeTax:r.incomeTax,annualCash:Number(net),monthlyCash:out(round(net*100n,12n))};};
 return {...sample,currency:'INR',annualGross:Number(gross),annualEmployerContributions:Number(employer),annualNonCashBenefits:Number(benefits),annualEmployeeContributions:Number(employee),annualOtherPayrollDeductions:Number(other),old:regime(tax.oldRegime),new:regime(tax.newRegime),tax,warnings:['Use annual employer and employee amounts confirmed by the employer; do not double count noncash benefits or deductions. Assumes all remaining cash is ordinary taxable salary. No EPF, gratuity, professional tax, or eligibility is inferred. India EPFO wage-ceiling change effective 17 September 2026 requires independent review. Unverified example only.']};
}
export function purchasingPower(input){
 exact(input,['firstCurrency','secondCurrency','firstMonthlyIncome','secondMonthlyIncome','firstFactor','secondFactor','referenceYear']);
 currency(input.firstCurrency);currency(input.secondCurrency);if(input.firstCurrency===input.secondCurrency)throw new RangeError('Choose distinct currencies');
 if(!Number.isInteger(input.referenceYear)||input.referenceYear<1990||input.referenceYear>2026)throw new RangeError('Invalid reference year');
 const a=units(input.firstFactor,1000000,1e6),b=units(input.secondFactor,1000000,1e6);if(a===0n||b===0n)throw new RangeError('Factors must be positive');
 const x=round(units(input.firstMonthlyIncome)*1000000n,a),y=round(units(input.secondMonthlyIncome)*1000000n,b);
 return {...sample,firstInternationalDollars:out(x),secondInternationalDollars:out(y),difference:out(y-x),referenceYear:input.referenceYear,warnings:['User-entered national household-consumption PPP factors, local currency units per international dollar, from the same reference year. Not exchange rates, city prices, or spendable currency. No live data loaded.']};
}
export function relocationBreakEven(input){
 exact(input,['currency','currentMonthlySavings','destinationMonthlySavings','movingCost']);
 currency(input.currency);
 const signed=v=>v<0?-units(-v):units(v);
 const current=signed(input.currentMonthlySavings),destination=signed(input.destinationMonthlySavings),cost=units(input.movingCost),delta=destination-current;
 return {...sample,currency:input.currency,monthlyImprovement:out(delta),monthsToRecover:cost===0n?0:delta<=0n?null:Number((cost+delta-1n)/delta),firstYearDifference:out(delta*12n-cost),warnings:['Use monthly savings after taxes and living expenses, converted to the same currency. No future exchange-rate, inflation, investment, visa or cross-border tax assumptions.']};
}
export function indiaDeductionScenario(input){
 exact(input,['grossSalary','residentIndividual','ageGroup','oldEligibleDeductions','newEligibleDeductions','extraOldEligibleDeductions','extraNewEligibleDeductions']);
 const whole=v=>{if(!Number.isSafeInteger(v)||v<0||v>1e9)throw new RangeError('Enter whole annual rupees');return v;};
 const base={country:'IN',taxYear:'2026',grossSalary:whole(input.grossSalary),residentIndividual:input.residentIndividual,ageGroup:input.ageGroup,ordinarySalaryOnly:true,oldEligibleDeductions:whole(input.oldEligibleDeductions),newEligibleDeductions:whole(input.newEligibleDeductions)};
 const before=compareIndiaRegimes(base),after=compareIndiaRegimes({...base,oldEligibleDeductions:whole(base.oldEligibleDeductions+whole(input.extraOldEligibleDeductions)),newEligibleDeductions:whole(base.newEligibleDeductions+whole(input.extraNewEligibleDeductions))});
 return {...sample,currency:'INR',before,after,oldTaxReduction:before.oldRegime.incomeTax-after.oldRegime.incomeTax,newTaxReduction:before.newRegime.incomeTax-after.newRegime.incomeTax,warnings:['Only use deductions already confirmed eligible for each regime, excluding the standard deduction. A tax reduction is not a net financial benefit; the underlying expenditure may cost more. No deduction eligibility or regime recommendation is inferred.']};
}
