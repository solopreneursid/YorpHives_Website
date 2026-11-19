import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const exists=p=>stat(resolve(root,p)).then(x=>x.isFile()).catch(()=>false);

test('fresh YorpHives experience has five clear routes and accessible navigation',async()=>{
 const html=await read('reimagined/index.html');
 for(const route of ['home','ventures','tools','partners','contact']){
  assert.match(html,new RegExp('<section class="view" id="'+route+'"[^>]*aria-labelledby='),route);
  assert.ok(html.includes('href="#'+route+'"'),route+' route is linked');
 }
 assert.match(html,/class="desktop-nav"/);
 assert.match(html,/class="mobile-menu"/);
 assert.match(html,/class="mobile-dock"/);
 assert.match(html,/CLOUD-BASED · AI-POWERED VENTURE STUDIO/);
 assert.match(html,/Free tools\. New ventures\. People building what's next\./);
 assert.match(html,/id="home-title"/);
 assert.match(html,/id="featured-tools-grid"/);
 assert.match(html,/id="tool-search"/);
 assert.match(html,/id="venture-products"/);
 assert.match(html,/id="contact-form"/);
 assert.match(html,/id="yh-pulse"/);
 assert.match(html,/id="yh-pulse-item"/);
 assert.match(html,/id="kofi-support"/);
 assert.match(html,/id="anonymous-analytics-toggle"/);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"/);
});
test('the new visual system is original, responsive and reduced-motion safe',async()=>{
 const css=await read('reimagined/studio.css');
 assert.match(css,/:root\{/);
 assert.match(css,/--lime:#d8f36a/);
 assert.match(css,/\.hero-layout\{display:grid/);
 assert.match(css,/\.ecosystem-grid\{display:grid/);
 assert.match(css,/\.featured-tools-grid\{display:grid/);
 assert.match(css,/\.mobile-dock\{/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/@import|url\(['"]?https?:/i);
});
test('public discovery is catalog-backed, searchable and paginated',async()=>{
 const [js,html]=await Promise.all([read('reimagined/studio.js'),read('reimagined/index.html')]);
 assert.match(js,/getCatalog\(\)/);
 assert.match(js,/subscribeCatalog\(applyCatalog\)/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
 assert.match(js,/function filteredTools\(/);
 assert.match(js,/const pageSize=12/);
 assert.match(js,/toggleSaved/);
 assert.match(js,/readSaved/);
 assert.match(js,/function renderVentures\(/);
 assert.match(html,/id="tool-results"/);
 assert.match(html,/id="tool-categories"/);
 assert.match(html,/id="tool-pagination"/);
 assert.match(html,/id="saved-toggle"/);
});
test('public progress and portfolio never imply an unapproved launch',async()=>{
 const [html,js,policy]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('product-policy.mjs')
 ]);
 assert.match(html,/id="home-venture-count"/);
 assert.match(html,/id="home-progress"/);
 assert.match(html,/Products appear here only after research review and founder approval/);
 assert.match(html,/Nothing launches without approval/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
 assert.match(js,/fetch\('\/activity\.json'/);
 assert.match(policy,/approvedByFounder/);
});
test('fresh root uses only local assets and first-party analytics controls',async()=>{
 const [html,js,client]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('insights-client.mjs')
 ]);
 assert.match(html,/href="studio\.css"/);
 assert.match(html,/src="studio\.js"/);
 assert.match(html,/src="\/insights-client\.mjs"/);
 assert.doesNotMatch(html,/(?:src|href)="https?:\/\//i);
 assert.match(html,/id="anonymous-analytics-toggle"/);
 assert.match(client,/globalPrivacyControl/);
 assert.match(client,/navigator\.doNotTrack/);
 assert.match(js,/retiredRoutes/);
 assert.doesNotMatch(js,/google-analytics|gtag|posthog|mixpanel|segment\.io/i);
});
test('the direct A–Z library remains crawlable and searchable',async()=>{
 const [html,css,search]=await Promise.all([
  read('tools/index.html'),read('tools/directory-next.css'),read('tools/directory-search.mjs')
 ]);
 assert.match(html,/TOOL_DIRECTORY_START/);
 assert.match(html,/TOOL_DIRECTORY_END/);
 assert.match(html,/id="directory-search"/);
 assert.match(html,/id="directory-saved-only"/);
 assert.match(css,/\.directory-card/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(search,/directory-search-status/);
});
test('the release gate validates the fresh design rather than the retired layout',async()=>{
 const release=await read('scripts/release-check.mjs');
 assert.match(release,/FRESH STATIC RELEASE CHECK PASSED/);
 assert.match(release,/home-title/);
 assert.match(release,/directory-search/);
 assert.match(release,/mobile-dock/);
 assert.doesNotMatch(release,/home-explore|home-use|hero-geometry|renderFeaturedProject/);
});
