// Local file utilities. Never upload or execute selected files.
import {inspectZip} from './safe-zip.mjs';

const outputText=(text,filename,summary)=>({blob:new Blob([text],{type:'text/plain;charset=utf-8'}),filename,summary,text:text.slice(0,10000)});
function cleanName(raw){
  const name=String(raw??'').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f<>:"|?*]/g,'_')
    .replace(/[. ]+$/g,'').trim().slice(0,100);
  return name&&name!=='.'&&name!=='..'?name:'file';
}
function parts(value){
  const name=cleanName(value),i=name.lastIndexOf('.');
  return i>0?[name.slice(0,i),name.slice(i).slice(0,15)]:[name,''];
}
function uniqueName(raw,used){
  const [stem,ext]=parts(raw);let candidate=stem+ext,n=2;
  while(used.has(candidate.toLowerCase()))candidate=stem.slice(0,75)+'-'+n+++ext;
  used.add(candidate.toLowerCase());return candidate;
}
function validate(files,max,maxEach=12*1048576,maxTotal=30*1048576){
  if(!Array.isArray(files)||files.length<1||files.length>max)throw Error(max===1?'Choose one file.':'Choose 1 to 20 files.');
  let total=0;
  for(const file of files){
    if(!file||typeof file.arrayBuffer!=='function'||typeof file.slice!=='function'||
      !Number.isFinite(file.size)||file.size<0||file.size>maxEach)
      throw Error('Each file must be '+Math.floor(maxEach/1048576)+' MB or smaller.');
    total+=file.size;
    if(total>maxTotal)throw Error('Selected files must total '+Math.floor(maxTotal/1048576)+' MB or less.');
  }
}
function signature(b){
  const at=(pos,...a)=>b.length>=pos+a.length&&a.every((v,i)=>b[pos+i]===v);
  const str=(pos,s)=>b.length>=pos+s.length&&[...s].every((c,i)=>b[pos+i]===c.charCodeAt(0));
  if(at(0,137,80,78,71,13,10,26,10))return 'PNG image';
  if(at(0,255,216,255))return 'JPEG image';
  if(str(0,'GIF87a')||str(0,'GIF89a'))return 'GIF image';
  if(str(0,'RIFF')&&str(8,'WEBP'))return 'WebP image';
  if(str(0,'RIFF')&&str(8,'WAVE'))return 'WAV audio';
  if(str(0,'%PDF-'))return 'PDF document';
  if(at(0,80,75,3,4)||at(0,80,75,5,6)||at(0,80,75,7,8))return 'ZIP archive (possibly Office document)';
  if(at(0,31,139))return 'GZIP compressed data';
  if(at(0,55,122,188,175,39,28))return '7-Zip archive';
  if(at(0,82,97,114,33,26,7))return 'RAR archive';
  if(str(0,'ID3'))return 'MP3 audio with ID3 header';
  if(str(4,'ftyp'))return 'ISO media container (often MP4/HEIC/AVIF)';
  if(at(0,26,69,223,163))return 'EBML container (often WebM/Matroska)';
  return 'Unknown (no supported signature recognized)';
}
async function identify(file){
  const bytes=new Uint8Array(await file.slice(0,1024).arrayBuffer());
  const first=[...bytes.slice(0,16)].map(n=>n.toString(16).padStart(2,'0')).join(' ').toUpperCase();
  const result='Filename: '+cleanName(file.name)+'\nSize: '+file.size.toLocaleString('en-US')+
    ' bytes\nDetected signature: '+signature(bytes)+'\nBrowser MIME (unverified): '+(file.type||'Not provided')+
    '\nFirst 16 bytes (hex): '+(first||'(empty file)')+
    '\n\nThis is file-type identification, not malware scanning or proof of file validity.';
  return outputText(result,'yorphives-file-format.txt','Inspected the file header locally.');
}
async function inspectArchive(file){
  if(file.size===0)throw Error('Choose a nonempty ZIP archive.');
  const zip=inspectZip(await file.arrayBuffer(),{maxCompressedBytes:36*1048576});
  const entries=[...zip.entries.values()];
  const count=entries.filter(e=>!e.name.endsWith('/')).length;
  const lines=entries.slice(0,250).map(e=>e.name.replace(/[\x00-\x1f\x7f]/g,'_')+
    ' | '+e.uncompressed.toLocaleString('en-US')+' bytes');
  const result='ZIP: '+cleanName(file.name)+'\nFiles: '+count+'\nFolders: '+(entries.length-count)+
    '\n\nName | Uncompressed size\n'+lines.join('\n')+
    (entries.length>250?'\n... '+(entries.length-250)+' more entries omitted':'')+
    '\n\nDirectory metadata only; file contents were not extracted.';
  return outputText(result,'yorphives-zip-contents.txt','Listed '+entries.length+' ZIP entries without extracting files.');
}
async function makeArchive(files,rename,data){
  const {default:JSZip}=await import('./vendor/jszip.mjs');
  const prefix=String(data.prefix??'file').trim();
  if(rename&&!/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(prefix))
    throw Error('Use a 1–32 character prefix of letters, digits, _ or -.');
  const zip=new JSZip(),used=new Set();
  for(let i=0;i<files.length;i++){
    const name=rename?prefix+'-'+String(i+1).padStart(2,'0')+parts(files[i].name)[1]
      :uniqueName(files[i].name,used);
    zip.file(name,new Uint8Array(await files[i].arrayBuffer()),{binary:true,createFolders:false});
  }
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',
    compressionOptions:{level:3},streamFiles:true,platform:'UNIX'});
  if(blob.size>45*1048576)throw Error('The resulting ZIP exceeds 45 MB.');
  return {blob,filename:rename?'yorphives-renamed-files.zip':'yorphives-files.zip',
    summary:(rename?'Renamed and packaged ':'Packaged ')+files.length+' file(s). Originals are unchanged.'};
}
export async function processBatchFileTool(id,files,data={}){
  const one=id==='file-format-inspector'||id==='zip-contents-viewer';
  if(!one&&!['batch-file-renamer','zip-file-creator'].includes(id))throw Error('Unknown file utility.');
  if(id==='zip-contents-viewer')validate(files,1,36*1048576,36*1048576);
  else validate(files,one?1:20);
  if(id==='file-format-inspector')return identify(files[0]);
  if(id==='zip-contents-viewer')return inspectArchive(files[0]);
  return makeArchive(files,id==='batch-file-renamer',data);
}
