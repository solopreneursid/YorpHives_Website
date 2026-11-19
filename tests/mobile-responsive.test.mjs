import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const exists=p=>stat(resolve(root,p)).then(x=>x.isFile()).catch(()=>false);

test('fresh homepage keeps device sizing and browser zoom available',async()=>{
 const html=await read('reimagined/index.html');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/i);
});
test('fresh homepage has five direct experiences and a compact mobile dock',async()=>{
 const html=await read('reimagined/index.html');
 for(const id of ['home','ventures','tools','partners','contact'])assert.match(html,new RegExp('<section class="view" id="'+id+'"'));
 assert.match(html,/class="desktop-nav"/);
 assert.match(html,/class="mobile-menu"/);
 assert.match(html,/class="mobile-dock"/);
 assert.match(html,/id="menu-toggle"/);
});
test('homepage responsive rules cover small phones, touch and safe areas',async()=>{
 const css=await read('reimagined/studio.css');
 for(const width of [1050,760,430,350])assert.ok(css.includes('@media(max-width:'+width+'px)'),String(width));
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:48px/);
});
test('tool directory and direct tools have their own mobile-first layouts',async()=>{
 const [directory,tool]=await Promise.all([read('tools/directory-next.css'),read('tools/tool-next.css')]);
 assert.match(directory,/@media\(max-width:760px\)/);
 assert.match(directory,/@media\(max-width:350px\)/);
 assert.match(directory,/grid-template-columns:1fr/);
 assert.match(tool,/@media\(max-width:760px\)/);
 assert.match(tool,/@media\(max-width:350px\)/);
 assert.match(tool,/font-size:16px/);
 assert.match(tool,/min-height:46px/);
 assert.match(tool,/env\(safe-area-inset-bottom/);
});
test('tool search, category filters and saved actions have mobile-friendly controls',async()=>{
 const html=await read('reimagined/index.html');
 const js=await read('reimagined/studio.js');
 const directory=await read('tools/index.html');
 assert.match(html,/id="tool-search"/);
 assert.match(html,/id="tool-categories"/);
 assert.match(html,/id="saved-toggle"/);
 assert.match(directory,/id="directory-search"/);
 assert.match(directory,/id="directory-saved-only"/);
 assert.match(js,/renderTools\(\)/);
 assert.match(js,/toggleSaved/);
});
test('skip links and keyboard navigation are present',async()=>{
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js')]);
 assert.match(html,/class="skip-link" href="#main"/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/aria-current/);
});
test('built homepage and tools retain the shared mobile shell when a build exists',async()=>{
 if(!await exists('dist/index.html'))return;
 const [html,tool]=await Promise.all([read('dist/index.html'),read('dist/tools/word-counter/index.html')]);
 assert.match(html,/href="studio\.css"/);
 assert.match(html,/src="studio\.js"/);
 assert.match(tool,/href="\.\.\/tool-next\.css"/);
 assert.match(tool,/class="mobile-dock"/);
});
