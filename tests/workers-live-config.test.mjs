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
 assert.equal(live.d1_databases.length,2);
 assert.equal(live.d1_databases[0].binding,'INSIGHTS_DB');
 assert.equal(live.d1_databases[0].database_id,'e7e3e27c-8cfb-44e1-bcd5-6c3a186ceaa7');
 assert.equal(pilot.d1_databases[0].database_id,'a4348abe-f618-4a59-a8b0-7f994b106e5b');
 assert.deepEqual(live.d1_databases[1],{binding:'HQCONNECT_DB',
  database_name:'yorphives-hqconnect-live',database_id:'4104b276-dff6-460b-94a4-d331dd4b1799'});
 assert.equal(pilot.d1_databases[1].database_id,'e9da9d08-5e39-4c79-809d-b0401c6c31b5');
 for(const [key,limit] of [['CONTACT_GLOBAL_LIMIT',60],['CONTACT_CLIENT_LIMIT',5]]){
  const config=live.ratelimits.find(x=>x.name===key);
  assert.ok(config,key);assert.equal(config.simple.limit,limit);assert.equal(config.simple.period,60);
 }
});
test('production Worker has no preview analytics database binding or HQ modification permissions',()=>{
 const contents=JSON.stringify(live);
 assert.doesNotMatch(contents,/a4348abe-f618-4a59-a8b0-7f994b106e5b/);
 assert.doesNotMatch(contents,/e9da9d08-5e39-4c79-809d-b0401c6c31b5/);
 assert.doesNotMatch(contents,/github|deploy.*token|api_token/i);
 const source=readFileSync('edge/worker.mjs','utf8');
 assert.ok(source.includes("else response=json({error:'unknown-endpoint'});"));
 assert.ok(source.includes("headers.set('X-YorpHives-Edge-Runtime','workers-static')"));
 assert.ok(source.includes('return env.ASSETS.fetch(request)'));
});
