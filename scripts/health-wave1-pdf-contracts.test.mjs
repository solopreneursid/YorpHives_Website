import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import {processWave1} from '../tools/wave1-core.mjs';

async function source(){
 const doc=await PDFDocument.create();
 for(const w of [200,240,280])doc.addPage([w,300]);
 const bytes=await doc.save();
 return new Blob([bytes],{type:'application/pdf'});
}
const check=async(out)=>{
 assert.equal(out.blob.type,'application/pdf');
 const bytes=new Uint8Array(await out.blob.arrayBuffer());
 assert.equal(new TextDecoder('latin1').decode(bytes.slice(0,5)),'%PDF-');
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),3);
 return pdf;
};
test('PDF page numbers return a valid three-page PDF',async()=>{
 const pdf=await check(await processWave1('pdf-page-numbers',[await source()],{size:'12',placement:'bottom-center'}));
 assert.deepEqual(pdf.getPages().map(p=>p.getWidth()),[200,240,280]);
});
test('PDF visible watermark returns a valid three-page PDF',async()=>{
 await check(await processWave1('pdf-watermark',[await source()],{watermark:'QA ONLY',size:'32',opacity:'25'}));
});
test('PDF visual signature preserves pages but does not claim digital signing',async()=>{
 const out=await processWave1('pdf-visual-signature',[await source()],{signature:'QA SIGN',page:'2',size:'20',bottom:'40'});
 await check(out);
 assert.match(out.summary,/not a cryptographic digital signature/);
});
test('PDF rearrange pages preserves requested order and page sizes',async()=>{
 const pdf=await check(await processWave1('pdf-rearrange-pages',[await source()],{order:'3,1,2'}));
 assert.deepEqual(pdf.getPages().map(p=>p.getWidth()),[280,200,240]);
});
test('PDF rearrange rejects missing or duplicated pages',async()=>{
 await assert.rejects(processWave1('pdf-rearrange-pages',[await source()],{order:'1,1,2'}),/each page exactly once/);
});
