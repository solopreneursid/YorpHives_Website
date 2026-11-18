import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const read=p=>readFile(resolve(process.cwd(),p),'utf8');
test('every public page is English only and no translation picker is injected',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 for(const path of ['index.html','tools/index.html',...catalog.items.filter(i=>i.type==='tool').map(i=>i.url+'index.html')]){
  const content=await read('dist/'+path);
  assert.match(content,/<html lang="en"/,path);
  assert.doesNotMatch(content,/yh-language-picker|site-languages\\.(?:mjs|css)|data-language-toggle/,path);
 }
 assert.equal(catalog.items.filter(i=>i.type==='tool').length,143);
});
test('build never ships translation scripts, hidden translation overlays or language packs',async()=>{
 const build=await read('scripts/build-site.mjs');
 assert.doesNotMatch(build,/site-languages|site-tool-copy|site-catalog-copy|yh-language-picker|i18n-coverage|catalogTranslationReport/);
 for(const path of ['site-languages.mjs','site-languages.css','site-language-copy.mjs','site-tool-copy.mjs','site-section-copy.mjs','site-catalog-copy.mjs']){
  await assert.rejects(read('dist/'+path),{code:'ENOENT'},path);
 }
});
