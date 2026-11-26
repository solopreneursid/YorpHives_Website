import {calculateSalaryRemainder} from './taxable-income.mjs';
import {automaticReverseSalary} from './reverse-salary.mjs';
export function negotiateSalary(input,ruleContext={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'current')||!Object.hasOwn(input,'monthlyIncrease'))throw new TypeError('Provide current salary and desired monthly increase');
 const {current,monthlyIncrease}=input;
 if(!Number.isFinite(monthlyIncrease)||monthlyIncrease<=0||monthlyIncrease>1e9||Math.abs(monthlyIncrease*100-Math.round(monthlyIncrease*100))>0.00002)throw new RangeError('Enter a positive monthly increase in currency units');
 const baseline=calculateSalaryRemainder(current,ruleContext);
 const {pay,...profile}=current;
 const target=(Math.round(baseline.averageMonthlyRemainder*100)+Math.round(monthlyIncrease*100))/100;
 const search=automaticReverseSalary({profile,target,period:'monthly'},ruleContext);
 const common={baseline,monthlyIncrease,target,search,sampleOnly:true,taxRulesVerified:false,warnings:['All contribution bases and tax assumptions are held fixed. This is a modeled salary target, not a guaranteed paycheck or employer offer.']};
 if(!search.found)return {...common,found:false};
 const proposed=search.salary;
 const grossIncrease=(Math.round(proposed.annualGross*100)-Math.round(baseline.annualGross*100))/100;
 const netIncrease=(Math.round(proposed.averageMonthlyRemainder*100)-Math.round(baseline.averageMonthlyRemainder*100))/100;
 return {...common,found:true,proposed,grossIncrease,netIncrease,grossIncreasePercent:baseline.annualGross===0?null:grossIncrease/baseline.annualGross};
}
