// Real browser interaction tests for a representative tool in each rendering family.
// Runs only from versioned Pages preview; no user files, no external APIs.
const pre=document.createElement('pre');pre.id='tool-suite-flow-qa';pre.dataset.status='running';document.body.append(pre);
const checks=[],id=location.pathname.split('/').filter(Boolean).at(-1);
const check=(name,yes,info)=>{if(!yes)throw Error(name+' failed: '+String(info??''));checks.push({name,ok:true,...(info?{info}:{} )});};
const wait=async(test,timeout=16000)=>{const started=performance.now();while(performance.now()-started<timeout){if(test())return;await new Promise(done=>setTimeout(done,65));}throw Error('Timed out: '+id+' '+document.querySelector('[role=status]')?.textContent);};
const file=(input,files)=>{const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));};
async function pdfFiles(){
 const {PDFDocument,StandardFonts}=await import('/tools/vendor/pdf-lib.mjs');
 const make=async i=>{const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);pdf.addPage([250,340]).drawText('TEST FILE '+i,{x:22,y:280,size:19,font});return new File([await pdf.save()],'test-'+i+'.pdf',{type:'application/pdf'});};
 return [await make(1),await make(2)];
}
const lines=[];
try{
 if(id==='word-counter'||id==='loan-payment-calculator'){
  const form=document.getElementById('utility-form'),run=document.getElementById('utility-run'),result=document.getElementById('utility-result');
  if(id==='word-counter'){const textarea=form.querySelector('textarea[name=text]');textarea.value='YorpHives helps people create useful things.';textarea.dispatchEvent(new Event('input',{bubbles:true}));}
  check('run action enabled',!run.disabled);
  form.requestSubmit();
  await wait(()=>!result.hidden&&document.getElementById('utility-output').value.length>0);
  check('output visible',!!result.querySelector('.tui-result-head'));
  check('result is non-empty',document.getElementById('utility-output').value.slice(0,170));
 }
 if(id==='pdf-merge'||id==='file-sha256'){
  const f=id==='pdf-merge'?await pdfFiles():[new File(['hello from YorpHives'],'hello.txt',{type:'text/plain'})];
  const input=document.getElementById('file-input'),form=document.getElementById('file-tool-form');
  check('styled zone exists',input.parentElement.classList.contains('tui-upload-zone'));
  file(input,f);
  check('selected filenames shown',input.parentElement.querySelector('.tui-upload-title')?.textContent.includes(f.length===2?'2 files':f[0].name));
  const run=document.getElementById('file-run');check('file processing ready',!run.disabled);
  form.requestSubmit();
  await wait(()=>!document.getElementById('file-download').hidden,26000);
  const url=document.getElementById('file-download').href;
  const blob=await (await fetch(url)).blob();check('output file downloaded',blob.size>30);
  if(id==='pdf-merge'){const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');const pdf=await PDFDocument.load(await blob.arrayBuffer());check('PDF contains both source pages',pdf.getPageCount()===2);}
 }
 if(id==='invoice-generator'){
  const form=document.getElementById('wave1-form');form.requestSubmit();
  await wait(()=>!document.getElementById('wave1-download').hidden,22000);
  const data=new Uint8Array(await (await (await fetch(document.getElementById('wave1-download').href)).blob()).arrayBuffer());
  check('invoice PDF generated',String.fromCharCode(...data.slice(0,4))==='%PDF');
 }
 if(id==='image-resizer'){
  const canvas=document.createElement('canvas');canvas.width=230;canvas.height=125;const ctx=canvas.getContext('2d');ctx.fillStyle='#167b58';ctx.fillRect(0,0,230,125);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  file(document.getElementById('image-file'),[new File([blob],'test.png',{type:'image/png'})]);
  await wait(()=>!document.getElementById('image-convert').disabled,11000);
  document.getElementById('image-convert').click();
  await wait(()=>!document.getElementById('image-download').hidden,12000);
  check('image resize produces download',document.getElementById('image-download').download.endsWith('.webp'));
 }
 if(id==='json-formatter'){
  document.getElementById('json-input').value='{"name":"YorpHives","count":107}';
  document.getElementById('json-format').click();
  await wait(()=>document.getElementById('json-output').value.includes('YorpHives'));
  check('JSON content formatted',document.getElementById('json-output').value.includes('"count"'));
 }
 if(id==='pdf-to-images'){
  const f=(await pdfFiles()).slice(0,1);
  file(document.getElementById('wave1-file'),f);
  document.getElementById('wave1-form').requestSubmit();
  await wait(()=>!document.getElementById('wave1-download').hidden,24000);
  const blob=await (await fetch(document.getElementById('wave1-download').href)).blob();
  check('PDF rendered as image',blob.size>100);
 }
 check('enhanced UI still appears',!!document.querySelector('.tui-workspace-head'));
 pre.dataset.status='passed';
}catch(e){checks.push({name:'failure',ok:false,error:String(e.stack||e)});pre.dataset.status='failed';}
pre.textContent=JSON.stringify({id,passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks},null,2);
