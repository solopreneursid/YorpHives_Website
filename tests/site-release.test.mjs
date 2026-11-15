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
