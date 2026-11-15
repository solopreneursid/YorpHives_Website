import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(resolve(root,'app.js'),'utf8');
const begin=source.indexOf('  function setupExploreFeatureSpotlight(products, location');
const end=source.indexOf('  async function loadCatalog() {',begin);
assert.ok(begin>=0&&end>begin,'Explore auto-rotation logic must be present');
const setup=new Function('document','window','IntersectionObserver',
  source.slice(begin,end)+';return setupExploreFeatureSpotlight;');

class Element {
  constructor(){
    this.children=[];this.attributes={};this.listeners={};this.textContent='';
    this.hidden=false;this.disabled=false;this.className='';
    const classes=new Set();
    this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};
  }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;this.textContent='';}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(name,cb){this.listeners[name]=cb;}
}
function fixture({reduced=false}={}){
  const ids=new Map();
  const names=['explore-feature-window','explore-feature-empty','explore-feature-product',
    'explore-feature-logo','explore-feature-name','explore-feature-type','explore-feature-count',
    'explore-feature-prev','explore-feature-next','explore-feature-pause','explore'];
  names.forEach(id=>ids.set(id,new Element()));
  const motion={matches:reduced,addEventListener(_,cb){this.change=cb;}};
  let timer=null;
  let delay=null;
  const document={
    getElementById:id=>ids.get(id),
    createElement:()=>new Element(),
    createTextNode:text=>({text}),
    hidden:false,
    baseURI:'https://yorphives.com/'
  };
  const window={
    matchMedia:()=>motion,
    setInterval:(fn,ms)=>{timer=fn;delay=ms;}
  };
  const products=['First App','Second App','Third App'].map((name,i)=>({
    name,type:'app',url:'apps/app-'+(i+1)+'/'
  }));
  return {
    ids,products,document,motion,delay:()=>delay,tick:()=>timer?.(),hasTimer:()=>!!timer,
    shown:()=>ids.get('explore-feature-name').textContent,
    logo:()=>ids.get('explore-feature-logo'),
    setup:arr=>setup(document,window,undefined)(arr),
    click:id=>ids.get(id).listeners.click()
  };
}
test('empty list never runs autoplay or invents a product',()=>{
  const q=fixture();q.setup([]);
  assert.equal(q.ids.get('explore-feature-empty').hidden,false);
  assert.equal(q.ids.get('explore-feature-product').hidden,true);
  assert.equal(q.hasTimer(),false);
});
test('multiple products move automatically every 4.5 seconds without clicks',()=>{
  const q=fixture();q.setup(q.products);
  assert.equal(q.shown(),'First App');
  assert.equal(q.delay(),4500);
  assert.equal(q.ids.get('explore-feature-empty').hidden,true);
  q.tick();assert.equal(q.shown(),'Second App');
  q.tick();assert.equal(q.shown(),'Third App');
  q.tick();assert.equal(q.shown(),'First App');
  assert.equal(q.ids.get('explore-feature-product').classList.contains('is-entering'),true);
});
test('optional pause and next buttons work; background/hidden views never rotate',()=>{
  const q=fixture();q.setup(q.products);
  q.click('explore-feature-pause');q.tick();
  assert.equal(q.shown(),'First App');
  q.click('explore-feature-pause');q.tick();
  assert.equal(q.shown(),'Second App');
  q.document.hidden=true;q.tick();assert.equal(q.shown(),'Second App');
  q.document.hidden=false;
  q.ids.get('explore').hidden=true;q.tick();assert.equal(q.shown(),'Second App');
  q.ids.get('explore').hidden=false;
  q.click('explore-feature-next');assert.equal(q.shown(),'Third App');
});
test('real first-party product logos render; external logos fall back safely',()=>{
  const q=fixture();
  q.products[0].logo='apps/app-1/logo.svg';
  q.products[1].logo='https://example.com/tracker.svg';
  q.setup(q.products);
  const img=q.logo().children[0];
  assert.equal(img.src,'https://yorphives.com/apps/app-1/logo.svg');
  q.tick();
  assert.equal(q.logo().textContent,'SA');
  assert.equal(q.logo().children.length,0);
});
test('one product remains visible and never needs rotation; reduced-motion preference disables auto-change',()=>{
  const q=fixture();q.setup([q.products[0]]);
  assert.equal(q.shown(),'First App');
  assert.equal(q.hasTimer(),false);
  assert.equal(q.ids.get('explore-feature-next').disabled,true);
  const r=fixture({reduced:true});
  r.setup(r.products);
  assert.equal(r.ids.get('explore-feature-pause').disabled,true);
  r.tick();assert.equal(r.shown(),'First App');
  assert.equal(r.ids.get('explore-feature-product').classList.contains('is-entering'),false);
});
