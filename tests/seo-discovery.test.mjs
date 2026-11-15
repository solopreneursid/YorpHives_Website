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

test('future web apps, desktop apps, products and services get truthful discovery metadata',async()=>{
 const {createEntity}=await import('../scripts/discovery-schema.mjs');
 const app=createEntity({type:'app',name:'New web app',description:'A useful application',platform:'web',isFree:true},'https://yorphives.com/apps/new-web-app/');
 assert.equal(app['@type'],'WebApplication');assert.equal(app.offers.price,'0');
 const native=createEntity({type:'app',name:'Desktop editor',description:'A locally installed app',operatingSystem:'Linux'},'https://yorphives.com/apps/editor/');
 assert.equal(native['@type'],'SoftwareApplication');assert.equal(native.offers,undefined);assert.equal(native.operatingSystem,'Linux');
 const product=createEntity({type:'product',name:'New product',description:'A published product'},'https://yorphives.com/products/new-product/');
 assert.equal(product['@type'],'Product');assert.equal(product.offers,undefined);
 const priced=createEntity({type:'product',name:'Priced product',description:'A priced product',price:49,currency:'USD'},'https://yorphives.com/products/priced/');
 assert.equal(priced.offers.price,'49');assert.equal(priced.offers.priceCurrency,'USD');
 const service=createEntity({type:'service',name:'New service',description:'A published service'},'https://yorphives.com/services/new/');
 assert.equal(service['@type'],'Service');assert.equal(service.offers,undefined);
});

test('all standalone tool and directory pages have Ko-fi support in their navigation',async()=>{
 const items=JSON.parse(await read('catalog.json')).items.filter(x=>x.published!==false&&x.visibility!=='private');
 for(const item of items){
  const page=item.url.endsWith('/')?item.url+'index.html':item.url;
  const html=await read(page,dest);
  const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0]||'';
  assert.match(header,/<a class="header-kofi tool-kofi" href="\/#support"/,page);
  assert.match(header,/<strong>Ko-fi<\/strong><small>support my work<\/small>/,page);
 }
 const directory=await read('tools/index.html',dest);
 assert.match(directory,/<a class="header-kofi tool-kofi" href="\/#support"/);
});
