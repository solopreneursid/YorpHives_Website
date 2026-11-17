import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('isolated pilot Worker targets staging D1 and cannot bind production database',()=>{
 const c=JSON.parse(readFileSync('edge/pilot/wrangler.jsonc','utf8'));
 assert.equal(c.name,'yorphives-edge-static-pilot');
 assert.equal(c.main,'../../edge/worker.mjs');
 assert.equal(c.assets.directory,'../../dist');
 assert.equal(c.assets.binding,'ASSETS');
 assert.equal(c.assets.not_found_handling,'404-page');
 assert.deepEqual(c.assets.run_worker_first,['/api/*']);
 assert.equal(c.workers_dev,true);
 assert.equal(c.d1_databases.length,1);
 assert.equal(c.d1_databases[0].binding,'INSIGHTS_DB');
 assert.equal(c.d1_databases[0].database_name,'yorphives-impact-analytics-preview');
 assert.equal(c.d1_databases[0].database_id,'a4348abe-f618-4a59-a8b0-7f994b106e5b');
 assert.equal(JSON.stringify(c).includes('e7e3e27c-8cfb-44e1-bcd5-6c3a186ceaa7'),false);
 assert.equal('routes' in c,false);
 assert.equal('custom_domains' in c,false);
});
test('pilot build does not copy private source into public static assets',()=>{
 const builder=readFileSync('scripts/build-site.mjs','utf8');
 assert.ok(builder.includes("await rm(dest,{recursive:true,force:true})"));
 assert.ok(builder.includes("version:1,include:['/api/insights/*','/api/agent/v1/*']"));
 const entry=readFileSync('edge/worker.mjs','utf8');
 assert.ok(entry.includes('env.ASSETS.fetch(request)'));
 assert.ok(entry.includes("if(p.startsWith('/api/'))"));
});
