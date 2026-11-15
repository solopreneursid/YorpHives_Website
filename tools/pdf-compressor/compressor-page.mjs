import {processWave1,PDF_COMPRESSION_PRESETS} from '../wave1-core.mjs';
const form=document.getElementById('pdf-compressor-form');
const picker=document.getElementById('pdf-compressor-file');
const status=document.getElementById('pdf-compressor-status');
const result=document.getElementById('pdf-compressor-result');
const sizes=document.getElementById('pdf-compressor-sizes');
const outcome=document.getElementById('pdf-compressor-outcome');
const fileTitle=document.getElementById('cpx-file-title');
const fileSubtitle=document.getElementById('cpx-file-subtitle');
const beforeSize=document.getElementById('cpx-before');
const afterSize=document.getElementById('cpx-after');
const saved=document.getElementById('cpx-saved');
const dropzone=document.getElementById('cpx-dropzone');
const download=document.getElementById('pdf-compressor-download');
let revision=0,processing=false,completed=0,downloadUrl='';
const formatSize=size=>size>=1048576?(size/1048576).toFixed(2)+' MB':(size/1024).toFixed(1)+' KB';
function clearOutput(){
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl='';}
 result.hidden=true;download.hidden=true;download.removeAttribute('href');
 beforeSize.textContent='—';afterSize.textContent='—';saved.textContent='';saved.hidden=true;outcome.textContent='';
}
function message(text,isError=false){
 status.textContent=text;
 status.classList.toggle('error',isError);
}
async function processLatest(){
 if(processing)return;
 processing=true;
 form.setAttribute('aria-busy','true');
 try{
  while(completed!==revision){
   const current=revision;
   const file=picker.files?.[0];
   const selected=form.elements.namedItem('compression')?.value||'best';
   if(!file){
    completed=current;
    fileTitle.textContent='Choose a PDF file';
    fileSubtitle.textContent='Click to browse or drag and drop your file';
    message('Ready when you are. Choose a PDF above.');
    continue;
   }
   if(!Object.hasOwn(PDF_COMPRESSION_PRESETS,selected)){
    completed=current;message('Choose a compression level.',true);continue;
   }
   if(file.size===0){
    completed=current;message('Choose a non-empty PDF.',true);continue;
   }
   clearOutput();
   fileTitle.textContent=file.name;
   fileSubtitle.textContent=formatSize(file.size)+' · Ready to compress';
   message('Compressing your PDF on this device…');
   try{
    const output=await processWave1('pdf-compressor',[file],{preset:selected});
    completed=current;
    if(current!==revision)continue;
    if(!(output.blob instanceof Blob)||!output.blob.size||!output.filename)throw Error('Could not create a downloadable PDF.');
    downloadUrl=URL.createObjectURL(output.blob);
    download.href=downloadUrl;
    download.download=output.filename;
    const original=output.filename==='yorphives-pdf-original.pdf';
    download.textContent=original?'Download original PDF':'Download compressed PDF';
    beforeSize.textContent=formatSize(file.size);
    afterSize.textContent=formatSize(output.blob.size);
    const percent=Math.round((1-output.blob.size/file.size)*100);
    if(!original&&percent>0){saved.hidden=false;saved.textContent=percent+'% smaller';}
    outcome.textContent=original?'This file could not be reduced with the chosen level. The original file is unchanged.':output.summary;
    result.hidden=false;download.hidden=false;
    message(original?'Original PDF ready.':'Your compressed PDF is ready.');
   }catch(error){
    completed=current;
    if(current===revision)message(error?.message||'Could not compress this PDF.',true);
   }
  }
 }finally{
  processing=false;
  form.removeAttribute('aria-busy');
  // A selection may change after the loop's last check.
  if(completed!==revision)void processLatest();
 }
}
function changed(){
 revision++;
 clearOutput();
 void processLatest();
}
picker.addEventListener('change',changed);
for(const option of form.querySelectorAll('input[name="compression"]'))option.addEventListener('change',changed);
window.addEventListener('pagehide',()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl);});

// File dragging is optional: browsing via keyboard remains fully supported.
for(const eventName of ['dragenter','dragover'])dropzone.addEventListener(eventName,event=>{event.preventDefault();dropzone.classList.add('cpx-dragging');});
for(const eventName of ['dragleave','drop'])dropzone.addEventListener(eventName,event=>{event.preventDefault();dropzone.classList.remove('cpx-dragging');});
dropzone.addEventListener('drop',event=>{
 const file=[...(event.dataTransfer?.files||[])][0];if(!file)return;
 if(!file.name.toLowerCase().endsWith('.pdf')&&file.type!=='application/pdf'){message('Please choose a PDF file.',true);return;}
 const dt=new DataTransfer();dt.items.add(file);picker.files=dt.files;changed();
});
