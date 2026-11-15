// One directory renderer shared by source generators and production builds.
// Categories and counts always come from catalog.json, not hard-coded page markup.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderToolSections(items){
 const groups=new Map();
 for(const tool of items.filter(x=>x.type==='tool')){
  const category=String(tool.category||'Other').trim()||'Other';
  if(!groups.has(category))groups.set(category,[]);
  groups.get(category).push(tool);
 }
 return [...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([category,tools])=>{
  tools.sort((a,b)=>a.name.localeCompare(b.name));
  const cards=tools.map(tool=>
   '<a class="directory-card" href="../'+esc(tool.url)+'"><strong>'+esc(tool.name)+
   '</strong><span>'+esc(tool.description)+'</span></a>').join('');
  const total=tools.length;
  return '<details class="directory-section"><summary><span>'+esc(category)+'</span><small>'+
    total+' '+(total===1?'tool':'tools')+
    '</small><span class="directory-chevron" aria-hidden="true">⌄</span></summary>'+
    '<div class="directory-grid">'+cards+'</div></details>';
 }).join('');
}
export function updateToolDirectory(markup,items){
 const start='<!-- TOOL_DIRECTORY_START -->',end='<!-- TOOL_DIRECTORY_END -->';
 const before=markup.indexOf(start),after=markup.indexOf(end,before+start.length);
 if(before<0||after<before)throw Error('The tool directory is missing stable category markers.');
 return markup.slice(0,before+start.length)+renderToolSections(items)+markup.slice(after);
}
