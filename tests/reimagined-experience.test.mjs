import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const present=async p=>stat(resolve(root,p)).then(s=>s.isFile()).catch(()=>false);

test('reimagined experience has six page routes and homepage-only progress',async()=>{
 const html=await read('reimagined/index.html');
 for(const route of ['home','ventures','builders','tools','partners','contact']){
  assert.match(html,new RegExp('id="'+route+'"[^>]*aria-labelledby='),route);
  assert.ok(html.includes('href="#'+route+'"'),route+' route is linked');
 }
 assert.match(html,/class="topnav"/);assert.match(html,/class="mobile-dock"/);
 assert.match(html,/id="more-panel"/);assert.match(html,/id="mobile-menu"/);
 assert.match(html,/CLOUD-BASED • AI-POWERED VENTURE STUDIO/);
 assert.match(html,/Discover useful tools, explore emerging products/);
 assert.match(html,/class="hive-journey"/);
 assert.match(html,/href="#featured-ventures"/);
 assert.match(html,/class="home-featured-empty-actions"/);
 assert.match(html,/Explore Free Tools/);
  assert.match(html,/id="home-progress"/);
 assert.match(html,/id="home-tool-count"/);
 assert.match(html,/id="hive-fresh-title"/);
 assert.match(html,/id="activity-list"/);
 assert.doesNotMatch(html,/id="home-page-views"|id="home-completions"|id="home-venture-count"/);
 assert.doesNotMatch(html,/id="impact"|data-nav="impact"|href="#impact"/);
 assert.match(html,/DESIGN PREVIEW · NOT LIVE/);
 assert.match(html,/noindex,nofollow/);
});

test('new frontend is independent, local-first, and protects original tool engines',async()=>{
 const [html,js,css]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js'),read('reimagined/studio.css')]);
 assert.match(html,/href="studio\.css"/);
 assert.match(html,/src="studio\.js"/);
 assert.doesNotMatch(html,/(?:src|href)="https?:\/\//i);
 assert.doesNotMatch(css,/@import|url\(['"]?https?:/i);
 assert.doesNotMatch(js,/google-analytics|gtag|posthog|mixpanel|segment\.io|fingerprintjs/i);
 assert.match(js,/getCatalog\(\)/);
 const sync=await read('reimagined/catalog-sync.mjs');
 assert.match(sync,/fetch\('\.\.\/catalog\.json'/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
 assert.match(js,/link\.href='\.\.\/'\+t\.url/);
 assert.match(js,/saved=new Set/);assert.match(js,/localStorage/);
 assert.match(js,/saved-toggle/);assert.match(js,/tool-pagination/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:460px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test('homepage shows visitor benefits and verified tool updates, not internal analytics',async()=>{
 const [html,js,css]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js'),read('reimagined/studio.css')]);
 assert.match(html,/The Hive <em>at a Glance/);
 assert.match(html,/Fresh from <em>the Hive/);
 for(const key of ['home-tool-count','hive-fresh-title','activity-list'])
  assert.ok(html.includes('id="'+key+'"'),key);
 assert.match(html,/Browser-Based/);
 assert.match(html,/No Account Needed/);
 assert.match(html,/Explore All Free Tools/);
 assert.doesNotMatch(html,/home-page-views|home-completions|home-venture-count|RECORDED PAGE VIEWS|REPORTED TOOL COMPLETIONS|YorpHives BY THE NUMBERS/i);
 assert.doesNotMatch(js,/fetch\('\/api\/insights\/growth'|loadHomeMetrics|home-page-views|home-completions/);
 assert.match(js,/x\.kind==='tools'/);
 assert.match(js,/verifiedPublic\.has\(x\.url\)/);
 assert.match(js,/tools\.find\(t=>t\.url===x\.url\)/);
 assert.match(js,/tool\.name/);
 assert.match(css,/\.hive-benefits/);
 assert.match(css,/\.hive-fresh-grid/);
 assert.doesNotMatch(js,/impact-visitors|impact-tools|loadImpact\(|revenueAmount|grossRevenue|profitAmount|privateApiKey/);
});

test('new site is copied to preview after public-page audit and never to production',async()=>{
 const build=await read('scripts/build-site.mjs');
 const copy=build.indexOf("await cp(resolve(root,'reimagined'),resolve(dest,'reimagined'),{recursive:true})");
 const audit=build.indexOf('await auditHtml()');
 const preview=build.indexOf("if(target==='preview'){",audit);
 const prod=build.indexOf('}else{',preview);
 assert.ok(audit>0&&preview>audit&&copy>preview&&prod>copy);
 assert.ok((await read('reimagined/index.html')).includes('name="robots" content="noindex,nofollow"'));
 if(await present('dist/reimagined/index.html')){
   const rendered=await read('dist/reimagined/index.html');
   assert.match(rendered,/CLOUD-BASED • AI-POWERED VENTURE STUDIO/);
   assert.ok(await present('dist/reimagined/studio.css'));
   assert.ok(await present('dist/reimagined/studio.js'));
 } else {
   // This is the correct expected state for a production-only build.
   assert.ok(true);
 }
});