/* First-party multilingual website shell.
 * A compact header control, substantive bundled page-copy translations, and
 * optional browser-owned translation of remaining public text on user action.
 * No text, tool inputs, files or outputs are transmitted by YorpHives.
 */
import {getLocalCopy} from './site-language-copy.mjs';
import {getToolCopy} from './site-tool-copy.mjs';
import {getSectionCopy} from './site-section-copy.mjs';
export const LANGUAGES=Object.freeze([
 ['en','English'],['hi','हिन्दी'],['es','Español'],['fr','Français'],
 ['de','Deutsch'],['pt','Português'],['ar','العربية'],['ja','日本語']
]);
const KEY='yorphives-page-language-v1';
const BASE=new Map([
 ['Home',['होम','Inicio','Accueil','Startseite','Início','الرئيسية','ホーム']],
 ['Free tools',['मुफ़्त टूल','Herramientas gratis','Outils gratuits','Kostenlose Tools','Ferramentas gratuitas','أدوات مجانية','無料ツール']],
 ['All free tools',['सभी मुफ़्त टूल','Todas las herramientas','Tous les outils gratuits','Alle kostenlosen Tools','Todas as ferramentas','كل الأدوات المجانية','すべての無料ツール']],
 ['HQventures',['HQventures','HQventures','HQventures','HQventures','HQventures','HQventures','HQventures']],
 ['Builders',['निर्माता','Creadores','Créateurs','Entwickler','Criadores','البناؤون','ビルダー']],
 ['Partnerships',['साझेदारियाँ','Alianzas','Partenariats','Partnerschaften','Parcerias','الشراكات','パートナーシップ']],
 ['Contact',['संपर्क','Contacto','Contact','Kontakt','Contato','اتصل بنا','お問い合わせ']],
 ['Browse all tools',['सभी टूल देखें','Explorar herramientas','Voir tous les outils','Alle Tools ansehen','Explorar ferramentas','تصفح الأدوات','すべての無料ツールを見る']],
 ['Save this tool',['टूल सहेजें','Guardar herramienta','Enregistrer cet outil','Tool speichern','Salvar ferramenta','حفظ الأداة','ツールを保存']],
 ['Browse by category below.',['नीचे श्रेणी के अनुसार देखें।','Explora por categoría.','Parcourez les catégories.','Nach Kategorie stöbern.','Explore por categoria.','تصفح حسب الفئة.','カテゴリから探す。']],
 ['Search free tools',['मुफ़्त टूल खोजें','Buscar herramientas','Rechercher des outils','Tools suchen','Buscar ferramentas','البحث عن أدوات','無料ツールを検索']],
 ['Copy result',['परिणाम कॉपी करें','Copiar resultado','Copier le résultat','Ergebnis kopieren','Copiar resultado','نسخ النتيجة','結果をコピー']]
]);
export function localizedLabel(english,lang){
 const idx=LANGUAGES.findIndex(([key])=>key===lang);
 return idx<=0?null:BASE.get(english)?.[idx-1]||null;
}
export function nativeTranslator(win=globalThis){
 const t=win?.Translator;
 return t&&typeof t.availability==='function'&&typeof t.create==='function'?t:null;
}
function translatable(node,{controls=false}={}){
 if(!node||node.nodeType!==3||!node.nodeValue?.trim()||node.nodeValue.trim().length>650)return false;
 const parent=node.parentElement;
 if(!parent||parent.closest('#yh-language-picker,[translate="no"],.notranslate,[contenteditable],textarea,input,select,option,pre,code,script,style,svg,canvas,video,audio,.tui-upload-zone,.file-box,.utility-preview,#utility-result,#file-result,[id$="-result"],[id$="-output"],[class*="result-panel"],.tool-status,[aria-live]'))return false;
 if(parent.closest('button')&&!controls)return false;
 if(parent.closest('form')&&!parent.closest('label')&&!parent.closest('button'))return false;
 if(parent.closest('[hidden]'))return false;
 return true;
}
export function bindPageLanguages(doc=globalThis.document,win=globalThis.window){
 const root=doc?.getElementById('yh-language-picker');
 if(!root||!win)return;
 const header=doc.querySelector('.topbar .header-actions,.site-header .header-actions,.site-header .nav-actions,.site-header,header.site-header');
 if(header)header.append(root);
 else root.classList.add('yh-language-fallback');
 const toggle=root.querySelector('[data-language-toggle]');
 const panel=root.querySelector('[data-language-panel]');
 const select=root.querySelector('select');
 const translateButton=root.querySelector('[data-language-translate]');
 const note=root.querySelector('[role="status"]');
 const native=nativeTranslator(win);
 const saved=new Map(),savedAttributes=new Map(),instance={value:null};
 let current='en',epoch=0,processing=false,observer=null,refreshTimer=null;
 function setStatus(text){note.textContent=text;}
 function readPreference(){
  try{const language=win.localStorage?.getItem(KEY);
   return LANGUAGES.some(([code])=>code===language)?language:'en';}catch{return 'en';}
 }
 function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
 function open(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');select.focus();}
 function restore(){
  for(const [node,text] of saved)if(node.isConnected)node.nodeValue=text;
  saved.clear();
  for(const [element,attrs] of savedAttributes){
   if(!element.isConnected)continue;
   for(const [name,original] of attrs){
    if(original===null)element.removeAttribute(name);
    else element.setAttribute(name,original);
   }
  }
  savedAttributes.clear();
  doc.documentElement.lang='en';doc.documentElement.removeAttribute('dir');
 }
 function reset(){
  epoch++;restore();instance.value?.destroy?.();instance.value=null;processing=false;
  translateButton.disabled=false;translateButton.hidden=true;
 }
 function localized(english,language){return getLocalCopy(english,language)||getToolCopy(english,language)||getSectionCopy(english,language)||localizedLabel(english,language);}
 function essential(language=current){
  if(language==='en')return 0;
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
  let changed=0;
  for(let node=walker.nextNode();node;node=walker.nextNode()){
   if(!translatable(node,{controls:true}))continue;
   const before=node.nodeValue;
   const original=saved.get(node)||before;
   // If a reactive component has replaced this node's text, treat it as new
   // source content rather than restoring a stale previous render.
   if(saved.has(node)&&before!==original){
    const translated=localized(original,language);
    if(translated&&before.trim()===translated)continue;
    saved.delete(node);
   }
   const fresh=saved.get(node)||before;
   const translation=localized(fresh.trim(),language);
   if(!translation||translation===fresh.trim())continue;
   saved.set(node,fresh);
   node.nodeValue=fresh.replace(fresh.trim(),translation);
   changed++;
  }
  // Translate only curated, fixed-value attributes. Never inspect input
  // values, file contents, editable fields, tool results or user documents.
  for(const element of doc.querySelectorAll('[placeholder],[aria-label],[title]')){
   if(element.closest('#yh-language-picker,[translate="no"],.notranslate,[contenteditable],[id$="-result"],[id$="-output"],.utility-preview,[class*="result-panel"]'))continue;
   for(const name of ['placeholder','aria-label','title']){
    if(!element.hasAttribute(name))continue;
    const before=element.getAttribute(name);
    const translation=localized(before,language);
    if(!translation||translation===before)continue;
    if(!savedAttributes.has(element))savedAttributes.set(element,new Map());
    const originals=savedAttributes.get(element);
    if(!originals.has(name))originals.set(name,before);
    element.setAttribute(name,translation);changed++;
   }
  }
  // Native select option labels are visible UI, but their values are
  // application data. Set only label attributes and preserve original text
  // so select.value and form submission semantics never change.
  for(const option of doc.querySelectorAll('select option')){
   if(option.closest('#yh-language-picker,[translate="no"],[contenteditable]'))continue;
   const original=option.textContent.trim();
   const translation=localized(original,language);
   if(!translation||translation===original)continue;
   if(!savedAttributes.has(option))savedAttributes.set(option,new Map());
   const attrs=savedAttributes.get(option);
   if(!attrs.has('label'))attrs.set('label',option.getAttribute('label'));
   option.setAttribute('label',translation);
   changed++;
  }
  return changed;
 }
 function updateControl(){
  const label=LANGUAGES.find(([code])=>code===current)?.[1]||'English';
  toggle.querySelector('[data-language-short]').textContent=current.toUpperCase();
  toggle.setAttribute('aria-label','Website language: '+label+'. Change language');
  select.value=current;
 }
 function chosen(code){
  if(!LANGUAGES.some(([value])=>value===code))return;
  current=code;
  try{win.localStorage?.setItem(KEY,code)}catch{}
  reset();updateControl();
  if(code==='en'){setStatus('English original restored.');return;}
  const changed=essential(code);
  if(changed)doc.documentElement.lang=code;
  if(code==='ar'&&changed)doc.documentElement.dir='rtl';
  translateButton.hidden=!native;
  setStatus(changed?
   'Website text translated where a first-party translation is available. Some tool instructions remain in English.':
   'No reviewed translation for this page yet. Use your browser’s built-in Translate page command.');
  if(native)setStatus(note.textContent+' You can optionally translate remaining public text using your browser’s on-device model.');
 }
 toggle.addEventListener('click',()=>panel.hidden?open():close());
 root.querySelector('[data-language-close]').addEventListener('click',()=>{close();toggle.focus()});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){close();toggle.focus()}});
 doc.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close()});
 select.addEventListener('change',()=>{chosen(select.value);close();toggle.focus()});
 translateButton.addEventListener('click',async()=>{
  if(current==='en'||!native||processing)return;
  const target=current,token=++epoch;processing=true;translateButton.disabled=true;
  let translator;
  try{
   // Keep browser model creation in the click gesture (first pack download).
   translator=await native.create({sourceLanguage:'en',targetLanguage:target,
    monitor(m){m.addEventListener('downloadprogress',e=>{
     if(token===epoch&&Number.isFinite(e.loaded))
      setStatus('Preparing the optional on-device language pack: '+Math.round(e.loaded*100)+'%');
    });}});
   if(token!==epoch){translator.destroy?.();return;}
   instance.value=translator;
   setStatus('Translating remaining public page content on this device…');
   const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT),nodes=[];
   for(let n=walker.nextNode();n;n=walker.nextNode()){
    if(translatable(n)&&!saved.has(n))nodes.push(n);
    if(nodes.length>=180)break;
   }
   let translated=0;
   for(const node of nodes){
    if(token!==epoch)break;
    const original=node.nodeValue;
    try{
     const output=await translator.translate(original);
     if(token!==epoch)break;
     if(typeof output==='string'&&output.trim()){
      saved.set(node,original);node.nodeValue=output;translated++;
     }
    }catch{/* Browser model may reject individual fragments or unsupported pairs. */}
   }
   if(token!==epoch)return;
   if(translated)doc.documentElement.lang=target;
   if(target==='ar'&&translated)doc.documentElement.dir='rtl';
   setStatus(translated?'Translated '+translated+' additional public text sections on this device. Tool inputs and results remain untouched.':
    'This browser could not translate more sections. Try the browser’s Translate page feature.');
  }catch{
   if(token===epoch)setStatus('On-device translation is unavailable for this browser or language. Use the browser’s Translate page command instead.');
  }finally{
   if(token===epoch){processing=false;translateButton.disabled=false;}
   if(token!==epoch)translator?.destroy?.();
  }
 });
 chosen(readPreference());
 // Support single-page hash views, tool directories and catalog cards that
 // render after initial page load, without translating user-created content.
 const queue=()=>{
  if(current==='en'||refreshTimer)return;
  refreshTimer=win.setTimeout(()=>{
   refreshTimer=null;
   if(current==='en')return;
   essential();
  },90);
 };
 win.addEventListener('hashchange',queue);
 observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>
   (m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1||n.nodeType===3))||
   (m.type==='attributes'&&m.attributeName==='hidden')||
   (m.type==='characterData'&&!saved.has(m.target))
  ))queue();
 });
 const target=doc.querySelector('main')||doc.body;
 observer.observe(target,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden'],characterData:true});
 return {choose:chosen,restore,close,disconnect:()=>observer?.disconnect()};
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>bindPageLanguages(),{once:true});
 else bindPageLanguages();
}
