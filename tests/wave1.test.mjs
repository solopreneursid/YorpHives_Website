import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import {WAVE1_IDS,processWave1} from '../tools/wave1-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
async function pdfFile(){
 const doc=await PDFDocument.create();
 doc.addPage([100,150]);doc.addPage([200,250]);doc.addPage([300,350]);
 return new File([await doc.save()],'test.pdf',{type:'application/pdf'});
}
const view=async result=>PDFDocument.load(await result.blob.arrayBuffer());
test('Wave 1 contains fifteen independently registered direct-entry tools',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 assert.equal(catalog.items.filter(x=>x.type==='tool').length,107);
 assert.equal(WAVE1_IDS.length,15);assert.equal(new Set(WAVE1_IDS).size,15);
 for(const id of WAVE1_IDS){
  const item=catalog.items.find(x=>x.url==='tools/'+id+'/');
  assert.ok(item,'missing catalog '+id);
  assert.equal(item.execution,'browser-local');
  assert.equal(item.module.url,'tools/wave1-core.mjs');
  assert.equal(item.module.toolId,id);
  const page=await readFile(resolve(root,'tools',id,'index.html'),'utf8');
  assert.match(page,/data-wave1="/);
  assert.match(page,/id="wave1-form"/);
  assert.match(page,/wave1-page\.mjs/);
  assert.ok(!page.includes('https://cdn.'),'must not require CDN '+id);
  const html=await readFile(resolve(dist,'tools',id,'index.html'),'utf8');
  assert.ok(html.includes('https://yorphives.com/tools/'+id+'/'),'canonical '+id);
 }
});
test('all PDF editing tools create genuine downloadable PDFs',async()=>{
 const file=await pdfFile();
 for(const [id,fields] of [
  ['pdf-page-numbers',{placement:'bottom-center',size:12}],
  ['pdf-watermark',{watermark:'DRAFT',opacity:25,size:30}],
  ['pdf-visual-signature',{signature:'Alex',page:2,bottom:35,size:22}],
  ['pdf-rearrange-pages',{order:'3,1,2'}]]){
   const output=await processWave1(id,[file],fields);
   assert.equal(output.blob.type,'application/pdf',id);
   const doc=await view(output);assert.equal(doc.getPageCount(),3,id);
   if(id==='pdf-rearrange-pages')assert.deepEqual(doc.getPages().map(x=>x.getWidth()),[300,100,200]);
 }
});
test('page reorder and visible signature reject invalid input',async()=>{
 const file=await pdfFile();
 await assert.rejects(()=>processWave1('pdf-rearrange-pages',[file],{order:'1,1,3'}),/exactly once/);
 await assert.rejects(()=>processWave1('pdf-visual-signature',[file],{signature:'',page:2}),/signature/);
 await assert.rejects(()=>processWave1('pdf-visual-signature',[file],{signature:'Alex',page:50}),/page/);
 const output=await processWave1('pdf-visual-signature',[file],{signature:'Alex',page:2});
 assert.match(output.summary,/not a cryptographic/);
});
test('invoice generator computes tax and stores a valid one-page PDF',async()=>{
 const pdf=await processWave1('invoice-generator',[],{business:'Acme',client:'Client',currency:'USD',tax:10,items:'A | 2 | 100\nB | 1 | 50'});
 assert.equal(pdf.blob.type,'application/pdf');assert.match(pdf.summary,/275\.00/);
 assert.equal((await view(pdf)).getPageCount(),1);
 await assert.rejects(()=>processWave1('invoice-generator',[],{business:'Acme',client:'A',items:'invalid'}),/Description/);
});
test('Wave 1 only accepts known IDs and validates PDF signatures',async()=>{
 await assert.rejects(()=>processWave1('not-a-tool',[],{}),/Unknown/);
 await assert.rejects(()=>processWave1('pdf-page-numbers',[new File(['bad'],'bad.pdf')],{}),/valid PDF/);
});
test('self-hosted Wave 1 engines ship in dist and never in production tool source',async()=>{
 const needed=[
 'tools/vendor/pdfjs/pdf.mjs','tools/vendor/pdfjs/pdf.worker.mjs',
 'tools/vendor/ocr/tesseract.esm.min.js','tools/vendor/ocr/worker.min.js',
 'tools/vendor/ocr/lang/eng.traineddata.gz','tools/vendor/qr/jsQR.js',
 'tools/vendor/barcode/JsBarcode.all.min.js'
 ];
 for(const file of needed){
  const meta=await stat(resolve(dist,file));assert.ok(meta.isFile()&&meta.size>100,file);
 }
 const vendors=await readFile(resolve(root,'scripts/copy-wave1-vendors.mjs'),'utf8');
 assert.doesNotMatch(vendors,/https:\/\/cdn|https:\/\/unpkg/i);
 const headers=await readFile(resolve(dist,'_headers'),'utf8');
 assert.match(headers,/script-src 'self' 'wasm-unsafe-eval'/);
 const preview=headers.includes('X-Robots-Tag: noindex, nofollow');
 const qa=await stat(resolve(dist,'wave1-qa.mjs')).then(x=>x.isFile()).catch(()=>false);
 assert.equal(qa,preview,'No browser QA assets may ship in production.');
});
