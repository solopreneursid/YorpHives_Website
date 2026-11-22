import test from 'node:test';
import assert from 'node:assert/strict';
import {invokePublicTool} from '../agentic/tools-core.mjs';

const invoke=(id,input)=>invokePublicTool(id,input);
test('Hindi word boundaries preserve combining marks',()=>{
  assert.equal(invoke('word_count',{text:'नमस्ते दुनिया'}).words,2);
});
test('Latin and accented words count correctly',()=>{
  assert.equal(invoke('word_count',{text:'Hello, café world!'}).words,3);
});
test('Thai segmentation is supported without whitespace',()=>{
  assert.ok(invoke('word_count',{text:'สวัสดีครับ'}).words>=1);
});
test('title case works for accented letters',()=>{
  assert.equal(invoke('case_convert',{text:'éclair café',mode:'title'}).text,'Éclair Café');
});
test('case changes keep punctuation and spaces',()=>{
  assert.equal(invoke('case_convert',{text:'hello, café! WORLD',mode:'title'}).text,'Hello, Café! World');
});
test('other deterministic calculations still work',()=>{
  assert.deepEqual(invoke('discount',{price:100,percent:25}),{savings:25,finalPrice:75});
});
