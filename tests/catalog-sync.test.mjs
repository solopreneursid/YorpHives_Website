import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');

test('one first-party catalogue refreshes automatically and notifies subscribers only on changes',async()=>{
 const url=pathToFileURL(resolve(root,'reimagined/catalog-sync.mjs')).href+'?test='+Date.now();
 const mod=await import(url),savedFetch=globalThis.fetch;
 let response={items:[{type:'tool',name:'Alpha',category:'Files',url:'tools/alpha/'}]};
 let count=0;const observed=[];
 globalThis.fetch=async(path,options)=>{
  count++;assert.equal(path,'../catalog.json');assert.equal(options.cache,'no-store');
  return{ok:true,text:async()=>JSON.stringify(response)};
 };
 try{
  mod.subscribeCatalog(items=>observed.push(items.map(x=>x.name)));
  await mod.getCatalog();
  assert.deepEqual(observed,[['Alpha']]);
  await mod.refreshCatalog({force:true});
  assert.equal(observed.length,1,'unchanged catalogue should not trigger rerender');
  response={items:[{type:'tool',name:'Alpha v2',category:'Writing',url:'tools/alpha/'},{type:'tool',name:'Beta',category:'New Category',url:'tools/beta/'}]};
  await mod.refreshCatalog({force:true});
  assert.deepEqual(observed.at(-1),['Alpha v2','Beta']);
  assert.equal(observed.length,2);assert.equal(count,3);
 }finally{globalThis.fetch=savedFetch}
});

test('the live studio uses the shared catalogue for homepage cards and the searchable tool library',async()=>{
 const [studio,home,headers,build]=await Promise.all([
  read('reimagined/studio.js'),read('reimagined/index.html'),read('_headers'),read('scripts/build-site.mjs')
 ]);
 assert.match(studio,/subscribeCatalog\(applyCatalog\)/);
 assert.match(studio,/startCatalogMonitoring\(\)/);
 assert.match(studio,/activeCategory='All'/);
 assert.match(studio,/categoryChips\(\);renderQuickstarts\(\);renderFeaturedTools\(\);renderTools\(\);renderVentures\(\)/);
 assert.match(studio,/getCatalog\(\)\.then\(\(\)=>loadActivity\(\)\)/);
 assert.match(home,/id="featured-tools-grid"/);
 assert.match(home,/id="hero-quickstart-list"/);
 assert.match(home,/id="tool-categories"/);
 assert.match(headers,/\/catalog\.json\n  Cache-Control: no-store/);
 assert.match(build,/publishReimaginedRoot\('release-candidate\/'\)/);
 assert.doesNotMatch(home,/src="rotators\.js"|href="rotators\.css"/);
});
