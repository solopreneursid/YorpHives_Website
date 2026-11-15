// User-triggered, same-origin AI model with no image uploads.
import {MODEL_INFO,segmentImage,renderTransparentPng,disposeSegmentation} from './background-removal-core.mjs';
const $=id=>document.getElementById(id);
const form=$('ai-form'),file=$('ai-file'),run=$('ai-run'),refine=$('ai-refine'),reset=$('ai-reset'),
 status=$('ai-status'),original=$('ai-source'),processed=$('ai-processed'),output=$('ai-output'),
 result=$('ai-result'),download=$('ai-download'),imageInfo=$('ai-image-info'),
 cutoff=$('ai-cutoff'),softness=$('ai-softness'),edge=$('ai-resolution'),background=$('ai-background'),
 cutoffLabel=$('ai-cutoff-label'),softnessLabel=$('ai-softness-label');
let sourceUrl='',outputUrl='',segmentation=null,token=0,busy=false;
const say=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
function discardResult(){
 if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl='';
 processed.removeAttribute('src');processed.hidden=true;result.hidden=true;download.removeAttribute('href');
}
function clearSegmentation(){
 if(segmentation)disposeSegmentation(segmentation);segmentation=null;
 discardResult();refine.disabled=true;
}
function clearPreview(){
 if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';
 original.removeAttribute('src');original.hidden=true;
 $('ai-source-empty').hidden=false;imageInfo.textContent='';
}
function available(){
 run.disabled=busy||!file.files?.length;
 refine.disabled=busy||!segmentation;
 reset.disabled=busy;
}
const formatSliders=()=>{
 cutoffLabel.textContent=cutoff.value+'%';
 softnessLabel.textContent=softness.value+'%';
};
formatSliders();
for(const control of [cutoff,softness,edge]){
 control.addEventListener('input',()=>{
  formatSliders();
  if(segmentation){discardResult();say('Edge settings changed. Choose Update preview to apply them.');}
 });
}
background.addEventListener('change',()=>{
 const frame=$('ai-processed-frame');
 frame.classList.toggle('ai-white',background.value==='white');
 frame.classList.toggle('ai-charcoal',background.value==='charcoal');
 frame.classList.toggle('ai-transparent',background.value==='checkerboard');
});
file.addEventListener('change',()=>{
 token++;clearSegmentation();clearPreview();say('');
 const item=file.files?.[0];
 if(item){
  if(item.size>10*1048576){say('Choose an image smaller than 10 MB.',true);available();return;}
  sourceUrl=URL.createObjectURL(item);original.src=sourceUrl;original.hidden=false;
  $('ai-source-empty').hidden=true;
  imageInfo.textContent=item.name+' · '+(item.size/1048576).toFixed(2)+' MB';
  say('Photo selected. Press Remove Background to run the private AI model on this device.');
 }
 available();
});
async function redraw(current){
 say('Rendering a transparent PNG locally…');
 const resultData=await renderTransparentPng(segmentation,{
  cutoff:Number(cutoff.value)/100,softness:Number(softness.value)/100,
  maxEdge:Number(edge.value)
 });
 if(current!==token)return;
 discardResult();
 outputUrl=URL.createObjectURL(resultData.blob);
 processed.src=outputUrl;processed.hidden=false;
 download.href=outputUrl;download.download=resultData.filename;
 $('ai-result-text').textContent=resultData.summary;
 $('ai-result-size').textContent='PNG · '+(resultData.blob.size/1048576).toFixed(2)+' MB · AI inference '+segmentation.inferenceMs+' ms';
 result.hidden=false;
 say('Done! Check the edges and download your transparent PNG. Adjust and refresh the preview if needed.');
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!file.files?.length)return;
 const current=++token;busy=true;available();discardResult();
 try{
  if(!segmentation){
   const image=file.files[0];
   say('Starting private AI…');
   const modelOutput=await segmentImage(image,{onProgress:message=>{if(current===token)say(message);}});
   if(current!==token){disposeSegmentation(modelOutput);return;}
   segmentation=modelOutput;
  }
  await redraw(current);
 }catch(error){if(current===token)say(error?.message||'Background removal failed.',true);}
 finally{busy=false;available();}
});
refine.addEventListener('click',async()=>{
 if(!segmentation||busy)return;
 const current=++token;busy=true;available();discardResult();
 try{await redraw(current);}catch(error){if(current===token)say(error?.message||'Edge rendering failed.',true);}
 finally{busy=false;available();}
});
reset.addEventListener('click',()=>{
 if(busy)return;
 token++;clearSegmentation();clearPreview();
 file.value='';cutoff.value='50';softness.value='18';edge.value='1600';background.value='checkerboard';
 background.dispatchEvent(new Event('change'));formatSliders();
 say('Choose a photo to begin. The local AI model loads only when you start processing.');
 available();
});
window.addEventListener('pagehide',()=>{
 token++;clearSegmentation();clearPreview();
});
say('Choose a photo to begin. The model loads only when you start processing.');
available();
