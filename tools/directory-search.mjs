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
export function setupDirectorySearch(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win)return;
 const input=doc.getElementById('directory-search');
 const clear=doc.getElementById('directory-clear');
 const status=doc.getElementById('directory-search-status');
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
 const empty=doc.createElement('p');
 empty.className='directory-search-empty';empty.hidden=true;
 empty.textContent='No matching tools. Try a simpler word or browse the categories.';
 list.after(empty);
 const total=entries.reduce((count,group)=>count+group.cards.length,0);
 function apply(){
  const query=input.value.trim();
  let visible=0;
  for(const group of entries){
   let groupVisible=0;
   for(const card of group.cards){
    const found=matchesTool(query,{name:card.name,description:card.description,category:group.category});
    card.element.hidden=!found;
    if(found)groupVisible++;
   }
   group.section.hidden=!!query&&!groupVisible;
   if(query)group.section.open=groupVisible>0;
   else group.section.open=initialOpen.get(group.section)||false;
   visible+=groupVisible;
  }
  clear.hidden=!query;
  empty.hidden=!query||visible>0;
  status.textContent=query
   ?visible+' of '+total+' tools match your search.'
   :'Browse '+total+' free tools by category below.';
 }
 function syncUrl(){
  const url=new URL(win.location.href);
  const query=input.value.trim();
  if(query)url.searchParams.set('q',query);
  else url.searchParams.delete('q');
  win.history.replaceState(win.history.state,'',url.pathname+url.search+url.hash);
 }
 const initial=new URL(win.location.href).searchParams.get('q');
 if(initial)input.value=initial.slice(0,120);
 input.addEventListener('input',()=>{apply();syncUrl()});
 clear.addEventListener('click',()=>{input.value='';apply();syncUrl();input.focus()});
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&input.value){event.preventDefault();input.value='';apply();syncUrl()}
 });
 win.addEventListener('popstate',()=>{
  input.value=(new URL(win.location.href).searchParams.get('q')||'').slice(0,120);
  apply();
 });
 apply();
}
if(typeof document!=='undefined')setupDirectorySearch();
