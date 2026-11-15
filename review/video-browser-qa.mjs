// Preview-only browser acceptance for video capture and trimming.
if(new URLSearchParams(location.search).get('qa')==='video'){
 const pre=document.createElement('pre');pre.id='video-browser-qa';pre.dataset.status='running';document.body.append(pre);
 const checks=[];
 const check=(name,condition,detail='')=>{checks.push({name,ok:!!condition,detail});if(!condition)throw Error(name+': '+detail);};
 try{
  const module=await import('/tools/video-trim-core.mjs');
  if(!HTMLCanvasElement.prototype.captureStream||!MediaRecorder?.isTypeSupported('video/webm'))throw Error('This browser does not support video/webm recording.');
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
  const ctx=canvas.getContext('2d'),stream=canvas.captureStream(20);
  let recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];
  recorder.addEventListener('dataavailable',event=>{if(event.data?.size)chunks.push(event.data);});
  const stopped=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));
  recorder.start(200);let t=0;
  const draw=()=>{ctx.fillStyle=t%2?'#db5725':'#17764f';ctx.fillRect(0,0,320,180);ctx.fillStyle='white';ctx.font='32px sans-serif';ctx.fillText('Video demo',40,88);t++;};
  draw();const timer=setInterval(draw,50);await new Promise(resolve=>setTimeout(resolve,1800));
  clearInterval(timer);recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());
  const input=new File(chunks,'qa.webm',{type:'video/webm'});
  check('Synthetic video created',input.size>2000,input.size);
  const result=await module.trimVideo(input,{start:.25,end:.75});
  check('Short video successfully trimmed',result.blob.size>500,result.blob.size);
  check('Correct media output type',result.blob.type.startsWith('video/'),result.blob.type);
  const player=document.createElement('video');player.src=URL.createObjectURL(result.blob);player.preload='metadata';
  await new Promise((resolve,reject)=>{player.onloadedmetadata=resolve;player.onerror=()=>reject(Error('Output video does not play.'));});
  check('Trimmed video metadata is readable',Number.isFinite(player.duration)&&player.duration>0,'duration='+player.duration+' readyState='+player.readyState+' size='+result.blob.size+' globalFix='+typeof globalThis.ysFixWebmDuration);
  URL.revokeObjectURL(player.src);
  pre.dataset.status='done';pre.textContent=JSON.stringify({pass:true,checks},null,2);
 }catch(error){pre.dataset.status='failed';pre.textContent=JSON.stringify({pass:false,checks,error:error?.stack||String(error)},null,2);}
}
