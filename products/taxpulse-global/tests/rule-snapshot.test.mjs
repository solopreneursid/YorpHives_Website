import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {snapshotBytes,verifyRuleSnapshot} from '../engine/rule-snapshot.mjs';
import {calculateRegionalTax,compareIndiaRegimes} from '../engine/taxable-income.mjs';
const regional=JSON.parse(readFileSync(new URL('../rules/regional-versions.json',import.meta.url)));
const indiaSalary=JSON.parse(readFileSync(new URL('../rules/india-salary-versions.json',import.meta.url)));
const hex=b=>Buffer.from(b).toString('hex');
const engineFingerprint='a'.repeat(64),now=new Date('2026-11-25T12:00:00.000Z');
const keys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
const publicKeyHex=hex(await webcrypto.subtle.exportKey('raw',keys.publicKey));
function payload(){return {schemaVersion:1,sequence:1,engineFingerprint,issuedAt:'2026-11-25T00:00:00.000Z',expiresAt:'2026-11-30T00:00:00.000Z',mode:'preview',regional:structuredClone(regional),indiaSalary:structuredClone(indiaSalary),evidence:[...regional.versions,...indiaSalary.versions].map(r=>({version:r.version,sourceUrl:r.sourceUrls[0],sourceDigest:'b'.repeat(64),reviewedAt:'2026-11-24T00:00:00.000Z',fixtureDigest:'c'.repeat(64)}))};}
async function sign(p){const bytes=snapshotBytes(p);return {payload:p,digest:hex(await webcrypto.subtle.digest('SHA-256',bytes)),signature:hex(await webcrypto.subtle.sign('Ed25519',keys.privateKey,bytes))};}
const options={publicKeyHex,engineFingerprint,now};
test('signed snapshot drives actual calculation without code changes',async()=>{const p=payload();const il=p.regional.versions.find(r=>r.jurisdiction==='US-IL');il.rates=[500];const envelope=await sign(p),snapshot=await verifyRuleSnapshot(envelope,options);assert.equal(calculateRegionalTax({country:'US',region:'IL',taxYear:'2026',income:100000,scopeConfirmed:true},snapshot.regional).regionalTax,5000);assert.equal(snapshot.taxRulesVerified,false);});
test('tampering, replay, missing evidence, invalid schema and expired signature rejected',async()=>{const e=await sign(payload());await assert.rejects(verifyRuleSnapshot(e,{...options,minimumSequence:1}));await assert.rejects(verifyRuleSnapshot(e,{...options,now:new Date('2026-12-01T00:00:00Z')}));await assert.rejects(verifyRuleSnapshot(e,{...options,engineFingerprint:'d'.repeat(64)}));const tampered=structuredClone(e);tampered.payload.regional.versions[0].rates[0]=1;await assert.rejects(verifyRuleSnapshot(tampered,options));const p=payload();p.evidence.pop();await assert.rejects(verifyRuleSnapshot(await sign(p),options));const q=payload();q.mode='production';await assert.rejects(verifyRuleSnapshot(await sign(q),options));});
