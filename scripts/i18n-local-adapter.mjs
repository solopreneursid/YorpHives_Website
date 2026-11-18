// Local-only machine translation draft adapter.
// Can connect to a self-hosted LibreTranslate/Argos-compatible endpoint.
// Drafts are NOT review/launch approvals and never edit catalog.json.
import {PUBLIC_LOCALES} from '../catalog-localization.mjs';
export function localTranslationEndpoint(value='http://127.0.0.1:5000/translate'){
 const url=new URL(value);
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||
    url.username||url.password||url.search||url.hash)
  throw Error('Only an unauthenticated local self-hosted HTTP translation endpoint is allowed');
 return url.href;
}
export function catalogDraftJobs(items,legacyContent={}){
 const jobs=[];
 for(const item of items){
  if(!item||typeof item.url!=='string'||typeof item.name!=='string'||typeof item.description!=='string')continue;
  const old=legacyContent[item.url];
  const needsUpdate=old?.name!==item.name||old?.description!==item.description;
  if(!needsUpdate&&!item.localizations)continue; // Existing unchanged English tools stay live.
  for(const language of PUBLIC_LOCALES){
   const translated=item.localizations?.[language];
   for(const field of ['name','description']){
    if(typeof translated?.[field]==='string'&&translated[field].trim())continue;
    jobs.push({url:item.url,language,field,text:item[field]});
   }
  }
 }
 return jobs;
}
export async function runLocalDrafts({jobs,endpoint=localTranslationEndpoint(),translate=fetch}){
 const result=[];
 for(const job of jobs){
  const response=await translate(endpoint,{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({q:job.text,source:'en',target:job.language,format:'text'}),
   signal:AbortSignal.timeout(30000)
  });
  if(!response.ok)throw Error('Local translator failed with HTTP '+response.status);
  const answer=await response.json();
  if(typeof answer.translatedText!=='string'||!answer.translatedText.trim())
   throw Error('Local translator returned no text for '+job.url+' '+job.language);
  result.push({...job,suggestion:answer.translatedText.trim(),reviewed:false});
 }
 return result;
}
