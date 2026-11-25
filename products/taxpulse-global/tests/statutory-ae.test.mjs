import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTaxableIncome,calculateSalaryRemainder} from '../engine/taxable-income.mjs';
// Official UAE government taxation page, FTA natural-person guidance,
// and ILOE standard plan: AED 5 or 10 plus 5% VAT monthly.
const profile={country:'AE',region:'AE',taxYear:'2026',scopeConfirmed:true};
for(const [pay,monthlyBasicSalary,annualPremium,annualRemainder] of [
 [100,100,63,1137],
 [20000,15999.99,63,239937],
 [20000,16000,63,239937],
 [20000,16000.01,126,239874],
 [20000,20000,126,239874],
 [1000000,1000000,126,11999874]
])test('UAE salary '+pay+' basic '+monthlyBasicSalary,()=>{
 const r=calculateSalaryRemainder({...profile,pay,monthlyBasicSalary});
 assert.equal(r.incomeTax,0);
 assert.equal(r.employeeContributions,annualPremium);
 assert.equal(r.annualRemainder,annualRemainder);
 assert.equal(r.taxRulesVerified,false);
});
test('UAE ordinary wages excluded from personal income tax, business inputs rejected',()=>{
 for(const salaryIncome of [0,1000000,12000000]){
 assert.equal(assessTaxableIncome({country:'AE',taxYear:'2026',salaryIncome,employeeWagesOnly:true}).incomeTax,0);
 }
 assert.throws(()=>assessTaxableIncome({country:'AE',taxYear:'2026',salaryIncome:1000000,employeeWagesOnly:false}));
 for(const monthlyBasicSalary of [0,20000.01,NaN])assert.throws(()=>calculateSalaryRemainder({...profile,pay:20000,monthlyBasicSalary}));
 assert.throws(()=>calculateSalaryRemainder({...profile,pay:20000,monthlyBasicSalary:16000,scopeConfirmed:false}));
});
