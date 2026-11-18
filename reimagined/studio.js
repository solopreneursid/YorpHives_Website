/* YorpHives — from-scratch preview navigation, product discovery, business proof.
 * Dependencies: ONLY public source catalog + local approval gate + approved snapshot.
 * No visitor tracking. No external APIs. No paid libraries. */
import {qualifiedProducts} from '../product-policy.mjs';
import {getCatalog,subscribeCatalog,startCatalogMonitoring} from './catalog-sync.mjs';

const $=id=>document.getElementById(id);
const icon=name=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#i-'+name);svg.append(use);return svg;};
const el=(tag,content='',className='')=>{const e=document.createElement(tag);if(content)e.textContent=content;if(className)e.className=className;return e;};
const allowedRoute=/^(?:tools|products|apps)\/[a-z0-9][a-z0-9-]*\/$/;
const isPublicTool=x=>x?.type==='tool'&&x.published!==false&&x.visibility!=='private'&&typeof x.name==='string'&&typeof x.description==='string'&&typeof x.url==='string'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(x.url);
const isValidDay=d=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const n=new Date(d+'T00:00:00Z');return Number.isFinite(n.valueOf())&&n.toISOString().slice(0,10)===d;};
const niceDate=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const number=n=>n.toLocaleString('en-US');
const views=[...document.querySelectorAll('.view')];
const names={home:'Home',ventures:'HQventures',builders:'Builders',tools:'Free tools',partners:'Partnerships',contact:'Contact'};
const special={ecosystem:'home','featured-tools':'home','home-progress':'home',impact:'home','venture-collection':'ventures',explore:'ventures',connect:'contact',opportunities:'builders',membership:'builders'};
let current='home';

function menuClose(){
 $('mobile-menu').hidden=true;$('menu-toggle').setAttribute('aria-expanded','false');
 $('menu-toggle').setAttribute('aria-label','Open menu');
 $('menu-toggle').replaceChildren(icon('menu'));
}
function moreClose(){
 $('more-panel').hidden=true;$('more-shade').hidden=true;
 $('more-toggle').setAttribute('aria-expanded','false');document.body.classList.remove('no-scroll');
}
function route(){
 let hash=location.hash.slice(1);try{hash=decodeURIComponent(hash)}catch{hash='home'}
 const active=names[hash]?hash:special[hash]||'home';
 const changed=current!==active;
 views.forEach(v=>v.hidden=v.id!==active);
 document.querySelectorAll('[data-nav]').forEach(a=>{
   if(a.dataset.nav===active)a.setAttribute('aria-current','page');
   else a.removeAttribute('aria-current');
 });
 document.title=active==='home'?'YorpHives — Ideas in motion':names[active]+' · YorpHives';
 menuClose();moreClose();
 if(special[hash]&&$(hash))requestAnimationFrame(()=>$(hash)?.scrollIntoView({block:'start',behavior:'instant'}));
 else if(changed || hash===active || special[hash])window.scrollTo({top:0,behavior:'instant'});
 current=active;
}
$('menu-toggle').addEventListener('click',()=>{
 const opening=$('mobile-menu').hidden;
 $('mobile-menu').hidden=!opening;$('menu-toggle').setAttribute('aria-expanded',String(opening));
 $('menu-toggle').setAttribute('aria-label',opening?'Close menu':'Open menu');
 $('menu-toggle').replaceChildren(icon(opening?'close':'menu'));if(opening)moreClose();
});
$('mobile-menu').addEventListener('click',e=>{if(e.target.closest('a'))menuClose()});
$('more-toggle').addEventListener('click',()=>{
 const opening=$('more-panel').hidden;
 $('more-panel').hidden=!opening;$('more-shade').hidden=!opening;
 $('more-toggle').setAttribute('aria-expanded',String(opening));
 document.body.classList.toggle('no-scroll',opening);
 if(opening)menuClose();
});
$('more-close').addEventListener('click',moreClose);
$('more-shade').addEventListener('click',moreClose);
$('more-panel').addEventListener('click',e=>{if(e.target.closest('a'))moreClose()});
window.addEventListener('resize',()=>{if(innerWidth>940)menuClose();if(innerWidth>760)moreClose()});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){menuClose();moreClose()}
 if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!e.metaKey&&!e.ctrlKey){e.preventDefault();location.hash='#tools';setTimeout(()=>$('tool-search').focus(),70)}
});
window.addEventListener('hashchange',route);
$('year').textContent=new Date().getFullYear().toString();
route();

let tools=[],ventures=[],verifiedPublic=new Set(),allItems=[];
let activeCategory='All',onlySaved=false,page=1,sortMode='recent';const pageSize=12;
const safeStoreKey='yorphives-studio-saved-v1';
let saved=new Set();
try{const list=JSON.parse(localStorage.getItem(safeStoreKey)||'[]');if(Array.isArray(list))saved=new Set(list.filter(x=>typeof x==='string'&&allowedRoute.test(x)));}catch{}

function updateSavedCount(){ $('saved-count').textContent=String([...saved].filter(x=>tools.some(t=>t.url===x)).length) }
function persistSaved(){try{localStorage.setItem(safeStoreKey,JSON.stringify([...saved]))}catch{}updateSavedCount()}
function categoryChips(){
 const counts=new Map();for(const t of tools){const c=t.category||'Other';counts.set(c,(counts.get(c)||0)+1)}
 const categories=['All',...counts.keys()].sort((a,b)=>a==='All'?-1:b==='All'?1:counts.get(b)-counts.get(a)||a.localeCompare(b));
 const chips=categories.map(cat=>{
 const b=el('button',cat==='All'?'All tools':cat,'cat-chip'+(cat===activeCategory?' is-active':''));
 b.type='button';b.dataset.cat=cat;b.setAttribute('aria-pressed',String(cat===activeCategory));
 b.addEventListener('click',()=>{activeCategory=cat;page=1;categoryChips();renderTools()});return b;
 });
 $('tool-categories').replaceChildren(...chips);
}
function filteredTools(){
 const query=$('tool-search').value.trim().toLocaleLowerCase('en-US');
 const result=tools.filter(t=>(activeCategory==='All'||(t.category||'Other')===activeCategory)&&(!onlySaved||saved.has(t.url))&&(!query||[t.name,t.description,t.category||''].some(v=>v.toLocaleLowerCase('en-US').includes(query))));
 result.sort((a,b)=>sortMode==='name'?a.name.localeCompare(b.name):String(b.date||'').localeCompare(String(a.date||''))||a.name.localeCompare(b.name));
 return result;
}
function toolCard(t){
 const article=el('article','','tool-card');
 const top=el('div','','tool-card-top');const pict=el('span','','tool-icon');pict.append(icon('grid'));
 const fav=el('button','','tool-card-fav');fav.type='button';fav.setAttribute('aria-label',(saved.has(t.url)?'Remove saved tool: ':'Save tool: ')+t.name);fav.setAttribute('aria-pressed',String(saved.has(t.url)));fav.append(icon('heart'));
 fav.addEventListener('click',()=>{if(saved.has(t.url))saved.delete(t.url);else saved.add(t.url);persistSaved();if(onlySaved)renderTools();else{fav.setAttribute('aria-pressed',String(saved.has(t.url)));fav.setAttribute('aria-label',(saved.has(t.url)?'Remove saved tool: ':'Save tool: ')+t.name)}});
 top.append(pict,fav);article.append(top,el('h3',t.name),el('p',t.description));
 const foot=el('div','','tool-card-foot');foot.append(el('span',t.category||'Utility'));
 const link=el('a','Open tool');link.href='../'+t.url;link.append(icon('external'));foot.append(link);article.append(foot);
 return article;
}
function renderTools(){
 const matches=filteredTools(),pages=Math.max(1,Math.ceil(matches.length/pageSize));page=Math.min(page,pages);
 const offset=(page-1)*pageSize;
 $('tool-results').replaceChildren(...matches.slice(offset,offset+pageSize).map(toolCard));
 $('tool-empty').hidden=matches.length>0;
 $('tool-results-count').textContent=matches.length+' result'+(matches.length===1?'':'s');
 $('tool-results-description').textContent=onlySaved?'Showing your saved tools':activeCategory!=='All'?activeCategory+' tools':'Search, filter, or save what you need.';
 $('tool-pagination').hidden=matches.length<=pageSize;
 $('tool-page-label').textContent=page+' / '+pages;
 $('tool-prev').disabled=page<=1;$('tool-next').disabled=page>=pages;
 $('tool-clear').hidden=!$('tool-search').value;
}
// The rotating category strip opens Free Tools with that real category selected.
// The event is local to the current page; no analytics/requests are sent.
document.addEventListener('yorphives:select-tool-category',event=>{
 const category=event.detail?.category;
 if(typeof category!=='string'||!tools.some(t=>(t.category||'Other')===category))return;
 activeCategory=category;onlySaved=false;page=1;$('tool-search').value='';
 $('saved-toggle').setAttribute('aria-pressed','false');
 categoryChips();renderTools();location.hash='#tools';
});
$('tool-search-form').addEventListener('submit',e=>e.preventDefault());
$('tool-search').addEventListener('input',()=>{page=1;renderTools()});
$('tool-clear').addEventListener('click',()=>{$('tool-search').value='';page=1;renderTools();$('tool-search').focus()});
$('tool-sort').addEventListener('change',e=>{sortMode=e.target.value;page=1;renderTools()});
$('saved-toggle').addEventListener('click',()=>{onlySaved=!onlySaved;page=1;$('saved-toggle').setAttribute('aria-pressed',String(onlySaved));renderTools()});
$('reset-tool-filters').addEventListener('click',()=>{activeCategory='All';onlySaved=false;page=1;$('tool-search').value='';$('saved-toggle').setAttribute('aria-pressed','false');categoryChips();renderTools()});
$('tool-prev').addEventListener('click',()=>{page=Math.max(1,page-1);renderTools();$('tool-results').scrollIntoView({block:'start'})});
$('tool-next').addEventListener('click',()=>{page+=1;renderTools();$('tool-results').scrollIntoView({block:'start'})});

const ventureEmpty=$('venture-products').firstElementChild?.cloneNode(true);
function renderVentures(){
 $('venture-total').textContent=ventures.length+' founder-approved launch'+(ventures.length===1?'':'es');
 if(!ventures.length){
  $('venture-products').replaceChildren(ventureEmpty.cloneNode(true));
  return;
 }
 const cards=ventures.map(x=>{
  const a=el('article','','venture-item');a.append(el('span','FOUNDER APPROVED · LAUNCHED','overline'),el('h3',x.name),el('p',x.description));
  const link=el('a','Open venture');link.href='../'+x.url;link.append(icon('external'));a.append(link);return a;
 });
 $('venture-products').replaceChildren(...cards);
}

/* Founder-curated starting points: only catalog-confirmed public tools can render.
 * Never infer popularity or expose unapproved products. */
function renderFeaturedTools(){
 const host=$('featured-tools-grid');if(!host)return;
 const curated=['tools/word-counter/','tools/qr-code-generator/','tools/password-generator/','tools/json-formatter/'];
 const selected=curated.map(url=>tools.find(t=>t.url===url)).filter(Boolean);
 for(const tool of tools){if(selected.length>=4)break;if(!selected.some(t=>t.url===tool.url))selected.push(tool)}
 if(!selected.length){const info=el('p','Featured tools are temporarily unavailable. Browse the full catalogue instead.','featured-tools-loading');host.replaceChildren(info);return}
 const cards=selected.map((t,i)=>{
  const a=el('a','','featured-tool-card');a.href='../'+t.url;
  const heading=el('div','','featured-tool-heading');
  const iconLabel=el('span',['Aa','▦','✳','{ }'][i]||'✦','featured-tool-icon');iconLabel.setAttribute('aria-hidden','true');
  const arrow=icon('external');arrow.classList.add('featured-tool-arrow');heading.append(iconLabel,arrow);
  const kind=el('span',t.category||'Free utility','featured-tool-category');
  const title=el('h3',t.name);
  const description=el('p',t.description);
  const action=el('span','Open tool →','featured-tool-action');
  a.append(heading,kind,title,description,action);return a;
 });
 host.replaceChildren(...cards);
}
function applyCatalog(newItems){
 allItems=newItems;tools=allItems.filter(isPublicTool);ventures=qualifiedProducts(allItems);
 verifiedPublic=new Set([...tools,...ventures].map(x=>x.url));
 // Category may have disappeared or been renamed in a new catalogue release.
 if(activeCategory!=='All'&&!tools.some(t=>(t.category||'Other')===activeCategory))activeCategory='All';
 for(const id of ['home-tool-count','home-tool-badge','tools-count-big'])$(id).textContent=number(tools.length);
 $('hero-tool-count').textContent=tools.length?number(tools.length)+' Free':'Free';
 renderFeaturedTools();
 for(const id of ['home-venture-count'])$(id).textContent=number(ventures.length);
 categoryChips();updateSavedCount();renderTools();renderVentures();
}
subscribeCatalog(applyCatalog);
startCatalogMonitoring();
async function loadCatalog(){
 try{await getCatalog()}
 catch{
  for(const id of ['home-tool-count','home-tool-badge','tools-count-big','home-venture-count'])$(id).textContent='—';
  $('hero-tool-count').textContent='Free';
  renderFeaturedTools();
  $('tool-results-description').textContent='The catalogue is temporarily unavailable. Please use the A–Z directory.';
  $('tool-empty').hidden=false;$('tool-pagination').hidden=true;
  $('venture-total').textContent='Approval records unavailable';
 }
}

function renderActivity(items){
 if(!Array.isArray(items))return;
 const entries=items.filter(x=>x&&typeof x.title==='string'&&x.title.length<180&&typeof x.kind==='string'&&
   ((x.kind==='tools'&&verifiedPublic.has(x.url)) || (x.kind==='builders'&&x.url==='#builders') || (x.kind==='explore'&&x.url==='#explore'))).slice(0,3);
 if(!entries.length)return;
 $('activity-list').replaceChildren(...entries.map((x,i)=>{
   const a=el('a','','activity-card');a.href=x.kind==='tools'?'../'+x.url:x.kind==='builders'?'#builders':'#ventures';
   a.append(el('span','0'+(i+1)+' / VERIFIED UPDATE','activity-number'),el('h3',x.title));
   const summary=typeof x.summary==='string'&&x.summary.trim().length>=12&&x.summary.trim().length<=160?x.summary.trim():'';
   if(summary)a.append(el('p',summary,'activity-summary'));
   if(isValidDay(x.date))a.append(el('small',niceDate(x.date),'activity-date'));
   else if(!summary)a.append(el('small','Published update','activity-date'));
   const arrow=el('span','','activity-arrow');arrow.append(icon('external'));a.append(arrow);return a;
 }));
}
async function loadActivity(){try{const r=await fetch('../activity.json',{cache:'no-cache'});if(r.ok){const d=await r.json();renderActivity(d.items)}}catch{}}

for(const link of document.querySelectorAll('[data-interest]'))link.addEventListener('click',()=>{
 const v=link.dataset.interest;const select=$('interest');if([...select.options].some(x=>x.value===v))select.value=v;
});
$('contact-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 const parts=[...new FormData(form)].map(([name,value])=>name+': '+String(value).trim()).filter(x=>x.trim());
 const subject='YorpHives · '+$('interest').value+' enquiry';
 window.location.href='mailto:connect@yorphives.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(parts.join('\n\n'));
});

await loadCatalog();
await loadActivity();

