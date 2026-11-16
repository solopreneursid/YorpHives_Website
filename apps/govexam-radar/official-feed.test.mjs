import test from "node:test";
import assert from "node:assert/strict";
import {normalizeOfficialJob,parseOfficialFeed,ingestDfE,DFE_SOURCE,serveOfficialNotices} from "./official-feed.mjs";
const clock=Date.parse("2026-11-16T12:00:00Z");
function sample(extra={}){
 return {"@type":"JobPosting",title:"ICT Support Technician",datePosted:"2026-11-10",
 validThrough:"2026-11-27T12:00:00Z",
 url:"https://teaching-vacancies.service.gov.uk/jobs/ict-support-technician-test-school",
 hiringOrganization:{"@type":"Organization",name:"Test School"},
 jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressLocality:"Leeds",addressRegion:"Yorkshire"}},
 occupationalCategory:"ICT Support",...extra};
}
function dbMock(){
 const batches=[],runs=[],cursorChanges=[],expiry=[];
 return {
  batches,runs,cursorChanges,expiry,
  prepare(sql){
   let args=[];return{
    bind(...a){args=a;return this;},
    async first(){if(sql.includes("source_feed_cursors"))return{next_page:1,last_total_pages:30};return {total:0};},
    async all(){return {results:[]};},
    async run(){
     if(sql.includes("source_ingest_runs"))runs.push({sql,args});
     if(sql.includes("source_feed_cursors"))cursorChanges.push({sql,args});
     if(sql.includes("SET life_status='expired'"))expiry.push({sql,args});
     return{success:true,meta:{changes:1}};
    }
   };
  },
  async batch(statements){batches.push(statements);return Promise.all(statements.map(x=>x.run()));}
 };
}
test("normalizes DfE Schema.org JobPosting and keeps explicit official provenance",()=>{
 const x=normalizeOfficialJob(sample(),clock);
 assert.equal(x.sourceId,DFE_SOURCE.id);
 assert.equal(x.title,"ICT Support Technician");
 assert.equal(x.stream,"Technical");
 assert.equal(x.employer,"Test School");
 assert.equal(x.region,"Yorkshire");
 assert.equal(x.closingAt,"2026-11-27T12:00:00.000Z");
 assert.equal(x.reviewState,"official_feed_unreviewed");
 assert.match(x.sourceRef,/^https:\/\/teaching-vacancies\.service\.gov\.uk\/jobs\//);
});
test("rejects unrelated domains, overdrawn closing dates and future publication",()=>{
 assert.equal(normalizeOfficialJob(sample({url:"https://fraud.example/jobs/bait"}),clock).error,"non_official_url");
 assert.equal(normalizeOfficialJob(sample({url:"https://teaching-vacancies.service.gov.uk.evil.invalid/jobs/bait"}),clock).error,"non_official_url");
 assert.equal(normalizeOfficialJob(sample({url:"http://teaching-vacancies.service.gov.uk/jobs/bait"}),clock).error,"non_official_url");
 assert.equal(normalizeOfficialJob(sample({validThrough:"2026-11-15"}),clock).error,"already_closed");
 assert.equal(normalizeOfficialJob(sample({datePosted:"2026-12-15"}),clock).error,"invalid_published_date");
 assert.equal(normalizeOfficialJob(sample({title:"",hiringOrganization:{name:"Test School"}}),clock).error,"missing_required_fields");
 assert.equal(normalizeOfficialJob({title:"not a JobPosting"},clock).error,"not_jobposting");
});
test("discards duplicated or ineligible upstream records and keeps pagination metadata",()=>{
 const p=parseOfficialFeed({data:[
  sample(),sample(),sample({title:"expired",validThrough:"2026-11-15"}),
  sample({title:"Not official",url:"https://evil.example/job/fake"})
 ],meta:{totalPages:42}},clock);
 assert.equal(p.valid.length,1);assert.equal(p.received,4);assert.equal(p.totalPages,42);
 assert.equal(p.rejected.duplicate,1);assert.equal(p.rejected.already_closed,1);assert.equal(p.rejected.non_official_url,1);
 assert.throws(()=>parseOfficialFeed({data:{}},clock),/unsupported_feed_schema/);
 assert.throws(()=>parseOfficialFeed({data:Array(101).fill(sample())},clock),/feed_page_too_large/);
});
test("scheduled ingestion persists approved feed records with audit and advances cursor only on success",async()=>{
 const db=dbMock();
 const fetcher=async()=>new Response(JSON.stringify({data:[sample(),sample({title:"Expired notice",validThrough:"2026-11-14"})],meta:{totalPages:10}}),{headers:{"content-type":"application/json"}});
 const out=await ingestDfE(db,fetcher,clock);
 assert.equal(out.state,"ok");assert.equal(out.received,2);assert.equal(out.accepted,1);assert.equal(out.discarded,1);
 assert.equal(db.batches.length,1);assert.equal(db.batches[0].length,1);
 assert.equal(db.cursorChanges.length,1);assert.equal(db.cursorChanges[0].args[1],2);
 assert.equal(db.runs.length,1);assert.equal(db.expiry.length,1);
});
test("network error never fabricates notices or advances cursor",async()=>{
 const db=dbMock();
 const out=await ingestDfE(db,async()=>new Response("unavailable",{status:429,headers:{"content-type":"text/plain"}}),clock);
 assert.equal(out.state,"error");assert.equal(out.errorCode,"http_429");assert.equal(out.accepted,0);
 assert.equal(db.cursorChanges.length,0);assert.equal(db.batches.length,0);assert.equal(db.runs.length,1);
});
test("API refuses to fabricate job records when storage is absent",async()=>{
 const r=await serveOfficialNotices(null,new URLSearchParams());
 assert.equal(r.status,503);assert.equal((await r.json()).notices.length,0);
});
