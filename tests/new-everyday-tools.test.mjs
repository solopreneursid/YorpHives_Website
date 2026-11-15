import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {runEverydayTool} from '../tools/everyday-core.mjs';
test('conversion command builder never accepts executable code',async()=>{
 assert.match((await runEverydayTool('conversion-command-builder',{mode:'docx-pdf'})).text,/libreoffice/);
 await assert.rejects(()=>runEverydayTool('conversion-command-builder',{mode:'rm -rf /'}));
});
test('JSON sort preserves arrays and object safety',async()=>{
 const x=JSON.parse((await runEverydayTool('json-key-sorter',{text:'{"b":1,"a":[3,1],"__proto__":{"x":1}}'})).text);
 assert.deepEqual(Object.keys(x),['__proto__','a','b']);
 assert.deepEqual(x.a,[3,1]);assert.equal({}.x,undefined);
});
test('CSV column extractor retains quoted multiline values and formula safety',async()=>{
 const x=(await runEverydayTool('csv-column-extractor',{text:'Name,Value\nA,"line1\nline2"\nB,=1+1',header:'Value'})).text;
 assert.match(x,/"line1\nline2"/);assert.match(x,/'=1\+1/);
 await assert.rejects(()=>runEverydayTool('csv-column-extractor',{text:'A,A\n1,2',header:'A'}));
});
test('CSV to HTML escapes untrusted markup',async()=>{
 const x=(await runEverydayTool('csv-to-html-table',{text:'Name,Value\n"<script>",1'})).text;
 assert.match(x,/&lt;script&gt;/);assert.ok(!x.includes('<script>'));
 await assert.rejects(()=>runEverydayTool('csv-to-html-table',{text:'a,b\n1'}));
});
