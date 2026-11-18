// Deterministic source-copy inventory for public marketing UI changes.
// This guards against *new* untranslated marketing strings appearing silently.
// Tools and product descriptions use the catalog-localization contract.
const decode=text=>text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27);/g,m=>({
 '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ',
 '&#39;':"'",'&#x27;':"'"
})[m]||m);
export function extractMarketingCopy(html){
 if(typeof html!=='string')throw TypeError('Expected HTML string');
 const visible=html
  .replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<(?:script|style|svg|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|svg|noscript|template)>/gi,' ')
  .replace(/<[^>]*>/g,'\n');
 const pieces=visible.split('\n').map(x=>decode(x).replace(/\s+/g,' ').trim());
 return [...new Set(pieces.filter(x=>x.length>=5&&x.length<=900&&/[\p{L}]{2,}/u.test(x)&&
  !/^https?:|^mailto:|^\d|^[\p{P}\p{S}\s]+$/u.test(x)))].sort();
}
export function newMarketingCopy({html,baseline,translations}){
 const current=extractMarketingCopy(html),old=new Set(baseline);
 const languages=['hi','es','fr','de','pt','ar','ja'];
 return current.filter(key=>!old.has(key)&&languages.some(lang=>
  !translations.some(pack=>typeof pack[key]?.[lang]==='string'&&pack[key][lang].trim().length>0)));
}
