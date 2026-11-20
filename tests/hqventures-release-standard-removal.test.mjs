import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('HQventures removes duplicate Release Standard block but preserves the primary workflow',async()=>{
 const html=await read('reimagined/index.html');
 const ventures=html.split('<section class="view" id="ventures"')[1]?.split('<section class="view" id="tools"')[0]||'';
 for(const text of ['THE RELEASE STANDARD','Who can approve','a public release?','Market signals and user needs',
  'Evidence, feasibility and risk','Founder review is mandatory','Only verified, approved releases']){
  assert.ok(!ventures.includes(text),'Removed release standard text persists: '+text);
 }
 assert.doesNotMatch(ventures,/class="process-band"|class="process-list"/);
 assert.match(ventures,/id="home-progress"/);
 assert.match(ventures,/class="process-steps"/);
 for(const text of ['Discover','Validate','Design','Founder approval','Build & launch','Learn & improve']){
  assert.ok(ventures.includes(text.replace('&','&amp;'))||ventures.includes(text),'Original workflow missing: '+text);
 }
 assert.match(ventures,/Every real launch requires an explicit decision/);
 assert.match(ventures,/id="venture-products"/);
 assert.match(ventures,/id="venture-hero-count"/);
 assert.match(ventures,/id="venture-activity"/);
});
test('founder approval policy is retained independently of public section',async()=>{
 const [policy,js]=await Promise.all([read('product-policy.mjs'),read('reimagined/studio.js')]);
 assert.match(policy,/founderApproval/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
});
