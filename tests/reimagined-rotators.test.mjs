import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('two lightweight, separately sourced rotating strips live inside their own ecosystem cards',async()=>{
 const html=await read('reimagined/index.html');
 for(const kind of ['ventures','tools']){
  const source=new RegExp('class="eco-card eco-'+kind+'"[^\\n]+data-strip="'+kind+'"[^\\n]+</a>');
  assert.match(html,source,kind+' ticker must remain inside original card link');
  assert.match(html,new RegExp('id="eco-strip-'+kind+'"'));
 }
 assert.equal((html.match(/class="eco-strip eco-strip-/g)||[]).length,2);
 assert.match(html,/id="eco-motion-toggle"/);
 assert.match(html,/href="rotators.css"/);
 assert.match(html,/src="rotators.js"/);
 assert.ok(html.indexOf('class="yh-pulse"')<html.indexOf('<footer class="footer">'));
 assert.match(html,/id="yh-pulse-item"/);
 assert.match(html,/id="yh-pulse-toggle"/);
 assert.equal((html.match(/id="yh-pulse"/g)||[]).length,1);
});

test('rotating data uses genuine published categories and qualified products',async()=>{
 const js=await read('reimagined/rotators.js');
 assert.match(js,/qualifiedProducts\(items\)/);
 assert.match(js,/const tools=items.filter\(publicTool\)/);
 assert.match(js,/categoryCounts/);
 assert.match(js,/useCard\('ventures',qualified\.map/);
 assert.match(js,/useCard\('tools',categories/);
 assert.match(js,/\.slice\(0,10\)/);
 assert.match(js,/const displayEntries=entries\.length\?entries:fallback\[key\]/);
 assert.match(js,/renderTicker\(card\)/);
 assert.match(js,/ecoPaused/);
 assert.match(js,/document.hidden/);
 assert.match(js,/mql.matches/);
 assert.match(js,/ecoPaused/);
 assert.match(js,/pulsePaused/);
 assert.match(js,/yorphives:select-tool-category/);
 assert.match(await read('reimagined/studio.js'),/document.addEventListener\('yorphives:select-tool-category'/);
});

test('YHpulse publishes no fake most-used list without founder-approved verified usage',async()=>{
 const data=JSON.parse(await read('reimagined/usage-public.json'));
 assert.equal(data.schemaVersion,1);
 assert.equal(data.publication.status,'unpublished');
 assert.equal(data.publication.approvedByFounder,false);
 assert.equal(data.publication.metric,'completed_uses');
 assert.equal(data.publication.periodDays,30);
 assert.deepEqual(data.ranked,[]);
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/rotators.js')]);
 assert.match(html,/Rankings appear after completed tool actions are recorded./);
 assert.match(html,/id="yh-pulse-toggle"[^>]+disabled/);
 assert.match(js,/data\.ranked\.length<=10/);
 assert.match(js,/p\.approvedByFounder===true/);
 assert.match(js,/p\.metric==='completed_uses'/);
 assert.match(js,/qualifiedProducts\(\[x\]\)/);
 assert.doesNotMatch(js,/fakeVisits|mockData|dummyAnalytics|Math\.random/);
});

test('the retired Builders feed is no longer generated or requested',async()=>{
 const [build,rotators,html,headers]=await Promise.all([
  read('scripts/build-site.mjs'),read('reimagined/rotators.js'),
  read('reimagined/index.html'),read('_headers')
 ]);
 assert.doesNotMatch(build,/builders-updates|builderNotes|Builders-only/);
 assert.doesNotMatch(rotators,/builders-updates|builderFeed|builderEntries/);
 assert.doesNotMatch(html,/builders-updates|data-strip="builders"|id="builders"/);
 assert.doesNotMatch(headers,/builders-updates/);
});

test('mobile strip layout and motion respect reduced-motion and overflow protection',async()=>{
 const css=await read('reimagined/rotators.css');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:460px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/\.eco-strip-copy\{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
});