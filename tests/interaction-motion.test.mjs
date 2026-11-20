import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('shared progressive motion covers site sections, menus, cards and direct pages',async()=>{
 const [css,script,html,dir,shell,landing,build]=await Promise.all([
  read('interaction.css'),read('interaction.mjs'),read('reimagined/index.html'),
  read('tools/index.html'),read('scripts/next-tool-shell.mjs'),
  read('scripts/section-landings.mjs'),read('scripts/build-site.mjs')
 ]);
 assert.match(css,/@view-transition\{navigation:auto\}/);
 assert.match(css,/#main>\.view:not\(\[hidden\]\)/);
 assert.match(css,/\.mobile-menu:not\(\[hidden\]\)/);
 assert.match(css,/#tool-results>\.tool-card/);
 assert.match(css,/details\[open\]>:not\(summary\)/);
 assert.match(css,/body\.tool-page/);
 assert.match(css,/body\.directory-page/);
 assert.match(css,/--yh-motion-delay:75ms/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(hover:none\)/);
 for(const page of [html,dir,shell,landing]){
  assert.match(page,/interaction\.css/);
  assert.match(page,/interaction\.mjs/);
 }
 assert.match(build,/for\(const file of \['interaction\.css','interaction\.mjs','personal-space\.css'\]\)/);
 assert.match(script,/document\.addEventListener\('pointerdown'/);
 assert.match(script,/document\.addEventListener\('click'/);
 assert.match(script,/closest\('a\[href\],button,summary,\[role="button"\]'\)/);
 assert.match(script,/prefers-reduced-motion: reduce/);
 assert.match(script,/:disabled,\[aria-disabled="true"\]/);
 // User actions must never be delayed or intercepted.
 assert.doesNotMatch(script,/preventDefault\(|stopPropagation\(|location\.(?:href|assign|replace)\(/);
 assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
});
test('production build includes motion in every independently published tool page',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.equal(tools.length,143);
 for(const tool of tools){
  const html=await read('dist/'+tool.url+'index.html');
  assert.ok(html.includes('href="/interaction.css"'),tool.url);
  assert.ok(html.includes('src="/interaction.mjs"'),tool.url);
 }
 for(const file of ['interaction.css','interaction.mjs']){
  assert.ok((await read('dist/'+file)).length>250,file);
 }
});
