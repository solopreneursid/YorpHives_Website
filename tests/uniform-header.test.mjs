import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('homepage header is a raised panel with four matching compact navigation pills',async()=>{
 const [html,css,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/surfaces.css'),read('reimagined/studio.js')]);
 const nav=html.split('<nav class="desktop-nav"')[1]?.split('</nav>')[0]||'';
 for(const link of ['#home','#tools','#ventures'])assert.ok(nav.includes('href="'+link+'"'),link);
 assert.match(html,/class="header-cta" href="#hqconnect" data-nav="hqconnect"/);
 assert.match(css,/DIMENSIONAL UNIFORM HEADER/);
 assert.match(css,/\.site-header \.(?:desktop-nav a),\s*\.site-header \.header-cta\{/);
 assert.match(css,/width:112px;height:44px;min-width:112px;min-height:44px/);
 assert.match(css,/background:var\(--nav-face\);color:var\(--nav-ink\)/);
 assert.match(css,/\.site-header \.desktop-nav a\[aria-current=page\],\s*\.site-header \.header-cta\[aria-current=page\]/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.site-header \.desktop-nav,\.site-header \.header-cta\{display:none\}/);
 assert.match(css,/\.site-header \.menu-toggle\{/);
 assert.match(js,/querySelectorAll\('\[data-nav\]'\)/);
});
test('tool pages and directory use the same header base colour and accessible navigation',async()=>{
 const [tool,dir,shell]=await Promise.all([read('tools/tool-next.css'),read('tools/directory-next.css'),read('scripts/next-tool-shell.mjs')]);
 for(const css of [tool,dir]){
  assert.match(css,/DIMENSIONAL UNIFORM HEADER/);
  assert.match(css,/background:#e7eee2;color:#294330/);
  assert.match(css,/height:44px;min-height:44px/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
 }
 assert.match(tool,/body\.tool-page \.tool-nav,body\.tool-page \.site-header \.header-cta\{display:none\}/);
 assert.match(dir,/\.directory-nav,\.directory-cta\{display:none\}/);
 assert.match(shell,/class="tool-nav"/);
});
