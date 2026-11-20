// Browser-only personal collections. No accounts, cookies, telemetry or uploads.
// Preserve the already-deployed saved-tools key so no visitor loses favourites.
import {SAVED_KEY,readSaved,toggleSaved} from './save-tool.mjs';
export const SPACE_EVENT='yorphives:personal-space';
const TOOL=/^tools\/[a-z0-9][a-z0-9-]*\/$/;
const PRODUCT=/^(?:[a-z0-9][a-z0-9-]*\/)+$/;
const config={
 tools:{saved:SAVED_KEY,recent:'yorphives-toolspace-recent-v1',valid:TOOL},
 products:{saved:'yorphives-my-products-saved-v1',recent:'yorphives-my-products-recent-v1',valid:PRODUCT}
};
export function productIdentity(item){
 return typeof item?.url==='string'&&PRODUCT.test(item.url)?item.url:'';
}
function readList(storage,key,valid){
 try{const value=JSON.parse(storage?.getItem(key)||'[]');
  return Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string'&&valid.test(x)))].slice(0,300):[];
 }catch{return []}
}
function write(storage,key,ids){
 try{if(typeof storage?.setItem!=='function')return false;storage.setItem(key,JSON.stringify(ids));return true}
 catch{return false}
}
export function readSpace(storage,kind,view='saved'){
 const c=config[kind];if(!c||!['saved','recent'].includes(view))return [];
 if(kind==='tools'&&view==='saved')return readSaved(storage);
 return readList(storage,c[view],c.valid);
}
export function toggleSpace(storage,kind,id){
 const c=config[kind];if(!c||!c.valid.test(id))return null;
 if(kind==='tools')return toggleSaved(storage,id);
 const prev=readSpace(storage,kind),has=prev.includes(id);
 return write(storage,c.saved,has?prev.filter(x=>x!==id):[...prev,id])?!has:null;
}
export function recordRecent(storage,kind,id){
 const c=config[kind];if(!c||!c.valid.test(id))return false;
 return write(storage,c.recent,[id,...readSpace(storage,kind,'recent').filter(x=>x!==id)].slice(0,30));
}
export function moveSaved(storage,kind,id,direction){
 const c=config[kind],ids=readSpace(storage,kind);
 if(!c||!c.valid.test(id)||![-1,1].includes(direction))return false;
 const i=ids.indexOf(id),j=i+direction;
 if(i<0||j<0||j>=ids.length)return false;
 [ids[i],ids[j]]=[ids[j],ids[i]];
 return write(storage,c.saved,ids);
}
export function notifySpace(win){if(win?.dispatchEvent)win.dispatchEvent(new Event(SPACE_EVENT))}
export function isSpaceKey(key){return key===null||Object.values(config).some(c=>key===c.saved||key===c.recent)}
