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
function latin(text){
 const value=text.replace(/[\u2010-\u2015]/g,'-').replace(/[\u2022]/g,'*');
 if(/[^\x20-\x7E\n\r]/.test(value))throw Error('The PDF generator currently supports standard Latin text without emojis or non-Latin scripts.');
 return value;
}
const money=(value,label)=>{
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||n>10000000)throw Error('Enter a valid '+label+' between 0 and 10,000,000.');
 return n;
};
function wrap(text,font,size,width){
 const lines=[];
 for(const para of latin(text).split(/\r?\n/)){
  if(!para.trim()){lines.push('');continue;}
  let line='';
  for(const word of para.trim().split(/\s+/)){
   if(font.widthOfTextAtSize(word,size)>width)throw Error('A long word does not fit in the PDF layout.');
   const next=line?line+' '+word:word;
   if(font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}
async function quotePdf(opts){
 const business=field(opts,'business',90,true),client=field(opts,'client',90,true),reference=field(opts,'reference',45),notes=field(opts,'notes',400);
 const entries=field(opts,'items',1800,true).split('\n').map(x=>x.trim()).filter(Boolean);
 if(entries.length<1||entries.length>10)throw Error('Enter 1–10 items, one per line.');
 const currency=(field(opts,'currency',3)||'USD').toUpperCase();
 if(!/^[A-Z]{3}$/.test(currency))throw Error('Use a three-letter currency code, such as USD or INR.');
 const tax=money(opts.tax??0,'tax percentage');
 if(tax>100)throw Error('Tax cannot exceed 100%.');
 const parsed=entries.map((text,index)=>{
  const parts=text.split('|').map(x=>x.trim());
  if(parts.length!==3||!parts[0]||parts[0].length>70)throw Error('Item '+(index+1)+': use Description | Quantity | Unit Price.');
  const qty=money(parts[1],'item quantity'),price=money(parts[2],'unit price');
  if(qty<=0||qty>10000)throw Error('Item quantity must be greater than zero and at most 10,000.');
  return {desc:latin(parts[0]),qty,price,total:Math.round(qty*price*100)/100};
 });
 const subtotal=Math.round(parsed.reduce((sum,item)=>sum+item.total,0)*100)/100;
 if(subtotal>1e8)throw Error('Quotation total is too large.');
 const taxAmount=Math.round(subtotal*tax)/100;
 const total=subtotal+taxAmount;
 const doc=await PDFDocument.create(),page=doc.addPage([595,842]);
 const normal=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const dark=rgb(.08,.17,.16),green=rgb(.07,.45,.31),muted=rgb(.38,.46,.43),line=rgb(.83,.9,.85),white=rgb(1,1,1);
 const text=(s,x,y,size=10,font=normal,color=dark)=>{
  const val=latin(String(s));page.drawText(val,{x,y,size,font,color});
 };
 page.drawRectangle({x:0,y:770,width:595,height:72,color:green});
 text('QUOTATION',43,799,24,bold,white);
 text(business,43,750,15,bold);
 text('Prepared for: '+client,43,727,11,normal,muted);
 if(reference)text('Reference: '+reference,43,710,10,normal,muted);
 text('Description',43,663,10,bold,green);
 text('Qty',363,663,10,bold,green);text('Price',424,663,10,bold,green);text('Amount',510,663,10,bold,green);
 page.drawRectangle({x:43,y:653,width:510,height:1,color:line});
 let y=635;
 const right=(val,x,yy)=>{const t=String(val);text(t,x-normal.widthOfTextAtSize(t,10),yy);};
 for(const item of parsed){
  const parts=wrap(item.desc,normal,10,290);
  parts.forEach((part,i)=>text(part,43,y-i*13,10));
  right(item.qty.toString(),388,y);right(item.price.toFixed(2),478,y);right(item.total.toFixed(2),551,y);
  y-=Math.max(1,parts.length)*13+11;
  page.drawRectangle({x:43,y:y+7,width:510,height:.6,color:line});
  if(y<230)throw Error('Your quotation needs shorter descriptions or fewer items.');
 }
 y-=30;
 text('Subtotal',374,y,11,bold);right(subtotal.toFixed(2),551,y);y-=25;
 text('Tax ('+tax.toFixed(2)+'%)',374,y,10);right(taxAmount.toFixed(2),551,y);y-=34;
 page.drawRectangle({x:354,y:y-18,width:200,height:43,color:green});
 text('TOTAL',368,y-1,12,bold,white);
 const final=currency+' '+total.toFixed(2);text(final,552-bold.widthOfTextAtSize(final,12),y-1,12,bold,white);
 if(notes){
  text('NOTES',43,146,10,bold,green);
  wrap(notes,normal,10,500).slice(0,5).forEach((x,i)=>text(x,43,124-i*15));
 }
 text('Prepared with YorpHives · Estimates are not tax or legal advice.',43,31,9,normal,muted);
 return output(new Blob([await doc.save()],{type:'application/pdf'}),'yorphives-quotation.pdf','Created your itemized quotation with subtotal, tax and total.');
}
async function certificatePdf(opts){
 const recipient=field(opts,'recipient',95,true),title=field(opts,'title',85,true),organization=field(opts,'organization',100,true);
 const detail=field(opts,'detail',220)||'For outstanding participation and achievement.';
 const date=field(opts,'date',45)||new Date().toISOString().slice(0,10);
 const doc=await PDFDocument.create(),page=doc.addPage([842,595]);
 const regular=await doc.embedFont(StandardFonts.TimesRoman),bold=await doc.embedFont(StandardFonts.TimesRomanBold);
 const ink=rgb(.11,.24,.22),accent=rgb(.05,.46,.32),muted=rgb(.40,.46,.43),gold=rgb(.72,.52,.22);
 page.drawRectangle({x:26,y:26,width:790,height:543,borderWidth:3,borderColor:gold});
 page.drawRectangle({x:40,y:40,width:762,height:515,borderWidth:1,borderColor:accent});
 const center=(s,y,size,font=regular,color=ink)=>{
  const t=latin(s);const width=font.widthOfTextAtSize(t,size);
  if(width>720)throw Error('A certificate field is too long for the layout.');
  page.drawText(t,{x:(842-width)/2,y,size,font,color});
 };
 center('CERTIFICATE OF ACHIEVEMENT',460,26,bold,accent);
 center('PRESENTED TO',403,13,regular,muted);
 center(recipient,342,36,bold,ink);
 page.drawRectangle({x:262,y:316,width:318,height:2,color:gold});
 center(title,275,18,bold,accent);
 const lines=wrap(detail,regular,15,640).slice(0,2);
 lines.forEach((s,i)=>center(s,230-i*24,15));
 center('Issued by '+organization,153,16,bold);
 center('Date: '+date,119,13,regular,muted);
 center('Created with YorpHives · Not an accredited credential',72,10,regular,muted);
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
 const input=files?.[0],raw=input instanceof Blob?(input.size<=3*MB?await input.text():(()=>{throw Error('Subtitle file is too large.');})()):field(opts,'subtitleText',3*MB,true);
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
