/* YorpHives Fresh — first-party navigation, catalogue discovery and contact.
   Reads only public static catalogue/activity data. No private HQ access or remote SaaS. */
import {qualifiedProducts} from '../product-policy.mjs';
import {approvedVentureReleases} from './venture-activity.mjs';
import {getCatalog,subscribeCatalog,startCatalogMonitoring} from './catalog-sync.mjs';
import {readSaved,toggleSaved} from '../tools/save-tool.mjs';

const $=id=>document.getElementById(id);
const views=[...document.querySelectorAll('main>.view')];
const viewNames={home:'Home',tools:'Free tools',ventures:'HQventures'};
const retiredRoutes=new Set(['builders','opportunities','membership','post']);
let previousView='';
let allItems=[],tools=[],ventures=[];
let activeCategory='All',onlySaved=false,page=1,sortMode='name';
const pageSize=12;
const featuredToolUrls=['tools/word-counter/','tools/qr-code-generator/','tools/password-generator/','tools/json-formatter/','tools/pdf-merge/','tools/image-resizer/'];
const icon=name=>{
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('aria-hidden','true');
 const use=document.createElementNS('http://www.w3.org/2000/svg','use');
 use.setAttribute('href','#i-'+name);svg.append(use);return svg;
};
const make=(tag,text='',className='')=>{
 const node=document.createElement(tag);
 if(text)node.textContent=text;
 if(className)node.className=className;
 return node;
};
const number=n=>Number(n||0).toLocaleString('en-US');
const publicTool=x=>x?.type==='tool'&&x.published!==false&&x.visibility!=='private'&&
 typeof x.name==='string'&&typeof x.description==='string'&&
 typeof x.url==='string'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(x.url);
const safeDate=value=>{
 if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return '';
 const date=new Date(value);
 if(date>Date.now())return '';
 return date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
};
function closeMenu(){
 const menu=$('mobile-menu'),button=$('menu-toggle');
 if(!menu||!button)return;
 menu.hidden=true;document.body.classList.remove('menu-open');
 button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open menu');
 button.innerHTML='<svg aria-hidden="true"><use href="#i-menu"></use></svg>';
}
function route(){
 let hash=location.hash.slice(1);
 try{hash=decodeURIComponent(hash)}catch{hash=''}
 if(retiredRoutes.has(hash)){history.replaceState(history.state,'',location.pathname+location.search+'#home');hash='home'}
 const connectHashes=new Set(['hqconnect','contact','connect','partners']);
 const isConnect=connectHashes.has(hash);
 const aliases={explore:'ventures'};
 const active=isConnect?'home':(aliases[hash]|| (Object.hasOwn(viewNames,hash)?hash:'home'));
 views.forEach(view=>{view.hidden=view.id!==active});
 document.querySelectorAll('[data-nav]').forEach(link=>{
  if(link.dataset.nav===(isConnect?'hqconnect':active))link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
 });
 document.title=(active==='home'?'Free browser tools and HQventures':viewNames[active])+' | YorpHives';
 closeMenu();
 if(isConnect){requestAnimationFrame(()=>$('hqconnect')?.scrollIntoView({block:'start',behavior:'auto'}))}
 else if(active!==previousView){window.scrollTo({top:0,behavior:'auto'})}
 previousView=active;
}
window.addEventListener('hashchange',route);
route();

$('menu-toggle')?.addEventListener('click',()=>{
 const menu=$('mobile-menu'),button=$('menu-toggle'),open=menu.hidden;
 menu.hidden=!open;document.body.classList.toggle('menu-open',open);
 button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Close menu':'Open menu');
 button.innerHTML=open?'<svg aria-hidden="true"><use href="#i-close"></use></svg>':'<svg aria-hidden="true"><use href="#i-menu"></use></svg>';
});
$('mobile-menu')?.addEventListener('click',event=>{
 if(event.target.closest('a'))closeMenu();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!$('mobile-menu')?.hidden){closeMenu();$('menu-toggle')?.focus()}
 if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!event.metaKey&&!event.ctrlKey){
  event.preventDefault();location.hash='#tools';window.setTimeout(()=>$('tool-search')?.focus(),80);
 }
});
window.addEventListener('resize',()=>{if(innerWidth>760)closeMenu()});
$('year').textContent=String(new Date().getFullYear());

function savedSet(){
 try{return new Set(readSaved(window.localStorage))}catch{return new Set()}
}
function updateSavedButton(){
 const button=$('saved-toggle');
 if(button){button.setAttribute('aria-pressed',String(onlySaved));button.textContent=onlySaved?'♥ Showing saved':'♡ Saved'}
}
function categoryChips(){
 const counts=new Map();
 for(const tool of tools){const category=tool.category||'Other';counts.set(category,(counts.get(category)||0)+1)}
 const categories=['All',...counts.keys()].sort((a,b)=>a==='All'?-1:b==='All'?1:counts.get(b)-counts.get(a)||a.localeCompare(b));
 const buttons=categories.map(category=>{
  const button=make('button',category==='All'?'All tools':category,'cat-chip'+(category===activeCategory?' is-active':''));
  button.type='button';button.setAttribute('aria-pressed',String(category===activeCategory));
  button.addEventListener('click',()=>{activeCategory=category;page=1;categoryChips();renderTools()});
  return button;
 });
 $('tool-categories')?.replaceChildren(...buttons);
}
function filteredTools(){
 const query=($('tool-search')?.value||'').trim().toLocaleLowerCase('en-US');
 const saved=onlySaved?savedSet():null;
 const matches=tools.filter(tool=>
  (activeCategory==='All'||(tool.category||'Other')===activeCategory)&&
  (!saved||saved.has(tool.url))&&
  (!query||[tool.name,tool.description,tool.category||''].some(value=>value.toLocaleLowerCase('en-US').includes(query)))
 );
 matches.sort((a,b)=>sortMode==='recent'
  ?String(b.updatedAt||b.date||'').localeCompare(String(a.updatedAt||a.date||''))||a.name.localeCompare(b.name)
  :a.name.localeCompare(b.name));
 return matches;
}
function toolCard(tool,index){
 const article=make('article','','tool-card');
 const top=make('div','','tool-card-top');
 const picture=make('span',['Aa','▦','{}','✳','%'][index%5],'tool-icon');
 const favourite=make('button','','tool-card-fav');
 favourite.type='button';favourite.setAttribute('aria-pressed',String(savedSet().has(tool.url)));
 favourite.setAttribute('aria-label',(savedSet().has(tool.url)?'Remove saved tool: ':'Save tool: ')+tool.name);
 favourite.append(icon('heart'));
 favourite.addEventListener('click',()=>{
  let result=null;
  try{result=toggleSaved(window.localStorage,tool.url)}catch{}
  if(result===null){favourite.setAttribute('aria-label','Saving is unavailable in this browser');return}
  favourite.setAttribute('aria-pressed',String(result));
  favourite.setAttribute('aria-label',(result?'Remove saved tool: ':'Save tool: ')+tool.name);
  if(onlySaved)renderTools();
 });
 top.append(picture,favourite);
 const title=make('h3',tool.name),description=make('p',tool.description);
 const foot=make('div','','tool-card-foot');
 foot.append(make('span',tool.category||'Utility'));
 const link=make('a','Open tool');link.href='/'+tool.url;link.append(icon('external'));
 foot.append(link);article.append(top,title,description,foot);return article;
}
function renderTools(){
 const host=$('tool-results');if(!host)return;
 const matches=filteredTools(),pages=Math.max(1,Math.ceil(matches.length/pageSize));
 page=Math.min(page,pages);
 const offset=(page-1)*pageSize;
 host.replaceChildren(...matches.slice(offset,offset+pageSize).map(toolCard));
 $('tool-results-count').textContent=number(matches.length)+' result'+(matches.length===1?'':'s');
 $('tool-results-description').textContent=onlySaved?'Showing your saved tools':activeCategory!=='All'?activeCategory+' tools':'Search, filter or save what you need.';
 $('tool-empty').hidden=matches.length>0;
 $('tool-pagination').hidden=matches.length<=pageSize;
 $('tool-page-label').textContent=page+' / '+pages;
 $('tool-prev').disabled=page<=1;$('tool-next').disabled=page>=pages;
 $('tool-search-clear').hidden=!$('tool-search').value;
 updateSavedButton();
}
function featuredCard(tool,index){
 const link=make('a','','featured-tool-card');link.href='/'+tool.url;
 const head=make('div','','featured-tool-heading');
 head.append(make('span',['Aa','▦','{}','✳'][index%4],'featured-tool-icon'),icon('external'));
 const category=make('span',tool.category||'Utility','featured-tool-category');
 const title=make('h3',tool.name),description=make('p',tool.description),action=make('span','Open tool →','featured-tool-action');
 link.append(head,category,title,description,action);return link;
}

function renderFeaturedTools(){
 const host=$('featured-tools-grid');if(!host)return;
 const selected=featuredToolUrls.map(url=>tools.find(tool=>tool.url===url)).filter(Boolean);
 for(const tool of tools){if(selected.length>=6)break;if(!selected.some(item=>item.url===tool.url))selected.push(tool)}
 if(!selected.length){host.replaceChildren(make('p','The tool collection is temporarily unavailable. Please visit the full directory.','loading-note'));return}
 host.replaceChildren(...selected.map(featuredCard));
}
function renderVentures(){
 const total=$('venture-total');
 if(total)total.textContent=number(ventures.length)+' founder-approved public launch'+(ventures.length===1?'':'es');
 const heroCount=$('venture-hero-count');if(heroCount)heroCount.textContent=number(ventures.length);
 const host=$('venture-products');if(!host)return;
 if(!ventures.length){
  const empty=make('div','','empty-state');
  empty.append(make('span','✳','empty-state-mark'));
  const copy=make('div');
  copy.append(make('span','PUBLIC PORTFOLIO STATUS','section-kicker'),make('h3','No approved public launches yet.'));
  const p=make('p','Products appear here only after research review and founder approval. We will not present a possibility as a launch.');
  copy.append(p);empty.append(copy);host.replaceChildren(empty);return;
 }
 const cards=ventures.map(item=>{
  const card=make('article','','venture-item');
  card.append(make('span','FOUNDER-APPROVED · LAUNCHED','section-kicker'),make('h3',item.name),make('p',item.description));
  const link=make('a','Explore venture →');link.href='/'+item.url;card.append(link);return card;
 });
 host.replaceChildren(...cards);
}
// HQventures has its own feed: every item must satisfy the public
// founder-reviewed product gate. Tools and general activity never enter it.
function renderVentureActivity(){
 const section=$('venture-activity');
 const host=$('venture-activity-list');
 if(!section||!host)return;
 const releases=approvedVentureReleases(allItems);
 if(!releases.length){section.hidden=true;host.replaceChildren();return}
 const cards=releases.map((item,index)=>{
  const row=make('article','','pulse-item');
  row.append(make('span',String(index+1).padStart(2,'0'),'pulse-item-number'));
  const copy=make('div');
  const link=make('a','Launched: '+item.name,'pulse-title');
  link.href='/'+item.url;
  copy.append(link,make('p',item.description));
  row.append(copy);
  const time=make('time',safeDate(item.date));
  time.setAttribute('datetime',item.date);
  row.append(time,make('span','↗','pulse-arrow'));
  return row;
 });
 host.replaceChildren(...cards);
 $('venture-activity-count').textContent=releases.length+' VERIFIED PRODUCT '+(releases.length===1?'RELEASE':'RELEASES');
 section.hidden=false;
}

function applyCatalog(items){
 allItems=Array.isArray(items)?items:[];
 tools=allItems.filter(publicTool);
 ventures=qualifiedProducts(allItems);
 $('tools-count-big').textContent=number(tools.length);
 categoryChips();renderFeaturedTools();renderTools();renderVentures();renderVentureActivity();
}
subscribeCatalog(applyCatalog);
startCatalogMonitoring();
getCatalog().then(()=>loadActivity()).catch(()=>{
 $('tools-count-big').textContent='—';
 $('featured-tools-grid').replaceChildren(make('p','The catalogue could not be loaded. Please try again or browse the directory.','loading-note'));
 $('tool-results').replaceChildren();
 $('tool-results-count').textContent='Catalogue unavailable';
 $('tool-results-description').textContent='Please refresh the page or open the A–Z directory.';
 $('tool-empty').hidden=false;$('tool-pagination').hidden=true;
 $('venture-total').textContent='Approval records unavailable';
  if($('venture-hero-count'))$('venture-hero-count').textContent='—';
});

$('tool-search')?.addEventListener('input',()=>{page=1;renderTools()});
$('tool-search')?.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&event.currentTarget.value){event.currentTarget.value='';page=1;renderTools()}
});
$('tool-search-clear')?.addEventListener('click',()=>{$('tool-search').value='';page=1;renderTools();$('tool-search').focus()});
$('saved-toggle')?.addEventListener('click',()=>{onlySaved=!onlySaved;page=1;renderTools()});
$('tool-sort')?.addEventListener('change',event=>{sortMode=event.target.value;page=1;renderTools()});
$('reset-tool-filters')?.addEventListener('click',()=>{
 activeCategory='All';onlySaved=false;page=1;$('tool-search').value='';$('tool-sort').value='name';sortMode='name';categoryChips();renderTools();
});
$('tool-prev')?.addEventListener('click',()=>{page=Math.max(1,page-1);renderTools();$('tool-results').scrollIntoView({block:'start',behavior:'smooth'})});
$('tool-next')?.addEventListener('click',()=>{page+=1;renderTools();$('tool-results').scrollIntoView({block:'start',behavior:'smooth'})});

async function loadActivity(){
 try{
  const response=await fetch('/activity.json',{cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  const valid=(Array.isArray(data.items)?data.items:[]).filter(item=>
   item&&typeof item.title==='string'&&item.title.length<=100&&!/[<>]/.test(item.title)&&
   (item.kind==='tools'&&tools.some(tool=>tool.url===item.url))&&
   Number.isFinite(Date.parse(item.timestamp))&&Date.parse(item.timestamp)<=Date.now()
  ).slice(0,4);
  $('pulse-count').textContent='LATEST '+valid.length+' VERIFIED TOOL UPDATES';
  if(!valid.length)return;
  const host=$('activity-list');
  host.replaceChildren(...valid.map((item,index)=>{
   const article=make('article','','pulse-item');
   article.append(make('span',String(index+1).padStart(2,'0'),'pulse-item-number'));
   const copy=make('div');
   const link=make('a',item.title);link.href='/'+item.url;link.className='pulse-title';
   copy.append(link);
   if(item.summary)copy.append(make('p',String(item.summary).slice(0,150)));
   article.append(copy);
   const date=safeDate(item.timestamp);if(date)article.append(make('time',date));
   article.append(make('span','↗','pulse-arrow'));return article;
  }));
 }catch{/* Public activity is optional; the rest of the site remains usable. */}
}

document.querySelectorAll('[data-interest]').forEach(button=>button.addEventListener('click',()=>{
 const select=$('interest');
 if(select&&[...select.options].some(option=>option.value===button.dataset.interest))select.value=button.dataset.interest;
 $('contact-form')?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}));
const requestForm=$('contact-form');
if(requestForm)requestForm.dataset.startedAt=String(Date.now());
requestForm?.addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget;
 if(!form.reportValidity())return;
 const fields=Object.fromEntries(new FormData(form));
 const status=$('hqconnect-feedback'),button=form.querySelector('[type="submit"]');
 if(fields.website)return; // Spam honeypot: silently do nothing.
 const payload={
  name:String(fields.name||'').trim(),email:String(fields.email||'').trim(),
  requestType:String(fields.requestType||''),project:String(fields.project||'').trim(),
  message:String(fields.message||'').trim(),timeline:String(fields.timeline||''),
  budget:String(fields.budget||''),consent:fields.consent==='on',
  startedAt:Number(form.dataset.startedAt||0)
 };
 button.disabled=true;status.textContent='Sending your request securely…';
 try{
  const res=await fetch('/api/hqconnect',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',cache:'no-store'});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw Error('Your request could not be saved. Please use the email link below.');
  form.reset();form.dataset.startedAt=String(Date.now());
  status.textContent='Request received. Reference: '+String(data.reference||'').slice(0,60)+'. We will review it and contact you by email if it is a fit.';
  status.dataset.state='success';
 }catch{
  status.textContent='Online submission is unavailable. Please send your request to connect@yorphives.com using the email link below.';
  status.dataset.state='error';
 }finally{button.disabled=false}
});
