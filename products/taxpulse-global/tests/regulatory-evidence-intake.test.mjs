import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCollectorToken,acceptIndependentReport,createEvidenceIntake,AUDIENCE} from '../engine/regulatory-evidence-intake.mjs';
import {updateReviewQueue} from '../engine/regulatory-review-queue.mjs';
const now=new Date('2026-11-26T03:30:00Z'),sec=now.getTime()/1000;
const repo='solopreneursid/YorpHives_Website',ref='refs/heads/hqventures/taxpulse-global';
const claims={iss:'https://token.actions.githubusercontent.com',aud:AUDIENCE,repository_id:'1457876727',repository:repo,ref,event_name:'push',workflow_ref:repo+'/.github/workflows/taxpulse-staging.yml@'+ref,iat:sec-5,nbf:sec-5,exp:sec+300,run_id:'12345'};
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test',alg:'RS256'};
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
async function token(p){const content=b64({alg:'RS256',kid:'test'})+'.'+b64(p);const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(content));return content+'.'+Buffer.from(sig).toString('base64url');}
const opts={now:now.getTime(),fetcher:async url=>{assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return Response.json({keys:[jwk]});}};
test('only matching signed workflow identity is accepted',async()=>{
 assert.deepEqual(await verifyCollectorToken(await token(claims),opts),{runId:'12345'});
 for(const patch of [{aud:'other'},{repository_id:'1'},{event_name:'pull_request'},{ref:'refs/heads/main'},{workflow_ref:'other'},{exp:sec-1}])await assert.rejects(verifyCollectorToken(await token({...claims,...patch}),opts));
 const signed=await token(claims);const parts=signed.split('.');parts[2]=Buffer.alloc(256).toString('base64url');await assert.rejects(verifyCollectorToken(parts.join('.'),opts));
});
const source={id:'SG-8',jurisdiction:'SG',url:'https://www.iras.gov.sg/example'};
const config=[source],stamp='2026-11-26T03:00:00Z',digest='a'.repeat(64);
const row={...source,checkedAt:stamp,status:'baseline',sha256:digest,resolvedUrl:source.url,extractionStatus:'candidate',candidate:{jurisdiction:'SG',component:'national-assessment',parameters:{bounds:[20000],rates:[0,200]},status:'candidate',automaticActivation:false,sourceDigest:digest},ruleChangesApplied:false,automaticActivation:false,legalVerification:false};
const report={schemaVersion:1,mode:'review_only',checkedAt:stamp,automaticRuleChanges:false,sources:[row]};
function state(){const data=new Map();return {data,kv:{get:async k=>data.has(k)?JSON.parse(data.get(k)):null,put:async(k,v)=>data.set(k,v)}};}
test('intake writes evidence only and rejects tampered scope, stale data and activation',async()=>{
 const {kv,data}=state();assert.equal((await acceptIndependentReport(kv,config,report,{runId:'1'},{now})).state,'accepted');assert.deepEqual([...data.keys()],['independent-latest']);
 assert.equal((await acceptIndependentReport(kv,config,report,{runId:'2'},{now})).state,'already_observed');
 for(const patch of [{automaticRuleChanges:true},{checkedAt:'2026-11-25T03:00:00Z'},{sources:[{...row,resolvedUrl:'https://example.com/'}]},{sources:[{...row,legalVerification:true}]}])await assert.rejects(acceptIndependentReport(kv,config,{...report,...patch},{runId:'2'},{now}));
});
test('review queue preserves unresolved findings across outages and matching observations',async()=>{
 const {kv,data}=state();await kv.put('independent-latest',JSON.stringify(report));
 const first=await updateReviewQueue(kv,config,{now});assert.equal(first.entries[0].status,'pending_review');assert.ok(first.entries[0].reasons.includes('candidate_review'));
 await kv.put('latest',JSON.stringify({...report,sources:[{...row,candidate:{...row.candidate,parameters:{bounds:[20000],rates:[0,300]}}}]}));
 const second=await updateReviewQueue(kv,config,{now});assert.equal(second.conflictingCandidates,1);assert.ok(second.entries[0].reasons.includes('candidate_conflict'));
 data.delete('latest');data.delete('independent-latest');const third=await updateReviewQueue(kv,config,{now});assert.ok(third.entries[0].reasons.includes('candidate_conflict'));assert.equal(third.automaticRuleChanges,false);
});
test('unauthenticated intake has no storage access',async()=>{const w=createEvidenceIntake(config);const r=await w.fetch(new Request('https://example.com/v1/evidence',{method:'POST',body:'{}'}),{});assert.equal(r.status,401);assert.equal((await w.fetch(new Request('https://example.com/v1/evidence'),{})).status,404);});
