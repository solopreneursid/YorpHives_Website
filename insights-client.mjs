/* First-party YorpHives anonymous usage signals.
 * Does not transmit tool inputs, filenames, output, IP, UA, or personal data.
 * Session identifier is random and scoped to this browser tab; backend hashes it.
 * No third-party SDK, cookies, device fingerprinting, or advertising pixels.
 */
const API='/api/insights/collect';
const OPT_KEY='yorphives-anonymous-analytics-disabled';
const SID_KEY='yorphives-analytics-tab-session-v1';
const state={enabled:false,pending:null};
const dnt=()=>navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
const optedOut=()=>{try{return localStorage.getItem(OPT_KEY)==='1'}catch{return true}};
let tabId;
function sessionId(){
 if(tabId)return tabId;
 try{
  const old=sessionStorage.getItem(SID_KEY);
  if(old&&/^[a-f0-9-]{36}$/i.test(old))return tabId=old;
  tabId=crypto.randomUUID();sessionStorage.setItem(SID_KEY,tabId);return tabId;
 }catch{return tabId=crypto.randomUUID()}
}
const analyticsEnabled=()=>!dnt()&&!optedOut()&&typeof crypto?.randomUUID==='function';
function ui(){
 const btn=document.getElementById('anonymous-analytics-toggle');
 if(!btn)return;
 btn.textContent=analyticsEnabled()?'Anonymous analytics: On (turn off)':'Anonymous analytics: Off (turn on)';
 btn.setAttribute('aria-pressed',String(analyticsEnabled()));
 btn.disabled=dnt();
 btn.title=dnt()?'Disabled by your browser privacy preference':'No cookies or tool data collected; change this any time';
}
async function event(kind,extra){
 if(!analyticsEnabled())return;
 const payload={sessionId:sessionId(),event:kind,...extra};
 try{
  await fetch(API,{method:'POST',mode:'same-origin',credentials:'omit',keepalive:true,
   headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 }catch{/* Analytics may fail; site operations must never fail. */}
}
const route=()=>{
 if(/^\/tools\/[a-z0-9-]+\/$/.test(location.pathname))return 'tool';
 const hash=location.hash.slice(1);
 const alias={explore:'ventures',connect:'contact',ecosystem:'home',opportunities:'builders',membership:'builders'};
 const target=alias[hash]||hash||'home';
 return ['home','ventures','builders','impact','tools','partners','contact'].includes(target)?target:'home';
};
let lastRoute='';
function trackView(){
 const page=route();
 if(page!==lastRoute){lastRoute=page;void event('view',{route:page})}
}
function toolOutput(){
 const ids=['utility-result','file-result','image-result','pdf-result','qr-result',
   'json-output','hash-output','text-output','utility-output'];
 const parts=[];
 for(const id of ids){
  const node=document.getElementById(id);
  if(!node||node.hidden||node.closest('[hidden]'))continue;
  if('value'in node){if(String(node.value).trim())parts.push(id+':'+String(node.value).slice(0,160))}
  else if(node.querySelector('a[download],img,canvas,video')||
     node.textContent?.trim())parts.push(id+':'+node.textContent?.slice(0,120));
 }
 return parts.join('|');
}
function setupToolUsage(){
 if(!/^\/tools\/[a-z0-9-]+\/$/.test(location.pathname))return;
 const url=location.pathname.slice(1);
 let timer,baseline='';
 const begin=()=>{
  if(!analyticsEnabled())return;
  clearInterval(timer);
  baseline=toolOutput();
  let ticks=0;
  timer=setInterval(()=>{
   ticks++;
   const now=toolOutput();
   const status=(document.getElementById('utility-status')||
    document.getElementById('file-status')||
    document.getElementById('json-status')||
    document.getElementById('image-status'))?.textContent||'';
   if(now&&now!==baseline&&!/\b(error|failed|invalid|unable)\b/i.test(status)){
    clearInterval(timer);void event('complete',{url});
   }else if(ticks>100)clearInterval(timer);
  },180);
 };
 document.addEventListener('submit',e=>{
  if(e.isTrusted&&/^(utility-form|file-tool-form)$/.test(e.target?.id||''))begin();
 },true);
 document.addEventListener('click',e=>{
  if(!e.isTrusted)return;
  const target=e.target.closest('button');
  if(!target||target.disabled||target.type==='reset')return;
  const id=target.id;
  if(/^(utility-run|file-run|image-convert|json-format|json-minify|tool-run|convert|generate|calculate)$/.test(id)||
    target.matches('.tool-btn.primary')&&!target.closest('#contact-form'))begin();
 },true);
}
document.addEventListener('DOMContentLoaded',()=>{
 const toggle=document.getElementById('anonymous-analytics-toggle');
 toggle?.addEventListener('click',()=>{
  if(dnt())return;
  try{localStorage.setItem(OPT_KEY,analyticsEnabled()?'1':'0')}catch{}
  ui();
 });
 ui();trackView();setupToolUsage();
});
window.addEventListener('hashchange',()=>{setTimeout(trackView,0)});
window.addEventListener('storage',ui);
