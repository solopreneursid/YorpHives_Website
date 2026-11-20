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
import {readSpace,toggleSpace,moveSaved,notifySpace,isSpaceKey,SPACE_EVENT} from './personal-space.mjs';
export function setupDirectorySearch(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win)return;
 const input=doc.getElementById('directory-search'),clear=doc.getElementById('directory-clear');
 const status=doc.getElementById('directory-search-status'),list=doc.querySelector('.directory-list');
 const personal=doc.getElementById('directory-space-results');
 const tabs=[...doc.querySelectorAll('[data-directory-space-tab]')];
 if(!input||!clear||!status||!list||!personal)return;
 const sections=[...list.querySelectorAll('details.directory-section')];
 const entries=sections.map(section=>({
  section,category:section.querySelector('summary span')?.textContent||'',
  cards:[...section.querySelectorAll('a.directory-card')].map(element=>{
   const route=new URL(element.getAttribute('href'),win.location.href).pathname.replace(/^\//,'');
   return {element,route,href:element.getAttribute('href'),name:element.querySelector('strong')?.textContent||'',
    description:element.querySelector('span')?.textContent||''};
  })
 }));
 const toolMap=new Map(entries.flatMap(group=>group.cards.map(card=>[card.route,{...card,category:group.category}])));
 const initialOpen=new Map(entries.map(x=>[x.section,x.section.open]));
 const params=new URL(win.location.href).searchParams;
 function storage(){try{return win.localStorage}catch{return null}}
 function savedRoutes(){try{return new Set(readSaved(win.localStorage))}catch{return new Set()}}
 let mode=params.get('saved')==='1'?'saved':params.get('view')==='recent'?'recent':
  !params.has('q')&&savedRoutes().size?'saved':'all';
 const empty=doc.createElement('p');empty.className='directory-search-empty';empty.hidden=true;
 list.after(empty);
 const total=toolMap.size,totalLabel=doc.getElementById('directory-total');
 if(totalLabel)totalLabel.textContent=String(total)+'+';
 const button=(label,onClick)=>{
  const node=doc.createElement('button');node.type='button';node.textContent=label;
  node.addEventListener('click',onClick);return node;
 };
 function renderPersonal(query){
  const saved=readSpace(storage(),'tools'),ids=readSpace(storage(),'tools',mode);
  const filtered=ids.filter(id=>toolMap.has(id)&&matchesTool(query,toolMap.get(id)));
  const cards=filtered.map(id=>{
   const tool=toolMap.get(id),article=doc.createElement('article');article.className='space-item';
   const tag=doc.createElement('span');tag.className='space-item-label';tag.textContent=tool.category;
   const title=doc.createElement('h3');title.textContent=tool.name;
   const description=doc.createElement('p');description.textContent=tool.description;
   const link=doc.createElement('a');link.className='space-item-link';link.href=tool.href;link.textContent='Open tool →';
   const actions=doc.createElement('div');actions.className='space-actions';
   actions.append(button(saved.includes(id)?'♥ Saved':'♡ Save',()=>{
    if(toggleSpace(storage(),'tools',id)!==null){apply();notifySpace(win)}
   }));
   if(mode==='saved'){
    const index=ids.indexOf(id);
    for(const [label,dir] of [['↑ Move up',-1],['↓ Move down',1]]){
     const control=button(label,()=>{if(moveSaved(storage(),'tools',id,dir)){apply();notifySpace(win)}});
     control.disabled=dir<0?index===0:index===ids.length-1;
     control.setAttribute('aria-label',label+': '+tool.name);actions.append(control);
    }
   }
   article.append(tag,title,description,link,actions);return article;
  });
  if(!cards.length){
   const blank=doc.createElement('div');blank.className='space-empty';
   const title=doc.createElement('strong');
   title.textContent=mode==='saved'?'Your Toolspace is empty.':'No recently used tools yet.';
   const help=doc.createElement('p');
   help.textContent=mode==='saved'?'Choose All Tools and save the tools you use often.':'Open a tool and it will appear here automatically.';
   blank.append(title,help,button('Explore all tools',()=>setMode('all')));personal.replaceChildren(blank);
  }else{
   const grid=doc.createElement('div');grid.className='space-item-grid';grid.append(...cards);
   personal.replaceChildren(grid);
  }
  return filtered.length;
 }
 function apply(){
  const query=input.value.trim();let visible=0;
  tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.directorySpaceTab===mode)));
  personal.hidden=mode==='all';list.hidden=mode!=='all';
  if(mode!=='all'){visible=renderPersonal(query);empty.hidden=true}
  else{
   for(const group of entries){
    let count=0;
    for(const card of group.cards){
     const found=matchesTool(query,{name:card.name,description:card.description,category:group.category});
     card.element.hidden=!found;if(found)count++;
    }
    group.section.hidden=!!query&&!count;
    group.section.open=query?count>0:initialOpen.get(group.section)||false;
    visible+=count;
   }
   empty.hidden=!query||visible>0;
   empty.textContent='No matching tools. Try a simpler word or browse the categories.';
  }
  clear.hidden=!query;
  status.textContent=mode==='saved'?visible+' saved tool'+(visible===1?'':'s')+(query?' match your search.':'.'):
   mode==='recent'?visible+' recently used tool'+(visible===1?'':'s')+(query?' match your search.':'.'):
   query?visible+' of '+total+' tools match your search.':'Browse '+total+' free tools by category below.';
 }
 function syncUrl(){
  const url=new URL(win.location.href),query=input.value.trim();
  if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');
  if(mode==='saved')url.searchParams.set('saved','1');else url.searchParams.delete('saved');
  if(mode==='recent')url.searchParams.set('view','recent');else url.searchParams.delete('view');
  win.history.replaceState(win.history.state,'',url.pathname+url.search+url.hash);
 }
 function setMode(next){if(!['all','recent','saved'].includes(next))return;mode=next;apply();syncUrl()}
 const initial=params.get('q');if(initial)input.value=initial.slice(0,120);
 tabs.forEach(tab=>tab.addEventListener('click',()=>setMode(tab.dataset.directorySpaceTab)));
 input.addEventListener('input',()=>{apply();syncUrl()});
 win.addEventListener('storage',event=>{if(isSpaceKey(event.key))apply()});
 win.addEventListener(SPACE_EVENT,apply);
 win.addEventListener('pageshow',apply);
 clear.addEventListener('click',()=>{input.value='';apply();syncUrl();input.focus()});
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&input.value){event.preventDefault();input.value='';apply();syncUrl()}
 });
 win.addEventListener('popstate',()=>{
  const next=new URL(win.location.href).searchParams;
  input.value=(next.get('q')||'').slice(0,120);
  mode=next.get('saved')==='1'?'saved':next.get('view')==='recent'?'recent':'all';
  apply();
 });
 apply();
}
if(typeof document!=='undefined')setupDirectorySearch();
