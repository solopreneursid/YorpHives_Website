import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('the new homepage leads with a clear independent venture-studio proposition',async()=>{
 const html=await read('reimagined/index.html');
 assert.match(html,/Curiosity in\.<br><em>Useful things out\.<\/em>/);
 assert.match(html,/Free tools\. New ventures\. People building what's next\./);
 assert.match(html,/CLOUD-BASED · AI-POWERED VENTURE STUDIO/);
 assert.match(html,/INDEPENDENT\. HUMAN-LED\. BUILT TO EVOLVE\./);
 assert.match(html,/class="hero-art"/);
 assert.match(html,/class="ecosystem-grid"/);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"/);
});
test('three primary discovery paths replace repeated homepage explanations',async()=>{
 const html=await read('reimagined/index.html');
 for(const id of ['tools','ventures','partners'])assert.match(html,new RegExp('href="#'+id+'"'));
 assert.match(html,/Free tools/);
 assert.match(html,/HQventures/);
 assert.match(html,/Partnerships/);
 assert.match(html,/id="home-progress"/);
 assert.match(html,/Discover/);
 assert.match(html,/Evaluate/);
 assert.match(html,/Founder decides/);
 assert.match(html,/Build & improve/);
});
test('the venture studio separates research signals from founder-approved launches',async()=>{
 const [html,js,policy]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('product-policy.mjs')
 ]);
 assert.match(html,/Nothing launches without approval/);
 assert.match(html,/Products appear here only after research review and founder approval/);
 assert.match(html,/id="venture-products"/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
 assert.match(js,/renderVentures/);
 assert.match(policy,/approvedByFounder/);
});
test('Free Tools has working catalogue search, categories, saved filter and pagination',async()=>{
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js')]);
 for(const id of ['tool-search','tool-categories','tool-results','saved-toggle','tool-prev','tool-next'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/function filteredTools\(/);
 assert.match(js,/function categoryChips\(/);
 assert.match(js,/function renderTools\(/);
 assert.match(js,/const pageSize=12/);
 assert.match(js,/toggleSaved/);
});
test('partnerships and contact are easy to discover without implying open enrollment',async()=>{
 const html=await read('reimagined/index.html');
 assert.match(html,/id="partners"/);
 assert.match(html,/Product collaboration/);
 assert.match(html,/Distribution/);
 assert.match(html,/Content collaboration/);
 assert.match(html,/Submitting an idea is an initial enquiry/);
 assert.match(html,/id="contact-form"/);
 assert.match(html,/connect@yorphives\.com/);
 assert.match(html,/Nothing is sent automatically by this website/);
});
test('navigation and privacy controls cover mobile and desktop',async()=>{
 const [html,js,css]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('reimagined/studio.css')
 ]);
 assert.match(html,/class="desktop-nav"/);
 assert.match(html,/class="mobile-menu"/);
 assert.match(html,/class="mobile-dock"/);
 assert.match(html,/id="kofi-support" type="button" disabled/);
 assert.match(html,/id="anonymous-analytics-toggle"/);
 assert.match(js,/aria-current/);
 assert.match(js,/retiredRoutes/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('release gate protects the new layout and the original tool catalogue',async()=>{
 const release=await read('scripts/release-check.mjs');
 assert.match(release,/FRESH STATIC RELEASE CHECK PASSED/);
 assert.match(release,/Expected at least 90/);
 assert.match(release,/Missing public page/);
 assert.match(release,/Privacy-first security headers/);
 assert.doesNotMatch(release,/home-explore|home-use|hero-geometry|renderFeaturedProject/);
});
