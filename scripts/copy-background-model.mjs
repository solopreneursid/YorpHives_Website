// Build-time only: fetch the exact Apache-2.0 U²-Net-small ONNX weights.
// The browser NEVER requests a model from a third party. Abort on integrity mismatch.
import {mkdir,readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const filename='u2netp-309c8469.onnx';
export const MODEL={
 name:'U2-Net-small (u2netp)',
 filename,
 bytes:4574861,
 sha256:'309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8'
};
const mirrorUrls=[
 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
 'https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx',
 'https://huggingface.co/nfa04/u2netp-onnx/resolve/main/u2netp.onnx'
];
const cache=resolve(root,'.cache/ai-models',filename);
const output=resolve(root,'dist/tools/models',filename);
function validate(bytes){
 if(bytes.length!==MODEL.bytes)throw Error('Model size mismatch: '+bytes.length+'; expected '+MODEL.bytes);
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==MODEL.sha256)throw Error('Background-removal model SHA-256 mismatch: '+digest);
}
async function getCache(){
 const file=await readFile(cache).catch(()=>null);
 if(file){try{validate(file);return file;}catch{ /* never use unverified cache */ }}
 return null;
}
async function download(url){
 const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(65000),headers:{'user-agent':'YorpHives-source-asset-build/1.0'}});
 if(!res.ok)throw Error('HTTP '+res.status+' from '+new URL(url).hostname);
 if(Number(res.headers.get('content-length')||0)>MODEL.bytes+1024)throw Error('Unexpectedly large ONNX download.');
 const chunks=[];let n=0;
 const reader=res.body?.getReader();
 if(!reader)throw Error('Model source did not provide a readable body.');
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   n+=value.length;if(n>MODEL.bytes+1024)throw Error('Model download exceeds verified size.');
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const data=Buffer.concat(chunks.map(c=>Buffer.from(c)),n);validate(data);
 return data;
}
async function main(){
 let bytes=await getCache();
 if(!bytes){
  const errors=[];
  for(const url of mirrorUrls){
   try{bytes=await download(url);break;}
   catch(e){errors.push(e.message);}
  }
  if(!bytes)throw Error('Cannot obtain integrity-verified u2netp weights: '+errors.join('; '));
  await mkdir(dirname(cache),{recursive:true});await writeFile(cache,bytes);
 }
 await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
 validate(await readFile(output));
 console.log('AI MODEL INSTALLED: '+filename+'; '+MODEL.bytes+' bytes; verified SHA-256='+MODEL.sha256+'.');
}
await main();
