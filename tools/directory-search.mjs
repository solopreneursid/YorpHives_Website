// Search is a progressive enhancement of server-rendered, crawlable links.
// No analytics, cookies, catalog fetch, external services or user-input uploads.
import {matchesTool,suggestTools} from './search-match.mjs';
export {matchesTool,normalizeSearch} from './search-match.mjs';
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
 const initialOpen=new Map(entries.map(x=>[x.section,x.section.open]));
 let savedMode=new URL(win.location.href).searchParams.get('saved')==='1';
 function savedRoutes(){try{return new Set(readSaved(win.localStorage));}catch{return new Set();}}

 const empty=doc.createElement('div');
 empty.className='directory-search-empty';empty.hidden=true;
 empty.textContent='No matching tools. Try a simpler word or browse the categories.';
 list.after(empty);
 const total=entries.reduce((count,group)=>count+group.cards.length,0);
 const totalLabel=doc.getElementById('directory-total');
 if(totalLabel)totalLabel.textContent=String(total)+'+';
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
  if(query&&!visible&&!savedMode){
   const candidates=entries.flatMap(group=>group.cards.map(card=>({
    name:card.name,description:card.description,category:group.category,href:card.element.getAttribute('href')
   })));
   const related=suggestTools(query,candidates);
   if(related.length){
    const label=doc.createElement('p');label.textContent='You might find these useful:';empty.append(label);
    const links=doc.createElement('div');links.className='directory-suggestions';
    for(const tool of related){const link=doc.createElement('a');link.href=tool.href;link.textContent=tool.name;links.append(link);}
    empty.append(links);
   }
  }
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
 win.addEventListener('storage',event=>{if(event.key===SAVED_KEY)apply()});
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
 apply();
}
if(typeof document!=='undefined')setupDirectorySearch();
