// Preview-only: rendered/computed browser QA for shared, real tool interfaces.
const pre=document.createElement('pre');pre.id='tool-suite-qa';pre.dataset.status='running';document.body.append(pre);
const checks=[];
const verify=(name,value,detail={})=>{checks.push({name,ok:!!value,...detail});if(!value)throw Error(name+' '+JSON.stringify(detail));};
try{
 const body=document.body,panel=document.querySelector('.tool-panel'),content=panel?.querySelector('.panel-content');
 const css=[...document.styleSheets].find(x=>x.href?.includes('/tool-suite-v1.css'));
 verify('versioned stylesheet loaded',!!css&&!!body.dataset.tuiFamily);
 const heading=content?.querySelector('.tui-workspace-head');
 verify('clear workspace heading',!!heading&&getComputedStyle(heading).display==='flex');
 verify('panel looks like card',parseFloat(getComputedStyle(panel).borderRadius)>=14,{radius:getComputedStyle(panel).borderRadius});
 const buttons=[...content.querySelectorAll('.tool-btn')];
 verify('action buttons have consistent styling',buttons.length>0&&buttons.every(x=>parseFloat(getComputedStyle(x).borderRadius)>=8),{buttons:buttons.length});
 const picker=content.querySelector('label.tool-field>input[type=file]');
 if(picker&&body.dataset.tuiFamily!=='image'){
  const label=picker.parentElement,style=getComputedStyle(label);
  verify('real file dropzone styled',label.classList.contains('tui-upload-zone')&&style.display==='flex'&&style.borderStyle==='dashed',{display:style.display,border:style.borderStyle});
  verify('file control keyboard accessible and labeled',picker.getAttribute('aria-label')&&getComputedStyle(picker).opacity==='0');
 }
 const result=content.querySelector('#utility-result,#file-result,#wave1-result,#image-result');
 if(result)verify('proper result panel',result.classList.contains('tui-result-panel')&&!!result.querySelector('.tui-result-head'));
 const status=content.querySelector('.tool-status[role=status]');
 if(status)verify('readable status feedback',status.classList.contains('tui-status'));
 const inputs=content.querySelector('.utility-inputs');
 if(inputs&&getComputedStyle(inputs).display==='grid'&&innerWidth<681){
  verify('inputs fit narrow mobile',getComputedStyle(inputs).gridTemplateColumns.split(' ').length===1,{columns:getComputedStyle(inputs).gridTemplateColumns});
 }
 const panelRect=panel.getBoundingClientRect();
 verify('workspace stays inside viewport',panelRect.left>=0&&panelRect.right<=innerWidth+2,{left:Math.round(panelRect.left),right:Math.round(panelRect.right),width:innerWidth});
 verify('no horizontal scrolling',document.documentElement.scrollWidth<=innerWidth+2,{overflow:document.documentElement.scrollWidth-innerWidth});
 pre.dataset.status='passed';
}catch(e){checks.push({name:'error',ok:false,error:String(e.stack||e)});pre.dataset.status='failed';}
pre.textContent=JSON.stringify({width:innerWidth,path:location.pathname,family:document.body.dataset.tuiFamily,passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks},null,2);
