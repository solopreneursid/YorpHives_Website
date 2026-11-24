import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const doc=JSON.parse(readFileSync(new URL('../ops/affiliate-pilot.json',import.meta.url),'utf8'));
test('affiliate pilot contains no executable referral codes or unverified income',()=>{
 assert.equal(doc.mode,'research-only');
 assert.equal(doc.rules.allowLiveAffiliateLinks,false);
 assert.equal(doc.rules.requiresFounderApplication,true);
 assert.equal(doc.rules.requiresApproval,true);
 assert.equal(doc.rules.requiresIssuedTrackingLink,true);
 assert.equal(doc.rules.requiresDisclosure,true);
 assert.equal(doc.rules.noAutomaticRegistration,true);
 assert.equal(doc.rules.noAutomaticProductionWrites,true);
 assert.equal(doc.rules.noInferredRevenue,true);
 assert.ok(doc.candidates.length>=2&&doc.candidates.length<=5);
 const names=new Set();
 for(const c of doc.candidates){
  assert.match(c.id,/^[a-z0-9-]+$/);
  assert.ok(!names.has(c.id));names.add(c.id);
  assert.equal(c.stage,'not-applied');
  assert.equal(c.trackingUrl,null);
  assert.equal(c.approvedAt,null);
  assert.equal(c.verifiedEarnings,null);
  assert.ok(c.officialUrl.startsWith('https://'));
  assert.ok(c.fit.every(p=>/^tools\/[a-z0-9-]+\/$/.test(p)));
  assert.ok(c.founderAction.length>30);
 }
});
