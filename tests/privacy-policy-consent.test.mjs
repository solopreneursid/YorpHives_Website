import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const read=path=>readFile(resolve('dist',path),'utf8');
test('every published tool exposes the same analytics choice and privacy link',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 assert.ok(tools.length>=143);
 for(const tool of tools){
  const page=await read(tool.url+'index.html');
  assert.equal((page.match(/id="anonymous-analytics-toggle"/g)||[]).length,1,tool.url);
  assert.match(page,/href="\/privacy\/"/,tool.url);
  assert.match(page,/insights-client\.mjs/,tool.url);
 }
});
test('privacy settings remain available on the policy, directory and HQventures pages',async()=>{
 for(const path of ['privacy/index.html','tools/index.html','hqventures/index.html']){
  const page=await read(path);
  assert.equal((page.match(/id="anonymous-analytics-toggle"/g)||[]).length,1,path);
  assert.match(page,/insights-client\.mjs/,path);
 }
 const policy=await read('privacy/index.html');
 for(const id of ['tools','api','analytics','enquiries','providers','retention','ventures','rights','contact'])
  assert.ok(policy.includes('id="'+id+'"'),'Missing policy section '+id);
 assert.match(policy,/off until you choose/i);
 assert.match(policy,/no fixed automatic expiry for enquiries/i);
 assert.match(policy,/does not itself give permission for unspecified future uses/i);
});
