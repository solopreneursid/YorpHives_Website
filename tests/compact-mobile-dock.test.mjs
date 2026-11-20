import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('compact mobile dock reduces occupied height but keeps 44px tap targets',async()=>{
 const [css,tool]=await Promise.all([
  read('reimagined/studio.css'),
  read('tools/tool-next.css')
 ]);
 assert.match(css,/body\{padding-bottom:calc\(60px \+ env\(safe-area-inset-bottom,0px\)\)\}/);
 assert.match(css,/\.mobile-dock\{bottom:calc\(5px \+ env\(safe-area-inset-bottom,0px\)\);gap:3px;padding:3px;border-radius:12px\}/);
 assert.match(css,/\.mobile-dock a\{min-height:44px;gap:2px;border-radius:9px\}/);
 assert.match(css,/\.mobile-dock a small\{font-size:9px;line-height:1\.1\}/);
 assert.match(tool,/body\.tool-page\{padding-bottom:calc\(60px \+ env\(safe-area-inset-bottom,0px\)\)\}/);
 assert.match(tool,/body\.tool-page \.mobile-dock a\{[^\n]*min-height:44px/);
 assert.match(tool,/bottom:calc\(5px \+ env\(safe-area-inset-bottom,0px\)\)/);
});
test('main and direct-tool mobile navigation retains all four routes',async()=>{
 const [html,shell]=await Promise.all([
  read('reimagined/index.html'),
  read('scripts/next-tool-shell.mjs')
 ]);
 const dock=html.split('<nav class="mobile-dock"')[1]?.split('</nav>')[0]||'';
 for(const route of ['#home','#tools','#ventures','#hqconnect'])
  assert.ok(dock.includes('href="'+route+'"'),route);
 for(const route of ['#home','#tools','#ventures','#contact'])
  assert.ok(shell.includes(route),'Tool navigation lost '+route);
});
