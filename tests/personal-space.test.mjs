import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readSpace,toggleSpace,recordRecent,moveSaved,productIdentity} from '../tools/personal-space.mjs';
import {SAVED_KEY} from '../tools/save-tool.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('Toolspace retains old saved-tool list and supports reordering',()=>{
 const s=storage();s.setItem(SAVED_KEY,JSON.stringify(['tools/word-counter/','tools/pdf-merge/']));
 assert.deepEqual(readSpace(s,'tools'),['tools/word-counter/','tools/pdf-merge/']);
 assert.equal(moveSaved(s,'tools','tools/pdf-merge/',-1),true);
 assert.deepEqual(readSpace(s,'tools'),['tools/pdf-merge/','tools/word-counter/']);
 assert.equal(toggleSpace(s,'tools','tools/word-counter/'),false);
 assert.deepEqual(readSpace(s,'tools'),['tools/pdf-merge/']);
 assert.equal(toggleSpace(s,'tools','https://evil.test/'),null);
});
test('Recent tools record unique approved local identifiers, never content',()=>{
 const s=storage();
 for(const id of ['tools/word-counter/','tools/pdf-merge/','tools/word-counter/'])
  assert.equal(recordRecent(s,'tools',id),true);
 assert.deepEqual(readSpace(s,'tools','recent'),['tools/word-counter/','tools/pdf-merge/']);
 assert.equal(recordRecent(s,'tools','https://malicious.example/'),false);
});
test('HQventures saved products are independent from tools and validated',()=>{
 const s=storage(),id=productIdentity({url:'hqventures/my-software/'});
 assert.equal(id,'hqventures/my-software/');
 assert.equal(productIdentity({id:'my-app',url:'hqventures/app-v2/'}),'products/my-app/');
 assert.equal(productIdentity({id:'my-app',url:'hqventures/app-v3/'}),'products/my-app/');
 assert.equal(toggleSpace(s,'products',id),true);
 assert.deepEqual(readSpace(s,'products'),[id]);
 assert.deepEqual(readSpace(s,'tools'),[]);
 assert.equal(recordRecent(s,'products',id),true);
 assert.deepEqual(readSpace(s,'products','recent'),[id]);
 assert.equal(toggleSpace(s,'products','javascript:alert(1)'),null);
});
test('Review build exposes both sections and records direct tool visits',async()=>{
 const homepage=await readFile(resolve(root,'dist/index.html'),'utf8');
 const directory=await readFile(resolve(root,'dist/tools/index.html'),'utf8');
 const tool=await readFile(resolve(root,'dist/tools/word-counter/index.html'),'utf8');
 const css=await readFile(resolve(root,'dist/personal-space.css'),'utf8');
 assert.match(homepage,/data-toolspace-tab="saved"/);
 assert.match(homepage,/data-productspace-tab="saved"/);
 assert.match(directory,/data-directory-space-tab="saved"/);
 assert.match(tool,/src="\/tools\/visit-tool\.mjs"/);
 assert.match(css,/@media\(max-width:480px\)/);
 const catalog=JSON.parse(await readFile(resolve(root,'dist/catalog.json'),'utf8'));
 assert.equal(catalog.items.filter(x=>x.type==='tool').length,143);
});
