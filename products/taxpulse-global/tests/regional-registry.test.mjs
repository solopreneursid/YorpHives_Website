import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateRegionalTax} from '../engine/taxable-income.mjs';
import {validateRegionalRegistry,resolveRegionalRule} from '../engine/regional-registry.mjs';
const baseline=JSON.parse(readFileSync(new URL('../rules/regional-versions.json',import.meta.url)));
const input={country:'US',region:'IL',taxYear:'2026',income:100000,scopeConfirmed:true};
test('rate-only edit changes result without editing engine',()=>{
 const data=structuredClone(baseline);
 const r=data.versions.find(x=>x.jurisdiction==='US-IL');
 assert.equal(calculateRegionalTax(input).regionalTax,4950);
 r.rates=[500];r.version='US-IL-synthetic-fixture';
 const result=calculateRegionalTax(input,data);
 assert.equal(result.regionalTax,5000);assert.equal(result.ruleId,r.version);assert.equal(result.taxRulesVerified,false);
 assert.equal(calculateRegionalTax(input).regionalTax,4950);
});
test('new full-year rule is selected only for requested year',()=>{
 const data=structuredClone(baseline);
 const r=data.versions.find(x=>x.jurisdiction==='US-IL');
 data.versions.push({...r,taxYear:'2027',version:'US-IL-synthetic-2027',effectiveFrom:'2027-01-01',effectiveUntil:'2028-01-01',rates:[510]});
 assert.equal(calculateRegionalTax({...input,taxYear:'2027'},data).regionalTax,5100);
 assert.equal(calculateRegionalTax(input,data).regionalTax,4950);
 assert.throws(()=>calculateRegionalTax({...input,taxYear:'2028'},data));
});
test('invalid rates, overlapping versions, partial-year transitions and wrong jurisdictions are rejected',()=>{
 const data=structuredClone(baseline);
 const r=data.versions.find(x=>x.jurisdiction==='US-IL');r.rates=[10001];
 assert.throws(()=>validateRegionalRegistry(data));
 r.rates=[495];r.effectiveFrom='2026-07-01';
 assert.throws(()=>resolveRegionalRule(input,data));
 r.effectiveFrom='2026-01-01';data.versions.push({...r,version:'duplicate-period'});
 assert.throws(()=>validateRegionalRegistry(data));
 assert.throws(()=>calculateRegionalTax({...input,region:'ZZ'}));
});
