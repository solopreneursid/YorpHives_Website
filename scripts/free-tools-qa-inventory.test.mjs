import test from 'node:test';
import assert from 'node:assert/strict';
import {inventory} from './free-tools-qa-inventory.mjs';
const catalog={items:Array.from({length:143},(_,i)=>({name:'Test Tool '+i,url:'tools/item-'+i+'/',type:'tool',category:'Test',execution:'browser-local',module:{toolId:'item-'+i,url:'tools/example.mjs'}}))};
test('coverage inventory never equates page checks to functional passes',()=>{
 const smoke="await scenario('Basic utility runs',async page=>{ await open(page,'/tools/item-0/'); });";
 const local="await run('item-1',{text:'value'});";
 const x=inventory(catalog,smoke,local);
 assert.equal(x.counts.publishedTools,143);
 assert.equal(x.counts.pageAvailabilityChecksDefined,143);
 assert.equal(x.counts.toolsWithBrowserBehaviorScenarios,1);
 assert.equal(x.counts.toolsWithLocalContracts,1);
 assert.equal(x.counts.fullyVerifiedByThisInventory,0);
 assert.equal(x.tools.find(t=>t.url==='/tools/item-0/').checks.browserBehavior,'scenario-defined');
 assert.equal(x.tools.find(t=>t.url==='/tools/item-1/').checks.deterministicOutput,'contract-defined');
 assert.equal(x.tools.find(t=>t.url==='/tools/item-2/').checks.deterministicOutput,'missing');
});
test('rejects duplicate URLs and catalog-size drift',()=>{
 assert.throws(()=>inventory({items:catalog.items.slice(0,142)},'',''),/Expected 143/);
 assert.throws(()=>inventory({items:[...catalog.items.slice(0,142),catalog.items[0]]},'',''),/Duplicate/);
});
test('inventory distinguishes defined synthetic browser checks from passing results',()=>{
 const source="const expected={'item-2':/ok/}; assert.equal(tools.length,1); page.locator('#utility-run').click()";
 const report=inventory(catalog,'','','','','','',source);
 assert.equal(report.tools.find(t=>t.url==='/tools/item-2/').checks.browserBehavior,'scenario-defined');
 assert.equal(report.counts.toolsWithBrowserBehaviorScenarios,1);
 assert.equal(report.counts.fullyVerifiedByThisInventory,0);
});
