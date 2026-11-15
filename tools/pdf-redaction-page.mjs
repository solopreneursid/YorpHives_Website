import {previewRedactionPage,redactPdf} from './pdf-redaction-core.mjs';
const get=id=>document.getElementById(id);
const filePicker=get('redact-file'),form=get('redact-form'),pageInput=get('redact-page'),image=get('redact-image'),
 stage=get('redact-stage'),overlay=get('redact-overlay'),list=get('redact-list'),run=get('redact-run'),
 status=get('redact-status'),result=get('redact-result'),download=get('redact-download');
let rectangles=[],page=1,pageCount=0,token=0,previewUrl='',outputUrl='',drawing=null;
const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
function free(){
 if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';
 if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl='';
}
function clearDownload(){
 if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl='';
 result.hidden=true;download.removeAttribute('href');
}
function sync(){
 overlay.replaceChildren();
 for(const area of rectangles.filter(x=>x.page===page)){
  const div=document.createElement('div');
  div.className='redaction-mark';
  Object.assign(div.style,{left:(area.x*100)+'%',top:(area.y*100)+'%',width:(area.w*100)+'%',height:(area.h*100)+'%'});
  overlay.append(div);
 }
 list.replaceChildren();
 rectangles.forEach((box,i)=>{
  const li=document.createElement('li');
  const label=document.createElement('span');label.textContent='Blackout '+(i+1)+' · Page '+box.page;
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';
  remove.className='tool-btn';remove.setAttribute('aria-label','Remove blackout '+(i+1)+' from page '+box.page);
  remove.addEventListener('click',()=>{rectangles.splice(i,1);clearDownload();sync();});
  li.append(label,remove);list.append(li);
 });
 get('redact-total').textContent=rectangles.length+' area'+(rectangles.length===1?'':'s')+' marked';
 run.disabled=!rectangles.length||!pageCount;
}
async function renderPage(number){
 if(!filePicker.files?.[0])return;
 const current=++token;
 pageInput.disabled=true;image.hidden=true;overlay.hidden=true;
 message('Loading page '+number+' on this device…');
 try{
  const output=await previewRedactionPage(filePicker.files[0],number);
  if(current!==token)return;
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(output.blob);
  const loaded=await new Promise((resolve,reject)=>{
   const picture=new Image();picture.onload=()=>resolve(picture);
   picture.onerror=()=>reject(Error('Could not display PDF page preview.'));picture.src=previewUrl;
  });
  if(current!==token)return;
  image.src=previewUrl;stage.style.aspectRatio=loaded.naturalWidth+'/'+loaded.naturalHeight;
  pageCount=output.pageCount;page=number;
  pageInput.max=String(pageCount);pageInput.value=String(page);
  get('redact-count').textContent='of '+pageCount;
  image.hidden=false;overlay.hidden=false;pageInput.disabled=false;
  sync();message('Drag to draw black boxes over the information you want removed.');
 }catch(error){if(current===token){pageInput.disabled=false;message(error.message||'Unable to preview the PDF.',true);}}
}
filePicker.addEventListener('change',()=>{
 ++token;free();rectangles=[];pageCount=0;page=1;list.replaceChildren();stage.style.aspectRatio='4/5';
 image.removeAttribute('src');image.hidden=true;overlay.hidden=true;result.hidden=true;
 sync();const file=filePicker.files?.[0];
 if(!file){message('');return;}
 if(file.size>12*1048576){message('Choose a PDF up to 12 MB.',true);return;}
 renderPage(1);
});
pageInput.addEventListener('change',()=>{
 const target=Number(pageInput.value);
 if(!Number.isInteger(target)||target<1||target>pageCount){pageInput.value=String(page);return;}
 if(target!==page){clearDownload();renderPage(target);}
});
const coords=event=>{
 const bounds=overlay.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),
 y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))};
};
overlay.addEventListener('pointerdown',event=>{
 if(!pageCount||rectangles.length>=50||event.button!==0)return;
 event.preventDefault();clearDownload();drawing={pointer:event.pointerId,start:coords(event)};
 overlay.setPointerCapture(event.pointerId);
 const selection=document.createElement('div');selection.className='redaction-drawing';overlay.append(selection);
 drawing.element=selection;
});
overlay.addEventListener('pointermove',event=>{
 if(!drawing||drawing.pointer!==event.pointerId)return;
 const end=coords(event),a=drawing.start;
 const x=Math.min(a.x,end.x),y=Math.min(a.y,end.y),w=Math.abs(a.x-end.x),h=Math.abs(a.y-end.y);
 Object.assign(drawing.element.style,{left:(x*100)+'%',top:(y*100)+'%',width:(w*100)+'%',height:(h*100)+'%'});
});
overlay.addEventListener('pointerup',event=>{
 if(!drawing||drawing.pointer!==event.pointerId)return;
 const end=coords(event),a=drawing.start;
 const x=Math.min(a.x,end.x),y=Math.min(a.y,end.y),w=Math.abs(a.x-end.x),h=Math.abs(a.y-end.y);
 drawing.element.remove();drawing=null;
 if(w<.008||h<.008){message('Drag a larger rectangle to cover the sensitive information.',true);return;}
 rectangles.push({page,x,y,w,h});sync();
 message('Area '+rectangles.length+' marked. Add more boxes or redact your PDF.');
});
overlay.addEventListener('pointercancel',()=>{drawing?.element?.remove();drawing=null;});
get('redact-undo').addEventListener('click',()=>{rectangles.pop();clearDownload();sync();});
get('redact-clear').addEventListener('click',()=>{rectangles=[];clearDownload();sync();});
form.addEventListener('reset',()=>setTimeout(()=>{
 ++token;free();rectangles=[];page=1;pageCount=0;image.hidden=true;overlay.hidden=true;result.hidden=true;sync();message('');
},0));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!filePicker.files?.[0]||!rectangles.length)return;
 const current=++token;run.disabled=true;clearDownload();message('Removing selected information from each page…');
 try{
  const resultData=await redactPdf(filePicker.files[0],rectangles);
  if(current!==token)return;
  outputUrl=URL.createObjectURL(resultData.blob);
  download.href=outputUrl;download.download=resultData.filename;
  result.hidden=false;message(resultData.summary+' Check the downloaded PDF before sharing.');
 }catch(error){if(current===token)message(error.message||'Redaction failed.',true);}
 finally{sync();}
});
window.addEventListener('pagehide',free);
sync();
