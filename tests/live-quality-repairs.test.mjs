import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import edge from '../edge/worker.mjs';
import {genericToolTemplate} from '../scripts/tool-template.mjs';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('microphone access is restricted to the voice recorder, with the global denial detached first',async()=>{
 const headers=await read('_headers');
 const global=headers.split('/*\n')[1].split('\n\n')[0];
 assert.match(global,/Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
 const recorder=headers.split('/tools/voice-recorder/*\n')[1]?.split('\n\n')[0]||'';
 assert.match(recorder,/! Permissions-Policy\n\s+Permissions-Policy: camera=\(\), microphone=\(self\), geolocation=\(\)/);
 assert.ok(headers.indexOf('/tools/voice-recorder/*')>headers.indexOf('/*\n'));
});

test('generated pages do not inherit word-counter instructions',async()=>{
 const template=await read('tools/word-counter/index.html');
 assert.match(template,/Select Count words/);
 for(const file of [false,true]){
  const adapted=genericToolTemplate(template,{file});
  const how=adapted.match(/<h2>How to use this tool<\/h2>[\s\S]*?<\/section>/)?.[0]||'';
  assert.match(how,file?/Choose the file or files/:/Enter the details or content/);
  assert.doesNotMatch(how,/Count words|reading.time|sentence|paragraph/i);
  assert.doesNotMatch(adapted,/<h2>When is this useful\?<\/h2>/);
 }
});

test('social previews use a local fallback without replacing page-specific images',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 for(const item of catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private')){
  const html=await read('dist/'+item.url+'index.html');
  assert.equal((html.match(/<meta\s+property="og:image"/g)||[]).length,1,item.url);
  assert.match(html,/<meta\s+property="og:image"\s+content="https:\/\/yorphives\.com\//,item.url);
 }
});

test('enquiry failure logs only an event code and status, never submitted details',async()=>{
 const captured=[],oldError=console.error;
 console.error=(...args)=>captured.push(args.join(' '));
 try{
  const body={name:'Example Person',email:'private@example.test',requestType:'Other',
   message:'A sample project idea for testing only',consent:true,startedAt:Date.now()-5000};
  const request=new Request('https://yorphives.com/api/hqconnect',{method:'POST',
   headers:{origin:'https://yorphives.com','content-type':'application/json'},body:JSON.stringify(body)});
  const allow={limit:async()=>({success:true})};
  const env={CONTACT_CLIENT_LIMIT:allow,CONTACT_GLOBAL_LIMIT:allow,HQCONNECT_DB:{prepare(){throw Error('private detail')}}};
  assert.equal((await edge.fetch(request,env,{})).status,503);
  assert.deepEqual(captured.map(JSON.parse),[{event:'hqconnect_intake_failure',status:503}]);
  assert.doesNotMatch(captured.join(' '),/Example Person|private@example|sample project|private detail/);
 }finally{console.error=oldError}
});
