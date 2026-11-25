import test from 'node:test';
import assert from 'node:assert/strict';
import {countryCalculate,catalog} from '../engine/country.mjs';
import {calculateCapitalGain} from '../engine/taxable-income.mjs';
test('legacy capital gains endpoint cannot return misleading estimates',()=>{
 for(const country of ['GB','US','IN'])assert.throws(()=>countryCalculate({country,taxYear:'2026',module:'capgains',parameters:{assetType:'listed_equity',salePrice:20000,purchasePrice:10000,holdingMonths:12}}),/Legacy capital gains disabled/);
 assert.ok(!catalog().modules.includes('capgains'));
 assert.ok(catalog().disabledModules.capgains);
});
test('UK scoped disposal rate is independent of holding period',()=>{
 const input={country:'GB',taxYear:'2026',disposed:'2026-06-01',saleProceeds:20000,adjustedBasis:10000,eligibleLosses:0,otherTaxableIncome:37700,scopeConfirmed:true};
 for(const acquired of ['2026-05-01','2020-05-01']){
 const r=calculateCapitalGain({...input,acquired});
 assert.equal(r.holding,'not-rate-determining');
 assert.equal(r.estimatedGainTax,1680);
 }
});
