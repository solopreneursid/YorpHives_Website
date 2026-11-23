// YorpHives Wave 3 — private, on-device audio and HEIC conversion.
// No third-party network calls, storage, tracking or backend file uploads.
const MB=1048576;
function onlyFile(files,maxBytes=18*MB){
 if(!Array.isArray(files)||files.length!==1||!(files[0] instanceof Blob)||files[0].size<1||files[0].size>maxBytes)
  throw Error('Choose one non-empty file up to '+Math.floor(maxBytes/MB)+' MB.');
 return files[0];
}
function result(blob,filename,summary,extra={}){
 if(!(blob instanceof Blob)||!blob.size)throw Error('The converter returned an empty result.');
 return {blob,filename,summary,...extra};
}
export function isHeicHeader(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.length<16||String.fromCharCode(...b.slice(4,8))!=='ftyp')return false;
 // HEIF uses ISO BMFF: recognized brands identify actual HEIC/HEIF images.
 const brands=[];
 for(let i=8;i+4<=Math.min(b.length,36);i+=4)brands.push(String.fromCharCode(...b.slice(i,i+4)));
 return brands.some(x=>['heic','heix','hevc','hevx','heim','heis'].includes(x));
}
let heicEnginePromise;
function loadHeicEngine(){
 if(typeof document==='undefined')throw Error('HEIC conversion requires a browser.');
 if(!heicEnginePromise)heicEnginePromise=import('./vendor/heic/heic-to.mjs')
  .then(module=>{
   if(typeof module.heicTo!=='function')throw Error('The local HEIC decoder could not start.');
   return module.heicTo;
  })
  .catch(error=>{
   heicEnginePromise=null;
   throw Error('The local HEIC decoder could not load: '+String(error?.message||'Unsupported browser module.'));
  });
 return heicEnginePromise;
}
async function convertHeic(files,options={}){
 const file=onlyFile(files,12*MB);
 const head=new Uint8Array(await file.slice(0,36).arrayBuffer());
 if(!isHeicHeader(head))throw Error('This file does not contain a supported HEIC/HEIF image.');
 const format=options.format==='png'?'png':'jpeg',mime=format==='png'?'image/png':'image/jpeg';
 const quality=Number(options.quality??.9);
 if(!Number.isFinite(quality)||quality<.3||quality>1)throw Error('Choose an image quality from 30% to 100%.');
 // Native decoding, when available, avoids an unnecessary legacy decoder.
 // Chrome may not implement HEIC decoding, so retain the bundled local fallback.
 let native;
 try{
  if(typeof createImageBitmap==='function'){
   const picture=await Promise.race([
    createImageBitmap(file),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('Native image decoding timed out.')),5000))
   ]);
   try{
    const canvas=document.createElement('canvas');canvas.width=picture.width;canvas.height=picture.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(picture,0,0);
    native=await new Promise(resolve=>canvas.toBlob(resolve,mime,quality));
    canvas.width=canvas.height=0;
   }finally{picture.close();}
  }
 }catch{native=null;}
 if(native instanceof Blob&&native.size>0&&native.size<=40*MB)
  return result(native,'yorphives-converted.'+(format==='png'?'png':'jpg'),'Converted HEIC to '+format.toUpperCase()+' locally using browser decoding.',{image:true});
 const convert=await Promise.race([
  loadHeicEngine(),
  new Promise((_,reject)=>setTimeout(()=>reject(Error('The local HEIC decoder did not load in time.')),15000))
 ]);
 let blob;
 try{
  const timeout=Math.min(90000,Math.max(30000,Math.ceil(file.size/1048576)*8000));
  blob=await Promise.race([
   convert({blob:file,type:mime,quality}),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('The local HEIC decoder exceeded its '+Math.round(timeout/1000)+'-second time limit. This photo may use an unsupported codec.')),timeout))
  ]);
 }catch(error){
  if(/time limit/.test(error?.message||''))throw error;
  const cause=String(error?.message||'The decoder reported an unknown error.').replace(/[\r\n]+/g,' ').slice(0,150);
  throw Error('This HEIC image could not be decoded on your device. Decoder detail: '+cause);
 }
 if(Array.isArray(blob))blob=blob[0]; // Bursts: take first image; do not claim to convert an animation.
 if(!(blob instanceof Blob)||blob.size<1||blob.size>40*MB)throw Error('The converted image is invalid or too large.');
 return result(blob,'yorphives-converted.'+(format==='png'?'png':'jpg'),'Converted HEIC to '+format.toUpperCase()+' locally. Original photo metadata may not be preserved.',{image:true});
}
export function wavFromAudioChannels(channels,rate){
 if(!Array.isArray(channels)||channels.length<1||channels.length>2||!Number.isInteger(rate)||rate<8000||rate>192000)
  throw Error('Unsupported audio format.');
 const length=channels[0]?.length;
 if(!Number.isInteger(length)||length<1||length>rate*120||channels.some(x=>!(x instanceof Float32Array)||x.length!==length))
  throw Error('Choose an audio section no longer than two minutes.');
 const samples=length*channels.length;
 if(samples>12_000_000)throw Error('Audio export exceeds the size limit.');
 const buffer=new ArrayBuffer(44+samples*2);
 const view=new DataView(buffer),ascii=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
 ascii(0,'RIFF');view.setUint32(4,36+samples*2,true);ascii(8,'WAVE');
 ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
 view.setUint16(22,channels.length,true);view.setUint32(24,rate,true);
 view.setUint32(28,rate*channels.length*2,true);view.setUint16(32,channels.length*2,true);view.setUint16(34,16,true);
 ascii(36,'data');view.setUint32(40,samples*2,true);
 let offset=44;
 for(let i=0;i<length;i++)for(const channel of channels){
  const value=Math.max(-1,Math.min(1,channel[i]));
  view.setInt16(offset,value<0?Math.round(value*32768):Math.round(value*32767),true);
  offset+=2;
 }
 return new Blob([buffer],{type:'audio/wav'});
}
async function trimAudio(files,options={}){
 const file=onlyFile(files,18*MB);
 if(!/\.(?:mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)&&!/^audio\//.test(file.type))
  throw Error('Choose a supported audio file, such as MP3 or WAV.');
 if(typeof window==='undefined'||typeof (window.AudioContext||window.webkitAudioContext)!=='function')
  throw Error('Audio trimming needs a browser with Web Audio support.');
 const start=Number(options.start??0),end=Number(options.end??0);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>120)
  throw Error('Choose valid start/end seconds, with a maximum selection of 120 seconds.');
 const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
 const audio=new AudioContextCtor();
 try{
  let buffer;
  try{buffer=await audio.decodeAudioData(await file.arrayBuffer());}
  catch{throw Error('Your browser could not decode this audio file. Try an MP3 or WAV file.');}
  if(buffer.numberOfChannels>2)throw Error('Only mono and stereo files are supported.');
  if(end>buffer.duration+.0001)throw Error('End time exceeds the audio length of '+buffer.duration.toFixed(1)+' seconds.');
  const begin=Math.min(buffer.length,Math.floor(start*buffer.sampleRate));
  const finish=Math.min(buffer.length,Math.floor(end*buffer.sampleRate));
  if(finish-begin<100)throw Error('Choose a section at least 0.1 seconds long.');
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i).slice(begin,finish));
  const wav=wavFromAudioChannels(channels,buffer.sampleRate);
  return result(wav,'yorphives-audio-trimmed.wav','Trimmed '+((finish-begin)/buffer.sampleRate).toFixed(1)+' seconds. Downloaded as WAV, regardless of original format.');
 }finally{await audio.close().catch(()=>{});}
}
export const WAVE3_IDS=Object.freeze(['heic-to-jpg','audio-trimmer']);
export async function processWave3(id,files=[],options={}){
 if(!WAVE3_IDS.includes(id))throw Error('Unknown file processing tool.');
 return id==='heic-to-jpg'?convertHeic(files,options):trimAudio(files,options);
}
