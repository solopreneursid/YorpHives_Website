// YorpHives v1.7 · Browser-local image, PDF and spreadsheet engines.
import {PDFDocument} from './vendor/pdf-lib.mjs';
import JSZip from './vendor/jszip.mjs';
import {readCreatorImage} from './wave6-image-core.mjs';
import {readXlsx,rowsToCsv,csvToXlsx} from './office-files.mjs';
import {parseCsv} from './utility-core.mjs';
const MB=1048576;
const result=(blob,filename,summary,extra={})=>{
 if(!(blob instanceof Blob)||blob.size<1)throw Error('No usable output was produced.');
 return {blob,filename,summary,...extra};
};
function asFiles(files,min,max,bytes){
 if(!Array.isArray(files)||files.length<min||files.length>max||files.some(f=>!(f instanceof Blob)||f.size<1||f.size>bytes))
  throw Error('Choose '+min+'–'+max+' files, each up to '+Math.floor(bytes/MB)+' MB.');
 return files;
}
function safeBase(name){
 return (String(name||'image').replace(/\.[^.]+$/,'').normalize('NFKC').replace(/[^A-Za-z0-9._-]/g,'-').replace(/^-+|-+$/g,'').slice(0,65)||'file');
}
const imageToBlob=(canvas,mime,quality)=>new Promise((resolve,reject)=>{
 canvas.toBlob(b=>b&&b.size&&b.type===mime?resolve(b):reject(Error('This browser cannot export '+mime.replace('image/','').toUpperCase()+'. Choose JPG or PNG instead.')),mime,quality);
});
function drawImage(image,edge,format,crop=false){
 const max=Number(edge);
 if(![0,640,1200,1600,2048].includes(max))throw Error('Choose a supported maximum image dimension.');
 const factor=max>0?Math.min(1,max/Math.max(image.width,image.height)):1;
 const w=Math.max(1,Math.round(image.width*factor)),h=Math.max(1,Math.round(image.height*factor));
 if(w*h>20_000_000)throw Error('The output image is too large.');
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas drawing is unavailable.');
 if(format==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
 ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,w,h);
 return canvas;
}
export function imageSettings(opts={}){
 const format=String(opts.format||'webp').toLowerCase();
 if(!['webp','jpeg','png'].includes(format))throw Error('Choose WebP, JPG or PNG.');
 const max=Number(opts.max??1200),quality=Number(opts.quality??.82);
 if(![0,640,1200,1600,2048].includes(max)||!Number.isFinite(quality)||quality<.4||quality>.98)
  throw Error('Choose supported output size and quality.');
 return {format,max,quality,mime:'image/'+format,ext:format==='jpeg'?'jpg':format};
}
export async function convertImageBatch(files,options={},onProgress){
 asFiles(files,1,10,10*MB);
 if(files.reduce((s,f)=>s+f.size,0)>45*MB)throw Error('Batch input exceeds 45 MB.');
 if(typeof document==='undefined')throw Error('Images must be converted in a browser.');
 const opt=imageSettings(options),zip=new JSZip(),names=new Set();
 for(let i=0;i<files.length;i++){
  onProgress?.({done:i,total:files.length});
  const bitmap=await readCreatorImage(files[i],10*MB);
  let canvas;
  try{
   canvas=drawImage(bitmap,opt.max,opt.format);
   const blob=await imageToBlob(canvas,opt.mime,opt.quality);
   if(blob.size>24*MB)throw Error('A converted image exceeds 24 MB.');
   let name=safeBase(files[i].name),counter=2;
   while(names.has(name.toLowerCase()))name=safeBase(files[i].name)+'-'+counter++;
   names.add(name.toLowerCase());
   zip.file(name+'.'+opt.ext,new Uint8Array(await blob.arrayBuffer()));
  }finally{bitmap.close();if(canvas)canvas.width=canvas.height=0;}
 }
 onProgress?.({done:files.length,total:files.length});
 zip.file('README.txt','YorpHives locally converted image batch.\nNo images were uploaded. Colors and camera metadata may change.\n');
 const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:4}});
 if(bytes.length>70*MB)throw Error('The ZIP is too large to download. Reduce image count or size.');
 return result(new Blob([bytes],{type:'application/zip'}),'yorphives-converted-images.zip',
  'Converted '+files.length+' image(s) to '+opt.ext.toUpperCase()+' and saved a ZIP.');
}
export function pdfMetadataFields(doc){
 const fields=[['Title','getTitle'],['Author','getAuthor'],['Subject','getSubject'],['Keywords','getKeywords'],['Creator','getCreator'],['Producer','getProducer'],
  ['Creation date','getCreationDate'],['Modification date','getModificationDate']];
 return fields.map(([label,method])=>{let value=typeof doc[method]==='function'?doc[method]():undefined;
  if(value instanceof Date)value=value.toISOString();
  return {label,value:value==null?'':String(value).slice(0,400)};});
}
async function loadPdf(file){
 asFiles([file],1,1,15*MB);
 const head=new TextDecoder('latin1').decode(new Uint8Array(await file.slice(0,8).arrayBuffer()));
 if(!head.startsWith('%PDF-'))throw Error('Select a genuine PDF file.');
 let doc;try{doc=await PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false,ignoreEncryption:false});}
 catch{throw Error('The PDF is encrypted, corrupt or unsupported.');}
 if(!doc.getPageCount()||doc.getPageCount()>30)throw Error('Choose a PDF with 1–30 pages.');
 return doc;
}
export async function inspectPdfMetadata(file){
 const doc=await loadPdf(file);
 const entries=pdfMetadataFields(doc);
 return {entries,pageCount:doc.getPageCount(),
  text:entries.map(e=>e.label+': '+(e.value||'(not specified)')).join('\n')};
}
export async function cleanPdfMetadata(file){
 const doc=await loadPdf(file),before=pdfMetadataFields(doc);
 for(const setter of ['setTitle','setAuthor','setSubject','setCreator','setProducer'])doc[setter]('');
 doc.setKeywords([]);
 const epoch=new Date('1970-01-01T00:00:00.000Z');
 doc.setCreationDate(epoch);doc.setModificationDate(epoch);
 const blob=new Blob([await doc.save({useObjectStreams:true})],{type:'application/pdf'});
 return result(blob,'yorphives-metadata-cleaned.pdf',
  'Cleared supported document Info fields on '+doc.getPageCount()+' pages. Embedded XMP, images, annotations and document content may still carry identifying information.',
  {text:'Original standard metadata:\n'+before.map(e=>e.label+': '+(e.value||'(empty)')).join('\n')+
  '\n\nWARNING: This is not forensic metadata sanitization. Other hidden data may remain.'});
}
export function mergeRows(sources,options={}){
 if(!Array.isArray(sources)||sources.length<2||sources.length>8)throw Error('Choose 2–8 spreadsheets.');
 const mode=options.columns==='strict'?'strict':'union',dedupe=options.dedupe===true||options.dedupe==='on';
 const allHeaders=[],seen=new Map(),merged=[],unique=new Set();
 for(const source of sources){
  const rows=source.rows;
  if(!Array.isArray(rows)||!rows.length)throw Error('One spreadsheet is empty.');
  const header=rows[0].map(x=>String(x??'').trim());
  if(!header.length||header.length>100||header.some(x=>!x||x.length>110))
   throw Error('Every spreadsheet needs 1–100 named columns in its first row.');
  const local=new Set(header.map(x=>x.toLowerCase()));
  if(local.size!==header.length)throw Error('A spreadsheet has duplicate column names.');
  if(mode==='strict'&&allHeaders.length&&
   (header.length!==allHeaders.length||header.some((h,i)=>h.toLowerCase()!==allHeaders[i].toLowerCase())))
   throw Error('Column headings differ. Choose Match by heading instead.');
  for(const name of header)if(!seen.has(name.toLowerCase())){
   if(allHeaders.length>=100)throw Error('Combined spreadsheets exceed 100 distinct columns.');
   seen.set(name.toLowerCase(),allHeaders.length);allHeaders.push(name);
  }
 }
 if(options.source===true||options.source==='on'){
  if(seen.has('source file'))throw Error('Remove the existing "Source file" column before enabling source tracking.');
  allHeaders.push('Source file');
 }
 for(const source of sources){
  const headers=source.rows[0].map(x=>String(x??'').trim()),colIndexes=headers.map(x=>seen.get(x.toLowerCase()));
  for(const row of source.rows.slice(1)){
   if(row.length>headers.length&&row.slice(headers.length).some(x=>String(x??'').trim()))
    throw Error('A row has more populated cells than its header.');
   if(row.every(x=>!String(x??'').trim()))continue;
   const record=Array(allHeaders.length).fill('');
   row.forEach((value,i)=>{if(i<colIndexes.length)record[colIndexes[i]]=value??'';});
   const key=JSON.stringify(record.slice(0,seen.size).map(v=>String(v)));
   if(dedupe&&unique.has(key))continue;
   unique.add(key);
   if(options.source===true||options.source==='on')record[record.length-1]=String(source.name||'source').slice(0,130);
   merged.push(record);
   if(merged.length>10000)throw Error('Combined data exceeds the 10,000-row limit.');
  }
 }
 if(!merged.length)throw Error('No non-empty data rows to merge.');
 return {rows:[allHeaders,...merged],count:merged.length,columns:allHeaders.length};
}
export async function mergeSpreadsheetFiles(files,opts={}){
 asFiles(files,2,8,8*MB);
 if(files.reduce((s,f)=>s+f.size,0)>30*MB)throw Error('Combined input files exceed 30 MB.');
 const sources=[];
 for(const file of files){
  const ext=String(file.name||'').split('.').pop().toLowerCase();
  let rows;
  if(ext==='csv'){
   let text;
   try{text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()).replace(/^\uFEFF/,'');}
   catch{throw Error('CSV files must use UTF-8 encoding.');}
   if(text.length>2_000_000)throw Error('CSV is too large.');
   rows=parseCsv(text);
  }else if(ext==='xlsx'){
   const sheet=await readXlsx(new Uint8Array(await file.arrayBuffer()),1);rows=sheet.rows;
  }else throw Error('Only CSV and modern .xlsx files are supported.');
  if(rows.length>10000)throw Error('Spreadsheet has more than 10,000 rows.');
  sources.push({name:file.name,rows});
 }
 const merged=mergeRows(sources,opts),format=opts.format==='xlsx'?'xlsx':'csv';
 if(format==='csv'){
  const str=rowsToCsv(merged.rows,true)+'\r\n';
  return result(new Blob([str],{type:'text/csv;charset=utf-8'}),'yorphives-merged-data.csv',
   'Merged '+files.length+' sources into '+merged.count+' rows and '+merged.columns+' columns.',{text:str.slice(0,6000)});
 }
 const str=rowsToCsv(merged.rows,true),bytes=await csvToXlsx(str);
 return result(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
  'yorphives-merged-data.xlsx',
  'Merged '+files.length+' sources into '+merged.count+' rows. Exported cells as text to preserve values and prevent formula execution.');
}
// A real three-stage local workflow: resize > convert > compress, plus a social card and icon.
export async function makeImagePublishingPack(file,options={}){
 asFiles([file],1,1,10*MB);
 if(typeof document==='undefined')throw Error('This workflow requires a browser.');
 const image=await readCreatorImage(file,10*MB),zip=new JSZip();
 try{
  const candidates=[{name:'website-image.webp',w:1200,h:0,quality:.78},
   {name:'square-thumbnail.webp',w:400,h:400,quality:.77},
   {name:'social-share-image.jpg',w:1200,h:630,quality:.82}];
  for(const spec of candidates){
   let canvas=document.createElement('canvas');
   try{
    if(spec.h){
     canvas.width=spec.w;canvas.height=spec.h;
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable.');
     const scale=Math.max(spec.w/image.width,spec.h/image.height),
      sw=spec.w/scale,sh=spec.h/scale;
     if(spec.name.endsWith('.jpg')){ctx.fillStyle='#fff';ctx.fillRect(0,0,spec.w,spec.h);}
     ctx.imageSmoothingQuality='high';ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,0,0,spec.w,spec.h);
    }else canvas=drawImage(image,1200,'webp');
    const mime=spec.name.endsWith('.jpg')?'image/jpeg':'image/webp';
    let blob;
    try{blob=await imageToBlob(canvas,mime,spec.quality);}
    catch{if(mime==='image/webp')throw Error('This browser cannot export WebP. Try the Batch Image Converter with JPG.');throw Error('Could not generate publishing image.');}
    zip.file(spec.name,new Uint8Array(await blob.arrayBuffer()));
   }finally{canvas.width=canvas.height=0;}
  }
  zip.file('README.txt','YorpHives Image Publishing Pack — locally generated\n\nwebsite-image.webp: resized, converted, compressed\nsquare-thumbnail.webp: 400 x 400 center crop\nsocial-share-image.jpg: 1200 x 630 center crop\n\nCheck crops before publishing. No background removal in this workflow.\n');
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:5}});
  if(bytes.length>40*MB)throw Error('Publishing pack exceeds 40 MB.');
  return result(new Blob([bytes],{type:'application/zip'}),'yorphives-image-publishing-pack.zip',
   'Completed resize → convert → compress plus thumbnails and social-share artwork. All three files are ready in one ZIP.');
 }finally{image.close();}
}
