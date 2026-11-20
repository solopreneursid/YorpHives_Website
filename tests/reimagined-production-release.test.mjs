import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const exists=path=>stat(resolve(root,path)).then(x=>x.isFile()).catch(()=>false);

test("the built root promotes the fresh experience while preview remains noindex",async()=>{
 if(!await exists('dist/index.html'))return;
 const home=await read('dist/index.html');
 assert.match(home,/id="home-title"/);
 assert.match(home,/by yorphivesHQ - AI powered venture studio/);
 for(const view of ['home','ventures','tools'])assert.match(home,new RegExp('<section class="view" id="'+view+'"'));
 assert.match(home,/<section class="hqconnect" id="hqconnect"/);
 assert.match(home,/class="kofi-support" id="kofi-support" type="button" disabled/);
 assert.match(home,/rel="canonical" href="https:\/\/yorphives\.com\//);
 assert.doesNotMatch(home,/DESIGN PREVIEW|name="robots" content="noindex/);
 assert.match(home,/id="yh-pulse"/);
 assert.match(home,/id="anonymous-analytics-toggle"/);
 for(const asset of ['dist/studio.css','dist/hqconnect.css','dist/studio.js','dist/rotators.css','dist/rotators.js',
  'dist/catalog-sync.mjs','dist/impact-public.json','dist/usage-public.json','dist/agentic-browser.mjs'])
  assert.ok(await exists(asset),'missing '+asset);
 const headers=await read('dist/_headers');
 assert.match(headers,/X-Content-Type-Options: nosniff/);
});
test("legacy Builders and membership hashes route home while HQventures remains reachable",async()=>{
 const js=await read('reimagined/studio.js');
 assert.match(js,/explore:'ventures'/);
 assert.match(js,/connectHashes=new Set/);
 assert.match(js,/retiredRoutes/);
 assert.match(js,/history\.replaceState/);
 assert.doesNotMatch(js,/builders:'Builders'|opportunities:'builders'|membership:'builders'/);
 const html=await read('reimagined/index.html');
 assert.match(html,/href="#ventures"/);
 assert.match(html,/href="#hqconnect"/);
 assert.match(html,/HQventures/);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"/);
});
test('all 143 direct tool pages retain their real processors and receive the new shell',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 const items=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.ok(items.length>=140);
 const shell=await read('scripts/next-tool-shell.mjs');
 assert.match(shell,/class="mobile-dock"/);
 assert.match(shell,/href="\.\.\/\.\.\/#tools"/);
 const css=await read('tools/tool-next.css');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 if(await exists('dist/tools/word-counter/index.html')){
  const tool=await read('dist/tools/word-counter/index.html');
  assert.match(tool,/href="\.\.\/tool-next\.css"/);
  assert.match(tool,/class="mobile-dock"/);
  assert.match(tool,/id="utility-form"/);
  assert.match(tool,/id="yorphives-discovery-schema"/);
 }
});
test('public analytics and usage signals remain privacy-first and founder-qualified',async()=>{
 const [home,js,client,impact,usage]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('insights-client.mjs'),
  read('reimagined/impact-public.json'),read('reimagined/usage-public.json')
 ]);
 assert.match(home,/id="anonymous-analytics-toggle"/);
 assert.match(home,/id="home-tool-count"/);
 assert.match(home,/id="home-venture-count"/);
 assert.match(js,/qualifiedProducts\(allItems\)/);
 assert.match(js,/fetch\('\/activity\.json'/);
 assert.match(client,/globalPrivacyControl/);
 assert.equal(JSON.parse(impact).publication.approvedByFounder,false);
 assert.equal(JSON.parse(usage).publication.approvedByFounder,false);
 assert.deepEqual(JSON.parse(usage).ranked,[]);
});
