/* First-party YorpHives anonymous usage signals.
 * Does not transmit tool inputs, filenames, output, IP, UA, or personal data.
 * Session identifier is random and scoped to this browser tab; backend hashes it.
 * No third-party SDK, cookies, device fingerprinting, or advertising pixels.
 */
const API='/api/insights/collect';
const OPT_KEY='yorphives-anonymous-analytics-disabled';
const SID_KEY='yorphives-analytics-tab-session-v1';
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
const analyticsEnabled=()=>!dnt()&&!optedOut()&&typeof globalThis.crypto?.randomUUID==='function';
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
 if(/^\/tools\/[a-z0-9-]+\/$/.test(location.pathname))return location.pathname.slice(1);
 const hash=location.hash.slice(1);
 const alias={explore:'ventures',connect:'contact',hqconnect:'contact',ecosystem:'home',opportunities:'builders',membership:'builders'};
 const target=alias[hash]||hash||'home';
 return ['home','ventures','builders','impact','tools','partners','contact'].includes(target)?target:'home';
};
let lastRoute='';
function trackView(){
 const page=route();
 if(page!==lastRoute){lastRoute=page;void event('view',{route:page})}
}
// A completed result is detected from visible UI state only. Never inspect,
// serialize or hash the user's tool inputs, generated output, or filenames.
const resultIds=['utility-result','file-result','wave1-result','wave2-results',
 'wave3-result','wave4-output','wave6-result','wave7-result',
 'image-result','pdf-result','qr-result','json-result','tool-result'];
function resultVisible(){
 return resultIds.some(id=>{
  const node=document.getElementById(id);
  if(!node||node.hidden||node.closest('[hidden]'))return false;
  const css=getComputedStyle(node);
  return css.display!=='none'&&css.visibility!=='hidden';
 });
}
function setupToolUsage(){
 if(!/^\/tools\/[a-z0-9-]+\/$/.test(location.pathname))return;
 const url=location.pathname.slice(1);
 let timer=null,lastSent=0;
 function completed(){
  if(!analyticsEnabled())return;
  const now=Date.now();if(now-lastSent<800)return;
  lastSent=now;
  if(timer!==null){clearInterval(timer);timer=null}
  void event('complete',{url});
 }
 // Explicit signal from the common local processors, fired only after success.
 window.addEventListener('yorphives:tool-completed',completed);
 function begin(){
  if(!analyticsEnabled())return;
  if(timer!==null)clearInterval(timer);
  let sawEmpty=!resultVisible(),checks=0;
  timer=setInterval(()=>{
   checks++;
   const visible=resultVisible();
   if(!visible)sawEmpty=true;
   const status=(document.getElementById('utility-status')||
     document.getElementById('file-status')||
     document.getElementById('wave1-status')||
     document.getElementById('wave2-status')||
     document.getElementById('wave3-status'))?.textContent||'';
   if(visible&&sawEmpty&&!/\b(error|failed|invalid|unable)\b/i.test(status)){
    completed();
   }else if(checks>=100){clearInterval(timer);timer=null}
  },180);
 }
 document.addEventListener('submit',e=>{
  if(e.isTrusted&&/^(utility-form|file-tool-form|wave1-form|wave2-form|wave3-form)$/.test(e.target?.id||''))begin();
 },true);
 document.addEventListener('click',e=>{
  if(!e.isTrusted)return;
  const target=e.target.closest('button');
  if(!target||target.disabled||target.type==='reset')return;
  if(/^(utility-run|file-run|wave1-run|wave2-run|wave3-run|wave4-run|image-convert|json-format|json-minify|tool-run|convert|generate|calculate)$/.test(target.id)||
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
