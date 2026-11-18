/* Small, data-backed rotating highlights for the reimagined YorpHives preview.
 * No inferred product activity. No remote services, timers stop offscreen.
 * Page links and card interactions remain fully keyboard accessible. */
import {qualifiedProducts} from '../product-policy.mjs';
import {getCatalog,subscribeCatalog} from './catalog-sync.mjs';

const byId=id=>document.getElementById(id);
const publicTool=item=>item?.type==='tool'&&item.published!==false&&item.visibility!=='private'&&
  typeof item.name==='string'&&typeof item.url==='string'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(item.url);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(new Date(value+'T00:00:00Z').valueOf())&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const getJson=async url=>{
 try{const res=await fetch(url,{cache:'no-store'});return res.ok?await res.json():null;}
 catch{return null;}
};
const mql=window.matchMedia('(prefers-reduced-motion: reduce)');
let ecoPaused=false;
const cards={};
const zones=new Map();
const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{
 for(const item of entries)zones.set(item.target,item.isIntersecting);
},{threshold:.08,rootMargin:'90px'}):null;
const watch=element=>{if(observer&&element){zones.set(element,true);observer.observe(element)}};
const canMove=(element,paused)=>!!element&& !mql.matches && !paused&& !document.hidden&&
 (!observer||zones.get(element)!==false)&& !element.matches(':hover')&& !element.matches(':focus-within')&&
 !element.closest('.eco-card')?.matches(':focus');
const safeText=value=>typeof value==='string'&&value.length>0&&value.length<=140&&!/[<>]/.test(value);
const abbreviate=value=>String(value).trim();
const animateText=(wrap,id,content)=>{
 const target=byId(id);if(!target)return;
 if(mql.matches){target.textContent=content;return;}
 wrap.classList.add('is-changing');
 window.setTimeout(()=>{target.textContent=content;target.title=content;wrap.classList.remove('is-changing');},210);
};
function useCard(key,entries,interval){
 const wrap=document.querySelector('[data-strip="'+key+'"]');
 if(!wrap)return;
 const safe=Array.isArray(entries)?entries.filter(x=>safeText(x?.text)):[];
 const prior=cards[key];
 if(prior){
  const current=prior.entries[prior.index];
  const retained=safe.findIndex(x=>x.category?x.category===current?.category:x.url?x.url===current?.url:x.text===current?.text);
  prior.entries=safe;prior.index=retained>=0?retained:0;
  const value=safe[prior.index]?.text;
  if(value){byId('eco-strip-'+key).textContent=value;byId('eco-strip-'+key).title=value;}
  else{
   const fallback={ventures:'Founder-approved launches will appear here',tools:'No published categories yet',builders:'Verified updates will appear here'};
   byId('eco-strip-'+key).textContent=fallback[key]||'No verified updates yet';
  }
  return;
 }
 const card={wrap,entries:safe,index:0,key};cards[key]=card;
 watch(wrap);
 if(safe.length){byId('eco-strip-'+key).textContent=safe[0].text;byId('eco-strip-'+key).title=safe[0].text}
 window.setInterval(()=>{
  if(card.entries.length<2||!canMove(wrap,ecoPaused))return;
  card.index=(card.index+1)%card.entries.length;
  animateText(wrap,'eco-strip-'+key,card.entries[card.index].text);
 },interval);
}
function initEcoControl(){
 const btn=byId('eco-motion-toggle');if(!btn)return;
 const label=btn.querySelector('span');
 const update=()=>{
  btn.setAttribute('aria-pressed',String(ecoPaused));
  btn.setAttribute('aria-label',ecoPaused?'Resume rotating ecosystem highlights':'Pause rotating ecosystem highlights');
  btn.firstChild.textContent=ecoPaused?'▶ ':'Ⅱ ';
  label.textContent=ecoPaused?'Resume highlights':'Pause highlights';
 };
 btn.addEventListener('click',()=>{ecoPaused=!ecoPaused;update()});
 update();
}
function onCatalogUpdate(items){
 const qualified=qualifiedProducts(items).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const tools=items.filter(publicTool);
 const categoryCounts=new Map();
 for(const tool of tools){
  const category=abbreviate(tool.category||'Other');
  if(!category||category.length>42)continue;
  categoryCounts.set(category,(categoryCounts.get(category)||0)+1);
 }
 const categories=[...categoryCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .map(([category,count])=>({text:category+' · '+count+' tool'+(count===1?'':'s'),category}));
 useCard('ventures',qualified.map(p=>({text:p.name,url:p.url})),5400);
 useCard('tools',categories,4300);

}
async function initEco(){
 initEcoControl();
 subscribeCatalog(onCatalogUpdate);
 await getCatalog();
 const builderFeed=await getJson('builders-updates.json');
 const builderRows=Array.isArray(builderFeed?.items)?builderFeed.items:[];
 const unique=new Set();
 const builderEntries=builderRows.filter(event=>event?.kind==='builders'&&event?.url==='#builders'&&
   typeof event.timestamp==='string'&&Number.isFinite(Date.parse(event.timestamp))&&
   Date.parse(event.timestamp)<=Date.now()&&safeText(event.title)&&!unique.has(event.id)&&unique.add(event.id))
  .sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).slice(0,10)
  .map(e=>({text:e.title}));
 useCard('builders',builderEntries,6200);
 const toolsCard=document.querySelector('.eco-tools');
 toolsCard?.addEventListener('click',event=>{
  if(!event.target.closest('[data-strip="tools"]'))return;
  const current=cards.tools?.entries[cards.tools.index];
  if(!current?.category)return;
  event.preventDefault();
  document.dispatchEvent(new CustomEvent('yorphives:select-tool-category',{detail:{category:current.category}}));
 });
 document.querySelector('.eco-ventures')?.addEventListener('click',event=>{
  if(!event.target.closest('[data-strip="ventures"]'))return;
  const current=cards.ventures?.entries[cards.ventures.index];
  if(!current?.url)return;
  event.preventDefault();window.location.assign('../'+current.url);
 });
}
await initEco();