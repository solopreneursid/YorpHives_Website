import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import JSZip from '../tools/vendor/jszip.mjs';
import {inspectZip} from '../tools/safe-zip.mjs';
import {processFileTool} from '../tools/file-core.mjs';
test('signature recognizes bytes independently of file name',async()=>{
 const file=new File([Uint8Array.of(137,80,78,71,13,10,26,10)],'not-png.pdf',{type:'application/pdf'});
 const r=await processFileTool('file-format-inspector',[file]);
 assert.match(r.text,/Detected signature: PNG image/);
 assert.match(r.text,/not malware scanning/);
});
test('ZIP maker resolves duplicate filenames',async()=>{
 const f=[new File(['a'],'same.txt'),new File(['b'],'same.txt')];
 const r=await processFileTool('zip-file-creator',f);
 const zip=inspectZip(await r.blob.arrayBuffer());
 assert.deepEqual([...zip.entries.keys()],['same.txt','same-2.txt']);
});
test('batch rename preserves extensions and disallows traversal prefixes',async()=>{
 const f=[new File(['a'],'first.csv'),new File(['b'],'second.txt')];
 const r=await processFileTool('batch-file-renamer',f,{prefix:'batch'});
 assert.deepEqual([...inspectZip(await r.blob.arrayBuffer()).entries.keys()],['batch-01.csv','batch-02.txt']);
 await assert.rejects(()=>processFileTool('batch-file-renamer',f,{prefix:'../bad'}),/prefix/);
});
test('ZIP viewer reads directory only',async()=>{
 const z=new JSZip();z.file('hello.txt','hi');
 const bytes=await z.generateAsync({type:'uint8array',compression:'STORE'});
 const r=await processFileTool('zip-contents-viewer',[new File([bytes],'a.zip')]);
 assert.match(r.text,/hello.txt/);assert.match(r.text,/without extracting|not extracted/);
 const bad=new JSZip();bad.file('../unsafe.txt','bad');
 const b=await bad.generateAsync({type:'uint8array',compression:'STORE'});
 await assert.rejects(()=>processFileTool('zip-contents-viewer',[new File([b],'bad.zip')]));
});
test('invalid selections are rejected',async()=>{
 for(const id of ['file-format-inspector','zip-file-creator','batch-file-renamer','zip-contents-viewer'])
  await assert.rejects(()=>processFileTool(id,[]));
});
