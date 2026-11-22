import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SAVED_KEY,readSaved,toggleSaved} from '../tools/save-tool.mjs';
function memoryStorage(){
 const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
}
test('saved tools share homepage key, reject invalid routes, and do not store inputs',()=>{
 assert.equal(SAVED_KEY,'yorphives-studio-saved-v1');
 const db=memoryStorage();
 assert.deepEqual(readSaved(db),[]);
 assert.equal(toggleSaved(db,'tools/word-counter/'),true);
 assert.deepEqual(readSaved(db),['tools/word-counter/']);
 assert.equal(toggleSaved(db,'tools/word-counter/'),false);
 assert.deepEqual(readSaved(db),[]);
 assert.equal(toggleSaved(db,'https://evil.example/'),null);
 assert.equal(toggleSaved(db,'tools/../../admin/'),null);
 db.setItem(SAVED_KEY,JSON.stringify(['tools/pdf-merge/','tools/pdf-merge/','../../secrets',77]));
 assert.deepEqual(readSaved(db),['tools/pdf-merge/']);
});
test('production build contains saved buttons, same-category recommendations, and 143 independent canonical tool pages',async()=>{
 const dir=resolve('dist');
 const items=JSON.parse(await readFile(resolve(dir,'catalog.json'),'utf8')).items.filter(x=>x.type==='tool');
 assert.equal(items.length,143);
 const routes=new Set(items.map(x=>x.url));
 for(const tool of items){
  const html=await readFile(resolve(dir,tool.url,'index.html'),'utf8');
  assert.ok(html.includes('data-save-tool="'+tool.url+'"'),tool.url);
  assert.match(html,/src="\/tools\/save-tool\.mjs"/);
  assert.match(html,/class="yh-tool-discover"/);
  const related=[...html.matchAll(/<li><a href="\/(tools\/[a-z0-9-]+\/)"[^>]*>/g)].map(x=>x[1]);
  assert.ok(related.length<=3,tool.url);
  for(const u of related){
   assert.ok(routes.has(u),'Unpublished recommendation: '+u);
   assert.notEqual(u,tool.url);
   const curated=new Set(['tools/pdf-merge/','tools/pdf-compressor/','tools/word-counter/','tools/image-resizer/','tools/ai-background-remover/']);
   if(!curated.has(tool.url))assert.equal(items.find(x=>x.url===u)?.category||'Other',tool.category||'Other');
  }
 }
 for(const [url,expected] of [['tools/pdf-merge/','tools/pdf-rearrange-pages/'],['tools/pdf-compressor/','tools/pdf-merge/'],['tools/word-counter/','tools/word-frequency-counter/'],['tools/image-resizer/','tools/image-cropper/']]){
  const html=await readFile(resolve(dir,url,'index.html'),'utf8');
  assert.ok(html.includes('href="/'+expected+'"'),url);
  assert.doesNotMatch(html,/<section class="tool-related">/);
 }
 const directory=await readFile(resolve(dir,'tools/index.html'),'utf8');
 assert.match(directory,/id="directory-saved-only"/);
 assert.match(directory,/id="directory-search"/);
 assert.match(directory,/href="\.\.\/tools\/word-counter\/"/);
 const module=await readFile(resolve(dir,'tools/directory-search.mjs'),'utf8');
 assert.match(module,/readSaved\(win\.localStorage\)/);
 assert.match(module,/url\.searchParams\.set\('saved','1'\)/);
 const saved=await readFile(resolve(dir,'tools/save-tool.mjs'),'utf8');
 assert.doesNotMatch(saved,/fetch\(|sendBeacon|XMLHttpRequest/);
});
