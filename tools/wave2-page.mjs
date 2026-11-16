import {inspectPdfFields,processWave2} from './wave2-core.mjs';
const form=document.getElementById('wave2-form');
const id=document.body.dataset.wave2;
const picker=document.getElementById('wave2-file');
const dynamic=document.getElementById('wave2-dynamic');
const status=document.getElementById('wave2-status');
const run=document.getElementById('wave2-run');
const results=document.getElementById('wave2-results');
let urls=[],revision=0,fieldReady=false;
const message=(value,error=false)=>{status.textContent=value;status.classList.toggle('error',error);};
function clearResult(){
 for(const url of urls)URL.revokeObjectURL(url);
 urls=[];results.replaceChildren();results.hidden=true;
}
function clear(){
 revision++;clearResult();message('');
 if(id==='pdf-form-filler'){dynamic.replaceChildren();fieldReady=false;run.disabled=true;}
}
function makeField(spec){
 const wrapper=document.createElement('label');wrapper.className='tool-field wave2-field';
 const caption=document.createElement('span');caption.textContent=spec.name;wrapper.append(caption);
 let control;
 if(spec.type==='checkbox'){
  control=document.createElement('input');control.type='checkbox';control.checked=Boolean(spec.default);wrapper.classList.add('wave2-toggle');
 }else if(spec.type==='select'){
  control=document.createElement('select');
  const empty=document.createElement('option');empty.value='';empty.textContent='Choose an option';control.append(empty);
  for(const choice of spec.options||[]){const item=document.createElement('option');item.value=choice;item.textContent=choice;control.append(item);}
 }else{
  control=document.createElement('input');control.type='text';control.value=spec.default||'';control.maxLength=1800;control.autocomplete='off';
 }
 control.dataset.pdfName=spec.name;control.setAttribute('aria-label',spec.name);
 wrapper.append(control);return wrapper;
}
if(picker&&id==='pdf-form-filler')picker.addEventListener('change',async()=>{
 clear();const token=revision;const file=picker.files?.[0];
 if(!file)return;
 message('Reading PDF fields on this device…');
 try{
  const fields=await inspectPdfFields(file);if(token!==revision)return;
  const heading=document.createElement('h2');heading.textContent='Fill the fields in your document';
  const info=document.createElement('p');info.textContent=fields.length+' editable fields detected. Leave any field unchanged if you do not want to update it.';
  const grid=document.createElement('div');grid.className='wave2-form-grid';
  fields.forEach(field=>grid.append(makeField(field)));
  dynamic.replaceChildren(heading,info,grid);fieldReady=true;run.disabled=false;
  message('Ready. Fill the fields and create your completed PDF.');
 }catch(error){if(token===revision)message(error.message||'Unable to read the form.',true);}
});
form.addEventListener('input',event=>{if(event.target!==picker){clearResult();message('');}});
form.addEventListener('reset',()=>{setTimeout(clear,0);});
form.addEventListener('submit',async event=>{
 event.preventDefault();const token=++revision;clearResult();
 if(id==='pdf-form-filler'&&!fieldReady){message('Choose a fillable PDF first.',true);return;}
 const files=picker?[...(picker.files||[])]:[];
 const options=Object.fromEntries([...new FormData(form)].filter(([key])=>key!=='files'));
 if(id==='pdf-form-filler'){
  const values=Object.create(null);
  for(const field of dynamic.querySelectorAll('[data-pdf-name]'))values[field.dataset.pdfName]=field.type==='checkbox'?field.checked:field.value;
  options.values=values;
 }
 if(id==='csv-cleaner')for(const key of ['trim','dropBlank','dropDuplicates'])options[key]=form.elements.namedItem(key).checked;
 run.disabled=true;message('Working privately on this device…');
 try{
  const output=await processWave2(id,files,options);
  if(token!==revision)return;
  const downloads=output.downloads||[{blob:output.blob,filename:output.filename}];
  if(!downloads.length||downloads.some(item=>!(item.blob instanceof Blob)||(!output.downloads&&!item.blob.size)))throw Error('No valid output was produced.');
  const heading=document.createElement('strong');heading.textContent=downloads.length===1?'Your file is ready':'Your extracted files are ready';
  const list=document.createElement('div');list.className='wave2-downloads';
  for(const item of downloads){
   const href=URL.createObjectURL(item.blob);urls.push(href);
   const a=document.createElement('a');a.className='tool-btn primary';a.href=href;a.download=item.filename;a.textContent='↓  '+item.filename;
   list.append(a);
  }
  results.append(heading,list);
  if(output.image){
   const preview=document.createElement('img');preview.alt='Generated collage preview';preview.className='wave2-image-preview';preview.src=urls[0];results.append(preview);
  }
  if(output.text){
   const label=document.createElement('label');label.className='tool-field';label.textContent='Preview';
   const textarea=document.createElement('textarea');textarea.readOnly=true;textarea.rows=6;textarea.value=output.text;label.append(textarea);results.append(label);
  }
  results.hidden=false;message(output.summary||'File is ready to download.');
  window.dispatchEvent(new Event('yorphives:tool-completed'));
 }catch(error){if(token===revision)message(error?.message||'This file could not be processed.',true);}
 finally{run.disabled=id==='pdf-form-filler'?!fieldReady:false;}
});
window.addEventListener('pagehide',clearResult);
if(id!=='pdf-form-filler'){run.disabled=false;run.textContent='Create my file';}else{run.textContent='Fill PDF';}
