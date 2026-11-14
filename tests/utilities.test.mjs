import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { runUtility, parseCsv, jsonToCsv, csvToJson, hexRgb } from '../tools/utility-core.mjs';

const cases = [
 ['word-counter',{text:'Hello world.\n\nAnother line!'},'Words: 4'],
 ['case-converter',{text:'Hello World',mode:'upper'},'HELLO WORLD'],
 ['slug-generator',{text:'Crème brûlée & tea'},'creme-brulee-tea'],
 ['duplicate-line-remover',{text:'A\na\nB',ignorecase:'on'},'A\nB'],
 ['line-sorter',{text:'item10\nitem2\nitem1',order:'asc'},'item1\nitem2\nitem10'],
 ['whitespace-cleaner',{text:'  a   b  \n\n c ',trim:'on',collapse:'on',empty:'on'},'a b\nc'],
 ['text-find-replace',{text:'cat cat',find:'cat',replace:'dog'},'dog dog'],
 ['text-diff',{original:'a\nb',revised:'a\nc'},'- b'],
 ['base64-tool',{text:'hello 🌏',mode:'encode'},'aGVsbG8g8J+Mjw=='],
 ['url-encoder',{text:'a b&c',mode:'encode'},'a%20b%26c'],
 ['html-entities',{text:'<a & b>',mode:'encode'},'&lt;a &amp; b&gt;'],
 ['json-to-csv',{text:'[{"name":"Mira","score":42}]',safe:'on'},'name,score\r\nMira,42'],
 ['csv-to-json',{text:'name,score\nMira,42'},'"score": "42"'],
 ['url-parser',{url:'https://example.com/a?x=1#top'},'Hostname: example.com'],
 ['uuid-generator',{count:'2'},''],
 ['hash-generator',{text:'abc',algorithm:'SHA-256'},'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
 ['jwt-decoder',{text:'eyJhbGciOiJub25lIn0.eyJuYW1lIjoiTXJhIn0.'},'Signature is not verified'],
 ['unix-timestamp',{mode:'to-date',value:'0',unit:'seconds'},'1970-01-01T00:00:00.000Z'],
 ['percentage-calculator',{mode:'of',a:'20',b:'150'},'30'],
 ['discount-calculator',{price:'100',rate:'20'},'Final price: 80.00'],
 ['profit-margin',{cost:'60',price:'100'},'Profit margin: 40%'],
 ['tip-calculator',{bill:'100',rate:'15',people:'2'},'Per person (rounded): 57.50'],
 ['sales-tax-calculator',{amount:'100',rate:'10'},'Total including tax: 110.00'],
 ['unit-converter',{value:'1000',from:'m',to:'km'},'1 km'],
 ['time-duration',{start:'23:00',end:'01:30',overnight:'on'},'2 hours 30 minutes'],
 ['average-calculator',{text:'1,2,3,4'},'Median: 2.5'],
 ['color-converter',{color:'#fff'},'rgb(255, 255, 255)'],
 ['contrast-checker',{foreground:'#000000',background:'#ffffff'},'21.00:1'],
 ['gradient-generator',{first:'#000',second:'#fff',angle:'90'},'linear-gradient(90deg, #000000, #ffffff)'],
 ['aspect-ratio-calculator',{width:'1920',height:'1080',target:'800'},'Aspect ratio: 16:9'],
 ['color-palette',{color:'#ff0000'},'hsl(0, 100%, 50%)'],
 ['password-generator',{length:'20',lower:'on',upper:'on',numbers:'on',symbols:'on'},''],
];
for (const [id,data,expected] of cases) test(id,async()=>{const result=await runUtility(id,data);assert.ok(result.text.includes(expected));assert.ok(result.text.length>0);if(id==='uuid-generator')assert.match(result.text,/^[0-9a-f-]{36}\n[0-9a-f-]{36}$/);if(id==='password-generator'){assert.equal(result.text.length,20);assert.match(result.text,/[a-z]/);assert.match(result.text,/[A-Z]/);assert.match(result.text,/[0-9]/);assert.match(result.text,/[!@#$%^&*_=+?\-]/)}});
test('CSV handles quoted commas, multiline text, and rejects malformed rows',()=>{assert.deepEqual(parseCsv('name,note\r\n"A, B","line 1\nline 2"'),[['name','note'],['A, B','line 1\nline 2']]);assert.throws(()=>csvToJson('a,b\n1'));assert.throws(()=>parseCsv('a\n"unterminated'));});
test('CSV safety escapes dangerous strings but not negative numeric values',()=>{const value=jsonToCsv('[{"x":"=1+1","n":-5}]',true);assert.ok(value.includes("'=1+1,-5"));});
test('invalid inputs fail safely',async()=>{await assert.rejects(()=>runUtility('unit-converter',{value:'1',from:'m',to:'kg'}));await assert.rejects(()=>runUtility('password-generator',{length:'20'}));await assert.rejects(()=>runUtility('percentage-calculator',{mode:'what',a:'1',b:'0'}));assert.throws(()=>hexRgb('#nothex'));});

test('next-day clock times always include the additional day',async()=>{const a=await runUtility('time-duration',{start:'09:00',end:'17:00',overnight:'on'});assert.ok(a.text.includes('32 hours 0 minutes'));const b=await runUtility('time-duration',{start:'09:00',end:'09:00',overnight:'on'});assert.ok(b.text.includes('24 hours 0 minutes'))});

test('Unicode slugs preserve marks in non-Latin scripts',async()=>{const r=await runUtility('slug-generator',{text:'नमस्ते दुनिया'});assert.equal(r.text,'नमस्ते-दुनिया')});
test('text encoders accept a whitespace-only input',async()=>{const r=await runUtility('base64-tool',{text:' ',mode:'encode'});assert.equal(r.text,'IA==')});
