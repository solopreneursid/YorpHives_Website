import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectRelease,verifyRemote} from '../scripts/release-verify.mjs';
const sha='a'.repeat(40),hash=x=>createHash('sha256').update(x).digest('hex');
const contents={'index.html':'<html>ok</html>','catalog.json':'{}','tools/index.html':'<html>tools</html>','sitemap.xml':'https://yorphives.com/','_headers':'security'};
const assets=Object.fromEntries(Object.entries(contents).map(([name,data])=>[name,hash(data)]));
const fingerprint=hash(Object.entries(assets).sort(([a],[b])=>a.localeCompare(b)).map(([a,b])=>a+':'+b+'\n').join(''));
const good={schemaVersion:1,site:'YorpHives',target:'production',sourceSha:sha,assetFingerprint:fingerprint,assets};
test('release gate rejects missing revision, incorrect target and tampered fingerprint',()=>{
 assert.ok(inspectRelease(good,{target:'production',sourceSha:sha,fingerprint}));
 assert.throws(()=>inspectRelease({...good,sourceSha:null}),/source/);
 assert.throws(()=>inspectRelease(good,{sourceSha:'b'.repeat(40)}),/source/);
 assert.throws(()=>inspectRelease(good,{target:'preview'}),/target/);
 assert.throws(()=>inspectRelease({...good,assets:{...assets,'index.html':hash('tampered')}}),/inconsistent/);
});
test('remote verifier validates actual served file bytes',async()=>{
 const fake=async url=>{
  const p=new URL(url).pathname.replace(/^\//,'');
  const body=p==='.well-known/yorphives-release.json'?JSON.stringify(good):contents[p];
  return body===undefined?{status:404}:new Response(body,{status:200});
 };
 const r=await verifyRemote({origin:'https://yorphives.com',sourceSha:sha,fingerprint,fetcher:fake});
 assert.equal(r.sourceSha,sha);
 const broken=async url=>{
  if(new URL(url).pathname==='/index.html')return new Response('tampered');
  return fake(url);
 };
 await assert.rejects(verifyRemote({origin:'https://yorphives.com',sourceSha:sha,fingerprint,fetcher:broken}),/mismatch/);
 await assert.rejects(verifyRemote({origin:'http://yorphives.com',sourceSha:sha,fingerprint,fetcher:fake}),/HTTPS/);
});
