// Permanent visual PDF redaction using browser-local rasterization.
// Every output page is newly drawn from pixels; original PDF objects are never copied.
import {PDFDocument} from './vendor/pdf-lib.mjs';
const MB=1048576;
export function validateRedactionAreas(areas,pageCount){
 if(!Number.isInteger(pageCount)||pageCount<1||pageCount>12)throw Error('This tool supports PDF documents of 1–12 pages.');
 if(!Array.isArray(areas)||areas.length<1||areas.length>50)throw Error('Draw 1–50 redaction boxes before exporting.');
 return areas.map(area=>{
  if(!area||!Number.isInteger(area.page)||area.page<1||area.page>pageCount)throw Error('A redaction has an invalid page.');
  const x=Number(area.x),y=Number(area.y),w=Number(area.w),h=Number(area.h);
  if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<.008||h<.008||x+w>1.001||y+h>1.001)
   throw Error('A redaction area is outside the page or too small.');
  return {page:area.page,x:Math.min(1,x),y:Math.min(1,y),w:Math.min(1-x,w),h:Math.min(1-y,h)};
 });
}
function validateFile(file){
 if(!(file instanceof Blob)||file.size<=0||file.size>12*MB)throw Error('Choose one PDF file up to 12 MB.');
}
async function openPdf(file){
 validateFile(file);
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder('latin1').decode(bytes.slice(0,8)).startsWith('%PDF-'))throw Error('This is not a valid PDF file.');
 const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
 let task;
 try{
  task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,disableAutoFetch:true});
  const doc=await task.promise;
  if(doc.numPages<1||doc.numPages>12)throw Error('This tool supports PDF documents of 1–12 pages.');
  return {doc,task};
 }catch(error){await task?.destroy().catch(()=>{});if(/1–12 pages/.test(error?.message||''))throw error;throw Error('Unable to open this PDF. Password-protected or damaged documents are not supported.');}
}
function canvas(w,h){
 if(typeof document==='undefined')throw Error('PDF redaction requires a graphical browser.');
 if(w*h>5_000_000||w<1||h<1||w>2500||h>2500)throw Error('The page is too large for safe local processing.');
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d');if(!ctx)throw Error('Your browser cannot render this PDF.');
 return {c,ctx};
}
async function drawPage(page,target=1500){
 const vp1=page.getViewport({scale:1});
 const scale=Math.min(2,Math.max(.12,target/Math.max(vp1.width,vp1.height)));
 const vp=page.getViewport({scale});
 const {c,ctx}=canvas(Math.ceil(vp.width),Math.ceil(vp.height));
 await page.render({canvasContext:ctx,viewport:vp,canvas:c,background:'#ffffff'}).promise;
 return {c,ctx,original:vp1};
}
const toBlob=(canvas,mime,quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed.')),mime,quality));
export async function previewRedactionPage(file,pageNumber=1){
 const {doc,task}=await openPdf(file);
 try{
  if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>doc.numPages)throw Error('Choose a valid page number.');
  const page=await doc.getPage(pageNumber);
  const {c}=await drawPage(page,1000);
  const blob=await toBlob(c,'image/png');
  c.width=c.height=0;page.cleanup();
  return {blob,pageCount:doc.numPages,page:pageNumber};
 }finally{await task.destroy();}
}
export async function redactPdf(file,rawAreas){
 const {doc,task}=await openPdf(file);
 try{
  const areas=validateRedactionAreas(rawAreas,doc.numPages);
  const target=await PDFDocument.create();
  for(let n=1;n<=doc.numPages;n++){
   const src=await doc.getPage(n),{c,ctx,original}=await drawPage(src,1500);
   const rects=areas.filter(a=>a.page===n);
   if(rects.length){
    ctx.save();ctx.fillStyle='#000';
    for(const a of rects){
     // Small extra inward/outward padding accounts for selection and JPEG edge sampling.
     const pad=5,xx=Math.max(0,Math.floor(a.x*c.width)-pad),yy=Math.max(0,Math.floor(a.y*c.height)-pad);
     const right=Math.min(c.width,Math.ceil((a.x+a.w)*c.width)+pad);
     const bottom=Math.min(c.height,Math.ceil((a.y+a.h)*c.height)+pad);
     ctx.fillRect(xx,yy,right-xx,bottom-yy);
    }
    ctx.restore();
   }
   const jpg=await toBlob(c,'image/jpeg',.92),img=await target.embedJpg(await jpg.arrayBuffer());
   const page=target.addPage([original.width,original.height]);
   page.drawImage(img,{x:0,y:0,width:original.width,height:original.height});
   c.width=c.height=0;src.cleanup();
  }
  const result=new Blob([await target.save({useObjectStreams:true})],{type:'application/pdf'});
  if(result.size>50*MB)throw Error('The redacted PDF exceeds 50 MB. Try a smaller document.');
  return {blob:result,filename:'yorphives-redacted.pdf',summary:'Redacted '+areas.length+' marked area(s). All pages have been flattened to images; text, links, forms and signatures are not preserved.'};
 }finally{await task.destroy();}
}
