import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path,base=root)=>readFile(resolve(base,path),'utf8');
test('sitemap has the homepage, directory and all tool URLs',async()=>{
 const items=JSON.parse(await read('catalog.json')).items;
 const xml=await read('sitemap.xml');
 assert.match(xml,/^<\?xml version="1.0"/);
 for(const page of ['https://yorphives.com/','https://yorphives.com/tools/',...items.filter(x=>x.type==='tool').map(x=>'https://yorphives.com/'+x.url)])
  assert.ok(xml.includes('<loc>'+page+'</loc>'),'Missing '+page);
 assert.equal((xml.match(/<loc>/g)||[]).length,items.filter(x=>x.type==='tool').length+4);
 assert.ok(xml.includes('<loc>https://yorphives.com/hqventures/</loc>'));
 assert.ok(xml.includes('<loc>https://yorphives.com/partnerships/</loc>'));
});
test('security headers enforce privacy and local execution without blocking Blob downloads',async()=>{
 const headers=await read('_headers');
 assert.match(headers,/script-src 'self'/);
 assert.match(headers,/connect-src 'self'/);
 assert.match(headers,/img-src 'self' blob: data:/);
 assert.match(headers,/worker-src 'self' blob:/);
 assert.match(headers,/X-Content-Type-Options: nosniff/);
 assert.match(headers,/frame-ancestors 'none'/);
});
test('robots points crawlers to the canonical sitemap',async()=>{
 assert.match(await read('robots.txt'),/^Sitemap: https:\/\/yorphives.com\/sitemap\.xml$/m);
});

test('public design offers no unapproved donations or payment actions',async()=>{
 const html=await read('index.html'),js=await read('next.js');
 assert.doesNotMatch(html,/<a[^>]*href="https?:\/\/(?:ko-fi|buymeacoffee|stripe|checkout)/i);
 assert.doesNotMatch(html,/<button[^>]*>Pay now|Payment successful|Subscription active/i);
 assert.doesNotMatch(js,/stripe|checkout|showSupportStatus/);
});
test('new design exposes direct navigation and an accessible mobile menu',async()=>{
 const [html,css,js]=await Promise.all([read('index.html'),read('next-responsive.css'),read('next.js')]);
 assert.match(html,/class="desktop-nav"/);
 assert.match(html,/class="mobile-dock"/);
 assert.match(html,/id="menu-toggle"/);
 assert.match(css,/\.mobile-menu:not\(\[hidden\]\)/);
 assert.match(js,/menuPanel\.hidden = !opening/);
});
test('Free Tools is search-first with live categories, favorites and pagination',async()=>{
 const [html,js,css]=await Promise.all([read('index.html'),read('next.js'),read('next.css')]);
 assert.match(html,/id="tool-search"/);
 assert.match(html,/id="tool-categories"/);
 assert.match(html,/id="tool-prev"/);
 assert.match(html,/id="tool-next"/);
 assert.match(html,/id="tool-count"/);
 assert.match(html,/id="tool-favorites"/);
 assert.match(html,/id="tool-no-results"/);
 assert.match(js,/const pageSize=10/);
 assert.match(js,/function renderCategories\(/);
 assert.match(js,/localStorage\.setItem\(storageKey/);
 assert.match(js,/function filteredTools\(/);
 assert.match(css,/\.search-panel\{/);
 assert.match(css,/\.tool-card\{/);
});
test('A–Z source and built directory are fully crawlable and category-based',async()=>{
 const [html,source,css]=await Promise.all([
   read('tools/index.html',resolve(root,'dist')),
   read('tools/index.html'),
   read('tools/directory-next.css')
 ]);
 const items=JSON.parse(await read('catalog.json')).items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.match(source,/<!-- TOOL_DIRECTORY_START -->/);
 assert.match(source,/<!-- TOOL_DIRECTORY_END -->/);
 assert.equal((html.match(/<details class="directory-section">/g)||[]).length,new Set(items.map(x=>x.category||'Other')).size);
 assert.equal((html.match(/class="directory-card"/g)||[]).length,items.length);
 for(const tool of items)assert.ok(html.includes('href="../'+tool.url+'"'),tool.url);
 assert.match(html,/href="\.\.\/#tools"/);
 assert.match(css,/details\.directory-section>summary/);
});
test('directory categories and tool counts are derived from public catalog on every build',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 const items=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 const html=await read('tools/index.html',resolve(root,'dist'));
 const headings=[...html.matchAll(/<details class="directory-section"><summary><span>([^<]+)<\/span><small>(\d+) tools?<\/small>/g)];
 const categories=[...new Set(items.map(x=>x.category||'Other'))].sort((a,b)=>a.localeCompare(b));
 assert.deepEqual(headings.map(m=>m[1]),categories);
 for(const match of headings)
  assert.equal(Number(match[2]),items.filter(x=>(x.category||'Other')===match[1]).length,match[1]);
 assert.equal((html.match(/class="directory-card"/g)||[]).length,items.length);
 for(const item of items)assert.ok(html.includes('href="../'+item.url+'"'),item.url);
});
