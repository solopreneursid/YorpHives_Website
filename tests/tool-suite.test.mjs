import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.cwd(),dist=resolve(root,'dist'),read=(base,path)=>readFile(resolve(base,path),'utf8');
const items=JSON.parse(await read(root,'catalog.json')).items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
test('the shared UI is applied to every non-compressor tool, not just sample pages',async()=>{
 assert.equal(items.length,116);
 let count=0;
 for(const item of items){
  const html=await read(dist,item.url+'index.html');
  if(item.url==='tools/pdf-compressor/'){
   assert.doesNotMatch(html,/tool-suite-v1\.(?:css|mjs)/);
   assert.match(html,/compressor-ui-v3\.css/);
   continue;
  }
  if(['tools/wave2-core.mjs','tools/wave3-core.mjs','tools/pdf-redaction-core.mjs'].includes(item.module?.url)){
   assert.match(html,/wave2\.css/);
   assert.match(html,/data-wave2=|data-wave3=|data-redaction=/);
   assert.doesNotMatch(html,/tool-suite-v1\.mjs/);
   continue;
  }
  count++;
  assert.match(html,/href="\.\.\/tool-suite-v1\.css"/,item.url);
  assert.match(html,/src="\.\.\/tool-suite-v1\.mjs"/,item.url);
  assert.match(html,/data-tui-family="(?:utility|file|wave1|image|json|general)"/,item.url);
  assert.match(html,/data-tui-category="/,item.url);
  assert.equal((html.match(/tool-suite-v1\.css/g)||[]).length,1,item.url);
  assert.equal((html.match(/tool-suite-v1\.mjs/g)||[]).length,1,item.url);
  assert.match(html,/class="tool-panel"/,item.url);
 }
 assert.equal(count,106);
});
test('modern responsive interface remains first-party and accessible',async()=>{
 const css=await read(dist,'tools/tool-suite-v1.css'),js=await read(dist,'tools/tool-suite-v1.mjs');
 for(const name of ['tui-upload-zone','tui-result-panel','tui-status','@media(max-width:680px)','@media(max-width:390px)',':focus-visible','prefers-reduced-motion'])assert.ok(css.includes(name),name);
 for(const name of ['tui-upload-zone','tui-result-head','aria-label','dispatchEvent','label.tool-field>input[type="file"]','dataTransfer'])assert.ok(js.includes(name),name);
 assert.doesNotMatch(css,/@import|https?:\/\//);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|eval\(|new Function\(/);
});
test('real computed-style QA exists only in preview',async()=>{
 const preview=(await read(dist,'_headers')).includes('X-Robots-Tag: noindex, nofollow');
 const available=await stat(resolve(dist,'tool-suite-qa.mjs')).then(x=>x.isFile()).catch(()=>false);
 assert.equal(available,preview);
 if(preview){const js=await read(dist,'tool-suite-qa.mjs');assert.match(js,/getComputedStyle/);assert.match(js,/getBoundingClientRect/);}
});

test('all legacy tool instructions use action-oriented, contextual steps',async()=>{
 for(const item of items.filter(x=>x.url!=='tools/pdf-compressor/')){
  const html=await read(dist,item.url+'index.html');
  assert.equal(html.includes('<li>Enter your information and choose any options.</li>'),false,item.url);
 }
});

test('action labels explain what each tool does without replacing processors',async()=>{
 const js=await read(dist,'tools/tool-suite-v1.mjs');
 for(const label of ['Count words','Merge PDFs','Extract image text','Scan QR code','Create invoice PDF','primary.textContent=actionNames[toolId]||fallback'])assert.ok(js.includes(label),label);
 assert.doesNotMatch(js,/\.addEventListener\('submit'/);
});
