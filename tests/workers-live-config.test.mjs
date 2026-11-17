import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const live=JSON.parse(readFileSync('edge/live/wrangler.jsonc','utf8'));
const pilot=JSON.parse(readFileSync('edge/pilot/wrangler.jsonc','utf8'));
test('production Worker preserves asset routing, has no accidental public preview or domain auto-routing',()=>{
 assert.equal(live.name,'yorphives-edge-static-live');
 assert.equal(live.main,pilot.main);
 assert.deepEqual(live.assets,pilot.assets);
 assert.equal(live.workers_dev,false);
 for(const prop of ['routes','route','custom_domains'])assert.equal(Object.hasOwn(live,prop),false,prop);
 assert.equal(live.d1_databases.length,1);
 assert.equal(live.d1_databases[0].binding,'INSIGHTS_DB');
 assert.equal(live.d1_databases[0].database_id,'e7e3e27c-8cfb-44e1-bcd5-6c3a186ceaa7');
 assert.equal(pilot.d1_databases[0].database_id,'a4348abe-f618-4a59-a8b0-7f994b106e5b');
});
test('production Worker has no preview analytics database binding or HQ modification permissions',()=>{
 const contents=JSON.stringify(live);
 assert.doesNotMatch(contents,/a4348abe-f618-4a59-a8b0-7f994b106e5b/);
 assert.doesNotMatch(contents,/HQ|github|deploy.*token|api_token/i);
 const source=readFileSync('edge/worker.mjs','utf8');
 assert.ok(source.includes("else response=json({error:'unknown-endpoint'});"));
 assert.ok(source.includes("headers.set('X-YorpHives-Edge-Runtime','workers-static')"));
 assert.ok(source.includes('return env.ASSETS.fetch(request)'));
});
