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
 assert.equal((xml.match(/<loc>/g)||[]).length,items.filter(x=>x.type==='tool').length+2);
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

test('Ko-fi header and footer are visibly present but disabled until donations are configured',async()=>{
 const html=await read('index.html'),js=await read('app.js'),css=await read('style.css');
 const header=html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1]||'';
 assert.match(header,/<button class="header-kofi" id="header-kofi" type="button" disabled/);
 assert.match(header,/<strong>Ko-fi<\/strong>\s*<small>support my work<\/small>/);
 assert.match(html,/<button class="header-kofi footer-kofi" id="footer-kofi" type="button" disabled/);
 assert.match(html,/title="Donations coming soon"/);
 assert.doesNotMatch(html,/id="support-note"/);
 assert.doesNotMatch(js,/getElementById\('header-kofi'\)\?\.addEventListener/);
 assert.doesNotMatch(js,/footerKofi\?\.addEventListener/);
 assert.doesNotMatch(js,/showSupportStatus|showingSupport/);
 assert.match(css,/\.header-kofi:disabled\{cursor:default/);
 assert.match(css,/\.header-kofi:not\(:disabled\):hover/);
});
test('Ko-fi header stays compact and readable across desktop and mobile',async()=>{
 const css=await read('style.css');
 assert.ok(css.includes('min-width:98px;min-height:44px'),'Desktop header button should be small');
 assert.ok(css.includes('.header-kofi strong{font-size:13px'),'Ko-fi label should be understated');
 assert.ok(css.includes('.header-kofi{min-width:85px;min-height:40px'),'Phone button should be compact');
 assert.ok(css.includes('.header-kofi:focus-visible{outline:3px'),'Button must remain keyboard accessible');
});

test('footer shares the compact Ko-fi styling without any payment or scrolling action',async()=>{
 const html=await read('index.html'),css=await read('style.css'),js=await read('app.js');
 assert.match(html,/<button class="header-kofi footer-kofi" id="footer-kofi" type="button" disabled/);
 assert.doesNotMatch(html,/Support YorpHives<\/button>/);
 assert.match(css,/\.footer-support \.footer-kofi\{display:inline-flex/);
 assert.doesNotMatch(js,/support\.scrollIntoView|document\.getElementById\('support'\)\?\.scrollIntoView/);
});
test('Ko-fi is consistently disabled in the main navigation across all homepage sections',async()=>{
 const html=await read('index.html'),css=await read('style.css'),js=await read('app.js');
 assert.match(html,/<header class="site-header">[\s\S]*?<button class="header-kofi" id="header-kofi" type="button" disabled/);
 assert.match(css,/\.header-kofi\{order:3;flex:none;display:inline-flex/);
 assert.doesNotMatch(css,/\.is-home \.header-kofi\{display:inline-flex\}/);
 assert.doesNotMatch(js,/showingSupport|showSupportStatus/);
});


test('Tool Launcher only replaces Free Tools browsing and keeps the hero',async()=>{
 const html=await read('index.html'),js=await read('app.js'),css=await read('style.css');
 assert.match(html,/<div class="page-hero tools-hero">[\s\S]*?Little tools<br><em>Big momentum<\/em>/);
 assert.match(html,/id="tool-search" type="search"/);
 assert.match(html,/class="launcher-workspace"/);
 assert.match(html,/id="tool-categories" aria-label="Tool categories"/);
 assert.match(html,/id="tool-mobile-categories"/);
 assert.match(html,/id="tool-prev"/);
 assert.match(html,/id="tool-next"/);
 assert.match(html,/id="tool-back"/);
 assert.match(html,/id="tool-count" role="status"/);
 assert.doesNotMatch(html,/id="tool-more"/);
 assert.match(js,/const pageSize = 8/);
 assert.match(js,/Math\.ceil\(matches\.length\/pageSize\)/);
 assert.match(js,/launcher-tool-row/);
 assert.match(js,/storageKey = 'yorphives\.tool-favorites\.v1'/);
 assert.match(js,/localStorage\.setItem\(storageKey/);
 assert.match(js,/if \(!assigned\.has\(category\)\) groups\.push/);
 assert.match(js,/visibleCatalog\.slice\(0, 3\)/);
 assert.match(css,/#tools \.page-hero\{min-height:315px/);
 assert.match(css,/\.launcher-workspace\{display:grid;grid-template-columns:232px minmax\(0,1fr\)/);
 assert.match(css,/\.launcher-rows:empty\{display:none;min-height:0\}/);
 assert.match(css,/@media\(max-width:800px\)\{[\s\S]*?\.launcher-sidebar\{display:none\}/);
});
test('All tools directory stays fully crawlable while categories collapse by default',async()=>{
 const dir=await read('tools/index.html',resolve(root,'dist')),style=await read('tools/tool.css');
 const source=await read('tools/index.html');
 assert.match(source,/<!-- TOOL_DIRECTORY_START -->/);
 const catalog=JSON.parse(await read('catalog.json'));
 const toolUrls=catalog.items.filter(x=>x.type==='tool').map(x=>x.url);
 assert.equal((dir.match(/<details class="directory-section">/g)||[]).length,new Set(catalog.items.filter(x=>x.type==='tool').map(x=>x.category)).size);
 assert.equal((dir.match(/<summary>/g)||[]).length,new Set(catalog.items.filter(x=>x.type==='tool').map(x=>x.category)).size);
 assert.equal((dir.match(/class="directory-card"/g)||[]).length,toolUrls.length);
 for(const url of toolUrls)assert.ok(dir.includes('href="../'+url+'"'),url);
 assert.match(dir,/href="\.\.\/#tools">⌕/);
 assert.match(style,/details\.directory-section>summary/);
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
