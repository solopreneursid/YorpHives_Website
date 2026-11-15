import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(resolve(root,'app.js'),'utf8');
const begin=source.indexOf('  function setupExploreFeatureSpotlight(products, location');
const end=source.indexOf('  async function loadCatalog() {',begin);
assert.ok(begin>=0&&end>begin,'Shared spotlight must be defined');
const build=new Function('document','window','IntersectionObserver',
  source.slice(begin,end)+'; return setupExploreFeatureSpotlight;');

class Element{
 constructor(){
  this.children=[];this.listeners={};this.attributes={};this.textContent='';this.hidden=false;this.disabled=false;
  const values=new Set();
  this.classList={add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x)};
 }
 append(...x){this.children.push(...x);}
 replaceChildren(...x){this.children=x;this.textContent='';}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,v){this.listeners[k]=v;}
}
function fixture(reduced=false){
 const ids=new Map();
 for(const page of ['explore','home']){
  ids.set(page,new Element());
  for(const key of ['window','empty','product','logo','name','type','count','prev','next','pause'])
   ids.set(page+'-feature-'+key,new Element());
 }
 ids.set('explore-qualification-note',new Element());
 ids.set('explore-showcase-label',new Element());
 const footer=new Element();
 const media={matches:reduced,addEventListener(_,fn){this.change=fn;}};
 const ticks=[];
 const document={
  getElementById:id=>ids.get(id),
  querySelector:s=>s==='#home .explore-evaluation-foot span:last-child'?footer:undefined,
  createElement:()=>new Element(),
  createTextNode:text=>({text}),
  baseURI:'https://yorphives.com/',
  hidden:false
 };
 const window={
  matchMedia:()=>media,
  setInterval:(fn,delay)=>{ticks.push({fn,delay})}
 };
 const mock=['A','B','C'].map((x,i)=>({name:x+' App',type:'app',url:'apps/test-'+i+'/'}));
 const setup=(items,location)=>build(document,window,undefined)(items,location);
 const name=location=>ids.get(location+'-feature-name').textContent;
 const click=(location,what)=>ids.get(location+'-feature-'+what).listeners.click();
 return {document,ids,footer,ticks,mock,setup,name,click};
}
test('homepage and Explore both show accurate first-launch state, without timer',()=>{
 const f=fixture();
 f.setup([], 'home');
 f.setup([], 'explore');
 for(const page of ['home','explore']){
  assert.equal(f.ids.get(page+'-feature-empty').hidden,false);
  assert.equal(f.ids.get(page+'-feature-product').hidden,true);
 }
 assert.equal(f.ids.get('explore-qualification-note').textContent.includes('every product must pass'),true);
 assert.equal(f.ticks.length,0);
});
test('home and Explore independently autoplay the same approved products every 4.5 seconds',()=>{
 const f=fixture();
 f.setup(f.mock,'home');f.setup(f.mock,'explore');
 assert.equal(f.ticks.length,2);
 assert.deepEqual(f.ticks.map(x=>x.delay),[4500,4500]);
 assert.equal(f.name('home'),'A App');assert.equal(f.name('explore'),'A App');
 f.ticks.forEach(x=>x.fn());
 assert.equal(f.name('home'),'B App');assert.equal(f.name('explore'),'B App');
 f.ticks.forEach(x=>x.fn());
 assert.equal(f.name('home'),'C App');assert.equal(f.name('explore'),'C App');
 f.ticks.forEach(x=>x.fn());
 assert.equal(f.name('home'),'A App');
 assert.match(f.footer.textContent,/Yorphives HQ/);
 assert.equal(f.ids.get('explore-showcase-label').textContent,'FOUNDER-APPROVED PRODUCTS');
});
test('autoplay requires visible page, not a click; controls are optional',()=>{
 const f=fixture();
 f.setup(f.mock,'home');f.setup(f.mock,'explore');
 f.ids.get('home').hidden=true;
 f.ticks[0].fn();
 assert.equal(f.name('home'),'A App');
 f.ticks[1].fn();
 assert.equal(f.name('explore'),'B App');
 f.ids.get('home').hidden=false;
 f.click('home','next');
 assert.equal(f.name('home'),'B App');
 f.click('home','pause');f.ticks[0].fn();
 assert.equal(f.name('home'),'B App');
 f.click('home','pause');f.ticks[0].fn();
 assert.equal(f.name('home'),'C App');
 f.document.hidden=true;f.ticks[0].fn();
 assert.equal(f.name('home'),'C App');
});
test('a single approved product shows on both pages without needless animation timer',()=>{
 const f=fixture();f.setup(f.mock.slice(0,1),'home');f.setup(f.mock.slice(0,1),'explore');
 assert.equal(f.ticks.length,0);
 assert.equal(f.ids.get('home-feature-next').disabled,true);
 assert.equal(f.ids.get('explore-feature-pause').disabled,true);
});
test('reduced motion disables automatic rotation on both surfaces',()=>{
 const f=fixture(true);f.setup(f.mock,'home');f.setup(f.mock,'explore');
 assert.equal(f.ids.get('home-feature-pause').disabled,true);
 assert.equal(f.ids.get('explore-feature-pause').disabled,true);
 f.ticks.forEach(x=>x.fn());
 assert.equal(f.name('home'),'A App');assert.equal(f.name('explore'),'A App');
});
