// Browser-local screen capture. The browser permission dialog is mandatory.
// No server, upload, analytics endpoint, or third-party recorder.
const MB=1048576;
let fixPromise;
async function fixDuration(blob,ms){
 if(typeof globalThis.ysFixWebmDuration!=='function'){
  if(!fixPromise)fixPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=new URL('./vendor/webm/fix-webm-duration.js',import.meta.url).href;
   script.async=true;
   script.onload=()=>typeof globalThis.ysFixWebmDuration==='function'?resolve(globalThis.ysFixWebmDuration):reject(Error('Local video metadata fixer unavailable.'));
   script.onerror=()=>reject(Error('Local video metadata fixer could not load.'));
   document.head.append(script);
  }).catch(error=>{fixPromise=null;throw error;});
  await fixPromise;
 }
 return globalThis.ysFixWebmDuration(blob,Math.max(250,Math.floor(ms)),undefined,{logger:false});
}
export function chooseRecorderFormat(supported){
 return ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm','video/mp4'].find(supported)||null;
}
export async function beginScreenRecording({onElapsed,onStopped}={}){
 if(typeof navigator==='undefined'||!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined')
  throw Error('Your browser does not support screen recording. Try a recent desktop Chrome, Edge or Firefox.');
 const mime=chooseRecorderFormat(type=>MediaRecorder.isTypeSupported(type));
 if(!mime)throw Error('This browser does not support local video recording.');
 // IMPORTANT: permission request is the first awaited operation, keeping user activation.
 let stream;
 try{stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:24},audio:true});}
 catch(e){throw Error('Screen sharing was cancelled or blocked by your browser.');}
 let recorder,interval,timeout,started=0,finished=false;
 const tracks=stream.getTracks();
 const stopTracks=()=>tracks.forEach(t=>{try{t.stop();}catch{}});
 const stop=()=>{
  if(finished)return;
  if(recorder?.state==='recording'){try{recorder.stop();}catch{stopTracks();}}
  else stopTracks();
 };
 try{
  const pieces=[];
  const done=new Promise((resolve,reject)=>{
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1700000});
   recorder.addEventListener('dataavailable',e=>{if(e.data?.size)pieces.push(e.data);});
   recorder.addEventListener('error',()=>reject(Error('The browser recorder failed.')),{once:true});
   recorder.addEventListener('stop',resolve,{once:true});
  });
  for(const track of stream.getVideoTracks())track.addEventListener('ended',stop,{once:true});
  recorder.start(700);started=performance.now();
  interval=setInterval(()=>{const elapsed=Math.max(0,(performance.now()-started)/1000);onElapsed?.(elapsed);},300);
  timeout=setTimeout(stop,5*60*1000);
  const complete=(async()=>{
   try{
    await done;
    let blob=new Blob(pieces,{type:mime.includes('mp4')?'video/mp4':'video/webm'});
    if(blob.size<500)throw Error('No usable recording was captured.');
    const duration=performance.now()-started;
    if(blob.size>160*MB)throw Error('Recording is too large; record a shorter clip.');
    if(mime.includes('webm'))blob=await fixDuration(blob,duration);
    const result={blob,filename:'yorphives-screen-recording.'+(mime.includes('mp4')?'mp4':'webm'),
     summary:'Screen recording saved locally ('+Math.round(duration/1000)+' seconds). Audio availability depends on your browser and share settings.'};
    onStopped?.(result);
    return result;
   }finally{finished=true;clearInterval(interval);clearTimeout(timeout);stopTracks();}
  })();
  return {stop,complete,stream};
 }catch(error){clearInterval(interval);clearTimeout(timeout);stopTracks();throw error;}
}
