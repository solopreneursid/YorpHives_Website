import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateSalaryRemainder} from '../engine/taxable-income.mjs';
import {countryCalculate} from '../engine/country.mjs';
const app=readFileSync(new URL('../staging/integrated/application.js',import.meta.url),'utf8');
const start=app.indexOf('const TAX_RULES ='),end=app.indexOf('\n    };',start)+7;
const fn=app.indexOf('function calculateTaxForCountry('),fnEnd=app.indexOf('\n    /**',fn);
assert.ok(start>=0&&end>start&&fn>=0&&fnEnd>fn);
const ctx=vm.createContext({formatCurrency:value=>String(value),formatActiveDisplay:value=>String(value)});
new vm.Script(app.slice(start,end)+'\n'+app.slice(fn,fnEnd)).runInContext(ctx,{timeout:1000});
const samples=[[12570,0],[50270,7540],[100000,27432],[110000,33432],[125140,42516],[130000,44703],[150000,53703]];
for(const [gross,tax] of samples)test('UK ordinary income '+gross,()=>{
 const backend=countryCalculate({country:'GB',taxYear:'2026',module:'pit',parameters:{grossSalary:gross}});
 const front=ctx.calculateTaxForCountry('GB','uk_standard',gross,0);
 assert.ok(Math.abs(backend.result.incomeTax-tax)<1e-7);
 assert.ok(Math.abs(front.finalIncomeTax-tax)<1e-7);
 assert.ok(Math.abs(front.bracketRows.reduce((a,b)=>a+b.taxableInTier,0)-front.taxableIncome)<1e-7);
});
test('US OASDI ceiling matches official 2026 maximum',()=>{
 const r=calculateSalaryRemainder({country:'US',region:'TX',taxYear:'2026',pay:200000,scopeConfirmed:true});
 assert.equal(r.contributions.find(c=>c.name==='Social Security').amount,11439);
});

test('2026 US head-of-household higher-rate boundary is correct in UI and backend', () => {
 const gross=225900;
 const backend=countryCalculate({country:'US',taxYear:'2026',module:'pit',
   parameters:{grossSalary:gross,filingStatus:'hoh'}});
 const front=ctx.calculateTaxForCountry('US','hoh',gross,0);
 assert.ok(Math.abs(backend.result.incomeTax-39207)<0.005);
 assert.ok(Math.abs(front.finalIncomeTax-39207)<0.005);
});

test('India 2026 resident salary marginal relief has frontend/API parity', () => {
 // Original frontend assumes a resident salaried individual for its sample.
 const gross = 1285000;
 const backend = countryCalculate({
   country: 'IN', taxYear: '2026', module: 'pit',
   parameters: { grossSalary: gross, residentIndividual: true }
 });
 const frontend = ctx.calculateTaxForCountry('IN', 'new_regime', gross, 0);
 assert.ok(Math.abs(backend.result.taxBeforeRebate - 61500) < 0.005);
 assert.ok(Math.abs(backend.result.marginalReliefApplied - 51500) < 0.005);
 assert.ok(Math.abs(backend.result.incomeTax - frontend.finalIncomeTax) < 0.005);
});
