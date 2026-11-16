/* Small, data-backed rotating highlights for the reimagined YorpHives preview.
 * No inferred product activity. No remote services, timers stop offscreen.
 * Page links and card interactions remain fully keyboard accessible. */
import {qualifiedProducts} from '../product-policy.mjs';

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
let ecoPaused=false,pulsePaused=false;
let pulseEntries=[];
let pulseIndex=0;
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
 const card={wrap,entries:safe,index:0,key};cards[key]=card;
 watch(wrap);
 if(safe.length){byId('eco-strip-'+key).textContent=safe[0].text;byId('eco-strip-'+key).title=safe[0].text}
 if(safe.length>1)window.setInterval(()=>{
  if(!canMove(wrap,ecoPaused))return;
  card.index=(card.index+1)%safe.length;
  animateText(wrap,'eco-strip-'+key,safe[card.index].text);
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
async function initEco(){
 initEcoControl();
 const catalog=await getJson('../catalog.json');
 const items=Array.isArray(catalog?.items)?catalog.items:[];
 const qualified=qualifiedProducts(items).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const tools=items.filter(publicTool);
 const categoryCounts=new Map();
 for(const tool of tools){const category=abbreviate(tool.category||'Other');
  if(!category||category.length>42)continue;
  categoryCounts.set(category,(categoryCounts.get(category)||0)+1);
 }
 // Each category is genuine and links to the same Free Tools catalog.
 const categories=[...categoryCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .map(([category,count])=>({text:category+' · '+count+' tool'+(count===1?'':'s'),category}));
 const products=qualified.map(p=>({text:p.name,url:p.url}));
 useCard('ventures',products,5400);
 useCard('tools',categories,4300);
 // A one-item venture list stays static; no bogus product cards are generated.
 const builderFeed=await getJson('builders-updates.json');
 const builderRows=Array.isArray(builderFeed?.items)?builderFeed.items:[];
 const unique=new Set();
 const builderEntries=builderRows.filter(event=>event?.kind==='builders'&&event?.url==='#builders'&&
   typeof event.timestamp==='string'&&Number.isFinite(Date.parse(event.timestamp))&&
   Date.parse(event.timestamp)<=Date.now()&&safeText(event.title)&&!unique.has(event.id)&&unique.add(event.id))
  .sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).slice(0,10)
  .map(e=>({text:e.title}));
 useCard('builders',builderEntries,6200);
 // Turn a category-strip click into an actually filtered tool library visit.
 const toolsCard=document.querySelector('.eco-tools');
 toolsCard?.addEventListener('click',event=>{
  if(!event.target.closest('[data-strip="tools"]'))return;
  const current=cards.tools?.entries[cards.tools.index];
  if(!current?.category)return;
  event.preventDefault();
  document.dispatchEvent(new CustomEvent('yorphives:select-tool-category',{detail:{category:current.category}}));
 });
 // Venture strip opens the selected, qualified product directly.
 document.querySelector('.eco-ventures')?.addEventListener('click',event=>{
  if(!event.target.closest('[data-strip="ventures"]'))return;
  const current=cards.ventures?.entries[cards.ventures.index];
  if(!current?.url)return;
  event.preventDefault();window.location.assign('../'+current.url);
 });
 return {tools,qualified};
}
function approvedUsage(data){
 const p=data?.publication;
 return data?.schemaVersion===1&&p?.status==='approved'&&p.approvedByFounder===true&&
  validDate(p.approvedAt)&&p.approvedAt<=new Date().toISOString().slice(0,10)&&
  p.periodDays===30&&p.metric==='completed_uses'&&Array.isArray(data.ranked)&&
  data.ranked.length>0&&data.ranked.length<=10;
}
function showPulse(){
 const item=pulseEntries[pulseIndex];if(!item)return;
 const a=byId('yh-pulse-item');
 a.href='../'+item.url;a.classList.remove('is-placeholder');
 byId('yh-pulse-number').textContent=String(pulseIndex+1).padStart(2,'0')+' / '+pulseEntries.length;
 byId('yh-pulse-name').textContent=item.name;
 byId('yh-pulse-kind').textContent=item.type==='tool'?'FREE TOOL':'HQVENTURES';
 byId('yh-pulse-label').textContent='MOST USED / LAST 30 DAYS';
 a.title='Open '+item.name;
}
async function initPulse(items){
 const a=byId('yh-pulse-item');if(!a)return;
 watch(a);
 const data=await getJson('usage-public.json');
 if(!approvedUsage(data))return;
 const valid=new Map(items.filter(x=>publicTool(x)||qualifiedProducts([x]).length).map(x=>[x.url,x]));
 const seen=new Set();
 const list=[];
 for(const row of data.ranked){
  if(!row||typeof row.url!=='string'||seen.has(row.url)||!valid.has(row.url))continue;
  seen.add(row.url);list.push(valid.get(row.url));
 }
 if(!list.length)return;
 pulseEntries=list.slice(0,10);pulseIndex=0;showPulse();
 const toggle=byId('yh-pulse-toggle');
 toggle.disabled=pulseEntries.length<2;
 if(pulseEntries.length<2)return;
 const label=toggle.querySelector('span');
 toggle.addEventListener('click',()=>{
  pulsePaused=!pulsePaused;
  toggle.setAttribute('aria-pressed',String(pulsePaused));
  toggle.setAttribute('aria-label',pulsePaused?'Resume YHpulse rotation':'Pause YHpulse rotation');
  toggle.firstChild.textContent=pulsePaused?'▶ ':'Ⅱ ';
  label.textContent=pulsePaused?'Resume':'Pause';
 });
 window.setInterval(()=>{
  if(!canMove(a,pulsePaused))return;
  a.classList.add('is-changing');
  window.setTimeout(()=>{pulseIndex=(pulseIndex+1)%pulseEntries.length;showPulse();a.classList.remove('is-changing');},210);
 },4900);
}

const {tools,qualified}=await initEco();
await initPulse([...tools,...qualified]);