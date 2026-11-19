import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [legacyHtml,legacyRouter,studioHtml,studioRouter,rotators,build,release,landings,redirects]=await Promise.all([
 read('index.html'),read('next.js'),read('reimagined/index.html'),read('reimagined/studio.js'),
 read('reimagined/rotators.js'),read('scripts/build-site.mjs'),read('scripts/release-check.mjs'),
 read('scripts/section-landings.mjs'),read('_redirects')
]);

test('the production homepage and legacy template no longer expose a Builders page',()=>{
 for(const html of [legacyHtml,studioHtml]){
  assert.doesNotMatch(html,/id=["']builders["']/i);
  assert.doesNotMatch(html,/href=["']#builders["']/i);
  assert.doesNotMatch(html,/data-nav=["']builders["']/i);
  assert.doesNotMatch(html,/\bBuilders\b/i);
 }
 assert.equal((studioHtml.match(/class="eco-card eco-/g)||[]).length,2);
 assert.equal((studioHtml.match(/class="eco-strip eco-strip-/g)||[]).length,2);
});

test('Partnerships remains a standalone, reachable page',()=>{
 assert.match(legacyHtml,/id="partners"/);
 assert.match(studioHtml,/id="partners"/);
 assert.match(studioHtml,/href="#partners"/);
 assert.match(studioHtml,/Partnerships/);
});

test('old Builder URLs and hashes safely return visitors to Home',()=>{
 for(const router of [legacyRouter,studioRouter]){
  assert.match(router,/retiredRoutes/);
  assert.match(router,/history\.replaceState/);
 }
 for(const rule of ['/builders / 301','/builders/ / 301','/builders/* / 301'])
  assert.ok(redirects.includes(rule),rule);
});

test('Builders-only feeds, SEO pages, and release dependencies are retired',()=>{
 assert.doesNotMatch(rotators,/builders-updates|builderFeed|builderEntries/);
 assert.doesNotMatch(build,/builders-updates|builderNotes|Builders-only/);
 assert.doesNotMatch(release,/builders-updates|builderFeed/);
 assert.doesNotMatch(landings,/builders|Builders|#builders/);
});
