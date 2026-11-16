/* One source of truth for the public tool catalogue across YorpHives pages.
 * Lightweight, first-party, provider-neutral. No telemetry or private data.
 * Static preview updates become visible when the Cloudflare branch alias moves
 * to the latest successful build; an already-open page refreshes while active.
 */
const listeners=new Set();
const CHECK_INTERVAL_MS=180_000;
const RECHECK_MIN_MS=60_000;
let items=null,raw='',inflight=null,lastChecked=0,started=false;

export function subscribeCatalog(listener){
 if(typeof listener!=='function')throw new TypeError('Catalog listener must be a function');
 listeners.add(listener);
 if(items)listener(items);
 return ()=>listeners.delete(listener);
}

export async function refreshCatalog({force=false}={}){
 if(inflight)return inflight;
 if(!force&&items&&Date.now()-lastChecked<RECHECK_MIN_MS)return items;
 inflight=(async()=>{
  const response=await fetch('../catalog.json',{cache:'no-store'});
  if(!response.ok)throw Error('Public tool catalogue unavailable');
  const body=await response.text();
  const parsed=JSON.parse(body);
  if(!Array.isArray(parsed?.items))throw Error('Invalid public tool catalogue');
  lastChecked=Date.now();
  if(raw!==body){
   raw=body;
   items=parsed.items;
   for(const listener of listeners){
    try{listener(items);}catch(error){console.error('YorpHives catalog update failed',error)}
   }
  }
  return items;
 })().finally(()=>{inflight=null});
 return inflight;
}

export const getCatalog=()=>items?Promise.resolve(items):refreshCatalog({force:true});

export function startCatalogMonitoring(){
 if(started||typeof document==='undefined'||typeof window==='undefined')return;
 started=true;
 const update=()=>{if(!document.hidden)void refreshCatalog().catch(()=>{})};
 window.setInterval(update,CHECK_INTERVAL_MS);
 window.addEventListener('focus',update);
 window.addEventListener('online',update);
 document.addEventListener('visibilitychange',update);
 window.addEventListener('hashchange',update);
}