// Browser-local YorpHives v1.7 workspaces. Never sends file contents or passwords.
import {convertImageBatch,inspectPdfMetadata,cleanPdfMetadata,mergeSpreadsheetFiles,makeImagePublishingPack} from './wave7-file-core.mjs';
import {mergeAudioFiles,beginVoiceRecording} from './wave7-audio-core.mjs';
import {assessPassword,createBusinessProposal} from './wave7-business-core.mjs';
const $=id=>document.getElementById(id),id=document.body.dataset.wave7;
const form=$('wave7-form'),file=$('wave7-file'),status=$('wave7-status'),run=$('wave7-run'),result=$('wave7-result');
let outputUrl='',requestToken=0;
const say=(s,bad=false)=>{if(status){status.textContent=s;status.classList.toggle('error',bad);}};
const clearOutput=()=>{
 if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl='';
 if(result){result.hidden=true;result.replaceChildren();}
};
function showResult(out){
 if(!(out?.blob instanceof Blob)||!out.blob.size)throw Error('No output file could be generated.');
 clearOutput();const title=document.createElement('strong');title.textContent='Your download is ready';
 const link=document.createElement('a');link.className='tool-btn primary';outputUrl=URL.createObjectURL(out.blob);
 link.href=outputUrl;link.download=out.filename;link.textContent='↓ Download '+out.filename;
 result.append(title,link);
 if(out.text){
  const label=document.createElement('label');label.className='tool-field';label.textContent='Result preview';
  const box=document.createElement('textarea');box.readOnly=true;box.rows=6;box.value=out.text.slice(0,6500);
  label.append(box);result.append(label);
 }
 if(out.blob.type.startsWith('audio/')){
  const player=document.createElement('audio');player.controls=true;player.src=outputUrl;result.append(player);
 }
 result.hidden=false;say(out.summary);
}
if(form&&file&&id!=='voice-recorder'){
 file.addEventListener('change',async()=>{
  requestToken++;clearOutput();say('');
  if(id==='pdf-metadata-cleaner'){
   const preview=$('wave7-metadata');if(preview)preview.textContent='';
   if(file.files?.length){
    const token=requestToken;
    try{
     const report=await inspectPdfMetadata(file.files[0]);
     if(token!==requestToken)return;
     const pre=$('wave7-metadata');if(pre)pre.textContent=report.text+'\\nPages: '+report.pageCount;
     say('Found supported PDF metadata. Choose Clean PDF to generate a copy with cleared standard fields.');
    }catch(e){say(e.message,true);}
   }
  }
  if(id==='audio-merger')renderAudioOrder();
 });
 form.addEventListener('reset',()=>setTimeout(()=>{
  requestToken++;clearOutput();say('');
  if(id==='pdf-metadata-cleaner'&&$('wave7-metadata'))$('wave7-metadata').textContent='';
 },0));
 form.addEventListener('submit',async event=>{
  event.preventDefault();const token=++requestToken;clearOutput();run.disabled=true;
  say('Processing privately in your browser…');
  try{
   const opts=Object.fromEntries(new FormData(form).entries());
   let files=[...file.files];
   if(id==='audio-merger'&&audioOrder.length)files=audioOrder.slice();
   let out;
   if(id==='batch-image-converter')out=await convertImageBatch(files,opts,p=>{
    if(token===requestToken)say('Converting image '+Math.min(p.done+1,p.total)+' of '+p.total+'…');
   });
   else if(id==='pdf-metadata-cleaner')out=await cleanPdfMetadata(files[0]);
   else if(id==='spreadsheet-merger')out=await mergeSpreadsheetFiles(files,opts);
   else if(id==='audio-merger')out=await mergeAudioFiles(files);
   else if(id==='business-proposal-generator')out=await createBusinessProposal(opts);
   else if(id==='image-publishing-pack')out=await makeImagePublishingPack(files[0],opts);
   else throw Error('Unknown utility.');
   if(token===requestToken)showResult(out);
  }catch(e){if(token===requestToken)say(e?.message||'Processing failed.',true);}
  finally{run.disabled=false;}
 });
}
let audioOrder=[];
function renderAudioOrder(){
 if(id!=='audio-merger')return;
 const list=$('wave7-order');if(!list)return;
 audioOrder=[...file.files];list.replaceChildren();
 const render=()=>{
  list.replaceChildren();
  audioOrder.forEach((f,i)=>{
   const li=document.createElement('li'),label=document.createElement('span');label.textContent=(i+1)+'. '+f.name;
   const up=document.createElement('button'),down=document.createElement('button');
   for(const [btn,title,step] of [[up,'Move earlier',-1],[down,'Move later',1]]){
    btn.type='button';btn.className='tool-btn';btn.textContent=step<0?'↑':'↓';btn.title=title+' '+f.name;
    btn.setAttribute('aria-label',title+' '+f.name);btn.disabled=i+step<0||i+step>=audioOrder.length;
    btn.addEventListener('click',()=>{[audioOrder[i],audioOrder[i+step]]=[audioOrder[i+step],audioOrder[i]];clearOutput();render();});
   }
   li.append(label,up,down);list.append(li);
  });
 };
 render();
}
if(id==='password-strength-analyzer'){
 const pw=$('wave7-password'),toggle=$('wave7-reveal'),meter=$('wave7-meter'),summary=$('wave7-strength'),
  suggestions=$('wave7-suggestions');
 const render=()=>{
  const rating=assessPassword(pw.value);
  meter.value=rating.score;meter.max=4;summary.textContent=rating.label+
   (rating.length?' · '+rating.length+' characters':'');
  suggestions.replaceChildren();
  for(const idea of rating.suggestions){const li=document.createElement('li');li.textContent=idea;suggestions.append(li);}
 };
 pw.addEventListener('input',render);
 toggle.addEventListener('click',()=>{pw.type=pw.type==='password'?'text':'password';
  toggle.textContent=pw.type==='password'?'Show password':'Hide password';});
 render();
}
if(id==='voice-recorder'){
 const start=$('wave7-start'),stop=$('wave7-stop'),time=$('wave7-timer');
 let session=null;
 start.addEventListener('click',async()=>{
  clearOutput();start.disabled=true;stop.disabled=true;
  say('Your browser will request microphone permission. Nothing is uploaded.');
  try{
   session=await beginVoiceRecording({onTick:s=>{
    time.textContent='● '+Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
   }});
   stop.disabled=false;say('Recording… use Stop & Download when finished (2-minute maximum).');
   const out=await session.complete;showResult(out);
  }catch(e){say(e?.message||'Recording failed.',true);}
  finally{session=null;start.disabled=false;stop.disabled=true;time.textContent='0:00';}
 });
 stop.addEventListener('click',()=>{if(session){stop.disabled=true;say('Finishing recording locally…');session.stop();}});
 window.addEventListener('pagehide',()=>session?.stop());
}
window.addEventListener('pagehide',clearOutput);
