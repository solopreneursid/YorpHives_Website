import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTaxableIncome} from '../engine/taxable-income.mjs';
const de=(taxableIncome,assessment='individual')=>assessTaxableIncome({country:'DE',taxYear:'2026',taxableIncome,assessment});
const ca=(taxableIncome,netIncome=taxableIncome)=>assessTaxableIncome({country:'CA',taxYear:'2026',taxableIncome,netIncome,fullYearResident:true});
// Expected values independently evaluated from official tariff coefficients / CRA bands.
for(const [income,expected] of [[0,0],[12348,0],[12349,0],[15000,435],[17799,1034],[17800,1035],[30000,4217],[50000,10548],[69878,18213],[69879,18213],[100000,30864],[277825,105550],[277826,105551],[300000,115529]])test('DE tariff '+income,()=>assert.equal(de(income).incomeTax,expected));
for(const [income,expected] of [[0,0],[16452,0],[58523,5889.94],[100000,14392.73],[117045,17886.95],[181440,34629.65],[219961,45914.35],[258482,57199.05],[300000,70899.99]])test('CA federal BPA '+income,()=>assert.ok(Math.abs(ca(income).incomeTax-expected)<.005));
test('Germany floors input and tax; joint splitting doubles separately floored tariff',()=>{
 assert.equal(de(50000.99).incomeTax,de(50000).incomeTax);
 assert.equal(de(100001,'joint').incomeTax,2*de(50000).incomeTax);
 assert.equal(de(100001,'joint').unitTaxableIncome,50000);
});
test('Canada BPA uses net income, not taxable income',()=>{
 assert.equal(ca(100000,258482).basicPersonalAmount,14829);
 assert.equal(ca(100000,219961).basicPersonalAmount,15640.5);
 assert.equal(ca(100000).basicPersonalAmount,16452);
 assert.ok(ca(100000,258482).incomeTax>ca(100000).incomeTax);
 assert.equal(ca(1000).basicPersonalCredit,140);
});
test('unsupported cases fail closed',()=>{
 for(const value of [-1,NaN,Infinity,'10000',1e9+1])assert.throws(()=>de(value));
 assert.throws(()=>de(100000,'unknown'));
 assert.throws(()=>ca(100000,99999));
 assert.throws(()=>assessTaxableIncome({country:'CA',taxYear:'2026',taxableIncome:10000,netIncome:10000,fullYearResident:false}));
 assert.throws(()=>assessTaxableIncome({country:'DE',taxYear:'2025',taxableIncome:10000,assessment:'individual'}));
 assert.throws(()=>assessTaxableIncome({country:'DE',taxYear:'2026',taxableIncome:10000,assessment:'individual',grossSalary:10000}));
});
test('both assessment models are preview-only',()=>{
 for(const result of [de(50000),ca(50000)]){assert.equal(result.taxRulesVerified,false);assert.equal(result.sampleOnly,true);assert.equal(result.inputBasis,'taxable-income');assert.ok(result.sourceUrls.length);}
});
