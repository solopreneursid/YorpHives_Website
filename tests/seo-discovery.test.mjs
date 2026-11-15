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
test('SEO publishing preserves homepage markup outside the generated YHpulse feed',async()=>{
 const source=await read('index.html');
 const built=await read('index.html',dest);
 const start='<!-- PULSE_START -->',end='<!-- PULSE_END -->';
 const strip=html=>{
   const i=html.indexOf(start),j=html.indexOf(end,i+start.length);
   assert.ok(i>=0&&j>i,'YHpulse markers must exist once');
   assert.equal(html.indexOf(start,i+1),-1);
   assert.equal(html.indexOf(end,j+1),-1);
   return html.slice(0,i+start.length)+html.slice(j);
 };
 assert.equal(strip(built),strip(source));
 assert.match(built,/LATEST 10 UPDATES/);
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

test('every direct-entry page keeps Ko-fi disabled in its own navigation',async()=>{
 const items=JSON.parse(await read('catalog.json')).items.filter(x=>x.published!==false&&x.visibility!=='private');
 for(const item of items){
  const page=item.url.endsWith('/')?item.url+'index.html':item.url;
  const html=await read(page,dest);
  const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0]||'';
  assert.match(header,/<button class="header-kofi tool-kofi" type="button" disabled/,page);
  assert.match(header,/<strong>Ko-fi<\/strong><small>support my work<\/small>/,page);
  assert.doesNotMatch(header,/href="\/#support"/,page);
 }
 const directory=await read('tools/index.html',dest);
 assert.match(directory,/<button class="header-kofi tool-kofi" type="button" disabled/);
});

test('all 23 older public URLs stay on first-party tools after prototype retirement',async()=>{
 const redirects=await read('_redirects',dest);
 const rules=redirects.split('\n').filter(x=>x.trim()&&!x.trim().startsWith('#')).map(x=>x.trim().split(/\s+/));
 assert.equal(rules.length,23);
 assert.equal(new Set(rules.map(x=>x[0])).size,23);
 const oldPaths=['/free-tools/','/free-tools/file-studio/',
  '/free-tools/png-to-jpg/','/free-tools/jpg-to-png/','/free-tools/png-to-webp/',
  '/free-tools/jpg-to-webp/','/free-tools/webp-to-png/','/free-tools/webp-to-jpg/',
  '/free-tools/image-resizer/','/free-tools/image-rotator/','/free-tools/grayscale-image/',
  '/free-tools/jpg-to-pdf/','/free-tools/png-to-pdf/','/free-tools/merge-pdf/',
  '/free-tools/split-pdf/','/free-tools/extract-pdf-pages/',
  '/free-tools/json-formatter/','/free-tools/json-minifier/',
  '/free-tools/base64-encoder/','/free-tools/base64-decoder/',
  '/free-tools/url-encoder/','/free-tools/url-decoder/','/free-tools/sha256-generator/'];
 assert.deepEqual(rules.map(x=>x[0]),oldPaths);
 for(const [src,target,code] of rules){
  assert.equal(code,'302',src);
  assert.match(src,/^\/free-tools\/(?:[a-z0-9-]+\/)?$/);
  assert.ok(target.startsWith('/tools/'),src);
  assert.doesNotMatch(target,/^https?:\/\//i,'No redirect may depend on retired prototype hosting.');
  const page=target.slice(1)+'index.html';
  const html=await read(page,dest);
  assert.match(html,/<h1\b/,page);
 }
 assert.doesNotMatch(redirects,/^\/tools\//m,'Existing new tool URLs must never be redirected.');
});

test('real-browser QA harness is packaged only on noindex preview builds',async()=>{
 const headers=await read('_headers',dest);
 const preview=/X-Robots-Tag:\s*noindex/i.test(headers);
 const smoke=await stat(resolve(dest,'browser-smoke.mjs')).then(x=>x.isFile()).catch(()=>false);
 assert.equal(smoke,preview,'The browser smoke module must never appear in a production build.');
 if(preview){const code=await read('browser-smoke.mjs',dest);
  assert.match(code,/processFileTool/);assert.match(code,/dataset\.status=failures/);
 }
});

test('actual tool-interface browser test is available only on protected preview',async()=>{
 const headers=await read('_headers',dest);
 const preview=/X-Robots-Tag:\s*noindex/i.test(headers);
 const present=await stat(resolve(dest,'browser-interaction.mjs')).then(x=>x.isFile()).catch(()=>false);
 assert.equal(present,preview,'End-to-end browser UI test must not ship in production.');
 if(preview){const code=await read('browser-interaction.mjs',dest);
  assert.match(code,/form\.requestSubmit\(\)/);
  assert.match(code,/download\.href\.startsWith\('blob:'\)/);
 }
});

test('interactive Free Tools QA module only ships in noindex preview builds',async()=>{
 const headers=await read('_headers',dest);
 const preview=/X-Robots-Tag:\s*noindex/i.test(headers);
 const exists=await stat(resolve(dest,'library-qa.mjs')).then(s=>s.isFile()).catch(()=>false);
 assert.equal(exists,preview,'Library QA must not ship on production website');
 if(preview){
  const qa=await read('library-qa.mjs',dest);
  assert.match(qa,/rows\(\)\.length===8/);
  assert.match(qa,/nav\('documents'\)\.click\(\)/);
  assert.match(qa,/q\('tool-next'\)\.click\(\)/);
 }
});

test('no direct legacy routing depends on the retired Pages prototype',async()=>{
 const redirects=await read('_redirects',dest);
 assert.equal(redirects.includes('yorphives.pages.dev'),false);
 const lines=redirects.split('\n').map(line=>line.trim());
 for(const path of ['/free-tools/file-studio/','/free-tools/grayscale-image/','/free-tools/split-pdf/'])
  assert.ok(lines.includes(path+' /tools/ 302'),path+' needs safe first-party fallback');
});

test('Wave 1 full UI smoke harness remains preview-only',async()=>{
 const headers=await read('_headers',dest);
 const preview=headers.includes('X-Robots-Tag: noindex, nofollow');
 const file=resolve(dest,'wave1-ui-qa.mjs');
 const exists=await stat(file).then(x=>x.isFile()).catch(()=>false);
 assert.equal(exists,preview,'No browser UI QA should be publicly shipped.');
 if(preview){
  const source=await read('wave1-ui-qa.mjs',dest);
  assert.match(source,/form\.requestSubmit\(\)/);
  assert.match(source,/URL\.createObjectURL=function/);
 }
});
