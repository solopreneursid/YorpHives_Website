// Browser-local, open-weight U²-Net-small foreground segmentation.
// Apache-2.0 model: U-2-Net by Qin et al; SHA-256 pinned at build time.
// MIT engine: onnxruntime-web 1.31.1; WASM and weights hosted on our own origin.
// No remote endpoints, tracking, uploads, or cloud inference.
const SIZE=320,MAX_BYTES=10*1048576,MAX_PIXELS=12_000_000,OUTPUT_EDGE=1600;
const MODEL_SHA='309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
let cachedSession=null,sessionPromise=null,engine=null;
function fail(message){throw Error(message);}
export const MODEL_INFO=Object.freeze({
 id:'u2netp-309c8469',name:'U²-Net-small',
 file:'u2netp-309c8469.onnx',
 bytes:4574861,sha256:MODEL_SHA,license:'Apache-2.0',
 input:[1,3,SIZE,SIZE],output:[1,1,SIZE,SIZE],execution:'browser-wasm'
});
export function normalizeSaliency(prediction){
 if(!prediction||prediction.length!==SIZE*SIZE)fail('AI produced an unexpected mask shape.');
 let min=Infinity,max=-Infinity;
 for(let i=0;i<prediction.length;i++){
  const v=prediction[i];
  if(!Number.isFinite(v))fail('The AI mask contains invalid values.');
  if(v<min)min=v;if(v>max)max=v;
 }
 if(!(max-min>1e-8))fail('The AI could not identify a distinct subject. Try a clearer picture.');
 const out=new Float32Array(prediction.length),range=max-min;
 for(let i=0;i<prediction.length;i++)out[i]=Math.min(1,Math.max(0,(prediction[i]-min)/range));
 return out;
}
export function maskAlpha(value,{cutoff=.5,softness=.18}={}){
 const c=Number(cutoff),s=Number(softness);
 if(!Number.isFinite(c)||c<.12||c>.88||!Number.isFinite(s)||s<.04||s>.45)
  fail('Choose an edge cutoff from 12–88% and softness from 4–45%.');
 const x=(Math.max(0,Math.min(1,Number(value)))-c+s)/(2*s);
 // Cubic smoothstep for stable feathering. We do not threshold raw pixels.
 const t=Math.max(0,Math.min(1,x));
 return t*t*(3-2*t);
}
export function prepareU2NetTensor(pixelBytes,width=SIZE,height=SIZE){
 if(width!==SIZE||height!==SIZE||!pixelBytes||pixelBytes.length!==width*height*4)
  fail('AI input must be a 320×320 RGBA image.');
 const sample=new Float32Array(3*SIZE*SIZE),area=SIZE*SIZE;
 const mean=[.485,.456,.406],std=[.229,.224,.225];
 for(let pixel=0;pixel<area;pixel++){
  for(let c=0;c<3;c++){
   const alpha=pixelBytes[4*pixel+3]/255;
   const color=(pixelBytes[4*pixel+c]*alpha+255*(1-alpha))/255;
   sample[c*area+pixel]=(color-mean[c])/std[c];
  }
 }
 return sample;
}
export async function loadBackgroundModel(onProgress=()=>{}){
 if(cachedSession)return {ort:engine,session:cachedSession};
 if(!sessionPromise)sessionPromise=(async()=>{
  if(typeof document==='undefined'||typeof fetch==='undefined')fail('This AI feature requires a modern graphical browser.');
  onProgress('Preparing local WebAssembly inference engine…');
  const ort=await import('./vendor/onnxruntime/ort.wasm.bundle.min.mjs');
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  ort.env.wasm.wasmPaths={
   wasm:new URL('./vendor/onnxruntime/ort-wasm-simd-threaded.wasm',import.meta.url).href,
   mjs:new URL('./vendor/onnxruntime/ort-wasm-simd-threaded.mjs',import.meta.url).href
  };
  onProgress('Loading the locally hosted 4.6 MB open-weight model…');
  const modelUrl=new URL('./models/u2netp-309c8469.onnx',import.meta.url);
  if(modelUrl.origin!==location.origin)fail('Cross-origin models are forbidden.');
  const response=await fetch(modelUrl.href,{mode:'same-origin',credentials:'omit',cache:'force-cache'});
  if(!response.ok)fail('The local AI model is unavailable (HTTP '+response.status+').');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==MODEL_INFO.bytes)fail('The downloaded AI model has the wrong file size.');
  if(!globalThis.crypto?.subtle)fail('Secure browser cryptography is required for model verification.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const hex=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(hex!==MODEL_SHA)fail('AI model integrity verification failed.');
  onProgress('Initializing private AI on this device…');
  const session=await ort.InferenceSession.create(new Uint8Array(bytes),{
   executionProviders:['wasm'],graphOptimizationLevel:'all',enableCpuMemArena:true
  });
  if(!session.inputNames?.length||!session.outputNames?.length)fail('AI model input/output contract is missing.');
  cachedSession=session;engine=ort;
  return {ort,session};
 })().catch(e=>{sessionPromise=null;throw e;});
 return sessionPromise;
}
export async function segmentImage(file,{onProgress=()=>{},mode='general'}={}){
 if(!['general','portrait'].includes(mode))fail('Choose a supported free model.');
 if(!(file instanceof Blob)||file.size<64||file.size>MAX_BYTES)
  fail('Choose one JPG, PNG or WebP image up to 10 MB.');
 const name=String(file.name||'');
 const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const jpeg=head[0]===0xff&&head[1]===0xd8;
 const png=head[0]===137&&head[1]===80&&head[2]===78&&head[3]===71;
 const webp=String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP';
 if(!jpeg&&!png&&!webp)fail('Select a valid JPG, PNG or WebP image.');
 if(typeof createImageBitmap!=='function')fail('Your browser cannot decode local images using createImageBitmap.');
 let bitmap;
 try{bitmap=await createImageBitmap(file);}
 catch{fail('Your browser cannot decode this photo. Try JPG or PNG.');}
 if(bitmap.width*bitmap.height>MAX_PIXELS||bitmap.width<2||bitmap.height<2){
  bitmap.close();fail('Choose a photo between 2 pixels and 12 megapixels.');
 }
 let canvas;
 try{
  if(mode==='portrait'){
   const {segmentPortrait}=await import('./background-portrait-core.mjs');
   return await segmentPortrait(bitmap,{onProgress});
  }
  canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)fail('Canvas image processing is unavailable.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,SIZE,SIZE);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,SIZE,SIZE);
  const imageData=ctx.getImageData(0,0,SIZE,SIZE);
  const input=prepareU2NetTensor(imageData.data);
  canvas.width=canvas.height=0;canvas=null;
  const {ort,session}=await loadBackgroundModel(onProgress);
  onProgress('Detecting the foreground subject locally…');
  const begin=performance.now(),tensor=new ort.Tensor('float32',input,[1,3,SIZE,SIZE]);
  let outputs,pred;
  try{
   outputs=await session.run({[session.inputNames[0]]:tensor},[session.outputNames[0]]);
   pred=outputs[session.outputNames[0]];
   if(!pred||pred.data.length!==SIZE*SIZE)fail('Unexpected model output dimensions.');
   const mask=normalizeSaliency(pred.data);
   return {bitmap,mask,width:bitmap.width,height:bitmap.height,
    inferenceMs:Math.round(performance.now()-begin),model:MODEL_INFO.id};
  }finally{
   tensor.dispose?.();
   for(const value of Object.values(outputs||{}))value?.dispose?.();
  }
 }catch(error){bitmap.close();throw error;}
 finally{if(canvas)canvas.width=canvas.height=0;}
}
export async function renderTransparentPng(segmentation,options={}){
 const {bitmap,mask,width,height}=segmentation||{};
 const maskWidth=segmentation?.maskWidth||SIZE,maskHeight=segmentation?.maskHeight||SIZE;
 if(!bitmap||mask?.length!==maskWidth*maskHeight||!width||!height||
  ![SIZE,512].includes(maskWidth)||maskWidth!==maskHeight)
  fail('First select and segment an image.');
 const cutoff=Number(options.cutoff??.5),softness=Number(options.softness??.18);
 maskAlpha(.5,{cutoff,softness});
 const edge=Number(options.maxEdge??OUTPUT_EDGE);
 if(![800,1200,1600].includes(edge))fail('Choose a supported export resolution.');
 const scale=Math.min(1,edge/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
 if(w*h>3_000_000)fail('The final image exceeds this device’s memory limit.');
 const maskCanvas=document.createElement('canvas');maskCanvas.width=maskWidth;maskCanvas.height=maskHeight;
 const mc=maskCanvas.getContext('2d',{willReadFrequently:true});if(!mc)fail('Mask rendering is unavailable.');
 const md=mc.createImageData(maskWidth,maskHeight);
 for(let i=0;i<mask.length;i++){
  const offset=i*4;md.data[offset]=md.data[offset+1]=md.data[offset+2]=255;
  md.data[offset+3]=Math.round(maskAlpha(mask[i],{cutoff,softness})*255);
 }
 mc.putImageData(md,0,0);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)fail('Canvas processing is unavailable.');
 ctx.drawImage(bitmap,0,0,w,h);
 ctx.globalCompositeOperation='destination-in';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(maskCanvas,0,0,w,h);
 ctx.globalCompositeOperation='source-over';maskCanvas.width=maskCanvas.height=0;
 try{
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b&&b.size?resolve(b):reject(Error('PNG export failed.')),'image/png'));
  if(blob.size>20*1048576)fail('PNG exceeds 20 MB. Try 800px output.');
  return {blob,filename:'yorphives-background-removed.png',
   summary:'Background removed locally using '+(segmentation.modelName||MODEL_INFO.name)+'. Transparent PNG: '+w+'×'+h+' px.',
   inferenceMs:segmentation.inferenceMs,width:w,height:h};
 }finally{canvas.width=canvas.height=0;}
}
export function disposeSegmentation(segmentation){segmentation?.bitmap?.close?.();}
