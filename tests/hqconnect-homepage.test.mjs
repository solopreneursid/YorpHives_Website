import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
test('public top navigation places HQventures before Free Tools; HQconnect remains a homepage section',async()=>{
 const html=await read('reimagined/index.html');
 const nav=html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.deepEqual([...nav.matchAll(/data-nav="([^"]+)"/g)].map(x=>x[1]),['home','ventures','tools']);
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

import {onRequestPost,onRequestGet} from '../functions/api/hqconnect.js';
const url='https://yorphives-v1-review.pages.dev/api/hqconnect';
const makeRequest=(body,origin=new URL(url).origin)=>new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const example=()=>({
 name:'Test Founder',email:'test@example.com',requestType:'Build a product',
 project:'Sample',message:'A real software product enquiry describing a need.',
 timeline:'Flexible',budget:'',consent:true,startedAt:Date.now()-8000
});
test('HQconnect rejects cross-origin and unconsented requests, and fails closed without the intake DB',async()=>{
 const bad=await onRequestPost({request:makeRequest(example(),'https://evil.example'),env:{}});
 assert.equal(bad.status,403);
 const unconsented=await onRequestPost({request:makeRequest({...example(),consent:false}),env:{HQCONNECT_DB:{}}});
 assert.equal(unconsented.status,400);
 const unavailable=await onRequestPost({request:makeRequest(example()),env:{}});
 assert.equal(unavailable.status,503);
 assert.equal(onRequestGet().status,405);
});
test('HQconnect stores only validated submissions into the isolated intake store',async()=>{
 let saved=null;
 const fakeDB={prepare(sql){assert.match(sql,/INSERT INTO hqconnect_requests/);return {bind(...values){saved=values;return {async run(){return {success:true}}}}}}};
 const response=await onRequestPost({request:makeRequest(example()),env:{HQCONNECT_DB:fakeDB}});
 assert.equal(response.status,201);
 const receipt=await response.json();
 assert.equal(receipt.ok,true);
 assert.match(receipt.reference,/^[a-f0-9]{8}$/);
 assert.ok(Array.isArray(saved)&&saved.length===11);
 assert.equal(saved[2],'Build a product');
 assert.equal(saved[3],'Test Founder');
 assert.equal(saved[4],'test@example.com');
});

test('HQconnect renders Other as the third option and accepts it without changing existing choices',async()=>{
 const [html,api,schema,migration]=await Promise.all([
  read('reimagined/index.html'),read('functions/api/hqconnect.js'),
  read('db/hqconnect-schema.sql'),read('db/hqconnect-add-other.sql')
 ]);
 const select=html.match(/<select name="requestType" id="interest" required>([\s\S]*?)<\/select>/)?.[1];
 assert.ok(select,'HQconnect choice selector is missing');
 assert.deepEqual([...select.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]),
  ['Build a product','Long-term partnership','Other']);
 assert.match(api,/const allowed=new Set\(\['Build a product','Long-term partnership','Other'\]\)/);
 assert.match(schema,/request_type IN \('Build a product','Long-term partnership','Other'\)/);
 assert.match(migration,/INSERT INTO hqconnect_requests_migrated/);
 assert.match(migration,/SELECT id,created_at,request_type,name,email,project,message,timeline,budget,consent_at,status FROM hqconnect_requests/);
});
test('HQconnect saves Other as its own request type and rejects unsupported values',async()=>{
 let saved=null;
 const fakeDB={prepare(sql){assert.match(sql,/INSERT INTO hqconnect_requests/);
  return{bind(...args){saved=args;return{async run(){return{success:true}}}}}}};
 const ok=await onRequestPost({
  request:makeRequest({...example(),requestType:'Other'}),
  env:{HQCONNECT_DB:fakeDB}
 });
 assert.equal(ok.status,201);
 assert.equal((await ok.json()).ok,true);
 assert.equal(saved[2],'Other');
 const wrong=await onRequestPost({
  request:makeRequest({...example(),requestType:'Unauthorized'}),
  env:{HQCONNECT_DB:fakeDB}
 });
 assert.equal(wrong.status,400);
 assert.equal(saved[2],'Other');
});

test('HQconnect email uses a compact accessible copy action, not a mailto link',async()=>{
 const [html,css,js]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/hqconnect.css'),read('reimagined/studio.js')
 ]);
 const section=html.split('<section class="hqconnect" id="hqconnect"')[1]?.split('</section>')[0]||'';
 assert.ok(section,'HQconnect section missing');
 assert.match(section,/<span id="hqconnect-email" class="hqconnect-email-address">connect@yorphives\.com<\/span>/);
 assert.match(section,/<button id="hqconnect-copy-email" class="hqconnect-copy-email" type="button" aria-label="Copy connect@yorphives\.com to clipboard">Copy<\/button>/);
 assert.match(section,/id="hqconnect-copy-status" class="hqconnect-copy-status" role="status" aria-live="polite"/);
 assert.doesNotMatch(section,/href="mailto:/);
 assert.match(js,/copyEmailButton\?\.addEventListener\('click',async\(\)=>\{/);
 assert.match(js,/navigator\.clipboard\.writeText\(address\)/);
 assert.match(js,/document\.execCommand\('copy'\)/);
 assert.match(js,/Copied ✓/);
 assert.match(js,/2200/);
 assert.match(css,/\.hqconnect-copy-email:focus-visible/);
 assert.match(css,/\.hqconnect-copy-email\{height:44px;min-height:44px\}/);
 assert.doesNotMatch(js,/using the email link below/);
});

test('Copy email visible button is half-height on desktop and mobile without shrinking the touch target',async()=>{
 const css=await read('reimagined/hqconnect.css');
 assert.match(css,/\.hqconnect-copy-email\{[^}]*height:36px;min-height:36px/);
 assert.match(css,/\.hqconnect-copy-email::before\{[^}]*inset:9px 0/);
 assert.match(css,/\.hqconnect-copy-email\{height:44px;min-height:44px\}/);
 assert.match(css,/\.hqconnect-copy-email::before\{inset:11px 0\}/);
 assert.equal(36-9*2,18);
 assert.equal(44-11*2,22);
});
