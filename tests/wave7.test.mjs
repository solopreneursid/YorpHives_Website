import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import {assessPassword,createBusinessProposal} from '../tools/wave7-business-core.mjs';
import {mergeRows,imageSettings,inspectPdfMetadata,cleanPdfMetadata,convertImageBatch} from '../tools/wave7-file-core.mjs';
import {mergeAudioSamples,recorderMime} from '../tools/wave7-audio-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ids=['batch-image-converter','pdf-metadata-cleaner','spreadsheet-merger','audio-merger','voice-recorder','password-strength-analyzer','business-proposal-generator','image-publishing-pack'];
test('All eight Wave 7 public pages and secure engines are present',async()=>{
 const c=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const items=c.items.filter(x=>x.type==='tool');assert.equal(items.length,144);
 assert.equal(new Set(items.map(x=>x.url)).size,144);
 const dir=await readFile(resolve(root,'tools/index.html'),'utf8');
 for(const id of ids){
  const item=items.find(t=>t.url==='tools/'+id+'/');assert.ok(item,id);
  assert.equal(item.execution,'browser-local');
  const html=await readFile(resolve(root,item.url,'index.html'),'utf8');
  assert.match(html,/<h1>/);assert.match(html,/wave7\.css/);
  assert.match(html,/wave7-page\.mjs/);assert.match(html,/role="status"/);
  assert.doesNotMatch(html,/<script[^>]*src="https?:/);
  assert.match(dir,new RegExp('tools/'+id+'/'));
  const mod=await stat(resolve(root,item.module.url));assert.ok(mod.size>500);
 }
});
test('Pattern analyzer avoids false claims and recognizes obvious weak passwords',()=>{
 const empty=assessPassword(''),weak=assessPassword('password123'),strong=assessPassword('Dogs-dance-under-moons-on-Tuesday-274!');
 assert.equal(empty.score,0);assert.ok(weak.score<=1);
 assert.ok(strong.score>=3);assert.equal(strong.hasPatterns,false);
 assert.match(strong.warning,/heuristic/);
 assert.equal(assessPassword('a'.repeat(7)).score,0);
 assert.throws(()=>assessPassword('a'.repeat(260)),/256/);
});
test('Spreadsheet merger preserves headers, unions columns, deduplicates and tracks origin',()=>{
 const sources=[
  {name:'first.csv',rows:[['Name','Amount'],['A','1'],['B','=SUM(1,2)']]},
  {name:'second.xlsx',rows:[['Amount','Category','Name'],['1','Retail','A'],['2','Retail','C']]},
 ];
 const merged=mergeRows(sources,{dedupe:'on',source:'on'});
 assert.deepEqual(merged.rows[0],['Name','Amount','Category','Source file']);
 assert.equal(merged.count,4);assert.equal(merged.rows[1][0],'A');
 const duplicates=mergeRows([{name:'a',rows:[['id'],['x']]},{name:'b',rows:[['id'],['x']]}],{dedupe:'on'});
 assert.equal(duplicates.count,1);
 assert.throws(()=>mergeRows(sources,{columns:'strict'}),/Column headings differ/);
 assert.throws(()=>mergeRows([]),/2–8/);
});
test('Batch image conversion validates supported formats and limits',async()=>{
 assert.equal(imageSettings({format:'jpeg',quality:0.7,max:1200}).ext,'jpg');
 assert.throws(()=>imageSettings({format:'bmp'}),/Choose WebP/);
 assert.throws(()=>imageSettings({format:'png',quality:-1}),/supported/);
 await assert.rejects(()=>convertImageBatch([],{}),/1–10/);
});
test('Audio merger resamples and does not clip, recorder selects supported codecs',()=>{
 const clips=[
  {sampleRate:22050,channels:[Float32Array.from({length:330},(_,i)=>i%4?.4:-.4)]},
  {sampleRate:44100,channels:[Float32Array.from({length:660},(_,i)=>i%2?.8:-.8)]}
 ];
 const out=mergeAudioSamples(clips);
 assert.ok(out.channels[0].length>1200);assert.equal(out.clips,2);
 assert.ok(out.channels[0].every(x=>Math.abs(x)<=1));
 assert.equal(recorderMime(type=>type==='audio/mp4'),'audio/mp4');
 assert.equal(recorderMime(()=>false),null);
 assert.throws(()=>mergeAudioSamples([]),/2–6/);
});
test('Standard PDF Info fields can be inspected and cleared without uploading',async()=>{
 const doc=await PDFDocument.create();doc.addPage([400,400]);
 doc.setTitle('Confidential Testing');doc.setAuthor('Private User');doc.setSubject('Draft');
 const input=new File([await doc.save()],'sample.pdf',{type:'application/pdf'});
 const original=await inspectPdfMetadata(input);
 assert.match(original.text,/Confidential Testing/);
 const cleaned=await cleanPdfMetadata(input);
 assert.equal(cleaned.blob.type,'application/pdf');
 const pdf=await PDFDocument.load(await cleaned.blob.arrayBuffer(),{updateMetadata:false});
 assert.equal(pdf.getTitle(),'');assert.equal(pdf.getAuthor(),'');assert.equal(pdf.getPageCount(),1);
 assert.match(cleaned.summary,/Embedded XMP/);
});
test('Proposal creates a readable multi-section PDF without a remote API',async()=>{
 const r=await createBusinessProposal({company:'YorpHives',client:'Example Client',
  project:'Responsive site upgrade',overview:'Build an accessible web experience.',
  deliverables:'Design planning\nImplement and test\nDeploy after approval',
  timeline:'Four weeks after the approved brief.',currency:'INR',cost:'20000',contact:'Contact to discuss.'});
 assert.equal(r.blob.type,'application/pdf');
 assert.ok((await PDFDocument.load(await r.blob.arrayBuffer())).getPageCount()>=1);
 await assert.rejects(()=>createBusinessProposal({company:'A',client:'B',project:'C',overview:'D',deliverables:'E',timeline:'F',cost:'-2'}),/valid nonnegative/);
});
test('Wave 7 processing code has no third-party upload or remote resource dependencies',async()=>{
 for(const path of ['tools/wave7-file-core.mjs','tools/wave7-audio-core.mjs','tools/wave7-business-core.mjs','tools/wave7-page.mjs']){
  const content=await readFile(resolve(root,path),'utf8');
  assert.doesNotMatch(content,/https:\/\/cdn|https:\/\/unpkg|XMLHttpRequest|navigator\.sendBeacon|fetch\(['"]https/);
 }
 const headers=await readFile(resolve(root,'dist/_headers'),'utf8');
 const preview=headers.includes('X-Robots-Tag: noindex');
 const qa=await stat(resolve(root,'dist/wave7-browser-qa.mjs')).then(()=>true).catch(()=>false);
 assert.equal(qa,preview);
});
