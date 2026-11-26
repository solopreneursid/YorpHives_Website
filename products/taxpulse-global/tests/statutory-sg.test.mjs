import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTaxableIncome,calculateEmployeeContributions,calculateSalaryRemainder} from '../engine/taxable-income.mjs';
// CPF Board full rates from 1 January 2026, ordinary wages above SGD 750.
for(const [ageBand,employee,employer] of [['55-or-under',1600,1360],['56-60',1440,1280],['61-65',1000,1000],['66-70',600,720],['over-70',400,600]])test('CPF ceiling '+ageBand,()=>{
 for(const income of [8000,9000]){
 const r=calculateEmployeeContributions({country:'SG',taxYear:'2026',income,scopeConfirmed:true,ageBand});
 assert.equal(r.totalEmployeeContribution,employee);
 assert.equal(r.employerContribution,employer);
 }
});
test('CPF employee floors and total rounds separately',()=>{
 const r=calculateEmployeeContributions({country:'SG',taxYear:'2026',income:751.99,scopeConfirmed:true,ageBand:'55-or-under'});
 assert.equal(r.totalEmployeeContribution,150);
 assert.equal(r.employerContribution,128);
});
// IRAS cumulative resident tax at published band boundaries, before rebates.
for(const [taxableIncome,expected] of [[20000,0],[30000,200],[40000,550],[80000,3350],[120000,7950],[160000,13950],[200000,21150],[240000,28750],[280000,36550],[320000,44550],[500000,84150],[1000000,199150]])test('IRAS resident boundary '+taxableIncome,()=>{
 assert.equal(assessTaxableIncome({country:'SG',taxYear:'2026',taxableIncome,residentEligible:true}).incomeTax,expected);
});
test('2026 ordinary wages, YA 2027, CPF and earned income relief',()=>{
 const r=calculateSalaryRemainder({country:'SG',region:'SG',taxYear:'2026',pay:5000,scopeConfirmed:true});
 assert.equal(r.annualGross,60000);assert.equal(r.employeeContributions,12000);
 assert.equal(r.taxableIncome,47000);assert.equal(r.incomeTax,1040);assert.equal(r.annualRemainder,46960);
});
