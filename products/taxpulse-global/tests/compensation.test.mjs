import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCompensation} from '../engine/compensation.mjs';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const first={country:'AE',region:'AE',taxYear:'2026',scopeConfirmed:true,pay:20000,monthlyBasicSalary:16000};
const second={...first,pay:21000};
const empty={retirement:0,insurance:0,otherBenefits:0,commuting:0,otherExpenses:0};
const input={first,second,firstExtras:{...empty,insurance:20000},secondExtras:{...empty,commuting:3000}};
test('non-cash benefits cannot inflate spendable income',()=>{
 const r=compareCompensation(input);
 assert.equal(r.first.annualAvailableCash,239937);
 assert.equal(r.second.annualAvailableCash,248937);
 assert.equal(r.annualCashDifference,9000);
 assert.equal(r.annualCombinedValueDifference,-11000);
});
test('expenses can exceed available salary',()=>{
 const r=compareCompensation({...input,firstExtras:{...empty,commuting:300000}});
 assert.equal(r.first.annualAvailableCash,-60063);
});
test('invalid benefit inputs are rejected',()=>{
 for(const v of [-1,NaN,1.001,Infinity,'100'])assert.throws(()=>compareCompensation({...input,firstExtras:{...empty,insurance:v}}));
 assert.throws(()=>compareCompensation({...input,firstExtras:{...empty,unexpected:1}}));
});
test('compensation receipt replays',async()=>{
 const engineFingerprint='a'.repeat(64);
 const r=await createReceipt({kind:'compensation',input,engineFingerprint});
 assert.deepEqual(await verifyReceipt(r,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});
});
