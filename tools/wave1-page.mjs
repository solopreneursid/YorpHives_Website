import {processWave1} from './wave1-core.mjs';
const byId=id=>document.getElementById(id);
const form=byId('wave1-form'),picker=byId('wave1-file'),run=byId('wave1-run'),status=byId('wave1-status');
const result=byId('wave1-result'),download=byId('wave1-download'),preview=byId('wave1-preview');
const textWrap=byId('wave1-text-wrap'),textArea=byId('wave1-text'),copy=byId('wave1-copy');
const id=document.body.dataset.wave1;
let revision=0,url='';
const message=(s,err=false)=>{status.textContent=s;status.classList.toggle('error',err);};
function clear(){
 revision++;if(url){URL.revokeObjectURL(url);url='';}
 result.hidden=true;download.hidden=true;download.removeAttribute('href');
 preview.hidden=true;preview.removeAttribute('src');
 textWrap.hidden=true;textArea.value='';copy.hidden=true;
 message('');
}
form.addEventListener('input',event=>{if(!event.target.closest('button'))clear();});
form.addEventListener('reset',()=>{clear();});
form.addEventListener('submit',async event=>{
 event.preventDefault();const token=++revision;
 if(url){URL.revokeObjectURL(url);url='';}
 result.hidden=true;download.hidden=true;preview.hidden=true;textWrap.hidden=true;copy.hidden=true;
 const fields=Object.fromEntries([...new FormData(form)].filter(([k])=>k!=='files'));
 const files=picker?[...(picker.files||[])]:[];
 run.disabled=true;message('Processing privately on this device…');
 try{
  const output=await processWave1(id,files,fields);
  if(token!==revision)return;
  if(!(output.blob instanceof Blob)||!output.blob.size||!output.filename)throw Error('The tool did not produce a valid file.');
  url=URL.createObjectURL(output.blob);
  download.href=url;download.download=output.filename;download.textContent='Download '+output.filename;download.hidden=false;
  if(output.image){preview.src=url;preview.hidden=false;}
  if(output.text!==undefined){textArea.value=output.text;textWrap.hidden=false;copy.hidden=false;}
  result.hidden=false;message(output.summary||'Your output is ready.');
 }catch(error){if(token===revision)message(error?.message||'This tool could not finish processing.',true);}
 finally{run.disabled=false;}
});
copy.addEventListener('click',async()=>{
 try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(textArea.value);message('Copied to clipboard.');}
 catch{try{textArea.focus();textArea.select();}catch{}message('Select and copy the result.');}
});
window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url);});
run.textContent='Create result';run.disabled=false;
