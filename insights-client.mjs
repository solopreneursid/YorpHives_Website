/* First-party, consent-based usage signals. Tool content and filenames are not
 * sent. The random tab identifier is hashed on the backend; it is not a claim
 * that all network metadata is anonymous. No third-party analytics SDK.
 */
const API='/api/insights/collect';
const OPT_KEY='yorphives-anonymous-analytics-disabled'; // legacy opt-out compatibility
const CHOICE_KEY='yorphives-analytics-choice-v2';
const SID_KEY='yorphives-analytics-tab-session-v1';
const dnt=()=>navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
let tabId,temporaryChoice=null,lastRoute='';
function choice(){
 if(temporaryChoice)return temporaryChoice;
 try{
  const stored=localStorage.getItem(CHOICE_KEY);
  if(stored==='allow'||stored==='deny')return stored;
  // Existing explicit opt-outs stay off; a previously enabled default is not consent.
  if(localStorage.getItem(OPT_KEY)==='1')return 'deny';
 }catch{/* Use a one-page choice when storage is unavailable. */}
 return 'unset';
}
function sessionId(){
 if(tabId)return tabId;
 try{
  const old=sessionStorage.getItem(SID_KEY);
  if(old&&/^[a-f0-9-]{36}$/i.test(old))return tabId=old;
  tabId=crypto.randomUUID();sessionStorage.setItem(SID_KEY,tabId);return tabId;
 }catch{return tabId=crypto.randomUUID()}
}
const analyticsEnabled=()=>!dnt()&&choice()==='allow'&&typeof globalThis.crypto?.randomUUID==='function';
function ui(){
 const btn=document.getElementById('anonymous-analytics-toggle');
 if(btn){
  btn.textContent=analyticsEnabled()?'Analytics on — turn off':'Analytics off — change';
  btn.setAttribute('aria-pressed',String(analyticsEnabled()));
  btn.disabled=dnt();
  btn.title=dnt()?'Off because of your browser privacy preference':'Change your optional analytics choice';
 }
 const status=document.getElementById('privacy-analytics-status');
 if(status)status.textContent=dnt()?'Analytics are off because your browser has requested privacy.':
  analyticsEnabled()?'Optional analytics are on. Select the button to turn them off.':
  choice()==='deny'?'Optional analytics are off. You can change your choice.':'Optional analytics are off until you choose to allow them.';
 const banner=document.getElementById('yh-analytics-choice');
 if(banner&&(dnt()||choice()!=='unset'))banner.hidden=true;
}
function selectAnalytics(allow){
 if(allow&&dnt())return;
 const wasAllowed=choice()==='allow';
 const value=allow?'allow':'deny';
 temporaryChoice=value;
 try{
  localStorage.setItem(CHOICE_KEY,value);
  // This also stops a still-open tab running the earlier analytics client.
  localStorage.setItem(OPT_KEY,allow?'0':'1');
  temporaryChoice=null;
 }catch{/* The choice remains effective for this page only. */}
 if(!allow&&(wasAllowed||tabId)){
  try{sessionStorage.removeItem(SID_KEY)}catch{}
  tabId=undefined;lastRoute='';
 }
 ui();
 if(allow)trackView();
}
function showChoice(){
 if(dnt())return;
 const banner=document.getElementById('yh-analytics-choice');
 if(banner){banner.hidden=false;banner.querySelector('button')?.focus()}
}
function createChoice(){
 if(!document.body||typeof document.createElement!=='function')return;
 const styles=document.createElement('style');
 styles.textContent=`
 .yh-analytics-control{font:600 12px/1.4 system-ui,sans-serif;color:inherit;background:transparent;border:0;padding:8px 3px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
 .yh-analytics-control:focus-visible,.yh-analytics-choice :focus-visible{outline:3px solid #167a60;outline-offset:3px}
 .yh-analytics-control:disabled{cursor:not-allowed;opacity:.8}
 .yh-analytics-choice{position:fixed;z-index:9999;right:16px;bottom:16px;left:16px;max-width:520px;padding:20px;border:1px solid #b9ccba;border-radius:16px;background:#fffefa;color:#14271d;box-shadow:0 12px 42px #10282130;font:15px/1.5 system-ui,sans-serif}
 .yh-analytics-choice[hidden]{display:none!important}.yh-analytics-choice h2{font-size:17px;line-height:1.25;margin:0 0 8px}.yh-analytics-choice p{margin:0 0 14px}.yh-analytics-choice a{color:#075d4c;text-decoration:underline}.yh-analytics-actions{display:flex;flex-wrap:wrap;gap:10px}.yh-analytics-actions button{flex:1 1 155px;min-height:44px;padding:10px 14px;border:1px solid #245b45;border-radius:9px;background:#fff;color:#173c2c;font:700 14px/1.3 system-ui,sans-serif;cursor:pointer}
 @media(max-width:760px){.yh-analytics-choice{bottom:calc(64px + env(safe-area-inset-bottom,0px));right:10px;left:10px;padding:16px}}
 `;
 document.head.append(styles);
 const banner=document.createElement('section');
 banner.id='yh-analytics-choice';banner.className='yh-analytics-choice';
 banner.setAttribute('aria-labelledby','yh-analytics-choice-title');banner.hidden=true;
 banner.innerHTML='<h2 id="yh-analytics-choice-title">Optional website analytics</h2>'+
  '<p>May we count page visits and completed tool uses to improve YorpHives? We use a temporary tab identifier, not your tool inputs or files. <a href="/privacy/#analytics">Read the Privacy Policy</a>.</p>'+
  '<div class="yh-analytics-actions"><button type="button" data-analytics-choice="allow">Allow analytics</button><button type="button" data-analytics-choice="deny">Decline analytics</button></div>';
 document.body.append(banner);
 banner.querySelector('[data-analytics-choice="allow"]').addEventListener('click',()=>selectAnalytics(true));
 banner.querySelector('[data-analytics-choice="deny"]').addEventListener('click',()=>selectAnalytics(false));
 // Ask only on pages that use analytics. Other pages expose the settings control.
 if(choice()==='unset'&&!dnt()&&route()!==null)banner.hidden=false;
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
 if(location.pathname!=='/')return null;
 const hash=location.hash.slice(1);
 const alias={explore:'ventures',connect:'contact',hqconnect:'contact','suggest-tool':'contact',ecosystem:'home',opportunities:'builders',membership:'builders'};
 const target=alias[hash]||hash||'home';
 return ['home','ventures','builders','impact','tools','partners','contact'].includes(target)?target:'home';
};
function trackView(){
 if(!analyticsEnabled())return;
 const page=route();
 if(page===null)return;
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
 createChoice();
 const toggle=document.getElementById('anonymous-analytics-toggle');
 toggle?.addEventListener('click',()=>{
  if(dnt())return;
  if(analyticsEnabled())selectAnalytics(false);
  else showChoice();
 });
 ui();trackView();setupToolUsage();
});
window.addEventListener('hashchange',()=>{setTimeout(trackView,0)});
window.addEventListener('storage',()=>{temporaryChoice=null;ui();trackView()});
