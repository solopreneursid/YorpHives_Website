import { processFileTool, imageDimensions } from './file-core.mjs';
const $=id=>document.getElementById(id);
const form=$('file-tool-form'),picker=$('file-input'),list=$('file-list'),button=$('file-run'),status=$('file-status');
const result=$('file-result'),download=$('file-download'),output=$('file-output'),image=$('file-preview'),copy=$('file-copy');
let files=[],revision=0,blobUrl=null;
function message(value,error=false){status.textContent=value;status.classList.toggle('error',error);}
function clear(){revision++;result.hidden=true;output.value='';output.closest('label').hidden=true;copy.hidden=true;image.hidden=true;image.removeAttribute('src');download.hidden=true;download.removeAttribute('href');if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;message('');}
function fileSize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1048576)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1048576).toFixed(2)} MB`;}
function showFiles(){
  list.replaceChildren();list.hidden=files.length===0;
  files.forEach((file,index)=>{
    const li=document.createElement('li'),name=document.createElement('span');name.textContent=`${file.name} · ${fileSize(file.size)}`;li.append(name);
    if(files.length>1){
      for(const [offset,label] of [[-1,'Move up'],[1,'Move down']]){
        const b=document.createElement('button');b.type='button';b.className='file-order';b.textContent=offset<0?'↑':'↓';b.setAttribute('aria-label',`${label}: ${file.name}`);b.disabled=index+offset<0||index+offset>=files.length;
        b.addEventListener('click',()=>{const other=index+offset;[files[index],files[other]]=[files[other],files[index]];clear();showFiles();});li.append(b);
      }
    }
    list.append(li);
  });
}
picker.addEventListener('change',async()=>{
  clear();files=[...(picker.files||[])];if(files.length>20){files=[];picker.value='';message('Choose no more than 20 files.',true);}showFiles();
  if(files.length===1 && ['image-cropper','image-rotate-flip','image-watermark'].includes(document.body.dataset.filetool)){
    const token=revision;try{const dims=await imageDimensions(files[0]);if(token===revision)message(`Selected image: ${dims.width} × ${dims.height} pixels.`);}catch(error){if(token===revision)message(error.message,true);}
  }
});
form.addEventListener('input',event=>{if(event.target!==picker)clear();});
form.addEventListener('reset',()=>{files=[];clear();showFiles();});
form.addEventListener('submit',async event=>{
  event.preventDefault();const token=++revision;result.hidden=true;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;download.hidden=true;image.hidden=true;output.closest('label').hidden=true;copy.hidden=true;
  const data=Object.fromEntries([...new FormData(form)].filter(([key])=>key!=='files'));button.disabled=true;message('Processing locally…');
  try{
    const value=await processFileTool(document.body.dataset.filetool,files,data);if(token!==revision)return;
    blobUrl=URL.createObjectURL(value.blob);download.href=blobUrl;download.download=value.filename;download.textContent=`Download ${value.filename}`;download.hidden=false;
    if(value.image){image.src=blobUrl;image.hidden=false;}
    if(value.text!==undefined){output.value=value.text;output.closest('label').hidden=false;copy.hidden=false;}
    result.hidden=false;message(value.summary);
    window.dispatchEvent(new Event('yorphives:tool-completed'));
  }catch(error){if(token===revision)message(error?.message||'Could not process the selected file.',true);}
  finally{button.disabled=false;}
});
copy.addEventListener('click',async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(output.value);message('Copied to clipboard.');}catch{output.focus();output.select();message('Select and copy the result using your keyboard.');}});
window.addEventListener('pagehide',()=>{if(blobUrl)URL.revokeObjectURL(blobUrl);});
button.textContent=picker.multiple?'Process files':'Process file';button.disabled=false;
