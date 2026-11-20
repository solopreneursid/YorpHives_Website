import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('mobile dock is 30% visually shorter while retaining 44px tap targets',async()=>{
 const [css,tool]=await Promise.all([read('reimagined/studio.css'),read('tools/tool-next.css')]);
 const oldHeight=44+2*3+2; // Previous 44px item plus 3px padding and 1px border on each side.
 const visibleHeight=36;
 assert.ok((oldHeight-visibleHeight)/oldHeight>=.30,'Reduction must reach 30%');
 assert.match(css,/\.mobile-dock\{height:36px;bottom:calc\(5px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/\.mobile-dock a\{position:relative;isolation:isolate;min-height:44px;height:44px;margin-block:-5px/);
 assert.match(css,/\.mobile-dock a\[aria-current=page\]::before\{content:"";position:absolute;inset:5px 0/);
 assert.match(css,/body\{padding-bottom:calc\(50px \+ env\(safe-area-inset-bottom,0px\)\)\}/);
 assert.match(tool,/body\.tool-page \.mobile-dock\{[^\n]*height:36px/);
 assert.match(tool,/body\.tool-page \.mobile-dock a\{[^\n]*min-height:44px;height:44px;margin-block:-5px/);
 assert.match(tool,/body\.tool-page\{padding-bottom:calc\(50px \+ env\(safe-area-inset-bottom,0px\)\)\}/);
 assert.match(css,/\.mobile-dock a:focus-visible/);
 assert.match(tool,/body\.tool-page \.mobile-dock a:focus-visible/);
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
