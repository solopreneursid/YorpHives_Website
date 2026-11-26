import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSalaryOffers} from '../engine/salary-offers.mjs';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const profile={country:'AE',region:'AE',taxYear:'2026',scopeConfirmed:true,monthlyBasicSalary:16000};
const first={...profile,pay:20000},second={...profile,pay:21000,monthlyBasicSalary:16000.01};
test('offers use independent contribution bases and exact minor-unit differences',()=>{
 const r=compareSalaryOffers({first,second});
 assert.equal(r.annualDifference,11937);
 assert.equal(r.averageMonthlyDifference,994.75);
 assert.equal(r.higherRemainder,'second');
 assert.equal(compareSalaryOffers({first:second,second:first}).higherRemainder,'first');
 assert.equal(compareSalaryOffers({first,second:first}).higherRemainder,'equal');
});
test('reject mismatched jurisdiction and invalid second offer',()=>{
 assert.throws(()=>compareSalaryOffers({first,second:{country:'US',region:'TX',taxYear:'2026',scopeConfirmed:true,pay:100000}}));
 assert.throws(()=>compareSalaryOffers({first,second:{...second,scopeConfirmed:false}}));
 assert.throws(()=>compareSalaryOffers({first,second:{...second,monthlyBasicSalary:22000}}));
});
test('comparison receipt reproduces and detects changed results',async()=>{
 const engineFingerprint='a'.repeat(64);
 const r=await createReceipt({kind:'salary-offers',input:{first,second},engineFingerprint});
 assert.deepEqual(await verifyReceipt(r,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});
 r.payload.result.annualDifference=0;
 assert.equal((await verifyReceipt(r,engineFingerprint)).integrity,false);
});
