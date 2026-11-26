import test from 'node:test';
import assert from 'node:assert/strict';
import {regulatoryImpact,classifyObservation,selectEffectiveRule} from '../engine/regulatory-policy.mjs';
import {readFileSync} from 'node:fs';
test('all configured sources have a unique ID, valid jurisdiction and mapped tools',()=>{
 const sources=JSON.parse(readFileSync(new URL('../rules/monitor-sources.json',import.meta.url)));
 assert.equal(new Set(sources.map(s=>s.id)).size,sources.length);
 for(const s of sources){const impact=regulatoryImpact(s);assert.equal(s.country,s.jurisdiction.split('-')[0]);assert.ok(impact.affectedTools.length);assert.equal(new URL(s.url).protocol,'https:');}
});
test('Scotland change affects regional, salary and comparison tools',()=>{
 const s={jurisdiction:'GB-SCT',topics:['regional-tax','income-tax']};
 const a=classifyObservation(s,{status:'review_required',reviewPending:true});
 assert.equal(a.jurisdiction,'GB-SCT');assert.ok(a.affectedTools.includes('salary-offers'));assert.ok(a.affectedTools.includes('regional-tax'));assert.equal(a.automaticActivation,false);
 assert.equal(classifyObservation(s,{status:'fetch_failed',reviewPending:true}).action,'source_unavailable');
 assert.equal(classifyObservation(s,{status:'unchanged',reviewPending:true}).action,'review_required');
 assert.equal(classifyObservation(s,{status:'baseline'}).legalVerification,false);
});
test('approved effective-date versions, no premature activation or regional fallback',()=>{
 const old={jurisdiction:'GB-SCT',component:'income-tax',status:'approved',legalStatus:'enacted',effectiveFrom:'2026-04-06',effectiveUntil:'2027-04-06',version:'1'};
 const next={...old,effectiveFrom:'2027-04-06',effectiveUntil:null,version:'2'};
 const proposed={...next,status:'pending',legalStatus:'proposed',version:'3'};
 const q={jurisdiction:'GB-SCT',component:'income-tax'};
 assert.equal(selectEffectiveRule([old,next,proposed],{...q,onDate:'2027-04-05'}).version,'1');
 assert.equal(selectEffectiveRule([old,next,proposed],{...q,onDate:'2027-04-06'}).version,'2');
 assert.throws(()=>selectEffectiveRule([old,proposed],{...q,onDate:'2027-04-06'}));
 assert.throws(()=>selectEffectiveRule([old,next],{...q,jurisdiction:'GB',onDate:'2026-06-01'}));
 assert.throws(()=>selectEffectiveRule([old,next,{...next,version:'4'}],{...q,onDate:'2027-04-06'}),/Conflicting/);
 assert.throws(()=>selectEffectiveRule([old],{...q,onDate:'2026-02-30'}));
});
