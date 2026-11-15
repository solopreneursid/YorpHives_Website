// Preview-only responsive inspection. Read-only DOM measurements, no file input access.
if(new URLSearchParams(location.search).get('qa')==='responsive'){
 const details=[...document.querySelectorAll('details.directory-section')];
 for(const section of details)section.open=true; // Test all 134 cards rather than collapsed summaries only.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const css=el=>getComputedStyle(el),rect=el=>el.getBoundingClientRect();
 const visible=el=>{
  const s=css(el),r=rect(el);
  return s.display!=='none'&&s.visibility!=='hidden'&&r.width>.5&&r.height>.5;
 };
 const box=el=>{
  const r=rect(el),s=css(el);
  return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),
   font:s.fontSize,lineHeight:s.lineHeight,display:s.display};
 };
 const keySelectors=[
  '.site-header','.site-header .brand','.site-header nav','.tool-wrap','.tool-intro',
  '.tool-intro h1','.directory-search-link','.directory-section','.directory-section summary',
  '.directory-grid','.directory-card','.tool-panel','.tool-panel form','.panel-content',
  '.wave6-options','.wave2-form-grid','.wave2-upload','input[type=file]',
  'input[type=text]','textarea','select','.tool-btn','.wave2-actions','.scan-stage','.redaction-stage'
 ];
 const elements={};
 for(const selector of keySelectors){
  const matched=[...document.querySelectorAll(selector)].filter(visible);
  elements[selector]={count:matched.length,samples:matched.slice(0,3).map(box)};
 }
 const clipped=[...document.querySelectorAll('body *')].filter(visible).filter(el=>{
  const r=rect(el);return r.left < -3||r.right > innerWidth+3;
 }).slice(0,35).map(el=>({
  tag:el.tagName.toLowerCase(),cls:typeof el.className==='string'?el.className.slice(0,80):'',
  label:el.textContent?.trim().slice(0,42)||'',left:Math.round(rect(el).left),
  right:Math.round(rect(el).right),width:Math.round(rect(el).width)
 }));
 const targets=[...document.querySelectorAll('a,button,summary,input,select,textarea')]
  .filter(visible).map(el=>{
   const b=box(el);return {tag:el.tagName.toLowerCase(),label:el.getAttribute('aria-label')||el.textContent?.trim().slice(0,35)||el.getAttribute('type')||'',
    x:b.x,y:b.y,w:b.width,h:b.height};
  });
 const smallTargets=targets.filter(t=>t.h<40||t.w<40).slice(0,30);
 const header=document.querySelector('.site-header .brand'),nav=document.querySelector('.site-header nav');
 const collides=()=>{
  if(!header||!nav||!visible(header)||!visible(nav))return null;
  const a=rect(header),b=rect(nav);return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 };
 const directoryCards=[...document.querySelectorAll('.directory-card')];
 const report={
  page:location.pathname,
  viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,coarsePointer:matchMedia('(pointer: coarse)').matches,
   narrow:matchMedia('(max-width: 480px)').matches,ua:navigator.userAgent},
  document:{htmlScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,verticalHeight:document.documentElement.scrollHeight},
  headerOverlap:collides(),directory:{groups:details.length,cards:directoryCards.length,hasInlineSearch:!!document.querySelector('input[type=search]')},
  elements,clipped,smallTargets:smallTargets.slice(0,25),
  counts:{smallTargets:smallTargets.length,allTargets:targets.length}
 };
 const pre=document.createElement('pre');pre.id='responsive-audit';pre.dataset.status='done';
 pre.textContent=JSON.stringify(report);pre.style.display='none';document.body.append(pre);
}