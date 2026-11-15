import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile,stat}from'node:fs/promises';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
import{PDFDocument}from'../tools/vendor/pdf-lib.mjs';
import{convertSubtitles,socialMeta,processWave4,WAVE4_IDS}from'../tools/wave4-core.mjs';
import{validateMasks,maskImage}from'../tools/image-mask-core.mjs';
import{comparePdfs}from'../tools/pdf-compare-core.mjs';
import{chooseRecorderFormat}from'../tools/screen-record-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const names=['subtitle-converter','social-preview-builder','quotation-generator','certificate-generator','favicon-generator','image-privacy-redactor','pdf-compare','screen-recorder'];
test('eight new browser tools have independent pages and catalog registrations',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const tools=catalog.items.filter(x=>x.type==='tool');
 assert.equal(tools.length,134);assert.equal(new Set(tools.map(x=>x.url)).size,134);
 for(const id of names){
  const url='tools/'+id+'/',item=tools.find(x=>x.url===url);
  assert.ok(item,'missing '+id);assert.equal(item.execution,'browser-local');
  const html=await readFile(resolve(root,url,'index.html'),'utf8');
  assert.match(html,/<h1>/);assert.match(html,/wave4\.css/);assert.match(html,/role="status"/);
  assert.doesNotMatch(html,/<script[^>]*src="https?:/);
  await stat(resolve(root,item.module.url));
 }
 assert.deepEqual(new Set(WAVE4_IDS),new Set(names.slice(0,5)));
});
test('subtitle conversion supports SRT and VTT while maintaining time and cue text',()=>{
 const srt='1\n00:00:01,100 --> 00:00:03,500\nHello world!\n\n2\n00:00:04,000 --> 00:00:06,200\nSecond line.';
 const vtt=convertSubtitles(srt,'vtt');
 assert.equal(vtt.cues,2);assert.match(vtt.text,/WEBVTT\n\n/);
 assert.match(vtt.text,/00:00:01\.100 --> 00:00:03\.500/);
 const again=convertSubtitles(vtt.text,'srt');
 assert.equal(again.cues,2);assert.match(again.text,/00:00:04,000 --> 00:00:06,200/);
 assert.match(again.text,/Second line/);
 assert.throws(()=>convertSubtitles('no captions','vtt'),/No valid/);
 assert.throws(()=>convertSubtitles('1\n00:00:07,000 --> 00:00:02,000\nBad','vtt'),/before/);
});
test('social preview escapes HTML and rejects unsafe URL schemes',()=>{
 const meta=socialMeta({title:'Hello <script>alert(1)</script>',description:'A "quote" & info',url:'https://example.com/page?q=1&ref=two',image:'https://example.com/cover.png',site:'Example'});
 assert.ok(!meta.html.includes('<script>'));assert.match(meta.html,/&lt;script&gt;/);
 assert.match(meta.html,/&amp;ref=two/);assert.match(meta.html,/twitter:card/);
 assert.throws(()=>socialMeta({title:'a',description:'b',url:'javascript:alert(1)'}),/http/);
 assert.throws(()=>socialMeta({title:'a',description:'b',url:'https://person:secret@example.com'}),/http/);
});
test('quotation and certificate produce valid PDF documents',async()=>{
 const q=await processWave4('quotation-generator',[],{business:'YorpHives',client:'Customer',items:'Design | 2 | 100\nSupport | 1 | 35',currency:'INR',tax:'18',reference:'Q-123'});
 assert.equal(q.blob.type,'application/pdf');assert.equal(q.filename,'yorphives-quotation.pdf');
 assert.equal((await PDFDocument.load(await q.blob.arrayBuffer())).getPageCount(),1);
 const cert=await processWave4('certificate-generator',[],{recipient:'Anita',title:'Excellent Work',organization:'YorpHives',date:'2026-11-15'});
 assert.equal(cert.filename,'yorphives-certificate.pdf');
 assert.equal((await PDFDocument.load(await cert.blob.arrayBuffer())).getPageCount(),1);
 await assert.rejects(()=>processWave4('quotation-generator',[],{business:'B',client:'C',items:'Invalid format'}),/use Description/);
});
test('image privacy masks have safe bounds and fail closed',async()=>{
 assert.deepEqual(validateMasks([{x:.1,y:.1,w:.2,h:.3}]),[{x:.1,y:.1,w:.2,h:.3}]);
 for(const mask of [{x:-.01,y:0,w:.2,h:.2},{x:.8,y:.8,w:.3,h:.3},{x:0,y:0,w:.001,h:.2}]){
  assert.throws(()=>validateMasks([mask]),/out of bounds/);
 }
 assert.throws(()=>validateMasks([]),/between 1 and 40/);
 await assert.rejects(()=>maskImage(null,[{x:0,y:0,w:.5,h:.5}]),/image up to 12 MB/);
});
test('PDF compare rejects invalid inputs before image rendering',async()=>{
 await assert.rejects(()=>comparePdfs([]),/exactly two/);
 await assert.rejects(()=>comparePdfs([new File(['bad'],'a.pdf'),new File(['bad'],'b.pdf')]),/browser/);
});
test('screen recorder format selection is scoped to supported browser formats',()=>{
 const supported=new Set(['video/webm;codecs=vp8,opus','video/webm']);
 assert.equal(chooseRecorderFormat(type=>supported.has(type)),'video/webm;codecs=vp8,opus');
 assert.equal(chooseRecorderFormat(()=>false),null);
});
test('runtime tools do not request remote services and preview-only QA stays isolated',async()=>{
 const paths=['tools/wave4-core.mjs','tools/image-mask-core.mjs','tools/pdf-compare-core.mjs','tools/screen-record-core.mjs'];
 for(const path of paths){
  const code=await readFile(resolve(root,path),'utf8');
  assert.doesNotMatch(code,/fetch\(['"]https?:|XMLHttpRequest|https:\/\/cdn|https:\/\/unpkg|navigator\.sendBeacon/);
 }
 const headers=await readFile(resolve(root,'dist/_headers'),'utf8');
 const preview=headers.includes('X-Robots-Tag: noindex');
 const qa=await stat(resolve(root,'dist/wave4-browser-qa.mjs')).then(()=>true).catch(()=>false);
 assert.equal(qa,preview);
});
