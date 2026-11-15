import {trimVideo,probeVideoDuration} from './video-trim-core.mjs';
const byId=id=>document.getElementById(id);
const form=byId('video-form'),file=byId('video-file'),player=byId('video-original'),
 run=byId('video-run'),start=byId('video-start'),end=byId('video-end'),status=byId('video-status'),
 details=byId('video-info'),result=byId('video-result'),download=byId('video-download'),output=byId('video-output');
let sourceUrl='',resultUrl='',revision=0;
const notice=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
function resetResult(){
 if(resultUrl)URL.revokeObjectURL(resultUrl);
 resultUrl='';result.hidden=true;output.pause();output.removeAttribute('src');download.removeAttribute('href');
}
function clear(){
 revision++;resetResult();notice('');if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';
 player.pause();player.removeAttribute('src');player.hidden=true;details.textContent='';
}
file.addEventListener('change',()=>{
 clear();const selected=file.files?.[0];run.disabled=true;
 if(!selected)return;
 sourceUrl=URL.createObjectURL(selected);player.src=sourceUrl;player.hidden=false;player.preload='metadata';
 notice('Reading video details on this device…');const current=revision;
 player.onloadedmetadata=async()=>{
  if(current!==revision)return;
  try{
   const duration=await probeVideoDuration(player);
   if(current!==revision)return;
   start.value='0';end.value=String(Math.min(15,duration).toFixed(2));
   start.max=String(duration.toFixed(2));end.max=start.max;
   details.textContent='Video length: '+duration.toFixed(1)+' seconds. Select a section up to 30 seconds long.';
   notice('Choose the start and end time, then trim.');run.disabled=false;
  }catch(error){if(current===revision)notice(error?.message||'Unable to inspect this video.',true);}
 };
 player.onerror=()=>{if(current===revision)notice('This browser cannot play the selected video.',true);};
});
form.addEventListener('input',event=>{if(event.target!==file){resetResult();notice('');}});
form.addEventListener('reset',()=>setTimeout(()=>{clear();run.disabled=true;},0));
form.addEventListener('submit',async event=>{
 event.preventDefault();const token=++revision;
 const source=file.files?.[0];if(!source)return;
 run.disabled=true;resetResult();notice('Preparing local video recording…');
 try{
  const data=await trimVideo(source,{start:start.value,end:end.value,onProgress:seconds=>{
   if(token===revision)notice('Capturing video: '+seconds.toFixed(1)+' seconds. Keep this tab open and visible.');
  }});
  if(token!==revision)return;
  resultUrl=URL.createObjectURL(data.blob);
  output.src=resultUrl;download.href=resultUrl;download.download=data.filename;download.textContent='↓ Download '+data.filename;
  result.hidden=false;notice(data.summary);
 }catch(error){if(token===revision)notice(error?.message||'Unable to trim this video in your browser.',true);}
 finally{run.disabled=false;}
});
window.addEventListener('pagehide',clear);
