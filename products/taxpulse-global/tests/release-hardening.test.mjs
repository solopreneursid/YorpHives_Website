import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
import {calculateSalaryRemainder} from '../engine/taxable-income.mjs';
import {reverseSalary,automaticReverseSalary} from '../engine/reverse-salary.mjs';
import {assertProductionReady} from '../engine/release-gate.mjs';
const profile={country:'US',region:'TX',taxYear:'2026',scopeConfirmed:true};
test('bounded worst-case reverse salary workload',()=>{
 const start=performance.now();
 const result=reverseSalary({profile,target:1000000,period:'annual',minPay:0,maxPay:10000});
 const elapsed=performance.now()-start;
 assert.equal(result.found,false);
 assert.throws(()=>reverseSalary({profile,target:1000000,period:'annual',minPay:0,maxPay:10001}));
 console.log('10,001 candidate search milliseconds:',elapsed.toFixed(2));
 assert.ok(elapsed<5000,'Reverse search exceeded generous CI regression budget');
});
test('repeatable forward calculations and recovery after invalid input',()=>{
 const expected=calculateSalaryRemainder({...profile,pay:100000});
 const start=performance.now();
 for(let i=0;i<1000;i++){
  assert.throws(()=>calculateSalaryRemainder({...profile,pay:-1}));
  assert.deepEqual(calculateSalaryRemainder({...profile,pay:100000}),expected);
 }
 console.log('1,000 valid and invalid calculation pairs milliseconds:',(performance.now()-start).toFixed(2));
});
test('production gate refuses current manifest and forged country flags',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../rules/manifest.json',import.meta.url),'utf8'));
 assert.throws(()=>assertProductionReady(manifest),/Production release not authorized/);
 const modified=structuredClone(manifest);
 modified.releaseMode='production';
 for(const row of Object.values(modified.countries)){row.verification='verified';row.productionEnabled=true;}
 assert.throws(()=>assertProductionReady(modified));
});
test('automatic salary search reports impossible target without unbounded work',()=>{
 const result=automaticReverseSalary({profile,target:1000000,period:'annual'});
 assert.equal(result.found,false);assert.equal(result.searchComplete,true);
});
