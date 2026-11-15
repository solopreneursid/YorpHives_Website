import{previewImage,maskImage}from'./image-mask-core.mjs';
const $=id=>document.getElementById(id),file=$('mask-file'),preview=$('mask-preview'),stage=$('mask-stage'),overlay=$('mask-overlay'),
 list=$('mask-list'),count=$('mask-count'),run=$('mask-run'),form=$('mask-form'),status=$('mask-status'),output=$('mask-output'),download=$('mask-download');
let marks=[],url='',resultUrl='',token=0,drawing;
const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
function clearOutput(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';output.hidden=true;download.removeAttribute('href');}
function redraw(){
 overlay.replaceChildren();list.replaceChildren();
 marks.forEach((m,i)=>{
  const box=document.createElement('div');box.className='mask-box';
  Object.assign(box.style,{left:(m.x*100)+'%',top:(m.y*100)+'%',width:(m.w*100)+'%',height:(m.h*100)+'%'});overlay.append(box);
  const item=document.createElement('li');item.textContent='Region '+(i+1)+' ';
  const del=document.createElement('button');del.type='button';del.className='tool-btn';del.textContent='Remove';
  del.addEventListener('click',()=>{marks.splice(i,1);clearOutput();redraw();});item.append(del);list.append(item);
 });
 count.textContent=marks.length+' marked region(s)';run.disabled=!marks.length;
}
function clear(){
 token++;marks=[];clearOutput();if(url)URL.revokeObjectURL(url);url='';
 preview.hidden=true;preview.removeAttribute('src');overlay.hidden=true;stage.hidden=true;message('');redraw();
}
file.addEventListener('change',async()=>{
 clear();const now=token;
 if(!file.files?.length)return;
 message('Reading your image locally…');
 try{
  const out=await previewImage(file.files[0]);if(now!==token)return;
  url=URL.createObjectURL(out.blob);preview.src=url;
  stage.style.aspectRatio=out.width+'/'+out.height;
  stage.hidden=false;preview.hidden=false;overlay.hidden=false;
  message('Drag a rectangle over each region you want to mask.');
 }catch(e){message(e.message,true);}
});
const position=event=>{
 const b=overlay.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(event.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(event.clientY-b.top)/b.height))};
};
overlay.addEventListener('pointerdown',event=>{
 if(marks.length>=40||event.button!==0)return;
 event.preventDefault();clearOutput();drawing={start:position(event),pointer:event.pointerId};
 const element=document.createElement('div');element.className='mask-drawing';overlay.append(element);
 drawing.element=element;overlay.setPointerCapture(event.pointerId);
});
overlay.addEventListener('pointermove',event=>{
 if(!drawing||event.pointerId!==drawing.pointer)return;
 const a=drawing.start,b=position(event),x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
 Object.assign(drawing.element.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});
});
overlay.addEventListener('pointerup',event=>{
 if(!drawing||event.pointerId!==drawing.pointer)return;
 const a=drawing.start,b=position(event),x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
 drawing.element.remove();drawing=null;
 if(w<.008||h<.008){message('Draw a larger region.',true);return;}
 marks.push({x,y,w,h});redraw();message('Area '+marks.length+' marked.');
});
overlay.addEventListener('pointercancel',()=>{drawing?.element.remove();drawing=null;});
$('mask-undo').addEventListener('click',()=>{marks.pop();clearOutput();redraw();});
$('mask-clear').addEventListener('click',()=>{marks=[];clearOutput();redraw();});
form.addEventListener('reset',()=>setTimeout(clear,0));
form.addEventListener('input',event=>{if(event.target!==file)clearOutput();});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!marks.length||!file.files?.length)return;
 const now=++token;clearOutput();run.disabled=true;message('Exporting your new image…');
 try{
  const opts=Object.fromEntries(new FormData(form));
  const out=await maskImage(file.files[0],marks,opts);if(now!==token)return;
  resultUrl=URL.createObjectURL(out.blob);download.href=resultUrl;download.download=out.filename;
  download.textContent='↓ Download '+out.filename;output.hidden=false;message(out.summary);
 }catch(e){if(now===token)message(e.message,true);}finally{redraw();}
});
window.addEventListener('pagehide',clear);
redraw();
