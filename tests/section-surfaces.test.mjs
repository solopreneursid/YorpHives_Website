import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('all Home, HQventures, Free Tools and HQconnect sections have separated 3D surfaces',async()=>{
 const [html,css,build]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/surfaces.css'),read('scripts/build-site.mjs')
 ]);
 assert.match(html,/href="surfaces\.css"/);
 assert.match(build,/surfaces\.css/);
 assert.match(css,/#main>\.view:not\(\[hidden\]\)\{[\s\S]*?flex-direction:column;gap:/);
 assert.match(css,/#main>\.view:not\(\[hidden\]\)> :is\(\.hero,\.home-section,\.hqconnect,\.page-hero,\.page-content,\.home-process\)/);
 assert.match(css,/--panel-rise-dark:/);
 assert.match(css,/border-radius:var\(--section-round\)/);
 assert.match(css,/box-shadow:var\(--panel-rise-dark\)/);
 for(const section of ['class="hero"','id="home-discover-title"','class="home-section featured-section"','class="hqconnect" id="hqconnect"','id="home-progress"','id="tool-search"','id="venture-products"']){
  assert.ok(html.includes(section),'Missing major surface: '+section);
 }
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
});
test('every direct tool and the A–Z directory use separated raised sections without external runtime',async()=>{
 const [tool,dir,source]=await Promise.all([
  read('tools/tool-next.css'),read('tools/directory-next.css'),
  read('scripts/next-tool-shell.mjs')
 ]);
 assert.match(tool,/DIMENSIONAL TOOL SURFACES/);
 assert.match(tool,/body\.tool-page \.tool-intro,body\.tool-page\[data-tui-family\] \.tool-intro\{/);
 assert.match(tool,/body\.tool-page \.tool-panel,body\.tool-page\[data-tui-family\] \.tool-panel\{/);
 assert.match(tool,/body\.tool-page \.tool-help-card\{/);
 assert.match(tool,/body\.tool-page \.tool-related,body\.tool-page \.yh-tool-discover\{/);
 assert.match(dir,/DIMENSIONAL A–Z DIRECTORY/);
 assert.match(dir,/\.directory-main> :is\(\.directory-hero,\.directory-finder,\.directory-list,\.directory-bottom-card\)/);
 assert.match(dir,/details\.directory-section\{/);
 assert.match(source,/class="mobile-dock"/);
 for(const css of [tool,dir])assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
});
