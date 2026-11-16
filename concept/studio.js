/* YorpHives Studio Concept / preview-only, provider-neutral, no remote APIs.
 * Uses real published catalog, real public activity, and the site's existing
 * founder qualification policy. No accounts, tracking, paid services or forms.
 */
'use strict';
const $=(sel,base=document)=>base.querySelector(sel);
const $$=(sel,base=document)=>[...base.querySelectorAll(sel)];
const pages=$$('.page');
const labels={home:'YorpHives',tools:'Free Tools',hqventures:'HQventures',builders:'Builders',contact:'Contact'};
const anchors={partners:'builders',membership:'builders','venture-collection':'hqventures',explore:'hqventures'};
const menu=$('#mobile-menu'),menuButton=$('#menu-toggle');
let lastRoute='';
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation')}
menuButton.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
window.addEventListener('resize',()=>{if(innerWidth>850)closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus()}});
function route(){
 let hash=decodeURIComponent(location.hash.replace(/^#/,''))||'home';
 const target=Object.hasOwn(labels,hash)?hash:(anchors[hash]||'home');
 pages.forEach(p=>{p.hidden=p.id!==target});
 $$('[data-nav]').forEach(a=>{if(a.dataset.nav===target)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 document.title=target==='home'?'YorpHives — Studio Concept Preview':labels[target]+' — YorpHives Concept';
 closeMenu();
 if(Object.hasOwn(anchors,hash))requestAnimationFrame(()=>document.getElementById(hash==='explore'?'hqventures':hash)?.scrollIntoView({block:'start',behavior:'instant'}));
 else if(target!==lastRoute)window.scrollTo({top:0,behavior:'instant'});
 lastRoute=target;
}
window.addEventListener('hashchange',route);route();
$('#year').textContent=String(new Date().getFullYear());
$$('[data-reason]').forEach(a=>a.addEventListener('click',()=>{$('#contact-topic').value=a.dataset.reason}));
$('#contact-form').addEventListener('submit',e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const body=[...new FormData(e.currentTarget)].map(([name,value])=>name+': '+String(value).trim()).join('\n\n');
 location.href='mailto:connect@yorphives.com?subject='+encodeURIComponent('YorpHives concept enquiry')+'&body='+encodeURIComponent(body);
});
const safePath=url=>/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(String(url||''));
const toolHref=t=>'../'+t.url;
const categoriesOf=t=>t.category||'Other';
const iconFor=cat=>({Writing:'✎',PDF:'▤',Images:'◈',Design:'✿',Developer:'⌘',Security:'⌁',Spreadsheets:'▦',Files:'▣',Calculators:'∑',Marketing:'↗',Creator:'◎',Presentations:'▤'})[cat]||'◇';
let tools=[],category='All',query='',onlySaved=false,sort='featured',page=1;
const perPage=12,storageKey='yorphives-concept-saved-v1';
let saved=new Set();
try{const s=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(s))saved=new Set(s.filter(x=>typeof x==='string'&&safePath(x)))}catch{}
function persistSaved(){try{localStorage.setItem(storageKey,JSON.stringify([...saved]))}catch{}}
function element(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node}
function renderMiniTools(){
 const slugs=['word-counter','pdf-merge','image-resizer','json-formatter'];
 const selection=slugs.map(slug=>tools.find(t=>t.url==='tools/'+slug+'/')).filter(Boolean);
 const list=selection.length>=3?selection:tools.slice(0,4);
 const frag=document.createDocumentFragment();
 for(const t of list){const a=element('a','mini-tool');a.href=toolHref(t);a.append(element('span','mini-icon',iconFor(categoriesOf(t))),element('span','mini-tool-name',t.name),element('span','mini-tool-arrow','↗'));frag.append(a)}
 $('#home-tool-list').replaceChildren(frag);$('#home-total').textContent=tools.length+' TOOLS';
}
function filters(){
 const values=['All',...new Set(tools.map(categoriesOf))];
 const frag=document.createDocumentFragment();
 for(const value of values){const btn=element('button','filter'+(category===value?' selected':''),value);btn.type='button';btn.setAttribute('aria-pressed',String(category===value));btn.addEventListener('click',()=>{category=value;page=1;filters();renderTools()});frag.append(btn)}
 $('#category-filters').replaceChildren(frag);
}
function filtered(){
 const q=query.trim().normalize('NFKD').toLowerCase().split(/\s+/).filter(Boolean);
 let xs=tools.filter(t=>(category==='All'||categoriesOf(t)===category)&&(!onlySaved||saved.has(t.url))&&q.every(k=>(t.name+' '+t.description+' '+categoriesOf(t)).toLowerCase().includes(k)));
 if(sort==='alpha')xs.sort((a,b)=>a.name.localeCompare(b.name));
 return xs;
}
function renderTools(){
 const xs=filtered(),pagesTotal=Math.max(1,Math.ceil(xs.length/perPage));page=Math.min(page,pagesTotal);
 const content=xs.slice((page-1)*perPage,page*perPage),frag=document.createDocumentFragment();
 for(const t of content){
  const card=element('article','tool-card');card.setAttribute('role','listitem');
  const head=element('div','tool-card-head'),icon=element('span','tool-card-icon',iconFor(categoriesOf(t))),saveBtn=element('button','save-tool',saved.has(t.url)?'★':'☆');
  saveBtn.type='button';saveBtn.setAttribute('aria-pressed',String(saved.has(t.url)));
  saveBtn.setAttribute('aria-label',(saved.has(t.url)?'Remove ':'Save ')+t.name);
  saveBtn.addEventListener('click',()=>{saved.has(t.url)?saved.delete(t.url):saved.add(t.url);persistSaved();renderTools()});
  head.append(icon,saveBtn);card.append(head,element('h3','',t.name),element('p','',t.description));
  const link=element('a','tool-card-link');link.href=toolHref(t);link.append(element('span','',categoriesOf(t)),element('span','','↗'));card.append(link);frag.append(card);
 }
 $('#tool-results').replaceChildren(frag);
 $('#result-count').textContent=xs.length+' '+(xs.length===1?'tool':'tools')+' available';
 $('#page-info').textContent=page+' / '+pagesTotal;
 $('#tools-prev').disabled=page===1;$('#tools-next').disabled=page===pagesTotal;
 $('#tools-empty').hidden=xs.length!==0;$('#tool-results').hidden=xs.length===0;
 $('#saved-filter').setAttribute('aria-pressed',String(onlySaved));
 $('#saved-filter').textContent=(onlySaved?'★':'☆')+' Saved'+(saved.size?' ('+saved.size+')':'');
}
$('#tool-query').addEventListener('input',e=>{query=e.target.value;page=1;renderTools()});
$('#search-clear').addEventListener('click',()=>{$('#tool-query').value='';query='';page=1;renderTools();$('#tool-query').focus()});
$('#saved-filter').addEventListener('click',()=>{onlySaved=!onlySaved;page=1;renderTools()});
$('#tool-sort').addEventListener('change',e=>{sort=e.target.value;page=1;renderTools()});
$('#tools-prev').addEventListener('click',()=>{page=Math.max(1,page-1);renderTools();$('#tools').scrollIntoView({block:'start'})});
$('#tools-next').addEventListener('click',()=>{page++;renderTools();$('#tools').scrollIntoView({block:'start'})});
$('#tools-reset').addEventListener('click',()=>{category='All';onlySaved=false;query='';page=1;$('#tool-query').value='';filters();renderTools()});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!$('#tools').hidden&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();$('#tool-query').focus()}});
function renderApproved(products){
 const box=$('#approved-ventures'),frag=document.createDocumentFragment();
 for(const p of products){
  const card=element('article','approved-card');card.append(element('small','','FOUNDER APPROVED'),element('h3','',p.name),element('p','',p.description));
  if(/^(?:apps|products)\/[a-z0-9][a-z0-9-]*\/$/.test(String(p.url||''))){const a=element('a','','Open venture ↗');a.href='../'+p.url;card.append(a)}frag.append(card);
 }
 box.replaceChildren(frag);$('#ventures-empty').hidden=products.length!==0;
}
async function initCatalog(){
 try{
  const response=await fetch('../catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('Catalog unavailable');
  const data=await response.json();if(!Array.isArray(data.items))throw Error('Invalid catalog');
  const published=data.items.filter(t=>t&&t.visibility!=='private'&&t.published!==false);
  tools=published.filter(t=>t.type==='tool'&&safePath(t.url)&&typeof t.name==='string'&&typeof t.description==='string');
  filters();renderTools();renderMiniTools();
  const {qualifiedProducts}=await import('../product-policy.mjs');renderApproved(qualifiedProducts(published));
 }catch(error){
  console.warn('Concept catalog unavailable:',error.message);
  $('#home-tool-list').replaceChildren(element('a','mini-tool','Open the A–Z tool directory ↗'));
  $('#home-tool-list a').href='../tools/';$('#home-total').textContent='TOOLS';
  $('#result-count').textContent='Unable to load tools. Try the A–Z directory.';
  $('#tools-empty').hidden=false;$('#tool-results').hidden=true;
 }
}
async function initPulse(){
 try{
  const response=await fetch('../activity.json',{cache:'no-cache'});if(!response.ok)throw Error('No feed');
  const data=await response.json(),items=(data.items||[]).filter(t=>t&&typeof t.title==='string'&&typeof t.url==='string'&&t.url.startsWith('tools/')&&safePath(t.url)).slice(0,12);
  if(!items.length)throw Error('No verified tool updates');
  const set=duplicate=>{
   const section=element('div','pulse-set');if(duplicate)section.setAttribute('aria-hidden','true');
   for(const t of items){
    const a=element('a','pulse-item');a.href='../'+t.url;if(duplicate)a.tabIndex=-1;
    const badge=element('em','','TOOLS');const label=element('span','',t.title);const date=element('small','',new Date(t.timestamp).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
    a.append(badge,label,date);section.append(a);
   }return section;
  };
  const track=element('div','pulse-track');track.append(set(false),set(true));$('#pulse-window').replaceChildren(track);
 }catch{ $('#pulse-window').textContent='New releases and tool updates appear here.';$('#pulse-toggle').hidden=true }
}
$('#pulse-toggle').addEventListener('click',()=>{const paused=$('.pulse-band').classList.toggle('is-paused');$('#pulse-toggle').textContent=paused?'▶':'Ⅱ';$('#pulse-toggle').setAttribute('aria-pressed',String(paused));$('#pulse-toggle').setAttribute('aria-label',paused?'Resume YHpulse':'Pause YHpulse')});
initCatalog();initPulse();
