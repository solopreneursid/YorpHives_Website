import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('desktop, mobile menu and mobile dock share the new public destinations',async()=>{
 const html=await read('reimagined/index.html');
 const desktop=html.split('<nav class="desktop-nav"')[1]?.split('</nav>')[0];
 const mobile=html.split('<nav class="mobile-menu"')[1]?.split('</nav>')[0];
 const dock=html.split('<nav class="mobile-dock"')[1]?.split('</nav>')[0];
 assert.ok(desktop&&mobile&&dock);
 for(const dest of ['home','tools','ventures','partners']){
  assert.ok(desktop.includes('href="#'+dest+'"'),dest+' desktop');
  assert.ok(mobile.includes('href="#'+dest+'"'),dest+' mobile menu');
 }
 for(const dest of ['home','tools','ventures','contact'])assert.ok(dock.includes('href="#'+dest+'"'),dest+' dock');
 assert.match(html,/class="header-cta" href="#contact"/);
 assert.doesNotMatch(html,/href="#builders"|data-nav="builders"/);
});
test('retired Builder hashes return Home and navigation state remains accessible',async()=>{
 const js=await read('reimagined/studio.js');
 assert.match(js,/querySelectorAll\('\[data-nav\]'\)/);
 assert.match(js,/setAttribute\('aria-current','page'\)/);
 assert.ok(js.includes("retiredRoutes=new Set(['builders','opportunities','membership','post'])"));
 assert.match(js,/history\.replaceState/);
 assert.match(js,/explore:'ventures'/);
 assert.match(js,/connect:'contact'/);
});
