import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPublishedCatalog} from '../functions/_lib/catalog-source.mjs';
import {growthReport} from '../functions/_lib/growth.mjs';
import {publicReport} from '../functions/_lib/insights.mjs';
const items=[{type:'tool',name:'Word Counter',description:'Count words',url:'tools/word-counter/',published:true}];
const db={prepare:sql=>({bind:()=>({all:async()=>{
 if(sql.includes('daily_completions'))return {results:[]};
 if(sql.includes('daily_pageviews'))return {results:[]};
 if(sql.includes('visitor_sessions'))return {results:[{total:0}]};
 return {results:[]};
}})})};
test('versioned Worker ASSETS catalog loads without recursive public fetch',async()=>{
 const seen=[];
 const env={ASSETS:{fetch:async url=>{seen.push(String(url));return Response.json({items})}}};
 const request=new Request('https://isolated-pilot.workers.dev/api/insights/growth');
 const got=await loadPublishedCatalog(request,env);
 assert.equal(got.length,1);
 assert.deepEqual(seen,['https://isolated-pilot.workers.dev/catalog.json']);
});
test('Growth endpoint works with Workers binding on staging and empty legitimate data',async()=>{
 const request=new Request('https://isolated-pilot.workers.dev/api/insights/growth');
 const env={ASSETS:{fetch:async()=>Response.json({items})},INSIGHTS_DB:db};
 const response=await growthReport({request,env});
 assert.equal(response.status,200);
 const report=await response.json();
 assert.equal(report.available,true);
 assert.equal(report.periodDays,30);
 assert.equal(report.daily.length,30);
 assert.equal(report.revenue.amount,null);
});
test('Public insights work with Workers versioned catalog and empty traffic',async()=>{
 const request=new Request('https://isolated-pilot.workers.dev/api/insights/public');
 const env={ASSETS:{fetch:async()=>Response.json({items})},INSIGHTS_DB:db};
 const response=await publicReport({request,env});
 assert.equal(response.status,200);
 assert.equal((await response.json()).available,true);
});
test('Catalog fetch fails closed on malformed or oversized assets',async()=>{
 const request=new Request('https://isolated-pilot.workers.dev/api/insights/public');
 await assert.rejects(loadPublishedCatalog(request,{ASSETS:{fetch:async()=>Response.json({wrong:[]})}}));
 await assert.rejects(loadPublishedCatalog(request,{ASSETS:{fetch:async()=>new Response('a'.repeat(700001))}}));
});
