import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import edge from '../edge/worker.mjs';
const request=(method='GET')=>new Request('https://yorphives.com/api/monitoring/health',{method});
const env=row=>({HQCONNECT_DB:{prepare(sql){
 assert.equal(sql,'SELECT last_checked_at,last_result FROM hqconnect_notification_health WHERE id=1');
 return {async first(){return row}};
}}});
test('public monitoring is a coarse, read-only heartbeat and fails closed',async()=>{
 for(const [row,expected] of [
  [{last_checked_at:new Date().toISOString(),last_result:'ok'},200],
  [{last_checked_at:new Date().toISOString(),last_result:'error'},503],
  [{last_checked_at:new Date(Date.now()-46*60000).toISOString(),last_result:'ok'},503],
  [{last_checked_at:new Date(Date.now()+6*60000).toISOString(),last_result:'ok'},503],
  [null,503]]){
  const res=await edge.fetch(request(),env(row),{});
  assert.equal(res.status,expected);
  assert.deepEqual(await res.json(),{ok:expected===200});
  assert.equal(res.headers.get('cache-control'),'no-store');
 }
 assert.equal((await edge.fetch(request(),{},{})).status,503);
 assert.equal((await edge.fetch(request('POST'),env(null),{})).status,405);
});
