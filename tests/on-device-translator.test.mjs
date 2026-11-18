import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validPair,checkAvailability,translatorAPI} from '../tools/on-device-translator.mjs';

test('browser translator is opt-in and validates supported, distinct language tags',()=>{
 assert.equal(validPair('en','hi'),true);
 assert.equal(validPair('en','en'),false);
 assert.equal(validPair('hi','xx'),false);
 assert.equal(translatorAPI({}),null);
 assert.equal(translatorAPI({Translator:{availability:async()=> 'available'}}),null);
});
test('availability checks are fail closed, pair-specific, and do not call create',async()=>{
 const calls=[];
 const API={
  availability:async pair=>{calls.push(pair);return pair.targetLanguage==='fr'?'downloadable':'available';},
  create:()=>{throw Error('Should require user gesture, not a support check');}
 };
 assert.equal(await checkAvailability(API,'en','hi'),'available');
 assert.equal(await checkAvailability(API,'en','fr'),'downloadable');
 assert.equal(await checkAvailability(API,'en','en'),'unavailable');
 assert.equal(await checkAvailability(null,'en','hi'),'unsupported');
 assert.equal(await checkAvailability({availability:async()=>{throw Error('No support')}},'en','hi'),'unavailable');
 assert.deepEqual(calls,[{sourceLanguage:'en',targetLanguage:'hi'},{sourceLanguage:'en',targetLanguage:'fr'}]);
});
test('published translator is an optional browser-local tool without remote execution API',async()=>{
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const item=catalog.items.find(i=>i.url==='tools/on-device-translator/');
 assert.ok(item);
 assert.equal(item.execution,'browser-local');
 assert.equal(item.category,'Writing');
 assert.equal(item.module.url,'tools/on-device-translator.mjs');
 const html=await readFile(resolve(root,'dist/tools/on-device-translator/index.html'),'utf8');
 assert.match(html,/rel="canonical" href="https:\/\/yorphives.com\/tools\/on-device-translator\/"/);
 assert.match(html,/id="translator-form"/);
 assert.match(html,/id="translator-availability"/);
 assert.match(html,/no remote translation service/i);
 assert.match(html,/on-device-translator.mjs/);
 const source=await readFile(resolve(root,'tools/on-device-translator.mjs'),'utf8');
 assert.match(source,/api\.create\(/);
 assert.match(source,/API\.availability\(/);
 assert.doesNotMatch(source,/(?:fetch\(|sendBeacon\(|XMLHttpRequest|localStorage|sessionStorage|eval\()/);
});
