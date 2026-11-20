import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('served fresh homepage and preview no longer expose a Builders page',async()=>{
 const [built,source,router]=await Promise.all([
  read('dist/index.html'),read('reimagined/index.html'),read('reimagined/studio.js')
 ]);
 for(const html of [built,source]){
  assert.doesNotMatch(html,/id=["']builders["']|href=["']#builders["']|data-nav=["']builders["']/i);
 }
 assert.match(router,/retiredRoutes/);
 assert.match(router,/history\.replaceState/);
});

test("Partnerships remains a standalone, reachable page",async()=>{
 const [built,source]=await Promise.all([read('dist/index.html'),read('reimagined/index.html')]);
 for(const html of [built,source]){
  assert.match(html,/<section class="hqconnect" id="hqconnect"/);
  assert.match(html,/data-interest="Long-term partnership"/);
  assert.match(html,/data-interest="Build a product"/);
  assert.doesNotMatch(html,/<section class="view" id="partners"|<section class="view" id="contact"/);
 }
});
test('old Builder URLs and hashes safely return visitors to Home',async()=>{
 const [router,redirects]=await Promise.all([read('reimagined/studio.js'),read('_redirects')]);
 assert.match(router,/retiredRoutes/);
 assert.match(router,/history\.replaceState/);
 for(const rule of ['/builders / 301','/builders/ / 301','/builders/* / 301'])assert.ok(redirects.includes(rule),rule);
});

test('Builders-only feeds and release dependencies are retired',async()=>{
 const [rotators,build,release,landings]=await Promise.all([
  read('reimagined/rotators.js'),read('scripts/build-site.mjs'),
  read('scripts/release-check.mjs'),read('scripts/section-landings.mjs')
 ]);
 assert.doesNotMatch(rotators,/builders-updates|builderFeed|builderEntries/);
 assert.doesNotMatch(build,/builders-updates|builderNotes|Builders-only/);
 assert.doesNotMatch(release,/builders-updates|builderFeed/);
 assert.doesNotMatch(landings,/builders|Builders|#builders/);
});
