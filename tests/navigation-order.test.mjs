import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('new desktop and mobile navigation share the same destinations',async()=>{
 const html=await readFile(resolve(root,'index.html'),'utf8');
 const desktop=html.split('<nav class="desktop-nav"')[1]?.split('</nav>')[0];
 const mobile=html.split('<nav class="mobile-dock"')[1]?.split('</nav>')[0];
 assert.ok(desktop,'desktop nav exists');assert.ok(mobile,'mobile nav exists');
 for(const dest of ['home','tools','explore','builders']){
  assert.ok(desktop.includes('href="#'+dest+'"'),dest+' desktop');
  assert.ok(mobile.includes('href="#'+dest+'"'),dest+' mobile');
 }
 assert.ok(mobile.includes('href="#connect"'));
 assert.match(html,/class="header-cta" href="#connect"/);
});
test('route updates aria-current on every nav location and supports deep links',async()=>{
 const js=await readFile(resolve(root,'next.js'),'utf8');
 assert.match(js,/querySelectorAll\('\[data-nav\]'\)/);
 assert.match(js,/setAttribute\('aria-current','page'\)/);
 assert.match(js,/hash==='post'\?'membership':hash/);
});
