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
test('ZIP viewer accepts larger output ZIPs without increasing Office limits',async()=>{
 const zip=new JSZip();
 zip.file('one.bin',new Uint8Array(8*1048576));
 zip.file('two.bin',new Uint8Array(6*1048576));
 const bytes=await zip.generateAsync({type:'uint8array',compression:'STORE'});
 assert.ok(bytes.length>12*1048576);
 assert.throws(()=>inspectZip(bytes),/12 MB/);
 const result=await processFileTool('zip-contents-viewer',[new File([bytes],'large.zip')]);
 assert.match(result.text,/Files: 2/);
 assert.match(result.text,/one\.bin/);
 assert.match(result.text,/two\.bin/);
});

test('duplicate file finder identifies byte-identical local files without modifying them',async()=>{
 const files=[new File(['same'], 'copy-a.txt'),new File(['other'],'different.txt'),new File(['same'],'copy-b.txt')];
 const result=await processFileTool('duplicate-file-finder',files);
 assert.match(result.text,/Identical content groups: 1/);
 assert.match(result.text,/copy-a\.txt/);
 assert.match(result.text,/copy-b\.txt/);
 assert.doesNotMatch(result.text,/Group \d+[\s\S]*different\.txt/);
 assert.match(result.text,/No files were deleted, renamed or uploaded/);
});
test('duplicate finder checks contents, not names or sizes alone',async()=>{
 const f=[new File(['abcd'],'same-name.txt'),new File(['wxyz'],'same-name.txt')];
 const result=await processFileTool('duplicate-file-finder',f);
 assert.match(result.text,/No exact duplicate file contents found/);
});
test('duplicate finder detects duplicate empty files',async()=>{
 const f=[new File([],'empty-1.txt'),new File([],'empty-2.txt')];
 const result=await processFileTool('duplicate-file-finder',f);
 assert.match(result.text,/Identical content groups: 1/);
});
test('batch find and replace modifies copies but leaves original files intact',async()=>{
 const first=new File(['red and red'],'a.txt');
 const second=new File(['red\nblue'],'b.md');
 const result=await processFileTool('batch-find-replace',[first,second],{find:'red',replacement:'green'});
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());
 assert.deepEqual(Object.keys(zip.files).sort(),['a.txt','b.md']);
 assert.equal(await zip.file('a.txt').async('string'),'green and green');
 assert.equal(await zip.file('b.md').async('string'),'green\nblue');
 assert.equal(await first.text(),'red and red');
 assert.match(result.text,/Matches replaced: 3/);
});
test('batch replacement can remove strings and preserve a UTF-8 BOM',async()=>{
 const f=new File([Uint8Array.of(239,187,191),new TextEncoder().encode('a RED b')],'bom.txt');
 const result=await processFileTool('batch-find-replace',[f],{find:'RED',replacement:''});
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());
 const bytes=await zip.file('bom.txt').async('uint8array');
 assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
 assert.equal(new TextDecoder().decode(bytes),'a  b');
});
test('batch replacement rejects invalid and unsafe inputs',async()=>{
 await assert.rejects(()=>processFileTool('batch-find-replace',[new File(['hi'],'note.txt')],{find:'',replacement:'ok'}),/Enter search text/);
 await assert.rejects(()=>processFileTool('batch-find-replace',[new File(['hi'],'image.png')],{find:'hi',replacement:'bye'}),/plain-text/);
 await assert.rejects(()=>processFileTool('batch-find-replace',[new File([Uint8Array.of(0,1,2)],'binary.txt')],{find:'a',replacement:'b'}),/Binary-looking/);
});
test('batch find and replace reports no matches rather than changing files',async()=>{
 const result=await processFileTool('batch-find-replace',[new File(['test'],'note.txt')],{find:'missing',replacement:'X'});
 assert.equal(result.filename,'yorphives-no-matches.txt');
 assert.match(result.text,/Matches replaced: 0/);
});
