import{comparePdfs}from'./pdf-compare-core.mjs';
const form=document.getElementById('compare-form'),file=document.getElementById('compare-files'),
 status=document.getElementById('compare-status'),run=document.getElementById('compare-run'),result=document.getElementById('compare-result'),download=document.getElementById('compare-download');
let url='';
const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
function clear(){
 if(url)URL.revokeObjectURL(url);url='';download.removeAttribute('href');result.hidden=true;message('');
}
file.addEventListener('change',()=>{clear();run.disabled=file.files?.length!==2;message(file.files?.length===2?'Ready to compare both PDFs.':'Choose exactly two PDFs.');});
form.addEventListener('reset',()=>setTimeout(()=>{clear();run.disabled=true;},0));
form.addEventListener('submit',async event=>{
 event.preventDefault();clear();if(file.files?.length!==2){message('Choose exactly two PDF files.',true);return;}
 run.disabled=true;message('Rendering both PDFs and comparing pixels privately…');
 try{
  const out=await comparePdfs([...file.files],{onProgress:p=>message('Comparing page '+p.page+' of '+p.total+'…')});
  url=URL.createObjectURL(out.blob);download.href=url;download.download=out.filename;
  result.hidden=false;message(out.summary);
 }catch(error){message(error.message||'Unable to compare files.',true);}
 finally{run.disabled=false;}
});
window.addEventListener('pagehide',clear);
