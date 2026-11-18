import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('redesigned Explore explains qualification without implying launches',async()=>{
 const [html,js]=await Promise.all([read('index.html'),read('next.js')]);
 assert.match(html,/id="explore-qualification-note"/);
 assert.match(html,/03 \/ FOUNDER/);
 assert.match(html,/Founder-approved launches only/);
 assert.match(html,/Nothing is published without founder approval/);
 assert.match(js,/qualifiedProducts\(published\)/);
 assert.doesNotMatch(html,/No HQ-qualified products have been released yet/);
});
test('navigation and redesigned assets enforce explicit freshness',async()=>{
 const headers=await read('_headers');
 assert.match(headers,/\n\/\n\s+Cache-Control: no-store/);
 assert.match(headers,/\n\/index\.html\n\s+Cache-Control: no-store/);
 for(const file of ['/app.js','/next.js','/next.css','/next-responsive.css','/home-experience.css']){
  assert.ok(headers.includes(file+'\n  Cache-Control: no-cache, max-age=0, must-revalidate'),file);
 }
 assert.match(headers,/Content-Security-Policy:/);
 assert.match(headers,/X-Content-Type-Options: nosniff/);
});
test('built website preserves actual copy, scripts and freshness',async()=>{
 const [html,js,headers]=await Promise.all([read('dist/index.html'),read('dist/next.js'),read('dist/_headers')]);
 if(html.includes('id="home-title"')){
  assert.match(html,/id="ventures"/);
  assert.doesNotMatch(html,/id="kofi-support"/);
  assert.match(html,/class="cta-card"/);
  assert.match(await read('dist/studio.js'),/qualifiedProducts\(allItems\)/);
 }else{
  assert.match(html,/id="explore-qualification-note"/);
  assert.match(html,/Nothing is published without founder approval/);
  assert.match(js,/qualifiedProducts\(published\)/);
 }
 assert.match(headers,/\n\/\n\s+Cache-Control: no-store/);
});
