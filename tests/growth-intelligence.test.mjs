import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGrowthReport} from '../functions/_lib/growth.mjs';
const dates=Array.from({length:30},(_,i)=>new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10));
test('growth report counts only published tools and isolates exact UTC windows',()=>{
 const eligible=new Map([['tools/word-counter/',{url:'tools/word-counter/',name:'Word Counter',category:'Writing'}]]);
 const report=buildGrowthReport({days:dates,eligible,
  views:[{day:dates[29],views:6},{day:dates[10],views:2}],
  completions:[
   {day:dates[16],url:'tools/word-counter/',completions:1},
   {day:dates[23],url:'tools/word-counter/',completions:3},
   {day:dates[29],url:'tools/word-counter/',completions:2},
   {day:dates[29],url:'tools/private/',completions:1000}
  ],generatedAt:'2026-11-30T00:00:00.000Z'});
 assert.equal(report.daily.length,30);
 assert.equal(report.daily[29].pageViews,6);
 assert.equal(report.daily[29].completedActions,2);
 assert.equal(report.comparison.recent7dCompletedActions,5);
 assert.equal(report.comparison.previous7dCompletedActions,1);
 assert.equal(report.ranked.length,1);
 assert.equal(report.ranked[0].completedActions30d,6);
 assert.equal(report.categories.length,1);
 assert.deepEqual(report.categories[0],{
  category:'Writing',availableTools:1,completedActions30d:6,
  completedActions7d:5,previous7d:1,toolsWithSignals:1,activityDetected:true
 });
 assert.match(report.categoryMethodology,/Not unique visitors/);
 assert.equal(report.opportunities.length,1);
 assert.equal(report.opportunities[0].requiresFounderReview,true);
 assert.equal(report.revenue.available,false);
 assert.equal(report.revenue.amount,null);
});
test('no activity gives empty rankings, no invented opportunity, no claimed income',()=>{
 const r=buildGrowthReport({days:dates,eligible:new Map(),views:[],completions:[]});
 assert.equal(r.daily.length,30);
 assert.equal(r.signalsAvailable,false);
 assert.deepEqual(r.opportunities,[]);
 assert.deepEqual(r.ranked,[]);
 assert.deepEqual(r.categories,[]);
 assert.equal(r.comparison.recent7dCompletedActions,0);
 assert.equal(r.revenue.amount,null);
});

test('category metrics stay evidence-based, ignore unpublished tool activity and exclude non-tools',()=>{
 const eligible=new Map([
  ['tools/a/',{url:'tools/a/',name:'A',category:'Writing'}],
  ['tools/b/',{url:'tools/b/',name:'B',category:'Writing'}],
  ['tools/c/',{url:'tools/c/',name:'C',category:'PDF'}],
  ['apps/venture/',{url:'apps/venture/',name:'Venture',category:'PDF'}]
 ]);
 const report=buildGrowthReport({days:dates,eligible,views:[],completions:[
  {day:dates[29],url:'tools/a/',completions:5},
  {day:dates[18],url:'tools/b/',completions:2},
  {day:dates[29],url:'tools/c/',completions:1},
  {day:dates[29],url:'tools/not-approved/',completions:1000},
  {day:dates[29],url:'apps/venture/',completions:100}
 ]});
 assert.deepEqual(report.categories.map(x=>x.category),['Writing','PDF']);
 assert.equal(report.categories[0].completedActions30d,7);
 assert.equal(report.categories[0].availableTools,2);
 assert.equal(report.categories[0].toolsWithSignals,2);
 assert.equal(report.categories[1].completedActions30d,1);
 assert.equal(report.categories[1].availableTools,1);
 assert.ok(report.ranked.some(x=>x.url==='apps/venture/'),'Existing venture ranking is preserved');
});
