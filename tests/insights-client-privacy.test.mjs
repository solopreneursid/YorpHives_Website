import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../insights-client.mjs',import.meta.url),'utf8');
async function simulate({dnt='0',optOut=false,gpc=false}={}){
 const calls=[],document=new EventTarget(),window=new EventTarget();
 const localStorage={getItem:key=>key==='yorphives-anonymous-analytics-disabled'&&optOut?'1':null,
  setItem(){}};
 const values=new Map();
 const sessionStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 document.getElementById=()=>null;
 const browser={
  document,window,localStorage,sessionStorage,
  crypto:{randomUUID:()=> '12345678-1234-4123-8123-123456789abc'},
  navigator:{doNotTrack:dnt,globalPrivacyControl:gpc},
  location:{pathname:'/tools/word-counter/',hash:''},
  fetch:async(url,options)=>{calls.push({url,...options,payload:JSON.parse(options.body)});return {ok:true,status:200}},
  Date,Event,EventTarget,setInterval,clearInterval,setTimeout,clearTimeout,
  getComputedStyle:()=>({display:'none',visibility:'hidden'})
 };
 vm.runInNewContext(source,browser,{timeout:1200});
 document.dispatchEvent(new Event('DOMContentLoaded'));
 window.dispatchEvent(new Event('yorphives:tool-completed'));
 await new Promise(resolve=>setTimeout(resolve,0));
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
  (x.payload.event==='view'?'event,route,sessionId':'event,sessionId,url')));
 assert.ok(calls.every(x=>x.credentials==='omit'));
});
test('privacy preferences suppress all pageview and completion telemetry',async()=>{
 for(const setup of [{dnt:'1'},{gpc:true},{optOut:true}])
  assert.equal((await simulate(setup)).length,0);
});
