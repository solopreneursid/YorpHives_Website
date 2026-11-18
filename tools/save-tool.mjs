// Optional local-only saved-tool control. Shared with the homepage saved list.
// No account, cookies, analytics, external requests, or file/input persistence.
export const SAVED_KEY='yorphives-studio-saved-v1';
const ROUTE=/^tools\/[a-z0-9][a-z0-9-]*\/$/;
export function readSaved(storage){
 try{const value=JSON.parse(storage?.getItem(SAVED_KEY)||'[]');
  return Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string'&&ROUTE.test(x)))]:[];
 }catch{return [];}
}
export function toggleSaved(storage,route){
 if(!ROUTE.test(route))return null;
 const items=new Set(readSaved(storage));
 if(items.has(route))items.delete(route);else items.add(route);
 try{storage?.setItem(SAVED_KEY,JSON.stringify([...items]));return items.has(route);}
 catch{return null;}
}
export function bindSavedTool(doc=globalThis.document,win=globalThis.window){
 const button=doc?.querySelector('[data-save-tool]');
 if(!button||!win)return;
 const route=button.getAttribute('data-save-tool');
 if(!ROUTE.test(route))return;
 const label=button.getAttribute('data-tool-name')||'this tool';
 function storage(){try{return win.localStorage}catch{return null}}
 function render(){
  const on=readSaved(storage()).includes(route);
  button.setAttribute('aria-pressed',String(on));
  button.textContent=on?'♥ Saved tool':'♡ Save this tool';
  button.setAttribute('aria-label',(on?'Remove from saved tools: ':'Save tool: ')+label);
 }
 button.addEventListener('click',()=>{
  const result=toggleSaved(storage(),route);
  if(result===null){button.textContent='Saving is unavailable in this browser';return;}
  render();
 });
 win.addEventListener('storage',event=>{if(event.key===SAVED_KEY)render()});
 render();
}
if(typeof document!=='undefined')bindSavedTool();
