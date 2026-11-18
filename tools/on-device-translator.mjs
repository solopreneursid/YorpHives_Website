// Progressive enhancement: browser-managed on-device translation only.
// Never send the source text, output, language selection or files to a server.
// No remote API, package downloads from YorpHives, accounts, cookies or tracking.
export const LANGUAGE_CODES=Object.freeze(['en','hi','es','fr','de','ja','pt','zh','ar','it']);
export function validPair(source,target){
 return LANGUAGE_CODES.includes(source)&&LANGUAGE_CODES.includes(target)&&source!==target;
}
export function translatorAPI(win=globalThis){
 const API=win?.Translator;
 return API&&typeof API.availability==='function'&&typeof API.create==='function'?API:null;
}
export async function checkAvailability(API,sourceLanguage,targetLanguage){
 if(!validPair(sourceLanguage,targetLanguage))return 'unavailable';
 if(!API)return 'unsupported';
 try{
  const status=await API.availability({sourceLanguage,targetLanguage});
  return ['available','downloadable','downloading','unavailable'].includes(status)?status:'unavailable';
 }catch{return 'unavailable';}
}
export function bindTranslator(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win)return;
 const form=doc.getElementById('translator-form');if(!form)return;
 const source=doc.getElementById('translator-source');
 const target=doc.getElementById('translator-target');
 const input=doc.getElementById('translator-input');
 const output=doc.getElementById('translator-output');
 const run=doc.getElementById('translator-run');
 const status=doc.getElementById('translator-status');
 const availability=doc.getElementById('translator-availability');
 const count=doc.getElementById('translator-count');
 const result=doc.getElementById('translator-result');
 const swap=doc.getElementById('translator-swap');
 const copy=doc.getElementById('translator-copy');
 const api=translatorAPI(win);
 let revision=0,probe=0,controller=null,translator=null,ready='unsupported',busy=false;
 function stop(){
  revision++;
  controller?.abort();controller=null;
  translator?.destroy?.();translator=null;
  busy=false;
 }
 function paint(){
  const text=input.value;
  count.textContent=text.length+' / 5,000 characters';
  run.disabled=busy||!text.trim()||text.length>5000||
   !validPair(source.value,target.value)||!['available','downloadable','downloading'].includes(ready);
 }
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 function clear(){stop();output.value='';result.hidden=true;message('');paint();}
 async function inspect(){
  const id=++probe;
  clear();ready='checking';paint();
  if(!validPair(source.value,target.value)){
   availability.textContent='Choose two different languages.';ready='unavailable';paint();return;
  }
  availability.textContent='Checking local language support…';
  const next=await checkAvailability(api,source.value,target.value);
  if(id!==probe)return;
  ready=next;
  availability.textContent={
   available:'Ready: language model is installed in this browser.',
   downloadable:'Supported: your browser will download a language pack after you choose Translate.',
   downloading:'Supported: the browser is already downloading a language pack.',
   unsupported:'On-device translation is not available in this browser. No text will be sent to an online translator.',
   unavailable:'This language pair or device is not supported. Try another pair or browser.'
  }[next];
  paint();
 }
 function inputChanged(){clear();}
 input.addEventListener('input',inputChanged);
 source.addEventListener('change',()=>{void inspect();});
 target.addEventListener('change',()=>{void inspect();});
 swap.addEventListener('click',()=>{
  const left=source.value;source.value=target.value;target.value=left;
  void inspect();
 });
 form.addEventListener('reset',()=>{probe++;win.queueMicrotask(()=>{void inspect();});});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!api||!validPair(source.value,target.value)||!input.value.trim()||input.value.length>5000||
    !['available','downloadable','downloading'].includes(ready))return;
  stop();
  const id=revision;
  const text=input.value,sourceLanguage=source.value,targetLanguage=target.value;
  busy=true;output.value='';result.hidden=true;
  message(ready==='available'?'Translating on your device…':'Preparing language pack in your browser…');
  paint();
  controller=new AbortController();
  try{
   // Call create synchronously from the user submit gesture. Do NOT await
   // availability first, which can lose the required transient activation.
   const instancePromise=api.create({
    sourceLanguage,targetLanguage,signal:controller.signal,
    monitor(monitor){
     monitor.addEventListener('downloadprogress',event=>{
      if(id!==revision)return;
      const value=Number(event.loaded);
      if(Number.isFinite(value))message('Downloading language pack: '+Math.max(0,Math.min(100,Math.round(value*100)))+'%');
     });
    }
   });
   const instance=await instancePromise;
   if(id!==revision){instance.destroy?.();return;}
   translator=instance;
   const translated=await instance.translate(text,{signal:controller.signal});
   if(id!==revision)return;
   if(typeof translated!=='string')throw Error('invalid-result');
   output.value=translated;result.hidden=false;
   message('Translation complete. Review the result before using it.');
   win.dispatchEvent(new Event('yorphives:tool-completed'));
  }catch(error){
   if(id!==revision)return;
   const name=error?.name||'';
   message(name==='NotAllowedError'?
    'Your browser did not permit this language-pack download. Try clicking Translate again, or review its settings.':
    name==='NetworkError'?
    'The language pack is not downloaded yet. Connect to the internet and try again.':
    name==='AbortError'?'Translation cancelled.':
    'On-device translation could not run for this language pair. No online fallback was used.',true);
  }finally{
   if(id===revision){
    translator?.destroy?.();translator=null;controller=null;busy=false;paint();
   }
  }
 });
 copy.addEventListener('click',async()=>{
  if(result.hidden||!output.value)return;
  try{await win.navigator.clipboard.writeText(output.value);message('Translation copied.');}
  catch{output.focus();output.select();message('Select and copy using your keyboard.');}
 });
 void inspect();
 return {stop};
}
if(typeof document!=='undefined')bindTranslator();
