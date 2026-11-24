import test from 'node:test';
import assert from 'node:assert/strict';
import edge from '../edge/worker.mjs';

function database(lastCleanup){
 const statements=[];
 return {
  statements,
  prepare(sql){
   return {
    first:async()=>lastCleanup?{day:lastCleanup}:null,
    bind(...args){
     return {
      all:async()=>({results:sql.includes('visitor_sessions')?[{total:0}]:[]}),
      run:async()=>{statements.push({sql,args});return {success:true};}
     };
    }
   };
  }
 };
}
const request=()=>new Request('https://yorphives.com/api/insights/public');
const assets={fetch:async()=>Response.json({items:[]})};

test('the production Worker schedules the existing 35-day analytics cleanup',async()=>{
 const db=database('2000-01-01'),pending=[];
 const execution={waitUntil(promise){pending.push(promise)}};
 const response=await edge.fetch(request(),{INSIGHTS_DB:db,ASSETS:assets},execution);
 assert.equal(response.status,200);
 assert.equal(pending.length,1);
 await Promise.all(pending);
 const deleted=db.statements.filter(x=>x.sql.startsWith('DELETE FROM '));
 assert.deepEqual(deleted.map(x=>x.sql.match(/^DELETE FROM (\w+)/)[1]).sort(),
  ['daily_completions','daily_pageviews','event_dedupe','visitor_sessions']);
 const cutoff=new Date(Date.now()-35*86400000).toISOString().slice(0,10);
 assert.ok(deleted.every(x=>x.args[0]===cutoff));
 assert.ok(db.statements.some(x=>x.sql.includes('INSERT INTO cleanup_log')));
});

test('the cleanup remains once per UTC day',async()=>{
 const db=database(new Date().toISOString().slice(0,10)),pending=[];
 const response=await edge.fetch(request(),{INSIGHTS_DB:db,ASSETS:assets},{waitUntil(p){pending.push(p)}});
 assert.equal(response.status,200);
 await Promise.all(pending);
 assert.deepEqual(db.statements,[]);
});
