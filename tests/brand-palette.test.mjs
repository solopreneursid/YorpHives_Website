import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('dark forest/mint heroes and dark footers exist on all page families',async()=>{
 const [main,tool,dir]=await Promise.all([
  read('reimagined/surfaces.css'),read('tools/tool-next.css'),read('tools/directory-next.css')
 ]);
 for(const css of [main,tool,dir]){
  assert.match(css,/BRAND-ALIGNED COLOUR PALETTE/);
  assert.match(css,/linear-gradient\(/);
  assert.match(css,/#[a-fA-F0-9]{6}/);
  assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
 }
 for(const selector of ['#main #home>.hero','#main #ventures>.page-hero','#main #tools>.page-hero',
  '#main #home>.featured-section','#main #home>.hqconnect','#main #ventures>.home-process',
  '#main #ventures>.page-content.shell','#main #tools>.page-content.shell','.site-footer']){
  assert.ok(main.includes(selector),'Missing brand palette region: '+selector);
 }
 assert.match(tool,/body\.tool-page \.tool-intro h1[^\n]*\{color:#f7fbef\}/);
 assert.match(tool,/body\.tool-page \.tool-footer\{/);
 assert.match(dir,/\.directory-hero h1\{color:#f7fbef\}/);
 assert.match(dir,/\.directory-footer\{/);
 assert.match(main,/#main #ventures \.process-copy h2\{color:#172f25\}/);
});
test('colour-only iteration does not alter markup or section layout',async()=>{
 const [main,tool,dir]=await Promise.all([
  read('reimagined/surfaces.css'),read('tools/tool-next.css'),read('tools/directory-next.css')
 ]);
 const end=css=>css.split('/* BRAND-ALIGNED COLOUR PALETTE')[1]||'';
 for(const css of [main,tool,dir]){
  const additions=end(css);
  assert.doesNotMatch(additions,/\b(?:padding|margin|width|height|display|gap|grid-template-columns|position|font-size|transform)\s*:/);
 }
});
