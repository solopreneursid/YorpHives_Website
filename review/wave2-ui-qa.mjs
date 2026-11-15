// Preview-only browser interaction QA. Uses fabricated files; no user data or uploads.
(async()=>{
 const report=document.createElement('pre');report.id='wave2-qa';report.dataset.status='running';
 report.style.cssText='white-space:pre-wrap;word-break:break-word;background:#fff;padding:16px';
 document.body.append(report);
 const id=document.body.dataset.wave2;
 const results=[];
 const blobs=new Map();const originalCreateURL=URL.createObjectURL;
 URL.createObjectURL=function(blob){const value=originalCreateURL.call(URL,blob);blobs.set(value,blob);return value;};
 const check=(name,ok)=>{if(!ok)throw Error(name);results.push(name);};
 const wait=async(fn,ms=20000)=>{const start=performance.now();while(performance.now()-start<ms){if(fn())return;await new Promise(r=>setTimeout(r,75));}throw Error('Timed out: '+document.getElementById('wave2-status')?.textContent);};
 const input=document.getElementById('wave2-file');
 const form=document.getElementById('wave2-form');
 const output=document.getElementById('wave2-results');
 const run=document.getElementById('wave2-run');
 check('Tool has a visible working form',Boolean(form&&run&&output&&getComputedStyle(form).display!=='none'));
 const panel=document.querySelector('.tool-panel');
 check('Workspace has an accessible card',!!panel&&parseFloat(getComputedStyle(panel).borderRadius)>8);
 const pick=file=>{
  const dt=new DataTransfer();(Array.isArray(file)?file:[file]).forEach(x=>dt.items.add(x));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const pdf=async(withFields=false)=>{
  const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
  const doc=await PDFDocument.create(),page=doc.addPage([400,450]);
  if(withFields){
   const field=doc.getForm().createTextField('applicant');field.addToPage(page,{x:35,y:320,width:250,height:26});
   const consent=doc.getForm().createCheckBox('consent');consent.addToPage(page,{x:35,y:285,width:18,height:18});
  }
  return new File([await doc.save()],'test.pdf',{type:'application/pdf'});
 };
 const submit=()=>form.requestSubmit();
 const status=document.getElementById('wave2-status');
 try{
  if(id==='pdf-form-filler'){
   pick(await pdf(true));
   await wait(()=>document.querySelector('[data-pdf-name="applicant"]')&&!run.disabled);
   const name=form.querySelector('[data-pdf-name="applicant"]');name.value='Test Builder';
   const checkbox=form.querySelector('[data-pdf-name="consent"]');checkbox.checked=true;
   submit();
  }else if(id==='pdf-flatten'){
   const file=await pdf(true);pick(file);submit();
  }else if(id==='zip-extractor'){
   const JSZip=(await import('/tools/vendor/jszip.mjs')).default;
   const zip=new JSZip();zip.file('hello.txt','Hello from YorpHives');
   pick(new File([await zip.generateAsync({type:'uint8array'})],'test.zip',{type:'application/zip'}));
   submit();
  }else if(id==='csv-cleaner'){
   pick(new File(['name,role\nAda,Engineer\nAda,Engineer\n'],'test.csv',{type:'text/csv'}));
   submit();
  }else if(id==='image-collage-maker'){
   const c=document.createElement('canvas');c.width=c.height=50;
   const cx=c.getContext('2d');cx.fillStyle='#137e65';cx.fillRect(0,0,50,50);
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
   pick([new File([blob],'one.png',{type:'image/png'}),new File([blob],'two.png',{type:'image/png'})]);
   submit();
  }else if(id==='resume-builder'){
   for(const [k,v] of Object.entries({fullName:'Test Builder',email:'builder@example.test',headline:'Designer',experience:'Built accessible digital tools'})){
    form.elements.namedItem(k).value=v;
   }
   submit();
  }else throw Error('Unknown review page: '+id);
  await wait(()=>!output.hidden||status?.classList.contains('error'),28000);
  check('No processing error',!status.classList.contains('error'));
  check('Output displayed and status described',!output.hidden&&Boolean(status.textContent.trim()));
  const links=[...output.querySelectorAll('a[download]')];
  check('Real download links are provided',links.length>0);
  const saved=blobs.get(links[0].href);
  check('Download Blob is locally generated',saved instanceof Blob);
  const bytes=new Uint8Array(await saved.arrayBuffer());
  check('Download contains bytes',bytes.length>0);
  if(id.includes('pdf')||id==='resume-builder')check('Downloaded PDF signature',new TextDecoder().decode(bytes.slice(0,5))==='%PDF-');
  if(id==='csv-cleaner')check('CSV deduplication happened',(await new Blob([bytes]).text()).split('Ada,Engineer').length===2);
  if(id==='zip-extractor')check('Archive entry extracted correctly',new TextDecoder().decode(bytes)==='Hello from YorpHives');
  if(id==='image-collage-maker')check('Collage is a real PNG',bytes[0]===137&&bytes[1]===80);
  report.textContent=JSON.stringify({id,ok:true,checks:results},null,2);report.dataset.status='pass';
 }catch(e){report.textContent=JSON.stringify({id,ok:false,checks:results,error:e?.message||String(e)},null,2);report.dataset.status='fail';}
})();
