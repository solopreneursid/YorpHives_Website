import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const code=await read('app.js');
const start=code.indexOf('  function setupCategoryRibbon(items, onSelect) {');
const stop=code.indexOf('  async function loadCatalog() {',start);
assert.ok(start>0&&stop>start,'Dynamic category ribbon renderer exists');
const build=new Function('document','window',
  code.slice(start,stop)+';return setupCategoryRibbon;');

class Element{
 constructor(tag){
  this.tagName=tag.toUpperCase();this.children=[];this.listeners={};
  this.attributes={};this.dataset={};this.className='';this.hidden=false;
  this.textContent='';this.tabIndex=0;this.href='';
  const values=new Set();
  this.classList={
   toggle:(x,active)=>{if(active)values.add(x);else values.delete(x);},
   contains:x=>values.has(x)
  };
 }
 append(...x){this.children.push(...x);}
 replaceChildren(...x){this.children=x;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 addEventListener(key,fn){this.listeners[key]=fn;}
}
function create({reduced=false}={}){
 const track=new Element('div'),section=new Element('section');
 const media={matches:reduced,addEventListener(name,fn){this.onChange=fn;}};
 const document={
  getElementById:id=>id==='category-ribbon-track'?track:null,
  querySelector:selector=>selector==='#home .category-ribbon'?section:null,
  createElement:tag=>new Element(tag)
 };
 const window={matchMedia:()=>media};
 let selected=null;
 const setup=items=>build(document,window)(items,value=>{selected=value;});
 const names=()=>track.children[0]?.children.map(node=>node.textContent)||[];
 return {track,section,media,setup,names,selected:()=>selected};
}
test('sliding strip renders only unique catalog categories, alphabetically',()=>{
 const x=create();
 x.setup([{category:'PDF'},{category:'Images'},{category:'PDF'},
  {category:'Writing'},{category:'New Category'},{category:'Security'}]);
 assert.deepEqual(x.names(),['Images','New Category','PDF','Security','Writing']);
 assert.equal(x.track.children.length,2,'Two equal sets make marquee seamless');
 assert.equal(x.track.children[0].tagName,'NAV');
 assert.equal(x.track.children[1].attributes['aria-hidden'],'true');
 assert.ok(x.track.children[1].children.every(node=>node.tabIndex===-1));
 assert.ok(x.track.children[0].children.every(node=>node.tagName==='A'&&node.href==='#tools'));
 assert.ok(x.track.children[0].children.every(node=>node.textContent===node.dataset.category));
});
test('selecting any sliding category can open its exact filter',()=>{
 const x=create();x.setup([{category:'PDF'},{category:'Files'}]);
 x.track.children[0].children[1].listeners.click();
 assert.equal(x.selected(),'PDF');
 x.track.children[1].children[0].listeners.click();
 assert.equal(x.selected(),'Files');
 const source=code;
 assert.match(source,/activeCategory = category/);
 assert.match(source,/if \(activeCategory && \(item\.category \|\| 'Other'\) !== activeCategory\) return false/);
});
test('newly published categories automatically appear in future catalog renders',()=>{
 const x=create();
 x.setup([{category:'PDF'}]);
 assert.deepEqual(x.names(),['PDF']);
 assert.equal(x.track.children.length,1);
 x.setup([{category:'PDF'},{category:'Newly Added Category'}]);
 assert.deepEqual(x.names(),['Newly Added Category','PDF']);
 assert.equal(x.track.children.length,2);
});
test('reduced motion shows one keyboard-friendly, nonmoving set',()=>{
 const x=create({reduced:true});
 x.setup([{category:'PDF'},{category:'Writing'},{category:'Images'}]);
 assert.equal(x.track.children.length,1);
 assert.equal(x.section.classList.contains('is-single'),true);
 x.media.matches=false;x.media.onChange();
 assert.equal(x.track.children.length,2);
 assert.equal(x.section.classList.contains('is-single'),false);
});
test('empty categories hide ribbon rather than invent labels',()=>{
 const x=create();x.setup([]);
 assert.equal(x.section.hidden,true);
 assert.equal(x.track.children.length,0);
});
test('the old oversized latest-card section is gone; ribbon exposes only categories',async()=>{
 const html=await read('index.html'),css=await read('style.css');
 const home=html.slice(html.indexOf('<section class="page" id="home"'),html.indexOf('<section class="page" id="tools"'));
 assert.match(home,/class="category-ribbon"/);
 assert.match(home,/id="category-ribbon-track"/);
 assert.doesNotMatch(home,/FROM THE HIVE|id="recent-items"|The latest <em>from us<\/em>/);
 assert.match(css,/@keyframes category-ribbon-flow/);
 assert.match(css,/#home \.category-ribbon:hover \.category-ribbon-track/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
