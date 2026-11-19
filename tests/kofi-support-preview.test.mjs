import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('fresh homepage keeps a visible but genuinely disabled support action',async()=>{
 const [html,css]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.css')]);
 const header=html.match(/<header class="site-header"[^>]*>([\s\S]*?)<\/header>/)?.[1];
 assert.ok(header,'shared site header must exist');
 const button=header.match(/<button class="kofi-support"[^>]*>[\s\S]*?<\/button>/)?.[0];
 assert.ok(button,'support action must remain in the header');
 assert.match(button,/id="kofi-support"/);
 assert.match(button,/type="button" disabled/);
 assert.match(button,/Support/);
 assert.ok(!button.includes('<a'));
 assert.ok(!button.includes('onclick='));
 assert.ok(!button.includes('href="https://'));
 assert.ok(!button.includes('http://'));
 assert.match(css,/\.kofi-support:disabled\{opacity:1;cursor:not-allowed\}/);
});
test('all public tools and directory receive disabled first-party support controls',async()=>{
 const [build,toolCss,dirCss,shell]=await Promise.all([
  read('scripts/build-site.mjs'),read('tools/tool-next.css'),
  read('tools/directory-next.css'),read('scripts/next-tool-shell.mjs')
 ]);
 assert.match(build,/const action='<button class="header-kofi tool-kofi" type="button" disabled/);
 assert.match(build,/<strong>Ko-fi<\/strong><small>Support us<\/small>/);
 assert.match(build,/html=injectSiteSupport\(html,path\)/);
 assert.match(toolCss,/header-kofi:disabled\{opacity:1;cursor:not-allowed\}/);
 assert.match(dirCss,/header-kofi:disabled\{opacity:1;cursor:not-allowed\}/);
 assert.match(shell,/class="mobile-dock"/);
});
