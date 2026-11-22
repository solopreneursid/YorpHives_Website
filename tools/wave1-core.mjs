// YorpHives Wave 1 — local processing, no upload endpoints or third-party runtime requests.
// Dependencies live under /tools/vendor; expensive engines load only on demand.
let pdfLibPromise;
const pdfLibrary=()=>pdfLibPromise??=import('./vendor/pdf-lib.mjs');
const MB=1048576;
export const PDF_COMPRESSION_PRESETS=Object.freeze({
 low:Object.freeze({quality:88,scale:1.3}),
 best:Object.freeze({quality:70,scale:1}),
 high:Object.freeze({quality:46,scale:0.7})
});

function requireFiles(files,min=1,max=1,limit=20*MB){
 if(!Array.isArray(files)||files.length<min||files.length>max)throw Error('Choose '+(min===max?String(min):min+' to '+max)+' file(s).');
 for(const f of files)if(!f||!Number.isFinite(f.size)||f.size<=0||f.size>limit)throw Error('Each file must be non-empty and at most '+Math.floor(limit/MB)+' MB.');
}
function num(data,name,min,max,fallback){const raw=String(data[name]??fallback??'').trim(),n=Number(raw);if(!raw||!Number.isFinite(n)||n<min||n>max)throw Error('Enter a valid '+name+'.');return n;}
function txt(data,key,max=200){const s=String(data[key]??'').trim();if(s.length>max)throw Error('The '+key+' field is too long.');return s;}
function result(blob,name,summary,extra={}){
 const type=name.endsWith('.pdf')?'application/pdf':name.endsWith('.zip')?'application/zip':name.endsWith('.txt')?'text/plain;charset=utf-8':'application/octet-stream';
 return {blob:blob instanceof Blob?blob:new Blob([blob],{type}),filename:name,summary,...extra};
 }
async function loadPdf(file){
 requireFiles([file]);const bytes=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder('latin1').decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error('Choose a valid PDF.');
 try{const {PDFDocument}=await pdfLibrary();const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});if(pdf.getPageCount()<1||pdf.getPageCount()>100)throw Error('Choose a PDF with 1–100 pages.');return pdf;}
 catch(e){if(/1–100/.test(e.message))throw e;throw Error('Could not read this PDF (encrypted or damaged files are unsupported).');}
}
function pageIdx(data,count){
 const value=txt(data,'page',6);const n=value?Number(value):count;
 if(!Number.isInteger(n)||n<1||n>count)throw Error('Choose a page from 1 to '+count+'.');return n-1;
}
function visibleText(s){
 const text=String(s);
 if(/[\x00-\x1f\x7f]/.test(text))throw Error('Remove control characters from the PDF text.');
 return text;
}
async function editPdf(id,files,data){
 const pdf=await loadPdf(files[0]),count=pdf.getPageCount();
 const {PDFDocument,StandardFonts,rgb,degrees}=await pdfLibrary();
 const font=await pdf.embedFont(id==='pdf-visual-signature'?StandardFonts.TimesRomanItalic:StandardFonts.Helvetica);
 if(id==='pdf-page-numbers'){
  const size=num(data,'size',7,32,12),placement=txt(data,'placement',24)||'bottom-center';
  if(!['bottom-left','bottom-center','bottom-right','top-right'].includes(placement))throw Error('Choose a position.');
  pdf.getPages().forEach((page,i)=>{
   const label=String(i+1)+' / '+count,w=font.widthOfTextAtSize(label,size),{width,height}=page.getSize();
   const x=placement.endsWith('left')?30:placement.endsWith('right')?width-w-30:(width-w)/2;
   const y=placement.startsWith('top')?height-size-25:23;
   page.drawText(label,{x:Math.max(8,x),y:Math.max(8,y),font,size,color:rgb(.22,.31,.27)});
  });
  return result(await pdf.save(),'yorphives-numbered.pdf','Added page numbers to '+count+' pages.');
 }
 if(id==='pdf-watermark'){
  const label=visibleText(txt(data,'watermark',90));if(!label)throw Error('Enter watermark text.');
  const opacity=num(data,'opacity',5,90,25)/100,size=num(data,'size',12,90,44);
  const {createPdfTextEngine}=await import('./pdf-text-engine.mjs');
  const text=await createPdfTextEngine(pdf,[{text:label,font}]);
  for(const page of pdf.getPages()){
   const {width,height}=page.getSize(),theta=-27*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
   const natural=text.width(label,size,font),scale=Math.min(1,(width-20)/(natural*c+size*Math.abs(s)),(height-20)/(natural*Math.abs(s)+size*c));
   const fitted=size*scale;if(!Number.isFinite(fitted)||fitted<4)throw Error('The watermark cannot fit on this PDF page.');
   const w=text.width(label,fitted,font),x=width/2-c*w/2+s*fitted/2,y=height/2-s*w/2-c*fitted/2;
   await text.draw(page,label,{x,y,size:fitted,font,color:rgb(.48,.54,.51),colorCss:'#7a8a82',opacity,rotate:degrees(-27),angle:-27});
  }
  return result(await pdf.save(),'yorphives-pdf-watermarked.pdf','Applied visible watermark to '+count+' pages.');
 }
 if(id==='pdf-visual-signature'){
  const label=visibleText(txt(data,'signature',70));if(!label)throw Error('Type the signature text.');
  const page=pdf.getPage(pageIdx(data,count)),{width,height}=page.getSize();
  const size=num(data,'size',13,45,26),offset=num(data,'bottom',15,200,42);
  const {createPdfTextEngine}=await import('./pdf-text-engine.mjs');
  const text=await createPdfTextEngine(pdf,[{text:label,font}]);
  const maxWidth=width-24,natural=text.width(label,size,font),fitted=size*Math.min(1,maxWidth/natural,(height-24)/size);
  if(!Number.isFinite(fitted)||fitted<4)throw Error('The signature cannot fit on this PDF page.');
  const w=text.width(label,fitted,font),x=Math.max(12,Math.min(width-w-12,40)),y=Math.max(12,Math.min(height-fitted-12,offset));
  await text.draw(page,label,{x,y,size:fitted,font,color:rgb(.06,.19,.31),colorCss:'#0f304f'});
  return result(await pdf.save(),'yorphives-visually-signed.pdf','Added a visual signature to page '+(pageIdx(data,count)+1)+'. This is not a cryptographic digital signature.');
 }
 if(id==='pdf-rearrange-pages'){
  const order=txt(data,'order',900).split(',').map(s=>Number(s.trim()));
  if(order.length!==count||order.some(n=>!Number.isInteger(n)||n<1||n>count)||new Set(order).size!==count)throw Error('Enter each page exactly once, separated by commas (e.g. 3,1,2).');
  const out=await PDFDocument.create();
  const pages=await out.copyPages(pdf,order.map(n=>n-1));pages.forEach(page=>out.addPage(page));
  return result(await out.save(),'yorphives-rearranged.pdf','Reordered '+count+' PDF pages.');
 }
 throw Error('Unsupported PDF operation.');
}
async function renderer(file){
 requireFiles([file],1,1,15*MB);
 const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
 const data=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder('latin1').decode(data.slice(0,1024)).includes('%PDF-'))throw Error('Choose a valid PDF.');
 let task;try{task=pdfjs.getDocument({data,useSystemFonts:true,isEvalSupported:false,disableAutoFetch:true});const pdf=await task.promise;if(pdf.numPages<1||pdf.numPages>35)throw Error('For local conversion, use a PDF with 1–35 pages.');return {pdf,task};}
 catch(e){try{await task?.destroy()}catch{}if(/1–35/.test(e.message))throw e;throw Error('This PDF cannot be rendered locally. Check that it is not encrypted or damaged.');}
}
function canvas(w,h){
 if(typeof document==='undefined')throw Error('This operation requires a browser with Canvas.');
 if(w<1||h<1||w*h>16000000||w>8192||h>8192)throw Error('The output would exceed the image size limit.');
 const canvas=document.createElement('canvas');canvas.width=Math.round(w);canvas.height=Math.round(h);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas is unavailable.');
 return {canvas,ctx};
}
function toBlob(c,type='image/png',quality){
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Browser could not encode the image.')),type,quality));
}
async function renderPage(page,scale){
 const viewport=page.getViewport({scale}),{canvas:c,ctx}=canvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 await page.render({canvasContext:ctx,viewport,canvas:c,background:'#ffffff'}).promise;
 return c;
}
async function renderPdf(id,files,data){
 if(id==='pdf-compressor'&&data.preset!==undefined&&!Object.hasOwn(PDF_COMPRESSION_PRESETS,data.preset))throw Error('Choose Low, Best, or High compression.');
 const {pdf,task}=await renderer(files[0]);
 try{
  if(id==='pdf-to-text'){
   let lines=[];
   for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p),text=await page.getTextContent();
    lines.push('--- Page '+p+' ---\n'+text.items.map(t=>t.str||'').join(' ').trim());
    page.cleanup();
   }
   const s=lines.join('\n\n');
   return result(new Blob([s],{type:'text/plain;charset=utf-8'}),'yorphives-pdf-text.txt','Extracted selectable text from '+pdf.numPages+' pages; scanned pictures need OCR.',{text:s.slice(0,10000)});
  }
  const preset=id==='pdf-compressor'&&data.preset!==undefined?PDF_COMPRESSION_PRESETS[data.preset]:null;
  const quality=preset?preset.quality/100:num(data,'quality',25,95,70)/100;
  const requested=preset?preset.scale:num(data,'scale',0.5,2,1);
  const mime=id==='pdf-to-images'&&data.format==='png'?'image/png':'image/jpeg';
  if(id==='pdf-to-images'){
   const JSZip=(await import('./vendor/jszip.mjs')).default;
   const archive=new JSZip();let first=null;
   for(let n=1;n<=pdf.numPages;n++){
    const p=await pdf.getPage(n),c=await renderPage(p,requested),blob=await toBlob(c,mime,quality);
    if(!first)first=blob;
    archive.file('page-'+String(n).padStart(3,'0')+(mime==='image/png'?'.png':'.jpg'),blob);
    c.width=c.height=0;p.cleanup();
   }
   if(pdf.numPages===1)return result(first,'yorphives-pdf-page.'+(mime==='image/png'?'png':'jpg'),'Converted one PDF page to an image.',{image:true});
   const zip=await archive.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
   return result(zip,'yorphives-pdf-images.zip','Converted '+pdf.numPages+' pages to images in a ZIP.');
  }
  if(id==='pdf-compressor'){
   const {PDFDocument}=await pdfLibrary();
   const out=await PDFDocument.create();let pages=0;
   for(let n=1;n<=pdf.numPages;n++){
    const p=await pdf.getPage(n),v=p.getViewport({scale:1}),c=await renderPage(p,requested);
    const jpg=await toBlob(c,'image/jpeg',quality);
    const embedded=await out.embedJpg(await jpg.arrayBuffer());
    const page=out.addPage([v.width,v.height]);
    page.drawImage(embedded,{x:0,y:0,width:v.width,height:v.height});
    c.width=c.height=0;p.cleanup();pages++;
   }
   const compressed=new Blob([await out.save({useObjectStreams:true})],{type:'application/pdf'});
   if(compressed.size>=files[0].size)return result(files[0],'yorphives-pdf-original.pdf','Raster optimization did not reduce this PDF; the unchanged original is returned.');
   return result(compressed,'yorphives-pdf-compressed.pdf','Reduced PDF by '+Math.round((1-compressed.size/files[0].size)*100)+'%. Pages were rasterized: searchable text, links, forms and signatures may be lost.');
  }
  throw Error('Unsupported PDF conversion.');
 }finally{await task.destroy();}
}
async function openImage(file){
 requireFiles([file],1,1,20*MB);
 const b=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const valid=b.length>3&&(b[0]===137&&b[1]===80||b[0]===255&&b[1]===216||String.fromCharCode(...b.slice(0,4))==='RIFF');
 if(!valid)throw Error('Choose a PNG, JPEG, or WebP image.');
 if(typeof createImageBitmap!=='function')throw Error('Your browser cannot decode images locally.');
 const image=await createImageBitmap(file);
 if(!image.width||!image.height||image.width*image.height>24000000){image.close();throw Error('Image exceeds the 24-megapixel limit.');}
 return image;
}
function redraw(img,w=img.width,h=img.height,white=false){
 const {canvas:c,ctx}=canvas(w,h);
 if(white){ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);}
 ctx.drawImage(img,0,0,c.width,c.height);
 return c;
}
async function imageOps(id,files,data){
 const img=await openImage(files[0]);
 try{
  if(id==='image-metadata-cleaner'){
   const mime=data.format==='jpeg'?'image/jpeg':'image/png',c=redraw(img,img.width,img.height,mime==='image/jpeg');
   const blob=await toBlob(c,mime,.9);
   return result(blob,'yorphives-cleaned.'+(mime==='image/png'?'png':'jpg'),'Re-encoded image pixels; common EXIF and location metadata are not carried into the output.',{image:true});
  }
  if(id==='image-size-target'){
   const target=num(data,'kb',15,2000,100)*1024,format=data.format==='webp'?'image/webp':'image/jpeg';
   let scale=1,best=null;
   for(let pass=0;pass<7;pass++){
    const w=Math.max(32,Math.floor(img.width*scale)),h=Math.max(32,Math.floor(img.height*scale)),c=redraw(img,w,h,format==='image/jpeg');
    for(let q of [.88,.78,.65,.5,.35,.25,.16]){
     const b=await toBlob(c,format,q);
     if(!best||Math.abs(target-b.size)<Math.abs(target-best.size))best=b;
     if(b.size<=target)return result(b,'yorphives-size-target.'+(format==='image/webp'?'webp':'jpg'),'Created '+Math.round(b.size/1024)+' KB image under your '+Math.round(target/1024)+' KB target.',{image:true});
    }
    scale*=.76;
   }
   throw Error('Cannot reach that size target without making the image too small. Try a larger target.');
  }
  if(id==='passport-photo-maker'){
   const spec=data.size==='2x2'?{w:600,h:600,label:'2 × 2 inch'}:{w:413,h:531,label:'35 × 45 mm'};
   const c=canvas(spec.w,spec.h),ctx=c.ctx;
   const sourceRatio=img.width/img.height,targetRatio=spec.w/spec.h;
   const cropW=sourceRatio>targetRatio?img.height*targetRatio:img.width;
   const cropH=sourceRatio>targetRatio?img.height:img.width/targetRatio;
   const top=num(data,'top',0,100,50)/100;
   const sx=(img.width-cropW)/2,sy=(img.height-cropH)*top;
   ctx.drawImage(img,sx,sy,cropW,cropH,0,0,spec.w,spec.h);
   return result(await toBlob(c.canvas),'yorphives-passport-photo.png','Prepared a '+spec.label+' photo at about 300 DPI. Check the issuing authority’s specifications before use.',{image:true});
  }
  if(id==='qr-code-scanner'){
   const c=redraw(img),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height);
   await loadScript('./vendor/qr/jsQR.js','jsQR');
   const found=globalThis.jsQR(pixels.data,c.width,c.height,{inversionAttempts:'attemptBoth'});
   if(!found?.data)throw Error('No readable QR code was detected. Try a larger, clearer image.');
   const text=found.data.slice(0,10000);
   return result(new Blob([text],{type:'text/plain;charset=utf-8'}),'yorphives-qr-content.txt','QR code decoded locally; inspect links before opening them.',{text});
  }
  if(id==='image-ocr'){
   const module=await import('./vendor/ocr/tesseract.esm.min.js');
   const createWorker=module.createWorker||module.default?.createWorker;
   if(typeof createWorker!=='function')throw Error('Self-hosted OCR module is unavailable.');
   const opts={workerPath:new URL('./vendor/ocr/worker.min.js',import.meta.url).href,
     corePath:new URL('./vendor/ocr/core/',import.meta.url).href,
     langPath:new URL('./vendor/ocr/lang',import.meta.url).href,workerBlobURL:false,gzip:true};
   let worker;try{
    worker=await createWorker('eng',1,opts);
    const o=await worker.recognize(files[0]);const text=(o.data?.text||'').trim();
    if(!text)throw Error('No English text was recognized. Use a sharper image.');
    return result(new Blob([text+'\n'],{type:'text/plain;charset=utf-8'}),'yorphives-image-text.txt','Extracted English text locally with Tesseract OCR.',{text:text.slice(0,10000)});
   }finally{await worker?.terminate();}
  }
  throw Error('Unknown image operation.');
 }finally{img.close();}
}
async function svgToPng(files,data){
 requireFiles(files,1,1,2*MB);
 const source=await files[0].text();
 if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source))throw Error('XML entities and external stylesheets are prohibited.');
 const doc=new DOMParser().parseFromString(source,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement?.localName!=='svg')throw Error('Choose a valid SVG.');
 for(const el of doc.querySelectorAll('*')){
  if(['script','foreignObject','iframe','image','use','feImage','style','animate','set','animateMotion'].includes(el.localName))throw Error('This SVG contains unsupported active or external content.');
  for(const a of [...el.attributes]){
   if(/^on/i.test(a.name)||/href|src/i.test(a.name)||/url\s*\(|@import|expression\s*\(/i.test(a.value)||/javascript:/i.test(a.value))
    throw Error('External resources or active SVG content are not permitted.');
  }
 }
 const root=doc.documentElement;
 const vb=(root.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number);
 const w=num(data,'width',32,2048,vb.length===4&&vb[2]>0?vb[2]:512),h=num(data,'height',32,2048,vb.length===4&&vb[3]>0?vb[3]:512);
 root.setAttribute('width',String(w));root.setAttribute('height',String(h));
 const markup=new XMLSerializer().serializeToString(doc),blob=new Blob([markup],{type:'image/svg+xml'});
 const objectURL=URL.createObjectURL(blob),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Safe SVG could not be decoded by this browser.'));image.src=objectURL;});
  const c=redraw(image,w,h);return result(await toBlob(c),'yorphives-vector.png','Converted a sanitized SVG to a '+Math.round(w)+' × '+Math.round(h)+' PNG.',{image:true});
 }finally{URL.revokeObjectURL(objectURL);}
}
let scriptLoads=new Map();
async function loadScript(path,key){
 if(globalThis[key])return;
 if(typeof document==='undefined')throw Error('This tool requires a browser.');
 if(!scriptLoads.has(path)){
  scriptLoads.set(path,new Promise((resolve,reject)=>{
   const el=document.createElement('script');el.src=new URL(path,import.meta.url).href;
   el.onload=()=>globalThis[key]?resolve():reject(Error('Local conversion library could not initialize.'));
   el.onerror=()=>reject(Error('Local conversion library is unavailable.'));document.head.append(el);
  }));
 }
 return scriptLoads.get(path);
}
async function barcode(data){
 const value=txt(data,'text',100);if(!value)throw Error('Enter barcode text.');
 const format=['CODE128','CODE39','EAN13'].includes(data.format)?data.format:'CODE128';
 if(format==='EAN13'&&!/^\d{12,13}$/.test(value))throw Error('EAN-13 requires 12 or 13 digits.');
 await loadScript('./vendor/barcode/JsBarcode.all.min.js','JsBarcode');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 try{globalThis.JsBarcode(svg,value,{format,width:2,height:90,displayValue:true,background:'#ffffff'});}
 catch{throw Error('Barcode text is invalid for the selected format.');}
 const text=new XMLSerializer().serializeToString(svg);
 return result(new Blob([text],{type:'image/svg+xml'}),'yorphives-barcode.svg','Generated '+format+' barcode as a printable SVG.',{image:true});
}
async function invoice(data){
 const name=visibleText(txt(data,'business',80));if(!name)throw Error('Enter your business name.');
 const client=visibleText(txt(data,'client',80));if(!client)throw Error('Enter the client name.');
 const code=visibleText(txt(data,'number',36)||'INV-001'),currency=txt(data,'currency',8)||'USD';
 const lineSource=String(data.items||'');
 const lines=lineSource.split(/\r?\n/).filter(x=>x.trim());
 if(!lines.length||lines.length>20)throw Error('Enter 1–20 invoice items, one per line.');
 const {calculateInvoice}=await import('./pdf-money.mjs');
 const amounts=calculateInvoice(lines,data.tax??0,currency);
 for(const item of amounts.items)visibleText(item.label);
 const {PDFDocument,StandardFonts,rgb}=await pdfLibrary();
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const {createPdfTextEngine}=await import('./pdf-text-engine.mjs');
 const text=await createPdfTextEngine(pdf,[{text:name,font:bold},{text:'Bill to: '+client,font},
  {text:'Invoice #: '+code,font},...amounts.items.map(item=>({text:item.label,font}))]);
 const color=rgb(.08,.2,.17),colorCss='#14332b';let page,y;
 const draw=(value,x,at,size=11,f=font,isBold=false)=>text.draw(page,value,
  {x,y:at,size,font:f,color,colorCss,bold:isBold});
 async function wrapped(value,x,at,maxWidth,size=11,f=font,isBold=false,leading=15){
  const rows=text.wrap(value,maxWidth,size,f,isBold);
  for(const row of rows){await draw(row,x,at,size,f,isBold);at-=leading;}
  return at;
 }
 async function right(value,edge,at,maxWidth,size=9,f=font,isBold=false){
  const w=text.width(value,size,f,isBold);
  if(w>maxWidth)throw Error('An invoice number is too wide for the PDF. Use smaller values.');
  await draw(value,edge-w,at,size,f,isBold);
 }
 async function startPage(first,table=true){
  page=pdf.addPage([595.28,841.89]);y=785;
  await draw(first?'INVOICE':'INVOICE (CONTINUED)',42,y,first?27:18,bold,true);y-=34;
  if(first){
   y=await wrapped(name,42,y,510,16,bold,true,20);y-=8;
   y=await wrapped('Bill to: '+client,42,y,510,11,font,false,15);
   y=await wrapped('Invoice #: '+code,42,y,510,11,font,false,15);
   await draw('Currency: '+amounts.currency+'     Tax: '+amounts.taxPercent+'%',42,y,11);y-=33;
  }else{
   y=await wrapped('Invoice #: '+code,42,y,510,10,font,false,14);y-=12;
  }
  if(table){
   await draw('Item',42,y,10,bold,true);await right('Qty',375,y,65,10,bold,true);
   await right('Price',463,y,80,10,bold,true);await right('Total',553,y,80,10,bold,true);y-=24;
  }
 }
 await startPage(true);
 for(const [index,item] of amounts.items.entries()){
  const rows=text.wrap(item.label,260,9,font),height=Math.max(1,rows.length)*13+11;
  // Keep at least the last item with the totals when another page is needed.
  if(y-height<(index===amounts.items.length-1?155:145))await startPage(false);
  let at=y;for(const row of rows){await draw(row,42,at,9);at-=13;}
  await right(item.quantity,375,y,65);await right(item.price,463,y,80);await right(item.total,553,y,80);y-=height;
 }
 if(y<155)await startPage(false,false);
 y-=20;await right('Subtotal: '+amounts.currency+' '+amounts.subtotal,553,y,300,12,bold,true);
 y-=22;await right('Tax: '+amounts.currency+' '+amounts.tax,553,y,300,11);
 y-=28;await right('Amount due: '+amounts.currency+' '+amounts.total,553,y,300,13,bold,true);
 for(const p of pdf.getPages())p.drawText('Created locally by YorpHives. Review before sending.',{x:42,y:35,size:8,font,color});
 return result(await pdf.save(),'yorphives-invoice.pdf','Generated an invoice for '+amounts.currency+' '+amounts.total+'.');
}
export const WAVE1_IDS=Object.freeze([
 'pdf-compressor','pdf-to-images','image-size-target','pdf-page-numbers','pdf-watermark',
 'pdf-visual-signature','pdf-rearrange-pages','image-metadata-cleaner','passport-photo-maker',
 'qr-code-scanner','invoice-generator','image-ocr','pdf-to-text','svg-to-png','barcode-generator'
]);
export async function processWave1(id,files=[],data={}){
 if(!WAVE1_IDS.includes(id))throw Error('Unknown YorpHives tool.');
 if(['pdf-page-numbers','pdf-watermark','pdf-visual-signature','pdf-rearrange-pages'].includes(id)){requireFiles(files);return editPdf(id,files,data);}
 if(['pdf-compressor','pdf-to-images','pdf-to-text'].includes(id))return renderPdf(id,files,data);
 if(['image-size-target','image-metadata-cleaner','passport-photo-maker','qr-code-scanner','image-ocr'].includes(id)){requireFiles(files);return imageOps(id,files,data);}
 if(id==='svg-to-png')return svgToPng(files,data);
 if(id==='invoice-generator')return invoice(data);
 if(id==='barcode-generator')return barcode(data);
 throw Error('This tool is not ready.');
}
