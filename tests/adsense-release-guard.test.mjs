import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const config=JSON.parse(readFileSync('adsense-plan.json','utf8'));
const ads=config.adsense;
const html=path=>readFileSync(path,'utf8');
const forbidden=/pagead2\.googlesyndication\.com|adsbygoogle\.js|<ins\s[^>]*adsbygoogle/i;

test('AdSense must remain disabled until founder and compliance approval',()=>{
 assert.equal(ads.enabled,false);
 assert.equal(ads.optimization.activationGate.adsEnabled,false);
 assert.equal(ads.optimization.activationGate.siteApproved,false);
 assert.equal(ads.optimization.activationGate.regionConsentConfigured,false);
 assert.equal(ads.optimization.activationGate.founderApproved,false);
 assert.equal(ads.publisher,'ca-pub-9864775895222572');
 assert.deepEqual(ads.scope.include,['/tools/','/tools/*']);
 assert.ok(ads.scope.exclude.includes('/'));
 assert.ok(ads.scope.exclude.includes('/privacy/'));
 assert.ok(ads.scope.exclude.includes('/api/*'));
 assert.ok(ads.scope.exclude.includes('/hqventures/*'));
});

test('homepage, privacy, and Free Tools templates never accidentally load advertising',()=>{
 for(const path of ['index.html','privacy/index.html','tools/index.html','tools/word-counter/index.html','tools/image-resizer/index.html','tools/pdf-compressor/index.html','tools/json-formatter/index.html'])
  assert.doesNotMatch(html(path),forbidden,path);
 assert.match(html('privacy/index.html'),/Advertising placements are not currently enabled/);
 assert.match(html('privacy/index.html'),/before enabling it/);
});

test('Google seller declaration uses the verified publisher',()=>{
 assert.equal(html('ads.txt').trim(),'google.com, pub-9864775895222572, DIRECT, f08c47fec0942fa0');
});

test('Free Tools catalog remains published and unique',()=>{
 const catalog=JSON.parse(html('catalog.json'));
 const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.ok(tools.length>=143,'Expected at least the existing 143 tools');
 assert.equal(new Set(tools.map(x=>x.url)).size,tools.length);
 assert.ok(tools.every(x=>x.url.startsWith('tools/')));
});
