// YorpHives Wave 4: private creator & business workflows.
// No remote processing, paid APIs, network access, or tracking.
import {PDFDocument,StandardFonts,rgb} from './vendor/pdf-lib.mjs';
import JSZip from './vendor/jszip.mjs';
const MB=1048576;
function output(blob,filename,summary,extra={}){
 if(!(blob instanceof Blob)||!blob.size)throw Error('No output could be generated.');
 return {blob,filename,summary,...extra};
}
const field=(opts,key,max=1500,required=false)=>{
 const value=String(opts[key]??'').trim();
 if(value.length>max)throw Error(key+' exceeds '+max+' characters.');
 if(required&&!value)throw Error('Please enter '+key+'.');
 return value;
};
function printable(value,multiline=false){
 const text=String(value).replace(/\r\n?/g,'\n').replace(/\t/g,' ');
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))throw Error('Remove control characters from the PDF text.');
 return multiline?text:text.replace(/\n/g,' ');
}
function linesOf(text,engine,width,size,font,bold=false){
 return text.split('\n').flatMap(part=>engine.wrap(part,width,size,font,bold));
}
function entriesForFont(text,font){
 return text.split('\n').map(line=>({text:line,font}));
}
async function quotePdf(opts){
 const business=printable(field(opts,'business',90,true));
 const client=printable(field(opts,'client',90,true));
 const reference=printable(field(opts,'reference',45));
 const notes=printable(field(opts,'notes',4000),true);
 const entries=field(opts,'items',1800,true).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(entries.length<1||entries.length>10)throw Error('Enter 1–10 items, one per line.');
 const currency=(field(opts,'currency',3)||'USD').toUpperCase();
 if(!/^[A-Z]{3}$/.test(currency))throw Error('Use a three-letter currency code, such as USD or INR.');
 for(const [index,entry] of entries.entries()){
  const parts=entry.split('|').map(x=>x.trim());
  if(parts.length!==3||!parts[0]||parts[0].length>70)throw Error('Item '+(index+1)+': use Description | Quantity | Unit Price.');
  printable(parts[0]);
 }
 const {calculateInvoice}=await import('./pdf-money.mjs');
 const amounts=calculateInvoice(entries,opts.tax??0,currency,{maxDescription:70,maxQuantity:10000,document:'Quotation'});
 if(Number(amounts.subtotal)>1e8)throw Error('Quotation total is too large.');
 const doc=await PDFDocument.create();
 const normal=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const {createPdfTextEngine}=await import('./pdf-text-engine.mjs');
 const engine=await createPdfTextEngine(doc,[...entriesForFont(business,bold),...entriesForFont(client,normal),
  ...entriesForFont(reference,normal),...entriesForFont(notes,normal),...amounts.items.flatMap(item=>entriesForFont(item.label,normal))]);
 const dark=rgb(.08,.17,.16),green=rgb(.07,.45,.31),muted=rgb(.38,.46,.43),line=rgb(.83,.9,.85),white=rgb(1,1,1);
 let page,y;
 async function draw(value,x,at,size=10,font=normal,color=dark,isBold=false){
  await engine.draw(page,String(value),{x,y:at,size,font,color,bold:isBold,
   colorCss:color===white?'#ffffff':color===green?'#12734f':color===muted?'#61756e':'#142b29'});
 }
 async function wrapped(value,x,maxWidth,size,font=normal,color=dark,isBold=false,leading=15){
  for(const row of linesOf(value,engine,maxWidth,size,font,isBold)){await draw(row,x,y,size,font,color,isBold);y-=leading;}
 }
 async function right(value,edge,at,maxWidth,size=10,font=normal,color=dark,isBold=false){
  const width=engine.width(String(value),size,font,isBold);
  if(width>maxWidth)throw Error('A quotation amount is too wide for the page. Use smaller values.');
  await draw(value,edge-width,at,size,font,color,isBold);
 }
 async function startPage(first,table=true){
  if(doc.getPageCount()>=20)throw Error('This quotation needs more than 20 pages. Use fewer line breaks.');
  page=doc.addPage([595,842]);
  page.drawRectangle({x:0,y:770,width:595,height:72,color:green});
  await draw(first?'QUOTATION':'QUOTATION (CONTINUED)',43,799,first?24:18,bold,white,true);
  y=748;
  if(first){
   await wrapped(business,43,508,15,bold,dark,true,19);y-=4;
   await wrapped('Prepared for: '+client,43,508,11,normal,muted,false,15);
   if(reference)await wrapped('Reference: '+reference,43,508,10,normal,muted,false,14);
   y-=17;
  }else{y-=16;}
  if(table){
   await draw('Description',43,y,10,bold,green,true);
   await right('Qty',359,y,53,10,bold,green,true);
   await right('Price',457,y,90,10,bold,green,true);
   await right('Amount',551,y,85,10,bold,green,true);
   y-=10;page.drawRectangle({x:43,y,width:510,height:1,color:line});y-=18;
  }
  await draw('Prepared with YorpHives | Estimates are not tax or legal advice.',43,31,9,normal,muted);
 }
 await startPage(true);
 for(const item of amounts.items){
  const rows=linesOf(item.label,engine,252,10,normal),height=rows.length*14+11;
  if(y-height<110)await startPage(false);
  const top=y;
  for(const row of rows){await draw(row,43,y);y-=14;}
  await right(item.quantity,359,top,53);
  await right(item.price,457,top,90);
  await right(item.total,551,top,85);
  y-=11;page.drawRectangle({x:43,y:y+5,width:510,height:.6,color:line});
 }
 if(y<180)await startPage(false,false);
 y-=18;await draw('Subtotal',374,y,11,bold,dark,true);await right(amounts.subtotal,551,y,85);
 y-=24;await draw('Tax ('+amounts.taxPercent+'%)',374,y);await right(amounts.tax,551,y,85);
 y-=32;page.drawRectangle({x:354,y:y-17,width:200,height:41,color:green});
 await draw('TOTAL',368,y-1,12,bold,white,true);
 await right(currency+' '+amounts.total,552,y-1,137,12,bold,white,true);
 y-=45;
 if(notes){
  if(y<100)await startPage(false,false);
  await draw('NOTES',43,y,10,bold,green,true);y-=20;
  for(const row of linesOf(notes,engine,508,10,normal)){
   if(y<65){await startPage(false,false);await draw('NOTES (CONTINUED)',43,y,10,bold,green,true);y-=20;}
   await draw(row,43,y);y-=15;
  }
 }
 return output(new Blob([await doc.save()],{type:'application/pdf'}),'yorphives-quotation.pdf','Created your itemized quotation with subtotal, tax and total.');
}
async function certificatePdf(opts){
 const recipient=printable(field(opts,'recipient',95,true)),title=printable(field(opts,'title',85,true));
 const organization=printable(field(opts,'organization',100,true));
 const detail=printable(field(opts,'detail',4000)||'For outstanding participation and achievement.',true);
 const date=printable(field(opts,'date',45)||new Date().toISOString().slice(0,10));
 const doc=await PDFDocument.create();
 const regular=await doc.embedFont(StandardFonts.TimesRoman),bold=await doc.embedFont(StandardFonts.TimesRomanBold);
 const {createPdfTextEngine}=await import('./pdf-text-engine.mjs');
 const engine=await createPdfTextEngine(doc,[...entriesForFont(recipient,bold),...entriesForFont(title,bold),
  ...entriesForFont(organization,bold),...entriesForFont(detail,regular),...entriesForFont(date,regular)]);
 const ink=rgb(.11,.24,.22),accent=rgb(.05,.46,.32),muted=rgb(.40,.46,.43),gold=rgb(.72,.52,.22);
 let page,y;
 async function center(value,at,size,font=regular,color=ink,isBold=false){
  const width=engine.width(value,size,font,isBold);
  if(width>720)throw Error('A certificate field is too wide for the page.');
  await engine.draw(page,value,{x:(842-width)/2,y:at,size,font,color,bold:isBold,
   colorCss:color===accent?'#0d7552':color===muted?'#66756e':'#1c3d38'});
 }
 async function begin(first){
  if(doc.getPageCount()>=20)throw Error('This certificate needs more than 20 pages. Use fewer line breaks.');
  page=doc.addPage([842,595]);
  page.drawRectangle({x:26,y:26,width:790,height:543,borderWidth:3,borderColor:gold});
  page.drawRectangle({x:40,y:40,width:762,height:515,borderWidth:1,borderColor:accent});
  await center(first?'CERTIFICATE OF ACHIEVEMENT':'CERTIFICATE DETAILS (CONTINUED)',510,first?26:20,bold,accent,true);
  await center('Created with YorpHives | Not an accredited credential',54,9,regular,muted);
  if(!first){y=470;return;}
  await center('PRESENTED TO',472,13,regular,muted);y=430;
  for(const row of linesOf(recipient,engine,720,32,bold,true)){await center(row,y,32,bold,ink,true);y-=38;}
  page.drawRectangle({x:262,y:y+14,width:318,height:2,color:gold});y-=13;
  for(const row of linesOf(title,engine,720,18,bold,true)){await center(row,y,18,bold,accent,true);y-=23;}
  y-=16;
  const orgRows=linesOf('Issued by '+organization,engine,720,13,bold,true);
  let orgY=128;for(const row of orgRows){await center(row,orgY,13,bold,ink,true);orgY-=17;}
  const dateRows=linesOf('Date: '+date,engine,720,12,regular);
  for(const row of dateRows){await center(row,orgY-2,12,regular,muted);orgY-=15;}
 }
 await begin(true);
 for(const row of linesOf(detail,engine,690,15,regular)){
  if(y<155)await begin(false);
  await center(row,y,15,regular,ink);y-=22;
 }
 return output(new Blob([await doc.save()],{type:'application/pdf'}),'yorphives-certificate.pdf','Created a printable landscape certificate. The template is not an official accreditation.');
}
const parseStamp=(part,source)=>{
 const match=String(part).trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
 if(!match)throw Error('Invalid '+source+' timestamp: '+part);
 const [,hh,mm,ss,ms]=match.map(Number);
 if(mm>59||ss>59)throw Error('Timestamp exceeds 59 minutes or seconds.');
 return (+hh)*3600000+mm*60000+ss*1000+ms;
};
const printStamp=(ms,delimiter)=>{
 const hh=Math.floor(ms/3600000),mm=Math.floor(ms/60000)%60,ss=Math.floor(ms/1000)%60,rest=ms%1000;
 return [hh,mm,ss].map(v=>String(v).padStart(2,'0')).join(':')+delimiter+String(rest).padStart(3,'0');
};
export function convertSubtitles(text,to='vtt'){
 if(!['vtt','srt'].includes(to))throw Error('Choose an SRT or VTT output format.');
 const raw=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 if(!raw||raw.length>3*MB)throw Error('Provide subtitle text up to 3 MB.');
 const isVtt=/^WEBVTT(?:\s|$)/.test(raw);
 const cleaned=isVtt?raw.replace(/^WEBVTT[^\n]*\n?/,'').replace(/^(?:NOTE|STYLE|REGION)[^\n]*(?:\n(?!\n)[^\n]*)*/gm,''):raw;
 const cues=[];
 for(const block of cleaned.split(/\n\s*\n/)){
  const lines=block.trim().split('\n');if(!lines[0]?.trim())continue;
  const timeIndex=lines.findIndex(s=>s.includes('-->'));
  if(timeIndex<0)continue;
  const match=lines[timeIndex].match(/^\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$/);
  if(!match)throw Error('Invalid subtitle timestamp in '+lines[timeIndex].slice(0,70));
  const normalize=s=>/^\d{2}:\d{2}[.,]\d{3}$/.test(s)?'00:'+s:s;
  const start=parseStamp(normalize(match[1]),'start'),end=parseStamp(normalize(match[2]),'end');
  if(end<=start)throw Error('Subtitle cue ends before it begins.');
  const content=lines.slice(timeIndex+1).join('\n').trim();
  if(!content)continue;
  if(cues.length>=10000)throw Error('Subtitle file contains too many cues.');
  cues.push({start,end,content});
 }
 if(!cues.length)throw Error('No valid timed subtitle cues were found.');
 const converted=cues.map((c,i)=>(to==='srt'?String(i+1)+'\n':'')+
  printStamp(c.start,to==='vtt'?'.':',')+' --> '+printStamp(c.end,to==='vtt'?'.':',')+'\n'+c.content).join('\n\n');
 return {text:to==='vtt'?'WEBVTT\n\n'+converted+'\n':converted+'\n',cues:cues.length};
}
async function subtitleTool(files,opts){
 const input=files?.[0],raw=input instanceof Blob&&input.size>0?(input.size<=3*MB?await input.text():(()=>{throw Error('Subtitle file is too large.');})()):field(opts,'subtitleText',3*MB,true);
 const to=opts.format==='srt'?'srt':'vtt',res=convertSubtitles(raw,to);
 return output(new Blob([res.text],{type:'text/plain;charset=utf-8'}),'yorphives-subtitles.'+to,'Converted '+res.cues+' subtitle cues to '+to.toUpperCase()+'. Review cue formatting before publishing.',{text:res.text.slice(0,8000)});
}
export function socialMeta(opts){
 const title=field(opts,'title',100,true),description=field(opts,'description',280,true);
 const url=field(opts,'url',500,true),image=field(opts,'image',500),site=field(opts,'site',70);
 const validUrl=(s,label)=>{try{const u=new URL(s);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();return u.href;}catch{throw Error('Enter an http(s) URL for '+label+'.');}};
 const href=validUrl(url,'your page'),imageHref=image?validUrl(image,'the preview image'):'';
 const esc=s=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
 const tags=[['og:type','website'],['og:title',title],['og:description',description],['og:url',href],
  ...(imageHref?[['og:image',imageHref]]:[]),...(site?[['og:site_name',site]]:[])];
 const html=[...tags.map(([name,content])=>'<meta property="'+name+'" content="'+esc(content)+'">'),
  '<meta name="twitter:card" content="'+(imageHref?'summary_large_image':'summary')+'">',
  '<meta name="twitter:title" content="'+esc(title)+'">',
  '<meta name="twitter:description" content="'+esc(description)+'">',
  ...(imageHref?['<meta name="twitter:image" content="'+esc(imageHref)+'">']:[])].join('\n');
 return {html,title,description,url:href,image:imageHref,site};
}
async function socialTool(opts){
 const meta=socialMeta(opts);
 return output(new Blob([meta.html+'\n'],{type:'text/plain;charset=utf-8'}),'yorphives-social-meta.txt','Generated social preview meta tags. Your actual website must include these in its HTML head.',{text:meta.html,preview:meta});
}
function validImage(file){
 if(!(file instanceof Blob)||file.size<1||file.size>10*MB)throw Error('Select one JPEG, PNG or WebP image up to 10 MB.');
 return file;
}
async function decodeImage(file){
 validImage(file);
 const sig=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const ok=(sig[0]===255&&sig[1]===216)||(sig[0]===137&&sig[1]===80)||String.fromCharCode(...sig.slice(0,4))==='RIFF';
 if(!ok)throw Error('Only actual JPEG, PNG or WebP files can be converted.');
 if(typeof createImageBitmap!=='function')throw Error('This browser does not support local image decoding.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('This image could not be opened.');}
 if(bitmap.width*bitmap.height>20000000||bitmap.width<1||bitmap.height<1){bitmap.close();throw Error('Image exceeds the 20-megapixel safety limit.');}
 return bitmap;
}
const pngBlob=c=>new Promise((resolve,reject)=>c.toBlob(x=>x?resolve(x):reject(Error('Image export failed.')),'image/png'));
async function favicon(files){
 if(!Array.isArray(files)||files.length!==1)throw Error('Select one source image.');
 const bitmap=await decodeImage(files[0]),zip=new JSZip();
 try{
  const pngs=new Map();
  for(const size of [16,32,48,180,192,512]){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
   const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
   const scale=Math.min(size/bitmap.width,size/bitmap.height);
   const w=bitmap.width*scale,h=bitmap.height*scale;
   ctx.clearRect(0,0,size,size);ctx.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h);
   const blob=await pngBlob(canvas),bytes=new Uint8Array(await blob.arrayBuffer());
   if(!bytes.length)throw Error('Empty favicon output.');
   pngs.set(size,bytes);
   zip.file(size===180?'apple-touch-icon.png':size===192?'icon-192.png':size===512?'icon-512.png':'favicon-'+size+'.png',bytes);
   canvas.width=canvas.height=0;
  }
  const sizes=[16,32,48],total=6+sizes.length*16+sizes.reduce((s,n)=>s+pngs.get(n).length,0);
  const ico=new Uint8Array(total),view=new DataView(ico.buffer);
  view.setUint16(0,0,true);view.setUint16(2,1,true);view.setUint16(4,sizes.length,true);
  let offset=6+sizes.length*16;
  sizes.forEach((size,i)=>{
   const at=6+i*16,bytes=pngs.get(size);
   ico[at]=size;ico[at+1]=size;ico[at+2]=0;ico[at+3]=0;
   view.setUint16(at+4,1,true);view.setUint16(at+6,32,true);
   view.setUint32(at+8,bytes.length,true);view.setUint32(at+12,offset,true);
   ico.set(bytes,offset);offset+=bytes.length;
  });
  zip.file('favicon.ico',ico);
  zip.file('README.txt','YorpHives favicon pack\n\nCopy favicon.ico and your chosen PNG icons to the web root.\n<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n');
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:4}});
  return output(new Blob([bytes],{type:'application/zip'}),'yorphives-favicon-pack.zip','Generated .ico and six PNG icon sizes in a single ZIP file.');
 }finally{bitmap.close();}
}
export const WAVE4_IDS=Object.freeze(['subtitle-converter','social-preview-builder','quotation-generator','certificate-generator','favicon-generator']);
export async function processWave4(id,files=[],opts={}){
 if(!WAVE4_IDS.includes(id))throw Error('Unknown YorpHives Wave 4 utility.');
 if(id==='subtitle-converter')return subtitleTool(files,opts);
 if(id==='social-preview-builder')return socialTool(opts);
 if(id==='quotation-generator')return quotePdf(opts);
 if(id==='certificate-generator')return certificatePdf(opts);
 return favicon(files);
}
