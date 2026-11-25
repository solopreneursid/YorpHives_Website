import test from 'node:test';
import assert from 'node:assert/strict';
import {compareIndiaRegimes,calculateSalaryRemainder} from '../engine/taxable-income.mjs';
const profile={country:'IN',taxYear:'2026',residentIndividual:true,ageGroup:'under-60',ordinarySalaryOnly:true,oldEligibleDeductions:0,newEligibleDeductions:0};
// Section 202, section 19, Finance Act 2026; ordinary income only.
// At 12 lakh taxable: 20,000 + 40,000 less 60,000 rebate.
// At 12.1 lakh: marginal relief limits pre-cess tax to 10,000.
// At 16 lakh: 20,000 + 40,000 + 60,000, plus 4% cess.
for(const [grossSalary,expected] of [[1275000,0],[1285000,10400],[1675000,124800],[2475000,312000],[5075000,1201200],[5085000,1211600]])test('India new regime gross '+grossSalary,()=>{
 const r=compareIndiaRegimes({...profile,grossSalary}).newRegime;
 assert.equal(r.incomeTax,expected);
});
test('old regime age exemptions and rebate',()=>{
 for(const [ageGroup,expected] of [['under-60',33800],['60-79',31200],['80-plus',20800]]){
 const r=compareIndiaRegimes({...profile,ageGroup,grossSalary:700000}).oldRegime;
 assert.equal(r.incomeTax,expected);
 }
 assert.equal(compareIndiaRegimes({...profile,grossSalary:550000}).oldRegime.incomeTax,0);
});
test('confirmed EPF wage and professional tax are cash deductions',()=>{
 const r=calculateSalaryRemainder({country:'IN',region:'IN',taxYear:'2026',pay:1275000,scopeConfirmed:true,epfMonthlyWage:15000,professionalTaxAnnual:2500});
 assert.equal(r.incomeTax,0);assert.equal(r.employeeContributions,24100);assert.equal(r.annualRemainder,1250900);
});
