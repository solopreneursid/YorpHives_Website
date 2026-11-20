import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test("the new homepage leads with a clear independent venture-studio proposition",async()=>{
 const html=await read('reimagined/index.html');
 assert.match(html,/The future<br>doesn't <em>build<\/em><br>itself/);
 assert.match(html,/Use our free tools\. Explore our products\. Build yours with us\./);
 assert.match(html,/YORPHIVES \/ AI-POWERED SOFTWARE STUDIO/);
 assert.match(html,/class="hero-art"/);
 assert.match(html,/class="ecosystem-grid"/);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"/);
});
test("three primary discovery paths are clear and distinct",async()=>{
 const html=await read('reimagined/index.html');
 for(const id of ['tools','ventures','hqconnect'])assert.ok(html.includes('href="#'+id+'"'),id);
 for(const label of ['Free tools','HQventures','HQconnect'])assert.ok(html.includes(label),label);
 for(const step of ['Discover','Validate','Design','Founder approval','Build &amp; launch','Learn &amp; improve']){
  assert.ok(html.includes(step.replaceAll('&amp;','&'))||html.includes(step),step);
 }
 assert.match(html,/Long-term partnership/);
});
test("the venture studio separates research signals from founder-approved launches",async()=>{
 const [html,js,policy]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('product-policy.mjs')
 ]);
 assert.match(html,/Products appear here only after research review and founder approval/);
 assert.match(html,/Founder review is mandatory/);
 assert.match(html,/id="venture-products"/);
 assert.match(html,/id="home-progress"/);
 assert.match(html,/Learn &amp; improve|Learn & improve/);
 assert.ok(js.includes('qualifiedProducts(allItems)'));
 assert.ok(js.includes('renderVentures'));
 assert.ok(policy.includes('founderApproval'));
 assert.ok(policy.includes("founder?.status==='approved'"));
});
test('Free Tools has catalogue search, categories, saved filter and pagination',async()=>{
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js')]);
 for(const id of ['tool-search','tool-categories','tool-results','saved-toggle','tool-prev','tool-next'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/function filteredTools\(/);
 assert.match(js,/function categoryChips\(/);
 assert.match(js,/function renderTools\(/);
 assert.match(js,/const pageSize=12/);
 assert.match(js,/toggleSaved/);
});

test("partnerships and contact are easy to discover without implying open enrollment",async()=>{
 const html=await read('reimagined/index.html');
 assert.match(html,/id="hqconnect"/);
 assert.match(html,/Long-term build &amp; maintenance partnership|Long-term build & maintenance partnership/);
 assert.match(html,/Build a product for me/);
 assert.match(html,/Every enquiry is reviewed by the founder/);
 assert.match(html,/name="consent" required/);
 assert.match(html,/id="contact-form"/);
 assert.match(html,/connect@yorphives.com/);
 assert.match(html,/No automated acceptance or guarantees/);
});
test('navigation and privacy controls cover mobile and desktop',async()=>{
 const [html,js,css]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('reimagined/studio.css')
 ]);
 assert.ok(html.includes('class="desktop-nav"'));
 assert.ok(html.includes('class="mobile-menu"'));
 assert.ok(html.includes('class="mobile-dock"'));
 assert.ok(html.includes('id="kofi-support" type="button" disabled'));
 assert.ok(html.includes('id="anonymous-analytics-toggle"'));
 assert.match(js,/aria-current/);
 assert.match(js,/retiredRoutes/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('release gate protects the new layout and the original tool catalogue',async()=>{
 const release=await read('scripts/release-check.mjs');
 assert.match(release,/FRESH STATIC RELEASE CHECK PASSED/);
 assert.ok(release.includes('Expected at least the 90 established public tools.'));
 assert.match(release,/Missing public page/);
 assert.match(release,/Privacy-first security headers/);
 assert.doesNotMatch(release,/home-explore|home-use|hero-geometry|renderFeaturedProject/);
});

test("mobile navigation keeps HQventures prominent while live tool actions come first",async()=>{
 const [html,css,js]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.css'),read('reimagined/studio.js')
 ]);
 const within=(opening,closing)=>{
  const first=html.indexOf(opening);
  assert.ok(first>=0,'missing '+opening);
  return html.slice(first,html.indexOf(closing,first));
 };
 for(const section of [within('<nav class="desktop-nav"','</nav>'),
  within('<nav class="mobile-menu"','</nav>'),
  within('<nav class="mobile-dock"','</nav>')]){
   assert.ok(section.indexOf('href="#tools"')>=0);
   assert.ok(section.indexOf('href="#ventures"')>=0);
   assert.ok(section.indexOf('href="#tools"')<section.indexOf('href="#ventures"'));
 }
 const hero=within('<div class="hero-actions"','</div>');
 assert.match(hero,/href="#tools"/);
 assert.match(hero,/href="#hqconnect"/);
 assert.match(html,/id="home-title"/);
 assert.match(html,/class="hero-art hero-system"/);
 assert.match(html,/Spot the signal/);
 assert.match(html,/Test the idea/);
 assert.match(html,/Decide &amp; create/);
 assert.doesNotMatch(html,/id="hero-quickstart-list"/);
 assert.match(html,/href="#tools"/);
 assert.match(html,/id="featured-tools-grid"/);
 assert.ok(html.indexOf('id="featured-title"')<html.indexOf('id="home-progress"'));
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.doesNotMatch(js,/function renderQuickstarts\(/);
});