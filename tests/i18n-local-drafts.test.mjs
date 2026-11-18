import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localTranslationEndpoint,catalogDraftJobs,runLocalDrafts} from '../scripts/i18n-local-adapter.mjs';
test('local AI translation drafts cannot reach remote translation APIs',()=>{
 assert.equal(localTranslationEndpoint(),'http://127.0.0.1:5000/translate');
 for(const address of ['https://api.example.com/translate','http://192.168.1.10/translate',
   'https://127.0.0.1/translate','http://127.0.0.1.evil.example/translate',
   'http://user:pass@localhost/translate']){
  assert.throws(()=>localTranslationEndpoint(address),/local self-hosted/);
 }
});
test('new catalog products generate only missing translation jobs',()=>{
 const item={url:'apps/new-app/',type:'app',name:'Brand New App',
  description:'A useful new launch for customers.',
  localizations:{hi:{name:'नया ऐप'}}};
 const jobs=catalogDraftJobs([item],{});
 assert.equal(jobs.length,13);
 assert.equal(jobs.find(x=>x.language==='hi'&&x.field==='description').text,item.description);
 assert.equal(jobs.some(x=>x.language==='hi'&&x.field==='name'),false);
 const old=catalogDraftJobs([{url:'tools/old/',type:'tool',name:'Original',description:'Old description'}],
  {'tools/old/':{name:'Original',description:'Old description'}});
 assert.equal(old.length,0);
 const revised=catalogDraftJobs([{url:'tools/old/',type:'tool',name:'Original',description:'Updated description'}],
  {'tools/old/':{name:'Original',description:'Old description'}});
 assert.equal(revised.length,14);
});
test('local model output is always an unapproved draft',async()=>{
 const calls=[];
 const jobs=[{url:'apps/x/',language:'hi',field:'name',text:'New product'}];
 const result=await runLocalDrafts({jobs,translate:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({translatedText:'नया उत्पाद'})};
 }});
 assert.equal(result[0].reviewed,false);
 assert.equal(result[0].suggestion,'नया उत्पाद');
 assert.equal(calls[0].url,'http://127.0.0.1:5000/translate');
 assert.equal(JSON.parse(calls[0].options.body).q,'New product');
});
