import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validRoute} from '../functions/_lib/insights.mjs';
import {buildGrowthReport} from '../functions/_lib/growth.mjs';

test('pageview route accepts published-style Free Tools path but rejects malformed inputs',()=>{
 assert.equal(validRoute('tool'),true,'historical aggregate retained');
 assert.equal(validRoute('tools/word-counter/'),true);
 assert.equal(validRoute('tools/pdf-compressor/'),true);
 for(const bad of ['tools/../../../private','tools/a?input=private','tools/','tools/Word-Counter/','https://elsewhere.com/tools/test/','tools/a'.repeat(90)]){
  assert.equal(validRoute(bad),false,'Do not accept arbitrary or identifying paths: '+bad);
 }
 const client=readFileSync('insights-client.mjs','utf8');
 assert.match(client,/return location\.pathname\.slice\(1\)/,'Client must report actual Free Tool pathname');
 assert.match(client,/window\.addEventListener\('yorphives:tool-completed',completed\)/,'Only actual success signal should trigger action analytics');
});

test('per-tool pageviews remain separate from actions and historic generic pageviews',()=>{
 const today=Date.parse('2026-11-21T00:00:00Z');
 const days=Array.from({length:30},(_,i)=>new Date(today-(29-i)*86400000).toISOString().slice(0,10));
 const eligible=new Map([['tools/word-counter/',{url:'tools/word-counter/',name:'Word Counter',category:'Writing'}],
  ['tools/image-resizer/',{url:'tools/image-resizer/',name:'Image Resizer',category:'Images'}]]);
 const views=[
  {day:days[29],route:'tool',views:287},
  {day:days[29],route:'tools/word-counter/',views:11},
  {day:days[20],route:'tools/word-counter/',views:7},
  {day:days[28],route:'tools/image-resizer/',views:4},
  {day:days[29],route:'tools/nonexistent/',views:99},
  {day:days[29],route:'home',views:8}];
 const report=buildGrowthReport({days,views,completions:[],eligible,generatedAt:new Date(today).toISOString()});
 assert.equal(report.comparison.recent7dPageViews,409,'Sitewide totals retain generic and old visits');
 assert.equal(report.comparison.recent7dCompletedActions,0);
 assert.equal(report.ranked.length,0,'No tool completions should not be fabricated');
 assert.equal(report.toolPageViews.length,2);
 assert.equal(report.toolPageViews[0].url,'tools/word-counter/');
 assert.equal(report.toolPageViews[0].pageViews7d,11);
 assert.equal(report.toolPageViews[0].pageViews30d,18);
 assert.equal(report.toolPageViews[0].previous7d,7);
 assert.equal(report.toolPageViews[1].pageViews7d,4);
 assert.equal(report.revenue.amount,null,'AdSense revenue must remain unverified');
});
