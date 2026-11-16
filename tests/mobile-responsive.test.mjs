import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('viewport supports device sizing and browser zoom',async()=>{
 const html=await read('index.html');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/i);
});
test('redesigned five-stage journey stays usable on phones',async()=>{
 const [html,css]=await Promise.all([read('index.html'),read('next-responsive.css')]);
 assert.equal((html.match(/<li class="studio-step stage-/g)||[]).length,5);
 assert.match(css,/\.journey-list\{display:flex;gap:10px;overflow-x:auto/);
 assert.match(css,/scroll-snap-type:x proximity/);
});
test('responsive rules include narrow phones, tablets and safe areas',async()=>{
 const css=await read('next-responsive.css');
 for(const width of [1100,900,760,420,350])
  assert.ok(css.includes('@media(max-width:'+width+'px)'),String(width));
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/\.mobile-dock/);
});
test('mobile tool search, categories and cards are readable and touch-friendly',async()=>{
 const [css,html,js]=await Promise.all([read('next-responsive.css'),read('index.html'),read('next.js')]);
 assert.match(css,/\.search-panel input\{font-size:16px/);
 assert.match(css,/\.category-filters\{flex-wrap:nowrap;overflow-x:auto/);
 assert.match(css,/\.tool-grid\{grid-template-columns:1fr/);
 assert.match(css,/\.tool-open\{min-height:42px/);
 assert.match(html,/id="tool-search"/);
 assert.match(js,/renderCategories\(/);
});
test('mobile navigation and Escape to close are accessible',async()=>{
 const [html,js]=await Promise.all([read('index.html'),read('next.js')]);
 assert.match(html,/class="mobile-dock" aria-label="Mobile navigation"/);
 assert.match(html,/id="menu-toggle" aria-label="Open menu"/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/aria-expanded/);
});
test('footers keep public updates readable and disable animated marquee',async()=>{
 const [base,mobile]=await Promise.all([read('next.css'),read('next-responsive.css')]);
 assert.match(base,/\.pulse-viewport\{overflow-x:auto/);
 assert.match(base,/\.pulse-item\{display:flex/);
 assert.match(mobile,/@media\(prefers-reduced-motion:reduce\)/);
});
test('static output includes redesigned responsive CSS and navigation',async()=>{
 const [html,css]=await Promise.all([read('dist/index.html'),read('dist/next-responsive.css')]);
 assert.match(html,/href="next-responsive\.css"/);
 assert.match(css,/@media\(max-width:350px\)/);
});
test('skip link works without persistent overlay',async()=>{
 const [html,css]=await Promise.all([read('index.html'),read('next.css')]);
 assert.match(html,/class="skip" href="#main"/);
 assert.match(css,/\.skip\{position:fixed/);
 assert.match(css,/\.skip:focus\{transform:none/);
});
