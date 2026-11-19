import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=path=>readFile(resolve(root,path),'utf8');
const exists=path=>stat(resolve(root,path)).then(x=>x.isFile()).catch(()=>false);

test('production release promotes the new design to the actual domain root',async()=>{
 const path=await exists('dist/release-candidate/index.html')?
  'dist/release-candidate/':'dist/';
 const home=await file(path+'index.html');
 if(path==='dist/'&&!home.includes('id="home-title"')){
  // Preview build still retains legacy root to protect the approved preview.
  assert.ok(await exists('dist/reimagined/index.html'));
  return;
 }
 assert.match(home,/id="home-title"/);
 assert.match(home,/CLOUD-BASED · AI-POWERED VENTURE STUDIO/);
 for(const view of ['home','ventures','tools','partners','contact'])
  assert.match(home,new RegExp('<section class="view" id="'+view+'"'),view);
 assert.match(home,/class="kofi-support" id="kofi-support" type="button" disabled/);
 assert.match(home,/rel="canonical" href="https:\/\/yorphives\.com\/"/);
 assert.doesNotMatch(home,/DESIGN PREVIEW · NOT LIVE|name="robots" content="noindex/);
 assert.match(home,/id="yh-pulse"/);
 assert.ok(home.indexOf('id="yh-pulse"')<home.indexOf('<footer class="footer">'));
 for(const asset of ['studio.css','studio.js','rotators.css','rotators.js',
  'catalog-sync.mjs','impact-public.json','usage-public.json'])
  assert.ok(await exists(path+asset),'missing '+path+asset);
 const impact=JSON.parse(await file(path+'impact-public.json'));
 const usage=JSON.parse(await file(path+'usage-public.json'));
 assert.equal(impact.publication.approvedByFounder,false);
 assert.equal(usage.publication.approvedByFounder,false);
 assert.deepEqual(usage.ranked,[]);
});

test('legacy Builders and membership hashes return Home while HQventures and Contact remain valid',async()=>{
 const js=await file('reimagined/studio.js');
 assert.match(js,/explore:'ventures'/);
 assert.match(js,/connect:'contact'/);
 assert.match(js,/retiredRoutes/);
 assert.match(js,/history\\.replaceState/);
 assert.doesNotMatch(js,/builders:'Builders'|opportunities:'builders'|membership:'builders'/);
 assert.match(js,/special\[hash\]/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
 const [reimagined,headers]=await Promise.all([
  file('reimagined/index.html'),file('_headers')
 ]);
 assert.match(reimagined,/id="kofi-support" type="button" disabled/);
 for(const asset of ['/catalog.json','/studio.js','/rotators.js','/catalog-sync.mjs',
  '/impact-public.json','/usage-public.json'])
  assert.ok(headers.includes(asset+'\n  Cache-Control:'),'Missing cache rule '+asset);
});

test('release uses the existing static tool catalogue and preserved routes',async()=>{
 const catalog=JSON.parse(await file('catalog.json'));
 const published=catalog.items.filter(x=>x.published!==false&&x.visibility!=='private');
 assert.ok(published.filter(x=>x.type==='tool').length>=143);
 const html=await file('dist/tools/word-counter/index.html');
 assert.match(html,/class="header-kofi tool-kofi" type="button" disabled/);
 assert.match(html,/Word &amp; Character Counter/);
 assert.match(html,/href="\.\.\/tool-next\.css"/);
 const directory=await file('dist/tools/index.html');
 assert.match(directory,/class="header-kofi tool-kofi" type="button" disabled/);
});
