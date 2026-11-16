import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const readBuild=p=>readFile(resolve(root,'dist',p),'utf8');

test('Impact follows HQventures and keeps the three original home experiences intact',async()=>{
 const html=await read('index.html'),home=html.split('<!-- TOOLS:')[0];
 const order=['home-explore','home-impact','home-use','home-connect'].map(x=>home.indexOf('id="'+x+'"'));
 assert.ok(order.every(x=>x>0));
 assert.ok(order.every((x,i)=>!i||x>order[i-1]));
 assert.match(home,/id="impact-title"/);
 assert.match(home,/Progress, <em>made visible\.<\/em>/);
 assert.match(home,/Verified milestones/);
 assert.match(home,/id="impact-tools"/);
 assert.match(home,/id="impact-visitors"/);
 assert.match(home,/id="impact-ventures"/);
 assert.match(home,/id="impact-partners"/);
 assert.match(home,/id="impact-revenue-chart"/);
 assert.match(home,/id="impact-apps"/);
 assert.match(home,/id="impact-milestone-list"/);
 assert.match(html,/href="#home-impact">Impact/);
});
test('public status is empty until founder approval and avoids false growth claims',async()=>{
 const data=JSON.parse(await read('impact-public.json'));
 assert.equal(data.schemaVersion,1);
 assert.equal(data.publication.status,'unpublished');
 assert.equal(data.publication.approvedByFounder,false);
 assert.equal(data.metrics.estimatedVisitors30d,null);
 assert.equal(data.metrics.verifiedPartners,null);
 assert.deepEqual(data.revenueDirection,[]);
 assert.deepEqual(data.trendingApps,[]);
 assert.deepEqual(data.milestones,[]);
 const html=await read('index.html');
 for(const label of ['Awaiting verified reporting','No published trend yet','Rankings appear when verified usage is available','Verified milestones will appear here'])
  assert.ok(html.includes(label),label);
});
test('impact counts come from canonical catalog and signed-off products, not invented values',async()=>{
 const js=await read('impact.js');
 assert.match(js,/fetch\('catalog\.json'/);
 assert.match(js,/qualifiedProducts\(data\.items\)/);
 assert.match(js,/renderCounters\(d\.metrics\)/);
 assert.match(js,/p\?\.approvedByFounder===true/);
 assert.match(js,/p\.approvedAt<=new Date/);
 assert.match(js,/return;\s*renderCounters/);
 assert.doesNotMatch(js,/fetch\(.*analytics-provider|google-analytics|posthog/i);
});
test('revenue public chart accepts up, flat or down only, never financial amounts',async()=>{
 const js=await read('impact.js');
 assert.match(js,/\[-1,0,1\]\.includes\(p\.direction\)/);
 assert.match(js,/No absolute amounts|No absolute amounts, scaled revenue/);
 assert.doesNotMatch(js,/\.revenueAmount|\.grossRevenue|\.profitAmount/);
 const html=await read('index.html');
 assert.match(html,/Actual revenue stays private/);
 assert.match(html,/Appears after verified financial reporting/);
});
test('responsive Impact respects reduced motion and small-screen width',async()=>{
 const css=await read('impact.css');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.impact-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.impact-insights\{grid-template-columns:1fr/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.impact-signal\{animation:none!important/);
 assert.doesNotMatch(css,/@import|url\(https?:/);
});
test('built preview includes local Impact assets and secure empty metric snapshot',async()=>{
 const [html,css,js,snapshot,headers]=await Promise.all([
  readBuild('index.html'),readBuild('impact.css'),readBuild('impact.js'),
  readBuild('impact-public.json'),readBuild('_headers')
 ]);
 assert.match(html,/href="impact\.css"/);
 assert.match(html,/src="impact\.js"/);
 assert.match(html,/id="home-impact"/);
 assert.match(css,/impact-metric-primary/);
 assert.match(js,/function renderMomentum/);
 assert.equal(JSON.parse(snapshot).publication.approvedByFounder,false);
 assert.match(headers,/\/impact-public\.json\n\s+Cache-Control: no-store/);
});
