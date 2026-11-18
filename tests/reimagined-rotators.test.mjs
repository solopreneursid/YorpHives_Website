import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('three lightweight, separately sourced rotating strips live inside their own ecosystem cards',async()=>{
 const html=await read('reimagined/index.html');
 for(const kind of ['ventures','builders','tools']){
  const source=new RegExp('class="eco-card eco-'+kind+'"[^\\n]+data-strip="'+kind+'"[^\\n]+</a>');
  assert.match(html,source,kind+' ticker must remain inside original card link');
  assert.match(html,new RegExp('id="eco-strip-'+kind+'"'));
 }
 assert.equal((html.match(/class="eco-strip eco-strip-/g)||[]).length,3);
 assert.match(html,/id="eco-motion-toggle"/);
 assert.match(html,/href="rotators.css"/);
 assert.match(html,/src="rotators.js"/);
 assert.doesNotMatch(html,/id="yh-pulse"|id="yh-pulse-item"/);
 assert.match(html,/id="home-progress"/);
});

test('rotating data uses genuine published categories, qualified products and verified builders',async()=>{
 const js=await read('reimagined/rotators.js');
 assert.match(js,/qualifiedProducts\(items\)/);
 assert.match(js,/const tools=items.filter\(publicTool\)/);
 assert.match(js,/categoryCounts/);
 assert.match(js,/useCard\('ventures',qualified\.map/);
 assert.match(js,/useCard\('tools',categories/);
 assert.match(js,/useCard\('builders',builderEntries/);
 assert.match(js,/builderRows.filter\(event=>event\?\.kind==='builders'/);
 assert.match(js,/\.slice\(0,10\)/);
 assert.match(js,/if\(card\.entries\.length<2\|\|!canMove/);
 assert.match(js,/document.hidden/);
 assert.match(js,/mql.matches/);
 assert.match(js,/ecoPaused/);
 assert.doesNotMatch(js,/pulsePaused|initPulse\(/);
 assert.match(js,/yorphives:select-tool-category/);
 assert.match(await read('reimagined/studio.js'),/document.addEventListener\('yorphives:select-tool-category'/);
});

test('retired usage ticker stays absent while the homepage shows visitor benefits',async()=>{
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/rotators.js')]);
 for(const id of ['home-tool-count','hive-fresh-title','activity-list'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/id="yh-pulse"|id="yh-pulse-toggle"|id="home-page-views"|id="home-completions"/);
 assert.doesNotMatch(js,/initPulse\(|refreshUsage\(|pulsePaused|fakeVisits|Math\.random/);
 const usage=JSON.parse(await read('reimagined/usage-public.json'));
 assert.equal(usage.publication.approvedByFounder,false);
 assert.deepEqual(usage.ranked,[]);
});

test('Builders update generator independently collects newest ten verified public updates',async()=>{
 const build=await read('scripts/build-site.mjs');
 assert.match(build,/const publicNotes=await loadActivityNotes\(root\)/);
 assert.match(build,/const builderNotes=\[\.\.\.publicNotes,\.\.\.publicPageChanges\]/);
 assert.match(build,/e\?\.kind==='builders'&&e\.url==='#builders'/);
 assert.match(build,/\.slice\(0,10\)\.map\(\(\{id,kind,title,url,timestamp\}\)/);
 const copy=build.indexOf("await cp(resolve(root,'reimagined'),resolve(dest,'reimagined'),{recursive:true})");
 const builderWrite=build.indexOf("await write('reimagined/builders-updates.json'");
 const audit=build.indexOf('await auditHtml()');
 const preview=build.indexOf("if(target==='preview'){",audit);
 const production=build.indexOf('}else{',preview);
 assert.ok(audit>0&&preview>audit&&copy>preview&&builderWrite>copy&&production>builderWrite);
 const path=resolve(root,'dist/reimagined/builders-updates.json');
 if(await stat(path).then(s=>s.isFile()).catch(()=>false)){
  const feed=JSON.parse(await read('dist/reimagined/builders-updates.json'));
  assert.ok(Array.isArray(feed.items)&&feed.items.length<=10);
  assert.ok(feed.items.every(x=>x.kind==='builders'&&x.url==='#builders'));
 }
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