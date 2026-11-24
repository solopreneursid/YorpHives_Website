import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../insights-client.mjs',import.meta.url),'utf8');
async function simulate({dnt='0',optOut=false,gpc=false,choice='allow',legacy=null,pathname='/tools/word-counter/',hash='',nextHash=''}={}){
 const calls=[],document=new EventTarget(),window=new EventTarget();
 const localStorage={getItem:key=>key==='yorphives-analytics-choice-v2'?(optOut?null:choice==='unset'?null:choice):
   key==='yorphives-anonymous-analytics-disabled'?(optOut?'1':legacy):null,
  setItem(){}};
 const values=new Map();let sessionAccesses=0;
 const sessionStorage={getItem:key=>{sessionAccesses++;return values.get(key)||null},
  setItem:(key,value)=>{sessionAccesses++;values.set(key,value)},removeItem:key=>{sessionAccesses++;values.delete(key)}};
 document.getElementById=()=>null;
 const browser={
  document,window,localStorage,sessionStorage,
  crypto:{randomUUID:()=> '12345678-1234-4123-8123-123456789abc'},
  navigator:{doNotTrack:dnt,globalPrivacyControl:gpc},
  location:{pathname,hash},
  fetch:async(url,options)=>{calls.push({url,...options,payload:JSON.parse(options.body)});return {ok:true,status:200}},
  Date,Event,EventTarget,setInterval,clearInterval,setTimeout,clearTimeout,
  getComputedStyle:()=>({display:'none',visibility:'hidden'})
 };
 vm.runInNewContext(source,browser,{timeout:1200});
 document.dispatchEvent(new Event('DOMContentLoaded'));
 window.dispatchEvent(new Event('yorphives:tool-completed'));
 if(nextHash){browser.location.hash=nextHash;window.dispatchEvent(new Event('hashchange'));}
 await new Promise(resolve=>setTimeout(resolve,0));
 calls.sessionWrites=values.size;
 calls.sessionAccesses=sessionAccesses;
 return calls;
}
test('genuine client events keep tool inputs out of analytics and track per-tool paths',async()=>{
 const calls=await simulate();
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(x=>x.payload.event),['view','complete']);
 assert.equal(calls[0].payload.route,'tools/word-counter/');
 assert.equal(calls[1].payload.url,'tools/word-counter/');
 assert.ok(calls.every(x=>x.url==='/api/insights/collect'));
 assert.ok(calls.every(x=>Object.keys(x.payload).sort().join(',')===
  (x.payload.event==='view'?'consent,event,route,sessionId':'consent,event,sessionId,url')));
 assert.ok(calls.every(x=>x.payload.consent==='analytics-v2'));
 assert.ok(calls.every(x=>x.credentials==='omit'));
});
test('HQconnect direct visits and navigation are attributed to contact',async()=>{
 const direct=await simulate({pathname:'/',hash:'#hqconnect'});
 assert.deepEqual(direct.map(x=>x.payload.route),['contact']);
 const transition=await simulate({pathname:'/',hash:'#home',nextHash:'#hqconnect'});
 assert.deepEqual(transition.map(x=>x.payload.route),['home','contact']);
 assert.deepEqual((await simulate({pathname:'/',hash:'#suggest-tool'})).map(x=>x.payload.route),['contact']);
 assert.equal((await simulate({pathname:'/',hash:'#hqconnect',dnt:'1'})).length,0);
});
test('privacy preferences suppress all pageview and completion telemetry',async()=>{
 for(const setup of [{dnt:'1'},{gpc:true},{optOut:true},{choice:'deny'},{choice:'unset'},{choice:'unset',legacy:'0'}]){
  const calls=await simulate(setup);
  assert.equal(calls.length,0);
  assert.equal(calls.sessionWrites,0,'Do not create a session before permission.');
  assert.equal(calls.sessionAccesses,0,'Do not access analytics session storage before permission.');
 }
});
