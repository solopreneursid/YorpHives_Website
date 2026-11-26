import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEmployeeContributions,calculateSalaryRemainder,assessTaxableIncome} from '../engine/taxable-income.mjs';
// CRA T4032AB 2026 published maximum contributions.
for(const [income,expected] of [[3500,57.05],[74600,5353.52],[85000,5769.52],[100000,5769.52]])test('CRA annual contributions '+income,()=>{
 const r=calculateEmployeeContributions({country:'CA',taxYear:'2026',income,scopeConfirmed:true});
 assert.equal(r.totalEmployeeContribution,expected);
});
// ATO FY 2026–27 resident schedule: 4020 + 30% above 45000;
// 31020 + 37% above 135000; 51370 + 45% above 190000.
for(const [pay,tax] of [[100000,20520],[135000,31020],[190000,51370],[200000,55870]])test('ATO resident salary '+pay,()=>{
 const r=calculateSalaryRemainder({country:'AU',region:'AU',taxYear:'2026',pay,scopeConfirmed:true});
 assert.equal(r.incomeTax,tax);
 assert.equal(r.employeeContributions,pay*.02);
 assert.equal(r.annualRemainder,pay-tax-pay*.02);
});
test('ATO low-income offset examples',()=>{
 for(const [taxableIncome,expected] of [[37500,2195],[45000,3695],[60000,8420]]){
 const r=assessTaxableIncome({country:'AU',taxYear:'2026',taxableIncome,residentEligible:true});
 assert.equal(r.incomeTax,expected);
 }
});
