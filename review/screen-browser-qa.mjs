// Preview-only synthetic browser test; never request to record a real screen.
if(new URLSearchParams(location.search).get('qa')==='screen'){
 const out=document.createElement('pre');out.id='screen-qa';out.dataset.status='running';document.body.append(out);
 let stream,canvas,media,previous;
 try{
  const {beginScreenRecording}=await import('/tools/screen-record-core.mjs');
  if(!navigator.mediaDevices||!HTMLCanvasElement.prototype.captureStream)throw Error('Screen capture primitives unavailable in this browser.');
  canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#16795d';ctx.fillRect(0,0,320,180);
  stream=canvas.captureStream(24);media=navigator.mediaDevices;
  previous=Object.getOwnPropertyDescriptor(media,'getDisplayMedia');
  Object.defineProperty(media,'getDisplayMedia',{configurable:true,writable:true,value:async()=>stream});
  const session=await beginScreenRecording();
  const paint=setInterval(()=>{ctx.fillStyle='#287762';ctx.fillRect(0,0,320,180);ctx.fillStyle='#f5f5f5';ctx.font='30px sans-serif';ctx.fillText('YorpHives Demo',20,90);},100);
  await new Promise(resolve=>setTimeout(resolve,1200));clearInterval(paint);
  session.stop();
  const result=await session.complete;
  if(result.blob.size<800||!result.blob.type.startsWith('video/'))throw Error('The captured file is too small or has an invalid MIME type.');
  const player=document.createElement('video');player.preload='metadata';player.src=URL.createObjectURL(result.blob);
  await new Promise((resolve,reject)=>{player.onloadedmetadata=resolve;player.onerror=()=>reject(Error('The recorded file is not readable.'));});
  const duration=player.duration;URL.revokeObjectURL(player.src);
  if(!Number.isFinite(duration)||duration<.3)throw Error('The output recording is not seekable.');
  out.dataset.status='done';out.textContent=JSON.stringify({pass:true,checks:['Synthetic display stream permitted','Recording started/stopped','Local video Blob created','Seekable duration '+duration.toFixed(2)+'s']});
 }catch(error){out.dataset.status='failed';out.textContent=JSON.stringify({pass:false,error:error?.stack||String(error)});}
 finally{
  if(media){if(previous)Object.defineProperty(media,'getDisplayMedia',previous);else delete media.getDisplayMedia;}
  stream?.getTracks().forEach(t=>t.stop());if(canvas)canvas.width=canvas.height=0;
 }
}
