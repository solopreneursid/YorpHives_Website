import { csvToXlsx, readXlsx, rowsToCsv, rowsToJson, extractPptxText } from './office-files.mjs';

const PDF_MIME='application/pdf';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX_MIME='application/vnd.openxmlformats-officedocument.presentationml.presentation';
const textValue=(data,key)=>String(data[key]??'');
const plural=(count,word)=>`${word}${count===1?'':'s'}`;
function integer(data,key,label,min,max,defaultValue) {
  const raw=textValue(data,key).trim();if(!raw && defaultValue!==undefined)return defaultValue;
  const value=Number(raw);if(!raw||!Number.isInteger(value)||value<min||value>max)throw new Error(`Enter a valid ${label}.`);return value;
}
function validateFiles(files, maxCount=1, maxEach=20*1024*1024, maxTotal=40*1024*1024, allowEmpty=false){
  if(!Array.isArray(files)||!files.length||files.length>maxCount)throw new Error(`Choose ${maxCount===1?'one file':`between 1 and ${maxCount} files`}.`);
  let total=0;for(const file of files){if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size<0||(!allowEmpty&&file.size===0)||file.size>maxEach)throw new Error(`Each file must be ${allowEmpty?'':'non-empty and '}at most ${Math.floor(maxEach/1048576)} MB.`);total+=file.size;}
  if(total>maxTotal)throw new Error(`The selected files must total at most ${Math.floor(maxTotal/1048576)} MB.`);
}
async function bytesFor(file){return new Uint8Array(await file.arrayBuffer());}
function isPdf(bytes){return new TextDecoder('latin1').decode(bytes.slice(0,1024)).includes('%PDF-');}
function isPng(bytes){return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);}
function isJpeg(bytes){return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;}
function isWebp(bytes){return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';}
function checkImageSignature(bytes){if(!isPng(bytes)&&!isJpeg(bytes)&&!isWebp(bytes))throw new Error('Choose PNG, JPEG, or WebP images.');}
function result(data,filename,type,summary,extra={}){const blob=data instanceof Blob?data:new Blob([data],{type});return {blob,filename,summary,...extra};}
export function pageSelection(input,count,{emptyAll=false}={}){
  const source=String(input??'').trim();if(!source){if(emptyAll)return Array.from({length:count},(_,i)=>i);throw new Error('Enter one or more page numbers.');}
  if(source.length>500)throw new Error('Keep the page selection under 500 characters.');
  const indices=[];for(const piece of source.split(',')){const part=piece.trim(),match=/^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);if(!match)throw new Error('Use page numbers and ranges such as 1,3-5.');const a=Number(match[1]),b=match[2]?Number(match[2]):a;if(a<1||b<a||b>count)throw new Error(`Page numbers must be between 1 and ${count}.`);if(indices.length+b-a+1>500)throw new Error('Select no more than 500 pages.');for(let i=a;i<=b;i++)indices.push(i-1);}
  return indices;
}
async function loadPdf(file){
  const bytes=await bytesFor(file);if(!isPdf(bytes))throw new Error('Choose a valid PDF file.');
  const {PDFDocument}=await import('./vendor/pdf-lib.mjs');try{const doc=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false,throwOnInvalidObject:true});if(doc.getPageCount()>500)throw new Error('This PDF has more than 500 pages.');return doc;}catch(error){if(error?.message?.includes('more than 500'))throw error;throw new Error('Could not open this PDF. Encrypted or damaged PDFs are not supported.');}
}
async function pdfAction(id,files,data){
  const multi=id==='pdf-merge';validateFiles(files,multi?20:1);const {PDFDocument,degrees}=await import('./vendor/pdf-lib.mjs');
  if(multi){const out=await PDFDocument.create();let count=0;for(const file of files){const doc=await loadPdf(file);count+=doc.getPageCount();if(count>500)throw new Error('Use at most 500 pages in total.');const pages=await out.copyPages(doc,doc.getPageIndices());pages.forEach(page=>out.addPage(page));}return result(await out.save(),'yorphives-merged.pdf',PDF_MIME,`Merged ${files.length} ${plural(files.length,'file')} into ${count} ${plural(count,'page')}.`);}
  const doc=await loadPdf(files[0]),count=doc.getPageCount();if(!count)throw new Error('This PDF has no pages.');
  if(id==='pdf-page-counter'){const lines=doc.getPages().map((page,i)=>{const {width,height}=page.getSize();return `Page ${i+1}: ${Math.round(width)} × ${Math.round(height)} pt`});const value=`Pages: ${count}\n\n${lines.join('\n')}`;return result(value,'yorphives-pdf-pages.txt','text/plain;charset=utf-8',`Found ${count} ${plural(count,'page')}.`,{text:value});}
  if(id==='pdf-extract-pages'){const selected=pageSelection(data.pages,count),out=await PDFDocument.create();const pages=await out.copyPages(doc,selected);pages.forEach(page=>out.addPage(page));return result(await out.save(),'yorphives-extracted-pages.pdf',PDF_MIME,`Created a PDF with ${selected.length} selected ${plural(selected.length,'page')}.`);}
  if(id==='pdf-remove-pages'){const removed=new Set(pageSelection(data.pages,count));const keep=doc.getPageIndices().filter(i=>!removed.has(i));if(!keep.length)throw new Error('Keep at least one page in the PDF.');const out=await PDFDocument.create();(await out.copyPages(doc,keep)).forEach(page=>out.addPage(page));return result(await out.save(),'yorphives-remaining-pages.pdf',PDF_MIME,`Kept ${keep.length} of ${count} ${plural(count,'page')}.`);}
  if(id==='pdf-rotate-pages'){const selected=new Set(pageSelection(data.pages,count,{emptyAll:true}));const angle=integer(data,'angle','rotation',90,270);if(![90,180,270].includes(angle))throw new Error('Choose 90, 180, or 270 degrees.');for(const i of selected){const page=doc.getPage(i);page.setRotation(degrees((page.getRotation().angle+angle)%360));}return result(await doc.save(),'yorphives-rotated.pdf',PDF_MIME,`Rotated ${selected.size} ${plural(selected.size,'page')}.`);}
  throw new Error('This PDF tool is unavailable.');
}
async function bitmap(file){
  checkImageSignature(await bytesFor(file));
  if(typeof createImageBitmap!=='function')throw new Error('Image processing is unavailable in this browser.');
  let image;try{image=await createImageBitmap(file)}catch{throw new Error('Could not open this image.');}
  if(!image.width||!image.height||image.width>8192||image.height>8192||image.width*image.height>24000000){image.close();throw new Error('Use an image no larger than 8,192 pixels per side and 24 megapixels.');}return image;
}
function canvas(w,h){if(typeof document==='undefined')throw new Error('Image processing needs a browser.');const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable.');return {c,ctx};}
function canvasBlob(c){return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the image.')),'image/png'));}
async function imageAction(id,files,data){
  validateFiles(files);const image=await bitmap(files[0]);try{
    if(id==='image-cropper'){
      const x=integer(data,'x','left coordinate',0,image.width-1,0),y=integer(data,'y','top coordinate',0,image.height-1,0);
      const w=integer(data,'width','crop width',0,image.width,0)||image.width-x,h=integer(data,'height','crop height',0,image.height,0)||image.height-y;
      if(x+w>image.width||y+h>image.height)throw new Error('The crop must fit inside the image.');
      const {c,ctx}=canvas(w,h);ctx.drawImage(image,x,y,w,h,0,0,w,h);return result(await canvasBlob(c),'yorphives-cropped.png','image/png',`Cropped image: ${w} × ${h} pixels.`,{image:true});
    }
    if(id==='image-rotate-flip'){
      const angle=integer(data,'angle','rotation',0,270);if(![0,90,180,270].includes(angle))throw new Error('Choose a right-angle rotation.');
      const swapped=angle===90||angle===270,w=swapped?image.height:image.width,h=swapped?image.width:image.height,{c,ctx}=canvas(w,h);
      ctx.translate(w/2,h/2);ctx.rotate(angle*Math.PI/180);ctx.scale(data.flip==='on'?-1:1,1);ctx.drawImage(image,-image.width/2,-image.height/2);
      return result(await canvasBlob(c),'yorphives-rotated.png','image/png',`Image ready: ${w} × ${h} pixels.`,{image:true});
    }
    if(id==='image-watermark'){
      const label=textValue(data,'watermark');if(!label.trim()||label.length>120)throw new Error('Enter watermark text up to 120 characters.');
      const size=integer(data,'size','font size',8,300),opacity=integer(data,'opacity','opacity',1,100),color=textValue(data,'color');
      if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Choose a six-digit hex color.');
      const place=textValue(data,'position');if(!['bottom-right','bottom-left','center','top-left','top-right'].includes(place))throw new Error('Choose a watermark position.');
      const {c,ctx}=canvas(image.width,image.height);ctx.drawImage(image,0,0);ctx.globalAlpha=opacity/100;ctx.fillStyle=color;ctx.font=`600 ${size}px sans-serif`;ctx.textBaseline='middle';
      const pad=Math.min(24,image.width/10),isRight=place.endsWith('right');ctx.textAlign=place==='center'?'center':isRight?'right':'left';
      const x=place==='center'?image.width/2:isRight?image.width-pad:pad,y=place==='center'?image.height/2:place.startsWith('top')?Math.min(image.height/2,pad+size/2):Math.max(image.height/2,image.height-pad-size/2);
      ctx.fillText(label,x,y,Math.max(1,image.width-pad*2));ctx.globalAlpha=1;return result(await canvasBlob(c),'yorphives-watermarked.png','image/png',`Watermark added to a ${image.width} × ${image.height} image.`,{image:true});
    }
    throw new Error('This image tool is unavailable.');
  }finally{image.close();}
}
async function imageToPdf(files){
  validateFiles(files,12,15*1024*1024,30*1024*1024);const {PDFDocument}=await import('./vendor/pdf-lib.mjs'),pdf=await PDFDocument.create();
  for(const file of files){const image=await bitmap(file);try{const {c,ctx}=canvas(image.width,image.height);ctx.drawImage(image,0,0);const png=await canvasBlob(c),embedded=await pdf.embedPng(await png.arrayBuffer());const landscape=image.width>image.height,pw=landscape?841.89:595.28,ph=landscape?595.28:841.89,scale=Math.min((pw-36)/image.width,(ph-36)/image.height),w=image.width*scale,h=image.height*scale;const page=pdf.addPage([pw,ph]);page.drawImage(embedded,{x:(pw-w)/2,y:(ph-h)/2,width:w,height:h});}finally{image.close();}}
  return result(await pdf.save(),'yorphives-images.pdf',PDF_MIME,`Created a PDF with ${files.length} image ${plural(files.length,'page')}.`);
}
let pptxLoading;
async function pptxConstructor(){
  if(typeof document==='undefined')throw new Error('PowerPoint generation needs a browser.');
  if(globalThis.PptxGenJS)return globalThis.PptxGenJS;
  if(!pptxLoading)pptxLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/pptxgen.bundle.js',import.meta.url).href;script.onload=()=>globalThis.PptxGenJS?resolve(globalThis.PptxGenJS):reject(new Error('Could not load the local PowerPoint library.'));script.onerror=()=>reject(new Error('Could not load the local PowerPoint library.'));document.head.append(script);});
  return pptxLoading;
}
async function imagesToPptx(files){
  validateFiles(files,12,15*1024*1024,30*1024*1024);const Constructor=await pptxConstructor(),pptx=new Constructor();pptx.layout='LAYOUT_WIDE';
  for(const file of files){const image=await bitmap(file);try{const {c,ctx}=canvas(image.width,image.height);ctx.drawImage(image,0,0);const data=c.toDataURL('image/png'),scale=Math.min(12.6/image.width,6.8/image.height),w=image.width*scale,h=image.height*scale;const slide=pptx.addSlide();slide.addImage({data,x:(13.333333-w)/2,y:(7.5-h)/2,w,h});}finally{image.close();}}
  const blob=await pptx.write({outputType:'blob'});if(!(blob instanceof Blob))throw new Error('Could not create the presentation.');return result(blob,'yorphives-images.pptx',PPTX_MIME,`Created a presentation with ${files.length} ${plural(files.length,'slide')}.`);
}
export async function processFileTool(id,files,data={}){
  if(['file-format-inspector','batch-file-renamer','zip-file-creator','zip-contents-viewer'].includes(id)){
    const {processBatchFileTool}=await import('./batch-file-core.mjs');
    return processBatchFileTool(id,files,data);
  }
  if(id.startsWith('pdf-'))return pdfAction(id,files,data);
  if(['image-cropper','image-rotate-flip','image-watermark'].includes(id))return imageAction(id,files,data);
  if(id==='images-to-pdf')return imageToPdf(files);
  if(id==='images-to-powerpoint')return imagesToPptx(files);
  validateFiles(files,1,12*1024*1024,12*1024*1024,id==='file-sha256');
  if(id==='file-sha256'){const bytes=await files[0].arrayBuffer();if(!globalThis.crypto?.subtle)throw new Error('Secure hashing needs HTTPS and a modern browser.');const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');return result(hash+'\n','yorphives-sha256.txt','text/plain;charset=utf-8','SHA-256 checksum calculated.',{text:hash});}
  if(id==='csv-file-to-xlsx'){if(files[0].size>2_000_000)throw new Error('Choose a CSV file no larger than 2 MB.');let input;try{input=new TextDecoder('utf-8',{fatal:true}).decode(await files[0].arrayBuffer()).replace(/^\ufeff/,'');}catch{throw new Error('Choose a UTF-8 encoded CSV file.');}const bytes=await csvToXlsx(input);return result(bytes,'yorphives-spreadsheet.xlsx',XLSX_MIME,'Created an Excel workbook. Cells are stored as text.');}
  if(id==='xlsx-file-to-csv'||id==='xlsx-file-to-json'){const sheet=integer(data,'sheet','sheet number',1,500,1),workbook=await readXlsx(await files[0].arrayBuffer(),sheet);const output=id==='xlsx-file-to-csv'?rowsToCsv(workbook.rows,data.safe==='on'):rowsToJson(workbook.rows);const csv=id==='xlsx-file-to-csv';return result(output,csv?'yorphives-sheet.csv':'yorphives-sheet.json',csv?'text/csv;charset=utf-8':'application/json;charset=utf-8',`Exported sheet ${sheet} of ${workbook.count}: ${workbook.name}.`,{text:output.slice(0,10000)});}
  if(id==='powerpoint-text-extractor'){const output=await extractPptxText(await files[0].arrayBuffer());return result(output.text,'yorphives-slide-text.txt','text/plain;charset=utf-8',`Extracted text from ${output.slides} ${plural(output.slides,'slide')}.`,{text:output.text.slice(0,10000)});}
  throw new Error('This file tool is unavailable.');
}

export async function imageDimensions(file){validateFiles([file]);const image=await bitmap(file);try{return {width:image.width,height:image.height};}finally{image.close();}}
