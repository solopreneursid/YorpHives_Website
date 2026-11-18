import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile,stat}from'node:fs/promises';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','dist');
test('section pages are uniquely indexable and registered in sitemap',async()=>{
 const sitemap=await readFile(resolve(root,'sitemap.xml'),'utf8');
 const {sectionLandingPaths}=await import('../scripts/section-landings.mjs');
 assert.deepEqual(sectionLandingPaths,['hqventures/','builders/','partnerships/']);
 for(const route of sectionLandingPaths){
  const url='https://yorphives.com/'+route;
  const html=await readFile(resolve(root,route,'index.html'),'utf8');
  assert.match(html,/<main\b/);
  assert.match(html,/<h1\b/);
  assert.match(html,/<meta name="description"/);
  assert.equal(html.split('<link rel="canonical"').length,2);
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'));
  assert.ok(html.includes('<meta property="og:url" content="'+url+'">'));
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'));
  assert.doesNotMatch(html,/noindex|DESIGN PREVIEW|https:\/\/[^"' ]+\.workers\.dev/i);
  const structured=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(structured);
  assert.equal(JSON.parse(structured[1]).url,url);
 }
 assert.ok((await stat(resolve(root,'section-landing.css'))).size>200);
});
test('landing pages preserve low-cost, founder-reviewed, non-transactional behavior',async()=>{
 for(const route of ['hqventures/','builders/','partnerships/']){
  const html=await readFile(resolve(root,route,'index.html'),'utf8');
  assert.doesNotMatch(html,/<form|<iframe|<script\s+src=|payment|checkout|subscribe now/i);
  assert.ok(html.includes('href="/tools/"'));
 }
});
