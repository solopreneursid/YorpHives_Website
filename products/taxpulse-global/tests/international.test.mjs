import test from 'node:test';
import assert from 'node:assert/strict';
import {compareInternational} from '../engine/international.mjs';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const first={salary:{country:'US',region:'TX',taxYear:'2026',scopeConfirmed:true,pay:0},housing:100,living:200};
const second={salary:{country:'AE',region:'AE',taxYear:'2026',scopeConfirmed:true,pay:20000,monthlyBasicSalary:16000},housing:5000,living:3000};
const input={first,second,rate:.25,rateDate:'2026-11-25'};
test('independent currencies, living costs and negative disposable income',()=>{
 const r=compareInternational(input);
 assert.equal(r.first.annualDisposable,-3600);
 assert.equal(r.second.annualDisposable,143937);
 assert.equal(r.secondAnnualConverted,35984.25);
 assert.equal(r.annualDifference,39584.25);
 assert.equal(r.higherDisposable,'second');
 assert.equal(r.taxRulesVerified,false);
});
test('reject invalid exchange rates, dates and identical countries',()=>{
 for(const rate of [0,-1,NaN,Infinity,.0000001])assert.throws(()=>compareInternational({...input,rate}));
 assert.throws(()=>compareInternational({...input,rateDate:'2026-02-30'}));
 assert.throws(()=>compareInternational({...input,second:first}));
 assert.throws(()=>compareInternational({...input,first:{...first,housing:-1}}));
});
test('international salary receipt replays',async()=>{
 const engineFingerprint='a'.repeat(64);
 const r=await createReceipt({kind:'international-salary',input,engineFingerprint});
 assert.deepEqual(await verifyReceipt(r,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});
});
