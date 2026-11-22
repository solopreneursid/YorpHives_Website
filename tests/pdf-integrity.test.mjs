import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {calculateInvoice} from '../tools/pdf-money.mjs';
import {processWave1} from '../tools/wave1-core.mjs';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import {PDF_FONT_PACK_SIZE,PDF_FONT_PACK_SHA256,PDF_FONTS} from '../tools/pdf-font-coverage.mjs';

async function extract(out){
 const pdfjs=await import('../dist/tools/vendor/pdfjs/pdf.mjs');
 const task=pdfjs.getDocument({data:new Uint8Array(await out.blob.arrayBuffer()),useSystemFonts:true});
 const doc=await task.promise,items=[];
 for(let i=1;i<=doc.numPages;i++)items.push((await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(''));
 await task.destroy();return items;
}
test('invoice amounts round each displayed line before the subtotal and tax',()=>{
 const x=calculateInvoice(['A | 0.5 | 0.67','B | 0.5 | 0.67'],'0','INR');
 assert.deepEqual(x.items.map(i=>i.total),['0.34','0.34']);
 assert.equal(x.subtotal,'0.68');assert.equal(x.tax,'0.00');assert.equal(x.total,'0.68');
 const precise=calculateInvoice(['A | 3 | 0.335'],'5','USD');
 assert.equal(precise.items[0].price,'0.335');assert.equal(precise.items[0].total,'1.01');
 assert.equal(precise.subtotal,'1.01');assert.equal(precise.tax,'0.05');assert.equal(precise.total,'1.06');
 assert.equal(calculateInvoice(['A | 1 | 1.5'],0,'JPY').total,'2');
 assert.equal(calculateInvoice(['A | 1 | 1.2345'],0,'KWD').total,'1.235');
 for(const line of ['A | 0 | 1','A | 1 | -1','A | 1 | 1e3','A | 1 | 0.0000001'])
  assert.throws(()=>calculateInvoice([line],0,'INR'));
});
test('invoice keeps the whole accepted description and accented Latin in the actual PDF',async()=>{
 const description='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 const out=await processWave1('invoice-generator',[],{business:'Café Renée',client:'Client',currency:'INR',tax:0,
  items:description+' | 0.5 | 0.67\nSecond | 0.5 | 0.67'});
 const text=(await extract(out)).join('');
 assert.match(text,/Café Renée/);
 assert.ok(text.replace(/\s/g,'').includes(description));
 assert.match(text,/Subtotal: INR 0\.68/);
 assert.match(text,/Amount due: INR 0\.68/);
});
test('long invoices paginate without dropping items or the final amount',async()=>{
 const lines=Array.from({length:20},(_,i)=>'Item '+String(i+1).padStart(2,'0')+' '+('W'.repeat(59))+' | 1 | 12.34');
 const out=await processWave1('invoice-generator',[],{business:'W'.repeat(80),client:'Client',currency:'INR',tax:18,items:lines.join('\n')});
 const pages=await extract(out),text=pages.join('');
 assert.ok(pages.length>=2);
 for(let i=1;i<=20;i++)assert.ok(text.includes('Item '+String(i).padStart(2,'0')));
 assert.match(text,/Amount due: INR 291\.22/);
 assert.ok(pages.at(-1).includes('Item 20'),'The last item and totals stay together');
});
test('watermark and typed signature preserve accented Latin rather than replacing it',async()=>{
 const doc=await PDFDocument.create();doc.addPage([400,300]);
 const file=new File([await doc.save()],'synthetic.pdf',{type:'application/pdf'});
 for(const [name,data] of [['pdf-watermark',{watermark:'Café Renée'}],['pdf-visual-signature',{signature:'Café Renée'}]]){
  const text=(await extract(await processWave1(name,[file],data))).join('');
  assert.ok(text.includes('Café Renée'),name);
 }
});
test('bundled font pack has the reviewed bytes and complete non-overlapping coverage entries',async()=>{
 const bytes=await readFile(new URL('../tools/pdf-fonts/yorphives-noto-pack.bin',import.meta.url));
 assert.equal(bytes.length,PDF_FONT_PACK_SIZE);
 assert.equal(PDF_FONT_PACK_SHA256,'c104edf5cc7d25acfbbcbaf45fc66ecae697b7c3dad316a615c024f23f674fe6');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),PDF_FONT_PACK_SHA256);
 let offset=0;for(const f of PDF_FONTS){assert.equal(f.offset,offset);offset+=f.length;assert.ok(f.ranges.length>0)}
 assert.equal(offset,bytes.length);
});
