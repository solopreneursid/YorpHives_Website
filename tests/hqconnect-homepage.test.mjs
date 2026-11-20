import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
test('public top navigation is exactly Home, Free tools, HQventures; HQconnect is a homepage section',async()=>{
 const html=await read('reimagined/index.html');
 const nav=html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.deepEqual([...nav.matchAll(/data-nav="([^"]+)"/g)].map(x=>x[1]),['home','tools','ventures']);
 assert.match(html,/<section class="hqconnect" id="hqconnect"/);
 assert.doesNotMatch(html,/<section class="view" id="contact"/);
 assert.doesNotMatch(html,/<section class="view" id="partners"/);
 assert.match(html,/id="contact-form"/);
 assert.match(html,/data-interest="Long-term partnership"/);
 assert.match(html,/data-interest="Build a product"/);
});
test('first-party HQconnect intake is route-scoped, form is validated and no public reads exist',async()=>{
 const [html,api,build]=await Promise.all([read('reimagined/index.html'),read('functions/api/hqconnect.js'),read('scripts/build-site.mjs')]);
 assert.match(html,/name="consent" required/);
 assert.match(html,/name="website"/);
 assert.match(api,/export async function onRequestPost/);
 assert.match(api,/origin!==site/);
 assert.match(api,/env\.HQCONNECT_DB/);
 assert.match(api,/INSERT INTO hqconnect_requests/);
 assert.match(build,/\/api\/hqconnect/);
 assert.match(build,/hqconnect\.css/);
});
