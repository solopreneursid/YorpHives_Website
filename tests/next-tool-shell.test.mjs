import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFile(resolve(root,path),'utf8');

test('all public tool routes use redesigned shell while keeping real tool processors and inputs',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 const items=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.ok(items.length>=140);
 for(const item of items){
  const name=item.url+'index.html';
  const [source,built]=await Promise.all([read(name),read('dist/'+name)]);
  assert.ok(built.includes('href="../tool-next.css"'),name+' new theme missing');
  assert.ok(built.includes('class="mobile-dock"'),name+' mobile nav missing');
  assert.ok(built.includes('class="tool-header-back"'),name+' easy back missing');
  assert.ok(built.includes('href="../../#tools" aria-current="page"'),name+' free-tools nav missing');
  assert.equal((built.match(/<form\b/gi)||[]).length,(source.match(/<form\b/gi)||[]).length,name+' form count changed');
  const formIds=[...source.matchAll(/<form[^>]*\bid="([^"]+)"/gi)].map(x=>x[1]);
  for(const id of formIds)assert.ok(built.includes('id="'+id+'"'),name+' form '+id+' removed');
  assert.ok(built.includes('id="yorphives-discovery-schema"'),name+' structured data missing');
  assert.doesNotMatch(built,/src="https?:\/\//i);
 }
});
test('shared direct-tool design uses accessible mobile controls and no external runtime',async()=>{
 const css=await read('tools/tool-next.css');
 const shell=await read('scripts/next-tool-shell.mjs');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/min-height:46px/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(shell,/item\.type!=='tool'/);
 assert.match(shell,/class="mobile-dock"/);
 assert.doesNotMatch(shell,/https?:\/\/|script src=/i);
});
