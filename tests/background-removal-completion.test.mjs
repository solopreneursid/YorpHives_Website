import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../tools/background-removal-page.mjs',import.meta.url),'utf8')
 .replace(/^import .*?from '\.\/background-removal-core\.mjs';$/m,'');
function setup(fail=false){
 const nodes=new Map(),events=[];
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const element={id,hidden:id==='ai-result',disabled:false,value:'50',files:[],textContent:'',href:'',
   classList:{toggle(){}},listeners:{},addEventListener(type,handler){this.listeners[type]=handler},
   removeAttribute(name){this[name]=''},dispatchEvent(){}};
  nodes.set(id,element);return element;
 };
 node('ai-file').files=[{name:'synthetic.png',size:128}];
 node('ai-model').value='general';node('ai-resolution').value='1600';
 const window={addEventListener(){},dispatchEvent(event){events.push(event.type)}};
 const browser={document:{getElementById:node},window,Event,
  URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},
  segmentImage:async()=>{if(fail)throw Error('Synthetic failure');return {inferenceMs:1}},
  renderTransparentPng:async()=>({blob:{size:100},filename:'synthetic.png',summary:'ready'}),
  disposeSegmentation(){}};
 vm.runInNewContext(source,browser,{timeout:1200});
 return {node,events};
}
test('AI completion is emitted only after a usable result, never on failure or preview refinement',async()=>{
 const good=setup();
 await good.node('ai-form').listeners.submit({preventDefault(){}});
 assert.equal(good.node('ai-result').hidden,false);
 assert.equal(good.node('ai-download').href,'blob:synthetic');
 assert.deepEqual(good.events,['yorphives:tool-completed']);
 await good.node('ai-refine').listeners.click();
 assert.deepEqual(good.events,['yorphives:tool-completed']);
 const bad=setup(true);
 await bad.node('ai-form').listeners.submit({preventDefault(){}});
 assert.equal(bad.node('ai-result').hidden,true);
 assert.deepEqual(bad.events,[]);
});
