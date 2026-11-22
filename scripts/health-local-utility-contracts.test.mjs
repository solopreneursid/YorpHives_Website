import test from 'node:test';
import assert from 'node:assert/strict';
import {runUtility,parseCsv,csvToJson,jsonToCsv} from '../tools/utility-core.mjs';

const run=async(id,input)=>(await runUtility(id,input)).text;
test('word counter handles combining-mark scripts',async()=>{
 assert.match(await run('word-counter',{text:'नमस्ते दुनिया'}),/^Words: 2\n/);
});
test('case conversion supports accented title text',async()=>{
 assert.equal(await run('case-converter',{text:'éclair café',mode:'title'}),'Éclair Café');
});
test('slug generator normalizes accented Latin text',async()=>{
 assert.equal(await run('slug-generator',{text:'Café & Crème'}),'cafe-creme');
});
test('duplicate line remover matches case-insensitively',async()=>{
 assert.equal(await run('duplicate-line-remover',{text:'Alpha\nalpha\nBeta',ignorecase:'on'}),'Alpha\nBeta');
});
test('natural line sort respects numbers',async()=>{
 assert.equal(await run('line-sorter',{text:'item10\nitem2\nitem1',order:'asc'}),'item1\nitem2\nitem10');
});
test('UTF-8 base64 round trip',async()=>{
 const encoded=await run('base64-tool',{text:'café',mode:'encode'});
 assert.equal(await run('base64-tool',{text:encoded,mode:'decode'}),'café');
});
test('URL encoding and decoding round trip',async()=>{
 const encoded=await run('url-encoder',{text:'hello world & café',mode:'encode'});
 assert.equal(await run('url-encoder',{text:encoded,mode:'decode'}),'hello world & café');
});
test('CSV parser handles quoted newlines and commas',()=>{
 assert.deepEqual(parseCsv('name,details\n"Ada","one,two"\n"Lin","line1\nline2"'),[['name','details'],['Ada','one,two'],['Lin','line1\nline2']]);
});
test('CSV/JSON conversion preserves quoted values',()=>{
 const json=csvToJson('name,details\n"Ada","one,two"');
 assert.deepEqual(JSON.parse(json),[{name:'Ada',details:'one,two'}]);
 assert.equal(jsonToCsv(json,false),'name,details\r\nAda,"one,two"');
});
test('percentage calculation is accurate',async()=>{
 assert.equal(await run('percentage-calculator',{a:'25',b:'200',mode:'of'}),'25% of 200 = 50');
});
test('discount calculation is accurate',async()=>{
 assert.match(await run('discount-calculator',{price:'100',rate:'15'}),/Final price: 85\.00/);
});
