import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('desktop and mobile navigation share the current public destinations',async()=>{
 const html=await read('index.html');
 const desktop=html.split('<nav class="desktop-nav"')[1]?.split('</nav>')[0];
 const mobile=html.split('<nav class="mobile-dock"')[1]?.split('</nav>')[0];
 assert.ok(desktop,'desktop nav exists');assert.ok(mobile,'mobile nav exists');
 for(const dest of ['home','tools','explore','partners']){
  assert.ok(desktop.includes('href="#'+dest+'"'),dest+' desktop');
  assert.ok(mobile.includes('href="#'+dest+'"'),dest+' mobile');
 }
 assert.ok(mobile.includes('href="#connect"'));
 assert.match(html,/class="header-cta" href="#connect"/);
 assert.doesNotMatch(html,/href="#builders"|data-nav="builders"/);
});

test('retired Builder and membership hashes return Home; active navigation remains accessible',async()=>{
 const js=await read('next.js');
 assert.match(js,/querySelectorAll\('\[data-nav\]'\)/);
 assert.match(js,/setAttribute\('aria-current','page'\)/);
 assert.match(js,/retiredRoutes = new Set\(\['builders','post','opportunities','membership'\]\)/);
 assert.match(js,/history\.replaceState/);
 assert.doesNotMatch(js,/builders:'Builders'|opportunities:'builders'|membership:'builders'/);
});
