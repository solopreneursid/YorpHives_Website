/* First-party, catalogue-synchronized rotating six-card showcase.
 * Only published browser tools and founder-approved launched HQventures products.
 * No external APIs, synthetic ventures, user tracking or unnecessary network calls.
 */
import {qualifiedProducts} from '../product-policy.mjs';

export const SHOWCASE_SIZE=6;
const ROTATE_INTERVAL_MS=2700;
const FLIP_DURATION_MS=680;

const isPublicTool=item=>item?.type==='tool'&&item.published!==false&&
 item.visibility!=='private'&&typeof item.name==='string'&&item.name.trim().length>0&&
 typeof item.description==='string'&&item.description.trim().length>0&&
 typeof item.url==='string'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(item.url);

export function eligibleShowcaseItems(items){
 if(!Array.isArray(items))return [];
 const seen=new Set(),result=[];
 for(const item of items.filter(isPublicTool).map(item=>({...item,showcaseKind:'tool'}))
  .concat(qualifiedProducts(items).map(item=>({...item,showcaseKind:'venture'})))){
  if(seen.has(item.url))continue;
  seen.add(item.url);result.push(item);
 }
 return result;
}
const randomIndex=(length,rng)=>Math.min(length-1,Math.max(0,Math.floor(Number(rng())*length)||0));
function takeRandom(items,count,rng){
 const copy=items.slice(),picked=[];
 while(copy.length&&picked.length<count)picked.push(copy.splice(randomIndex(copy.length,rng),1)[0]);
 return picked;
}
export function selectShowcaseItems(pool,size=SHOWCASE_SIZE,rng=Math.random){
 if(!Array.isArray(pool)||size<=0)return [];
 const seen=new Set(),unique=pool.filter(item=>{
  if(!item?.url||seen.has(item.url))return false;
  seen.add(item.url);return item.showcaseKind==='tool'||item.showcaseKind==='venture';
 });
 const ventures=unique.filter(item=>item.showcaseKind==='venture');
 const tools=unique.filter(item=>item.showcaseKind==='tool');
 const ventureQuota=Math.min(3,ventures.length,Math.max(0,size-(tools.length?1:0)));
 const chosen=takeRandom(ventures,ventureQuota,rng);
 chosen.push(...takeRandom(tools,Math.min(tools.length,size-chosen.length),rng));
 const leftovers=unique.filter(item=>!chosen.some(pick=>pick.url===item.url));
 chosen.push(...takeRandom(leftovers,size-chosen.length,rng));
 return takeRandom(chosen,chosen.length,rng);
}
export function chooseShowcaseReplacement(pool,visible,slot,rng=Math.random,preferredUrls=[]){
 if(!Array.isArray(visible)||slot<0||slot>=visible.length)return null;
 const current=visible[slot],other=visible.filter((_,index)=>index!==slot);
 const otherUrls=new Set(other.map(item=>item.url));
 const candidates=pool.filter(item=>item.url!==current.url&&!otherUrls.has(item.url));
 // Once a published venture exists, the showcase must not silently hide
 // the last HQventures slot. Likewise, retain at least one free tool.
 const mustKeepVenture=current.showcaseKind==='venture'&&!other.some(item=>item.showcaseKind==='venture')&&pool.some(item=>item.showcaseKind==='venture');
 const mustKeepTool=current.showcaseKind==='tool'&&!other.some(item=>item.showcaseKind==='tool')&&pool.some(item=>item.showcaseKind==='tool');
 const valid=candidates.filter(item=>(!mustKeepVenture||item.showcaseKind==='venture')&&(!mustKeepTool||item.showcaseKind==='tool'));
 if(!valid.length)return null;
 const preferred=valid.filter(item=>preferredUrls.includes(item.url));
 const choices=preferred.length?preferred:valid;
 return choices[randomIndex(choices.length,rng)];
}
const node=(tag,text='',className='')=>{
 const el=document.createElement(tag);
 if(text)el.textContent=text;
 if(className)el.className=className;
 return el;
};
const cardContent=(link,item,index)=>{
 link.replaceChildren();
 link.href='/'+item.url;
 const head=node('div','','featured-tool-heading');
 head.append(node('span',item.showcaseKind==='venture'?'✳':['Aa','▦','{}','✦'][index%4],'featured-tool-icon'));
 const arrow=node('span','↗','showcase-arrow');arrow.setAttribute('aria-hidden','true');
 head.append(arrow);
 const type=item.showcaseKind==='venture'?'HQVENTURES · LAUNCHED':('FREE TOOL · '+(item.category||'UTILITY'));
 link.append(
  head,
  node('span',type,'featured-tool-category'),
  node('h3',item.name),
  node('p',item.description,'showcase-description'),
  node('span',item.showcaseKind==='venture'?'Explore product →':'Open tool →','featured-tool-action')
 );
 // Use visible link content as its accessible name.
};
const makeSlot=(item,index)=>{
 const slot=node('div','','showcase-slot');
 const flipper=node('div','','showcase-flipper');
 const first=node('a','','featured-tool-card showcase-face showcase-front');
 const second=node('a','','featured-tool-card showcase-face showcase-back');
 cardContent(first,item,index);second.setAttribute('inert','');second.setAttribute('aria-hidden','true');
 flipper.append(first,second);slot.append(flipper);
 return {element:slot,faces:[first,second],side:0,item,index,flipping:false};
};
export function createRotatingShowcase(host,pauseButton,{interval=ROTATE_INTERVAL_MS,rng=Math.random}={}){
 if(!host)return {update(){},destroy(){}};
 let pool=[],slots=[],paused=false,inView=true,lastUrlSet=new Set(),firstLoad=true,rotationCursor=0;
 let pendingNew=new Set(),destroyed=false,tabVisible=!document.hidden;
 const motion=typeof window.matchMedia==='function'
  ?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
 paused=!!motion?.matches;
 function updateButton(){
  if(!pauseButton)return;
  pauseButton.textContent=paused?'Resume flips':'Pause flips';
  pauseButton.setAttribute('aria-pressed',String(paused));
 }
 updateButton();
 const togglePause=()=>{paused=!paused;updateButton()};
 pauseButton?.addEventListener('click',togglePause);
 const visibility=()=>{tabVisible=!document.hidden};
 document.addEventListener('visibilitychange',visibility);
 const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{
  inView=entries[0]?.isIntersecting??true;
 },{threshold:.08,rootMargin:'120px'}):null;
 observer?.observe(host);
 function canRotate(){
  const hoverAllowed=typeof window.matchMedia==='function'&&window.matchMedia('(hover: hover)').matches;
  return !paused&&tabVisible&&inView&&!destroyed&&slots.length>=2&&
   !host.contains(document.activeElement)&&!(hoverAllowed&&host.matches(':hover'));
 }
 function paint(items){
  const chosen=selectShowcaseItems(items,SHOWCASE_SIZE,rng);
  slots=chosen.map(makeSlot);rotationCursor=0;
  if(!slots.length){
   host.replaceChildren(node('p','The published catalogue is temporarily unavailable. Browse the full Free Tools library.','loading-note'));
   return;
  }
  host.replaceChildren(...slots.map(slot=>slot.element));
 }
 function flip(slot,next){
  if(slot.flipping)return false;
  const outgoing=slot.faces[slot.side];
  const incoming=slot.faces[1-slot.side];
  cardContent(incoming,next,slot.index);
  slot.flipping=true;
  slot.item=next;
  const nextSide=1-slot.side;
  if(motion?.matches){
   outgoing.setAttribute('inert','');outgoing.setAttribute('aria-hidden','true');
   incoming.removeAttribute('inert');incoming.removeAttribute('aria-hidden');
   slot.element.classList.toggle('is-flipped',nextSide===1);
   slot.side=nextSide;slot.flipping=false;return true;
  }
  slot.element.classList.toggle('is-flipped',nextSide===1);
  window.setTimeout(()=>{
   outgoing.setAttribute('inert','');outgoing.setAttribute('aria-hidden','true');
   incoming.removeAttribute('inert');incoming.removeAttribute('aria-hidden');
  },FLIP_DURATION_MS/2);
  window.setTimeout(()=>{slot.flipping=false;},FLIP_DURATION_MS+25);
  slot.side=nextSide;
  return true;
 }
 function rotateOne(){
  if(!canRotate())return;
  // Prioritize newly published tools/apps after an automatic catalogue refresh.
  const preferences=[...pendingNew];
  const visible=slots.map(slot=>slot.item);
  for(let count=0;count<slots.length;count++){
   const index=(rotationCursor+count)%slots.length;
   const slot=slots[index];
   if(slot.flipping)continue;
   const replacement=chooseShowcaseReplacement(pool,visible,index,rng,preferences);
   if(!replacement)continue;
   if(flip(slot,replacement)){
    pendingNew.delete(replacement.url);
    rotationCursor=(index+1)%slots.length;
   }
   return;
  }
 }
 const timer=window.setInterval(rotateOne,Math.max(1200,interval));
 return {
  update(items){
   if(destroyed)return;
   const next=eligibleShowcaseItems(items);
   const latest=new Set(next.map(item=>item.url));
   const changed=next.length!==pool.length||next.some((item,index)=>{
    const old=pool[index];
    return item.url!==old?.url||item.name!==old?.name||item.description!==old?.description||
      item.category!==old?.category||item.showcaseKind!==old?.showcaseKind;
   });
   if(!changed)return;
   if(!firstLoad){
    for(const item of next)if(!lastUrlSet.has(item.url))pendingNew.add(item.url);
   }
   pool=next;lastUrlSet=latest;
   firstLoad=false;
   const currentValid=slots.length>0&&slots.every(slot=>latest.has(slot.item.url));
   if(!currentValid){paint(next);return}
   // Refresh text for existing cards without discarding current focus.
   for(const slot of slots){
    const now=next.find(item=>item.url===slot.item.url);
    if(now&&now!==slot.item){
     slot.item=now;
     cardContent(slot.faces[slot.side],now,slot.index);
    }
   }
   if(next.some(item=>item.showcaseKind==='venture')&&
      !slots.some(slot=>slot.item.showcaseKind==='venture')){
    const venture=next.find(item=>item.showcaseKind==='venture'&&!slots.some(slot=>slot.item.url===item.url));
    const index=slots.findIndex(slot=>slot.item.showcaseKind==='tool'&&!slot.flipping);
    if(venture&&index>=0){flip(slots[index],venture);pendingNew.delete(venture.url)}
   }
  },
  destroy(){
   destroyed=true;window.clearInterval(timer);observer?.disconnect();
   pauseButton?.removeEventListener('click',togglePause);
   document.removeEventListener('visibilitychange',visibility);
  }
 };
}
