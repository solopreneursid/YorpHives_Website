// YorpHives Tool Suite: additive UI enhancements only. Existing tool processing remains untouched.
const root=document.body;
if(root?.classList.contains('tool-page')&&root.dataset.tuiFamily){
 const panel=document.querySelector('.tool-panel .panel-content');
 const form=panel?.querySelector('form');
 const family=root.dataset.tuiFamily;
 const category=root.dataset.tuiCategory||'Tools';
 const el=(tag,cls,txt)=>{
  const item=document.createElement(tag);if(cls)item.className=cls;if(txt!==undefined)item.textContent=txt;return item;
 };
 function head(title,hint,number='01'){
  const box=el('div','tui-workspace-head');
  const badge=el('span','tui-workspace-number',number);badge.setAttribute('aria-hidden','true');
  const content=el('div','tui-workspace-copy');
  content.append(el('strong','tui-workspace-title',title),el('span','tui-workspace-hint',hint));
  box.append(badge,content);return box;
 }
 if(panel){
  const picker=panel.querySelector('input[type="file"]');
  const titles=picker?
   [picker.multiple?'Choose your files':'Choose your file','Select a file and prepare your output']:
   family==='json'?['Your JSON workspace','Edit, format and export JSON privately']:
   family==='image'?['Choose an image','Prepare your image before resizing']:
   category==='Calculators'?['Enter your values','Adjust the numbers, then calculate your result']:
   category==='Business'?['Create your document','Fill out the details to generate your document']:
   category==='Writing'?['Write or paste your text','Type your content and choose how to transform it']:
   category==='Design'?['Customize your design','Set your options to create a visual result']:
   category==='Marketing'?['Set up your details','Provide the information needed for your result']:
   category==='Security'?['Choose your settings','Configure the secure result you want to create']:
   category==='Creator'?['Create your content','Enter the details for your result']:
   ['Enter your input','Paste your content or choose the options below'];
  const heading=head(...titles);
  const first=form||panel.querySelector('.tool-fields,.file-box,.utility-inputs');
  if(first)panel.insertBefore(heading,first);
  else panel.prepend(heading);
 }
 // File tools: enhance existing labels without replacing <input> or changing its id/name.
 for(const input of [...(form?.querySelectorAll('label.tool-field>input[type="file"]')||[])]){
  const label=input.parentElement;
  if(label.classList.contains('tui-upload-zone'))continue;
  const original=[...label.childNodes].filter(x=>x.nodeType===Node.TEXT_NODE).map(x=>x.textContent).join(' ').trim()||'Choose your file';
  for(const node of [...label.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
  const ico=el('span','tui-upload-icon');
  ico.setAttribute('aria-hidden','true');
  ico.innerHTML='<svg viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h12l7 7v19a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" stroke="currentColor" stroke-width="1.7"/><path d="M18 2v8h7M9 17h10M9 22h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const title=el('strong','tui-upload-title',original);
  const subtitle=el('span','tui-upload-subtitle',input.multiple?'Browse or drop your files here':'Browse or drop a file here');
  label.classList.add('tui-upload-zone');
  label.insertBefore(ico,input);
  label.insertBefore(title,input);
  label.insertBefore(subtitle,input);
  input.setAttribute('aria-label',original);
  const update=()=>{
   const files=[...(input.files||[])];
   title.textContent=files.length===1?files[0].name:files.length>1?files.length+' files selected':original;
   subtitle.textContent=files.length===1?(files[0].size/1048576).toFixed(2)+' MB · Stored only on this device':files.length>1?'Ready to process privately':input.multiple?'Browse or drop your files here':'Browse or drop a file here';
  };
  input.addEventListener('change',update);
  form?.addEventListener('reset',()=>setTimeout(update,0));
  for(const type of ['dragenter','dragover'])label.addEventListener(type,event=>{
   if(!event.dataTransfer?.types?.includes('Files'))return;
   event.preventDefault();label.classList.add('tui-drag-active');
  });
  for(const type of ['dragleave','drop'])label.addEventListener(type,event=>{event.preventDefault();label.classList.remove('tui-drag-active');});
  label.addEventListener('drop',event=>{
   const files=[...(event.dataTransfer?.files||[])];
   if(!files.length)return;
   const incoming=input.multiple?files:[files[0]];
   const tokens=input.accept.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
   const accepts=file=>!tokens.length||tokens.some(token=>
    token.startsWith('.')?file.name.toLowerCase().endsWith(token):
    token.endsWith('/*')?file.type.toLowerCase().startsWith(token.slice(0,-1)):
    file.type.toLowerCase()===token);
   if(incoming.some(file=>!accepts(file))){
    const status=form?.querySelector('[role="status"]');
    if(status){status.textContent='Unsupported file format. Choose one of the accepted file types.';status.classList.add('error');}
    return;
   }
   if(typeof DataTransfer!=='function')return;
   const transfer=new DataTransfer();
   incoming.forEach(file=>transfer.items.add(file));
   input.files=transfer.files;
   input.dispatchEvent(new Event('change',{bubbles:true}));
  });
 }
 // Label option groups. Empty ones remain hidden, as does the tool's original file list.
 const options=form?.querySelector('.utility-inputs:not(:empty)');
 if(options&&form?.querySelector('input[type="file"]')&&options.querySelector('input,select,textarea')){
  const label=el('div','tui-options-head');label.append(el('span',null,'Adjust settings'));
  options.parentElement.insertBefore(label,options);
 }
 // Give existing result containers a clear, consistent visual success state.
 const result=panel?.querySelector('#utility-result,#file-result,#wave1-result,#image-result');
 if(result){
  result.classList.add('tui-result-panel');
  const header=el('div','tui-result-head');
  const check=el('span','tui-result-symbol','✓');check.setAttribute('aria-hidden','true');
  const content=el('div','tui-result-copy');
  content.append(el('strong',null,'Your result is ready'),el('small',null,'Prepared locally in your browser'));
  header.append(check,content);
  result.prepend(header);
 }
 const statuses=panel?.querySelectorAll('.tool-status[role="status"]')||[];
 statuses.forEach(status=>status.classList.add('tui-status'));
 // The specialized image resizer uses a sibling label/input inside a separate file box.
 const resizer=panel?.querySelector('.file-box');
 if(resizer&&family==='image')resizer.classList.add('tui-image-drop');
}
