// Opt-in synthetic QA. Only injected in noindex preview builds; never into production.
if(new URLSearchParams(location.search).get('qa')==='wave6'){
 const report=document.createElement('pre');report.id='wave6-qa';report.dataset.status='running';document.body.append(report);
 const checks=[];
 const check=(name,pass,details='')=>{
  checks.push({name,pass:!!pass,details});
  if(!pass)throw Error(name+': '+details);
 };
 try{
  const [svg,image,scan,video,audio,priorAudio,{PDFDocument},oldVideo]=await Promise.all([
   import('/tools/wave6-svg-core.mjs'),
   import('/tools/wave6-image-core.mjs'),
   import('/tools/wave6-scanner-core.mjs'),
   import('/tools/wave6-video-core.mjs'),
   import('/tools/wave6-audio-core.mjs'),
   import('/tools/wave3-core.mjs'),
   import('/tools/vendor/pdf-lib.mjs'),
   import('/tools/video-trim-core.mjs')
  ]);
  const sampleSvg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><!-- production comment --><rect width="100.000" height="100.000" fill="#ff0000"/></svg>';
  const reduced=await svg.optimizeSvg(sampleSvg);
  check('SVGO optimizes a safe SVG',reduced.blob.size>40&&reduced.blob.size<=new Blob([sampleSvg]).size);
  let rejected=false;
  try{await svg.optimizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');}
  catch{rejected=true;}
  check('SVG scripts are rejected before optimization',rejected);
  const canvas=document.createElement('canvas');canvas.width=240;canvas.height=320;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d93448';ctx.fillRect(0,0,240,320);
  ctx.fillStyle='#ffd400';ctx.fillRect(40,40,160,240);
  const inputBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const input=new File([inputBlob],'test-picture.png',{type:'image/png'});
  const picked=await image.pickImageColor(input,{x:.05,y:.05});
  check('Photo color picker reads local pixels',picked.swatch==='#D93448',picked.swatch);
  const meme=await image.createMeme(input,{top:'Good news',bottom:'It works',fontSize:'1'});
  check('Meme generator outputs a real PNG',meme.blob.type==='image/png'&&meme.blob.size>200);
  const pixels=await image.makePixelArt(input,{block:18,colors:4});
  check('Pixel art exports PNG',pixels.blob.type==='image/png'&&pixels.blob.size>100);
  const scanned=await scan.scanDocument(input,{corners:[{x:.08,y:.08},{x:.92,y:.08},{x:.92,y:.92},{x:.08,y:.92}],mode:'grayscale',format:'pdf'});
  const document=await PDFDocument.load(await scanned.blob.arrayBuffer());
  check('Document scanner produces one-page PDF',document.getPageCount()===1);
  const wav=priorAudio.wavFromAudioChannels([Float32Array.from({length:22050},(_,i)=>Math.sin(i/23)*.1)],44100);
  const gain=await audio.adjustAudioVolume(new File([wav],'test.wav',{type:'audio/wav'}),{gain:'2'});
  check('Audio volume booster exports a RIFF/WAV file',gain.blob.size>1000&&
   String.fromCharCode(...new Uint8Array(await gain.blob.slice(0,4).arrayBuffer()))==='RIFF');
  // Synthetic video frames and seekable metadata through the previously tested local trimmer.
  if(!HTMLCanvasElement.prototype.captureStream||!MediaRecorder?.isTypeSupported('video/webm'))throw Error('Synthetic browser video recording not supported.');
  const stream=canvas.captureStream(20),recorded=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
  recorder.addEventListener('dataavailable',e=>{if(e.data?.size)recorded.push(e.data);});
  const stopped=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));
  recorder.start(200);
  let counter=0;
  const paint=setInterval(()=>{
   ctx.fillStyle=counter++%2===0?'#147b53':'#e28e35';
   ctx.fillRect(0,0,240,320);ctx.fillStyle='#fff';ctx.font='28px sans-serif';ctx.fillText('YorpHives',28,150);
  },70);
  await new Promise(resolve=>setTimeout(resolve,1900));clearInterval(paint);
  recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
  const raw=new File(recorded,'synthetic.webm',{type:'video/webm'});
  const seekable=await oldVideo.trimVideo(raw,{start:.25,end:1.35});
  const videoFile=new File([seekable.blob],'seekable.webm',{type:'video/webm'});
  const thumbnail=await video.extractVideoFrame(videoFile,{time:.55,width:240,format:'png'});
  check('Video thumbnail extractor outputs a PNG',thumbnail.blob.type==='image/png'&&thumbnail.blob.size>100);
  const gif=await video.videoToGif(videoFile,{start:.1,end:.75,fps:4,width:240});
  const bytes=new Uint8Array(await gif.blob.slice(0,6).arrayBuffer());
  check('Video to GIF creates actual animated GIF bytes',gif.blob.size>50&&String.fromCharCode(...bytes)==='GIF89a');
  const img=new Image(),gifUrl=URL.createObjectURL(gif.blob);
  try{
   img.src=gifUrl;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('GIF image cannot decode.'));});
   check('Animated GIF decodes in browser',img.naturalWidth===240&&img.naturalHeight>10);
  }finally{URL.revokeObjectURL(gifUrl);}
  canvas.width=canvas.height=0;
  report.dataset.status='done';report.textContent=JSON.stringify({pass:true,checks},null,2);
 }catch(error){
  report.dataset.status='failed';report.textContent=JSON.stringify({pass:false,checks,error:error?.stack||String(error)},null,2);
 }
}
