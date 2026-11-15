// Optional portrait matting mode: MIT browser runtime + Apache-2.0 MODNet weights.
// Preprocessing follows Xenova/modnet: resize, RGB CHW, rescale to [-1,1].
// The model (~6.6 MB) and WASM runtime are static YorpHives assets, with no billable inference.
export const PORTRAIT_SIZE=512;
export const PORTRAIT_INFO=Object.freeze({
 id:'modnet-quantized-92e49898',name:'MODNet Portrait',
 filename:'modnet-int8-92e49898.onnx',
 minBytes:6000000,maxBytes:8000000,
 sha256:'92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a',
 license:'Apache-2.0',execution:'browser-wasm',input:[1,3,PORTRAIT_SIZE,PORTRAIT_SIZE],
 use:'people and portraits',cost:'zero paid APIs'
});
let session=null,ort=null,promise=null;
function assert(value,message){if(!value)throw Error(message);}
export function preparePortraitTensor(rgba,width=PORTRAIT_SIZE,height=PORTRAIT_SIZE){
 assert(width===PORTRAIT_SIZE&&height===PORTRAIT_SIZE&&rgba?.length===width*height*4,
  'Portrait model requires a 512×512 RGBA input.');
 const pixels=width*height,tensor=new Float32Array(3*pixels);
 for(let i=0;i<pixels;i++){
  const opacity=rgba[4*i+3]/255;
  for(let channel=0;channel<3;channel++){
   const rgb=rgba[4*i+channel]*opacity+255*(1-opacity);
   tensor[channel*pixels+i]=2*rgb/255-1;
  }
 }
 return tensor;
}
export function normalizePortraitMask(data,expected=PORTRAIT_SIZE*PORTRAIT_SIZE){
 assert(data?.length===expected,'Unexpected portrait model output size.');
 const mask=new Float32Array(expected);let min=Infinity,max=-Infinity;
 for(let i=0;i<expected;i++){
  const raw=data[i];assert(Number.isFinite(raw),'Portrait model produced invalid alpha values.');
  // MODNet model output should already be a normalized alpha in [0,1].
  const alpha=Math.max(0,Math.min(1,raw));mask[i]=alpha;
  if(alpha<min)min=alpha;if(alpha>max)max=alpha;
 }
 assert(max-min>.0001,'The portrait model could not separate a subject. Try the lightweight mode.');
 return mask;
}
export async function loadPortraitModel(onProgress=()=>{}){
 if(session)return {ort,session};
 if(!promise)promise=(async()=>{
  assert(typeof document!=='undefined'&&typeof fetch==='function',
   'Portrait mode needs a modern browser that supports local WebAssembly.');
  onProgress('Preparing free on-device portrait AI…');
  const runtime=await import('./vendor/onnxruntime/ort.wasm.bundle.min.mjs');
  runtime.env.wasm.numThreads=1;runtime.env.wasm.proxy=false;
  runtime.env.wasm.wasmPaths={
   wasm:new URL('./vendor/onnxruntime/ort-wasm-simd-threaded.wasm',import.meta.url).href,
   mjs:new URL('./vendor/onnxruntime/ort-wasm-simd-threaded.mjs',import.meta.url).href
  };
  const uri=new URL('./models/modnet-int8-92e49898.onnx',import.meta.url);
  assert(uri.origin===location.origin,'External model requests are forbidden.');
  onProgress('Loading the optional 6.6 MB portrait model from YorpHives…');
  const response=await fetch(uri.href,{credentials:'omit',mode:'same-origin',cache:'force-cache'});
  assert(response.ok,'The portrait AI model is not available (HTTP '+response.status+').');
  const bytes=await response.arrayBuffer();
  assert(bytes.byteLength>=PORTRAIT_INFO.minBytes&&bytes.byteLength<=PORTRAIT_INFO.maxBytes,
   'Portrait AI weights exceeded the approved 8 MB budget.');
  assert(!!globalThis.crypto?.subtle,'Secure browser cryptography is required for model verification.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const hex=[...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
  assert(hex===PORTRAIT_INFO.sha256,'Portrait model checksum verification failed.');
  onProgress('Initializing portrait detail model on your device…');
  const loaded=await runtime.InferenceSession.create(new Uint8Array(bytes),{
   executionProviders:['wasm'],graphOptimizationLevel:'all',enableCpuMemArena:true
  });
  assert(!!loaded.inputNames?.length&&!!loaded.outputNames?.length,'Portrait model input/output is unavailable.');
  ort=runtime;session=loaded;
  return {ort,session};
 })().catch(error=>{promise=null;throw error;});
 return promise;
}
export async function segmentPortrait(bitmap,{onProgress=()=>{}}={}){
 assert(bitmap?.width>1&&bitmap?.height>1,'A valid decoded portrait is required.');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=PORTRAIT_SIZE;
 let input;
 try{
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  assert(!!ctx,'Portrait image preprocessing is not available.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,PORTRAIT_SIZE,PORTRAIT_SIZE);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,0,0,PORTRAIT_SIZE,PORTRAIT_SIZE);
  input=preparePortraitTensor(ctx.getImageData(0,0,PORTRAIT_SIZE,PORTRAIT_SIZE).data);
 }finally{canvas.width=canvas.height=0;}
 const {ort,session}=await loadPortraitModel(onProgress);
 onProgress('Separating portrait from the background privately…');
 const start=performance.now(),tensor=new ort.Tensor('float32',input,[1,3,PORTRAIT_SIZE,PORTRAIT_SIZE]);
 let outputs;
 try{
  outputs=await session.run({[session.inputNames[0]]:tensor},[session.outputNames[0]]);
  const prediction=outputs[session.outputNames[0]];
  const mask=normalizePortraitMask(prediction?.data);
  return {bitmap,mask,maskSize:PORTRAIT_SIZE,maskWidth:PORTRAIT_SIZE,maskHeight:PORTRAIT_SIZE,
   inferenceMs:Math.round(performance.now()-start),model:PORTRAIT_INFO.id,modelName:PORTRAIT_INFO.name};
 }finally{
  tensor.dispose?.();
  for(const value of Object.values(outputs||{}))value?.dispose?.();
 }
}
