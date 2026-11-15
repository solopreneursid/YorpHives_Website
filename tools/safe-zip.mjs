// Bounded, read-only ZIP parsing for locally selected OOXML documents.
// Deflate output is streamed and stopped before it exceeds the declared limit.
const MAX_COMPRESSED = 12 * 1024 * 1024;
const MAX_TOTAL = 48 * 1024 * 1024;
const MAX_ENTRY = 12 * 1024 * 1024;
const MAX_ENTRIES = 5000;
const decoder = new TextDecoder('utf-8', {fatal:true});
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; table[n]=c>>>0; }
function crc32(chunks) { let crc=0xffffffff; for(const chunk of chunks)for(const b of chunk)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0; }
function invalid() { throw new Error('This file is not a supported, unencrypted Office document.'); }

export function inspectZip(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if(bytes.length<22||bytes.length>MAX_COMPRESSED)throw new Error('Choose an Office file no larger than 12 MB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=i=>view.getUint16(i,true),u32=i=>view.getUint32(i,true);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50 && i+22+u16(i+20)===bytes.length){end=i;break;}
  if(end<0||u16(end+4)!==0||u16(end+6)!==0||u16(end+8)!==u16(end+10))invalid();
  const count=u16(end+10),size=u32(end+12),start=u32(end+16);
  if(count===65535||count>MAX_ENTRIES||start===0xffffffff||size===0xffffffff||start+size!==end)invalid();
  const entries=new Map();let pos=start,total=0;
  for(let i=0;i<count;i++){
    if(pos+46>end||u32(pos)!==0x02014b50)invalid();
    const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),compressed=u32(pos+20),uncompressed=u32(pos+24);
    const nameLen=u16(pos+28),extraLen=u16(pos+30),commentLen=u16(pos+32),disk=u16(pos+34),local=u32(pos+42),next=pos+46+nameLen+extraLen+commentLen;
    if(next>end||disk!==0||(flags&1)||(flags&0x40)||![0,8].includes(method)||compressed===0xffffffff||uncompressed===0xffffffff||local===0xffffffff)invalid();
    if(uncompressed>MAX_ENTRY || (compressed===0 && uncompressed>0) || (compressed>0 && uncompressed/compressed>1000))throw new Error('The Office file contains an entry that is too large to process safely.');
    total+=uncompressed;if(total>MAX_TOTAL)throw new Error('The Office file expands beyond the supported limit.');
    let name;try{name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));}catch{invalid()}
    if(!name||name.startsWith('/')||name.includes('\\')||name.includes('\0')||name.split('/').some(part=>part==='..'||part==='.'))invalid();
    if(entries.has(name))invalid();entries.set(name,{name,flags,method,crc,compressed,uncompressed,local});pos=next;
  }
  if(pos!==end)invalid();
  return {bytes,entries,centralStart:start};
}

export async function readZipEntry(archive,name,limit=MAX_ENTRY) {
  const entry=archive.entries.get(name);if(!entry)throw new Error('A required document component is missing.');
  if(entry.uncompressed>limit)throw new Error('A document component is too large to process safely.');
  const bytes=archive.bytes,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),at=entry.local;
  if(at+30>archive.centralStart||view.getUint32(at,true)!==0x04034b50)invalid();
  const flags=view.getUint16(at+6,true),method=view.getUint16(at+8,true),nameLen=view.getUint16(at+26,true),extraLen=view.getUint16(at+28,true),start=at+30+nameLen+extraLen,end=start+entry.compressed;
  if(flags!==entry.flags||method!==entry.method||end>archive.centralStart||start<at+30)invalid();
  let localName;try{localName=decoder.decode(bytes.subarray(at+30,at+30+nameLen))}catch{invalid()}
  if(localName!==entry.name)invalid();
  const data=bytes.subarray(start,end),chunks=[];let length=0;
  if(entry.method===0){chunks.push(data);length=data.length;}
  else {
    if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot open compressed Office files. Try a current browser.');
    let reader;
    try{reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>entry.uncompressed||length>limit){await reader.cancel();throw new Error('A document component expanded beyond the allowed limit.');}chunks.push(part.value);}
    }catch(error){if(error?.message?.includes('allowed limit'))throw error;throw new Error('The Office file could not be decompressed.');}
  }
  if(length!==entry.uncompressed||crc32(chunks)!==entry.crc)throw new Error('The Office file is damaged or incomplete.');
  const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}

export async function readZipText(archive,name,limit=MAX_ENTRY){
  const bytes=await readZipEntry(archive,name,limit);let result;try{result=decoder.decode(bytes)}catch{throw new Error('A document component is not valid UTF-8.');}
  if(/<!DOCTYPE|<!ENTITY/i.test(result))throw new Error('Office files with document type declarations are not supported.');return result;
}
