/* Preview-only acceptance: inject a fake catalogue in the browser to test UI synchronization.
 * The fixture never changes real catalog.json or production data. */
import {refreshCatalog} from './catalog-sync.mjs';
const output=document.createElement('pre');
output.id='catalog-sync-qa';output.dataset.status='running';
output.style.cssText='position:fixed;z-index:100000;top:74px;left:10px;max-height:55vh;overflow:auto;max-width:calc(100vw - 20px);padding:13px;background:#062719;color:#b0ffd0;border:1px solid #73cca0;border-radius:10px;font:11px/1.5 monospace;white-space:pre-wrap';
document.body.append(output);
const results=[];const ok=(condition,message)=>{if(!condition)throw Error(message);results.push(message)};
const wait=async(fn)=>{for(let i=0;i<90;i++){if(fn())return;await new Promise(r=>setTimeout(r,90))}throw Error('timeout waiting for catalogue')};
const fetchReal=window.fetch.bind(window);let fixture=null;
try{
 await wait(()=>document.getElementById('tools-count-big').textContent==='143');
 const initial=await fetchReal('../catalog.json',{cache:'no-store'});
 ok(initial.ok,'real published catalogue available');
 const source=await initial.json();
 ok(source.items.length>=143,'base catalogue contains public tools');
 fixture={...source,items:[...source.items,{
  type:'tool',published:true,visibility:'public',name:'Preview Sync QA Utility',
  description:'A browser-only temporary test to verify real-time UI refresh.',
  date:'2026-11-16',url:'tools/preview-sync-qa-utility/',category:'New Sync Category'}]};
 window.fetch=async (input,opts)=>{
  if(String(input).includes('catalog.json'))return new Response(JSON.stringify(fixture),{status:200,headers:{'Content-Type':'application/json'}});
  return fetchReal(input,opts);
 };
 await refreshCatalog({force:true});
 ok(document.getElementById('tools-count-big').textContent==='144','new tool increments visible count');
 ok(document.getElementById('impact-tools').textContent==='144','new tool increments Impact count');
 ok([...document.querySelectorAll('#tool-categories [data-cat]')].some(x=>x.dataset.cat==='New Sync Category'),'new category automatically added to filters');
 ok([...document.querySelectorAll('.tool-card h3')].some(x=>x.textContent==='Preview Sync QA Utility'),'newly added tool appears in sorted library');
 ok(document.getElementById('yh-pulse-item').classList.contains('is-placeholder'),'no false most-used claim for new tool');
 const modified={...fixture,items:fixture.items.map(x=>x.name==='Preview Sync QA Utility'?{...x,category:'Updated Sync Category',name:'Renamed Preview Utility'}:x)};
 fixture=modified;
 await refreshCatalog({force:true});
 ok([...document.querySelectorAll('#tool-categories [data-cat]')].some(x=>x.dataset.cat==='Updated Sync Category'),'renamed tool/category appears automatically');
 ok(![...document.querySelectorAll('#tool-categories [data-cat]')].some(x=>x.dataset.cat==='New Sync Category'),'retired category removed automatically');
 fixture=source;
 await refreshCatalog({force:true});
 ok(document.getElementById('tools-count-big').textContent==='143','removed test tool disappears and count returns to 143');
 ok(![...document.querySelectorAll('#tool-categories [data-cat]')].some(x=>x.dataset.cat==='Updated Sync Category'),'removed category no longer appears');
 output.dataset.status='passed';output.textContent='CATALOG SYNC QA: '+results.length+' PASS\n'+results.join('\n');
}catch(error){output.dataset.status='failed';output.textContent='CATALOG SYNC QA FAILED: '+error.message+'\n'+results.join('\n');throw error;}
finally{window.fetch=fetchReal;}