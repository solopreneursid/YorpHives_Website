import {makeSearchablePdf} from './ocr-pdf-core.mjs';
const form=document.getElementById('ocr-form'),fileInput=document.getElementById('ocr-file'),
 run=document.getElementById('ocr-run'),status=document.getElementById('ocr-status'),
 result=document.getElementById('ocr-result'),download=document.getElementById('ocr-download');
let url='',token=0;
const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
function clear(){token++;if(url)URL.revokeObjectURL(url);url='';result.hidden=true;download.removeAttribute('href');message('');}
fileInput.addEventListener('change',()=>{clear();run.disabled=!fileInput.files?.length;});
form.addEventListener('reset',()=>setTimeout(()=>{clear();run.disabled=true;},0));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!fileInput.files?.length)return;
 clear();const now=++token;run.disabled=true;
 message('Reading this scan on your device. English OCR may take a little while…');
 try{
  const out=await makeSearchablePdf(fileInput.files[0],{onProgress:({page,total})=>{
   if(now===token)message('Recognizing page '+page+' of '+total+' privately…');
  }});
  if(now!==token)return;
  url=URL.createObjectURL(out.blob);download.href=url;download.download=out.filename;
  result.hidden=false;message(out.summary);
 }catch(error){if(now===token)message(error.message||'This scan could not be processed.',true);}
 finally{run.disabled=false;}
});
window.addEventListener('pagehide',clear);
