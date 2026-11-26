import test from 'node:test';
import assert from 'node:assert/strict';
import {negotiateSalary} from '../engine/negotiation.mjs';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const current={country:'AE',region:'AE',taxYear:'2026',pay:20000,monthlyBasicSalary:16000,scopeConfirmed:true};
test('negotiation target preserves fixed assumptions',()=>{
 const r=negotiateSalary({current,monthlyIncrease:1000});
 assert.equal(r.found,true);
 assert.equal(r.proposed.annualGross,252000);
 assert.equal(r.netIncrease,1000);
 assert.equal(r.grossIncrease,12000);
 assert.equal(r.grossIncreasePercent,.05);
});
test('invalid and impossible targets are distinguished',()=>{
 for(const monthlyIncrease of [0,-1,NaN,1.001])assert.throws(()=>negotiateSalary({current,monthlyIncrease}));
 const r=negotiateSalary({current,monthlyIncrease:1000000});
 assert.equal(r.found,false);
 assert.equal(r.search.searchComplete,true);
});
test('negotiation receipt reproduces',async()=>{
 const engineFingerprint='a'.repeat(64);
 const r=await createReceipt({kind:'salary-negotiation',input:{current,monthlyIncrease:1000},engineFingerprint});
 assert.deepEqual(await verifyReceipt(r,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});
});
