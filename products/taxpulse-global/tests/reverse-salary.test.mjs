import test from 'node:test';
import assert from 'node:assert/strict';
import {reverseSalary,automaticReverseSalary} from '../engine/reverse-salary.mjs';
import {calculateSalaryRemainder} from '../engine/taxable-income.mjs';
const profiles=[
 ['US','TX',60000,{}],['GB','RUK',4000,{}],['CA','AB',80000,{}],
 ['AU','AU',120000,{}],['IN','IN',1275000,{epfMonthlyWage:15000,professionalTaxAnnual:2400}],
 ['SG','SG',5000,{}],['DE','DE',5000,{annualTaxableIncome:50000,healthSupplementRate:2.9}],
 ['AE','AE',20000,{monthlyBasicSalary:16000}]
];
for(const [country,region,pay,extras] of profiles)test(country+' reverse salary matches exhaustive forward results',()=>{
 const profile={country,region,taxYear:'2026',scopeConfirmed:true,...extras};
 for(const period of ['annual','monthly']){
 const field=period==='annual'?'annualRemainder':'averageMonthlyRemainder';
 const target=calculateSalaryRemainder({...profile,pay})[field];
 const minPay=pay-20,maxPay=pay+20;
 const r=reverseSalary({profile,target,period,minPay,maxPay});
 assert.equal(r.found,true);
 assert.ok(r.achieved>=target);
 assert.equal(r.salary[field],r.achieved);
 for(let p=minPay;p<r.requiredPay;p++)assert.ok(calculateSalaryRemainder({...profile,pay:p})[field]<target);
 assert.equal(r.taxRulesVerified,false);
 }
});
test('unreachable target and invalid requests',()=>{
 const profile={country:'US',region:'TX',taxYear:'2026',scopeConfirmed:true};
 const input={profile,target:1000000,period:'annual',minPay:100,maxPay:110};
 assert.equal(reverseSalary(input).found,false);
 for(const change of [{target:NaN},{target:1.001},{period:'weekly'},{maxPay:20000},{minPay:-1},{profile:{...profile,pay:100}},{profile:{...profile,scopeConfirmed:false}}])assert.throws(()=>reverseSalary({...input,...change}));
});

test('automatic search finds exact UAE target without manual bounds',()=>{
 const profile={country:'AE',region:'AE',taxYear:'2026',scopeConfirmed:true,monthlyBasicSalary:16000};
 const r=automaticReverseSalary({profile,target:19994.75,period:'monthly'});
 assert.equal(r.requiredPay,20000);assert.equal(r.searchComplete,true);
});
test('automatic search distinguishes limit from impossibility',()=>{
 const profile={country:'US',region:'TX',taxYear:'2026',scopeConfirmed:true};
 assert.equal(automaticReverseSalary({profile,target:180000,period:'annual'}).searchComplete,false);
 assert.equal(automaticReverseSalary({profile,target:300000,period:'annual'}).searchComplete,true);
});
