/* Website-wide language accessibility: one progressive, non-invasive layer.
 * Browser-owned models only, no text or files sent to YorpHives/third parties.
 * English remains the stable, fully readable canonical source of every page.
 */
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
 ['Browse all tools',['सभी टूल देखें','Explorar herramientas','Voir tous les outils','Alle Tools ansehen','Explorar ferramentas','تصفح الأدوات','すべてのツールを見る']],
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
function translatable(node){
 if(!node||node.nodeType!==3||!node.nodeValue?.trim()||node.nodeValue.trim().length>650)return false;
 const parent=node.parentElement;
 if(!parent||parent.closest('#yh-language-picker,[translate="no"],.notranslate,[contenteditable],textarea,select,option,button,pre,code,script,style,svg,canvas,video,audio,.tui-upload-zone,.file-box,.utility-preview,#utility-result,#file-result,[id$="-result"],[id$="-output"],[class*="result-panel"],.tool-status,[aria-live]'))return false;
 if(parent.closest('form')&& !parent.closest('label'))return false;
 if(parent.closest('[hidden]'))return false;
 return true;
}
export function bindPageLanguages(doc=globalThis.document,win=globalThis.window){
 const root=doc?.getElementById('yh-language-picker');
 if(!root||!win)return;
 const select=root.querySelector('select'),button=root.querySelector('button');
 const note=root.querySelector('[role="status"]');
 const native=nativeTranslator(win),saved=new Map(),instance={value:null};
 let current='en',epoch=0,processing=false;
 function readPreference(){
  try{const language=win.localStorage?.getItem(KEY);
   return LANGUAGES.some(([code])=>code===language)?language:'en';}catch{return 'en';}
 }
 function setStatus(text){note.textContent=text;}
 function restore(){
  for(const [node,text] of saved)if(node.isConnected)node.nodeValue=text;
  saved.clear();doc.documentElement.lang='en';doc.documentElement.removeAttribute('dir');
 }
 function reset(){
  epoch++;restore();instance.value?.destroy?.();instance.value=null;processing=false;
  button.disabled=false;button.hidden=false;
 }
 function essential(lang){
  if(lang==='en')return;
  // Small offline glossary; full-page content is never falsely marked as translated.
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
   if(!translatable(node))continue;
   const before=node.nodeValue,localized=localizedLabel(before.trim(),lang);
   if(localized){saved.set(node,before);node.nodeValue=before.replace(before.trim(),localized);}
  }
 }
 function chosen(code){
  current=code;
  try{win.localStorage?.setItem(KEY,code)}catch{}
  reset();
  select.value=code;
  if(code==='en'){button.hidden=true;setStatus('');return;}
  essential(code);
  button.textContent='Translate page';
  if(!native){
   button.hidden=true;
   setStatus('Key navigation labels translated. For the full page, use your browser’s Translate page feature. On-device automatic translation is not available here.');
  }else{
   setStatus('Key navigation labels translated. Choose Translate page to translate more content on this device. Your browser may download a language pack.');
  }
 }
 select.addEventListener('change',()=>chosen(select.value));
 button.addEventListener('click',async()=>{
  if(current==='en'||!native||processing)return;
  // Browser API creation is called inside the user gesture; an initial pack
  // download can require this activation. Never await an availability probe.
  const target=current,token=++epoch;processing=true;button.disabled=true;
  let translator;
  try{
   translator=await native.create({sourceLanguage:'en',targetLanguage:target,
    monitor(m){m.addEventListener('downloadprogress',e=>{
     if(token===epoch&&Number.isFinite(e.loaded))
      setStatus('Preparing an on-device language pack: '+Math.round(e.loaded*100)+'%');
    });}});
   if(token!==epoch){translator.destroy?.();return;}
   instance.value=translator;
   setStatus('Translating visible website content on this device…');
   // Only translate public page text. Never access textarea/input values,
   // user documents, tool outputs, hidden/private controls, or form data.
   const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
   const textNodes=[];
   for(let n=walker.nextNode();n;n=walker.nextNode()){
    if(translatable(n)&&!saved.has(n))textNodes.push(n);
    if(textNodes.length>=180)break; // bounded interaction; no model abuse
   }
   let translated=0;
   for(const node of textNodes){
    if(token!==epoch)break;
    const original=node.nodeValue;
    try{
     const output=await translator.translate(original);
     if(token!==epoch)break;
     if(typeof output==='string'&&output.trim()){
      saved.set(node,original);node.nodeValue=output;translated++;
     }
    }catch{/* One unsupported fragment must not break other page content. */}
   }
   if(token!==epoch)return;
   if(translated)doc.documentElement.lang=target;
   if(target==='ar'&&translated)doc.documentElement.dir='rtl';
   setStatus(translated?
    'Translated '+translated+' website text sections on this device. Dynamic content and tool results stay in English.':
    'No additional sections could be translated for this language. Use your browser’s built-in page translation.');
  }catch(error){
   if(token===epoch)setStatus('On-device page translation unavailable for this language or browser. Use the browser’s Translate page command; your text was not sent by YorpHives.');
  }finally{
   if(token===epoch){processing=false;button.disabled=false;button.textContent='Translate again';}
   if(token!==epoch)translator?.destroy?.();
  }
 });
 chosen(readPreference());
 win.addEventListener('hashchange',()=>{if(current!=='en')essential(current);});
 return {choose:chosen,restore};
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>bindPageLanguages(),{once:true});
 else bindPageLanguages();
}
