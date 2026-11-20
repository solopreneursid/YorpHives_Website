/* First-party, event-delegated tap feedback. Never blocks navigation,
   tool execution, form submission, clipboard actions or downloads. */
const pressTime=170,clickTime=260;
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
function actionFrom(target){
 if(!(target instanceof Element))return null;
 const action=target.closest('a[href],button,summary,[role="button"]');
 if(!action||action.matches(':disabled,[aria-disabled="true"]')||
   action.closest('[inert],[hidden]'))return null;
 return action;
}
if(typeof document!=='undefined'){
 const timers=new WeakMap();
 function feedback(action,kind,duration){
  if(!action||reduced())return;
  const name='yh-motion-'+kind;
  const prior=timers.get(action)||{};
  if(prior[kind])clearTimeout(prior[kind]);
  action.classList.add(name);
  prior[kind]=setTimeout(()=>{action.classList.remove(name);delete prior[kind]},duration);
  timers.set(action,prior);
 }
 document.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  feedback(actionFrom(event.target),'press',pressTime);
 },{passive:true});
 document.addEventListener('click',event=>{
  // Keyboard-generated click events also receive the same light feedback.
  feedback(actionFrom(event.target),'clicked',clickTime);
 },{passive:true});
}
