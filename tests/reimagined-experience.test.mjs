import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const present=async p=>stat(resolve(root,p)).then(s=>s.isFile()).catch(()=>false);

test('full reimagined experience has seven complete page routes and separate navigation',async()=>{
 const html=await read('reimagined/index.html');
 for(const route of ['home','ventures','builders','impact','tools','partners','contact']){
  assert.match(html,new RegExp('id="'+route+'"[^>]*aria-labelledby='),route);
  assert.ok(html.includes('href="#'+route+'"'),route+' route is linked');
 }
 assert.match(html,/class="topnav"/);assert.match(html,/class="mobile-dock"/);
 assert.match(html,/id="more-panel"/);assert.match(html,/id="mobile-menu"/);
 assert.match(html,/CLOUD-BASED · AI-POWERED VENTURE STUDIO/);
 assert.match(html,/YorpHivesHQ finds the signal/);
 assert.match(html,/results speak|Results speak/i);
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

test('public Impact never fabricates visitors, partners, revenue, or achievements',async()=>{
 const data=JSON.parse(await read('reimagined/impact-public.json'));
 assert.equal(data.schemaVersion,1);
 assert.equal(data.publication.status,'unpublished');
 assert.equal(data.publication.approvedByFounder,false);
 assert.equal(data.metrics.estimatedVisitors30d,null);
 assert.equal(data.metrics.verifiedPartners,null);
 assert.deepEqual(data.revenueDirection,[]);
 assert.deepEqual(data.trendingApps,[]);
 assert.deepEqual(data.milestones,[]);
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js')]);
 for(const claim of ['First-party anonymous sessions · new collection','No revenue has been published','Rankings appear once real application usage is verified','Verified milestones will appear'])
  assert.ok(html.includes(claim),claim);
 assert.match(js,/p\.publication\.approvedByFounder===true/);
 assert.match(js,/\[-1,0,1\]\.includes\(x\.direction\)/);
 assert.match(js,/verifiedPublic\.has\(item\.proofUrl\)/);
 assert.doesNotMatch(js,/revenueAmount|grossRevenue|profitAmount|privateApiKey/);
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