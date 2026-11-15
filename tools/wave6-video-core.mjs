// Video frame extraction & GIF encoding. Entirely on-device, no uploads or FFmpeg.
const MB=1048576;
export function validateVideoSettings(opts={},duration=0){
 const start=Number(opts.start??0),end=Number(opts.end??Math.min(4,duration)),fps=Number(opts.fps??6);
 const width=Number(opts.width??320),format=opts.format==='png'?'png':'jpeg';
 if(!Number.isFinite(duration)||duration<=0||duration>7200)throw Error('Video has an unsupported duration.');
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration+.04||end<=start||
    end-start>6||end-start<.25)throw Error('Choose a clip between 0.25 and 6 seconds, within the video length.');
 if(![4,6,8,10].includes(fps)||![240,320,400].includes(width))throw Error('Choose a supported frame rate and output width.');
 return {start,end:Math.min(end,duration),fps,width,format,frames:Math.ceil((end-start)*fps)};
}
async function openVideo(file){
 if(!(file instanceof Blob)||file.size<200||file.size>35*MB)throw Error('Select a video from 200 bytes to 35 MB.');
 const name=String(file.name||'');
 if(!/\.(?:mp4|mov|m4v|webm)$/i.test(name)&&!/^video\//.test(file.type))
  throw Error('Select an MP4, MOV or WebM video.');
 if(typeof document==='undefined')throw Error('Video processing requires a graphical browser.');
 const video=document.createElement('video'),url=URL.createObjectURL(file);
 video.src=url;video.preload='auto';video.playsInline=true;video.muted=true;
 video.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;pointer-events:none';
 document.body.append(video);
 const dispose=()=>{video.pause();video.removeAttribute('src');video.load();video.remove();URL.revokeObjectURL(url);};
 try{
  video.load();
  if(!video.readyState)await new Promise((resolve,reject)=>{
   let timer=setTimeout(()=>reject(Error('Video metadata timed out.')),14000);
   video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});
   video.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Your browser cannot decode this video.'));},{once:true});
  });
  if(!video.videoWidth||!video.videoHeight||!Number.isFinite(video.duration)||video.duration<=0)
   throw Error('Video dimensions or duration are not readable.');
  return {video,dispose};
 }catch(error){dispose();throw error;}
}
const blobFrom=(canvas,mime,quality=.9)=>new Promise((resolve,reject)=>
 canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not export video frame.')),mime,quality));
async function seek(video,seconds){
 if(!Number.isFinite(seconds)||seconds<0||seconds>video.duration+.01)throw Error('Requested frame is outside the video.');
 if(Math.abs(video.currentTime-seconds)<.015){
  if(video.readyState>=2)return;
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{cleanup();reject(Error('Video frame decoding timed out.'));},12000);
   const cleanup=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed);};
   const loaded=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('Video decoding failed.'));};
   video.addEventListener('loadeddata',loaded,{once:true});
   video.addEventListener('error',failed,{once:true});
  });
  return;
 }
 await new Promise((resolve,reject)=>{
  let timer=setTimeout(()=>{cleanup();reject(Error('Seeking inside this video timed out.'));},12000);
  const done=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('Could not read a video frame.'));};
  const cleanup=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',failed);};
  video.addEventListener('seeked',done,{once:true});video.addEventListener('error',failed,{once:true});
  try{video.currentTime=seconds;}catch{failed();}
 });
}
const prepareCanvas=(video,width)=>{
 const height=Math.max(2,Math.round((video.videoHeight/video.videoWidth)*width/2)*2);
 if(width*height>400000||height>1000)throw Error('Video frame resolution is too high.');
 const c=document.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas is unavailable.');
 return {c,ctx};
};
export async function extractVideoFrame(file,options={}){
 const opened=await openVideo(file),{video,dispose}=opened;
 try{
  const time=Number(options.time??0),width=Number(options.width??320);
  if(!Number.isFinite(time)||time<0||time>video.duration||![240,320,400,640].includes(width))
   throw Error('Choose a valid time and thumbnail size.');
  const {c,ctx}=prepareCanvas(video,width);
  await seek(video,time);ctx.drawImage(video,0,0,c.width,c.height);
  const mime=options.format==='png'?'image/png':'image/jpeg',blob=await blobFrom(c,mime);
  c.width=c.height=0;
  return {blob,filename:'yorphives-video-thumbnail.'+(mime==='image/png'?'png':'jpg'),
   image:true,summary:'Extracted the frame at '+time.toFixed(2)+'s using your browser decoder.'};
 }finally{dispose();}
}
export async function videoToGif(file,options={}){
 const opened=await openVideo(file),{video,dispose}=opened;
 try{
  const {start,end,fps,width,frames}=validateVideoSettings(options,video.duration);
  if(frames<2||frames>60)throw Error('Choose a GIF with 2–60 frames.');
  const {c,ctx}=prepareCanvas(video,width);
  const {GIFEncoder,quantize,applyPalette}=await import('./vendor/gifenc/index.js');
  const gif=GIFEncoder({initialCapacity:262144});
  for(let i=0;i<frames;i++){
   const time=Math.min(end-.025,start+i/fps);
   await seek(video,Math.max(0,time));
   ctx.drawImage(video,0,0,c.width,c.height);
   const data=ctx.getImageData(0,0,c.width,c.height).data;
   const palette=quantize(data,64,{format:'rgb565'});
   const indexed=applyPalette(data,palette);
   gif.writeFrame(indexed,c.width,c.height,{palette,delay:Math.round(1000/fps),repeat:0,dispose:2});
   if(typeof options.onProgress==='function')options.onProgress({frame:i+1,total:frames});
   if(i%3===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  gif.finish();c.width=c.height=0;
  const bytes=gif.bytes();
  if(!bytes?.length||bytes.length>20*MB)throw Error('GIF exceeds the 20 MB limit. Use lower resolution or fewer seconds.');
  if(String.fromCharCode(...bytes.slice(0,6))!=='GIF89a')throw Error('GIF export did not produce a valid animation.');
  return {blob:new Blob([bytes],{type:'image/gif'}),filename:'yorphives-video-to-gif.gif',
   image:true,summary:'Created '+frames+' GIF frames ('+fps+' fps). GIF files are silent and colors are limited for compatibility.'};
 }finally{dispose();}
}
