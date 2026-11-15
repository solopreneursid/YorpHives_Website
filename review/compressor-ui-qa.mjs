// Preview-only acceptance checks for simplified PDF Compressor. Never shipped in production.
const report=document.createElement('pre');report.id='compressor-ui-qa';report.dataset.status='running';document.body.append(report);
const input=document.getElementById('pdf-compressor-file');
const form=document.getElementById('pdf-compressor-form');
const download=document.getElementById('pdf-compressor-download');
const status=document.getElementById('pdf-compressor-status');
const output=document.getElementById('pdf-compressor-result');
const results=[];
const wait=async(predicate,timeout=35000)=>{
 const start=performance.now();
 while(performance.now()-start<timeout){
  if(predicate())return;
  await new Promise(resolve=>setTimeout(resolve,60));
 }
 throw Error('Timed out: '+status?.textContent);
};
const assert=(value,message)=>{if(!value)throw Error(message);};
let restore;
try{
 assert(document.body.dataset.wave1==='pdf-compressor','Not on PDF Compressor.');
 assert(form&&input&&download&&output&&status,'Essential controls missing.');
 const options=[...form.querySelectorAll('input[type="radio"][name="compression"]')];
 assert(options.length===3,'Expected three compression choices.');
 assert(options.map(x=>x.value).join(',')==='low,best,high','Unexpected choices');
 assert(options[1].checked,'Best Compression should be selected first.');
 assert(!form.querySelector('[name="quality"],[name="scale"],button[type="submit"]'),'Technical controls leaked into UI.');
 results.push({check:'simple-interface',ok:true});
 const {PDFDocument,StandardFonts}=await import('./tools/vendor/pdf-lib.mjs');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 const page=pdf.addPage([500,600]);page.drawText('SAMPLE DOCUMENT FOR COMPRESSION',{x:30,y:300,font,size:18});
 const bytes=await pdf.save(),file=new File([bytes],'sample.pdf',{type:'application/pdf'});
 const captures=[];
 const original=URL.createObjectURL;
 URL.createObjectURL=function(blob){captures.push(blob);return original.call(URL,blob);};
 restore=()=>{URL.createObjectURL=original;};
 const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;
 input.dispatchEvent(new Event('change',{bubbles:true}));
 await wait(()=>!download.hidden&&download.getAttribute('href')?.startsWith('blob:'));
 assert(/Before:/.test(document.getElementById('pdf-compressor-sizes').textContent),'Before and after sizes missing');
 let completed=0;
 async function validDownloaded(label){
  const blob=captures.at(-1);
  assert(blob&&blob.size>70,'No downloadable PDF for '+label);
  const header=String.fromCharCode(...new Uint8Array(await blob.slice(0,4).arrayBuffer()));
  assert(header==='%PDF','Not a PDF for '+label);
  assert(download.download.endsWith('.pdf'),'Missing PDF download filename for '+label);
  const instance=await PDFDocument.load(await blob.arrayBuffer());
  assert(instance.getPageCount()===1,'Corrupt page count for '+label);
  results.push({check:'processed-'+label,ok:true,bytes:blob.size});
  completed++;
 }
 await validDownloaded('best-auto');
 for(const preset of ['low','high']){
  const prev=download.href;
  const radio=form.querySelector('input[value="'+preset+'"]');
  radio.checked=true;
  radio.dispatchEvent(new Event('change',{bubbles:true}));
  await wait(()=>!download.hidden&&download.href!==prev);
  await validDownloaded(preset);
 }
 assert(completed===3,'Not all three modes finished');
 if(innerWidth<=720)assert(document.documentElement.scrollWidth<=innerWidth+2,'Mobile horizontal overflow');
 report.dataset.status='passed';
}catch(error){
 results.push({check:'failure',ok:false,error:String(error?.message||error)});
 report.dataset.status='failed';
}finally{restore?.();}
report.textContent=JSON.stringify({width:innerWidth,tests:results},null,2);
