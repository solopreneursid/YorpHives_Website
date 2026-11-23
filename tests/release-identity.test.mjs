import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {writeReleaseIdentity} from '../scripts/release-identity.mjs';
test('release identity describes actual assets and exact source SHA',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'yorphives-release-'));
 try{
  for(const n of ['index.html','catalog.json','tools/index.html','sitemap.xml','_headers']){
   await mkdir(dirname(join(dir,n)),{recursive:true});await writeFile(join(dir,n),'fixture:'+n);
  }
  const sha='a'.repeat(40);
  const one=await writeReleaseIdentity({dir,target:'preview',sourceSha:sha});
  const two=await writeReleaseIdentity({dir,target:'preview',sourceSha:sha});
  assert.deepEqual(one,two);assert.equal(one.sourceSha,sha);
  const stored=JSON.parse(await readFile(join(dir,'.well-known','yorphives-release.json'),'utf8'));
  assert.equal(stored.target,'preview');assert.equal(Object.keys(stored.assets).length,5);
  await writeFile(join(dir,'index.html'),'changed');
  const altered=await writeReleaseIdentity({dir,target:'preview',sourceSha:sha});
  assert.notEqual(altered.assetFingerprint,one.assetFingerprint);
  await assert.rejects(writeReleaseIdentity({dir,target:'not-valid',sourceSha:sha}),/target/);
  await assert.rejects(writeReleaseIdentity({dir,target:'production',sourceSha:'unverified'}),/SHA/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
