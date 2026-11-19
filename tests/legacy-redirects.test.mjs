import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const file = path => readFile(new URL('../'+path,import.meta.url),'utf8');
function parse(content){
 const result=new Map();
 for(const raw of content.split(/\r?\n/)){
  const row=raw.trim();
  if(!row||row.startsWith('#'))continue;
  const parts=row.split(/\s+/);
  assert.equal(parts.length,3,'Invalid redirect syntax: '+row);
  const [source,target,status]=parts;
  assert.ok(!result.has(source),'Duplicate redirect: '+source);
  result.set(source,{target,status});
 }
 return result;
}
test('every approved legacy link works with and without trailing slash',async()=>{
 const rules=parse(await file('_redirects'));
 const root=rules.get('/free-tools/');
 assert.deepEqual(rules.get('/free-tools'),root);
 const original=[...rules.entries()].filter(([source])=>/^\/free-tools\/[a-z0-9-]+\/$/.test(source));
 assert.equal(original.length,22,'Expected 22 known legacy tool URLs');
 for(const [source,details] of original){
  assert.deepEqual(rules.get(source.slice(0,-1)),details,'Slashless alias: '+source);
  assert.equal(details.status,'302');
 }
});
test('legacy redirects are same-site, target published tools or directory, and never loop',async()=>{
 const [raw,catalogText]=await Promise.all([file('_redirects'),file('catalog.json')]);
 const rules=parse(raw),catalog=JSON.parse(catalogText);
 const destinations=new Set(['/tools/',...catalog.items.filter(x=>x.type==='tool').map(x=>'/'+x.url)]);
 for(const [source,{target,status}] of rules){
  if(source.startsWith('/builders')){
   assert.ok(['/builders','/builders/','/builders/*'].includes(source));
   assert.equal(target,'/');
   assert.equal(status,'301');
   assert.equal(rules.has(target),false,'Retired Builder redirect loop: '+source);
   continue;
  }
  assert.ok(source==='/free-tools'||source.startsWith('/free-tools/'),source);
  assert.ok(destinations.has(target),'Unknown destination: '+target);
  assert.equal(status,'302');
  assert.notEqual(source,target);
  assert.equal(rules.has(target),false,'Redirect chain: '+source+' to '+target);
 }
});
test('retired Builders paths redirect permanently to the homepage',async()=>{
 const rules=parse(await file('_redirects'));
 for(const source of ['/builders','/builders/','/builders/*'])
  assert.deepEqual(rules.get(source),{target:'/',status:'301'});
});

test('six retired image-format aliases redirect to actual conversion tool',async()=>{
 const map=parse(await file('_redirects'));
 for(const slug of ['png-to-jpg','jpg-to-png','png-to-webp','jpg-to-webp','webp-to-png','webp-to-jpg']){
  for(const suffix of ['','/']){
   assert.deepEqual(map.get('/free-tools/'+slug+suffix),{
    target:'/tools/batch-image-converter/',status:'302'
   });
  }
 }
});

test('built static-asset manifest includes every legacy URL variant',async()=>{
 const built=new URL('../dist/_redirects',import.meta.url);
 const exists=await stat(built).then(x=>x.isFile()).catch(()=>false);
 if(!exists)return; // Source-only test run before production build.
 const [source,output]=await Promise.all([file('_redirects'),readFile(built,'utf8')]);
 assert.deepEqual(parse(output),parse(source));
});
