import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');

test('a single first-party catalogue source refreshes automatically and notifies subscribers only on changes',async()=>{
 const url=pathToFileURL(resolve(root,'reimagined/catalog-sync.mjs')).href+'?test='+Date.now();
 const mod=await import(url);
 const savedFetch=globalThis.fetch;
 let response={items:[{type:'tool',name:'Alpha',category:'Files',url:'tools/alpha/'}]};
 let count=0;const observed=[];
 globalThis.fetch=async (url,opts)=>{count++;assert.equal(url,'../catalog.json');assert.equal(opts.cache,'no-store');return{ok:true,text:async()=>JSON.stringify(response)}};
 try{
  mod.subscribeCatalog(items=>observed.push(items.map(x=>x.name)));
  await mod.getCatalog();
  assert.deepEqual(observed,[['Alpha']]);
  await mod.refreshCatalog({force:true});
  assert.equal(observed.length,1,'unchanged catalogue should not trigger rerender');
  response={items:[{type:'tool',name:'Alpha v2',category:'Writing',url:'tools/alpha/'},{type:'tool',name:'Beta',category:'New Category',url:'tools/beta/'}]};
  await mod.refreshCatalog({force:true});
  assert.deepEqual(observed.at(-1),['Alpha v2','Beta']);
  assert.equal(observed.length,2);
  assert.equal(count,3);
 }finally{globalThis.fetch=savedFetch}
});

test('site uses the shared catalogue for both the tool directory and all home highlights',async()=>{
 const [studio,rotators,headers,readme]=await Promise.all(['reimagined/studio.js','reimagined/rotators.js','_headers','reimagined/README.md'].map(read));
 assert.match(studio,/subscribeCatalog\(applyCatalog\)/);
 assert.match(studio,/startCatalogMonitoring\(\)/);
 assert.match(studio,/activeCategory='All'/);
 assert.match(studio,/categoryChips\(\);updateSavedCount\(\);renderTools\(\);renderVentures\(\)/);
 assert.match(rotators,/subscribeCatalog\(onCatalogUpdate\)/);
 assert.match(rotators,/const categoryCounts=new Map\(\)/);
 assert.match(rotators,/card\.entries=safe/);
 assert.match(rotators,/applyUsageSnapshot\(publishedUsage\)/);
 assert.match(headers,new RegExp("/catalog\.json\n  Cache-Control: no-store"));
 assert.match(readme,/stable preview alias/);
});