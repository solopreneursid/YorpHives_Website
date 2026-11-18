// Provider-neutral catalog localization contract for future publications.
// New products/tools must include reviewed display copy in every advertised
// locale before they can be treated as multilingual. Never machine-infer copy.
export const PUBLIC_LOCALES=Object.freeze(['hi','es','fr','de','pt','ar','ja']);
const safeString=(value,max)=>typeof value==='string'&&value.trim().length>=2&&
 value.length<=max&&!/[<>\u0000-\u001f]/.test(value)&&!value.includes('\uFFFD');
const sameMeaning=(a,b)=>a===b||a.toLowerCase()===b.toLowerCase();
export function checkCatalogTranslation(item){
 if(!item||typeof item!=='object')return ['Invalid catalog item'];
 const errors=[];
 for(const lang of PUBLIC_LOCALES){
  const t=item.localizations?.[lang];
  if(!t||!safeString(t.name,200)||!safeString(t.description,900)){
   errors.push(lang+': name and description must have reviewed translations');
   continue;
  }
  if(!t.reviewed||!/^\d{4}-\d{2}-\d{2}$/.test(t.reviewedOn||'')){
   errors.push(lang+': translation needs explicit review and review date');
  }
 }
 return errors;
}
export function makeCatalogLocaleCopy(items){
 const copy=Object.create(null);
 for(const item of items){
  if(!item||typeof item.name!=='string'||typeof item.description!=='string')continue;
  if(checkCatalogTranslation(item).length)continue;
  for(const [english,field] of [[item.name,'name'],[item.description,'description']]){
   if(!copy[english])copy[english]={};
   for(const lang of PUBLIC_LOCALES){
    const translated=item.localizations[lang][field];
    const prior=copy[english][lang];
    if(prior&&prior!==translated)throw Error('Conflicting catalog translations for '+english+' / '+lang);
    copy[english][lang]=translated;
   }
  }
 }
 return copy;
}
export function catalogTranslationReport(items,{legacyUrls=[]}={}){
 const existing=new Set(legacyUrls),pending=[],ready=[];
 for(const item of items){
  const errors=checkCatalogTranslation(item);
  if(errors.length){
   pending.push({url:item.url,name:item.name,legacy:existing.has(item.url),missing:errors});
  }else ready.push({url:item.url,name:item.name});
 }
 return {schemaVersion:1,locales:PUBLIC_LOCALES,ready,pending};
}
