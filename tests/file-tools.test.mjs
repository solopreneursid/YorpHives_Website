import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { PDFDocument } from '../tools/vendor/pdf-lib.mjs';
import JSZip from '../tools/vendor/jszip.mjs';
import { inspectZip, readZipEntry, readZipText } from '../tools/safe-zip.mjs';
import { pageSelection, processFileTool } from '../tools/file-core.mjs';
import { csvToXlsx, rowsToCsv, rowsToJson } from '../tools/office-files.mjs';

async function pdfFile(name,sizes){const doc=await PDFDocument.create();for(const size of sizes)doc.addPage(size);return new File([await doc.save()],name,{type:'application/pdf'});}
async function outPdf(result){return PDFDocument.load(await result.blob.arrayBuffer());}

test('page selections support ranges and reject invalid or oversized input',()=>{
  assert.deepEqual(pageSelection('3,1-2',3),[2,0,1]);assert.deepEqual(pageSelection('',2,{emptyAll:true}),[0,1]);
  assert.throws(()=>pageSelection('0,1',2));assert.throws(()=>pageSelection('2-1',2));assert.throws(()=>pageSelection('1-4',3));assert.throws(()=>pageSelection('',3));
});
test('PDF merge preserves file and page order',async()=>{
  const a=await pdfFile('a.pdf',[[100,200],[200,300]]),b=await pdfFile('b.pdf',[[300,400]]);
  const doc=await outPdf(await processFileTool('pdf-merge',[a,b]));assert.equal(doc.getPageCount(),3);assert.deepEqual(doc.getPages().map(p=>p.getSize().width),[100,200,300]);
});
test('PDF extraction, deletion and rotation modify only selected pages',async()=>{
  const file=await pdfFile('pages.pdf',[[100,200],[200,300],[300,400]]);
  const extracted=await outPdf(await processFileTool('pdf-extract-pages',[file],{pages:'3,1'}));assert.deepEqual(extracted.getPages().map(p=>p.getSize().width),[300,100]);
  const removed=await outPdf(await processFileTool('pdf-remove-pages',[file],{pages:'2'}));assert.deepEqual(removed.getPages().map(p=>p.getSize().width),[100,300]);
  const rotated=await outPdf(await processFileTool('pdf-rotate-pages',[file],{pages:'2',angle:'90'}));assert.deepEqual(rotated.getPages().map(p=>p.getRotation().angle),[0,90,0]);
  await assert.rejects(()=>processFileTool('pdf-remove-pages',[file],{pages:'1-3'}),/at least one/i);
});
test('PDF page counter reports dimensions and invalid files fail safely',async()=>{
  const file=await pdfFile('pages.pdf',[[100,200],[200,300]]);const r=await processFileTool('pdf-page-counter',[file]);assert.match(r.text,/Pages: 2/);assert.match(r.text,/100 × 200 pt/);
  await assert.rejects(()=>processFileTool('pdf-page-counter',[new File(['bad'],'bad.pdf')]),/valid PDF/);
});
test('CSV to XLSX creates an interoperable ZIP with literal text cells',async()=>{
  const x=await csvToXlsx('Name,Code\nAva,001\nKai,=1+1');const zip=inspectZip(x);const xml=await readZipText(zip,'xl/worksheets/sheet1.xml');assert.match(xml,/001/);assert.match(xml,/<t xml:space="preserve">=1\+1<\/t>/);assert.ok(!xml.includes('<f>'));
});
test('ZIP reader enforces traversal, decompression-size and checksum limits',async()=>{
  const bad=new JSZip();bad.file('../outside.txt','x');await assert.rejects(async()=>inspectZip(await bad.generateAsync({type:'uint8array'})));
  const zip=new JSZip();zip.file('sheet.xml','hello');const bytes=await zip.generateAsync({type:'uint8array',compression:'STORE'});const archive=inspectZip(bytes),entry=archive.entries.get('sheet.xml');assert.equal(new TextDecoder().decode(await readZipEntry(archive,'sheet.xml')),'hello');
  const damaged=bytes.slice(),view=new DataView(damaged.buffer),at=entry.local,start=at+30+view.getUint16(at+26,true)+view.getUint16(at+28,true);damaged[start]^=1;await assert.rejects(()=>readZipEntry(inspectZip(damaged),'sheet.xml'),/damaged/i);
});
test('spreadsheet exports preserve values and protect against CSV formula injection',()=>{
  const rows=[['name','value'],['risky','=1+1'],['negative',-5]];assert.match(rowsToCsv(rows,true),/'=1\+1/);assert.match(rowsToCsv(rows,true),/negative,-5/);assert.match(rowsToCsv(rows,false),/risky,=1\+1/);
  assert.deepEqual(JSON.parse(rowsToJson([['name','value'],['A',3]])),[{name:'A',value:3}]);assert.throws(()=>rowsToJson([['x','x'],[1,2]]));
  const parsed=JSON.parse(rowsToJson([['__proto__'],['safe']]));assert.equal({}.safe,undefined);assert.equal(Object.hasOwn(parsed[0],'__proto__'),true);
});
test('file checksum handles both empty and non-empty files locally',async()=>{
  const r=await processFileTool('file-sha256',[new File(['abc'],'abc.txt')]);assert.equal(r.text,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const empty=await processFileTool('file-sha256',[new File([],'empty.txt')]);assert.equal(empty.text,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  await assert.rejects(()=>processFileTool('file-sha256',[]));
});
