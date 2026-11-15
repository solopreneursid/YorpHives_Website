// Preview-only smoke tests for actual Chromium browser APIs.
// This file is copied to preview builds only and is never installed in production.
// Run by a reviewer with a first-party module script injection on the staging URL.
const result=document.createElement('pre');
result.id='yorphives-browser-smoke';
result.dataset.status='running';
result.textContent='Running browser-local smoke checks...';
result.setAttribute('aria-live','polite');
document.body.append(result);
const outcomes=[];
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const run=async (label,fn)=>{
 try{await fn();outcomes.push({name:label,ok:true});}
 catch(e){outcomes.push({name:label,ok:false,error:String(e?.message||e)});}
};
try{
 const [{processFileTool},{inspectZip},{PDFDocument}]=await Promise.all([
   import('./tools/file-core.mjs'),import('./tools/safe-zip.mjs'),
   import('./tools/vendor/pdf-lib.mjs')
 ]);
 const file=(s,name,type='text/plain')=>new File([s],name,{type});
 await run('ZIP creation with duplicate filename protection',async()=>{
   const a=file('A','same.txt'),b=file('B','same.txt');
   const r=await processFileTool('zip-file-creator',[a,b]);
   const archive=inspectZip(await r.blob.arrayBuffer());
   assert(archive.entries.size===2,'Expected two ZIP entries');
   assert(archive.entries.has('same.txt')&&archive.entries.has('same-2.txt'),'Names were not disambiguated');
 });
 await run('duplicate content detection via Web Crypto',async()=>{
   const files=[file('same','a.txt'),file('other','b.txt'),file('same','c.txt')];
   const r=await processFileTool('duplicate-file-finder',files);
   assert(r.text.includes('Identical content groups: 1'),'Expected one duplicate group');
   assert(r.text.includes('a.txt')&&r.text.includes('c.txt'),'Missing duplicate file names');
 });
 await run('batch UTF-8 find and replace',async()=>{
   const r=await processFileTool('batch-find-replace',[file('red and red','text.txt')],{find:'red',replacement:'green'});
   const {default:JSZip}=await import('./tools/vendor/jszip.mjs');
   const archive=await JSZip.loadAsync(await r.blob.arrayBuffer());
   assert((await archive.file('text.txt').async('string'))==='green and green','Wrong replacement output');
 });
 await run('CSV to XLSX to JSON roundtrip',async()=>{
   const xlsx=await processFileTool('csv-file-to-xlsx',[file('name,count\nA,2\nB,3','input.csv','text/csv')]);
   assert(xlsx.blob.size>100,'Unexpectedly small workbook');
   const data=await processFileTool('xlsx-file-to-json',[new File([xlsx.blob],'result.xlsx')],{sheet:'1'});
   const rows=JSON.parse(data.text);
   assert(Array.isArray(rows)&&rows.length===2,'Wrong spreadsheet rows');
   assert(rows[0].name==='A'&&String(rows[0].count)==='2','Wrong first row');
 });
 await run('PDF merger in browser',async()=>{
   const doc=await PDFDocument.create();doc.addPage([200,150]);
   const bytes=await doc.save();
   const pdf=await processFileTool('pdf-merge',[new File([bytes],'first.pdf'),new File([bytes],'second.pdf')]);
   const read=await PDFDocument.load(await pdf.blob.arrayBuffer());
   assert(read.getPageCount()===2,'PDF should contain two pages');
 });
 await run('PDF page extraction in browser',async()=>{
   const doc=await PDFDocument.create();doc.addPage([100,100]);doc.addPage([200,200]);
   const pdf=new File([await doc.save()],'two-pages.pdf');
   const extracted=await processFileTool('pdf-extract-pages',[pdf],{pages:'2'});
   const read=await PDFDocument.load(await extracted.blob.arrayBuffer());
   assert(read.getPageCount()===1&&Math.round(read.getPage(0).getWidth())===200,'Wrong page extracted');
 });
 const canvas=document.createElement('canvas');canvas.width=60;canvas.height=40;
 const context=canvas.getContext('2d');assert(context,'Canvas is unavailable');
 context.fillStyle='#72cbbb';context.fillRect(0,0,60,40);
 const imageBlob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Canvas PNG failed')),'image/png'));
 const imageFile=new File([imageBlob],'synthetic.png',{type:'image/png'});
 await run('image cropper through Canvas APIs',async()=>{
   const r=await processFileTool('image-cropper',[imageFile],{x:'0',y:'0',width:'20',height:'10'});
   const bitmap=await createImageBitmap(r.blob);
   try{assert(bitmap.width===20&&bitmap.height===10,'Unexpected crop dimensions');}
   finally{bitmap.close();}
 });
 await run('images to PDF using real browser image decoding',async()=>{
   const r=await processFileTool('images-to-pdf',[imageFile]);
   const doc=await PDFDocument.load(await r.blob.arrayBuffer());
   assert(doc.getPageCount()===1,'Images to PDF produced wrong page count');
 });
 await run('images to PowerPoint with bundled library',async()=>{
   const r=await processFileTool('images-to-powerpoint',[imageFile]);
   const archive=inspectZip(await r.blob.arrayBuffer());
   assert([...archive.entries.keys()].some(n=>n==='ppt/slides/slide1.xml'),'Missing PowerPoint slide');
 });
} catch(error){outcomes.push({name:'smoke harness setup',ok:false,error:String(error?.message||error)});}
const failures=outcomes.filter(x=>!x.ok);
result.dataset.status=failures.length?'failed':'passed';
result.textContent=JSON.stringify({tested:outcomes.length,passed:outcomes.length-failures.length,failed:failures.length,outcomes},null,2);
