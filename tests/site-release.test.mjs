import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
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

test('homepage displays Ko-fi support action in the top header, with a smaller second line',async()=>{
 const html=await read('index.html');
 const header=html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1]||'';
 assert.match(header,/<button class="header-kofi" id="header-kofi"/);
 assert.match(header,/<strong>Ko-fi<\/strong>\s*<small>support my work<\/small>/);
 assert.match(html,/id="footer-kofi"[^>]*><strong>Ko-fi<\/strong><small>support my work<\/small><\/button>/);
 assert.match(html,/id="support-note" class="support-feedback" role="status" aria-live="polite" hidden>/);
 assert.doesNotMatch(header,/<a[^>]+href="https:\/\/ko-fi\.com\//i,'Do not invent a payment destination.');
 const js=await read('app.js'),css=await read('style.css');
 assert.match(js,/getElementById\('header-kofi'\).*addEventListener\('click'/);
 assert.match(js,/classList.toggle\('is-home', active === 'home'\)/);
 assert.match(css,/\.is-home \.header-kofi\{display:inline-flex\}/);
 assert.match(css,/@media\(max-width:480px\)/);
});

test('Ko-fi header stays compact and readable across desktop and mobile',async()=>{
 const css=await read('style.css');
 assert.ok(css.includes('min-width:98px;min-height:44px'),'Desktop header button should be small');
 assert.ok(css.includes('.header-kofi strong{font-size:13px'),'Ko-fi label should be understated');
 assert.ok(css.includes('.header-kofi{min-width:85px;min-height:40px'),'Phone button should be compact');
 assert.ok(css.includes('.header-kofi:focus-visible{outline:3px'),'Button must remain keyboard accessible');
});

test('footer Ko-fi CTA shares the header style and only shows an honest support status',async()=>{
 const html=await read('index.html'),css=await read('style.css'),js=await read('app.js');
 assert.match(html,/<button class="header-kofi footer-kofi"/);
 assert.doesNotMatch(html,/<button class="support-button"[^>]*>Support YorpHives<\/button>/);
 assert.match(css,/\.footer-support \.footer-kofi\{display:inline-flex/);
 assert.match(css,/\.footer-support \.support-feedback\[hidden\]\{display:none!important\}/);
 assert.match(js,/footerKofi\?\.addEventListener\('click', showSupportStatus\)/);
 assert.match(js,/supportFeedback\.textContent = 'Ko-fi support coming soon'/);
});
