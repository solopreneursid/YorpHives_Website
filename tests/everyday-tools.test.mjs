import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { runEverydayTool } from '../tools/everyday-core.mjs';
import { runUtility } from '../tools/utility-core.mjs';

const examples = [
  ['qr-code-generator',{text:'https://example.com/',correction:'M'},'<svg'],
  ['markdown-to-html',{text:'# Hello\n\n**World**'},'<h1>Hello</h1>'],
  ['regex-tester',{pattern:'\\w+',flags:'i',text:'cat dog'},'Matches: 2'],
  ['json-pointer',{text:'{"a/b":{"~key":[4]}}',pointer:'/a~1b/~0key/0'},'4'],
  ['json-merge-patch',{target:'{"a":1,"nested":{"x":1},"arr":[1]}',patch:'{"a":null,"nested":{"y":2},"arr":[2]}'},'"y": 2'],
  ['json-lines-converter',{text:'{"x":1}\n{"x":2}',mode:'to-array'},'"x": 2'],
  ['number-base-converter',{value:'255',from:'10',to:'16'},'FF'],
  ['text-to-hex',{text:'Hello 🌍',mode:'encode'},'48 65 6c 6c 6f'],
  ['ipv4-subnet-calculator',{address:'192.168.1.10',prefix:'24'},'Network: 192.168.1.0/24'],
  ['word-frequency-counter',{text:'Apple apple pear',limit:'5'},'apple: 2'],
  ['lorem-ipsum-generator',{count:'2'},'Lorem ipsum'],
  ['reverse-text',{text:'A🌍B'},'B🌍A'],
  ['unicode-inspector',{text:'A🌍'},'U+1F30D'],
  ['list-to-delimited',{text:'A\nB',delimiter:', ',mode:'join',trim:'on'},'A, B'],
  ['csv-to-markdown',{text:'Name,Score\n"A, B",2'},'| A, B | 2 |'],
  ['url-tracking-remover',{url:'https://example.com/?a=1&utm_source=x#top'},'https://example.com/?a=1#top'],
  ['query-string-builder',{url:'https://example.com/?x=old#top',params:'x=new value',mode:'replace'},'x=new+value#top'],
  ['mailto-link-generator',{email:'hello@example.com',subject:'Hello there',body:'Hi!'},'mailto:hello@example.com?subject=Hello%20there'],
  ['meta-tag-generator',{title:'A & B',description:'Useful',url:'https://example.com/'},'<title>A &amp; B</title>'],
  ['robots-txt-generator',{paths:'/private/\n/internal/',sitemap:'https://example.com/sitemap.xml'},'Disallow: /private/'],
  ['xml-sitemap-generator',{urls:'https://example.com/?a=1&b=2\nhttps://example.com/about'},'&amp;b=2'],
  ['business-days-calculator',{start:'2024-01-01',end:'2024-01-07',holidays:'2024-01-03'},'Business days (inclusive): 4'],
  ['date-calculator',{date:'2024-02-28',days:'1'},'2024-02-29'],
  ['compound-interest-calculator',{principal:'1000',monthly:'0',rate:'0',years:'1'},'Estimated balance: 1000.00'],
  ['loan-payment-calculator',{principal:'1000',rate:'0',months:'10'},'Monthly payment: 100.00'],
  ['roi-calculator',{cost:'100',value:'150'},'Return on investment: 50%'],
  ['break-even-calculator',{fixed:'100',price:'15',variable:'5'},'Break-even units: 10'],
  ['reverse-sales-tax-calculator',{total:'110',rate:'10'},'Amount before tax: 100.00'],
  ['manual-currency-converter',{amount:'100',rate:'1.25'},'Converted amount: 125.00'],
  ['box-shadow-generator',{x:'0',y:'4',blur:'12',spread:'0',opacity:'50',color:'#000000'},'box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.5);'],
  ['px-to-rem-converter',{value:'24',root:'16',mode:'to-rem'},'1.5rem'],
  ['css-grid-generator',{columns:'3',gap:'16'},'grid-template-columns: repeat(3, minmax(0, 1fr));'],
];
for (const [id,data,expected] of examples) test(id,async()=>{
  const result=await runEverydayTool(id,data);
  assert.equal(typeof result.text,'string');assert.ok(result.text.includes(expected),`${id} returned an unexpected result`);
});

test('new tools are available through the existing shared utility entry point', async()=>{
  assert.equal((await runUtility('number-base-converter',{value:'1010',from:'2',to:'10'})).text,'10');
});
test('QR code exposes a local SVG preview',async()=>{
  const result=await runEverydayTool('qr-code-generator',{text:'Namaste नमस्ते 🌍',correction:'M'});
  assert.ok(result.preview.qrSvg.startsWith('<svg'));assert.ok(!result.text.includes('Namaste'));
});
test('JSON Pointer validates escaping and own properties',async()=>{
  await assert.rejects(()=>runEverydayTool('json-pointer',{text:'{"a":1}',pointer:'/constructor'}));
  await assert.rejects(()=>runEverydayTool('json-pointer',{text:'{"a":1}',pointer:'/a~2'}));
});
test('merge patch removes keys, replaces arrays, and cannot pollute object prototypes',async()=>{
  const r=await runEverydayTool('json-merge-patch',{target:'{"keep":{"x":1},"a":1,"arr":[1]}',patch:'{"a":null,"keep":{"y":2},"arr":[2],"__proto__":{"polluted":true}}'});
  const obj=JSON.parse(r.text);assert.equal(Object.hasOwn(obj,'a'),false);assert.deepEqual(obj.keep,{x:1,y:2});assert.deepEqual(obj.arr,[2]);assert.equal({}.polluted,undefined);assert.equal(Object.hasOwn(obj,'__proto__'),true);
});
test('JSON Lines and UTF-8 hex conversion handle both directions',async()=>{
  assert.equal((await runEverydayTool('json-lines-converter',{text:'[{"x":1},{"x":2}]',mode:'to-lines'})).text,'{"x":1}\n{"x":2}');
  assert.equal((await runEverydayTool('text-to-hex',{text:'e0 a4 a8 e0 a4 ae e0 a4 b8 e0 a5 8d e0 a4 a4 e0 a5 87',mode:'decode'})).text,'नमस्ते');
  await assert.rejects(()=>runEverydayTool('text-to-hex',{text:'ff',mode:'decode'}));
});
test('number bases preserve very large integers and reject invalid digits',async()=>{
  assert.equal((await runEverydayTool('number-base-converter',{value:'18446744073709551616',from:'10',to:'16'})).text,'10000000000000000');
  assert.equal((await runEverydayTool('number-base-converter',{value:'-0xFF',from:'16',to:'10'})).text,'-255');
  await assert.rejects(()=>runEverydayTool('number-base-converter',{value:'102',from:'2',to:'10'}));
});
test('IPv4 subnet handles /0, /31, /32 and rejects invalid IPs',async()=>{
  assert.match((await runEverydayTool('ipv4-subnet-calculator',{address:'10.0.0.1',prefix:'0'})).text,/Total addresses: 4,294,967,296/);
  assert.match((await runEverydayTool('ipv4-subnet-calculator',{address:'10.0.0.1',prefix:'31'})).text,/point-to-point\): 2/);
  assert.match((await runEverydayTool('ipv4-subnet-calculator',{address:'10.0.0.1',prefix:'32'})).text,/single address\): 1/);
  await assert.rejects(()=>runEverydayTool('ipv4-subnet-calculator',{address:'256.1.1.1',prefix:'24'}));
});
test('regex tester stops slow expressions in a separate worker',async()=>{
  assert.match((await runEverydayTool('regex-tester',{pattern:'cat',flags:'gi',text:'Cat cat'})).text,/Matches: 2/);
  await assert.rejects(()=>runEverydayTool('regex-tester',{pattern:'(a+)+$',flags:'',text:'a'.repeat(30000)+'!'}),/too long/i);
  await assert.rejects(()=>runEverydayTool('regex-tester',{pattern:'(',flags:'',text:'abc'}));
});
test('URL, metadata, and sitemap tools handle unsafe input and escaping',async()=>{
  await assert.rejects(()=>runEverydayTool('url-tracking-remover',{url:'javascript:alert(1)'}));
  await assert.rejects(()=>runEverydayTool('xml-sitemap-generator',{urls:'https://a.example/\nhttps://b.example/'}));
  await assert.rejects(()=>runEverydayTool('robots-txt-generator',{paths:'/private#comment'}));
  const meta=(await runEverydayTool('meta-tag-generator',{title:'"><script>',description:'A & B',url:'https://example.com/'})).text;
  assert.ok(!meta.includes('<script>'));assert.ok(meta.includes('&lt;script&gt;'));
});
test('date and business days validate real calendar dates and holidays',async()=>{
  await assert.rejects(()=>runEverydayTool('date-calculator',{date:'2023-02-29',days:'1'}));
  assert.match((await runEverydayTool('business-days-calculator',{start:'2024-01-01',end:'2024-01-01',holidays:''})).text,/inclusive\): 1/);
  assert.match((await runEverydayTool('date-calculator',{date:'2024-01-01',days:'-1'})).text,/2023-12-31/);
});
test('financial formulas handle zero and tiny rates and reject impossible break-even',async()=>{
  assert.match((await runEverydayTool('loan-payment-calculator',{principal:'1000',rate:'0.00000000001',months:'10'})).text,/Monthly payment: 100.00/);
  assert.match((await runEverydayTool('compound-interest-calculator',{principal:'1000',monthly:'100',rate:'0.00000000001',years:'1'})).text,/Estimated balance: 2200.00/);
  await assert.rejects(()=>runEverydayTool('break-even-calculator',{fixed:'100',price:'10',variable:'10'}));
});
test('new tool results clear and fail clearly on malformed inputs',async()=>{
  await assert.rejects(()=>runEverydayTool('json-lines-converter',{text:'{"x":1}\nBAD',mode:'to-array'}),/Line 2/);
  await assert.rejects(()=>runEverydayTool('csv-to-markdown',{text:'a,b\n1'}));
  await assert.rejects(()=>runEverydayTool('box-shadow-generator',{x:'0',y:'0',blur:'1',spread:'0',opacity:'50',color:'red; color: blue'}));
  await assert.rejects(()=>runEverydayTool('mailto-link-generator',{email:'a@example.com',subject:'hello\nBcc:x@example.com'}));
});
