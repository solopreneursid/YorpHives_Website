import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTaxableIncome} from '../engine/taxable-income.mjs';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const calc=(country,taxableIncome,extra={})=>assessTaxableIncome({country,taxYear:'2026',taxableIncome,residentEligible:true,...extra});
for(const [income,expected,offset] of [[0,0,0],[18200,0,0],[20000,0,270],[37500,2195,700],[45000,3695,325],[60000,8420,100],[66667,10520.1,0],[135000,31020,0],[190000,51370,0],[200000,55870,0]]){
 test('AU 2026-27 tax and applied offset at '+income,()=>{const r=calc('AU',income);assert.equal(r.incomeTax,expected);assert.equal(r.lowIncomeOffset,offset);assert.equal(r.taxRulesVerified,false);});
}
for(const [income,expected] of [[0,0],[20000,0],[30000,200],[40000,550],[80000,3350],[120000,7950],[160000,13950],[200000,21150],[240000,28750],[280000,36550],[320000,44550],[500000,84150],[1000000,199150],[1100000,223150]]){
 test('SG YA 2026 published cumulative tax at '+income,()=>{const r=calc('SG',income);assert.equal(r.incomeTax,expected);assert.match(r.taxYearLabel,/2025/);});
}
test('UAE wage-only examples and strict input contract',()=>{for(const salaryIncome of [0,120000,2000000]){const r=assessTaxableIncome({country:'AE',taxYear:'2026',salaryIncome,employeeWagesOnly:true});assert.equal(r.incomeTax,0);assert.equal(r.inputBasis,'employee-wages');assert.equal(r.taxRulesVerified,false);}assert.throws(()=>assessTaxableIncome({country:'AE',taxYear:'2026',salaryIncome:100,employeeWagesOnly:false}));assert.throws(()=>calc('AE',100));});
test('AU and SG reject unsupported residency, extra data and invalid year or amount',()=>{for(const country of ['AU','SG']){for(const extra of [{residentEligible:false},{residentEligible:undefined},{taxYear:'2025'},{taxableIncome:-1},{taxableIncome:Infinity},{grossSalary:1000}])assert.throws(()=>calc(country,1000,extra));}});
test('receipt replay supports AU SG and AE',async()=>{const engineFingerprint='a'.repeat(64);for(const input of [{country:'AU',taxYear:'2026',taxableIncome:60000,residentEligible:true},{country:'SG',taxYear:'2026',taxableIncome:80000,residentEligible:true},{country:'AE',taxYear:'2026',salaryIncome:100000,employeeWagesOnly:true}]){const r=await createReceipt({kind:'taxable-income',input,engineFingerprint});assert.equal((await verifyReceipt(r,engineFingerprint)).reproduced,true);}});
