import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {processWave4} from '../tools/wave4-core.mjs';
import * as pdfjs from '../dist/tools/vendor/pdfjs/pdf.mjs';

async function extract(result){
 const task=pdfjs.getDocument({data:new Uint8Array(await result.blob.arrayBuffer()),useSystemFonts:true});
 const doc=await task.promise,pages=[];
 for(let i=1;i<=doc.numPages;i++){
  const page=await doc.getPage(i),items=(await page.getTextContent()).items.filter(item=>item.str.trim());
  pages.push({text:items.map(item=>item.str).join(''),width:page.view[2],items});
 }
 await task.destroy();return pages;
}
const compact=value=>value.replace(/\s/g,'');
function insidePage(pages){
 for(const page of pages)for(const item of page.items){
  assert.ok(item.transform[4]>=25,'Text begins outside the page margin: '+item.str);
  assert.ok(item.transform[4]+item.width<=page.width-25+.1,'Text ends outside the page margin: '+item.str);
 }
}
test('quotation preserves precise unit prices, uses correct currency precision and totals',async()=>{
 for(const [currency,items,tax,expected] of [
  ['INR','Service | 3 | 0.335','18',['0.335','1.01','0.18','INR 1.19']],
  ['JPY','Service | 1 | 1.5','0',['1.5','2','JPY 2']],
  ['KWD','Service | 1 | 1.2345','0',['1.2345','1.235','KWD 1.235']]]){
  const pages=await extract(await processWave4('quotation-generator',[],{business:'Café Renée',client:'Sample Client',items,currency,tax}));
  const text=pages.map(p=>p.text).join('');
  for(const value of expected)assert.ok(text.includes(value),currency+' missing '+value);
  assert.ok(text.includes('Café Renée'));
  insidePage(pages);
 }
});
test('quotation wraps long names and preserves every note across pages',async()=>{
 const business='Worldwide International Business Management and Professional Services Limited';
 const notes=Array.from({length:40},(_,i)=>'Condition '+String(i+1).padStart(2,'0')+' applies.');
 const pages=await extract(await processWave4('quotation-generator',[],{business,client:'Sample Client',items:'Service | 1 | 12',notes:notes.join('\n')}));
 const text=pages.map(p=>p.text).join('');
 assert.ok(pages.length>1);assert.ok(compact(text).includes(compact(business)));
 for(const note of notes)assert.ok(text.includes(note),'Missing '+note);
 insidePage(pages);
});
test('certificate wraps names and preserves all details across pages',async()=>{
 const organization='Worldwide International Business Management and Professional Services Limited';
 const detail=Array.from({length:35},(_,i)=>'Achievement '+String(i+1).padStart(2,'0')+' completed.');
 const pages=await extract(await processWave4('certificate-generator',[],{recipient:'José',title:'Participation',organization,detail:detail.join('\n')}));
 const text=pages.map(p=>p.text).join('');
 assert.ok(pages.length>1);assert.ok(text.includes('José'));
 assert.ok(compact(text).includes(compact(organization)));
 for(const line of detail)assert.ok(text.includes(line),'Missing '+line);
 insidePage(pages);
});
test('unsafe or unreasonable inputs fail clearly before creating a document',async()=>{
 for(const items of ['Service | 0 | 10','Service | 1 | -1','Service | 10001 | 1','Service | 1 | 0.0000001'])
  await assert.rejects(()=>processWave4('quotation-generator',[],{business:'Example',client:'Client',items}));
 await assert.rejects(()=>processWave4('quotation-generator',[],{business:'Example\u0001',client:'Client',items:'Service | 1 | 1'}),/control characters/);
});
