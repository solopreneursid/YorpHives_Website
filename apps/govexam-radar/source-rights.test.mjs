import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {OFFICIAL_SOURCE_RIGHTS,sourceRights,assertSourceRightsForCommercialRelease} from "./source-rights.mjs";
const uk="uk-dfe-teaching-vacancies",mb="manitoba-jobs",india="india-employment-news";
test("source licence decisions are bounded and never assume one government's licence covers another",()=>{
 assert.equal(OFFICIAL_SOURCE_RIGHTS.length,3);
 assert.equal(new Set(OFFICIAL_SOURCE_RIGHTS.map(x=>x.id)).size,3);
 const dfe=sourceRights(uk),manitoba=sourceRights(mb),blocked=sourceRights(india);
 assert.equal(dfe.reuseStatus,"conditional_open_licence");
 assert.equal(dfe.commercialReuseApprovedForCurrentFields,true);
 assert.match(dfe.note,/no fees or commission/i);
 assert.match(dfe.attribution,/Open Government Licence v3\.0/);
 assert.equal(manitoba.reuseStatus,"source_specific_review_required");
 assert.equal(manitoba.commercialReuseApprovedForCurrentFields,false);
 assert.match(manitoba.note,/Public Service Commission/);
 assert.match(manitoba.termsUrl,/csc\/aboutpsc\/disclaim/);
 assert.equal(blocked.reuseStatus,"not_approved");
 assert.equal(blocked.commercialReuseApprovedForCurrentFields,false);
 assert.equal(sourceRights("untrusted-source"),null);
 for(const policy of OFFICIAL_SOURCE_RIGHTS){
  for(const field of ["licenceUrl","termsUrl","officialSourceUrl"]){
   assert.equal(new URL(policy[field]).protocol,"https:");
  }
 }
});
test("commercial release gate fails closed on Manitoba, India and unknown source",()=>{
 assert.equal(assertSourceRightsForCommercialRelease([uk]),true);
 assert.throws(()=>assertSourceRightsForCommercialRelease([uk,mb]),/commercial_reuse_review_pending:manitoba-jobs/);
 assert.throws(()=>assertSourceRightsForCommercialRelease([india]),/commercial_reuse_review_pending/);
 assert.throws(()=>assertSourceRightsForCommercialRelease(["unknown"]),/unknown_official_source/);
 assert.throws(()=>assertSourceRightsForCommercialRelease([]),/source_set_required/);
});
test("UI limits Open Government Licence to UK and explicitly labels Manitoba source-specific review",async()=>{
 const code=await readFile(new URL("./official-ui.mjs",import.meta.url),"utf8");
 assert.match(code,/UK DfE listings: contains public sector information licensed under/);
 assert.match(code,/Manitoba: official RSS factual summaries/);
 assert.match(code,/source-specific commercial reuse under review/);
 assert.match(code,/India import disabled/);
 assert.doesNotMatch(code,/Contains public sector information licensed under the/);
});
