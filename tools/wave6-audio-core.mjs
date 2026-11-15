// Native Web Audio volume & normalization workflow. Browser-local WAV export only.
import {wavFromAudioChannels} from './wave3-core.mjs';
const MB=1048576;
export function scaleAudioChannels(channels,mode='1.5'){
 if(!Array.isArray(channels)||!channels.length||channels.length>2||channels.some(c=>!(c instanceof Float32Array)))
  throw Error('Choose mono or stereo audio data.');
 const first=channels[0]?.length;
 if(!first||channels.some(c=>c.length!==first))throw Error('The audio channels do not match.');
 const modes=['0.5','1','1.5','2','3','normalize'];
 if(!modes.includes(String(mode)))throw Error('Choose a supported volume setting.');
 let peak=0;
 for(const c of channels)for(const sample of c)peak=Math.max(peak,Math.abs(sample));
 const requested=mode==='normalize'?(peak?Math.min(8,.98/peak):1):Number(mode);
 const applied=peak?Math.min(requested,.99/peak):requested;
 return {channels:channels.map(c=>Float32Array.from(c,v=>Math.max(-.99,Math.min(.99,v*applied)))),
  appliedGain:applied,limited:applied<requested,originalPeak:peak};
}
export async function adjustAudioVolume(file,options={}){
 if(!(file instanceof Blob)||file.size<1||file.size>18*MB)throw Error('Choose a recording no larger than 18 MB.');
 if(!/\.(?:mp3|wav|m4a|aac|ogg|flac)$/i.test(String(file.name||''))&&!/^audio\//.test(file.type))
  throw Error('Choose MP3, WAV, M4A, OGG or another browser-decodable audio file.');
 if(typeof window==='undefined'||typeof(window.AudioContext||window.webkitAudioContext)!=='function')
  throw Error('This browser does not support audio processing.');
 const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx();
 try{
  let decoded;
  try{decoded=await ctx.decodeAudioData(await file.arrayBuffer());}
  catch{throw Error('Your browser cannot decode this audio file. Try MP3 or WAV.');}
  if(decoded.numberOfChannels<1||decoded.numberOfChannels>2||decoded.duration>120||decoded.duration<.1)
   throw Error('Use mono or stereo audio between 0.1 and 120 seconds.');
  const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i).slice());
  const result=scaleAudioChannels(channels,options.gain??'1.5');
  const blob=wavFromAudioChannels(result.channels,decoded.sampleRate);
  if(blob.size>50*MB)throw Error('The edited WAV file exceeds 50 MB.');
  return {blob,filename:'yorphives-audio-volume.wav',
   summary:(options.gain==='normalize'?'Normalized':'Adjusted')+' audio volume locally. '+(result.limited?'Automatic limiter prevented clipping. ':'')+'Downloaded as WAV to preserve the edited audio.'};
 }finally{await ctx.close().catch(()=>{});}
}
