import test from 'node:test';
import assert from 'node:assert/strict';
import { compareIncomeScenarios } from '../engine/scenarios.mjs';
import { countryCalculate } from '../engine/country.mjs';
const input={country:'IN',taxYear:'2026',parameters:{grossSalary:1275000,residentIndividual:true},secondGrossSalary:1285000};
test('sample salary comparison preserves canonical tax output and exposes marginal relief effect',()=>{
 const r=compareIncomeScenarios(input);
 assert.equal(r.sampleOnly,true);assert.equal(r.taxRulesVerified,false);
 assert.equal(r.grossChange,10000);assert.ok(Math.abs(r.taxChange-10400)<.005);
 assert.ok(Math.abs(r.afterIncomeTaxChange+400)<.005);
 assert.ok(Math.abs(r.effectiveTaxOnChange-1.04)<.00001);
 assert.deepEqual(r.second,countryCalculate({country:'IN',taxYear:'2026',module:'pit',parameters:{grossSalary:1285000,residentIndividual:true}}));
 assert.equal(input.parameters.grossSalary,1275000);
});
test('same salary returns zero changes without dividing by zero',()=>{
 const r=compareIncomeScenarios({...input,secondGrossSalary:1275000});
 assert.equal(r.effectiveTaxOnChange,null);assert.equal(r.taxChange,0);assert.equal(r.afterIncomeTaxChange,0);
});
test('salary decrease is represented with signed differences',()=>{
 const r=compareIncomeScenarios({...input,parameters:{...input.parameters,grossSalary:1285000},secondGrossSalary:1275000});
 assert.equal(r.grossChange,-10000);assert.ok(Math.abs(r.taxChange+10400)<.005);
});
test('unsupported country and missing residency are rejected',()=>{
 assert.throws(()=>compareIncomeScenarios({...input,country:'DE'}));
 assert.throws(()=>compareIncomeScenarios({...input,parameters:{grossSalary:1}}));
});
test('invalid second salary is rejected',()=>{
 for(const v of [null,undefined,NaN,Infinity,-1,'1000',1e9+1])assert.throws(()=>compareIncomeScenarios({...input,secondGrossSalary:v}));
});
test('comparison maintains US filing status',()=>{
 const r=compareIncomeScenarios({country:'US',taxYear:'2026',parameters:{grossSalary:100000,filingStatus:'mfj'},secondGrossSalary:110000});
 assert.equal(r.first.result.filingStatus,'mfj');assert.equal(r.second.result.filingStatus,'mfj');
});
