import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('compact pass scales home hero, cards and navigation without changing content',async()=>{
 const [html,css]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.css')]);
 assert.match(css,/COMPACT STUDIO PASS/);
 assert.match(css,/#home \.hero-layout\{[\s\S]*?min-height:0;padding-block:38px 42px/);
 assert.match(css,/#home \.hero h1\{font-size:clamp\(2\.55rem,4\.2vw,4\.4rem\)/);
 const orbit=await read('reimagined/hero-system.css');
 assert.match(orbit,/#home \.hero-system\{/);
 assert.match(orbit,/#home \.system-stage-founder\{/);
 assert.match(orbit,/@media\(max-width:430px\)/);
 assert.match(css,/#home \.featured-tool-card\{min-height:143px/);
 assert.match(css,/#home \.ecosystem-card\{min-height:192px/);
 assert.match(css,/#ventures \.venture-hero \.page-hero-layout\{/);
 for(const section of ['home','tools','ventures'])assert.match(html,new RegExp('id="'+section+'"'));
 assert.match(html,/class="hero-art hero-system"/);
 assert.match(html,/id="hqconnect"/);
});
test('compact forms and direct tools retain comfortable mobile targets and responsive rules',async()=>{
 const [studio,hq,tool,dir]=await Promise.all([
  read('reimagined/studio.css'),read('reimagined/hqconnect.css'),
  read('tools/tool-next.css'),read('tools/directory-next.css')
 ]);
 assert.match(studio,/@media\(max-width:760px\)/);
 assert.match(studio,/\.header-cta,\.button\{min-height:44px/);
 assert.match(studio,/\.menu-toggle\{width:44px;height:44px\}/);
 assert.match(hq,/COMPACT HQCONNECT PASS/);
 assert.match(hq,/\.hqconnect-form input:not\(\[type=checkbox\]\),\.hqconnect-form select\{min-height:44px\}/);
 assert.match(hq,/\.hqconnect-form \.form-submit\{min-height:44px/);
 assert.match(tool,/COMPACT DIRECT-TOOL PASS/);
 assert.match(tool,/body\.tool-page \.tool-btn\{min-height:44px/);
 assert.match(dir,/COMPACT DIRECTORY PASS/);
 assert.match(dir,/details\.directory-section>summary\{min-height:50px/);
 for(const css of [studio,hq,tool,dir])assert.match(css,/prefers-reduced-motion:reduce/);
});
test('compact styling never changes published tool records, product qualification or HQconnect handler',async()=>{
 const [catalog,policy,intake]=await Promise.all([
  read('catalog.json'),read('product-policy.mjs'),read('functions/api/hqconnect.js')
 ]);
 const entries=JSON.parse(catalog).items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.ok(entries.length>=140);
 assert.match(policy,/founderApproval/);
 assert.match(intake,/HQCONNECT_DB/);
});
