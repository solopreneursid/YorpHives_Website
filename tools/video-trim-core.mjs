// Browser-native video trimming: no FFmpeg download, paid API, file upload or server worker.
// Playback is re-recorded locally in real time; supported output is WebM or MP4.
const MB=1048576;
let webmFixPromise;
function loadWebmDurationFix(){
 if(typeof globalThis.ysFixWebmDuration==='function')return Promise.resolve(globalThis.ysFixWebmDuration);
 if(!webmFixPromise)webmFixPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=new URL('./vendor/webm/fix-webm-duration.js',import.meta.url).href;
  script.async=true;
  script.onload=()=>typeof globalThis.ysFixWebmDuration==='function'
   ? resolve(globalThis.ysFixWebmDuration)
   : reject(Error('The local video metadata tool could not start.'));
  script.onerror=()=>reject(Error('The local video metadata tool could not load.'));
  document.head.append(script);
 }).catch(e=>{webmFixPromise=null;throw e;});
 return webmFixPromise;
}
export function validateVideoTrim(start,end,duration){
 const a=Number(start),b=Number(end),d=Number(duration);
 if(![a,b,d].every(Number.isFinite)||a<0||b<=a||d<=0||b>d+.06||b-a>.001+30||b-a<.25)
  throw Error('Choose start and end times within the video, between 0.25 and 30 seconds apart.');
 return {start:a,end:Math.min(b,d),length:b-a};
}
function withTimeout(promise,ms,message){
 return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error(message)),ms))]);
}
async function waitVideoMetadata(element){
 if(element.readyState>=1&&Number.isFinite(element.duration))return;
 await withTimeout(new Promise((resolve,reject)=>{
  element.addEventListener('loadedmetadata',resolve,{once:true});
  element.addEventListener('error',()=>reject(Error('Your browser cannot decode this video format.')),{once:true});
 }),12000,'Video metadata could not be loaded.');
}
export async function probeVideoDuration(video){
 await waitVideoMetadata(video);
 if(Number.isFinite(video.duration)&&video.duration>.2)return video.duration;
 // MediaRecorder-created WebM files sometimes omit duration metadata.
 const current=video.currentTime;
 const seeked=new Promise((resolve,reject)=>{
  video.addEventListener('seeked',resolve,{once:true});
  video.addEventListener('error',()=>reject(Error('Video duration could not be determined.')),{once:true});
 });
 video.currentTime=1e9;
 await withTimeout(seeked,7000,'Could not determine the length of this video.');
 const duration=Number.isFinite(video.duration)&&video.duration>.2?video.duration:video.currentTime;
 if(!Number.isFinite(duration)||duration<.25||duration>3600)throw Error('Video duration is unavailable or unsupported.');
 video.currentTime=Number.isFinite(current)?current:0;
 return duration;
}
export async function trimVideo(file,{start,end,onProgress}={}){
 if(!(file instanceof Blob)||file.size<100||file.size>30*MB)throw Error('Choose a video file between 100 bytes and 30 MB.');
 const name=String(file.name||'');
 if(!/\.(mp4|webm|mov|m4v)$/i.test(name)&&!/^video\//.test(file.type||''))throw Error('Choose an MP4, WebM or MOV video.');
 if(typeof document==='undefined'||typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement==='undefined'||!HTMLCanvasElement.prototype.captureStream)
  throw Error('Your browser cannot trim videos locally. Try an up-to-date desktop Chrome, Edge or Firefox.');
 const types=['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm','video/mp4'];
 const mime=types.find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw Error('Your browser has no supported local video recorder.');
 const url=URL.createObjectURL(file);
 const video=document.createElement('video');
 video.preload='auto';video.playsInline=true;video.src=url;
 video.style.cssText='position:fixed;left:-10000px;top:0;width:320px;height:180px;pointer-events:none';
 document.body.append(video);
 let raf=0,timer=0,safety=0,stream=null,audioCtx=null,recorder=null;
 try{
  const fullDuration=await probeVideoDuration(video);
  const times=validateVideoTrim(start,end,fullDuration);
  if(!video.videoWidth||!video.videoHeight)throw Error('This video has no visible frames.');
  const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
  const width=Math.max(2,Math.floor(video.videoWidth*scale/2)*2),height=Math.max(2,Math.floor(video.videoHeight*scale/2)*2);
  if(width*height>1_300_000)throw Error('This video resolution is too large.');
  video.currentTime=times.start;
  await withTimeout(new Promise((resolve,reject)=>{
   if(Math.abs(video.currentTime-times.start)<.06&&video.readyState>=2)return resolve();
   video.addEventListener('seeked',resolve,{once:true});
   video.addEventListener('error',()=>reject(Error('Could not seek within the video.')),{once:true});
  }),10000,'Video seeking timed out.');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('This browser cannot draw video frames.');
  stream=canvas.captureStream(25);
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(Ctx){
   audioCtx=new Ctx();
   const source=audioCtx.createMediaElementSource(video);
   const destination=audioCtx.createMediaStreamDestination();
   source.connect(destination); // Preserve sound without playing it through speakers.
   for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
   await audioCtx.resume();
  }
  const parts=[],done=new Promise((resolve,reject)=>{
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1_800_000});
   recorder.addEventListener('dataavailable',event=>{if(event.data?.size)parts.push(event.data);});
   recorder.addEventListener('error',()=>reject(Error('Local recording failed.')),{once:true});
   recorder.addEventListener('stop',resolve,{once:true});
  });
  let stopping=false,stopReason='',startedAt=0,elapsedMs=0;
  function stop(reason=''){
   if(stopping)return;
   stopping=true;stopReason=reason;
   elapsedMs=startedAt?Math.max(1,performance.now()-startedAt):0;
   cancelAnimationFrame(raf);clearInterval(timer);clearTimeout(safety);video.pause();
   if(recorder?.state==='recording')recorder.stop();
  }
  function draw(){
   if(stopping)return;
   try{ctx.drawImage(video,0,0,width,height);}
   catch{stop('frame rendering failed');return;}
   if(video.currentTime>=times.end-.015||video.ended){stop();return;}
   raf=requestAnimationFrame(draw);
  }
  ctx.drawImage(video,0,0,width,height);
  recorder.start(350);startedAt=performance.now();
  try{await video.play();}
  catch{stop('playback blocked');throw Error('This browser blocked local video playback. Click Trim again or try another browser.');}
  raf=requestAnimationFrame(draw);
  timer=setInterval(()=>{
   if(typeof onProgress==='function')onProgress(Math.max(0,Math.min(times.length,video.currentTime-times.start)));
   if(video.currentTime>=times.end-.015||video.ended)stop();
   if(document.visibilityState==='hidden')stop('tab hidden');
  },120);
  safety=setTimeout(()=>stop('recording timeout'),Math.ceil((times.length+15)*1000));
  await withTimeout(done,Math.ceil((times.length+18)*1000),'Local video recording timed out.');
  const ext=mime.includes('mp4')?'mp4':'webm';
  let blob=new Blob(parts,{type:ext==='mp4'?'video/mp4':'video/webm'});
  if(stopReason)throw Error('Video trimming stopped early ('+stopReason+'). Keep this tab visible and try again.');
  if(blob.size<500)throw Error('No playable clip was recorded.');
  if(ext==='webm'){
   const fix=await loadWebmDurationFix();
   try{blob=await fix(blob,Math.max(250,Math.round(elapsedMs)),undefined,{logger:false});}
   catch{throw Error('The video could not be finalized as a seekable WebM file. Try another browser.');}
  }
  return {blob,filename:'yorphives-trimmed-video.'+ext,
   summary:'Created an approximately '+(elapsedMs/1000).toFixed(1)+'-second '+ext.toUpperCase()+' clip locally. Exact frame boundaries and quality depend on the browser.'};
 }finally{
  cancelAnimationFrame(raf);clearInterval(timer);clearTimeout(safety);
  video.pause();
  if(recorder?.state==='recording')try{recorder.stop();}catch{}
  for(const track of stream?.getTracks()||[])try{track.stop();}catch{}
  try{await audioCtx?.close();}catch{}
  video.removeAttribute('src');video.load();video.remove();
  URL.revokeObjectURL(url);
 }
}
