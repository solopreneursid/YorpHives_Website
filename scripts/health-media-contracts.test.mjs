// Synthetic, offline media output contracts. No microphone, uploads or video decoding.
import test from 'node:test';
import assert from 'node:assert/strict';
import {wavFromAudioChannels} from '../tools/wave3-core.mjs';
import {scaleAudioChannels} from '../tools/wave6-audio-core.mjs';
import {mergeAudioSamples} from '../tools/wave7-audio-core.mjs';
import {validateVideoSettings} from '../tools/wave6-video-core.mjs';
import {validateVideoTrim} from '../tools/video-trim-core.mjs';

const ascii=(buf,offset,n)=>String.fromCharCode(...buf.slice(offset,offset+n));
test('WAV export is a playable PCM container with correct sample count and duration',async()=>{
 const rate=8000,n=8000;
 const tone=Float32Array.from({length:n},(_,i)=>Math.sin(2*Math.PI*440*i/rate)*.5);
 const wav=wavFromAudioChannels([tone],rate);
 const bytes=new Uint8Array(await wav.arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(wav.type,'audio/wav');
 assert.equal(ascii(bytes,0,4),'RIFF');assert.equal(ascii(bytes,8,4),'WAVE');
 assert.equal(ascii(bytes,12,4),'fmt ');assert.equal(ascii(bytes,36,4),'data');
 assert.equal(view.getUint16(20,true),1);
 assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(24,true),rate);
 assert.equal(view.getUint16(34,true),16);assert.equal(view.getUint32(40,true),n*2);
 assert.equal(bytes.length,44+n*2);
 assert.ok(Math.abs(view.getInt16(44+2*2,true))>1000,'Audio must contain audible sample energy');
});
test('audio normalization boosts quiet samples without clipping',()=>{
 const original=Float32Array.of(-.2,0,.2);
 const output=scaleAudioChannels([original],'normalize');
 assert.ok(output.appliedGain>1);
 assert.ok(Math.max(...output.channels[0])<=.99);
 assert.ok(output.channels[0][0]<-.9&&output.channels[0][2]>.9);
 assert.ok(Math.abs(original[0]+.2)<1e-6,'Input remains unchanged');
});
test('audio volume limiter prevents clipping and keeps stereo channel shapes',()=>{
 const out=scaleAudioChannels([Float32Array.of(.8,-.8),Float32Array.of(.4,-.4)],'3');
 assert.equal(out.channels.length,2);
 assert.equal(out.limited,true);
 assert.ok(out.channels.every(c=>[...c].every(v=>Math.abs(v)<=.99)));
});
test('audio merger preserves total duration and channel samples',()=>{
 const a={sampleRate:8000,channels:[new Float32Array(800).fill(.2)]};
 const b={sampleRate:8000,channels:[new Float32Array(1200).fill(.4)]};
 const result=mergeAudioSamples([a,b],8000);
 assert.equal(result.clips,2);assert.equal(result.sampleRate,8000);
 assert.equal(result.channels.length,1);assert.equal(result.channels[0].length,2000);
 assert.equal(result.duration,.25);
 assert.ok(Math.abs(result.channels[0][100]-.2)<.00001);
 assert.ok(Math.abs(result.channels[0][1000]-.4)<.00001);
});
test('invalid media samples and unsafe audio lengths are rejected',()=>{
 assert.throws(()=>wavFromAudioChannels([new Float32Array(0)],8000),/audio/);
 assert.throws(()=>scaleAudioChannels([Float32Array.of(1),Float32Array.of(1,2)],'1'),/channels/);
 assert.throws(()=>mergeAudioSamples([{sampleRate:8000,channels:[new Float32Array(800)]}],8000),/2–6/);
});
test('video-to-GIF settings validate duration, fps and output size',()=>{
 const x=validateVideoSettings({start:1,end:3,fps:6,width:320},5);
 assert.equal(x.frames,12);assert.equal(x.width,320);assert.equal(x.end,3);
 assert.throws(()=>validateVideoSettings({start:3,end:1},5),/clip/);
 assert.throws(()=>validateVideoSettings({start:0,end:4,fps:120},5),/frame rate/);
});
test('video trim validates exact clip duration and out-of-range input',()=>{
 const clip=validateVideoTrim(1,3.5,10);
 assert.equal(clip.length,2.5);
 assert.throws(()=>validateVideoTrim(8,12,10),/start and end times/);
 assert.throws(()=>validateVideoTrim(1,1.1,10),/start and end times/);
});
