import {processWave1,PDF_COMPRESSION_PRESETS} from '../wave1-core.mjs';
const form=document.getElementById('pdf-compressor-form');
const picker=document.getElementById('pdf-compressor-file');
const status=document.getElementById('pdf-compressor-status');
const result=document.getElementById('pdf-compressor-result');
const sizes=document.getElementById('pdf-compressor-sizes');
const outcome=document.getElementById('pdf-compressor-outcome');
const download=document.getElementById('pdf-compressor-download');
let revision=0,processing=false,completed=0,downloadUrl='';
const formatSize=size=>size>=1048576?(size/1048576).toFixed(2)+' MB':(size/1024).toFixed(1)+' KB';
function clearOutput(){
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl='';}
 result.hidden=true;download.hidden=true;download.removeAttribute('href');
 sizes.textContent='';outcome.textContent='';
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
    message('Choose a PDF to begin.');
    continue;
   }
   if(!Object.hasOwn(PDF_COMPRESSION_PRESETS,selected)){
    completed=current;message('Choose a compression level.',true);continue;
   }
   if(file.size===0){
    completed=current;message('Choose a non-empty PDF.',true);continue;
   }
   clearOutput();
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
    sizes.textContent='Before: '+formatSize(file.size)+'    →    After: '+formatSize(output.blob.size);
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
