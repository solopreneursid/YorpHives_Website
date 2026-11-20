import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('homepage headline, brand motto and logo-based system match the reference',async()=>{
 const [html,css]=await Promise.all([read('reimagined/index.html'),read('reimagined/hero-system.css')]);
 assert.match(html,/<h1 id="home-title">The future<br>doesn't <em>build<\/em><br>itself/);
 assert.equal((html.match(/IDEAS IN MOTION/g)||[]).length,2);
 for(const [n,label,copy] of [['01','RESEARCH','Spot the signal'],['02','INTELLIGENCE','Test the idea'],['03','FOUNDER','Decide &amp; create']]){
  assert.ok(html.includes(n+' / '+label),n+' stage label missing');
  assert.ok(html.includes(copy.replaceAll('&','&amp;')),n+' stage copy missing');
 }
 assert.match(html,/class="hero-art hero-system" role="img"/);
 assert.match(html,/class="system-core-inner"><img src="\/tools\/brand-icon.webp"/);
 const hero=html.split('<div class="hero">')[1]?.split('<div class="trust-strip shell"')[0]||'';
 assert.doesNotMatch(hero,/id="hero-quickstart-list"|QUICK START|What do you need to do\?/);
 assert.match(css,/system-orbit-a/);
 assert.match(css,/system-stage-founder/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
});
test('hero illustration does not remove Free Tools or build revenue workflows',async()=>{
 const [html,js,build,policy]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),
  read('scripts/build-site.mjs'),read('product-policy.mjs')
 ]);
 assert.match(html,/id="featured-tools-grid"/);
 assert.match(html,/id="tool-results"/);
 assert.match(html,/id="hqconnect"/);
 assert.match(html,/id="venture-products"/);
 assert.match(html,/href="#tools"/);
 assert.match(js,/function renderFeaturedTools\(/);
 assert.match(js,/function renderVentures\(/);
 assert.doesNotMatch(js,/renderQuickstarts|hero-tool-count/);
 assert.match(build,/hero-system\.css/);
 assert.match(policy,/founderApproval/);
});
