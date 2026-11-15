import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import JSZip from '../tools/vendor/jszip.mjs';
import {WAVE2_IDS,inspectPdfFields,processWave2,parseCsv,cleanCsv} from '../tools/wave2-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('new tools are independently registered and have local entry pages',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 assert.equal(catalog.items.filter(x=>x.type==='tool').length,143);
 assert.equal(new Set(WAVE2_IDS).size,6);
 const directory=await readFile(resolve(root,'tools/index.html'),'utf8');
 for(const id of WAVE2_IDS){
  const item=catalog.items.find(x=>x.url==='tools/'+id+'/');
  assert.ok(item,id);assert.equal(item.execution,'browser-local');
  assert.equal(item.module.url,'tools/wave2-core.mjs');
  const html=await readFile(resolve(root,'tools',id,'index.html'),'utf8');
  assert.match(html,/<h1>/);assert.match(html,/wave2-page\.mjs/);
  assert.match(html,/id="wave2-form"/);assert.doesNotMatch(html,/src="https?:/);
  assert.ok(directory.includes('../tools/'+id+'/'));
 }
});
test('CSV cleaner preserves quoted newlines while cleaning duplicate rows',async()=>{
 const raw='name,notes\r\n"Ada, A","One\nTwo"\r\n"Ada, A","One\nTwo"\r\nZoe, hi\r\n';
 const parsed=parseCsv(raw);
 assert.deepEqual(parsed[1],['Ada, A','One\nTwo']);
 const data=cleanCsv(raw,{});
 assert.equal(data.rows,2);assert.equal(data.removed,1);
 assert.deepEqual(parseCsv(data.text)[1],['Ada, A','One\nTwo']);
 const result=await processWave2('csv-cleaner',[new File([raw],'sample.csv')],{});
 assert.equal(result.filename,'yorphives-cleaned.csv');
 assert.equal(parseCsv(await result.blob.text()).length,3);
 await assert.rejects(()=>processWave2('csv-cleaner',[new File(['a,b\nx'],'bad.csv')]),/different column/);
});
test('ZIP extractor yields real independent file downloads and protects paths',async()=>{
 const zip=new JSZip();zip.file('notes.txt','Hello');zip.file('photo.png',new Uint8Array([137,80,78,71]));
 const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 const result=await processWave2('zip-extractor',[new File([bytes],'archive.zip')]);
 assert.equal(result.downloads.length,2);
 assert.equal(await result.downloads.find(x=>x.filename==='notes.txt').blob.text(),'Hello');
 const unsafe=new JSZip();unsafe.file('../outside.txt','No');
 const bad=await unsafe.generateAsync({type:'uint8array',compression:'STORE'});
 await assert.rejects(()=>processWave2('zip-extractor',[new File([bad],'bad.zip')]),/unsafe file path/);
});
test('fill and flatten PDF forms using the existing self-hosted library',async()=>{
 const document=await PDFDocument.create();const page=document.addPage([600,600]);const form=document.getForm();
 const field=form.createTextField('applicant');field.addToPage(page,{x:40,y:400,width:260,height:24});
 const check=form.createCheckBox('consent');check.addToPage(page,{x:40,y:340,width:20,height:20});
 const input=new File([await document.save()],'form.pdf',{type:'application/pdf'});
 const inspected=await inspectPdfFields(input);
 assert.ok(inspected.some(x=>x.name==='applicant'&&x.type==='text'));
 assert.ok(inspected.some(x=>x.name==='consent'&&x.type==='checkbox'));
 const filled=await processWave2('pdf-form-filler',[input],{values:{applicant:'Ada Lovelace',consent:true}});
 const filledPdf=await PDFDocument.load(await filled.blob.arrayBuffer());
 assert.equal(filledPdf.getForm().getTextField('applicant').getText(),'Ada Lovelace');
 assert.equal(filledPdf.getForm().getCheckBox('consent').isChecked(),true);
 const flat=await processWave2('pdf-flatten',[new File([await filled.blob.arrayBuffer()],'filled.pdf')]);
 const flatPdf=await PDFDocument.load(await flat.blob.arrayBuffer());
 assert.equal(flatPdf.getForm().getFields().length,0);
 await assert.rejects(()=>processWave2('pdf-flatten',[new File(['nonsense'],'bad.pdf')]),/actual PDF/);
});
test('resume export produces a genuine multi-section PDF with input limits',async()=>{
 const result=await processWave2('resume-builder',[],{
  fullName:'Ada Lovelace',email:'ada@example.org',headline:'Engineer',
  experience:'Engineered a computation system and maintained documentation.',
  summary:'Thoughtful problem solver.',skills:'Analysis, writing, architecture',
  education:'University',projects:'Open-source experiments'
 });
 assert.equal(result.filename,'yorphives-resume.pdf');
 assert.equal(result.blob.type,'application/pdf');
 const document=await PDFDocument.load(await result.blob.arrayBuffer());
 assert.ok(document.getPageCount()>=1);
 await assert.rejects(()=>processWave2('resume-builder',[],{fullName:'Ada',email:'broken',experience:'Engineer'}),/valid email/);
});
