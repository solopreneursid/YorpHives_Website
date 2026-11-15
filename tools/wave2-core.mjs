// YorpHives Wave 2 — browser-only engines. No outbound network requests.
// Heavy local libraries are imported only after a user asks to process a file.
const MB=1048576;
const pdfLib=()=>import('./vendor/pdf-lib.mjs');
function validateFiles(files,min,max,maxEach=15*MB,maxTotal=36*MB){
 if(!Array.isArray(files)||files.length<min||files.length>max)throw Error('Choose '+(min===max?min:min+'–'+max)+' file(s).');
 let total=0;
 for(const file of files){
  if(!file||!Number.isFinite(file.size)||file.size<1||file.size>maxEach)throw Error('Each file must be non-empty and at most '+Math.floor(maxEach/MB)+' MB.');
  total+=file.size;
 }
 if(total>maxTotal)throw Error('The selected files exceed the '+Math.floor(maxTotal/MB)+' MB combined limit.');
}
const output=(bytes,filename,summary,mime,additional={})=>({
 blob:bytes instanceof Blob?bytes:new Blob([bytes],{type:mime}),filename,summary,...additional
});
async function readPdf(file){
 validateFiles([file],1,1);
 if(!new TextDecoder('latin1').decode(await file.slice(0,8).arrayBuffer()).startsWith('%PDF-'))throw Error('Select an actual PDF document.');
 const {PDFDocument}=await pdfLib();
 try{
  const pdf=await PDFDocument.load(new Uint8Array(await file.arrayBuffer()),{ignoreEncryption:false});
  if(pdf.getPageCount()>120||pdf.getPageCount()<1)throw Error('Use a PDF containing 1–120 pages.');
  return pdf;
 }catch(error){
  if(/1–120/.test(error?.message||''))throw error;
  throw Error('This PDF cannot be edited locally. It might be encrypted, damaged, or unsupported.');
 }
}
function formType(field){
 const type=field?.constructor?.name||'';
 return ({PDFTextField:'text',PDFCheckBox:'checkbox',PDFDropdown:'select',PDFOptionList:'select',PDFRadioGroup:'select'})[type]||null;
}
export async function inspectPdfFields(file){
 const pdf=await readPdf(file),fields=pdf.getForm().getFields();
 if(fields.length>80)throw Error('This PDF has more than 80 fields; use a smaller form.');
 const result=[];
 for(const f of fields){
  const type=formType(f);
  if(!type)continue;
  const name=f.getName();
  const options=type==='select'&&typeof f.getOptions==='function'?f.getOptions():[];
  result.push({name,type,options,default:type==='text'?(f.getText()||''):type==='checkbox'?f.isChecked():''});
 }
 if(!result.length)throw Error('No fillable text, checkbox, or choice fields were found. This may be a scanned or flattened PDF.');
 return result;
}
async function fillPdf(files,formValues){
 const pdf=await readPdf(files[0]),form=pdf.getForm();
 const fields=form.getFields();
 if(fields.length>80)throw Error('This PDF has too many fields.');
 let updated=0;
 for(const f of fields){
  const type=formType(f),name=f.getName();
  if(!type||!Object.hasOwn(formValues,name))continue;
  const value=formValues[name];
  if(type==='text'){if(String(value).length>1800)throw Error('A form field is too long.');f.setText(String(value));updated++;}
  else if(type==='checkbox'){value===true||value==='true'?f.check():f.uncheck();updated++;}
  else if(type==='select'&&String(value).trim()){const options=f.getOptions?.()||[];if(!options.includes(value))throw Error('Choose a valid option for '+name+'.');f.select(value);updated++;}
 }
 if(!updated)throw Error('No supported fields were updated.');
 try{return output(await pdf.save({useObjectStreams:true}),'yorphives-filled-form.pdf','Filled '+updated+' PDF form field(s). Review the exported document before sharing.','application/pdf');}
 catch{throw Error('PDF export failed. Some forms use unsupported fonts or widgets.');}
}
async function flattenPdf(files){
 const pdf=await readPdf(files[0]),form=pdf.getForm(),count=form.getFields().length;
 if(!count)throw Error('This PDF has no interactive form fields to flatten.');
 try{form.flatten({updateFieldAppearances:true});}
 catch{throw Error('This PDF has unsupported form appearance data and cannot be flattened safely.');}
 return output(await pdf.save({useObjectStreams:true}),'yorphives-flattened.pdf','Flattened '+count+' form field(s). Field values are no longer editable; signatures may be invalidated.','application/pdf');
}
const safeEntry=name=>{
 const norm=String(name).replaceAll('\\','/');
 return norm&&!norm.startsWith('/')&&!/^[a-zA-Z]:/.test(norm)&&!norm.split('/').some(s=>s==='..'||s==='.')&&!/[\u0000-\u001f\u007f]/.test(norm)&&norm.length<=240;
};
async function extractZip(files){
 validateFiles(files,1,1,24*MB,24*MB);
 const file=files[0];
 const header=new Uint8Array(await file.slice(0,4).arrayBuffer());
 if(header[0]!==80||header[1]!==75)throw Error('Select a genuine ZIP archive.');
 const JSZip=(await import('./vendor/jszip.mjs')).default;
 let archive;
 try{archive=await JSZip.loadAsync(file,{createFolders:false});}
 catch{throw Error('The ZIP archive could not be opened. It might be encrypted or damaged.');}
 const entries=Object.values(archive.files).filter(e=>!e.dir);
 if(!entries.length||entries.length>50)throw Error('Use an archive with 1–50 files.');
 const total=entries.reduce((sum,e)=>{
  const size=e._data?.uncompressedSize;
  if(!safeEntry(e.name)||(e.unsafeOriginalName&&(!safeEntry(e.unsafeOriginalName)||e.unsafeOriginalName!==e.name)))throw Error('The archive contains an unsafe file path.');
  if(!Number.isFinite(size)||size<0||size>15*MB)throw Error('An archive entry is too large or has an unknown size.');
  return sum+size;
 },0);
 if(total>40*MB)throw Error('Archive expansion exceeds the 40 MB safety limit.');
 const used=new Set(),downloads=[];
 for(const entry of entries){
  const name=entry.name.split('/').at(-1);
  if(!name||used.has(name))throw Error('Duplicate or empty output filename. Rename entries before extracting.');
  used.add(name);
  let content;
  try{content=await entry.async('uint8array');}catch{throw Error('Could not safely decompress '+name+'.');}
  if(content.length>15*MB||content.length!==entry._data.uncompressedSize)throw Error('Archive entry failed its size check.');
  downloads.push({blob:new Blob([content]),filename:name});
 }
 return {downloads,summary:'Extracted '+downloads.length+' file(s) locally. Download the files you need.'};
}
export function parseCsv(text){
 const source=String(text).replace(/^\uFEFF/,'');
 if(source.length>8*MB)throw Error('CSV text is too large.');
 const rows=[],row=[];let field='',quoted=false,atStart=true,afterQuote=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quoted){
   if(c==='"'&&source[i+1]==='"'){field+='"';i++;}
   else if(c==='"'){quoted=false;afterQuote=true;}
   else field+=c;
  }else if(c==='"'&&atStart){quoted=true;atStart=false;}
  else if(c===','){row.push(field);field='';atStart=true;afterQuote=false;}
  else if(c==='\r'||c==='\n'){
   if(c==='\r'&&source[i+1]==='\n')i++;
   row.push(field);rows.push([...row]);row.length=0;field='';atStart=true;afterQuote=false;
  }else{
   if(afterQuote&&!/\s/.test(c))throw Error('Invalid characters after a CSV closing quote.');
   if(c==='"'&&!atStart)throw Error('Unexpected quote inside a CSV field.');
   if(!afterQuote)field+=c;
   atStart=false;
  }
 }
 if(quoted)throw Error('CSV has an unclosed quoted value.');
 if(field||row.length||(!source.endsWith('\n')&&!source.endsWith('\r')&&source.length)){row.push(field);rows.push(row);}
 if(rows.length>20000)throw Error('CSV has more than 20,000 rows.');
 return rows;
}
const csvCell=value=>/[",\r\n]/.test(value)?'"'+value.replaceAll('"','""')+'"':value;
export function cleanCsv(text,options={}){
 const rows=parseCsv(text);
 if(!rows.length)throw Error('The CSV file is empty.');
 const trim=options.trim!==false&&options.trim!=='false',dropBlank=options.dropBlank!==false&&options.dropBlank!=='false',dropDuplicates=options.dropDuplicates!==false&&options.dropDuplicates!=='false';
 const cleaned=rows.map(row=>row.map(cell=>trim?cell.trim():cell));
 const header=cleaned.shift();const width=header.length;
 if(cleaned.some(row=>row.length!==width))throw Error('Rows have different column counts. Fix the CSV structure before cleaning.');
 const unique=new Set(),data=[];
 for(const row of cleaned){
  if(dropBlank&&row.every(x=>!x))continue;
  const key=JSON.stringify(row);
  if(dropDuplicates&&unique.has(key))continue;
  unique.add(key);data.push(row);
 }
 const final=[header,...data].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
 return {text:final,removed:cleaned.length-data.length,rows:data.length,columns:width};
}
async function csvCleaner(files,opts){
 validateFiles(files,1,1,8*MB,8*MB);
 if(!/\.csv$/i.test(files[0].name))throw Error('Choose a .csv file.');
 const result=cleanCsv(await files[0].text(),opts);
 return output(new Blob([result.text],{type:'text/csv;charset=utf-8'}),'yorphives-cleaned.csv','Cleaned '+result.rows+' data row(s); removed '+result.removed+'.','text/csv;charset=utf-8',{text:result.text.slice(0,6000)});
}
function canvas(width,height){
 if(typeof document==='undefined')throw Error('A graphical browser is required.');
 if(width*height>20000000||width>6000||height>6000)throw Error('The collage is too large for this device.');
 const c=document.createElement('canvas');c.width=width;c.height=height;return c;
}
async function collage(files,opts){
 validateFiles(files,2,9,12*MB,36*MB);
 if(typeof createImageBitmap!=='function')throw Error('Image collage requires a browser that supports local image decoding.');
 const columns=opts.columns==='2'?2:3,cellW=720,cellH=540,gap=14,edge=24;
 const rows=Math.ceil(files.length/columns),width=columns*cellW+(columns-1)*gap+edge*2,height=rows*cellH+(rows-1)*gap+edge*2;
 const c=canvas(width,height),ctx=c.getContext('2d');if(!ctx)throw Error('Canvas is unavailable.');
 ctx.fillStyle='#f8fbf9';ctx.fillRect(0,0,width,height);
 for(let i=0;i<files.length;i++){
  const file=files[i],sig=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const valid=(sig[0]===255&&sig[1]===216)||(sig[0]===137&&sig[1]===80)||String.fromCharCode(...sig.slice(0,4))==='RIFF';
  if(!valid)throw Error('Only JPEG, PNG, and WebP pictures are supported.');
  let image;try{image=await createImageBitmap(file);}catch{throw Error('Could not open '+file.name+'.');}
  try{
   if(image.width*image.height>25000000)throw Error('An image exceeds the 25-megapixel limit.');
   const x=edge+(i%columns)*(cellW+gap),y=edge+Math.floor(i/columns)*(cellH+gap);
   const scale=Math.max(cellW/image.width,cellH/image.height),w=image.width*scale,h=image.height*scale;
   ctx.save();ctx.beginPath();ctx.roundRect(x,y,cellW,cellH,14);ctx.clip();
   ctx.drawImage(image,x+(cellW-w)/2,y+(cellH-h)/2,w,h);ctx.restore();
  }finally{image.close();}
 }
 const mime=opts.format==='jpeg'?'image/jpeg':'image/png';
 const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Image export failed.')),mime,.9));
 c.width=c.height=0;
 return output(blob,'yorphives-collage.'+(mime==='image/png'?'png':'jpg'),'Combined '+files.length+' photos into a '+columns+'-column collage.',mime,{image:true});
}
async function resume(opts){
 const fields=['fullName','headline','email','phone','location','summary','skills','experience','education','projects'];
 const data={};for(const k of fields){data[k]=String(opts[k]??'').trim();if(data[k].length>(['experience','education','projects'].includes(k)?3500:1200))throw Error(k+' is too long.');}
 if(!data.fullName||!data.email||!data.experience)throw Error('Enter your name, email, and experience.');
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email))throw Error('Enter a valid email.');
 const {PDFDocument,StandardFonts,rgb}=await pdfLib(),pdf=await PDFDocument.create();
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const dark=rgb(.08,.16,.17),muted=rgb(.39,.46,.48),accent=rgb(.08,.47,.4);
 let page,y;
 const newPage=()=>{if(pdf.getPageCount()>=4)throw Error('This resume exceeds four pages. Shorten some sections.');page=pdf.addPage([595,842]);y=785;};
 newPage();
 function safe(s){
  const value=s.replace(/\t/g,' ').replace(/[\u2022\u2014\u2013]/g,'-');
  try{regular.encodeText(value);return value;}catch{throw Error('This PDF font supports Latin characters only. Remove unsupported symbols or emojis.');}
 }
 function wrap(value,size,font,width){
  const output=[];
  for(const block of safe(value).split(/\r?\n/)){
   const words=block.trim().split(/\s+/).filter(Boolean);let line='';
   if(!words.length){output.push('');continue;}
   for(const word of words){
    if(font.widthOfTextAtSize(word,size)>width)throw Error('A word is too long for the resume layout.');
    const next=line?line+' '+word:word;
    if(line&&font.widthOfTextAtSize(next,size)>width){output.push(line);line=word;}else line=next;
   }
   output.push(line);
  }
  return output;
 }
 function lines(value,size=10,color=dark,font=regular,width=495){
  const rows=wrap(value,size,font,width);
  for(const row of rows){
   if(y<70)newPage();
   if(row)page.drawText(row,{x:50,y,size,font,color});
   y-=size*1.48;
  }
 }
 function section(title,value){
  if(!value)return;
  if(y<115)newPage();y-=16;
  page.drawText(title.toUpperCase(),{x:50,y,size:10.5,font:bold,color:accent});y-=22;lines(value,10.4);
 }
 lines(data.fullName,24,dark,bold);
 if(data.headline)lines(data.headline,12,accent,bold);
 lines([data.email,data.phone,data.location].filter(Boolean).join('  |  '),9.4,muted);
 y-=8;page.drawRectangle({x:50,y,width:495,height:2,color:accent});y-=12;
 section('Profile',data.summary);
 section('Skills',data.skills);
 section('Experience',data.experience);
 section('Education',data.education);
 section('Projects',data.projects);
 return output(await pdf.save({useObjectStreams:true}),'yorphives-resume.pdf','Created a '+pdf.getPageCount()+'-page resume. Proofread it before applying.','application/pdf');
}
export const WAVE2_IDS=Object.freeze(['pdf-form-filler','pdf-flatten','zip-extractor','csv-cleaner','image-collage-maker','resume-builder']);
export async function processWave2(id,files=[],options={}){
 if(!WAVE2_IDS.includes(id))throw Error('Unknown YorpHives utility.');
 if(id==='pdf-form-filler'){validateFiles(files,1,1);return fillPdf(files,options.values||{});}
 if(id==='pdf-flatten'){validateFiles(files,1,1);return flattenPdf(files);}
 if(id==='zip-extractor')return extractZip(files);
 if(id==='csv-cleaner')return csvCleaner(files,options);
 if(id==='image-collage-maker')return collage(files,options);
 return resume(options);
}
