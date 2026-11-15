// Local scanned PDF OCR: PDF.js page images -> Tesseract searchable PDF -> pdf-lib merge.
// Only first-party, pinned resources are loaded. No input or extracted text is transmitted.
import{PDFDocument}from'./vendor/pdf-lib.mjs';
const MB=1048576;
function validate(file){
 if(!(file instanceof Blob)||file.size<1||file.size>12*MB)throw Error('Choose a PDF of 12 MB or less.');
}
async function getDocument(file){
 validate(file);
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder('latin1').decode(bytes.slice(0,8)).startsWith('%PDF-'))throw Error('Choose a valid PDF file.');
 const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
 let task;
 try{
  task=pdfjs.getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false,disableAutoFetch:true});
  const pdf=await task.promise;
  if(pdf.numPages<1||pdf.numPages>5)throw Error('For local OCR, choose a PDF containing 1–5 pages.');
  return {pdf,task};
 }catch(error){
  await task?.destroy().catch(()=>{});
  if(/1–5 pages/.test(error?.message||''))throw error;
  throw Error('Cannot open this PDF. Encrypted, damaged and unsupported files cannot be processed.');
 }
}
async function createOcrWorker(){
 const module=await import('./vendor/ocr/tesseract.esm.min.js');
 const createWorker=module.createWorker||module.default?.createWorker;
 if(typeof createWorker!=='function')throw Error('The local OCR engine is unavailable.');
 return createWorker('eng',1,{
  workerPath:new URL('./vendor/ocr/worker.min.js',import.meta.url).href,
  corePath:new URL('./vendor/ocr/core/',import.meta.url).href,
  langPath:new URL('./vendor/ocr/lang',import.meta.url).href,
  workerBlobURL:false,gzip:true
 });
}
async function renderPage(page){
 const full=page.getViewport({scale:1}),scale=Math.min(2.4,Math.max(.15,1500/Math.max(full.width,full.height)));
 const viewport=page.getViewport({scale});
 const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 if(canvas.width*canvas.height>4_000_000)throw Error('This page is too large for local OCR.');
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas rendering is unavailable.');
 await page.render({canvasContext:ctx,viewport,canvas,background:'#ffffff'}).promise;
 return {canvas,full};
}
export async function makeSearchablePdf(file,{onProgress}={}){
 if(typeof document==='undefined')throw Error('PDF OCR needs a graphical browser.');
 const {pdf,task}=await getDocument(file),output=await PDFDocument.create();
 let worker,recognized=0;
 try{
  worker=await createOcrWorker();
  for(let index=1;index<=pdf.numPages;index++){
   if(typeof onProgress==='function')onProgress({page:index,total:pdf.numPages});
   const sourcePage=await pdf.getPage(index),{canvas,full}=await renderPage(sourcePage);
   try{
    const scanned=await worker.recognize(canvas,{pdfTitle:'Searchable PDF by YorpHives'},{text:true,pdf:true});
    if(scanned.data?.text?.trim())recognized++;
    const bytes=scanned.data?.pdf;
    if(!(bytes instanceof Uint8Array)||bytes.length<200||String.fromCharCode(...bytes.slice(0,4))!=='%PDF')
     throw Error('The OCR engine did not return a valid searchable PDF for page '+index+'.');
    const one=await PDFDocument.load(bytes,{ignoreEncryption:false});
    if(one.getPageCount()!==1)throw Error('OCR page count mismatch.');
    const pages=await output.copyPages(one,[0]),target=pages[0];
    const sx=full.width/target.getWidth(),sy=full.height/target.getHeight();
    if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<.01||sy<.01||sx>100||sy>100)throw Error('An OCR page has invalid dimensions.');
    target.scaleContent(sx,sy);target.setSize(full.width,full.height);
    output.addPage(target);
   }finally{canvas.width=canvas.height=0;sourcePage.cleanup();}
  }
  if(!recognized)throw Error('No readable English text was detected. Try a sharper, higher-contrast scan.');
  const bytes=await output.save({useObjectStreams:true});
  const blob=new Blob([bytes],{type:'application/pdf'});
  if(blob.size>35*MB)throw Error('The searchable PDF exceeds 35 MB. Try a smaller scan.');
  return {blob,filename:'yorphives-searchable.pdf',summary:'Created a searchable '+pdf.numPages+'-page PDF using local English OCR. Review recognized words for errors.'};
 }finally{await worker?.terminate().catch(()=>{});await task.destroy();}
}
