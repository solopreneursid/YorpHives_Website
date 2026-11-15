// Build-only acquisition of a pinned, commercially usable Apache-2.0 portrait matting model.
// No visitor ever connects to Hugging Face: a SHA-256-verified copy is served by YorpHives.
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MODEL={
 filename:'modnet-int8-92e49898.onnx',
 sha256:'92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a',
 minBytes:6000000,maxBytes:8000000,
 source:'https://huggingface.co/Xenova/modnet/resolve/7e0f55f28727b43369531f75e0539ecc4912af82/onnx/model_quantized.onnx'
};
const cache=resolve(root,'.cache/ai-models',MODEL.filename),output=resolve(root,'dist/tools/models',MODEL.filename);
function validate(bytes){
 if(bytes.length<MODEL.minBytes||bytes.length>MODEL.maxBytes)throw Error('MODNet quantized weights have unexpected size: '+bytes.length);
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==MODEL.sha256)throw Error('MODNet quantized weights SHA-256 mismatch: '+hash);
}
let bytes=await readFile(cache).catch(()=>null);
if(bytes){try{validate(bytes);}catch{bytes=null;}}
if(!bytes){
 const response=await fetch(MODEL.source,{signal:AbortSignal.timeout(85000),redirect:'follow',
  headers:{'user-agent':'YorpHives-free-selfhosted-portrait-model/1.0'}});
 if(!response.ok)throw Error('Failed to fetch verified open-weight portrait model: HTTP '+response.status);
 const reader=response.body?.getReader();if(!reader)throw Error('Verified model download has no readable response.');
 const parts=[];let count=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   count+=value.byteLength;
   if(count>MODEL.maxBytes)throw Error('Portrait model exceeded strict 8 MB static-asset budget.');
   parts.push(Buffer.from(value));
  }
 }finally{reader.releaseLock();}
 bytes=Buffer.concat(parts,count);validate(bytes);
 await mkdir(dirname(cache),{recursive:true});await writeFile(cache,bytes);
}
await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
validate(await readFile(output));
await copyFile(resolve(root,'tools/models/u2netp-APACHE-2.0-LICENSE.txt'),
 resolve(root,'dist/tools/models/modnet-APACHE-2.0-LICENSE.txt'));
console.log('FREE PORTRAIT AI MODEL VERIFIED: '+bytes.length+' bytes; SHA-256='+MODEL.sha256+'; no paid runtime.');
