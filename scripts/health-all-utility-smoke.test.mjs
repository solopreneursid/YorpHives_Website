// Broad deterministic execution checks for all catalogued browser-local text/calculation tools.
// A successful check proves representative input executes and produces a result;
// it does not replace tool-specific correctness and edge-case contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runUtility} from '../tools/utility-core.mjs';
import {utilityFixture} from './health-utility-fixtures.mjs';

const catalog=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
export const UTILITY_SMOKE_ENGINES=Object.freeze(['tools/utility-core.mjs','tools/everyday-core.mjs']);
const groups=new Set(UTILITY_SMOKE_ENGINES);
const items=catalog.items.filter(item=>item.type==='tool'&&groups.has(item.module?.url));
test('all catalogued utility smoke engine tools are unique and accounted for',()=>{
 assert.equal(items.length,68);
 assert.equal(new Set(items.map(x=>x.module.toolId)).size,items.length);
 assert.ok(items.every(x=>x.module?.inputs?.length>0));
});
for(const item of items){
 test('utility execution smoke: '+item.module.toolId,async()=>{
  const result=await runUtility(item.module.toolId,utilityFixture(item));
  assert.equal(typeof result,'object','Must return a structured result');
  assert.ok(typeof result.text==='string'||result.preview,'Must have text or visual preview');
  if(typeof result.text==='string')assert.ok(result.text.length>0||result.preview,'Output must not be empty without preview');
 });
}
