import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('the new homepage leads with a clear independent venture-studio proposition',async()=>{
 const html=await read('reimagined/index.html');
 assert.ok(html.includes('Useful tools.<br><em>Working software.</em>'));
 assert.ok(html.includes('Pick a task. Open a tool. Get it done.'));
 assert.match(html,/YORPHIVES \/ INDEPENDENT SOFTWARE STUDIO/);
 assert.match(html,/USEFUL TODAY · OPEN FOR EVERYONE/);
 assert.match(html,/class="hero-art"/);
 assert.match(html,/class="ecosystem-grid"/);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"/);
});

test('three primary discovery paths are clear and distinct',async()=>{
 const html=await read('reimagined/index.html');
 for(const id of ['tools','ventures','partners'])assert.ok(html.includes('href="#'+id+'"'));
 assert.ok(html.includes('Free tools'));
 assert.ok(html.includes('HQventures'));
 assert.ok(html.includes('Partnerships'));
 assert.ok(html.includes('Discover'));
 assert.ok(html.includes('Evaluate'));
 assert.ok(html.includes('Founder decides'));
 assert.match(html,/Build &(?:amp;)? improve/);
});

test('the venture studio separates research signals from founder-approved launches',async()=>{
 const [html,js,policy]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('product-policy.mjs')
 ]);
 assert.ok(html.includes('Nothing launches without approval'));
 assert.ok(html.includes('Products appear here only after research review and founder approval'));
 assert.ok(html.includes('id="venture-products"'));
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

test('partnerships and contact are easy to discover without implying open enrollment',async()=>{
 const html=await read('reimagined/index.html');
 assert.ok(html.includes('id="partners"'));
 assert.ok(html.includes('Product collaboration'));
 assert.ok(html.includes('Distribution'));
 assert.ok(html.includes('Content collaboration'));
 assert.ok(html.includes('Submitting an idea is an initial enquiry'));
 assert.ok(html.includes('id="contact-form"'));
 assert.ok(html.includes('connect@yorphives.com'));
 assert.ok(html.includes('Nothing is sent automatically by this website'));
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

test('mobile navigation keeps HQventures prominent while live tool actions come first',async()=>{
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
  assert.ok(section.indexOf('href="#ventures"')>=0);
  assert.ok(section.indexOf('href="#tools"')>=0);
  assert.ok(section.indexOf('href="#ventures"')<section.indexOf('href="#tools"'));
 }
 const hero=within('<div class="hero-actions"','</div>');
 assert.ok(hero.indexOf('href="#tools"')<hero.indexOf('href="#ventures"'));
 assert.match(html,/id="home-title">Useful tools/);
 assert.match(html,/id="hero-quickstart-list"/);
 for(const url of ['/tools/word-counter/','/tools/pdf-merge/','/tools/image-resizer/','/tools/qr-code-generator/'])
  assert.ok(html.includes('href="'+url+'"'),'Missing functional shortcut '+url);
 assert.ok(html.indexOf('id="featured-title"')<html.indexOf('id="home-progress"'));
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(js,/function renderQuickstarts\(/);
 assert.match(js,/quickstartToolUrls/);
});
