import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile}from'node:fs/promises';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
import{matchesTool,normalizeSearch}from'../tools/directory-search.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('directory matching handles names, categories, descriptions and multiple keywords',()=>{
 const tool={name:'Image Resizer & Compressor',description:'Resize photos privately in your browser',category:'Creator'};
 assert.equal(matchesTool('image compressor',tool),true);
 assert.equal(matchesTool('photos',tool),true);
 assert.equal(matchesTool('creator',tool),true);
 assert.equal(matchesTool('audio',tool),false);
 assert.equal(matchesTool('image audio',tool),false);
 assert.equal(matchesTool('',tool),true);
 assert.equal(normalizeSearch('  RÉSUMÉ / CV  '),'resume cv');
});
test('built tool directory remains crawlable and fully linked without JavaScript',async()=>{
 const page=await readFile(resolve(root,'dist/tools/index.html'),'utf8');
 const catalog=JSON.parse(await readFile(resolve(root,'dist/catalog.json'),'utf8'));
 const tools=catalog.items.filter(x=>x.type==='tool');
 assert.equal(tools.length,144);
 assert.match(page,/id="directory-search"/);
 assert.match(page,/id="directory-search-status" role="status"/);
 assert.match(page,/src="directory-search\.mjs"/);
 for(const tool of tools){
  assert.ok(page.includes('href="../'+tool.url+'"'),tool.url);
 }
 const cards=page.match(/class="directory-card"/g)||[];
 assert.equal(cards.length,144);
 const script=await readFile(resolve(root,'dist/tools/directory-search.mjs'),'utf8');
 assert.match(script,/history\.replaceState/);
 assert.doesNotMatch(script,/(?:fetch\(|sendBeacon|XMLHttpRequest|sessionStorage)/);
 assert.match(script,/readSaved\(win\.localStorage\)/);
 // Bookmarks persist locally using the existing homepage key; search terms are never uploaded.
});
