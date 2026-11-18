// Search is a progressive enhancement of server-rendered, crawlable links.
// No analytics, cookies, catalog fetch, external services or user-input uploads.
export function normalizeSearch(value){
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,' ').trim();
}
export function matchesTool(query,{name='',description='',category=''}={}){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 if(!terms.length)return true;
 const searchable=normalizeSearch([name,description,category].join(' '));
 return terms.every(term=>searchable.includes(term));
}
import {readSaved,SAVED_KEY} from './save-tool.mjs';
export function setupDirectorySearch(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win)return;
 const input=doc.getElementById('directory-search');
 const clear=doc.getElementById('directory-clear');
 const status=doc.getElementById('directory-search-status');
 const savedOnly=doc.getElementById('directory-saved-only');
 const list=doc.querySelector('.directory-list');
 if(!input||!clear||!status||!list)return;
 const sections=[...list.querySelectorAll('details.directory-section')];
 const entries=sections.map(section=>({
  section,
  category:section.querySelector('summary span')?.textContent||'',
  cards:[...section.querySelectorAll('a.directory-card')].map(card=>({
   element:card,
   name:card.querySelector('strong')?.textContent||'',
   description:card.querySelector('span')?.textContent||''
  }))
 }));
 // A saved shortcut shelf is purely local UI state. No analytics event,
 // visitor identifier, tool input, or server request is associated with it.
 const shelf=doc.getElementById('directory-return');
 const shelfLinks=doc.getElementById('directory-return-links');
 const savedCards=new Map(entries.flatMap(group=>group.cards.map(card=>{
  const route=new URL(card.element.getAttribute('href'),win.location.href).pathname.slice(1);
  return [route,{route,name:card.name,category:group.category}];
 })));
 function renderSavedShelf(){
  if(!shelf||!shelfLinks)return;
  let routes=[];
  try{routes=readSaved(win.localStorage)}catch{}
  const selection=routes.map(route=>savedCards.get(route)).filter(Boolean).slice(0,6);
  if(!selection.length){shelf.hidden=true;shelfLinks.replaceChildren();return;}
  const links=selection.map(item=>{
   const li=doc.createElement('li'),a=doc.createElement('a');
   a.href='/'+item.route;
   const name=doc.createElement('strong'),category=doc.createElement('span');
   name.textContent=item.name;category.textContent=item.category;
   a.append(name,category);li.append(a);return li;
  });
  shelfLinks.replaceChildren(...links);shelf.hidden=false;
 }
 const initialOpen=new Map(entries.map(x=>[x.section,x.section.open]));
 let savedMode=new URL(win.location.href).searchParams.get('saved')==='1';
 function savedRoutes(){try{return new Set(readSaved(win.localStorage));}catch{return new Set();}}

 const empty=doc.createElement('p');
 empty.className='directory-search-empty';empty.hidden=true;
 empty.textContent='No matching tools. Try a simpler word or browse the categories.';
 list.after(empty);
 const total=entries.reduce((count,group)=>count+group.cards.length,0);
 function apply(){
  const query=input.value.trim();
  let visible=0;
  const saved=savedMode?savedRoutes():null;
  for(const group of entries){
   let groupVisible=0;
   for(const card of group.cards){
    const url=new URL(card.element.getAttribute('href'),win.location.href);
    const route=url.pathname.replace(/^\//,'');
    const found=(!savedMode||saved.has(route))&&matchesTool(query,{name:card.name,description:card.description,category:group.category});
    card.element.hidden=!found;
    if(found)groupVisible++;
   }
   group.section.hidden=(!!query||savedMode)&&!groupVisible;
   if(query||savedMode)group.section.open=groupVisible>0;
   else group.section.open=initialOpen.get(group.section)||false;
   visible+=groupVisible;
  }
  clear.hidden=!query;
  empty.hidden=(!query&&!savedMode)||visible>0;
  empty.textContent=savedMode?'No saved tools match. Open any tool and choose “Save this tool”, or show all tools.':
   'No matching tools. Try a simpler word or browse the categories.';
  if(savedOnly){savedOnly.setAttribute('aria-pressed',String(savedMode));savedOnly.textContent=savedMode?'♥ Showing saved tools':'♡ Show saved tools'}
  status.textContent=savedMode
   ?visible+' saved tool'+(visible===1?'':'s')+(query?' match your search.':'.')
   :query?visible+' of '+total+' tools match your search.'
   :'Browse '+total+' free tools by category below.';
 }
 function syncUrl(){
  const url=new URL(win.location.href);
  const query=input.value.trim();
  if(query)url.searchParams.set('q',query);
  else url.searchParams.delete('q');
  if(savedMode)url.searchParams.set('saved','1');else url.searchParams.delete('saved');
  win.history.replaceState(win.history.state,'',url.pathname+url.search+url.hash);
 }
 const initial=new URL(win.location.href).searchParams.get('q');
 if(initial)input.value=initial.slice(0,120);
 input.addEventListener('input',()=>{apply();syncUrl()});
 savedOnly?.addEventListener('click',()=>{savedMode=!savedMode;apply();syncUrl()});
 win.addEventListener('storage',event=>{
  if(event.key===SAVED_KEY){renderSavedShelf();apply();}
 });
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden){renderSavedShelf();apply();}});

 clear.addEventListener('click',()=>{input.value='';apply();syncUrl();input.focus()});
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&input.value){event.preventDefault();input.value='';apply();syncUrl()}
 });
 win.addEventListener('popstate',()=>{
  const params=new URL(win.location.href).searchParams;
  input.value=(params.get('q')||'').slice(0,120);
  savedMode=params.get('saved')==='1';
  apply();
 });
 renderSavedShelf();
 apply();
}
if(typeof document!=='undefined')setupDirectorySearch();
