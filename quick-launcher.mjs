// First-party, lazy keyboard launcher for public tools and approved products.
// The search text stays on the device. Only /catalog.json is requested.
import {qualifiedProducts} from './product-policy.mjs';
import {readSpace,productIdentity,recordRecent} from './tools/personal-space.mjs';
const $=(tag,className,text)=>{
 const node=document.createElement(tag);if(className)node.className=className;
 if(text)node.textContent=text;return node;
};
let dialog,input,results,notice,items=[],selected=-1,loaded=false,loading=null,previousFocus;
const local=()=>{try{return localStorage}catch{return null}};
function normalize(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').trim()}
function build(){
 dialog=$('dialog','yh-quick-dialog');dialog.id='yh-quick-dialog';dialog.setAttribute('aria-labelledby','yh-quick-title');
 const top=$('div','yh-quick-top');
 const label=$('strong','', 'Quick Launcher');label.id='yh-quick-title';
 const close=$('button','yh-quick-close','✕ Close');close.type='button';close.setAttribute('aria-label','Close Quick Launcher');
 close.addEventListener('click',()=>dialog.close());top.append(label,close);
 input=$('input','yh-quick-input');input.id='yh-quick-input';input.type='search';input.autocomplete='off';
 input.placeholder='Find a tool or product…';input.setAttribute('aria-label','Find a tool or product');
 notice=$('p','yh-quick-note','Type to search your tools and approved products. ↑ ↓ and Enter to open.');
 results=$('div','yh-quick-results');results.setAttribute('role','list');
 dialog.append(top,input,notice,results);
 dialog.addEventListener('close',()=>previousFocus?.focus?.());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('keydown',event=>{
  const links=[...results.querySelectorAll('a')];
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();if(!links.length)return;
   let index=links.indexOf(document.activeElement);
   if(index<0)index=event.key==='ArrowDown'?-1:0;
   index=(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
   links[index].focus();selected=index;
  }
  if(event.key==='Enter'&&document.activeElement===input&&links[0]){
   event.preventDefault();links[0].click();
  }
  if(event.key==='Escape'){event.preventDefault();dialog.close()}
 });
 input.addEventListener('input',render);
 document.body.append(dialog);
}
async function load(){
 if(loaded)return;
 if(!loading)loading=(async()=>{
  const response=await fetch('/catalog.json',{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Catalogue unavailable');
  const data=await response.json();
  const all=Array.isArray(data.items)?data.items:[];
  const tools=all.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private'&&
   typeof x.url==='string'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(x.url)&&typeof x.name==='string');
  const products=qualifiedProducts(all);
  items=[
   ...tools.map(x=>({kind:'tools',id:x.url,url:x.url,name:x.name,category:x.category||'Free Tool',description:x.description||''})),
   ...products.map(x=>({kind:'products',id:productIdentity(x),url:x.url,name:x.name,category:'HQventures product',description:x.description||''}))
  ];
  loaded=true;
 })();
 try{await loading}finally{loading=null}
}
function render(){
 if(!results)return;
 const query=normalize(input.value),storage=local();
 const savedTools=new Set(readSpace(storage,'tools')),savedProducts=new Set(readSpace(storage,'products'));
 const recentTools=readSpace(storage,'tools','recent'),recentProducts=readSpace(storage,'products','recent');
 const ranked=items.map(item=>{
  const phrase=normalize(item.name),haystack=normalize(item.name+' '+item.category+' '+item.description);
  if(query&&!query.split(/\s+/).every(term=>haystack.includes(term)))return null;
  const saved=(item.kind==='tools'?savedTools:savedProducts).has(item.id);
  const recent=(item.kind==='tools'?recentTools:recentProducts).indexOf(item.id);
  const score=(query?(phrase.startsWith(query)?100:phrase.includes(query)?70:20):0)+(saved?30:0)+(recent<0?0:20-Math.min(19,recent));
  return {...item,saved,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,10);
 selected=-1;
 if(!ranked.length){
  const no=$('p','yh-quick-empty',query?'No matching published tools or products.':'No public items available.');
  results.replaceChildren(no);return;
 }
 results.replaceChildren(...ranked.map(item=>{
  const link=$('a','yh-quick-option');
  link.href='/'+item.url;
  const copy=$('span','yh-quick-copy');
  copy.append($('strong','',item.name),$('small','',item.category));
  const badge=$('span','yh-quick-badge',item.saved?'★ Saved':'↗');
  link.append(copy,badge);
  link.addEventListener('click',()=>{recordRecent(local(),item.kind,item.id);dialog.close()});
  return link;
 }));
}
async function open(){
 if(!dialog)build();
 previousFocus=document.activeElement;
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 input.value='';results.replaceChildren($('p','yh-quick-empty','Loading published catalogue…'));input.focus();
 try{await load();render()}catch{results.replaceChildren($('p','yh-quick-empty','Catalogue unavailable. Please try again later.'))}
}
document.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
  event.preventDefault();
  if(dialog?.open)dialog.close();else open();
 }
});
document.addEventListener('click',event=>{
 if(event.target.closest?.('[data-open-launcher]'))open();
});
