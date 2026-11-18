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
let ecoPaused=false,pulsePaused=false;
let pulseEntries=[];
let pulseIndex=0;
let latestCatalogItems=[];
let publishedUsage=null;
let usageMode='approved';
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
// A pair of identical sequences loops seamlessly, like a small horizontal news ticker.
// Rebuild only when verified catalogue/feed data changes; no per-frame JavaScript.
function renderTicker(card){
 const {wrap,key,entries}=card;
 const target=byId('eco-strip-'+key);
 if(!target)return;
 target.replaceChildren();
 const fallback={ventures:'Founder-approved launches will appear here',tools:'No published categories yet',builders:'Verified updates will appear here'};
 if(!entries.length){
  target.textContent=fallback[key];target.title=fallback[key];target.classList.remove('is-ticker');
  wrap.classList.remove('has-ticker');return;
 }
 if(entries.length===1){
  target.textContent=entries[0].text;target.title=entries[0].text;
  target.classList.remove('is-ticker');wrap.classList.remove('has-ticker');return;
 }
 const makeGroup=(clone=false)=>{
  const group=document.createElement('span');group.className='eco-ticker-group';
  if(clone)group.setAttribute('aria-hidden','true');
  entries.forEach((entry,index)=>{
   const item=document.createElement('span');item.className='eco-ticker-item';
   item.dataset.tickerIndex=String(index);
   item.textContent=entry.text;item.title=entry.text;
   group.append(item);
  });
  return group;
 };
 target.append(makeGroup(),makeGroup(true));
 target.classList.add('is-ticker');wrap.classList.add('has-ticker');
 wrap.style.setProperty('--eco-scroll-duration',Math.max(14,Math.min(48,entries.length*5.5))+'s');
 wrap.setAttribute('aria-label',(key==='tools'?'Free tool categories':key==='ventures'?'Approved ventures':'Builders updates')+': '+entries.map(x=>x.text).join('; '));
 wrap.classList.toggle('is-paused',ecoPaused);
}
function useCard(key,entries){
 const wrap=document.querySelector('[data-strip="'+key+'"]');
 if(!wrap)return;
 const safe=Array.isArray(entries)?entries.filter(x=>safeText(x?.text)):[],
  card=cards[key]||{wrap,entries:[],index:0,key};
 cards[key]=card;card.entries=safe;card.index=0;
 watch(wrap);renderTicker(card);
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
 btn.addEventListener('click',()=>{ecoPaused=!ecoPaused;Object.values(cards).forEach(card=>card.wrap.classList.toggle('is-paused',ecoPaused));update()});
 update();
}
function onCatalogUpdate(items){
 latestCatalogItems=items;
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
 useCard('ventures',qualified.map(p=>({text:p.name,url:p.url})));
 useCard('tools',categories);
 // When an existing tool is changed or a new tool is launched, eligibility
 // is rechecked for YHpulse; ranking still requires *actual* approved usage.
 if(publishedUsage)applyUsageSnapshot(publishedUsage);
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
 useCard('builders',builderEntries);
 const toolsCard=document.querySelector('.eco-tools');
 toolsCard?.addEventListener('click',event=>{
  if(!event.target.closest('[data-strip="tools"]'))return;
  const index=Number(event.target.closest('.eco-ticker-item')?.dataset.tickerIndex ?? 0);
  const current=cards.tools?.entries[index];
  if(!current?.category)return;
  event.preventDefault();
  document.dispatchEvent(new CustomEvent('yorphives:select-tool-category',{detail:{category:current.category}}));
 });
 document.querySelector('.eco-ventures')?.addEventListener('click',event=>{
  if(!event.target.closest('[data-strip="ventures"]'))return;
  const index=Number(event.target.closest('.eco-ticker-item')?.dataset.tickerIndex ?? 0);
  const current=cards.ventures?.entries[index];
  if(!current?.url)return;
  event.preventDefault();window.location.assign('../'+current.url);
 });
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
 byId('yh-pulse-label').textContent=usageMode==='observed'?'COMPLETED ACTIONS / 30 DAYS':'MOST USED / LAST 30 DAYS';
 a.title=(usageMode==='observed'?'Observed browser-reported completed actions — not independently verified. Open ':'Open ')+item.name;
}
function resetPulse(){
 pulseEntries=[];pulseIndex=0;
 const a=byId('yh-pulse-item');a.href='#home-progress';a.classList.add('is-placeholder');
 byId('yh-pulse-number').textContent='—';
 byId('yh-pulse-name').textContent='Live usage collection is starting. Rankings appear after completed tool actions.';
 byId('yh-pulse-kind').textContent='EVIDENCE FIRST';
 byId('yh-pulse-label').textContent='MOST USED / 30 DAYS';
 byId('yh-pulse-toggle').disabled=true;
}
function applyUsageSnapshot(data){
 if(!approvedUsage(data))return;
 const eligible=latestCatalogItems.filter(x=>publicTool(x)||qualifiedProducts([x]).length);
 const valid=new Map(eligible.map(x=>[x.url,x]));
 const seen=new Set(),list=[];
 for(const row of data.ranked){
  if(!row||typeof row.url!=='string'||seen.has(row.url)||!valid.has(row.url))continue;
  seen.add(row.url);list.push(valid.get(row.url));
 }
 if(!list.length){resetPulse();return;}
 const current=pulseEntries[pulseIndex]?.url;
 pulseEntries=list.slice(0,10);
 pulseIndex=Math.max(0,pulseEntries.findIndex(x=>x.url===current));
 showPulse();
 const toggle=byId('yh-pulse-toggle');toggle.disabled=pulseEntries.length<2;
}

function applyObservedUsage(rows){
 const eligible=latestCatalogItems.filter(x=>publicTool(x)||qualifiedProducts([x]).length);
 const valid=new Map(eligible.map(x=>[x.url,x]));
 const seen=new Set(),list=[];
 for(const row of rows){
  if(!row||typeof row.url!=='string'||seen.has(row.url)||!valid.has(row.url)||
   !Number.isSafeInteger(row.completedActions)||row.completedActions<1)continue;
  seen.add(row.url);list.push(valid.get(row.url));
  if(list.length>=10)break;
 }
 if(!list.length){resetPulse();return;}
 usageMode='observed';
 pulseEntries=list;pulseIndex=0;showPulse();
 byId('yh-pulse-toggle').disabled=list.length<2;
}
async function refreshUsage(){
 const observed=await getJson('/api/insights/public');
 if(observed?.available===true&&observed.schemaVersion===1&&observed.periodDays===30&&
  observed.usage?.metric==='browser_reported_completed_actions'&&
  Array.isArray(observed.usage.ranked)){
  publishedUsage=null;
  if(observed.usage.ranked.length)applyObservedUsage(observed.usage.ranked);
  else resetPulse();
  return;
 }
 const snapshot=await getJson('usage-public.json');
 if(!approvedUsage(snapshot)){
  publishedUsage=null;
  resetPulse();
  return;
 }
 publishedUsage=snapshot;
 applyUsageSnapshot(snapshot);
}
async function initPulse(){
 const a=byId('yh-pulse-item');if(!a)return;
 watch(a);
 await refreshUsage();
 const toggle=byId('yh-pulse-toggle');
 const label=toggle.querySelector('span');
 toggle.addEventListener('click',()=>{
  pulsePaused=!pulsePaused;
  toggle.setAttribute('aria-pressed',String(pulsePaused));
  toggle.setAttribute('aria-label',pulsePaused?'Resume YHpulse rotation':'Pause YHpulse rotation');
  toggle.firstChild.textContent=pulsePaused?'▶ ':'Ⅱ ';
  label.textContent=pulsePaused?'Resume':'Pause';
 });
 window.setInterval(()=>{
  if(pulseEntries.length<2||!canMove(a,pulsePaused))return;
  a.classList.add('is-changing');
  window.setTimeout(()=>{pulseIndex=(pulseIndex+1)%pulseEntries.length;showPulse();a.classList.remove('is-changing');},210);
 },4900);
 // Aggregate rankings can change independently of catalogue content.
 // Refresh infrequently while open; no per-visitor event tracking.
 window.setInterval(()=>{if(!document.hidden)void refreshUsage()},300_000);
 window.addEventListener('focus',()=>{if(!document.hidden)void refreshUsage()});
}

await initEco();
await initPulse();