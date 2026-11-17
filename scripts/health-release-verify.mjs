// YorpHives Health release acceptance: all legacy redirects and their destinations.
// Source mode (default) is safe for pre-release CI. --live probes production after founder release.
// Read-only HTTP GET; no analytics, database mutations, credentials or downloads.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const BASE='https://yorphives.com';
const live=process.argv.includes('--live');
if(process.argv.some(x=>x.startsWith('--')&&!['--live','--source'].includes(x)))throw Error('Unexpected argument');
const raw=await readFile(new URL('../_redirects',import.meta.url),'utf8');
const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
const rules=new Map();
for(const line of lines){
 const [path,target,status,...extra]=line.split(/\s+/);
 assert.ok(path&&target&&status&&!extra.length,'Malformed redirect rule: '+line);
 assert.ok(!rules.has(path),'Duplicate source: '+path);
 assert.match(path,/^\/free-tools(?:\/[a-z0-9-]+)?\/?$/);
 assert.match(target,/^\/tools(?:\/[a-z0-9-]+)?\/$/);
 assert.equal(status,'302','Legacy links must be temporary redirects');
 rules.set(path,{target,status:Number(status)});
}
assert.equal(rules.size,46,'Expected 23 slash and 23 slashless aliases');
const slash=[...rules.entries()].filter(([p])=>p.endsWith('/'));
assert.equal(slash.length,23);
for(const [path,info] of slash){
 assert.deepEqual(rules.get(path.slice(0,-1)),info,'Missing no-slash alias for '+path);
}
for(const slug of ['png-to-jpg','jpg-to-png','png-to-webp','jpg-to-webp','webp-to-png','webp-to-jpg']){
 assert.equal(rules.get('/free-tools/'+slug).target,'/tools/batch-image-converter/');
}
console.log('PASS: 46 unique source rules, matching aliases and six conversion destinations');
if(live){
 const destinationCache=new Map();
 let checked=0;
 const entries=[...rules.entries()];
 async function get(path){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{return await fetch(BASE+path,{method:'GET',redirect:'manual',signal:controller.signal,
    headers:{'user-agent':'YorpHives-Health-Release-ReadOnly/1.0'}});}
  finally{clearTimeout(timer)}
 }
 for(let offset=0;offset<entries.length;offset+=6){
  await Promise.all(entries.slice(offset,offset+6).map(async ([path,expected])=>{
   const resp=await get(path);
   assert.equal(resp.status,302,path+' expected 302, got '+resp.status);
   const location=resp.headers.get('location');
   assert.ok(location,'Redirect missing Location for '+path);
   const parsed=new URL(location,BASE);
   assert.equal(parsed.origin,BASE,'External redirect prohibited: '+path);
   assert.equal(parsed.pathname,expected.target,'Wrong redirect destination: '+path);
   assert.equal(parsed.search,'','Unexpected redirect query: '+path);
   assert.equal(parsed.hash,'','Unexpected redirect hash: '+path);
   await resp.body?.cancel();
   if(!destinationCache.has(expected.target)){
    const d=await get(expected.target);
    const contentType=d.headers.get('content-type')||'';
    assert.equal(d.status,200,'Destination not reachable: '+expected.target);
    assert.match(contentType,/text\/html/i,'Destination did not serve HTML: '+expected.target);
    const page=await d.text();
    assert.match(page,/<title[^>]*>[^<]+<\/title>/i,'Destination lacks page title: '+expected.target);
    destinationCache.set(expected.target,true);
   }
   checked++;
  }));
 }
 console.log('PASS: '+checked+' live legacy links 302 to '+destinationCache.size+' same-site HTML destinations');
}
console.log('HEALTH RELEASE CHECK PASSED ('+(live?'live':'source')+')');
