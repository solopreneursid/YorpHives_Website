import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const js=await readFile(resolve(root,'app.js'),'utf8');
const begin=js.indexOf('  function setupQualifiedShowcase(products) {');
const end=js.indexOf('  async function loadCatalog() {',begin);
assert.ok(begin>0&&end>begin,'Carousel function should exist in the homepage bundle');
const setup=new Function('document','window','IntersectionObserver',
  js.slice(begin,end)+';return setupQualifiedShowcase;');

class Element {
  constructor(){this.children=[];this.attributes={};this.listeners={};this.textContent='';this.hidden=false;this.disabled=false;this.className='';}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  querySelectorAll(){return [];}
}
function fixture({mobile=false,reduced=false}={}){
  const ids=new Map();
  const names=['qualified-showcase','qualified-showcase-empty','qualified-showcase-cards',
    'qualified-showcase-count','qualified-showcase-prev','qualified-showcase-next',
    'qualified-showcase-pause','explore-showcase-label','home'];
  names.forEach(id=>ids.set(id,new Element()));
  const mediaMobile={matches:mobile,addEventListener(event,fn){this.onChange=fn;}};
  const mediaMotion={matches:reduced,addEventListener(event,fn){this.onChange=fn;}};
  let ticker=null;
  const document={
    getElementById:id=>ids.get(id),
    createElement:()=>new Element(),
    baseURI:'https://yorphives.com/',
    hidden:false,
    activeElement:null
  };
  const window={
    matchMedia:query=>query.includes('max-width')?mediaMobile:mediaMotion,
    setInterval:callback=>{ticker=callback;}
  };
  const products=['A','B','C','D'].map(letter=>({
    type:'app',name:letter+' App',description:'An example testing card.',url:'apps/'+letter.toLowerCase()+'/'
  }));
  const shown=()=>ids.get('qualified-showcase-cards').children.map(link=>link.children[1].children[1].textContent);
  return {ids,document,window,products,shown,tick:()=>ticker?.(),hasTimer:()=>!!ticker,
    setup:arr=>setup(document,window,undefined)(arr)};
}
test('zero qualified launches show the truthful evaluation state without spinning a timer',()=>{
 const q=fixture();
 q.setup([]);
 assert.equal(q.ids.get('qualified-showcase').hidden,true);
 assert.equal(q.ids.get('qualified-showcase-empty').hidden,false);
 assert.equal(q.hasTimer(),false);
});
test('desktop rotates two qualified product cards and supports previous, pause and resume',()=>{
 const q=fixture();
 q.setup(q.products);
 assert.deepEqual(q.shown(),['A App','B App']);
 assert.equal(q.ids.get('qualified-showcase').hidden,false);
 assert.equal(q.ids.get('qualified-showcase-empty').hidden,true);
 q.tick();
 assert.deepEqual(q.shown(),['C App','D App']);
 q.ids.get('qualified-showcase-prev').listeners.click();
 assert.deepEqual(q.shown(),['B App','C App']);
 q.ids.get('qualified-showcase-pause').listeners.click();
 assert.equal(q.ids.get('qualified-showcase-pause').attributes['aria-pressed'],'true');
 q.tick();
 assert.deepEqual(q.shown(),['B App','C App']);
 q.ids.get('qualified-showcase-pause').listeners.click();
 q.tick();
 assert.deepEqual(q.shown(),['D App','A App']);
});
test('mobile rotates one card at a time; hidden tabs do not rotate',()=>{
 const q=fixture({mobile:true});
 q.setup(q.products.slice(0,3));
 assert.deepEqual(q.shown(),['A App']);
 q.tick();assert.deepEqual(q.shown(),['B App']);
 q.document.hidden=true;q.tick();
 assert.deepEqual(q.shown(),['B App']);
});
test('reduced motion disables autoplay and animation',()=>{
 const q=fixture({reduced:true});
 q.setup(q.products);
 assert.deepEqual(q.shown(),['A App','B App']);
 assert.equal(q.ids.get('qualified-showcase-pause').disabled,true);
 q.tick();
 assert.deepEqual(q.shown(),['A App','B App']);
});
