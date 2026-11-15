// v1.7 audio tools — no backend or outgoing microphone stream.
import {wavFromAudioChannels} from './wave3-core.mjs';
const MB=1048576;
export function mergeAudioSamples(buffers,outputRate=44100){
 if(!Array.isArray(buffers)||buffers.length<2||buffers.length>6||
    !Number.isInteger(outputRate)||outputRate<8000||outputRate>48000)
  throw Error('Choose 2–6 supported audio buffers.');
 let samples=0;
 const clips=buffers.map((clip,i)=>{
  const sourceRate=Number(clip.sampleRate),channels=clip.channels;
  if(!Number.isFinite(sourceRate)||sourceRate<8000||sourceRate>192000||
     !Array.isArray(channels)||!channels.length||channels.length>2||
     channels.some(a=>!(a instanceof Float32Array)||a.length!==channels[0].length))
   throw Error('Audio clip '+(i+1)+' contains invalid samples.');
  const len=Math.ceil(channels[0].length*outputRate/sourceRate);
  if(len<100)throw Error('Audio clip '+(i+1)+' is too short.');
  samples+=len;
  if(samples>outputRate*120)throw Error('Combined recordings cannot exceed two minutes.');
  return {channels,len,sourceRate};
 });
 if(samples*2>12_000_000)throw Error('Merged audio exceeds export limits.');
 const stereo=clips.some(x=>x.channels.length===2);
 const joined=Array.from({length:stereo?2:1},()=>new Float32Array(samples));
 let offset=0;
 clips.forEach((clip,index)=>{
  const fade=Math.min(441,Math.floor(clip.len/8));
  for(let channel=0;channel<joined.length;channel++){
   const input=clip.channels[Math.min(channel,clip.channels.length-1)];
   for(let i=0;i<clip.len;i++){
    const at=Math.min(input.length-1,i*clip.sourceRate/outputRate),left=Math.floor(at),
     right=Math.min(input.length-1,left+1),mix=at-left;
    let sample=input[left]*(1-mix)+input[right]*mix;
    if(index>0&&i<fade)sample*=i/fade;
    if(index<clips.length-1&&i>clip.len-fade)sample*=(clip.len-i)/fade;
    joined[channel][offset+i]=Math.max(-1,Math.min(1,sample));
   }
  }
  offset+=clip.len;
 });
 return {channels:joined,sampleRate:outputRate,duration:samples/outputRate,clips:clips.length};
}
export async function mergeAudioFiles(files){
 if(!Array.isArray(files)||files.length<2||files.length>6||
    files.some(f=>!(f instanceof Blob)||f.size<100||f.size>12*MB)||
    files.reduce((sum,f)=>sum+f.size,0)>36*MB)
  throw Error('Choose 2–6 audio clips, each up to 12 MB, total up to 36 MB.');
 if(typeof window==='undefined'||!(window.AudioContext||window.webkitAudioContext))
  throw Error('This browser cannot process audio.');
 const AudioContext=window.AudioContext||window.webkitAudioContext,ctx=new AudioContext(),buffers=[];
 try{
  for(const file of files){
   if(!/\.(?:wav|mp3|m4a|aac|ogg|flac)$/i.test(String(file.name||''))&&!/^audio\//.test(file.type))
    throw Error('Select audio files such as WAV, MP3 or M4A.');
   let decoded;
   try{decoded=await ctx.decodeAudioData(await file.arrayBuffer());}
   catch{throw Error('Your browser cannot decode '+String(file.name||'one file')+'.');}
   buffers.push({channels:Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i).slice()),
    sampleRate:decoded.sampleRate});
  }
  const merged=mergeAudioSamples(buffers);
  const blob=wavFromAudioChannels(merged.channels,merged.sampleRate);
  if(blob.size>50*MB)throw Error('Merged WAV file exceeds 50 MB.');
  return {blob,filename:'yorphives-merged-audio.wav',
   summary:'Joined '+merged.clips+' audio files into '+merged.duration.toFixed(1)+' seconds of WAV audio, with short fades at each join.'};
 }finally{await ctx.close().catch(()=>{});}
}
export function recorderMime(supports){
 return ['audio/webm;codecs=opus','audio/mp4;codecs=mp4a.40.2','audio/webm','audio/ogg;codecs=opus','audio/mp4','audio/ogg']
  .find(supports)||null;
}
export async function beginVoiceRecording({onTick}={}){
 if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')
  throw Error('Microphone recording requires a modern browser with secure access.');
 const mime=recorderMime(type=>MediaRecorder.isTypeSupported(type));
 if(!mime)throw Error('This browser cannot record audio in a supported format.');
 // MUST be the first awaited operation to preserve browser user-activation permission.
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});}
 catch{throw Error('Microphone permission was denied or no microphone is available.');}
 let recorder,interval,limit,t0,finished=false;
 const release=()=>stream.getTracks().forEach(track=>{try{track.stop();}catch{}});
 const stop=()=>{if(!recorder||recorder.state==='inactive'){release();return;}try{recorder.stop();}catch{release();}};
 try{
  const parts=[];
  const ended=new Promise((resolve,reject)=>{
   recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:96000});
   recorder.addEventListener('dataavailable',e=>{if(e.data?.size)parts.push(e.data);});
   recorder.addEventListener('error',()=>reject(Error('The audio recorder failed.')),{once:true});
   recorder.addEventListener('stop',resolve,{once:true});
  });
  recorder.start(500);t0=performance.now();
  interval=setInterval(()=>{onTick?.(Math.min(120,(performance.now()-t0)/1000));},250);
  limit=setTimeout(stop,120000);
  const complete=(async()=>{
   try{
    await ended;
    const type=mime.split(';')[0],blob=new Blob(parts,{type});
    if(blob.size<50||blob.size>25*MB)throw Error('Recording is empty or too large.');
    const ext=type==='audio/mp4'?'m4a':type==='audio/ogg'?'ogg':'webm';
    return {blob,filename:'yorphives-voice-recording.'+ext,
     summary:'Recorded '+Math.round((performance.now()-t0)/1000)+' seconds locally. Audio was not uploaded.'};
   }finally{finished=true;clearInterval(interval);clearTimeout(limit);release();}
  })();
  return {stop,complete};
 }catch(err){clearInterval(interval);clearTimeout(limit);release();throw err;}
}
