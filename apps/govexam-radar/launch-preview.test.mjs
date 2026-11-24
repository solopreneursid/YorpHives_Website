import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.js';

// Integration tests use a real in-memory SQLite database with deliberately
// mixed source records. They never contact the upstream agencies.
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`CREATE TABLE official_job_notices (id TEXT,source_id TEXT,title TEXT,employer TEXT,country TEXT,region TEXT,stream TEXT,source_page TEXT,published_at TEXT,closing_at TEXT,first_seen_at INTEGER,last_seen_at INTEGER,review_state TEXT,jurisdiction_code TEXT,jurisdiction_name TEXT,government_tier TEXT,employer_type TEXT,life_status TEXT);
 CREATE TABLE notice_revisions (notice_id TEXT,source_id TEXT,observed_at INTEGER,old_title TEXT,new_title TEXT,old_closing_at TEXT,new_closing_at TEXT);
 CREATE TABLE source_ingest_runs (id TEXT,source_id TEXT,started_at INTEGER,finished_at INTEGER,state TEXT,received INTEGER,accepted INTEGER,discarded INTEGER,error_code TEXT,details TEXT);`);
 const now=Date.now(),future=new Date(now+86400000).toISOString(),past=new Date(now-86400000).toISOString();
 const insert=sqlite.prepare('INSERT INTO official_job_notices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
 for(const [id,source,country,region,code,lastSeen,closing] of [
  ['uk-good','uk-dfe-teaching-vacancies','United Kingdom','England','GB-ENG',now,future],
  ['uk-expired','uk-dfe-teaching-vacancies','United Kingdom','England','GB-ENG',now,past],
  ['uk-old','uk-dfe-teaching-vacancies','United Kingdom','England','GB-ENG',now-16*86400000,future],
  ['mb-secret','manitoba-jobs','Canada','Manitoba','CA-MB',now,future],
  ['india-secret','india-employment-news','India','Bihar','IN-BR',now,future]
 ]) insert.run(id,source,id,'Fixture employer',country,region,'Non-technical','https://example.invalid/'+id,past,closing,now-60000,lastSeen,'official_feed_unreviewed',code,region,'national','test','open');
 const revision=sqlite.prepare('INSERT INTO notice_revisions VALUES (?,?,?,?,?,?,?)');
 for(const [id,source] of [['uk-good','uk-dfe-teaching-vacancies'],['mb-secret','manitoba-jobs'],['india-secret','india-employment-news']])revision.run(id,source,now-1000,id,id+' changed',past,future);
 const run=sqlite.prepare('INSERT INTO source_ingest_runs VALUES (?,?,?,?,?,?,?,?,?,?)');
 for(const [source,offset] of [['uk-dfe-teaching-vacancies',1000],['uk-dfe-teaching-vacancies',3601000],['manitoba-jobs',500],['india-employment-news',100]])run.run(source+offset,source,now-offset,now-offset,'ok',1,1,0,null,'{"origin":"scheduled"}');
 const db={prepare(sql){const statement=sqlite.prepare(sql);let params=[];return {bind(...values){params=values;return this;},async all(){return {results:statement.all(...params)};},async first(){return statement.get(...params)||null;},async run(){return {meta:statement.run(...params)};}};}};
 return {sqlite,db};
}
const get=async(db,path,method='GET')=>worker.fetch(new Request('https://preview.example'+path,{method}),{DB:db});

test('every public listing and change query enforces source rights in the database',async()=>{
 const {sqlite,db}=fixture();try{
  for(const suffix of ['','?scope=research','?country=United%20Kingdom&limit=50']){
   const response=await get(db,'/api/notices'+suffix);assert.equal(response.status,200);
   const body=await response.json();assert.equal(body.releaseProfile,'uk_only_release_preview');assert.equal(body.publicLaunchAuthorized,false);
   assert.deepEqual(body.notices.map(x=>x.id),['uk-good']);assert.deepEqual(body.sources.map(x=>x.id),['uk-dfe-teaching-vacancies']);assert.equal(body.total,1);
  }
  for(const query of ['country=Canada','country=India','country=Australia','jurisdiction=IN-BR']){
   const body=await (await get(db,'/api/notices?'+query)).json();assert.equal(body.total,0,query);assert.deepEqual(body.notices,[]);
  }
  assert.equal((await get(db,'/api/notices?source=manitoba-jobs&scope=research')).status,403);
  const changes=await (await get(db,'/api/notice-changes?scope=research')).json();
  assert.deepEqual(changes.changes.map(x=>x.noticeId),['uk-good']);
  assert.deepEqual((await (await get(db,'/api/notice-changes?country=India')).json()).changes,[]);
  const status=await (await get(db,'/api/ingestion-status')).json();
  assert.equal(status.openImportedNotices,1);assert.deepEqual(status.bySource.map(x=>x.sourceId),['uk-dfe-teaching-vacancies']);
  assert.ok(status.latest.every(x=>x.sourceId==='uk-dfe-teaching-vacancies'));
  assert.deepEqual(status.automation.sources.map(x=>x.sourceId),['uk-dfe-teaching-vacancies']);
  assert.equal(status.automation.twoCycleCronGatePassed,true);
 }finally{sqlite.close();}
});

test('paused community blocks new public interactions while retaining authenticated data controls',async()=>{
 const {sqlite,db}=fixture();try{
  for(const path of ['/api/community/register','/api/community/post','/api/community/reply','/api/community/report','/api/community/vote']){
   const response=await get(db,path,'POST');assert.equal(response.status,503,path);assert.equal((await response.json()).error,'community_paused');
  }
  assert.equal((await get(db,'/api/community/posts')).status,503);
  assert.equal((await get(db,'/api/moderation/reports')).status,503);
  assert.equal((await get(db,'/api/community/export')).status,401);
  assert.equal((await get(db,'/api/community/delete-account','POST')).status,401);
  const catalog=await (await get(db,'/api/catalog')).json();assert.deepEqual(catalog.leads,[]);
  for(const path of ['/','/lite']){const html=await (await get(db,path)).text();assert.match(html,/href="\/privacy"/);assert.match(html,/href="\/terms"/);}
  const lite=await (await get(db,'/lite')).text();assert.match(lite,/id="jobs"/);assert.match(lite,/src="\/lite\.js"/);assert.doesNotMatch(lite,/Explore leads from the prototype/);
  for(const path of ['/privacy','/terms']){const r=await get(db,path);assert.equal(r.status,200);assert.match(await r.text(),/connect@yorphives\.com/);}
 }finally{sqlite.close();}
});
