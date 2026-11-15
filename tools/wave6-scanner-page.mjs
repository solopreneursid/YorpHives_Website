import {scanDocument,validateScanCorners} from './wave6-scanner-core.mjs';
const $=id=>document.getElementById(id),form=$('scan-form'),file=$('scan-file'),
 stage=$('scan-stage'),image=$('scan-image'),overlay=$('scan-overlay'),shape=$('scan-shape'),
 button=$('scan-run'),status=$('scan-status'),result=$('scan-result'),download=$('scan-download'),
 hint=$('scan-corners');
let sourceUrl='',resultUrl='',revision=0,active=null;
const initial=()=>[{x:.06,y:.06},{x:.94,y:.06},{x:.94,y:.94},{x:.06,y:.94}];
let corners=initial();const names=['Top-left','Top-right','Bottom-right','Bottom-left'];
const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
function clearOutput(){
 if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';result.hidden=true;download.removeAttribute('href');
 for(const previous of result.querySelectorAll('img.wave6-out-image'))previous.remove();
}
function redraw(){
 shape.setAttribute('points',corners.map(p=>(p.x*100).toFixed(2)+','+(p.y*100).toFixed(2)).join(' '));
 for(const [i,point] of corners.entries()){
  const handle=overlay.querySelector('[data-corner="'+i+'"]');
  if(handle){handle.style.left=point.x*100+'%';handle.style.top=point.y*100+'%';}
 }
 try{validateScanCorners(corners);button.disabled=!file.files?.length;hint.textContent='Four corners selected. Adjust handles as needed.';}
 catch(e){button.disabled=true;hint.textContent=e.message;}
}
function clear(){
 revision++;active=null;clearOutput();
 if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';
 image.hidden=true;image.removeAttribute('src');stage.hidden=true;corners=initial();redraw();message('');
}
file.addEventListener('change',()=>{
 clear();const item=file.files?.[0];if(!item)return;
 if(item.size>15*1048576){message('Choose a photo smaller than 15 MB.',true);return;}
 sourceUrl=URL.createObjectURL(item);
 image.onload=()=>{
  stage.hidden=false;image.hidden=false;stage.style.aspectRatio=image.naturalWidth+'/'+image.naturalHeight;
  redraw();message('Drag the four green corner handles to the document edges.');
 };
 image.onerror=()=>message('Could not preview this image format.',true);
 image.src=sourceUrl;
});
const pointFrom=e=>{
 const rect=overlay.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),
  y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))};
};
for(let i=0;i<4;i++){
 const handle=document.createElement('button');handle.type='button';handle.className='scan-corner';
 handle.dataset.corner=String(i);handle.setAttribute('aria-label',names[i]+' document corner');
 handle.title=names[i]+' corner';
 handle.addEventListener('pointerdown',e=>{
  e.preventDefault();active={id:i,pointer:e.pointerId};handle.setPointerCapture(e.pointerId);clearOutput();
 });
 handle.addEventListener('pointermove',e=>{
  if(!active||active.pointer!==e.pointerId||active.id!==i)return;
  corners[i]=pointFrom(e);redraw();
 });
 handle.addEventListener('pointerup',()=>{active=null;redraw();});
 handle.addEventListener('pointercancel',()=>{active=null;redraw();});
 handle.addEventListener('keydown',e=>{
  const steps={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]};
  if(!steps[e.key])return;e.preventDefault();
  const [dx,dy]=steps[e.key];
  corners[i]={x:Math.min(1,Math.max(0,corners[i].x+dx)),y:Math.min(1,Math.max(0,corners[i].y+dy))};
  clearOutput();redraw();
 });
 overlay.append(handle);
}
$('scan-reset-corners').addEventListener('click',()=>{corners=initial();clearOutput();redraw();});
form.addEventListener('reset',()=>setTimeout(clear,0));
form.addEventListener('input',e=>{if(e.target!==file)clearOutput();});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!file.files?.[0])return;const token=++revision;clearOutput();
 button.disabled=true;message('Correcting perspective and cleaning the scan on this device…');
 try{
  const opts=Object.fromEntries(new FormData(form).entries());
  const out=await scanDocument(file.files[0],{...opts,corners:corners.map(x=>({...x}))});
  if(token!==revision)return;
  resultUrl=URL.createObjectURL(out.blob);
  download.href=resultUrl;download.download=out.filename;download.textContent='↓ Download '+out.filename;
  result.hidden=false;
  if(out.image){const img=document.createElement('img');img.alt='Finished scanned document';img.className='wave6-out-image';img.src=resultUrl;result.append(img);}
  message(out.summary);
 }catch(error){if(token===revision)message(error?.message||'Could not scan the photo.',true);}
 finally{redraw();}
});
window.addEventListener('pagehide',clear);
redraw();
