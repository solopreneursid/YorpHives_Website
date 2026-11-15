import {optimizeSvg} from './wave6-svg-core.mjs';
import {createMeme,makePixelArt,pickImageColor} from './wave6-image-core.mjs';
import {videoToGif,extractVideoFrame} from './wave6-video-core.mjs';
import {adjustAudioVolume} from './wave6-audio-core.mjs';
const $=id=>document.getElementById(id),id=document.body.dataset.wave6;
const form=$('wave6-form'),file=$('wave6-file'),status=$('wave6-status'),submit=$('wave6-run'),
 result=$('wave6-result'),sourcePreview=$('wave6-source-preview'),colorMark=$('wave6-color-mark'),
 previewFrame=$('wave6-video-preview'),videoInfo=$('wave6-video-info');
let resultUrl='',sourceUrl='',revision=0;
const say=(message,error=false)=>{status.textContent=message;status.classList.toggle('error',error);};
function clearResult(){
 if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';
 if(result)result.replaceChildren();
 if(result)result.hidden=true;
}
function clearSource(){
 if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';
 if(sourcePreview){sourcePreview.removeAttribute('src');sourcePreview.hidden=true;}
 if(colorMark)colorMark.hidden=true;
 if(previewFrame){previewFrame.pause();previewFrame.removeAttribute('src');previewFrame.hidden=true;}
 if(videoInfo)videoInfo.textContent='';
}
const videoIds=['video-to-gif','video-thumbnail-extractor'];
const imageIds=['meme-maker','image-color-picker','pixel-art-maker'];
if(file)file.addEventListener('change',()=>{
 revision++;clearResult();clearSource();say('');
 const item=file.files?.[0];if(!item)return;
 if(imageIds.includes(id)&&sourcePreview){
  sourceUrl=URL.createObjectURL(item);sourcePreview.src=sourceUrl;sourcePreview.hidden=false;
 }else if(videoIds.includes(id)&&previewFrame){
  sourceUrl=URL.createObjectURL(item);previewFrame.src=sourceUrl;previewFrame.hidden=false;previewFrame.preload='metadata';
  previewFrame.onloadedmetadata=()=>{
   const d=previewFrame.duration;
   if(!Number.isFinite(d)||d<=0){say('Video duration could not be read.',true);return;}
   videoInfo.textContent='Video duration: '+d.toFixed(2)+' seconds.';
   const end=form.elements.namedItem('end'),time=form.elements.namedItem('time');
   if(end){end.value=Math.min(4,d).toFixed(2);end.max=String(d);}
   if(time){time.value=Math.min(1,d/2).toFixed(2);time.max=String(d);}
  };
  previewFrame.onerror=()=>say('This browser cannot preview this video format.',true);
 }
});
if(sourcePreview&&id==='image-color-picker'){
 sourcePreview.addEventListener('click',event=>{
  const r=sourcePreview.getBoundingClientRect();
  const u=(event.clientX-r.left)/r.width,v=(event.clientY-r.top)/r.height;
  if(!Number.isFinite(u)||!Number.isFinite(v))return;
  form.elements.namedItem('x').value=Math.min(1,Math.max(0,u)).toFixed(5);
  form.elements.namedItem('y').value=Math.min(1,Math.max(0,v)).toFixed(5);
  if(colorMark){
   colorMark.style.left=Math.min(100,Math.max(0,u*100))+'%';
   colorMark.style.top=Math.min(100,Math.max(0,v*100))+'%';
   colorMark.hidden=false;
  }
  clearResult();say('Selected a pixel. Press Pick Color to see exact values.');
 });
 sourcePreview.tabIndex=0;sourcePreview.setAttribute('aria-label','Photo preview. Select a pixel by tapping or clicking.');
}
form.addEventListener('input',event=>{if(event.target!==file){clearResult();if(id!=='image-color-picker')say('');}});
form.addEventListener('reset',()=>setTimeout(()=>{revision++;clearResult();clearSource();say('');},0));
function present(out){
 if(!(out?.blob instanceof Blob)||!out.blob.size)throw Error('This tool did not produce a usable file.');
 const title=document.createElement('strong');title.textContent='Your result is ready';
 const link=document.createElement('a');link.className='tool-btn primary';
 resultUrl=URL.createObjectURL(out.blob);link.href=resultUrl;link.download=out.filename;
 link.textContent='↓ Download '+out.filename;result.append(title,link);
 if(out.image&&!out.filename.endsWith('.svg')){
  const image=document.createElement('img');image.className='wave6-out-image';image.alt='Generated preview';image.src=resultUrl;result.append(image);
 }
 if(out.blob.type==='audio/wav'){
  const audio=document.createElement('audio');audio.controls=true;audio.src=resultUrl;result.append(audio);
 }
 if(out.swatch){
  const sw=document.createElement('div');sw.className='wave6-swatch';sw.style.backgroundColor=out.swatch;
  sw.setAttribute('role','img');sw.setAttribute('aria-label','Selected color '+out.swatch);result.append(sw);
 }
 if(out.text){
  const label=document.createElement('label');label.className='tool-field';label.textContent='Output text';
  const area=document.createElement('textarea');area.readOnly=true;area.rows=7;area.value=out.text;area.className='wave4-code';label.append(area);
  const copy=document.createElement('button');copy.type='button';copy.className='tool-btn';copy.textContent='Copy text';
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(out.text);copy.textContent='Copied!';}catch{area.focus();area.select();copy.textContent='Select and copy the text';}});
  result.append(label,copy);
 }
 result.hidden=false;say(out.summary);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();const token=++revision;clearResult();
 const files=file?.files||[],input=files[0],options=Object.fromEntries(new FormData(form).entries());
 submit.disabled=true;say('Working privately on this device…');
 try{
  let out;
  if(id==='svg-optimizer'){
   const source=input?.size?await input.text():String(options.source||'');
   out=await optimizeSvg(source);
  }else if(id==='video-to-gif'){
   out=await videoToGif(input,{...options,onProgress:p=>{if(token===revision)say('Capturing GIF frame '+p.frame+' of '+p.total+'…');}});
  }else if(id==='video-thumbnail-extractor')out=await extractVideoFrame(input,options);
  else if(id==='meme-maker')out=await createMeme(input,options);
  else if(id==='image-color-picker')out=await pickImageColor(input,options);
  else if(id==='pixel-art-maker')out=await makePixelArt(input,options);
  else if(id==='audio-volume-adjuster')out=await adjustAudioVolume(input,options);
  else throw Error('Unknown local utility.');
  if(token!==revision)return;
  present(out);
 }catch(e){if(token===revision)say(e?.message||'Could not process this file.',true);}
 finally{submit.disabled=false;}
});
window.addEventListener('pagehide',()=>{clearResult();clearSource();});
