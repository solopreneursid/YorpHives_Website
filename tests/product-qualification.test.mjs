import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isQualifiedProduct,qualifiedProducts} from '../product-policy.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const candidate=()=>({
  type:'app',name:'Evidence-backed Example App',
  description:'An example product for testing approval boundaries.',
  date:'2025-01-01',url:'apps/evidence-backed-example/',
  published:true,launchStatus:'launched',
  headquartersReview:{status:'qualified',marketResearch:'passed',
    businessAnalysis:'passed',evidenceSha256:'a'.repeat(64)},
  founderApproval:{status:'approved',approvedOn:'2025-01-02'}
});

test('qualified products require explicit HQ evidence review and founder approval',()=>{
  assert.equal(isQualifiedProduct(candidate()),true);
  const mutations=[
    x=>{delete x.founderApproval},
    x=>{x.founderApproval.status='pending'},
    x=>{x.founderApproval.approvedOn='not-a-date'},
    x=>{x.headquartersReview.status='pending'},
    x=>{x.headquartersReview.marketResearch='in_progress'},
    x=>{x.headquartersReview.businessAnalysis='missing'},
    x=>{x.headquartersReview.evidenceSha256='missing-evidence'},
    x=>{x.published=false},
    x=>{delete x.published},
    x=>{x.visibility='private'},
    x=>{x.launchStatus='researching'},
    x=>{x.url='javascript:alert(1)'},
    x=>{x.url='https://outside.example/app'},
    x=>{x.date='not-a-date'},
    x=>{x.type='tool'}
  ];
  for(const mutate of mutations){
    const x=candidate(); mutate(x);
    assert.equal(isQualifiedProduct(x),false,JSON.stringify(x));
  }
});

test('the rotating public showcase never includes unqualified ideas or free tools',()=>{
  const launched=candidate();
  const researching={...candidate(),name:'Researching Product',launchStatus:'researching'};
  const tool={...candidate(),type:'tool',name:'Free Tool'};
  assert.deepEqual(qualifiedProducts([tool,researching,launched,null]),[launched]);
  assert.deepEqual(qualifiedProducts(null),[]);
});

test('homepage positions qualification before the carousel and provides truthful zero-launch state',async()=>{
  const html=await read('index.html');
  const css=await read('style.css');
  const js=await read('app.js');
  assert.match(html,/id="explore-spotlight"/);
  assert.match(html,/Yorphives HQ must evaluate market demand/);
  assert.match(html,/Only qualified opportunities with final founder approval become launches/);
  assert.match(html,/id="home-feature-product"/);
  assert.match(html,/id="home-feature-logo"/);
  assert.match(html,/id="home-feature-empty"/);
  assert.match(html,/<p id="explore-qualification-note">Here is what every product must pass:<\/p>/);
  assert.match(js,/if \(note\) note\.textContent = 'Here is what every product must pass:';/);
  assert.doesNotMatch(html,/No HQ-qualified products have been released yet/);
  assert.doesNotMatch(js,/No HQ-qualified products have been released yet/);
  assert.doesNotMatch(html,/every candidate must pass/i);
  assert.match(html,/id="home-feature-pause"/);
  assert.match(js,/qualifiedProducts\(catalog\)/);
  assert.match(js,/setupExploreFeatureSpotlight\(products, 'home'\)/);
  assert.match(js,/setupExploreFeatureSpotlight\(products, 'explore'\)/);
  assert.match(js,/4500/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/prefers-reduced-motion/);
  assert.match(css,/home-feature-widget \.explore-feature-product\.is-entering/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Explore publishing contract is also applied at build and product-list level',async()=>{
  const build=await read('scripts/build-site.mjs');
  const js=await read('app.js');
  assert.match(build,/import \{isQualifiedProduct\} from '\.\.\/product-policy\.mjs'/);
  assert.match(build,/Unqualified product cannot be published/);
  assert.match(build,/isQualifiedProduct\(item\)/);
  assert.match(build,/catalog\.json',JSON\.stringify\(\{\.\.\.catalog,items:published\}/);
  assert.match(js,/import\('\.\/product-policy\.mjs'\)/);
  assert.match(js,/products\.forEach\(item => productGrid\.append\(card\(item\)\)\)/);
  assert.match(await read('index.html'),/No qualified launches yet/);
});

test('public catalog currently contains free tools but no fabricated approved apps',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 assert.ok(catalog.items.filter(x=>x.type==='tool').length>=100);
 assert.equal(qualifiedProducts(catalog.items).length,0);
});
