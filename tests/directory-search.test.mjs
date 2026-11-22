import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile}from'node:fs/promises';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
import{matchesTool,normalizeSearch}from'../tools/directory-search.mjs';
import{suggestTools}from'../tools/search-match.mjs';
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
test('common tasks find the actual catalog tools regardless of keyword order',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 for(const [query,expected] of [['compress pdf','tools/pdf-compressor/'],['reduce pdf size','tools/pdf-compressor/'],['combine pdfs','tools/pdf-merge/'],['word counter','tools/word-counter/'],['counter word','tools/word-counter/'],['remove bg','tools/ai-background-remover/'],['pdf compresor','tools/pdf-compressor/']]){
  assert.ok(tools.filter(tool=>matchesTool(query,tool)).some(tool=>tool.url===expected),query+' should find '+expected);
 }
 assert.equal(matchesTool('pdf audio',{name:'PDF Compressor',description:'Compress PDF documents',category:'PDF'}),false);
 const suggestions=suggestTools('pdf unicorn',tools);
 assert.ok(suggestions.length>0&&suggestions.length<=3);
 assert.ok(suggestions.every(tool=>tool.category==='PDF'||/pdf/i.test(tool.name+' '+tool.description)));
 assert.deepEqual(suggestTools('unicorn banana',tools),[]);
});
test('conversion searches respect direction and splitting finds page extraction',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 const urls=q=>tools.filter(t=>matchesTool(q,t)).map(t=>t.url);
 for(const [query,expected,reversed] of [
  ['convert jpg to pdf','tools/images-to-pdf/','tools/pdf-to-images/'],
  ['png to pdf','tools/images-to-pdf/','tools/pdf-to-images/'],
  ['pdf to jpg converter','tools/pdf-to-images/','tools/images-to-pdf/'],
  ['pdf to text','tools/pdf-to-text/','tools/images-to-pdf/'],
  ['svg to png','tools/svg-to-png/','tools/heic-to-jpg/']]){
  assert.ok(urls(query).includes(expected),query);
  assert.ok(!urls(query).includes(reversed),query+' must not return the reverse conversion');
 }
 assert.deepEqual(urls('pdf to webp'),[]);
 assert.deepEqual(suggestTools('pdf to webp',tools),[]);
 assert.ok(urls('split pdf').includes('tools/pdf-extract-pages/'));
});
test('built tool directory remains crawlable and fully linked without JavaScript',async()=>{
 const page=await readFile(resolve(root,'dist/tools/index.html'),'utf8');
 const catalog=JSON.parse(await readFile(resolve(root,'dist/catalog.json'),'utf8'));
 const tools=catalog.items.filter(x=>x.type==='tool');
 assert.equal(tools.length,143);
 assert.match(page,/id="directory-search"/);
 assert.match(page,/id="directory-search-status" role="status"/);
 assert.match(page,/src="directory-search\.mjs"/);
 for(const tool of tools){
  assert.ok(page.includes('href="../'+tool.url+'"'),tool.url);
 }
 const cards=page.match(/class="directory-card"/g)||[];
 assert.equal(cards.length,143);
 const script=await readFile(resolve(root,'dist/tools/directory-search.mjs'),'utf8');
 assert.match(script,/history\.replaceState/);
 assert.doesNotMatch(script,/(?:fetch\(|sendBeacon|XMLHttpRequest|sessionStorage)/);
 assert.match(script,/readSaved\(win\.localStorage\)/);
 // Bookmarks persist locally using the existing homepage key; search terms are never uploaded.
});
