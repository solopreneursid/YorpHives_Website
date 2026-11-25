import test from 'node:test';
import assert from 'node:assert/strict';
import {compareIndiaRegimes} from '../engine/taxable-income.mjs';
import {createReceipt,verifyReceipt} from '../engine/proof.mjs';
const input={country:'IN',taxYear:'2026',grossSalary:1500000,residentIndividual:true,ageGroup:'under-60',ordinarySalaryOnly:true,oldEligibleDeductions:0,newEligibleDeductions:0};
const calc=(extra={})=>compareIndiaRegimes({...input,...extra});
test('ordinary salary regime comparison',()=>{const r=calc();assert.equal(r.oldRegime.incomeTax,257400);assert.equal(r.newRegime.incomeTax,97500);assert.equal(r.lowerTaxRegime,'new');assert.equal(r.taxDifference,159900);assert.equal(r.taxRulesVerified,false);});
test('eligible old-regime deductions can change lower-tax result',()=>{const r=calc({oldEligibleDeductions:950000});assert.equal(r.oldRegime.incomeTax,0);assert.equal(r.lowerTaxRegime,'old');});
test('old resident age allowances and nonresident age exclusion',()=>{const r=calc({grossSalary:450000});assert.equal(r.oldRegime.taxBeforeRebate,7500);assert.equal(calc({grossSalary:450000,ageGroup:'60-79'}).oldRegime.taxBeforeRebate,5000);assert.equal(calc({grossSalary:450000,ageGroup:'80-plus'}).oldRegime.taxBeforeRebate,0);assert.equal(calc({grossSalary:450000,ageGroup:'80-plus',residentIndividual:false}).oldRegime.incomeTax,7800);});
test('rebate thresholds, statutory rounding and marginal relief',()=>{assert.equal(calc({grossSalary:550000}).oldRegime.incomeTax,0);assert.equal(calc({grossSalary:550005}).oldRegime.incomeTax,13000);assert.equal(calc({grossSalary:1275004}).newRegime.incomeTax,0);assert.equal(calc({grossSalary:1275005}).newRegime.incomeTax,10);const r=calc({grossSalary:1285000}).newRegime;assert.equal(r.rebateMarginalRelief,51500);assert.equal(r.incomeTax,10400);});
for(const [threshold,oldBase,newBase,priorRate,oldRate,newRate] of [[5000000,1312500,1080000,0,.1,.1],[10000000,2812500,2580000,.1,.15,.15],[20000000,5812500,5580000,.15,.25,.25],[50000000,14812500,14580000,.25,.37,.25]]){
 test('surcharge boundary at '+threshold,()=>{
 const oldAt=calc({grossSalary:threshold+50000}).oldRegime,newAt=calc({grossSalary:threshold+75000}).newRegime;
 assert.equal(oldAt.taxBeforeRebate,oldBase);assert.equal(newAt.taxBeforeRebate,newBase);
 assert.equal(oldAt.surchargeRate,priorRate);assert.equal(newAt.surchargeRate,priorRate);
 const oldAbove=calc({grossSalary:threshold+50010}).oldRegime,newAbove=calc({grossSalary:threshold+75010}).newRegime;
 assert.equal(oldAbove.surchargeRate,oldRate);assert.equal(newAbove.surchargeRate,newRate);
 assert.ok(oldAbove.surchargeMarginalRelief>0);
 assert.ok(Math.abs(oldAbove.taxAfterRebate+oldAbove.surchargeApplied-(oldAt.taxAfterRebate+oldAt.surchargeApplied+10))<.0001);
 if(newRate>priorRate){assert.ok(newAbove.surchargeMarginalRelief>0);assert.ok(Math.abs(newAbove.taxAfterRebate+newAbove.surchargeApplied-(newAt.taxAfterRebate+newAt.surchargeApplied+10))<.0001);}else assert.equal(newAbove.surchargeMarginalRelief,0);
 });
}
test('surcharge far above transition and final cess',()=>{const r=calc({grossSalary:60075000});assert.equal(r.newRegime.surchargeRate,.25);assert.equal(r.newRegime.surchargeMarginalRelief,0);assert.equal(r.newRegime.incomeTax,22854000);assert.equal(r.oldRegime.surchargeRate,.37);});
test('unsupported cases rejected',()=>{for(const extra of [{grossSalary:-1},{grossSalary:1.01},{grossSalary:NaN},{grossSalary:'10000'},{oldEligibleDeductions:1500000},{newEligibleDeductions:1500000},{ordinarySalaryOnly:false},{ageGroup:'unknown'},{residentIndividual:'yes'},{taxYear:'2025'},{capitalGains:1000}])assert.throws(()=>calc(extra));});
test('receipt replay and tampering',async()=>{const engineFingerprint='a'.repeat(64);const r=await createReceipt({kind:'india-regimes',input,engineFingerprint});assert.deepEqual(await verifyReceipt(r,engineFingerprint),{integrity:true,sameEngine:true,reproduced:true});r.payload.result.taxDifference=1;assert.equal((await verifyReceipt(r,engineFingerprint)).integrity,false);});
