// Noindex preview only: exercise the same controls used by real visitors.
if(new URLSearchParams(location.search).get('qa')==='background-ui'){
 const node=document.createElement('pre');node.id='background-ui-qa';node.dataset.status='running';document.body.append(node);
 const start=performance.now(),checks=[],check=(name,ok,detail='')=>{
  checks.push({name,pass:!!ok,detail});if(!ok)throw Error(name+': '+detail);
 };
 const wait=async(fn,ms=85000)=>{
  for(let i=0;i<ms/150;i++){if(fn())return;await new Promise(r=>setTimeout(r,150));}
  throw Error('Timed out awaiting the AI tool UI.');
 };
 try{
  const $=id=>document.getElementById(id);
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ecf5f6';ctx.fillRect(0,0,480,360);
  ctx.fillStyle='#334a5b';ctx.beginPath();ctx.ellipse(240,185,100,135,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ce9148';ctx.beginPath();ctx.ellipse(237,121,62,65,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1f604a';ctx.fillRect(160,181,155,150);
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
  const dt=new DataTransfer();dt.items.add(new File([blob],'private-portrait.png',{type:'image/png'}));
  $('ai-file').files=dt.files;
  $('ai-file').dispatchEvent(new Event('change',{bubbles:true}));
  check('Local photo selection enables processing',!$('ai-run').disabled&&!$('ai-source').hidden);
  $('ai-form').requestSubmit();
  await wait(()=>!$('ai-result').hidden||$('ai-status').classList.contains('error'));
  check('AI tool produces an accessible downloadable PNG',!$('ai-result').hidden&&$('ai-download').download.endsWith('.png'),
   $('ai-status').textContent);
  check('Transparent image preview replaces placeholder',!$('ai-processed').hidden&&$('ai-output').hidden);
  const firstLink=$('ai-download').href;
  const img=await createImageBitmap(await(await fetch(firstLink)).blob());
  const pc=document.createElement('canvas');pc.width=img.width;pc.height=img.height;
  const pixels=pc.getContext('2d');pixels.drawImage(img,0,0);
  const data=pixels.getImageData(0,0,pc.width,pc.height).data;
  let transparent=0,opaque=0;
  for(let p=3;p<data.length;p+=4){if(data[p]<50)transparent++;if(data[p]>200)opaque++;}
  check('Real UI-generated PNG includes transparency',transparent>200&&opaque>200,
   'opaque='+opaque+', transparent='+transparent);
  img.close();pc.width=pc.height=0;
  $('ai-cutoff').value='64';$('ai-cutoff').dispatchEvent(new Event('input',{bubbles:true}));
  check('Refinement invalidates outdated download', $('ai-result').hidden&&!$('ai-refine').disabled);
  $('ai-refine').click();
  await wait(()=>!$('ai-result').hidden||$('ai-status').classList.contains('error'),30000);
  check('Edge sliders update result without a second inference',!$('ai-result').hidden&&$('ai-download').href!==firstLink);
  $('ai-background').value='charcoal';$('ai-background').dispatchEvent(new Event('change'));
  check('Preview background change is visibly selectable',$('ai-processed-frame').classList.contains('ai-charcoal'));
  $('ai-reset').click();
  check('Reset clears local photo and output',$('ai-file').files.length===0&&$('ai-result').hidden&&$('ai-run').disabled);
  const overflow=document.documentElement.scrollWidth-innerWidth;
  check('No horizontal scrolling in this viewport',overflow<=1,'overflow='+overflow);
  const remote=performance.getEntriesByType('resource').filter(e=>{
   try{return new URL(e.name).origin!==location.origin;}catch{return false;}
  });
  check('No runtime requests to an external origin',remote.length===0,remote.map(x=>x.name).slice(0,2).join(', '));
  canvas.width=canvas.height=0;
  node.dataset.status='done';node.textContent=JSON.stringify({pass:true,checks,width:innerWidth,ms:Math.round(performance.now()-start)},null,2);
 }catch(error){node.dataset.status='failed';node.textContent=JSON.stringify({pass:false,checks,width:innerWidth,
  ms:Math.round(performance.now()-start),error:error?.stack||String(error)},null,2);}
}
