import {processWave3} from './wave3-core.mjs';
const byId=id=>document.getElementById(id);
const id=document.body.dataset.wave3,form=byId('wave3-form'),picker=byId('wave3-file'),run=byId('wave3-run'),
 status=byId('wave3-status'),out=byId('wave3-result'),download=byId('wave3-download'),
 visual=byId('wave3-preview'),audioPreview=byId('wave3-audio'),duration=byId('wave3-duration');
let outputUrl='',probeUrl='',revision=0;
const notice=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
function cleanOutput(){
 if(outputUrl)URL.revokeObjectURL(outputUrl);
 outputUrl='';out.hidden=true;download.removeAttribute('href');
 visual.hidden=true;visual.removeAttribute('src');
 audioPreview.hidden=true;audioPreview.removeAttribute('src');
}
function clear(){
 revision++;cleanOutput();notice('');
 if(probeUrl)URL.revokeObjectURL(probeUrl);
 probeUrl='';
}
async function audioMetadata(file,token){
 if(id!=='audio-trimmer')return;
 const preview=new Audio();probeUrl=URL.createObjectURL(file);preview.preload='metadata';preview.src=probeUrl;
 await new Promise((resolve,reject)=>{preview.onloadedmetadata=resolve;preview.onerror=()=>reject(Error('Cannot inspect the audio duration in this browser.'));});
 if(token!==revision)return;
 const seconds=preview.duration;
 if(!Number.isFinite(seconds)||seconds<=0)throw Error('This audio has an unsupported or unknown duration.');
 const end=Math.min(seconds,30),endInput=form.elements.namedItem('end'),startInput=form.elements.namedItem('start');
 endInput.value=end.toFixed(2);endInput.max=seconds.toFixed(2);startInput.max=seconds.toFixed(2);
 duration.textContent='Length: '+seconds.toFixed(1)+' seconds. Choose where your clip starts and ends.';
}
picker.addEventListener('change',async()=>{
 clear();const token=revision;const file=picker.files?.[0];run.disabled=true;
 if(!file)return;
 if(id==='audio-trimmer'){
  notice('Reading audio duration…');
  try{await audioMetadata(file,token);if(token===revision){notice('Ready to trim.');run.disabled=false;}}
  catch(e){if(token===revision)notice(e.message,true);}
 }else{run.disabled=false;notice('Photo selected. Choose your output format.');}
});
form.addEventListener('input',event=>{
 if(event.target===picker)return;
 cleanOutput();notice('');
});
form.addEventListener('reset',()=>{setTimeout(()=>{clear();run.disabled=true;duration&&(duration.textContent='');},0);});
form.addEventListener('submit',async event=>{
 event.preventDefault();const token=++revision;cleanOutput();run.disabled=true;
 const file=picker.files?.[0];if(!file){notice('Select a file to begin.',true);run.disabled=false;return;}
 const options=Object.fromEntries([...new FormData(form)].filter(([key])=>key!=='files'));
 notice('Processing on this device…');
 try{
  const result=await processWave3(id,[file],options);
  if(token!==revision)return;
  outputUrl=URL.createObjectURL(result.blob);
  download.href=outputUrl;download.download=result.filename;download.textContent='↓ Download '+result.filename;
  out.hidden=false;
  if(result.image){visual.src=outputUrl;visual.hidden=false;}
  else if(id==='audio-trimmer'){audioPreview.src=outputUrl;audioPreview.hidden=false;}
  notice(result.summary||'Ready to download.');
 }catch(e){if(token===revision)notice(e?.message||'Conversion could not finish.',true);}
 finally{run.disabled=false;}
});
window.addEventListener('pagehide',clear);
