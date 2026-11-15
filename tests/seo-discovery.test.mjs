import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile,stat}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(p,base=root)=>readFile(resolve(base,p),'utf8');
const dest=resolve(root,'dist');
test('all published catalog pages have direct canonicals and valid page-specific structured data',async()=>{
 const entries=JSON.parse(await read('catalog.json')).items.filter(x=>x.published!==false&&x.visibility!=='private');
 assert.ok(entries.length>=90);
 for(const item of entries){
  const url='https://yorphives.com/'+item.url;
  const html=await read(item.url.endsWith('/')?item.url+'index.html':item.url,dest);
  assert.equal((html.match(/<link rel="canonical"/g)||[]).length,1,item.url);
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),item.url);
  assert.ok(html.includes('<meta property="og:url" content="'+url+'">'),item.url);
  const block=html.match(/<script type="application\/ld\+json" id="yorphives-discovery-schema">([\s\S]*?)<\/script>/);
  assert.ok(block,item.url);
  const data=JSON.parse(block[1]);
  assert.equal(data['@context'],'https://schema.org');
  assert.ok(data['@graph'].find(x=>x.url===url&&x['@id']===url+'#main-entity'),item.url);
  assert.ok(data['@graph'].find(x=>x['@type']==='BreadcrumbList'),item.url);
 }
});
test('preview deployments are explicitly noindex but stay crawlable for the header',async()=>{
 const headers=await read('_headers',dest),robots=await read('robots.txt',dest);
 assert.match(headers,/Content-Security-Policy:/);
 if(headers.includes('X-Robots-Tag: noindex, nofollow')){
  assert.match(robots,/Allow: \//);
  assert.doesNotMatch(robots,/Disallow:\s*\//);
  assert.doesNotMatch(robots,/Sitemap:/);
 }else{
  assert.match(robots,/Sitemap: https:\/\/yorphives.com\/sitemap\.xml/);
 }
});
test('SEO publishing leaves the studio homepage visual source untouched',async()=>{
 assert.equal(await read('index.html',dest),await read('index.html'));
});
test('test source, secrets and internal documents cannot leak into static output',async()=>{
 for(const path of ['scripts/build-site.mjs','tests/seo-discovery.test.mjs','RELEASE.md','SEO.md','.git/config'])
  await assert.rejects(stat(resolve(dest,path)),undefined,path);
});
test('agent and search discovery remain first-party static files',async()=>{
 const llms=await read('llms.txt',dest),catalog=await read('catalog.json',dest);
 assert.match(llms,/direct URL/i);
 assert.match(llms,/\/catalog\.json/);
 assert.equal(JSON.parse(catalog).items.filter(x=>x.type==='tool').length>=90,true);
 const xml=await read('sitemap.xml',dest);
 assert.equal((xml.match(/<loc>/g)||[]).length>=92,true);
});
