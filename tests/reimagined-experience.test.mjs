import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const present=async p=>stat(resolve(root,p)).then(s=>s.isFile()).catch(()=>false);

test('full reimagined experience has six complete page routes and separate navigation',async()=>{
 const html=await read('reimagined/index.html');
 for(const route of ['home','ventures','builders','tools','partners','contact']){
  assert.match(html,new RegExp('id="'+route+'"[^>]*aria-labelledby='),route);
  assert.ok(html.includes('href="#'+route+'"'),route+' route is linked');
 }
 assert.match(html,/class="topnav"/);assert.match(html,/class="mobile-dock"/);
 assert.match(html,/id="more-panel"/);assert.match(html,/id="mobile-menu"/);
 assert.match(html,/CLOUD-BASED · AI-POWERED VENTURE STUDIO/);
 assert.match(html,/Free tools\. New ventures\. People building what/);
 assert.doesNotMatch(html,/<section class="view" id="impact"/);
 assert.doesNotMatch(html,/<a[^>]*href="#impact"/);
 assert.match(html,/id="home-progress"/);
 assert.match(html,/href="#home-progress">See our progress/);
 assert.match(html,/id="hero-tool-count"/);
 assert.match(html,/id="featured-tools-grid"/);
 assert.match(html,/id="featured-tools-title"/);
 assert.match(html,/Start with something <em>useful\.<\/em>/);
 assert.match(html,/Explore <em>YorpHives\.<\/em>/);
 assert.match(html,/id="hero-primary-link" href="#tools">Explore <span id="hero-tool-count"/);
 assert.match(html,/id="kofi-support"/);
 assert.match(html,/id="anonymous-analytics-toggle"/);
 assert.match(html,/DESIGN PREVIEW · NOT LIVE/);
 assert.match(html,/noindex,nofollow/);
});

test('3D navigation is tactile, accessible, and does not delay routing',async()=>{
 const [css,js]=await Promise.all([read('reimagined/studio.css'),read('reimagined/studio.js')]);
 assert.match(css,/\.topbar \.topnav a:active/);
 assert.match(css,/\.topbar \.topnav a\[aria-current=page\]/);
 assert.match(css,/\.mobile-dock a:active/);
 assert.match(css,/\.topbar a:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/yorp-view-appear/);
 assert.match(css,/Equal-size 3D primary navigation/);
 assert.match(css,/\.topbar \.topnav a,\.topbar \.header-actions \.header-partner/);
 assert.match(css,/width:112px/);
 assert.match(css,/height:43px/);
 assert.match(css,/width:91px/);

 assert.match(js,/routeReady&&changed&&allowsMotion\(\)/);
 assert.match(js,/routeMotionTimer=setTimeout/);
 assert.match(js,/views\.forEach\(v=>v\.hidden=v\.id!==active\)/);
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

test('homepage retains truthful progress without a separate Impact page',async()=>{
 const [html,js,data]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js'),read('reimagined/impact-public.json')]);
 assert.match(html,/Built\. Published\. <em>Improving\.<\/em>/);
 assert.match(html,/id="home-tool-count"/);
 assert.match(html,/class="building-public-grid"/);
 assert.match(html,/id="home-tool-badge"/);
 assert.match(html,/id="activity-list"/);
 assert.match(html,/class="hero-quicklinks"/);
 assert.doesNotMatch(html,/class="footer-statement"/);
 assert.match(html,/id="home-venture-count"/);
 assert.match(html,/href="#tools">Explore our free tools/);
 assert.doesNotMatch(html,/id="impact-title"|data-nav="impact"/);
 assert.doesNotMatch(js,/renderPublicImpact|loadImpact/);
 assert.equal(JSON.parse(data).publication.approvedByFounder,false);
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
   assert.match(rendered,/CLOUD-BASED · AI-POWERED VENTURE STUDIO/);
   assert.ok(await present('dist/reimagined/studio.css'));
   assert.ok(await present('dist/reimagined/studio.js'));
 } else {
   // This is the correct expected state for a production-only build.
   assert.ok(true);
 }
});