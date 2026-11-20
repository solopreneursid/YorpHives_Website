import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {eligibleShowcaseItems,selectShowcaseItems,chooseShowcaseReplacement,SHOWCASE_SIZE} from '../reimagined/showcase.mjs';

const tool=n=>({type:'tool',name:'Useful tool '+n,description:'A practical browser tool for people.',url:'tools/example-tool-'+n+'/',category:'Utility',published:true});
const venture=(id,approved=true)=>({
 type:'app',name:'Venture '+id,description:'A verified launched application.',
 url:'products/venture-'+id+'/',date:'2026-10-20',
 published:true,launchStatus:'launched',
 headquartersReview:{status:'qualified',marketResearch:'passed',businessAnalysis:'passed',evidenceSha256:'a'.repeat(64)},
 founderApproval:{status:approved?'approved':'pending',approvedOn:'2026-10-21'}
});
const catalogue=[...Array.from({length:143},(_,i)=>tool(i+1)),venture('alpha'),venture('beta'),venture('unapproved',false)];
test('only real published tools and founder-approved launched products join rotating pool',()=>{
 const pool=eligibleShowcaseItems([
 ...catalogue,
 {...tool(999),published:false},
 {...tool(998),visibility:'private'},
 {...venture('draft'),launchStatus:'planned'},
 {...venture('unqualified'),headquartersReview:{status:'unqualified'}},
 {...tool(1)}
 ]);
 assert.equal(pool.length,145);
 assert.equal(new Set(pool.map(item=>item.url)).size,pool.length);
 assert.equal(pool.filter(item=>item.showcaseKind==='venture').length,2);
 assert.ok(pool.every(item=>item.url!=='products/venture-unapproved/'));
 assert.equal(pool.filter(item=>item.showcaseKind==='tool').length,143);
});
test('six unique randomly selected cards include both public product families',()=>{
 const pool=eligibleShowcaseItems(catalogue);
 for(const random of [()=>0,()=>0.5,()=>0.999]){
  const picked=selectShowcaseItems(pool,SHOWCASE_SIZE,random);
  assert.equal(picked.length,6);
  assert.equal(new Set(picked.map(item=>item.url)).size,6);
  assert.ok(picked.some(item=>item.showcaseKind==='tool'));
  assert.ok(picked.some(item=>item.showcaseKind==='venture'));
 }
 const toolOnly=eligibleShowcaseItems(catalogue.filter(item=>item.type==='tool'));
 const picked=selectShowcaseItems(toolOnly,6,()=>0.24);
 assert.equal(picked.length,6);
 assert.ok(picked.every(item=>item.showcaseKind==='tool'));
});
test('flipped replacements never duplicate another visible slot and preserve at least one venture',()=>{
 const pool=eligibleShowcaseItems(catalogue);
 const selected=selectShowcaseItems(pool,6,()=>0.5);
 const index=selected.findIndex(item=>item.showcaseKind==='tool');
 const next=chooseShowcaseReplacement(pool,selected,index,()=>0.1);
 assert.ok(next);
 assert.ok(!selected.some(item=>item.url===next.url));
 const updated=selected.map((item,i)=>i===index?next:item);
 assert.equal(new Set(updated.map(item=>item.url)).size,6);
 const singleVenture=eligibleShowcaseItems([...Array.from({length:12},(_,i)=>tool(i)),venture('alpha')]);
 const current=selectShowcaseItems(singleVenture,6,()=>0.42);
 const lastVentureSlot=current.findIndex(item=>item.showcaseKind==='venture');
 assert.equal(chooseShowcaseReplacement(singleVenture,current,lastVentureSlot,()=>0.2),null);
});
test('new published releases take priority after catalogue synchronization',()=>{
 const initial=eligibleShowcaseItems([...Array.from({length:14},(_,i)=>tool(i))]);
 const visible=selectShowcaseItems(initial,6,()=>0.4);
 const newTool=tool('newest');
 const nextPool=eligibleShowcaseItems([...Array.from({length:14},(_,i)=>tool(i)),newTool]);
 const choice=chooseShowcaseReplacement(nextPool,visible,0,()=>0.99,[newTool.url]);
 assert.equal(choice.url,newTool.url);
 const newVenture=venture('fresh');
 const withVenture=eligibleShowcaseItems([...Array.from({length:14},(_,i)=>tool(i)),newVenture]);
 const ventureChoice=chooseShowcaseReplacement(withVenture,visible,0,()=>0.34,[newVenture.url]);
 assert.equal(ventureChoice.url,newVenture.url);
});
test('showcase ships a 3D flip, pause toggle and reduced-motion protection',async()=>{
 const [html,js,css,studio,build]=await Promise.all([
  readFile(new URL('../reimagined/index.html',import.meta.url),'utf8'),
  readFile(new URL('../reimagined/showcase.mjs',import.meta.url),'utf8'),
  readFile(new URL('../reimagined/showcase.css',import.meta.url),'utf8'),
  readFile(new URL('../reimagined/studio.js',import.meta.url),'utf8'),
  readFile(new URL('../scripts/build-site.mjs',import.meta.url),'utf8')
 ]);
 assert.match(html,/id="featured-tools-grid" aria-label="Rotating showcase of six distinct/);
 assert.match(html,/id="showcase-pause" aria-pressed="false"/);
 assert.match(html,/href="showcase\.css"/);
 assert.match(js,/qualifiedProducts\(items\)/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/inert/);
 assert.match(css,/rotateY\(180deg\)/);
 assert.match(css,/backface-visibility:hidden/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(studio,/showcase\.update\(allItems\)/);
 assert.doesNotMatch(studio,/featuredToolUrls|renderFeaturedTools/);
 assert.match(build,/showcase\.css/);
 assert.match(build,/showcase\.mjs/);
});
