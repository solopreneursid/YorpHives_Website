import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {LANGUAGES,localizedLabel,nativeTranslator} from '../site-languages.mjs';
import {PAGE_COPY,getLocalCopy} from '../site-language-copy.mjs';
import {TOOL_COPY,getToolCopy} from '../site-tool-copy.mjs';
import {SECTION_COPY,getSectionCopy} from '../site-section-copy.mjs';
const read=p=>readFile(resolve(process.cwd(),p),'utf8');
test('language selector supports eight readable languages without remote dependencies',()=>{
 assert.equal(LANGUAGES.length,8);
 assert.ok(LANGUAGES.some(([code])=>code==='hi'));
 assert.equal(localizedLabel('Home','hi'),'होम');
 assert.equal(localizedLabel('Free tools','es'),'Herramientas gratis');
 assert.equal(localizedLabel('Unknown site content','es'),null);
 assert.ok(Object.keys(PAGE_COPY).length>=45);
 assert.ok(Object.keys(TOOL_COPY).length>=45);
 assert.ok(Object.keys(SECTION_COPY).length>=35);
 for(const language of ['hi','es','fr','de','pt','ar','ja']){
  assert.ok(getLocalCopy('We discover emerging opportunities, build useful digital products, and create technology that evolves with the world.',language));
  assert.ok(getLocalCopy('Have an idea, an opportunity, or a reason to collaborate? Connect with YorpHives.',language));
  assert.ok(getLocalCopy('Digital Ventures.',language));
  for(const sentence of ['Ideas are easy.','Building matters.','Less searching.','More doing.','Better together.','Your name','Prepare my email'])
   assert.ok(getSectionCopy(sentence,language),sentence+' '+language);
  for(const label of ['Run tool','Reset','Copy result','Your input stays on this device','How to use this tool','Paste or type text here','Search by name, description, or category. Every tool runs from its own direct page.'])
   assert.ok(getToolCopy(label,language),label+' '+language);
 }
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
 assert.match(source,/textarea,input,select,option/);
 assert.ok(source.includes("parent.closest('button')&&!controls"));
 assert.match(source,/savedAttributes/);
 assert.match(source,/getToolCopy/);
 assert.match(source,/getSectionCopy/);
 assert.match(source,/\[id\$="-output"\]/);
 assert.match(source,/\.create\(\{sourceLanguage:'en'/);
 assert.match(source,/translate\(original\)/);
});

test('public tool strings translate without changing values or generated results',async()=>{
 const original=await read('tools/word-counter/index.html');
 for(const key of ['Runs in your browser','Your input stays on this device','Run tool','Reset','Paste or type text here','How to use this tool'])
  assert.ok(original.includes(key),key);
 const [script,build]=await Promise.all([read('site-languages.mjs'),read('scripts/build-site.mjs')]);
 assert.ok(build.includes('site-tool-copy.mjs'));
 assert.ok(build.includes('site-section-copy.mjs'));
 assert.ok(script.includes("option.setAttribute('label',translation)"));
 assert.ok(script.includes("option.textContent.trim()"));
 assert.ok(script.includes("element.removeAttribute(name)"));
 assert.ok(script.includes("for(const name of ['placeholder','aria-label','title'])"));
 assert.ok(script.includes('[id$="-output"]'));
 assert.ok(script.includes("if(parent.closest('button')&&!controls)"));
 assert.doesNotMatch(script,/(?:\.value\\s*=|\.files|FormData|XMLHttpRequest|sendBeacon)/);
});
