// Runs in the staging browser only; no external APIs, upload or user data.
// Use /#tools? no: pass ?wave1=pdf-edit|pdf-render|images|creative|ocr in URL.
import {processWave1} from './tools/wave1-core.mjs';
import {PDFDocument,StandardFonts} from './tools/vendor/pdf-lib.mjs';
const output=document.createElement('pre');output.id='yorphives-wave1-qa';output.dataset.status='running';
output.style.cssText='max-width:90vw;white-space:pre-wrap;overflow-wrap:anywhere';
output.textContent='Wave 1 browser check running';document.body.append(output);
const tests=[],group=new URL(location.href).searchParams.get('wave1')||'pdf-edit';
async function check(name,fn){
 try{const detail=await fn();tests.push({name,passed:true,detail:detail||'ok'});}
 catch(e){tests.push({name,passed:false,error:String(e?.message||e)});}
 output.textContent=JSON.stringify({group,tests},null,2);
}
const assert=(v,s)=>{if(!v)throw Error(s);};
async function pdfFile(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 for(let i=0;i<3;i++){const page=doc.addPage([150+i*80,200]);page.drawText('HELLO TEST PAGE '+(i+1),{x:25,y:90,size:18,font});}
 return new File([await doc.save()],'test.pdf',{type:'application/pdf'});
}
const pdfRead=async r=>PDFDocument.load(await r.blob.arrayBuffer());
async function imageFile(text=''){
 const c=document.createElement('canvas');c.width=text?850:250;c.height=text?240:170;
 const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#071b22';if(text){ctx.font='bold 75px sans-serif';ctx.fillText(text,35,132);}
 else{ctx.fillStyle='#338866';ctx.fillRect(35,30,160,110);}
 const b=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
 return new File([b],'image.png',{type:'image/png'});
}
if(group==='pdf-edit'){
 const file=await pdfFile();
 await check('page numbers PDF',async()=>{const r=await processWave1('pdf-page-numbers',[file],{placement:'bottom-center',size:11});const doc=await pdfRead(r);assert(doc.getPageCount()===3,'Wrong page count');return r.blob.size;});
 await check('PDF watermark',async()=>{const r=await processWave1('pdf-watermark',[file],{watermark:'TEST',opacity:25,size:28});assert((await pdfRead(r)).getPageCount()===3,'Watermark output invalid');});
 await check('visual PDF signature',async()=>{const r=await processWave1('pdf-visual-signature',[file],{signature:'A. Tester',page:2,bottom:42,size:25});assert((await pdfRead(r)).getPageCount()===3,'Signature output invalid');assert(/not a cryptographic/i.test(r.summary),'Warning missing');});
 await check('PDF page reorder',async()=>{const r=await processWave1('pdf-rearrange-pages',[file],{order:'3,1,2'});const d=await pdfRead(r);assert(d.getPages().map(x=>x.getWidth()).join(',')==='310,150,230','Wrong order');});
 await check('invoice PDF with totals',async()=>{const r=await processWave1('invoice-generator',[],{business:'YorpHives',client:'Client',number:'A-01',currency:'USD',tax:10,items:'Design | 2 | 100\nConsulting | 1 | 50'});assert((await pdfRead(r)).getPageCount()===1,'Invoice corrupt');assert(r.summary.includes('275.00'),'Invoice total incorrect');});
}
if(group==='pdf-render'){
 const file=await pdfFile();
 await check('PDF to text (real PDF.js)',async()=>{const r=await processWave1('pdf-to-text',[file]);assert(/HELLO\s+TEST\s+PAGE\s+1/.test(r.text.replace(/\s+/g,' ')),'Text extraction missing: '+r.text.slice(0,220));return r.text.slice(0,80);});
 await check('PDF to images (real PDF.js)',async()=>{const r=await processWave1('pdf-to-images',[file],{format:'png',scale:1.2});assert(r.blob.size>300,'Image zip empty');assert(r.filename.endsWith('.zip'),'Expected ZIP for three pages');const {inspectZip}=await import('./tools/safe-zip.mjs');const z=inspectZip(await r.blob.arrayBuffer());assert(z.entries.size===3,'Wrong image count');return [...z.entries.keys()].join(',');});
 await check('PDF raster compression',async()=>{const r=await processWave1('pdf-compressor',[file],{quality:60,scale:.7});const d=await pdfRead(r);assert(d.getPageCount()===3,'Compressed PDF invalid');return r.summary;});
}
if(group==='images'){
 const file=await imageFile();
 await check('image to target size',async()=>{const r=await processWave1('image-size-target',[file],{kb:100,format:'jpeg'});assert(r.blob.size<=102400,'Target not met');return r.blob.size;});
 await check('image metadata cleaner',async()=>{const r=await processWave1('image-metadata-cleaner',[file],{format:'png'});assert(r.blob.type==='image/png'&&r.blob.size>100,'PNG metadata cleaner invalid');});
 await check('passport photo dimensions',async()=>{const r=await processWave1('passport-photo-maker',[file],{size:'35x45',top:50});const bitmap=await createImageBitmap(r.blob);assert(bitmap.width===413&&bitmap.height===531,'Photo dimensions invalid');bitmap.close();});
 await check('sanitized SVG to PNG',async()=>{const f=new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40"><rect width="64" height="40" fill="green"/></svg>'],'test.svg',{type:'image/svg+xml'});const r=await processWave1('svg-to-png',[f],{width:128,height:80});const image=await createImageBitmap(r.blob);assert(image.width===128&&image.height===80,'SVG conversion invalid');image.close();});
 await check('reject script-bearing SVG',async()=>{let rejected=false;try{const f=new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],'bad.svg',{type:'image/svg+xml'});await processWave1('svg-to-png',[f],{width:64,height:64});}catch{rejected=true}assert(rejected,'Unsafe SVG accepted');});
}
if(group==='creative'){
 await check('barcode generation',async()=>{const r=await processWave1('barcode-generator',[],{text:'ABC123',format:'CODE128'});assert(r.blob.type==='image/svg+xml','Wrong SVG mime');const s=await r.blob.text();assert(s.includes('<svg')&&s.includes('rect'),'Invalid barcode markup');});
 await check('QR scanner, decode offline',async()=>{
  const makeQR=(await import('./tools/vendor/qrcode-generator.mjs')).default;
  const qr=makeQR(0,'M');qr.addData('https://yorphives.com/hello');qr.make();
  const n=qr.getModuleCount(),c=document.createElement('canvas'),scale=10,margin=4;
  c.width=c.height=(n+margin*2)*scale;
  const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))ctx.fillRect((x+margin)*scale,(y+margin)*scale,scale,scale);
  const b=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  const r=await processWave1('qr-code-scanner',[new File([b],'qr.png',{type:'image/png'})],{});
  assert(r.text==='https://yorphives.com/hello','QR content mismatch '+r.text);
 });
}
if(group==='ocr'){
 await check('self-hosted English OCR (Tesseract)',async()=>{
  const file=await imageFile('HELLO WORLD');
  const r=await processWave1('image-ocr',[file],{});
  assert(/HELLO/i.test(r.text),'Text recognition failed: '+r.text.slice(0,120));
  return r.text.slice(0,90);
 });
}
const failed=tests.filter(t=>!t.passed);
output.dataset.status=failed.length?'failed':'passed';
output.textContent=JSON.stringify({group,passed:tests.length-failed.length,failed:failed.length,tests},null,2);
