import{processWave4}from'./wave4-core.mjs';
const form=document.getElementById('wave4-form'),id=document.body.dataset.wave4;
const input=document.getElementById('wave4-file'),status=document.getElementById('wave4-status');
const button=document.getElementById('wave4-run'),output=document.getElementById('wave4-output');
const saved=[];
function clear(){saved.forEach(x=>URL.revokeObjectURL(x));saved.length=0;output.hidden=true;output.replaceChildren();status.textContent='';status.classList.remove('error');}
const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
form.addEventListener('reset',()=>setTimeout(clear,0));
form.addEventListener('input',e=>{if(e.target!==button)clear();});
form.addEventListener('submit',async event=>{
 event.preventDefault();clear();button.disabled=true;message('Creating your result privately on this device…');
 try{
  const opts=Object.fromEntries(new FormData(form).entries());
  const files=input&&input.files?[...input.files]:[];
  const result=await processWave4(id,files,opts);
  const name=document.createElement('strong');name.textContent='Your file is ready';
  const link=document.createElement('a');link.className='tool-btn primary';
  const url=URL.createObjectURL(result.blob);saved.push(url);
  link.href=url;link.download=result.filename;link.textContent='↓ Download '+result.filename;
  output.append(name,link);
  if(result.text){
   const holder=document.createElement('label');holder.className='tool-field';holder.textContent='Preview / copy result';
   const textarea=document.createElement('textarea');textarea.readOnly=true;textarea.rows=7;textarea.value=result.text;textarea.className='wave4-code';holder.append(textarea);
   const copy=document.createElement('button');copy.className='tool-btn';copy.type='button';copy.textContent='Copy text';
   copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(result.text);copy.textContent='Copied!';}catch{textarea.focus();textarea.select();copy.textContent='Select and copy the text above';}});
   output.append(holder,copy);
  }
  if(result.preview){
   const v=result.preview;
   const card=document.createElement('div');card.className='wave4-social-preview';
   const small=document.createElement('span');small.textContent=v.site||new URL(v.url).hostname;
   const headline=document.createElement('h3');headline.textContent=v.title;
   const desc=document.createElement('p');desc.textContent=v.description;
   const urlNote=document.createElement('small');urlNote.textContent=v.url;
   card.append(small,headline,desc,urlNote);output.append(card);
  }
  output.hidden=false;message(result.summary);
 }catch(e){message(e?.message||'Processing failed. Try smaller inputs.',true);}
 finally{button.disabled=false;}
});
window.addEventListener('pagehide',clear);
