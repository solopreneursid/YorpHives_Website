// Deterministic PDF output validation against the actual browser-local PDF engine.
// Synthetic documents only: no user files, uploads, analytics, or network access.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import {pageSelection,processFileTool} from '../tools/file-core.mjs';

function file(bytes,name='synthetic.pdf'){
 const binary=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 return {name,size:binary.length,type:'application/pdf',arrayBuffer:async()=>binary.slice().buffer};
}
async function sample(sizes=[[200,300],[320,420],[400,500]]){
 const doc=await PDFDocument.create();
 for(const size of sizes)doc.addPage(size);
 return file(await doc.save());
}
async function inspect(output){
 assert.ok(output.blob instanceof Blob,'Output must be downloadable as a Blob');
 assert.equal(output.blob.type,'application/pdf');
 assert.ok(output.filename.endsWith('.pdf'));
 const bytes=new Uint8Array(await output.blob.arrayBuffer());
 assert.ok(bytes.length>100,'PDF output must be nonempty');
 assert.equal(new TextDecoder('latin1').decode(bytes.slice(0,5)),'%PDF-');
 return PDFDocument.load(bytes,{ignoreEncryption:false,throwOnInvalidObject:true});
}
const dims=doc=>doc.getPages().map(page=>[Math.round(page.getWidth()),Math.round(page.getHeight())]);

test('page range parser enforces bounds and documented syntax',()=>{
 assert.deepEqual(pageSelection('1, 3-4',4),[0,2,3]);
 assert.deepEqual(pageSelection('',2,{emptyAll:true}),[0,1]);
 for(const s of ['', '0','5','2-1','1,,2','1;2','1-99','1-2-3'])
  assert.throws(()=>pageSelection(s,4));
});

test('PDF merge retains order and dimensions across input files',async()=>{
 const a=await sample([[200,300],[320,420]]),b=await sample([[400,500]]);
 const merged=await inspect(await processFileTool('pdf-merge',[a,b]));
 assert.equal(merged.getPageCount(),3);
 assert.deepEqual(dims(merged),[[200,300],[320,420],[400,500]]);
});

test('PDF page counter reports exact page sizes',async()=>{
 const out=await processFileTool('pdf-page-counter',[await sample()]);
 assert.match(out.text,/Pages: 3/);
 assert.match(out.text,/Page 1: 200 × 300 pt/);
 assert.match(out.text,/Page 3: 400 × 500 pt/);
});

test('PDF extract pages retains selected order and valid outputs',async()=>{
 const extracted=await inspect(await processFileTool('pdf-extract-pages',[await sample()],{pages:'3,1'}));
 assert.deepEqual(dims(extracted),[[400,500],[200,300]]);
});

test('PDF remove pages preserves remaining page order',async()=>{
 const output=await inspect(await processFileTool('pdf-remove-pages',[await sample()],{pages:'2'}));
 assert.deepEqual(dims(output),[[200,300],[400,500]]);
});

test('PDF rotate pages changes only selected page',async()=>{
 const doc=await inspect(await processFileTool('pdf-rotate-pages',[await sample()],{pages:'2',angle:'90'}));
 assert.deepEqual(doc.getPages().map(p=>p.getRotation().angle),[0,90,0]);
});

test('PDF tools reject damaged files without generating misleading output',async()=>{
 const damaged=file(new TextEncoder().encode('%PDF-1.7\nnot a PDF\n'));
 await assert.rejects(processFileTool('pdf-merge',[damaged]),/Could not open this PDF|valid PDF/);
 await assert.rejects(processFileTool('pdf-extract-pages',[damaged],{pages:'1'}),/Could not open this PDF|valid PDF/);
});

test('PDF removal refuses to produce an empty document',async()=>{
 await assert.rejects(processFileTool('pdf-remove-pages',[await sample([[200,300]])],{pages:'1'}),/Keep at least one page/);
});

test('PDF rotation rejects unsupported angles',async()=>{
 await assert.rejects(processFileTool('pdf-rotate-pages',[await sample([[200,300]])],{angle:'45'}),/Enter a valid rotation|90, 180, or 270/);
});
