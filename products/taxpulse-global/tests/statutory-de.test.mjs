import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTaxableIncome,calculateSalaryRemainder} from '../engine/taxable-income.mjs';
// EStG section 32a, 2026: independent formula evaluation.
for(const [taxableIncome,expected] of [[12348,0],[17799,1034],[50000,10548],[69879,18213],[100000,30864],[300000,115529]])test('German tariff '+taxableIncome,()=>{
 assert.equal(assessTaxableIncome({country:'DE',taxYear:'2026',taxableIncome,assessment:'individual'}).incomeTax,expected);
});
test('joint assessment splits and floors taxable income',()=>{
 assert.equal(assessTaxableIncome({country:'DE',taxYear:'2026',taxableIncome:100001.99,assessment:'joint'}).incomeTax,21096);
});
test('German monthly contributions below health ceiling',()=>{
 const r=calculateSalaryRemainder({country:'DE',region:'DE',taxYear:'2026',pay:5000,annualTaxableIncome:50000,healthSupplementRate:2.9,scopeConfirmed:true});
 assert.deepEqual(r.contributions.map(c=>c.amount),[5580,780,5250,1440]);
 assert.equal(r.annualRemainder,36402);
});
test('German health and care ceilings',()=>{
 const r=calculateSalaryRemainder({country:'DE',region:'DE',taxYear:'2026',pay:6000,annualTaxableIncome:50000,healthSupplementRate:2.9,scopeConfirmed:true});
 assert.deepEqual(r.contributions.map(c=>c.amount),[6696,936,6103.08,1674]);
});
