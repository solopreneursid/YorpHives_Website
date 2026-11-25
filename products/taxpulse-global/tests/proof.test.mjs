import test from 'node:test';
import assert from 'node:assert/strict';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const engineFingerprint='a'.repeat(64);
const input={country:'GB',taxYear:'2026',parameters:{grossSalary:130000}};
test('same inputs produce stable integrity receipt and replay',async()=>{
 const a=await createReceipt({kind:'salary',input,engineFingerprint});
 const b=await createReceipt({kind:'salary',input:{parameters:{grossSalary:130000},taxYear:'2026',country:'GB'},engineFingerprint});
 assert.deepEqual(a,b);assert.equal(a.signature,null);assert.equal(a.payload.verified,false);
 assert.deepEqual(await verifyReceipt(a,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});
 assert.deepEqual(await verifyReceipt(a,'b'.repeat(64)),{integrity:true,sameEngine:false,reproduced:false});
 const tampered=structuredClone(a);tampered.payload.result.result.incomeTax=0;
 assert.deepEqual(await verifyReceipt(tampered,engineFingerprint),{integrity:false,sameEngine:false,reproduced:false});
});
test('taxable-income receipt reproduces German tariff',async()=>{
 const r=await createReceipt({kind:'taxable-income',input:{country:'DE',taxYear:'2026',taxableIncome:50000,assessment:'individual'},engineFingerprint});
 assert.equal(r.payload.result.incomeTax,10548);
 assert.equal((await verifyReceipt(r,engineFingerprint)).reproduced,true);
});
test('invalid receipts and unsafe values fail closed',async()=>{
 await assert.rejects(()=>createReceipt({kind:'unknown',input,engineFingerprint}));
 await assert.rejects(()=>createReceipt({kind:'salary',input,engineFingerprint:'fake'}));
 await assert.rejects(()=>createReceipt({kind:'salary',input:{...input,parameters:{grossSalary:NaN}},engineFingerprint}));
 await assert.rejects(()=>verifyReceipt({},engineFingerprint));
 const r=await createReceipt({kind:'salary',input,engineFingerprint});
 await assert.rejects(()=>verifyReceipt({...r,signature:'fake'},engineFingerprint));
});

test('reverse salary reports replay automatic and manual calculations',async()=>{
 const input={profile:{country:'AE',region:'AE',taxYear:'2026',scopeConfirmed:true,monthlyBasicSalary:16000},target:19994.75,period:'monthly'};
 for(const [kind,parameters] of [['automatic-reverse-salary',input],['reverse-salary',{...input,minPay:19990,maxPay:20010}]]){
  const receipt=await createReceipt({kind,input:parameters,engineFingerprint});
  assert.equal(receipt.payload.result.requiredPay,20000);
  assert.deepEqual(await verifyReceipt(receipt,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});
  assert.deepEqual(await verifyReceipt(receipt,'b'.repeat(64)),{integrity:true,sameEngine:false,reproduced:false});
  const tampered=structuredClone(receipt);tampered.payload.result.requiredPay=1;
  assert.equal((await verifyReceipt(tampered,engineFingerprint)).integrity,false);
 }
 await assert.rejects(()=>createReceipt({kind:'reverse-salary',input:{...input,minPay:19990,maxPay:19999},engineFingerprint}));
});
