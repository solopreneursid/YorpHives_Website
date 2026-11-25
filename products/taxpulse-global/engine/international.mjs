import {calculateSalaryRemainder} from './taxable-income.mjs';
function exact(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))throw new TypeError('Invalid comparison fields');}
function units(v,scale,max){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||Math.abs(v*scale-Math.round(v*scale))>0.00002)throw new RangeError('Invalid amount or precision');return BigInt(Math.round(v*scale));}
const cents=n=>{if(n>100000000000000n||n< -100000000000000n)throw new RangeError('Comparison exceeds supported monetary precision');return Number(n)/100;};
function round(n,d){return n<0n?-round(-n,d):(n+d/2n)/d;}
function location(input){
 exact(input,['salary','housing','living']);
 const salary=calculateSalaryRemainder(input.salary);
 const housing=units(input.housing,100,1e9),living=units(input.living,100,1e9);
 const disposable=units(salary.annualRemainder,100,12e9)-12n*(housing+living);
 return {salary,monthlyHousing:cents(housing),monthlyLiving:cents(living),annualDisposable:cents(disposable),monthlyDisposable:cents(round(disposable,12n))};
}
export function compareInternational(input){
 exact(input,['first','second','rate','rateDate']);
 const first=location(input.first),second=location(input.second);
 if(first.salary.country===second.salary.country)throw new RangeError('Choose different countries');
 const rate=units(input.rate,1000000,1000000);
 if(rate===0n)throw new RangeError('Exchange rate must be positive');
 if(typeof input.rateDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.rateDate))throw new RangeError('Enter exchange rate date');
 const date=new Date(input.rateDate+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==input.rateDate)throw new RangeError('Invalid exchange rate date');
 const a=BigInt(Math.round(first.annualDisposable*100)),b=BigInt(Math.round(second.annualDisposable*100));
 const converted=round(b*rate,1000000n);
 return {first,second,comparisonCurrency:first.salary.currency,rate:input.rate,rateDate:input.rateDate,secondAnnualConverted:cents(converted),annualDifference:cents(converted-a),higherDisposable:converted===a?'equal':converted>a?'second':'first',sampleOnly:true,taxRulesVerified:false,warnings:['Independent full-year local salary examples, not a cross-border tax return. Tax periods may differ; no part-year residence, double-tax treaties, foreign tax credits, relocation costs or exchange fees are modeled. Exchange rate and living costs are user-supplied assumptions, not live or verified market data. Disposable income is not purchasing power or a recommendation to relocate.']};
}
