import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {LANGUAGES,localizedLabel,nativeTranslator} from '../site-languages.mjs';
const read=p=>readFile(resolve(process.cwd(),p),'utf8');
test('language selector supports eight readable languages without remote dependencies',()=>{
 assert.equal(LANGUAGES.length,8);
 assert.ok(LANGUAGES.some(([code])=>code==='hi'));
 assert.equal(localizedLabel('Home','hi'),'होम');
 assert.equal(localizedLabel('Free tools','es'),'Herramientas gratis');
 assert.equal(localizedLabel('Unknown site content','es'),null);
 assert.equal(nativeTranslator({}),null);
 assert.equal(nativeTranslator({Translator:{availability() {}}}),null);
});
test('site-wide shell is included in all built tool pages, directory and homepage',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 for(const path of ['index.html','tools/index.html',...catalog.items.filter(i=>i.type==='tool').map(i=>i.url+'index.html')]){
  const content=await read('dist/'+path);
  assert.match(content,/id="yh-language-picker"/,path);
  assert.match(content,/site-languages\.mjs/,path);
  assert.match(content,/site-languages\.css/,path);
 }
 assert.equal(catalog.items.filter(i=>i.type==='tool').length,143);
 assert.equal(catalog.items.some(i=>i.url==='tools/on-device-translator/'),false);
});
test('translation source never reads tool inputs, outputs or sends page contents off site',async()=>{
 const source=await read('site-languages.mjs');
 assert.doesNotMatch(source,/(?:fetch\(|sendBeacon|XMLHttpRequest|navigator\.clipboard|\.value\s*\)\s*\}|innerHTML\s*=)/);
 assert.match(source,/textarea,select,option,button/);
 assert.match(source,/\[id\$="-output"\]/);
 assert.match(source,/\.create\(\{sourceLanguage:'en'/);
 assert.match(source,/translate\(original\)/);
});
